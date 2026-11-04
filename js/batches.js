/* دفعات الإنتاج — production batches of a product.
   A batch is one product made with one production date and one expiry date. Its key is
   the two dates as YYMMDD+YYMMDD (000000 when a date is missing), so two vouchers with the
   same dates are the same batch on the shelf.
   Batch barcode = the product barcode + the 12-digit key, e.g. 628100000001 261103 261110.

   Stock per batch lives at products/{id}/batchStock/{key}/{branch}. The product total
   (stockByBranch) stays the real balance the cashier uses. What a branch has of each batch is
   read through batchView(): when the batches add up to more than the total (sales or moves that
   named no batch), the extra is taken from the batch that expires first (FEFO); when they add up
   to less, the rest shows as "no batch".
   Products that never had batch stock start from their production history (seeded on the first
   batch write, so old batches are not lost). */

const BATCH_RX = /^\d{12}$/;
const yymmdd = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[1].slice(2) + m[2] + m[3] : '000000'; };
const batchKeyOf = (productionDate, expiryDate) => yymmdd(productionDate) + yymmdd(expiryDate);
const keyDate = s => (s === '000000' ? '' : `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`);
const keyDates = key => ({ productionDate: keyDate(String(key).slice(0, 6)), expiryDate: keyDate(String(key).slice(6, 12)) });
const batchPath = (pid, key, branch) => `products/${pid}/batchStock/${key}/${branch}`;
const batchExpTs = key => { const e = keyDates(key).expiryDate; return e ? new Date(`${e}T23:59:59`).getTime() : Infinity; };
// Whole calendar days from today to the expiry date: 0 = expires today, -1 = expired yesterday
const batchDaysLeft = key => { const e = keyDates(key).expiryDate; if (!e) return null; const d = new Date(); return Math.round((new Date(`${e}T00:00:00`) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000); };
// fresh · soon (≤ 3 days) · expired
const batchState = key => { const d = batchDaysLeft(key); return d == null ? 'fresh' : d < 0 ? 'expired' : d <= 3 ? 'soon' : 'fresh'; };
const batchLabel = key => { const x = keyDates(key); return `${t('iv.prodDate')} ${x.productionDate || '—'} · ${t('iv.expiry')} ${x.expiryDate || '—'}`; };

/* The printed base of a product's batch barcode: the product barcode, which is what the cashier scans by */
function batchBase(pid) {
  const p = (LIVE.cache.products || {})[pid]; if (!p) return '';
  const b = toLatin(String(p.barcode || '')).trim();
  return /^\d{4,}$/.test(b) ? b : '';
}
const batchBarcode = (pid, key) => { const b = batchBase(pid); return b && BATCH_RX.test(String(key)) ? b + key : ''; };

/* A scanned code → { pid, key } for a batch barcode, else null */
function parseBatchCode(raw) {
  const code = String(raw || '').replace(/\s+/g, '');
  if (/^\d{17,}$/.test(code)) {
    const base = code.slice(0, -12), key = code.slice(-12);
    const hits = Object.entries(LIVE.cache.products || {}).filter(([id]) => batchBase(id) === base);
    if (hits.length === 1) return { pid: hits[0][0], key };
  }
  // Old production voucher barcodes (random numbers) still find their batch when the voucher has one product
  const old = typeof batchByBarcode === 'function' ? batchByBarcode(normQ(code)) : null;
  if (old) {
    const r = (LIVE.cache.production || {})[old.batchId] || {};
    const line = (Array.isArray(r.items) && r.items.length ? r.items : [r]).find(it => String(it.itemId) === String(old.itemId)) || r;
    return { pid: old.itemId, key: batchKeyOf(line.productionDate || r.productionDate, line.expiryDate || r.expiryDate) };
  }
  return null;
}

/* Product lines of every production voucher, with their batch key */
let prodLineIdx = { src: null, map: new Map() };
function productionLines(pid) {
  const src = LIVE.cache.production;
  if (prodLineIdx.src !== src) {
    const map = new Map();
    Object.entries(src || {}).forEach(([id, r]) => {
      if (!r || typeof r !== 'object') return;
      (Array.isArray(r.items) && r.items.length ? r.items : [r]).forEach(it => {
        if (!it || !it.itemId || (it.itemType || r.itemType || 'product') !== 'product') return;
        const productionDate = it.productionDate || r.productionDate || '', expiryDate = it.expiryDate || r.expiryDate || '';
        const k = String(it.itemId);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ recId: id, rec: r, key: batchKeyOf(productionDate, expiryDate), productionDate, expiryDate, qty: Number(it.qty ?? r.qty ?? 0), branchId: r.branchId || '' });
      });
    });
    prodLineIdx = { src, map };
  }
  return prodLineIdx.map.get(String(pid)) || [];
}

