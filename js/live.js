/* Live data: connects to the bakery server through figs-rtdb.js (same paths
   and commands as the old accounting page). Add ?mock to the URL to use an
   in-memory copy instead (js/mock-db.js) — nothing reaches the server then. */

const LIVE = (() => {
  const MOCK = /[?&]mock\b/.test(location.search) && window.MOCK_DB;
  const REMOTE = 'https://162-35-27-249.sslip.io/platform-api';
  // The server sends no CORS headers, so the API must be same-origin:
  // dev-server.py proxies /platform-api locally; on the server it sits next to the site.
  const sameOrigin = /^(localhost|127\.0\.0\.1|162-35-27-249\.sslip\.io)$/.test(location.hostname);
  const apiBase = sameOrigin ? `${location.origin}/platform-api` : REMOTE;
  const USER_KEY = 'raseed.user';

  let db = null;
  let promptLogin = null;              // set by the UI: () => Promise<code>
  const cache = {};
  const watchers = new Map();          // path -> { count, ref, handler }
  const subs = new Set();              // fn(path)
  const live = { user: null, cache, mock: !!MOCK, apiBase };

  async function authCode(code) {
    if (MOCK) return MOCK.auth(code);
    const res = await fetch(`${apiBase}/auth/employee`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res && res.ok && body.sessionToken) return body.sessionToken;
    throw Object.assign(new Error(body.error || ''), { kind: res ? 'invalid' : 'network' });
  }

  function connect() {
    if (db) return db;
    if (MOCK) { db = MOCK.database(); return db; }
    // A refused/expired session asks for the code again through our own screen.
    FigsRTDB.client({ apiBase, login: () => promptLogin ? promptLogin() : Promise.reject(new Error('login')) });
    db = FigsRTDB.database();
    return db;
  }

  async function findUserByCode(code) {
    const users = connect().ref('users');
    const tries = [users.orderByChild('code').equalTo(code).once('value')];
    if (!Number.isNaN(Number(code))) tries.push(users.orderByChild('code').equalTo(Number(code)).once('value'));
    for (const snap of await Promise.all(tries)) {
      if (snap.exists()) { const [id, u] = Object.entries(snap.val())[0]; return { id, ...u }; }
    }
    return null;
  }

  const setToken = token => (MOCK ? MOCK.setToken(token) : FigsRTDB.setToken(token));
  const toUser = u => ({ id: u.id, name: u.name || '-', role: u.role || 'storekeeper', branchId: u.branchId || null });

  live.setLoginPrompt = fn => { promptLogin = fn; };

  /* Returns the user, or throws {kind:'invalid'|'network'|'nouser'} */
  live.login = async rawCode => {
    const code = String(rawCode || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
    if (!code) throw Object.assign(new Error(''), { kind: 'invalid' });
    setToken(await authCode(code));
    const user = await findUserByCode(code);
    if (!user) { setToken(''); throw Object.assign(new Error(''), { kind: 'nouser' }); }
    live.user = toUser(user);
    try { localStorage.setItem(USER_KEY, live.user.id); } catch (e) {}
    return live.user;
  };

  /* Restore a saved session without asking for the code */
  live.restore = async () => {
    let id = null;
    try { id = localStorage.getItem(USER_KEY); } catch (e) {}
    connect();
    const hasToken = MOCK ? MOCK.hasToken() : !!FigsRTDB.client().token();
    if (!id || !hasToken) return null;
    try {
      const snap = await Promise.race([connect().ref(`users/${id}`).once('value'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
      if (!snap.exists()) return null;
      live.user = toUser({ id, ...snap.val() });
      return live.user;
    } catch (e) { return null; }
  };

  live.logout = () => {
    watchers.forEach(w => (w.stop ? w.stop() : w.ref.off('value', w.handler)));
    watchers.clear();
    Object.keys(cache).forEach(k => delete cache[k]);
    live.user = null;
    setToken('');
    try { localStorage.removeItem(USER_KEY); } catch (e) {}
  };

  /* Record lists arrive in two steps: the newest page first (the page draws at once), then the
     whole collection in the background. Until then live.partial() is true and the page header says
     older records are still loading. Keys are time-ordered push keys; orders sort by timestamp. */
  const FIRST_PAGE = 50;
  const STAGED = { orders: 'timestamp', stockIssue: '', transfers: '', cashierTransfers: '', transferRequests: '',
    stockReturn: '', scrapReturn: '', supplierReturns: '', purchases: '', purchaseReceipts: '', pendingStockMoves: '',
    production: '', inventoryCount: '', receiving: '' };
  const partial = new Set();
  live.partial = path => (path ? partial.has(path) : partial.size > 0);
  live.listen = fn => { subs.add(fn); return () => subs.delete(fn); };
  function watchStaged(path, child) {
    let full = false;
    const notify = () => subs.forEach(fn => fn(path));
    const recent = (child ? db.ref(path).orderByChild(child) : db.ref(path).orderByKey()).limitToLast(FIRST_PAGE);
    const onRecent = snap => { if (full) return; cache[path] = snap.val() || {}; partial.add(path); notify(); };
    const done = () => { if (full) return; full = true; recent.off('value', onRecent); partial.delete(path); };
    recent.on('value', onRecent, () => {});
    const ref = db.ref(path);
    const handler = snap => { done(); cache[path] = snap.val() || {}; notify(); };
    ref.on('value', handler, () => { done(); cache[path] = cache[path] || {}; notify(); });
    return { count: 0, ref, handler, stop: () => { recent.off('value', onRecent); ref.off('value', handler); partial.delete(path); } };
  }

  /* 'salesSince' = the invoices the warehouse takes off stock (sales-stock.js): the orders from
     meta/salesStockFrom on. Any page that reads products gets them too, so its stock is right. */
  const withSales = paths => (paths.includes('products') && !paths.includes('salesSince') ? [...paths, 'salesSince'] : paths);
  function watchSales() {
    let from = null, query = null;
    const handler = snap => { cache.salesSince = snap.val() || {}; subs.forEach(fn => fn('salesSince')); };
    const meta = snap => {
      const next = Number(snap.val()) || 0;
      if (next === from) return;
      from = next;
      if (query) query.off('value', handler);
      query = null;
      if (!from) { handler({ val: () => null }); return; }
      query = db.ref('orders').orderByChild('timestamp').startAt(from);
      query.on('value', handler, () => handler({ val: () => cache.salesSince || null }));
    };
    db.ref('meta/salesStockFrom').on('value', meta, () => meta({ val: () => 0 }));
    return { count: 0, stop: () => { db.ref('meta/salesStockFrom').off('value', meta); if (query) query.off('value', handler); } };
  }

  /* Keep `cache[path]` in sync; calls onChange(path) on every update.
     Returns an unsubscribe function. */
  live.watch = (paths, onChange) => {
    connect();
    paths = withSales(paths);
    paths.forEach(path => {
      let w = watchers.get(path);
      if (path === 'salesSince' && !w) { w = watchSales(); watchers.set(path, w); }
      if (!w && path in STAGED) { w = watchStaged(path, STAGED[path]); watchers.set(path, w); }
      if (!w) {
        // 'orders@timestamp>=1730000000000' = only the records from that value of the child on
        const q = /^([^@]+)@([^>]+)>=(-?\d+)$/.exec(path);
        const ref = q ? db.ref(q[1]).orderByChild(q[2]).startAt(Number(q[3])) : db.ref(path);
        const handler = snap => { cache[path] = snap.val() || {}; subs.forEach(fn => fn(path)); };
        w = { count: 0, ref, handler, query: !!q };
        watchers.set(path, w);
        ref.on('value', handler, () => { cache[path] = cache[path] || {}; subs.forEach(fn => fn(path)); });
      }
      w.count++;
    });
    // Changes that arrive together (several collections loading, a burst of
    // cashier sales) are drawn once instead of once per change.
    let timer = 0;
    const fn = path => {
      if (!paths.includes(path) || timer) return;
      timer = setTimeout(() => { timer = 0; onChange(path); }, 60);
    };
    subs.add(fn);
    return () => {
      clearTimeout(timer);
      subs.delete(fn);
      // Listeners stay open: switching pages back is instant and costs no reload.
      // A range query closes with its last user (another range replaces it).
      paths.forEach(path => {
        const w = watchers.get(path);
        if (!w || !w.query || --w.count > 0) return;
        w.ref.off('value', w.handler); watchers.delete(path); delete cache[path];
      });
    };
  };

  /* loaded: enough to draw (a record list may still be its first page);
     complete: every record is here — needed by forms, exports and anything that writes from history */
  live.loaded = paths => withSales(paths).every(p => p in cache);
  live.complete = paths => live.loaded(paths) && !withSales(paths).some(p => partial.has(p));
  /* Resolves once every path has fully arrived (they must be watched already) */
  live.whenLoaded = paths => new Promise(resolve => {
    if (live.complete(paths)) return resolve();
    const fn = () => { if (live.complete(paths)) { subs.delete(fn); resolve(); } };
    subs.add(fn);
  });
  /* Every write passes through the hook (locations.js keeps storage-location stock in step) */
  let writeHook = null;
  live.setWriteHook = fn => { writeHook = fn; };
  live.update = updates => connect().ref().update(writeHook ? writeHook(updates) : updates);
  live.now = () => ({ '.sv': 'timestamp' });
  live.increment = n => ({ '.sv': { increment: Number(n) || 0 } });
  /* Next number of a shared counter (same as the old page's generateCounter) */
  live.counter = path => connect().ref(path).transaction(c => (Number(c) || 0) + 1).then(r => r.snapshot.val());
  live.newKey = path => connect().ref(path).push().key;
  /* Every record whose child equals one of the values ([{id, ...record}]) */
  live.findAll = async (path, child, values) => {
    const out = new Map();
    for (const v of values) Object.entries((await connect().ref(path).orderByChild(child).equalTo(v).once('value')).val() || {}).forEach(([id, r]) => { if (r && typeof r === 'object') out.set(id, { id, ...r }); });
    return [...out.values()];
  };
  /* One-off read, and an atomic read-modify-write (fn returns undefined to abort) */
  live.read = path => connect().ref(path).once('value').then(s => s.val());
  live.transaction = (path, fn) => connect().ref(path).transaction(fn);
  /* This device (same id and records as the old page's initPresence): devices/{id} says which page
     it runs, status/{id} whether it is online now. A name set on the devices page is kept. */
  live.deviceId = () => {
    let id = null;
    try { id = localStorage.getItem('deviceId'); } catch (e) {}
    if (!id) { id = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`; try { localStorage.setItem('deviceId', id); } catch (e) {} }
    return id;
  };
  let presence = null;
  live.presence = page => {
    if (presence) return;
    const id = live.deviceId(), dev = connect().ref(`devices/${id}`), status = connect().ref(`status/${id}`);
    let label = null;
    try { label = localStorage.getItem('deviceLabel'); } catch (e) {}
    connect().ref(`devices/${id}/label`).once('value').then(s => dev.update({ ...(s.val() ? {} : { label: label || `ADM-${id.slice(-4)}` }), lastSeen: live.now(), page, deviceId: id })).catch(() => {});
    if (MOCK) status.set({ online: true, lastSeen: Date.now(), page }).catch(() => {});
    else connect().ref('.info/connected').on('value', snap => {
      if (snap.val() !== true) return;
      status.onDisconnect().set({ online: false, lastSeen: live.now(), page });
      status.set({ online: true, lastSeen: live.now(), page });
    });
    presence = setInterval(() => dev.update({ lastSeen: live.now(), page }).catch(() => {}), 60000);
  };
  /* Platform API (online orders) with the same employee session */
  live.platform = async path => {
    if (MOCK) return MOCK.platform(path);
    const token = FigsRTDB.client().token();
    const res = await fetch(`${apiBase}${path}`, { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'platform'), { status: res.status });
    return data;
  };

  return live;
})();
