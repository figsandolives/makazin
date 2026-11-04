// figs-rtdb.js — قاعدة بيانات المخبز على سيرفرنا بنفس أوامر Firebase.
//
// The apps keep calling db.ref(path).on/once/set/update/push/remove/
// transaction. FigsRTDB.wrap(firebase.database()) returns a db whose refs go
// to our server for the collections listed in SERVER_COLLECTIONS and stay on
// Firebase for everything else, so collections move one group at a time.
// With an empty list wrap() returns Firebase itself (nothing changes).
(function (global) {
  'use strict';

  // ← المجموعات التي انتقلت إلى السيرفر. '*' = كل بيانات fawatir (منذ 16 أكتوبر 2026).
  const SERVER_COLLECTIONS = ['*'];
  const API_BASE = 'https://162-35-27-249.sslip.io/platform-api';
  const TOKEN_KEY = 'figsRtdbSession';

  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const clone = value => value === undefined || value === null ? null : typeof value !== 'object' ? value
    : typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const splitPath = path => String(path ?? '').split('/').filter(Boolean);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function getIn(value, parts) {
    let cursor = value;
    for (const part of parts) {
      if (cursor === null || typeof cursor !== 'object') return null;
      cursor = cursor[part];
      if (cursor === undefined) return null;
    }
    return cursor ?? null;
  }
  function normalize(value) {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) { const items = value.map(normalize); return items.some(item => item !== null) ? items : null; }
    if (!isObject(value)) return value;
    const result = {};
    for (const [key, item] of Object.entries(value)) { const normalized = normalize(item); if (normalized !== null) result[key] = normalized; }
    return Object.keys(result).length ? result : null;
  }
  // Copy-on-write: copies only the objects along `parts` and shares the rest,
  // so one change to a 9,000-invoice list costs a few small copies, not a
  // copy of the whole list. Cached values are never changed in place.
  // `value` must already be normalized.
  function setIn(root, parts, value) {
    if (!parts.length) return value ?? null;
    const [head, ...rest] = parts;
    const base = root !== null && typeof root === 'object' ? (Array.isArray(root) ? root.slice() : { ...root }) : {};
    const next = setIn(base[head] ?? null, rest, value);
    if (next === null) { if (Array.isArray(base)) base[head] = null; else delete base[head]; } else base[head] = next;
    if (Array.isArray(base)) return base.some(item => item !== null && item !== undefined) ? base : null;
    return Object.keys(base).length ? base : null;
  }
  // Local stand-in for {".sv": ...} until the server's echo arrives.
  function resolveLocal(value, current) {
    if (isObject(value) && '.sv' in value) return value['.sv'] === 'timestamp' ? Date.now() : (typeof current === 'number' ? current : 0) + Number(value['.sv']?.increment || 0);
    if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveLocal(item, getIn(current, [key]))]));
    return value;
  }

  // Firebase ordering, same as the server (src/rtdb.js).
  const INT_KEY = /^-?(0|[1-9]\d{0,9})$/;
  function compareKeys(a, b) {
    const ai = INT_KEY.test(a) && Math.abs(Number(a)) <= 2147483647, bi = INT_KEY.test(b) && Math.abs(Number(b)) <= 2147483647;
    if (ai && bi) return Number(a) - Number(b);
    if (ai) return -1;
    if (bi) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const typeRank = value => value === null || value === undefined ? 0 : value === false ? 1 : value === true ? 2 : typeof value === 'number' ? 3 : typeof value === 'string' ? 4 : 5;
  function compareValues(a, b) {
    const ra = typeRank(a), rb = typeRank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 3) return a - b;
    if (ra === 4) return a < b ? -1 : a > b ? 1 : 0;
    return 0;
  }
  function sortedEntries(value, query) {
    if (value === null || typeof value !== 'object') return [];
    const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined);
    if (!query) return entries.sort((a, b) => compareKeys(a[0], b[0]));
    const pick = query.orderBy === 'key' ? ([key]) => key : query.orderBy === 'value' ? ([, item]) => item : ([, item]) => getIn(item, splitPath(query.child));
    const compare = query.orderBy === 'key' ? compareKeys : compareValues;
    return entries.sort((a, b) => compare(pick(a), pick(b)) || compareKeys(a[0], b[0]));
  }
  function matches(query, key, item) {
    if (!query || item === null) return item !== null;
    const value = query.orderBy === 'key' ? key : query.orderBy === 'value' ? item : getIn(item, splitPath(query.child));
    const compare = query.orderBy === 'key' ? compareKeys : compareValues;
    if (query.equalTo !== undefined) return compare(value, query.equalTo) === 0;
    if (query.startAt !== undefined && compare(value, query.startAt) < 0) return false;
    if (query.endAt !== undefined && compare(value, query.endAt) > 0) return false;
    return true;
  }

  // Firebase-style push keys: time ordered, unique per browser.
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let lastPushTime = 0, lastRandom = [];
  function pushId() {
    let now = Date.now();
    const duplicate = now === lastPushTime;
    lastPushTime = now;
    const time = new Array(8);
    for (let index = 7; index >= 0; index--) { time[index] = PUSH_CHARS.charAt(now % 64); now = Math.floor(now / 64); }
    if (!duplicate) lastRandom = Array.from({ length: 12 }, () => Math.floor(Math.random() * 64));
    else {
      let index = 11;
      for (; index >= 0 && lastRandom[index] === 63; index--) lastRandom[index] = 0;
      lastRandom[index]++;
    }
    return time.join('') + lastRandom.map(value => PUSH_CHARS.charAt(value)).join('');
  }

  class Snapshot {
    constructor(ref, value, order) { this.ref = ref; this.key = ref.key; this._value = value ?? null; this._order = order; }
    val() { return clone(this._value); }
    exportVal() { return this.val(); }
    toJSON() { return this.val(); }
    exists() { return this._value !== null; }
    child(path) { return new Snapshot(this.ref.child(path), getIn(this._value, splitPath(path))); }
    hasChild(path) { return getIn(this._value, splitPath(path)) !== null; }
    hasChildren() { return isObject(this._value) || Array.isArray(this._value) ? Object.keys(this._value).length > 0 : false; }
    numChildren() { return this.hasChildren() ? Object.keys(this._value).length : 0; }
    forEach(action) {
      const keys = this._order || sortedEntries(this._value, null).map(([key]) => key);
      for (const key of keys) if (action(new Snapshot(this.ref.child(key), this._value?.[key] ?? null)) === true) return true;
      return false;
    }
  }

  // One live copy of a path (or query) shared by every listener on it.
  class Entry {
    constructor(client, parts, query) {
      this.client = client; this.parts = parts; this.query = query;
      this.id = `${parts.join('/')}?${query ? JSON.stringify(query) : ''}`;
      this.value = null; this.ready = false; this.seq = 0; this.callbacks = [];
      this.limited = Boolean(query && (query.limitToFirst || query.limitToLast));
    }
    order() { return this.query ? sortedEntries(this.value, this.query).map(([key]) => key) : null; }
  }

  class Client {
    constructor({ apiBase = API_BASE, path = '/rtdb', fetch: fetchImpl, storage, sessionStorage: session, login } = {}) {
      this.apiBase = apiBase.replace(/\/$/, '');
      // '/rtdb' = cashier/accounting data; '/delivery-db' = delivery orders app.
      this.path = path;
      this.fetch = fetchImpl || ((...args) => global.fetch(...args));
      this.storage = storage || safeStorage(global.localStorage);
      this.session = session || safeStorage(global.sessionStorage);
      this.loginPrompt = login || null;
      this.clientId = `c${pushId().replace(/[^A-Za-z0-9]/g, '')}`;
      this.entries = new Map();
      this.recent = [];
      this.seq = null;
      this.polling = false;
      this.connected = false;
      this.connectedListeners = new Set();
      this.queue = Promise.resolve();
      this.inflight = new Set();
      this.openBatch = null;
      this.pendingWrites = 0;
      this.disconnectOps = new Map();
      this.loginPromise = null;
      this.refused = new Set();
    }
    // A token the server refused is never sent again (an old cashier session
    // in sessionStorage cannot be cleared from here).
    token() { return [this.storage.getItem(TOKEN_KEY), this.session.getItem('figsCashierSession')].find(token => token && !this.refused.has(token)) || ''; }
    setToken(token) { if (token) this.storage.setItem(TOKEN_KEY, token); else this.storage.removeItem(TOKEN_KEY); }

    async login() {
      if (!this.loginPromise) {
        this.loginPromise = (async () => {
          for (;;) {
            const code = this.loginPrompt ? await this.loginPrompt() : await showLoginOverlay();
            const response = await this.fetch(`${this.apiBase}/auth/employee`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: String(code || '') }) }).catch(() => null);
            const payload = response ? await response.json().catch(() => ({})) : {};
            if (response?.ok && payload.sessionToken) { this.setToken(payload.sessionToken); return; }
            if (!this.loginPrompt) showLoginError(payload.error || 'تعذر الاتصال بالسيرفر');
            else throw new Error(payload.error || 'login failed');
          }
        })().finally(() => { this.loginPromise = null; });
      }
      return this.loginPromise;
    }

    // Network errors and 5xx wait and retry (like Firebase offline). Requests
    // go without a login first (label pages need none); a 401 then asks for
    // the employee code. Other errors are returned to the caller.
    async request(method, path, body, { retry = true } = {}) {
      for (let attempt = 0; ; attempt++) {
        if (this.closed) throw new Error('closed');
        const token = this.token();
        let response = null;
        try {
          response = await this.fetch(`${this.apiBase}${path}`, {
            method, cache: 'no-store',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {})
          });
        } catch (_) { response = null; }
        if (response && response.status === 401) {
          if (token) { this.refused.add(token); if (this.storage.getItem(TOKEN_KEY) === token) this.setToken(''); continue; }
          // No extra login box: the pages keep their own login screens, as before.
          if (!this.loginPrompt) throw Object.assign(new Error('غير مصرح'), { status: 401 });
          await this.login();
          continue;
        }
        if (response && response.status < 500) {
          this.setConnected(true);
          const payload = await response.json().catch(() => ({}));
          if (response.ok || response.status === 409 && payload.committed === false) return payload;
          throw Object.assign(new Error(payload.error || `HTTP ${response.status}`), { status: response.status, code: payload.code });
        }
        if (!retry) throw new Error('السيرفر غير متاح');
        this.setConnected(false);
        await sleep(Math.min(15000, 500 * 2 ** Math.min(attempt, 5)));
      }
    }

    close() { this.closed = true; this.polling = false; this.entries.clear(); this.connectedListeners.clear(); }

    setConnected(value) {
      if (this.connected === value) return;
      this.connected = value;
      for (const listener of this.connectedListeners) listener(value);
    }

    // ---- reading ----
    queryString(entry) { return `${this.path}/value?path=${encodeURIComponent(entry.parts.join('/'))}${entry.query ? `&q=${encodeURIComponent(JSON.stringify(entry.query))}` : ''}`; }
    async load(entry) {
      const result = await this.request('GET', this.queryString(entry));
      entry.value = normalize(result.value);
      entry.ready = true;
      entry.seq = result.seq;
      if (this.seq === null) this.seq = result.seq;
      // Replay what the poll loop already handled after this read began.
      if (result.seq < this.seq) {
        if (this.recent.length && this.recent[0].seq > result.seq + 1) return this.load(entry);
        for (const change of this.recent) if (change.seq > result.seq) this.applyToEntry(entry, change, new Set());
      }
      this.startPolling();
    }
    async once(parts, query) {
      const id = `${parts.join('/')}?${query ? JSON.stringify(query) : ''}`;
      const live = this.entries.get(id);
      if (live?.ready && (this.connected || this.pendingWrites)) return { value: clone(live.value), order: live.order() };
      if (this.pendingWrites) await Promise.all([this.queue, ...this.inflight]).catch(() => {});
      const entry = new Entry(this, parts, query);
      const result = await this.request('GET', this.queryString(entry));
      return { value: normalize(result.value), order: query ? sortedEntries(normalize(result.value), query).map(([key]) => key) : null };
    }
    listen(parts, query, callback) {
      const id = `${parts.join('/')}?${query ? JSON.stringify(query) : ''}`;
      let entry = this.entries.get(id);
      if (entry?.dropTimer) { clearTimeout(entry.dropTimer); entry.dropTimer = null; }
      if (!entry) {
        entry = new Entry(this, parts, query);
        this.entries.set(id, entry);
        entry.loading = this.load(entry).then(() => this.fireInitial(entry, entry.callbacks.slice()), error => {
          for (const item of entry.callbacks) item.cancel?.(error);
          this.entries.delete(id);
        });
      } else if (entry.ready) {
        Promise.resolve().then(() => this.fireInitial(entry, [callback]));
      }
      entry.callbacks.push(callback);
      return entry;
    }
    // Pages often stop and restart listening while redrawing; keep the data
    // (still updated live) for 30 s, as Firebase does, instead of fetching it again.
    unlisten(entry, callback) {
      entry.callbacks = callback ? entry.callbacks.filter(item => item !== callback) : [];
      if (entry.callbacks.length || entry.dropTimer) return;
      entry.dropTimer = setTimeout(() => {
        entry.dropTimer = null;
        if (!entry.callbacks.length && this.entries.get(entry.id) === entry) this.entries.delete(entry.id);
      }, 30000);
    }
    fireInitial(entry, callbacks) {
      for (const item of callbacks) {
        if (!entry.callbacks.includes(item)) continue;
        if (item.event === 'value') item.fn(new Snapshot(item.ref, entry.value, entry.order()));
        else if (item.event === 'child_added') {
          let previous = null;
          for (const key of entry.order() || sortedEntries(entry.value, null).map(([key]) => key)) {
            item.fn(new Snapshot(item.ref.child(key), entry.value[key]), previous);
            previous = key;
          }
        }
      }
    }

    // ---- live updates ----
    startPolling() {
      if (this.polling) return;
      this.polling = true;
      (async () => {
        let lastRegistration = 0;
        while (this.polling) {
          if (this.disconnectOps.size && Date.now() - lastRegistration > 120000) {
            await this.registerDisconnect().catch(() => {});
            lastRegistration = Date.now();
          }
          let result;
          try {
            result = await this.request('GET', `${this.path}/changes?since=${this.seq}&wait=25000&client=${this.clientId}`, null, { retry: false });
          } catch (error) {
            this.setConnected(false);
            lastRegistration = 0;
            await sleep(3000);
            continue;
          }
          this.setConnected(true);
          if (result.reset) {
            this.seq = result.seq;
            this.recent = [];
            await Promise.all([...this.entries.values()].map(entry => this.reload(entry)));
            continue;
          }
          this.applyChanges(result.changes || []);
          this.seq = result.seq;
          if (!this.entries.size && !this.disconnectOps.size && !this.connectedListeners.size) { this.polling = false; return; }
        }
      })();
    }
    async reload(entry) {
      const before = JSON.stringify(entry.value);
      await this.load(entry).catch(() => {});
      if (JSON.stringify(entry.value) !== before) { const old = JSON.parse(before); this.fire(entry, new Set([...Object.keys({ ...(isObject(old) ? old : {}), ...(isObject(entry.value) ? entry.value : {}) }), '']), old); }
    }
    // All changes of one batch are applied first; each listener then fires
    // once (a sale is ~10 path changes; firing per path froze big pages).
    applyChanges(changes, { local = false } = {}) {
      if (!local) for (const change of changes) { this.recent.push(change); if (this.recent.length > 5000) this.recent.shift(); }
      for (const entry of this.entries.values()) {
        if (!entry.ready) continue;
        const before = entry.value;
        const touched = new Set();
        let reload = false;
        for (const change of changes) if (this.applyToEntry(entry, change, touched) === 'reload') reload = true;
        if (reload) { this.reload(entry); continue; }
        if (touched.size) this.fire(entry, touched, before);
      }
    }
    // Returns 'reload' when the entry must be fetched again.
    applyToEntry(entry, change, touched) {
      const path = splitPath(change.path), base = entry.parts;
      const under = base.every((part, index) => path[index] === part);
      const over = path.length < base.length && path.every((part, index) => base[index] === part);
      if (!under && !over) return null;
      if (change.big || (entry.query && (over || path.length === base.length)) || entry.limited && under) return 'reload';
      if (over) {
        const next = normalize(getIn(change.value, base.slice(path.length)));
        for (const key of Object.keys({ ...(isObject(entry.value) ? entry.value : {}), ...(isObject(next) ? next : {}) })) touched.add(key);
        touched.add('');
        entry.value = next;
        return null;
      }
      if (path.length === base.length) {
        for (const key of Object.keys({ ...(isObject(entry.value) ? entry.value : {}), ...(isObject(change.value) ? change.value : {}) })) touched.add(key);
        touched.add('');
        entry.value = normalize(change.value);
        return null;
      }
      const rel = path.slice(base.length), key = rel[0];
      if (entry.query) {
        const current = entry.value?.[key] ?? null;
        if (current === null && rel.length > 1) {
          // A deep change to a child outside the window: fetch that child.
          this.request('GET', `${this.path}/value?path=${encodeURIComponent([...base, key].join('/'))}`).then(result => {
            if (!matches(entry.query, key, normalize(result.value))) return;
            const before = entry.value;
            entry.value = setIn(entry.value, [key], normalize(result.value));
            this.fire(entry, new Set([key]), before);
          }, () => {});
          return null;
        }
        const next = setIn(current, rel.slice(1), normalize(change.value));
        entry.value = setIn(entry.value, [key], matches(entry.query, key, next) ? next : null);
      } else {
        entry.value = setIn(entry.value, rel, normalize(change.value));
      }
      touched.add(key);
      return null;
    }
    // Copy-on-write keeps unchanged children identical, so `!==` finds what
    // changed without comparing whole lists. Snapshots copy only on val().
    fire(entry, touched, before) {
      const keys = [...touched].filter(Boolean);
      const changed = keys.filter(key => (before?.[key] ?? null) !== (entry.value?.[key] ?? null) && JSON.stringify(before?.[key] ?? null) !== JSON.stringify(entry.value?.[key] ?? null));
      const whole = touched.has('') && before !== entry.value && JSON.stringify(before) !== JSON.stringify(entry.value);
      if (!changed.length && !whole) return;
      let order;
      const getOrder = () => order === undefined ? (order = entry.order()) : order;
      let keyOrder;
      const getKeyOrder = () => keyOrder || (keyOrder = getOrder() || sortedEntries(entry.value, null).map(([k]) => k));
      for (const item of entry.callbacks.slice()) {
        if (item.event === 'value') { item.fn(new Snapshot(item.ref, entry.value, entry.query ? getOrder() : null)); continue; }
        for (const key of changed) {
          const was = before?.[key] ?? null, now = entry.value?.[key] ?? null;
          const type = was === null ? 'child_added' : now === null ? 'child_removed' : 'child_changed';
          if (item.event !== type) continue;
          const list = type === 'child_removed' ? null : getKeyOrder();
          const previous = list ? list[list.indexOf(key) - 1] ?? null : null;
          item.fn(new Snapshot(item.ref.child(key), type === 'child_removed' ? was : now), previous);
        }
      }
    }

    // ---- writing ----
    // Writes keep their call order, like Firebase, and show locally at once.
    // Writes made while an earlier one is still on its way are sent together
    // in one request (each request is a ~0.2 s round trip from Kuwait, so a
    // 20-item voucher used to wait ~8 s). Transactions run side by side.
    // A refused write reloads what it touched.
    enqueue(task) {
      this.pendingWrites++;
      const waitFor = [this.queue, ...this.inflight];
      const run = Promise.all(waitFor).then(task, task);
      this.queue = run.catch(() => {}).finally(() => { this.pendingWrites--; });
      return run;
    }
    write(ops) {
      const local = ops.map(op => {
        const parts = splitPath(op.path);
        const current = this.localValue(parts);
        return { path: op.path, value: normalize(resolveLocal(clone(op.value), current)) };
      });
      this.applyChanges(local, { local: true });
      const paths = ops.map(op => splitPath(op.path));
      let batch = this.openBatch;
      if (!batch || batch.ops.length + ops.length > 500 || batch.paths.some(a => paths.some(b => related(a, b)))) {
        batch = this.openBatch = { ops: [], paths: [], waiters: [] };
        this.enqueue(() => this.flush(batch));
      }
      batch.ops.push(...ops);
      batch.paths.push(...paths);
      return new Promise((resolve, reject) => batch.waiters.push({ ops, resolve, reject }));
    }
    async flush(batch) {
      if (this.openBatch === batch) this.openBatch = null;
      const send = async ops => {
        try { await this.request('POST', `${this.path}/write`, { ops }); }
        catch (error) {
          for (const entry of this.entries.values()) if (ops.some(op => related(splitPath(op.path), entry.parts))) this.reload(entry);
          throw error;
        }
      };
      try {
        await send(batch.ops);
        batch.waiters.forEach(waiter => waiter.resolve());
      } catch (error) {
        // One refused write must not sink the others: send them one by one.
        if (batch.waiters.length === 1 || !(error.status >= 400 && error.status < 500)) { batch.waiters.forEach(waiter => waiter.reject(error)); return; }
        for (const waiter of batch.waiters) await send(waiter.ops).then(waiter.resolve, waiter.reject);
      }
    }
    localValue(parts) {
      for (const entry of this.entries.values()) {
        if (!entry.ready || entry.query) continue;
        if (entry.parts.every((part, index) => parts[index] === part)) return getIn(entry.value, parts.slice(entry.parts.length));
      }
      return null;
    }
    transaction(parts, update) {
      // Waits for earlier writes, then runs alongside other transactions
      // (each one is safe on its own: the server checks the value it read).
      this.pendingWrites++;
      const run = this.queue.then(async () => {
        const path = parts.join('/');
        let current = await this.request('GET', `${this.path}/value?path=${encodeURIComponent(path)}`);
        for (let attempt = 0; attempt < 25; attempt++) {
          const value = normalize(current.value);
          const next = update(clone(value));
          if (next === undefined) return { committed: false, value };
          const result = await this.request('POST', `${this.path}/transaction`, { path, hash: current.hash, value: next === null ? null : next });
          if (result.committed) {
            this.applyChanges([{ path, value: normalize(result.value) }], { local: true });
            return { committed: true, value: normalize(result.value) };
          }
          current = result;
        }
        throw Object.assign(new Error('maxretry'), { code: 'maxretry' });
      });
      const settled = run.catch(() => {}).finally(() => { this.inflight.delete(settled); this.pendingWrites--; });
      this.inflight.add(settled);
      return run;
    }
    // Resolves once nothing has been waiting to be saved for `quietMs`
    // (used to keep a save button locked until its whole save is done).
    whenIdle(quietMs = 400, maxMs = 60000) {
      const started = Date.now();
      let quietSince = null;
      return new Promise(resolve => {
        const check = () => {
          const busy = this.pendingWrites > 0 || this.inflight.size > 0;
          if (busy) quietSince = null; else if (quietSince === null) quietSince = Date.now();
          if ((quietSince !== null && Date.now() - quietSince >= quietMs) || Date.now() - started > maxMs) return resolve();
          setTimeout(check, 50);
        };
        check();
      });
    }
    async registerDisconnect() {
      await this.request('POST', `${this.path}/on-disconnect`, { client: this.clientId, ops: [...this.disconnectOps.entries()].map(([path, value]) => ({ path, value })) });
    }
  }

  const related = (a, b) => a.every((part, index) => b[index] === undefined || b[index] === part) || b.every((part, index) => a[index] === undefined || a[index] === part);
  function safeStorage(storage) {
    const memory = new Map();
    return {
      getItem: key => { try { return storage ? storage.getItem(key) : memory.get(key) ?? null; } catch (_) { return memory.get(key) ?? null; } },
      setItem: (key, value) => { try { storage ? storage.setItem(key, value) : memory.set(key, value); } catch (_) { memory.set(key, value); } },
      removeItem: key => { try { storage ? storage.removeItem(key) : memory.delete(key); } catch (_) { memory.delete(key); } }
    };
  }

  class ServerRef {
    constructor(client, parts, query = null) { this._client = client; this._parts = parts; this._query = query; this._listeners = []; }
    get key() { return this._parts.length ? this._parts.at(-1) : null; }
    get path() { return this._parts.join('/'); }
    get ref() { return this._query ? new ServerRef(this._client, this._parts) : this; }
    get parent() { return this._parts.length ? new ServerRef(this._client, this._parts.slice(0, -1)) : null; }
    get root() { return new ServerRef(this._client, []); }
    toString() { return `${this._client.apiBase}/rtdb/${this.path}`; }
    child(path) { return new ServerRef(this._client, [...this._parts, ...splitPath(path)]); }
    isEqual(other) { return other instanceof ServerRef && other.path === this.path && JSON.stringify(other._query) === JSON.stringify(this._query); }
    _with(changes) { return new ServerRef(this._client, this._parts, { ...(this._query || {}), ...changes }); }
    orderByChild(child) { return this._with({ orderBy: 'child', child }); }
    orderByKey() { return this._with({ orderBy: 'key' }); }
    orderByValue() { return this._with({ orderBy: 'value' }); }
    startAt(value) { return this._with({ startAt: value }); }
    endAt(value) { return this._with({ endAt: value }); }
    equalTo(value) { return this._with({ equalTo: value }); }
    limitToFirst(limit) { return this._with({ limitToFirst: limit }); }
    limitToLast(limit) { return this._with({ limitToLast: limit }); }

    on(event, callback, cancel) {
      if (!['value', 'child_added', 'child_changed', 'child_removed'].includes(event)) throw new Error(`event ${event} غير مدعوم`);
      const query = this._query && this._query.orderBy ? this._query : this._query ? { orderBy: 'key', ...this._query } : null;
      const item = { event, fn: callback, ref: this.ref, cancel: typeof cancel === 'function' ? cancel : null };
      item.entry = this._client.listen(this._parts, query, item);
      this._listeners.push(item);
      ServerRef.registry.push({ path: this.path, query: JSON.stringify(query), item });
      return callback;
    }
    off(event, callback) {
      const query = JSON.stringify(this._query && this._query.orderBy ? this._query : this._query ? { orderBy: 'key', ...this._query } : null);
      ServerRef.registry = ServerRef.registry.filter(({ path, query: q, item }) => {
        const match = path === this.path && q === query && (!event || item.event === event) && (!callback || item.fn === callback);
        if (match) this._client.unlisten(item.entry, item);
        return !match;
      });
    }
    async once(event = 'value', callback) {
      if (event !== 'value') {
        return new Promise(resolve => {
          const handler = (snapshot, previous) => { this.off(event, handler); callback?.(snapshot, previous); resolve(snapshot); };
          this.on(event, handler);
        });
      }
      const query = this._query && this._query.orderBy ? this._query : this._query ? { orderBy: 'key', ...this._query } : null;
      const result = await this._client.once(this._parts, query);
      const snapshot = new Snapshot(this.ref, result.value, result.order);
      callback?.(snapshot);
      return snapshot;
    }
    set(value, onComplete) { return complete(this._client.write([{ path: this.path, value: value === undefined ? null : value }]), onComplete); }
    update(values, onComplete) {
      if (!isObject(values)) return Promise.reject(new Error('update() يحتاج كائن'));
      const ops = Object.entries(values).map(([key, value]) => ({ path: [...this._parts, ...splitPath(key)].join('/'), value: value === undefined ? null : value }));
      if (!ops.length) return complete(Promise.resolve(), onComplete);
      return complete(this._client.write(ops), onComplete);
    }
    remove(onComplete) { return this.set(null, onComplete); }
    push(value, onComplete) {
      const key = pushId();
      const ref = this.child(key);
      // Resolve with a plain ref: resolving with this thenable would loop.
      const promise = value === undefined ? Promise.resolve(this.child(key)) : ref.set(value, onComplete).then(() => this.child(key));
      ref.then = promise.then.bind(promise);
      ref.catch = promise.catch.bind(promise);
      return ref;
    }
    async transaction(update, onComplete) {
      try {
        const result = await this._client.transaction(this._parts, update);
        const outcome = { committed: result.committed, snapshot: new Snapshot(this, result.value) };
        onComplete?.(null, outcome.committed, outcome.snapshot);
        return outcome;
      } catch (error) { onComplete?.(error, false, null); throw error; }
    }
    onDisconnect() {
      const client = this._client, path = this.path;
      const save = value => { client.disconnectOps.set(path, value); client.startPollingForPresence(); return client.registerDisconnect(); };
      return {
        set: value => save(value === undefined ? null : value),
        remove: () => save(null),
        update: values => Promise.all(Object.entries(values).map(([key, value]) => { client.disconnectOps.set([path, ...splitPath(key)].join('/'), value); })).then(() => { client.startPollingForPresence(); return client.registerDisconnect(); }),
        cancel: () => { client.disconnectOps.delete(path); return client.registerDisconnect(); }
      };
    }
  }
  ServerRef.registry = [];
  Client.prototype.startPollingForPresence = function () {
    if (this.seq === null) this.request('GET', `${this.path}/config`).then(config => { if (this.seq === null) this.seq = config.seq; this.startPolling(); }, () => {});
    else this.startPolling();
  };
  const complete = (promise, onComplete) => {
    if (typeof onComplete === 'function') promise.then(() => onComplete(null), error => onComplete(error));
    return promise;
  };

  function recordGroup(tops) {
    const unique = [...new Set(tops)].sort();
    if (unique.length < 2 || !global.localStorage) return;
    try {
      const groups = JSON.parse(global.localStorage.getItem('figsRtdbGroups') || '{}');
      groups[unique.join('+')] = (groups[unique.join('+')] || 0) + 1;
      global.localStorage.setItem('figsRtdbGroups', JSON.stringify(groups));
    } catch (_) { /* audit only */ }
  }

  // `.info/connected`: true while the poll loop reaches the server.
  class ConnectedRef {
    constructor(client) { this._client = client; this._handlers = new Map(); this.key = 'connected'; }
    on(event, callback) {
      const handler = value => callback(new Snapshot(this, value));
      this._handlers.set(callback, handler);
      this._client.connectedListeners.add(handler);
      this._client.startPollingForPresence();
      Promise.resolve().then(() => handler(this._client.connected));
      return callback;
    }
    off(event, callback) {
      for (const [fn, handler] of this._handlers) if (!callback || fn === callback) { this._client.connectedListeners.delete(handler); this._handlers.delete(fn); }
    }
    once() { return Promise.resolve(new Snapshot(this, this._client.connected)); }
    child() { return this; }
  }

  // Root ref of the wrapped db: a multi-path update must stay on one side,
  // because nothing can make Firebase and the server commit together.
  class RootRef {
    constructor(router) { this._router = router; this.key = null; }
    child(path) { return this._router.ref(path); }
    update(values, onComplete) {
      const tops = Object.keys(values || {}).map(key => splitPath(key)[0]);
      recordGroup(tops);
      const onServer = tops.filter(top => this._router.onServer(top));
      if (onServer.length && onServer.length !== tops.length) {
        const error = new Error(`تحديث يجمع بيانات على Firebase وعلى السيرفر (${[...new Set(tops)].join(', ')})؛ يجب نقلها معاً`);
        console.error(error);
        return complete(Promise.reject(error), onComplete);
      }
      return onServer.length ? new ServerRef(this._router.client, []).update(values, onComplete) : this._router.firebase.ref().update(values, onComplete);
    }
    set() { return Promise.reject(new Error('لا يمكن استبدال القاعدة كاملة')); }
    on() { throw new Error('لا يمكن متابعة القاعدة كاملة'); }
    once() { return Promise.reject(new Error('لا يمكن قراءة القاعدة كاملة')); }
  }

  class Router {
    constructor(firebaseDb, client, serverCollections) { this.firebase = firebaseDb; this.client = client; this.collections = new Set(serverCollections); }
    onServer(top) { return !this.firebase || this.collections.has('*') || this.collections.has(top); }
    ref(path) {
      const parts = splitPath(path);
      if (!parts.length) return new RootRef(this);
      if (parts[0] === '.info') return this.onServer('status') || !this.firebase ? new ConnectedRef(this.client) : this.firebase.ref(path);
      if (this.onServer(parts[0]) || !this.firebase) return new ServerRef(this.client, parts);
      return this.firebase.ref(path);
    }
  }

  let defaultClient = null, defaultDb = null;
  const FigsRTDB = {
    SERVER_COLLECTIONS,
    client(options) { if (!defaultClient || options) defaultClient = new Client(options); return defaultClient; },
    // db = FigsRTDB.wrap(firebase.database())
    // audit: everything stays on Firebase, but each multi-path update notes
    // which collections it saved together (FigsRTDB.groups()), so we know
    // which collections must move on the same night.
    wrap(firebaseDb, { serverCollections = SERVER_COLLECTIONS, client, audit = false } = {}) {
      if (!serverCollections.length && !audit) return firebaseDb;
      if (!serverCollections.length) { const router = new Router(firebaseDb, null, []); return { ref: path => router.ref(path), app: firebaseDb?.app, _router: router }; }
      const router = new Router(firebaseDb, client || FigsRTDB.client(), serverCollections);
      checkServerRoutes(router);
      return { ref: path => router.ref(path), app: firebaseDb?.app, _router: router };
    },
    database() {
      const firebaseDb = global.firebase?.database?.() || null;
      if (!defaultDb || defaultDb.firebase !== firebaseDb) defaultDb = { firebase: firebaseDb, db: FigsRTDB.wrap(firebaseDb) };
      return defaultDb.db;
    },
    setToken(token) { FigsRTDB.client().setToken(token); },
    groups() { try { return JSON.parse(global.localStorage?.getItem('figsRtdbGroups') || '{}'); } catch (_) { return {}; } },
    logout() { FigsRTDB.client().setToken(''); },
    ServerValue: { TIMESTAMP: { '.sv': 'timestamp' }, increment: delta => ({ '.sv': { increment: delta } }) },
    _internal: { Client, ServerRef, Snapshot, Router, pushId, normalize, sortedEntries }
  };

  // The server keeps its own list; a mismatch means a page is out of date.
  function checkServerRoutes(router) {
    if (!global.document) return;
    router.client.request('GET', `${router.client.path}/config`).then(config => {
      const server = new Set(config.serverCollections || []);
      const missing = server.has('*') ? [] : [...router.collections].filter(name => !server.has(name));
      if (missing.length) showBanner(`تنبيه: هذه الصفحة قديمة أو السيرفر لم يجهز (${missing.join(', ')}). حدّث الصفحة وأبلغ المدير.`);
    }, () => {});
  }
  function showBanner(text) {
    const banner = global.document.createElement('div');
    banner.dir = 'rtl';
    banner.textContent = text;
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#b42318;color:#fff;padding:10px 16px;font:600 15px system-ui;text-align:center';
    global.document.body.appendChild(banner);
  }
  let overlay = null;
  function showLoginOverlay() {
    return new Promise(resolve => {
      const doc = global.document;
      if (!doc) return resolve('');
      overlay?.remove();
      overlay = doc.createElement('div');
      overlay.dir = 'rtl';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui';
      overlay.innerHTML = '<form style="background:#fff;border-radius:14px;padding:24px;width:min(92vw,340px);display:grid;gap:12px;text-align:center"><strong style="font-size:18px">دخول الموظف</strong><span style="color:#475467;font-size:14px">اكتب رمز الدخول للاتصال بقاعدة البيانات</span><input type="password" inputmode="numeric" autocomplete="off" required style="font-size:20px;padding:10px;border:1px solid #d0d5dd;border-radius:10px;text-align:center"><small style="color:#b42318;min-height:1em"></small><button style="font-size:16px;padding:10px;border:0;border-radius:10px;background:#1d4ed8;color:#fff">دخول</button></form>';
      const form = overlay.querySelector('form'), input = overlay.querySelector('input');
      form.addEventListener('submit', event => { event.preventDefault(); const code = input.value; input.value = ''; overlay.querySelector('small').textContent = ''; resolve(code); });
      doc.body.appendChild(overlay);
      input.focus();
    });
  }
  function showLoginError(text) {
    if (overlay) overlay.querySelector('small').textContent = text;
  }
  // Remove the overlay once a login succeeds.
  const originalSetToken = Client.prototype.setToken;
  Client.prototype.setToken = function (token) { originalSetToken.call(this, token); if (token && overlay) { overlay.remove(); overlay = null; } };

  global.FigsRTDB = FigsRTDB;
  if (typeof module !== 'undefined' && module.exports) module.exports = FigsRTDB;
})(typeof window !== 'undefined' ? window : globalThis);