/* {key: {branch: qty}} as stored, or rebuilt from production history for a product without batch stock */
function rawBatches(pid) {
  const p = (LIVE.cache.products || {})[pid];
  if (p && p.batchStock && typeof p.batchStock === 'object') return p.batchStock;
  const out = {};
  productionLines(pid).forEach(l => { if (!l.branchId) return; (out[l.key] ||= {})[l.branchId] = (out[l.key][l.branchId] || 0) + l.qty; });
  return out;
}
const hasBatchStock = pid => !!(((LIVE.cache.products || {})[pid] || {}).batchStock);

/* What a branch holds of each batch. `undo` = {path: delta} to take back first
   (the voucher being edited), so its own earlier move is not counted. */
function batchView(pid, branch, undo = {}) {
  const raw = rawBatches(pid);
  const total = stockAt((LIVE.cache.products || {})[pid], branch) - (undo[stockKey('product', pid, branch)] || 0);
  const rows = Object.entries(raw).filter(([key]) => BATCH_RX.test(key))
    .map(([key, by]) => ({ key, raw: Number((by || {})[branch] || 0) - (undo[batchPath(pid, key, branch)] || 0) }))
    .filter(x => x.raw > 1e-9)
    .sort((a, b) => batchExpTs(a.key) - batchExpTs(b.key) || a.key.localeCompare(b.key));
  let extra = rows.reduce((s, x) => s + x.raw, 0) - Math.max(0, total);
  rows.forEach(x => { const cut = Math.min(x.raw, Math.max(0, extra)); x.qty = x.raw - cut; extra -= cut; });
  const list = rows.filter(x => x.qty > 1e-9).map(x => ({ key: x.key, qty: x.qty, ...keyDates(x.key), state: batchState(x.key), days: batchDaysLeft(x.key) }));
  return { list, total, loose: Math.max(0, total - list.reduce((s, x) => s + x.qty, 0)) };
}
/* Every batch key this product ever had (for counting) */
const knownBatchKeys = pid => [...new Set([...Object.keys(rawBatches(pid)).filter(k => BATCH_RX.test(k)), ...productionLines(pid).map(l => l.key)])]
  .sort((a, b) => batchExpTs(a) - batchExpTs(b));

/* Take qty out of a branch: first-expiring batches first, never an expired one (that is picked by
   hand, e.g. for a damaged return). → { alloc: {key: qty}, rest } */
function fefoAlloc(pid, branch, qty, undo = {}) {
  const alloc = {}; let left = Number(qty) || 0;
  batchView(pid, branch, undo).list.forEach(b => { if (left <= 1e-9 || b.state === 'expired') return; const q = Math.min(b.qty, left); alloc[b.key] = q; left -= q; });
  return { alloc, rest: Math.max(0, left) };
}

/* Before the first batch write of a product, store what its batches hold now (from its
   production history), so moving to stored batch stock loses nothing. Works on an update
   object: increments on a seeded batch path become plain values. */
function withBatchSeed(up) {
  const pids = new Set();
  Object.keys(up).forEach(p => { const m = /^products\/([^/]+)\/batchStock\//.exec(p); if (m && !hasBatchStock(m[1])) pids.add(m[1]); });
  // Without the production history the seed would be wrong: leave those batches for a later save
  if (pids.size && !LIVE.complete(['production'])) {
    Object.keys(up).forEach(path => { const m = /^products\/([^/]+)\/batchStock\//.exec(path); if (m && pids.has(m[1])) delete up[path]; });
    return up;
  }
  pids.forEach(pid => {
    const branches = new Set(Object.values(rawBatches(pid)).flatMap(by => Object.keys(by || {})));
    branches.forEach(br => batchView(pid, br).list.forEach(b => {
      const path = batchPath(pid, b.key, br), cur = up[path];
      if (cur === undefined) up[path] = b.qty;
      else if (cur && cur['.sv'] && cur['.sv'].increment != null) up[path] = b.qty + Number(cur['.sv'].increment);
    }));
    Object.keys(up).forEach(path => {
      const cur = up[path];
      if (path.startsWith(`products/${pid}/batchStock/`) && cur && cur['.sv'] && cur['.sv'].increment != null) up[path] = Number(cur['.sv'].increment);
    });
  });
  return up;
}
/* Batch moves of one voucher line at a branch: the named batch, or the stored FEFO split */
function lineBatchMoves(it, branch, sign) {
  if (ivType(it) !== 'product' || !branch || !itemData('product', it.itemId)) return [];
  if (it.batchKey && BATCH_RX.test(it.batchKey)) return [[batchPath(it.itemId, it.batchKey, branch), sign * Number(it.qty || 0)]];
  if (it.alloc && typeof it.alloc === 'object') return Object.entries(it.alloc).filter(([k]) => BATCH_RX.test(k)).map(([k, q]) => [batchPath(it.itemId, k, branch), sign * Number(q || 0)]);
  return [];
}
