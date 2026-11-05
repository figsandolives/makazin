/* Local copy of the system's data: downloaded once (the «تحميل» screen), saved on this device
   (IndexedDB) and kept live by the server's change feed. Every page then reads from memory, and
   the next visit opens the saved copy and only fetches what changed since it was saved.
   Logging out deletes the copy from the device. Not used in ?mock. */
(() => {
  // Every collection a page reads (a missing one still loads from the server as before)
  const PATHS = ['orders', 'production', 'transferRequests', 'customers', 'products', 'stockIssue', 'inventoryCount',
    'stockMaterials', 'transfers', 'productInfos', 'purchases', 'purchaseReceipts', 'productCategories', 'pendingStockMoves',
    'deliveryPrices', 'scrapReturn', 'dailySessions', 'devices', 'status', 'deliveryZones', 'suppliers', 'units', 'cashiers',
    'productionStaff', 'storageLocations', 'countryOrigins', 'meta', 'users', 'branches', 'tables', 'stockReturn',
    'paymentMethods', 'orderTypes', 'discounts', 'discountUsage', 'materialCategories', 'supplierReturns',
    'cashierTransfers', 'receiving', 'locStock', 'batchStock'];
  const DB = 'raseed-copy', VERSION = 1;
  const supported = !LIVE.mock && typeof indexedDB !== 'undefined' && typeof FigsRTDB !== 'undefined';
  const client = () => FigsRTDB.client();

  let dbp = null;
  function open() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => { req.result.createObjectStore('paths'); req.result.createObjectStore('meta'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(e => { dbp = null; throw e; });
    return dbp;
  }
  const done = tx => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error); });
  const get = (store, key) => new Promise((resolve, reject) => { const r = store.get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

  async function write(values, seq, extra = {}) {
    const db = await open(), tx = db.transaction(['paths', 'meta'], 'readwrite');
    const meta = tx.objectStore('meta');
    const info = (await get(meta, 'info')) || {};
    Object.entries(values).forEach(([path, value]) => tx.objectStore('paths').put(value, path));
    meta.put({ ...info, ...extra, seq, savedAt: Date.now() }, 'info');
    await done(tx);
  }

  /* Saving: changed collections at most every 20 s, and when the page is hidden or closed */
  let timer = 0, saving = false, watching = false;
  async function saveNow() {
    clearTimeout(timer); timer = 0;
    if (saving || !LIVE.user) return;
    const batch = client().takeDirty();
    if (!batch) { if (client().dirty.size) timer = setTimeout(saveNow, 3000); return; }
    saving = true;
    try { await write(batch.values, batch.seq); }
    catch (e) { Object.keys(batch.values).forEach(p => client().dirty.add(p)); }
    finally { saving = false; }
  }
  const later = () => { if (!timer) timer = setTimeout(saveNow, 20000); };
  function keepSaving() {
    if (watching) return;
    watching = true;
    client().copyListeners.add(later);
    addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  }

  LIVE.copySupported = supported;
  LIVE.copyReady = () => supported && client().pinned().length > 0;

  /* Opens the copy saved on this device for this user; false when there is none */
  LIVE.openCopy = async () => {
    if (!supported || !LIVE.user) return false;
    const db = await open(), tx = db.transaction(['paths', 'meta'], 'readonly');
    const info = await get(tx.objectStore('meta'), 'info');
    if (!info || info.user !== LIVE.user.id || !Array.isArray(info.paths) || !info.seq) return false;
    const values = {};
    await Promise.all(info.paths.map(async p => { values[p] = (await get(tx.objectStore('paths'), p)) ?? null; }));
    client().pin(values, info.seq);
    keepSaving();
    return true;
  };

  /* Downloads everything (onProgress gets {known, total, loaded, done, count}) and saves it */
  // Sizes (bytes as sent) measured on 5 Nov 2026; replaced by this device's last download
  const SIZES = { orders: 1783000, production: 634000, transferRequests: 289000, customers: 176000, products: 148000,
    stockIssue: 140000, inventoryCount: 47000, stockMaterials: 40000, productInfos: 36000, transfers: 32000, purchases: 27000,
    purchaseReceipts: 18000 };
  const SIZE_KEY = 'raseed.copySizes';
  LIVE.downloadCopy = async onProgress => {
    let sizes = {};
    try { sizes = JSON.parse(localStorage.getItem(SIZE_KEY) || '{}'); } catch (e) {}
    let last = null;
    const { values, seq } = await client().download(PATHS, p => { last = p; onProgress(p); }, { ...SIZES, ...sizes });
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(last.sizes)); } catch (e) {}
    client().pin(values, seq);
    keepSaving();
    try {
      const db = await open(), tx = db.transaction(['paths', 'meta'], 'readwrite');
      tx.objectStore('paths').clear(); tx.objectStore('meta').clear();
      await done(tx);
      await write(values, seq, { user: LIVE.user.id, paths: PATHS });
    } catch (e) { /* no room on the device: this session still runs from memory */ }
  };

  LIVE.dropCopy = async () => {
    clearTimeout(timer); timer = 0;
    if (!supported) return;
    client().unpinAll();
    try { const db = await open(), tx = db.transaction(['paths', 'meta'], 'readwrite'); tx.objectStore('paths').clear(); tx.objectStore('meta').clear(); await done(tx); } catch (e) {}
  };

  const logout = LIVE.logout;
  LIVE.logout = () => { LIVE.dropCopy(); logout(); };
})();
