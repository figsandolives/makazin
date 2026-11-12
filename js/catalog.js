/* المنتجات · مواد المخزون · تصنيفاتها — live pages.
   Same collections and rules as the old accounting page: products / stockMaterials
   (codes FG-#### / SK-####, unique across both), productCategories / materialCategories
   (folders with parentId; items link through categoryId), storageLocations, countryOrigins. */

['products', 'stock-materials', 'product-categories', 'material-categories'].forEach(r => LIVE_ROUTES.add(r));

/* ---------- libraries (same versions as the old page), loaded only when needed ---------- */
const LIBS = {
  JsBarcode: 'https://unpkg.com/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  // SheetJS 0.18.5 with cell styles (same API): the Excel export is laid out like the PDF
  XLSX: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
  JSZip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
};
const libLoads = {};
function needLib(name) {
  if (window[name]) return Promise.resolve(window[name]);
  return (libLoads[name] ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = LIBS[name];
    s.onload = () => res(window[name]);
    s.onerror = () => { delete libLoads[name]; s.remove(); rej(new Error(name)); };
    document.head.appendChild(s);
  }));
}
const libFailed = () => toast(t('it.libFail'), { tone: 'danger', ic: 'alert' });

/* ---------- codes & barcodes (same rules as the old page) ---------- */
function usedItemCodes(excludeId = null) {
  const used = new Set();
  [LIVE.cache.products, LIVE.cache.stockMaterials].forEach(list => Object.entries(list || {}).forEach(([id, it]) => {
    if (excludeId && String(id) === String(excludeId)) return;
    const c = String((it && it.code) || '').trim().toUpperCase();
    if (c) used.add(c);
  }));
  return used;
}
function fixedCode(prefix, used = usedItemCodes()) {
  let code = '';
  for (let i = 0; i < 500 && (!code || used.has(code)); i++) code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  for (let d = 1000; used.has(code); d++) code = `${prefix}-${d}`;
  used.add(code);
  return code;
}
function normalizeItemCode(value, prefix, used = usedItemCodes()) {
  const text = String(value || '').trim().toUpperCase();
  let code = '';
  if (text && text.startsWith(`${prefix}-`) && /\d{4}$/.test(text)) code = text;
  else if (text && text.startsWith(prefix)) { const d = text.replace(/\D/g, '').slice(-4); if (d) code = `${prefix}-${d.padStart(4, '0')}`; }
  if (!code || used.has(code)) return fixedCode(prefix, used);
  used.add(code);
  return code;
}
// On edit the code is kept, unless another item already has it.
function keepOrReplaceCode(raw, prefix, editId) {
  const code = String(raw || '').trim();
  if (!code) return code;
  const used = usedItemCodes(editId);
  return used.has(code.toUpperCase()) ? fixedCode(prefix, used) : code;
}
/* Every product and material gets its own code: old records with no code, and the later
   copies of a code used twice, get a new one (the oldest record keeps the code it has). */
let codesFixing = false, codesChecked = false;
async function fixItemCodes() {
  if (codesFixing || codesChecked) return;
  codesFixing = true;
  try {
    // From the server itself: the device copy may still hold codes from before the last fix
    const [prd, mat] = await Promise.all([LIVE.fresh('products'), LIVE.fresh('stockMaterials')]);
    const all = [];
    [['products', 'FG', prd], ['stockMaterials', 'SK', mat]].forEach(([path, prefix, list]) => Object.entries(list || {})
      .forEach(([id, it]) => { if (it && typeof it === 'object') all.push({ path, prefix, id, it }); }));
    all.sort((a, b) => createdSort(a.id, a.it) - createdSort(b.id, b.it));
    const used = new Set(), todo = [];
    all.forEach(x => {
      const c = String(x.it.code || '').trim().toUpperCase();
      if (c && !used.has(c)) used.add(c); else todo.push(x);
    });
    codesChecked = true;
    if (!todo.length) return;
    const up = {};
    todo.forEach(x => { up[`${x.path}/${x.id}/code`] = fixedCode(x.prefix, used); });
    const keys = Object.keys(up);
    for (let i = 0; i < keys.length; i += 200) await LIVE.update(Object.fromEntries(keys.slice(i, i + 200).map(k => [k, up[k]])));
    toast(t('it.codesFixed').replace('{n}', fmtNum(todo.length)));
  } catch (e) { console.warn('item codes', e); }
  finally { codesFixing = false; }
}
const newBarcode = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
function drawBarcode(canvas, value, opts) {
  try { JsBarcode(canvas, value, { format: 'CODE128', ...opts }); return true; } catch (e) { return false; }
}
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileSafe = s => String(s).replace(/[\\/:*?"<>|]/g, '-');
async function barcodePng(value) {
  await needLib('JsBarcode');
  const c = document.createElement('canvas');
  if (!drawBarcode(c, value, { displayValue: true, height: 60 })) return null;
  return new Promise(res => c.toBlob(res));
}

/* ---------- display helpers ---------- */
const mainBranch = () => (Object.entries(LIVE.cache.branches || {}).find(([, b]) => b.isMain) || [])[0] || null;
function unitWithDef(it) {
  const base = unitName(it.unitId);
  if (!base) return '-';
  const q = String(it.unitDefinitionQty || '').trim(), du = unitName(it.unitDefinitionUnitId);
  return q && du ? `${base} (${q} ${du})` : base;
}
function itemStock(it, branchId) {
  const by = it.stockByBranch || {};
  // "all branches" shows the main branch; items added by hand have no mainBranchId, so they use the main branch too
  if (!branchId || branchId === 'all') { const mb = it.mainBranchId || mainBranch(); return (Number(by[mb] ?? it.openingQty ?? it.stock ?? 0) || 0) - soldOf(it, mb); }
  return Number(by[branchId] || 0) - soldOf(it, branchId);
}
const reorderTone = (stock, rp) => (!rp || rp <= 0 ? '' : stock <= rp ? 'critical' : stock <= rp * 1.2 ? 'warning' : '');
function createdSort(id, it = {}) {
  const v = it.createdAt ?? it.timestamp ?? it.dateCreated ?? it.createdAtMs ?? 0;
  const time = typeof v === 'number' ? v : new Date(v || 0).getTime();
  if (Number.isFinite(time) && time > 0) return time;
  const key = String(id || '');
  if (key.length >= 8) { const p = parseInt(key.slice(0, 8), 36); if (Number.isFinite(p) && p > 0) return p; }
  return 0;
}
const sortedOpts = list => Object.entries(list || {}).map(([id, o]) => [id, nameOf(o) || id]).sort((a, b) => a[1].localeCompare(b[1]));
const optsHtml = (pairs, val, first) => (first != null ? `<option value="">${esc(first)}</option>` : '') + pairs.map(([k, n]) => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(n)}</option>`).join('');

/* ---------- Excel import (same columns as the old page's template) ---------- */
const IMPORT_MAP = {
  product: { 'الاسم بالعربي': 'nameAr', 'الاسم بالانجليزي': 'nameEn', 'التكلفة': 'cost', 'سعر البيع': 'price', 'الوحدة': 'unitId', 'الرصيد الافتتاحي': 'openingQty', 'الحد الادنى للطلب': 'minStock', 'نقطة اعادة الطلب': 'reorderPoint', 'الحد الأعلى للطلب': 'maxStock', 'الباركود': 'barcode', 'رمز المنتج': 'code', 'بلد المنشأ': 'countryOriginId' },
  material: { 'الاسم بالعربي': 'nameAr', 'الاسم بالانجليزي': 'nameEn', 'التكلفة': 'cost', 'الوحدة': 'unitId', 'الرصيد الافتتاحي': 'openingQty', 'الحد الادنى للطلب': 'minStock', 'نقطة اعادة الطلب': 'reorderPoint', 'الحد الأعلى للطلب': 'maxStock', 'الباركود': 'barcode', 'معرف التصنيف': 'categoryId', 'التصنيف': 'categoryId', 'بلد المنشأ': 'countryOriginId' }
};
const TEMPLATE_COLS = {
  product: [['الاسم بالعربي', 'nameAr'], ['الاسم بالانجليزي', 'nameEn'], ['التكلفة', 'cost'], ['سعر البيع', 'price'], ['الوحدة', 'unitId'], ['الرصيد الافتتاحي', 'openingQty'], ['الحد الادنى للطلب', 'minStock'], ['نقطة اعادة الطلب', 'reorderPoint'], ['الحد الأعلى للطلب', 'maxStock'], ['الباركود', 'barcode'], ['بلد المنشأ', 'countryOriginId']],
  material: [['الاسم بالعربي', 'nameAr'], ['الاسم بالانجليزي', 'nameEn'], ['التكلفة', 'cost'], ['الوحدة', 'unitId'], ['الرصيد الافتتاحي', 'openingQty'], ['الحد الادنى للطلب', 'minStock'], ['نقطة اعادة الطلب', 'reorderPoint'], ['الحد الأعلى للطلب', 'maxStock'], ['الباركود', 'barcode'], ['معرف التصنيف', 'categoryId'], ['بلد المنشأ', 'countryOriginId']]
};
function mapImportRow(row, mapping) {
  const out = {}; let used = false;
  Object.entries(mapping).forEach(([label, key]) => { if (Object.prototype.hasOwnProperty.call(row, label)) { out[key] = row[label]; used = true; } });
  if (!used) return row;
  Object.entries(row).forEach(([k, v]) => { if (!mapping[k]) out[k] = v; });
  return out;
}
const rowEmpty = row => !Object.values(row || {}).some(v => String(v ?? '').trim() !== '');
/* The sheet may hold an id or a name (حبة / Piece): both resolve to the id. */
function refId(list, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if ((list || {})[raw]) return raw;
  const q = normQ(raw);
  const hit = Object.entries(list || {}).find(([, o]) => o && [o.nameAr, o.nameEn, o.name].some(n => n && normQ(n) === q));
  return hit ? hit[0] : raw;
}
/* Rows already in the file or in the list (same code, barcode or name) are skipped. */
function dedupeImport(rows, existing) {
  const ident = r => { const ar = normQ(r.nameAr || r.name || ''), en = normQ(r.nameEn || ''); return { code: r.code ? normQ(r.code) : '', bc: r.barcode ? normQ(r.barcode) : '', ar, en, both: [ar, en].filter(Boolean).join('|') }; };
  const sets = () => ({ code: new Set(), bc: new Set(), ar: new Set(), en: new Set(), both: new Set() });
  const remember = (s, i) => Object.keys(s).forEach(k => i[k] && s[k].add(i[k]));
  const has = (s, i) => Object.keys(s).some(k => i[k] && s[k].has(i[k]));
  const inList = sets(), inFile = sets();
  Object.values(existing || {}).forEach(it => it && remember(inList, ident(it)));
  const out = { rows: [], dupFile: 0, existing: 0 };
  rows.forEach(r => {
    const i = ident(r);
    if (has(inFile, i)) out.dupFile++;
    else if (has(inList, i)) out.existing++;
    else { out.rows.push(r); remember(inFile, i); }
  });
  return out;
}

/* =====================================================================
   المنتجات / مواد المخزون — one page builder, two configurations
   ===================================================================== */
const ITEM_CFG = {
  product: { route: 'products', path: 'products', cats: 'productCategories', other: 'stockMaterials', prefix: 'FG', state: 'prd', file: 'products', sheet: 'Products', zip: 'barcodes.zip', tpl: 'product-template.xlsx', ic: 'package' },
  material: { route: 'stock-materials', path: 'stockMaterials', cats: 'materialCategories', other: 'products', prefix: 'SK', state: 'mat', file: 'stock-materials', sheet: 'StockMaterials', zip: 'material-barcodes.zip', tpl: 'stock-materials-template.xlsx', ic: 'box' }
};

/* ---------- item references in records ----------
   Every voucher, sale, stocktake and sticker info that names an item by id. Used to stop
   deleting an item that has movements (the old page deleted it and its stock with it, and its
   printed labels could no longer be found), and to list items that were deleted that way so the
   manager can bring them back under the same id. */
const ITEM_REF_PATHS = ['production', 'stockIssue', 'transfers', 'cashierTransfers', 'transferRequests', 'stockReturn', 'scrapReturn', 'supplierReturns',
  'purchases', 'purchaseReceipts', 'pendingStockMoves', 'inventoryCount', 'productInfos', 'orders'];
const REF_LABEL = { production: 'ic.t.production', stockIssue: 'ic.t.issue', transfers: 'ic.t.transfer', cashierTransfers: 'ic.t.cashierTransfer', transferRequests: 'ic.t.cashierRequest',
  stockReturn: 'ic.t.stockReturn', scrapReturn: 'ic.t.scrapReturn', supplierReturns: 'ic.t.supplierReturn', purchases: 'dl.purchases', purchaseReceipts: 'ic.t.purchaseReceipt',
  pendingStockMoves: 'dl.purchases', inventoryCount: 'ic.t.inventory', productInfos: 'dl.infos', orders: 'ic.t.order' };
const refLabel = path => t(REF_LABEL[path] || path);
/* Each delete is logged at itemDeletions/{itemId}: who, when, and the item as it was (from 2026-11-09;
   earlier deletes, and deletes made on the old site, have no log) */
const ITEM_WATCH = [...ITEM_REF_PATHS, 'itemDeletions'];
const deletionLog = (type, id, it) => ({ type, nameAr: it.nameAr || it.name || '', nameEn: it.nameEn || '', code: it.code || '', barcode: it.barcode || '',
  by: (LIVE.user && LIVE.user.id) || null, byName: (LIVE.user && LIVE.user.name) || '', byRole: (LIVE.user && LIVE.user.role) || '', at: LIVE.now(), item: it });
/* Calls fn(ref) for each line that names an item: { path, recId, type, id, line, rec } */
function eachItemRef(fn, paths = ITEM_REF_PATHS) {
  paths.forEach(path => Object.entries(LIVE.cache[path] || {}).forEach(([recId, rec]) => {
    if (!rec || typeof rec !== 'object') return;
    const seen = new Set();
    const walk = (o, depth) => {
      if (!o || typeof o !== 'object' || depth > 5) return;
      if (Array.isArray(o)) { o.forEach(x => walk(x, depth + 1)); return; }
      const id = o.itemId || o.productId;
      if (typeof id === 'string' && id && !seen.has(o)) {
        seen.add(o);
        const type = path === 'orders' || path === 'productInfos' ? 'product' : ivType({ itemType: o.itemType || rec.itemType || 'product' });
        fn({ path, recId, type, id, line: o, rec });
      }
      Object.values(o).forEach(v => { if (v && typeof v === 'object') walk(v, depth + 1); });
    };
    walk(rec, 0);
  }));
}
/* How many records of each kind name this item */
function itemUsage(type, id) {
  const by = {}, recs = new Set();
  eachItemRef(r => {
    if (r.id !== id || r.type !== type || recs.has(`${r.path}/${r.recId}`)) return;
    recs.add(`${r.path}/${r.recId}`);
    const k = refLabel(r.path); by[k] = (by[k] || 0) + 1;
  });
  return { by, total: recs.size };
}
/* Items named in records that are no longer in the products / materials lists */
function deletedItems(type) {
  const live = { product: LIVE.cache.products || {}, material: LIVE.cache.stockMaterials || {} };
  const out = new Map();
  const pick = (...v) => v.find(x => typeof x === 'string' && x.trim()) || '';
  eachItemRef(r => {
    if (r.type !== type || live.product[r.id] || live.material[r.id]) return;
    const l = r.line, top = l === r.rec;
    let d = out.get(r.id);
    if (!d) out.set(r.id, d = { id: r.id, type, nameAr: '', nameEn: '', barcode: '', unitId: '', price: 0, origin: '', ingredients: '', recs: new Set(), by: {}, last: 0, prodQty: 0 });
    const ts = Number(r.rec.createdAt || r.rec.timestamp || 0) || 0;
    const newer = ts >= d.last;
    const ar = pick(l.itemNameAr, l.nameAr, l.productName, /[؀-ۿ]/.test(l.itemName || l.name || '') ? (l.itemName || l.name) : '');
    const en = pick(l.itemNameEn, l.nameEn, !/[؀-ۿ]/.test(l.itemName || l.name || '') ? (l.itemName || l.name) : '');
    if (ar && (newer || !d.nameAr)) d.nameAr = ar;
    if (en && (newer || !d.nameEn)) d.nameEn = en;
    // The item's own barcode: sticker info and sale lines carry it (a production barcode is the voucher's)
    if (r.path === 'productInfos' && l.barcode) d.barcode = String(l.barcode);
    else if (r.path === 'orders' && l.barcode && !d.barcode) d.barcode = String(l.barcode);
    if (l.unitId && (newer || !d.unitId)) d.unitId = l.unitId;
    if (r.path === 'orders' && Number(l.price) && (newer || !d.price)) d.price = Number(l.price);
    if ((l.origin || (top && r.rec.origin)) && !d.origin) d.origin = l.origin || r.rec.origin;
    if (l.ingredients && !d.ingredients) d.ingredients = l.ingredients;
    if (r.path === 'production') d.prodQty += Number(l.qty || 0) || 0;
    const key = `${r.path}/${r.recId}`;
    if (!d.recs.has(key)) { d.recs.add(key); const k = refLabel(r.path); d.by[k] = (d.by[k] || 0) + 1; }
    if (ts > d.last) d.last = ts;
  });
  // Logged deletes: who deleted it and when (an item deleted with no records shows from its log alone)
  Object.entries(LIVE.cache.itemDeletions || {}).forEach(([id, g]) => {
    if (!g || typeof g !== 'object' || (g.type || 'product') !== type || live.product[id] || live.material[id]) return;
    let d = out.get(id);
    if (!d) out.set(id, d = { id, type, nameAr: '', nameEn: '', barcode: '', unitId: '', price: 0, origin: '', ingredients: '', recs: new Set(), by: {}, last: 0, prodQty: 0 });
    d.del = g; d.nameAr ||= g.nameAr || ''; d.nameEn ||= g.nameEn || ''; d.barcode ||= g.barcode || '';
  });
  const when = d => Number((d.del && d.del.at) || 0) || d.last;
  return [...out.values()].filter(d => d.nameAr || d.nameEn).sort((a, b) => when(b) - when(a));
}
/* Closest current product or material by name (character pairs in common), to warn before restoring a duplicate */
function closestItem(type, name) {
  const pairs = s => { const n = normQ(s).replace(/[ىي]/g, 'ي').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' '); const m = new Map(); for (let i = 0; i < n.length - 1; i++) { const p = n.slice(i, i + 2); m.set(p, (m.get(p) || 0) + 1); } return [m, Math.max(0, n.length - 1)]; };
  const [a, na] = pairs(name); if (!na) return null;
  let best = null;
  [...Object.entries(LIVE.cache.products || {}), ...Object.entries(LIVE.cache.stockMaterials || {})].forEach(([id, it]) => {
    if (!it || typeof it !== 'object') return;
    const [b, nb] = pairs(it.nameAr || it.name || ''); if (!nb) return;
    let common = 0; a.forEach((c, p) => { common += Math.min(c, b.get(p) || 0); });
    const score = (2 * common) / (na + nb);
    if (!best || score > best.score) best = { id, it, score };
  });
  return best && best.score >= 0.72 ? best : null;
}

function itemsPage(view, kind) {
  const C = ITEM_CFG[kind], isP = kind === 'product';
  const PATHS = [C.path, C.cats, 'storageLocations', 'countryOrigins', 'branches', 'units'];
  const st = (S[C.state] ||= { q: '', branch: 'all', cats: [], locs: [], origin: 'all', sort: 'default', per: 10, page: 1, sel: new Set(), imp: null, alert: null });
  st.cats ||= []; st.locs ||= [];
  const K = k => t(`it.${kind}.${k}`);
  let first = true, saving = false, ordersUnsub = null;
  const COLS = isP ? 15 : 14;

  view.innerHTML = `
    ${pageHeader(C.route, `${['xlsx', 'pdf'].map(f => `<div class="dd ix-dd"><button class="btn btn-ghost" data-act="dd" aria-haspopup="menu">${icon(f === 'pdf' ? 'printer' : 'download')}<span>${t(f === 'pdf' ? 'ix.pdf' : 'ix.excel')}</span><em class="sel-n ix-n"></em>${icon('chevDown')}</button>
        <div class="dd-menu" role="menu">${['levels', 'all'].map(m => `<button class="dd-item ix-item" role="menuitem" data-ix="${f}:${m}">${icon(m === 'levels' ? 'layers' : 'list')}<span><b>${t('ix.' + m)}</b><small>${t('ix.' + m + 'Sub')}</small></span></button>`).join('')}</div></div>`).join('')}
      <button class="btn btn-ghost" data-it="export" disabled>${icon('download')}<span>${t('it.exportSel')}</span><em class="sel-n"></em></button>
      <button class="btn btn-ghost" data-it="zip" disabled>${icon('barcode')}<span>${t('it.bcZip')}</span><em class="sel-n"></em></button>
      <button class="btn btn-ghost" data-it="import">${icon('upload')}<span>${t('it.import')}</span></button>
      <button class="btn btn-ghost" data-it="deleted">${icon('trash')}<span>${t('dl.btn')}</span></button>
      <button class="btn btn-primary" data-it="new">${icon('plus')}<span>${K('new')}</span></button>`, K('sub'))}
    <section class="kpis" id="itK"></section>
    <section class="card pt-head" id="itAlert" hidden></section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="itQ" placeholder="${t('it.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        ${['locs', 'cats'].map(k => `<div class="select tb-select cb cb-has-cap mp" data-mp="${k}"><span class="cb-cap">${t(k === 'locs' ? 'it.storage' : 'it.category')}</span><button type="button" class="cb-input mp-btn" aria-haspopup="listbox" aria-label="${t(k === 'locs' ? 'it.storage' : 'it.category')}"></button>${icon('chevDown')}</div>`).join('')}
        <div class="select tb-select"><select id="itBranch" aria-label="${t('c.branch')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="itOrigin" aria-label="${t('it.origin')}"></select>${icon('chevDown')}</div>
        ${isP ? `<div class="select tb-select"><select id="itSort" aria-label="${t('it.sort')}">${['default', 'salesDesc', 'salesAsc', 'incompleteInfo'].map(k => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${t('it.sort.' + k)}</option>`).join('')}</select>${icon('chevDown')}</div>` : ''}
        <label class="per-field"><small>${t('it.perPage')}</small><span class="select mini"><select id="itPer">${[10, 50, 100].map(n => `<option ${st.per === n ? 'selected' : ''}>${n}</option>`).join('')}</select>${icon('chevDown')}</span></label>
      </div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th class="sel-col"><input type="checkbox" id="itAll" aria-label="${t('it.selectAll')}"></th><th>${t('it.code')}</th><th>${t('c.name')}</th>${isP ? `<th class="end">${t('it.price')}</th>` : ''}<th class="end">${t('it.cost')}</th><th>${t('it.unit')}</th><th class="end">${t('it.stock')}</th><th>${t('it.category')}</th><th>${t('it.storage')}</th><th>${t('it.origin')}</th><th class="end">${t('it.min')}</th><th class="end">${t('it.reorder')}</th><th class="end">${t('it.max')}</th><th>${t('it.barcode')}</th><th class="act-col"></th></tr></thead>
        <tbody id="itBody"></tbody>
      </table></div>
      <footer class="pager" id="itPager"></footer>
    </section>`;

  /* Sales per product (orders, minus cancelled invoices) — only loaded when sorting by sales */
  let salesSrc = null, sales = {};
  function salesMap() {
    const orders = LIVE.cache.orders;
    if (orders === salesSrc) return sales;
    salesSrc = orders; sales = {};
    Object.values(orders || {}).forEach(o => {
      if (!o || o.status === 'cancelled' || o.isCancelled === true) return;
      items$(o.items).forEach(it => { sales[it.productId] = (sales[it.productId] || 0) + Number(it.qty || 0); });
    });
    return sales;
  }
  const needsSales = () => isP && (st.sort === 'salesDesc' || st.sort === 'salesAsc');
  function ensureOrders() { if (needsSales() && !ordersUnsub) ordersUnsub = LIVE.watch(['orders'], draw); }

  function list() {
    const q = normQ(st.q);
    let rows = Object.entries(LIVE.cache[C.path] || {}).filter(([, it]) => it && typeof it === 'object').map(([id, it]) => ({ id, it }));
    if (st.cats.length) { const cs = catSet(); rows = rows.filter(r => cs.has(r.it.categoryId)); }
    if (st.locs.length) rows = rows.filter(r => matchLoc(r.id));
    if (st.origin !== 'all') rows = rows.filter(r => r.it.countryOriginId === st.origin);
    if (st.alert) rows = rows.filter(r => reorderTone(itemStock(r.it, st.branch), Number(r.it.reorderPoint || 0)) === st.alert);
    if (q) rows = rows.filter(r => normQ(`${r.it.nameAr || ''} ${r.it.nameEn || ''} ${r.it.name || ''}`).includes(q) || normQ(r.it.code).includes(q) || normQ(r.it.barcode).includes(q));
    if (!isP) return rows;
    const newest = (a, b) => createdSort(b.id, b.it) - createdSort(a.id, a.it);
    if (needsSales()) { const m = salesMap(), dir = st.sort === 'salesDesc' ? -1 : 1; rows.sort((a, b) => dir * ((m[a.id] || 0) - (m[b.id] || 0))); }
    else if (st.sort === 'incompleteInfo') rows = rows.filter(r => r.it.incompleteInfo || r.it.missingInfo).sort(newest);
    else rows.sort(newest);
    return rows;
  }

  const n3 = v => fmtNum(Number(v || 0), 3);
  // Where the main branch keeps the item, with the quantity in each location
  const locCell = (type, id) => {
    const rows = locRows(type, id), none = locView(type, id).none;
    if (!rows.length) return '<span class="muted">—</span>';
    return `<span class="loc-list">${rows.map(x => `<span${x.def ? ' class="def"' : ''}>${esc(locName(x.loc))} <b class="num">${n3(x.qty)}</b></span>`).join('')}${none > 1e-9 && rows.length ? `<span class="muted">${t('sl.noLocation')} <b class="num">${n3(none)}</b></span>` : ''}</span>`;
  };
  const named = (path, id) => esc(nameOf((LIVE.cache[path] || {})[id]) || '') || '<span class="muted">—</span>';
  function row(r, i) {
    const it = r.it, stock = itemStock(it, st.branch), tone = reorderTone(stock, Number(it.reorderPoint || 0));
    const alt = S.lang === 'ar' ? it.nameEn : it.nameAr;
    return `<tr data-id="${esc(r.id)}" class="${first ? 'row-in' : ''}${tone ? ' rl-' + tone : ''}" style="--r:${i}">
      <td class="sel-col"><input type="checkbox" data-sel ${st.sel.has(r.id) ? 'checked' : ''} aria-label="${esc(nameOf(it))}"></td>
      <td data-label="${t('it.code')}"><span class="mono">${esc(it.code || '-')}</span></td>
      <td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(nameOf(it) || '-')}</b>${alt && alt !== nameOf(it) ? `<small>${esc(alt)}</small>` : ''}</span></td>
      ${isP ? `<td data-label="${t('it.price')}" class="end"><span class="num">${fmtMoney(Number(it.price || 0))}</span></td>` : ''}
      <td data-label="${t('it.cost')}" class="end"><span class="num">${fmtMoney(Number(it.cost || 0))}</span></td>
      <td data-label="${t('it.unit')}">${esc(unitWithDef(it))}</td>
      <td data-label="${t('it.stock')}" class="end">${tone ? `<span class="badge tone-${tone === 'critical' ? 'danger' : 'warning'}" data-tip="${t(tone === 'critical' ? 'it.criticalTip' : 'it.warningTip')}"><i></i>${n3(stock)}</span>` : `<span class="num">${n3(stock)}</span>`}</td>
      <td data-label="${t('it.category')}">${esc(catLabel(it.categoryId)) || '<span class="muted">—</span>'}</td>
      <td data-label="${t('it.storage')}">${locCell(kind, r.id)}</td>
      <td data-label="${t('it.origin')}">${named('countryOrigins', it.countryOriginId)}</td>
      <td data-label="${t('it.min')}" class="end num">${n3(it.minStock)}</td>
      <td data-label="${t('it.reorder')}" class="end num">${n3(it.reorderPoint)}</td>
      <td data-label="${t('it.max')}" class="end num">${n3(it.maxStock)}</td>
      <td data-label="${t('it.barcode')}">${it.barcode ? `<button type="button" class="bc-cell" data-copy="${esc(it.barcode)}" data-tip="${t('it.clickCopy')}"><canvas data-bc="${esc(it.barcode)}" height="40"></canvas><small class="mono">${esc(it.barcode)}</small></button>` : '<span class="muted">—</span>'}</td>
      <td class="act-col"><div class="row-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-it="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
        ${it.barcode ? `<button class="btn-icon sm" data-it="bc" aria-label="${t('it.downloadBc')}">${icon('download')}</button>` : ''}
        <button class="btn-icon sm danger" data-it="delete" aria-label="${t('delete')}">${icon('trash')}</button>
      </div></td></tr>`;
  }

  /* Barcodes are drawn after the rows are in place (canvases kept while the rows don't change) */
  function paintBarcodes() {
    const todo = $$('canvas[data-bc]:not(.done)', view);
    if (!todo.length) return;
    needLib('JsBarcode').then(() => todo.forEach(c => {
      if (c.isConnected && !c.classList.contains('done')) { c.classList.add('done'); drawBarcode(c, c.dataset.bc, { displayValue: false, height: 30, width: 1.2, margin: 0 }) || c.classList.add('bad'); }
    })).catch(() => {});
  }

  function syncSelection(pageIds) {
    const all = $('#itAll', view);
    const on = pageIds.filter(id => st.sel.has(id)).length;
    all.checked = pageIds.length > 0 && on === pageIds.length;
    all.indeterminate = on > 0 && on < pageIds.length;
    $$('[data-it="export"], [data-it="zip"]', view).forEach(b => { b.disabled = !st.sel.size; $('.sel-n', b).textContent = st.sel.size ? st.sel.size : ''; });
  }
  let pageIds = [];

  function draw() {
    const body = $('#itBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(6, COLS)); $('#itK', view).innerHTML = skeletonKpis(); return; }
    const items = LIVE.cache[C.path] || {};
    // Items removed elsewhere drop out of the selection
    [...st.sel].forEach(id => { if (!items[id]) st.sel.delete(id); });
    let crit = 0, warn = 0;
    Object.values(items).forEach(it => { if (!it || typeof it !== 'object') return; const tone = reorderTone(itemStock(it, st.branch), Number(it.reorderPoint || 0)); if (tone === 'critical') crit++; else if (tone === 'warning') warn++; });
    setKpis($('#itK', view), [
      kpiCard({ label: K('kTotal'), value: Object.keys(items).length, ic: C.ic, tone: 'c1' }),
      kpiCard({ label: t('it.kCats'), value: Object.keys(LIVE.cache[C.cats] || {}).length, ic: 'folder', tone: 'c2', drill: 'cats' }),
      alertKpi('warning', t('it.kWarning'), warn, 'clock', STOCK_ALARM.unseen(C.route, 'warning')),
      alertKpi('critical', t('it.kCritical'), crit, 'alert', STOCK_ALARM.unseen(C.route, 'critical'))
    ].join(''), first);
    const bar = $('#itAlert', view);
    bar.hidden = !st.alert;
    if (st.alert) setHtml(bar, `<div class="toolbar"><button class="btn btn-ghost" data-it="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
      <h2 class="pt-title">${t(st.alert === 'critical' ? 'it.kCritical' : 'it.kWarning')}<small>${st.alert === 'critical' ? crit : warn} ${t('it.items')}</small></h2></div>`);
    setHtml($('#itBranch', view), `<option value="all">${t('allBranches')}</option>` + optsHtml(sortedOpts(LIVE.cache.branches).map(([id]) => [id, branchLabel(id)]), st.branch));
    mpCompute(items); mpPaint();
    setHtml($('#itOrigin', view), `<option value="all">${t('it.allOrigins')}</option>` + optsHtml(sortedOpts(LIVE.cache.countryOrigins), st.origin));
    if (needsSales() && !LIVE.loaded(['orders'])) { setHtml(body, skeletonRows(6, COLS)); setHtml($('#itPager', view), `<span class="pager-info">${t('it.loadingSales')}</span>`); return; }
    const rows = list();
    $$('.ix-n', view).forEach(n => { n.textContent = fmtNum(rows.length); });
    const per = st.per;
    setHtml($('#itPager', view), pagerHtml(st, rows.length));
    const slice = rows.slice((st.page - 1) * per, st.page * per);
    pageIds = slice.map(r => r.id);
    const filtering = st.alert || st.q || st.cats.length || st.locs.length || st.origin !== 'all' || st.sort === 'incompleteInfo';
    setHtml(body, slice.length ? slice.map(row).join('')
      : `<tr class="empty"><td colspan="${COLS}"><div class="empty-state">${icon(filtering ? 'search' : C.ic)}<b>${filtering ? t('emptyTitle') : K('none')}</b><small>${filtering ? t('emptySub') : K('noneSub')}</small></div></td></tr>`);
    syncSelection(pageIds);
    paintBarcodes();
    first = false;
  }

  /* ---------- add / edit form ---------- */
  function openForm(id) {
    if (!afterCatalog([C.other], () => openForm(id))) return;
    const it = id ? (LIVE.cache[C.path] || {})[id] : null;
    if (id && !it) return;
    const dr = freshDrawer(true);
    const units = sortedOpts(LIVE.cache.units), origins = sortedOpts(LIVE.cache.countryOrigins);
    const v = (k, d = '') => esc(it ? it[k] ?? d : d);
    const hasDef = !!(it && (it.unitDefinitionQty || it.unitDefinitionUnitId));
    const fixed = !!(it && it.fixedExpiryEnabled);
    const numIn = (fid, k) => `<input id="${fid}" type="number" inputmode="decimal" step="any" min="0" value="${v(k)}" dir="ltr">`;
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(it ? 'pencil' : C.ic)}</span><div><h2 id="drawerTitle">${it ? K('edit') : K('new')}</h2><p>${it ? esc(nameOf(it)) : t('fillForm')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body it-form" novalidate id="itForm">
        <div class="form-grid">
          <div class="field"><label for="fCode">${t('it.code')}</label><input id="fCode" value="${esc(it ? it.code || '' : fixedCode(C.prefix))}" readonly dir="ltr"></div>
          <div class="field"><label for="fBc">${t('it.barcodeValue')}</label><div class="inline-input"><input id="fBc" value="${esc(it ? it.barcode || '' : newBarcode())}" dir="ltr" autocomplete="off"><button type="button" class="btn btn-ghost btn-sm" id="fBcGen">${icon('refresh')}<span>${t('it.generate')}</span></button></div></div>
          <div class="field"><label for="fAr">${t('it.nameAr')} <em>*</em></label><input id="fAr" dir="rtl" value="${esc(it ? it.nameAr || it.name || '' : '')}" autocomplete="off"><small class="err"></small></div>
          <div class="field"><label for="fEn">${t('it.nameEn')} <em>*</em></label><input id="fEn" dir="ltr" value="${v('nameEn')}" autocomplete="off"><small class="err"></small></div>
          <div class="field"><label for="fCost">${t('it.cost')}</label>${numIn('fCost', 'cost')}</div>
          ${isP ? `<div class="field"><label for="fPrice">${t('it.price')}</label>${numIn('fPrice', 'price')}</div>` : ''}
          <div class="field"><label for="fUnit">${t('it.unit')} <em>*</em></label><div class="select"><select id="fUnit">${optsHtml(units, it ? it.unitId || '' : '', t('it.chooseUnit'))}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="fOrigin">${t('it.origin')}</label><div class="select"><select id="fOrigin">${optsHtml(origins, it ? it.countryOriginId || '' : '', '—')}</select>${icon('chevDown')}</div></div>
        </div>
        <div class="def-wrap${it && it.unitId ? '' : ' hidden'}" id="fDefWrap">
          <button type="button" class="btn btn-soft btn-sm" id="fDefToggle" aria-expanded="${hasDef}">${icon('ruler')}<span>${t('it.unitDef')}</span></button>
          <div class="def-fields${hasDef ? '' : ' hidden'}" id="fDef">
            <span class="def-eq" id="fDefBase">1 ${esc(unitName(it && it.unitId))} =</span>
            <input id="fDefQty" inputmode="decimal" dir="ltr" value="${v('unitDefinitionQty')}" placeholder="${t('it.unitDefQty')}" autocomplete="off">
            <div class="select"><select id="fDefUnit">${optsHtml(units, it ? it.unitDefinitionUnitId || '' : '', t('it.unitDefUnit'))}</select>${icon('chevDown')}</div>
            <small class="err" id="fDefErr"></small>
          </div>
        </div>
        ${isP ? `<div class="exp-wrap"><label class="check-line"><input type="checkbox" id="fFixed" ${fixed ? 'checked' : ''}> ${t('it.fixedExpiry')}</label>
          <div class="form-grid${fixed ? '' : ' hidden'}" id="fFixedFields">
            <div class="field"><label for="fProd">${t('it.prodDate')}</label><input type="date" id="fProd" value="${v('fixedProductionDate')}"><small class="err"></small></div>
            <div class="field"><label for="fExp">${t('it.expDate')}</label><input type="date" id="fExp" value="${v('fixedExpiryDate')}"><small class="err"></small></div>
          </div></div>` : ''}
        <div class="form-grid">
          <div class="field"><label for="fOpen">${t('it.opening')}</label>${it ? `<input id="fOpen" value="${esc(fmtNum(Number(it.openingQty ?? (it.stockByBranch || {})[it.mainBranchId || mainBranch()] ?? 0), 3))}" readonly dir="ltr"><small class="hint">${t('it.openingLocked')}</small>` : numIn('fOpen', 'openingQty')}</div>
          <div class="field"><label for="fMin">${t('it.min')}</label>${numIn('fMin', 'minStock')}</div>
          <div class="field"><label for="fRe">${t('it.reorder')}</label>${numIn('fRe', 'reorderPoint')}</div>
          <div class="field"><label for="fMax">${t('it.max')}</label>${numIn('fMax', 'maxStock')}</div>
        </div>
        <div class="bc-preview"><div><small>${t('it.preview')}</small><canvas id="fBcPrev" height="80"></canvas><span class="muted" id="fBcBad"></span></div>
          <button type="button" class="btn btn-ghost btn-sm" id="fBcDl">${icon('download')}<span>${t('it.downloadBc')}</span></button></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="fSave">${icon('check')}<span>${t(it ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');

    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input, select', dr).forEach(i => i.addEventListener('input', () => { const f = i.closest('.field'); f && f.classList.contains('invalid') && err('#' + i.id, ''); }));
    const bc = $('#fBc', dr), prev = $('#fBcPrev', dr);
    let bcT;
    const preview = () => {
      const val = bc.value.trim();
      needLib('JsBarcode').then(() => {
        const ok = !!val && drawBarcode(prev, val, { displayValue: true, height: 60 });
        prev.classList.toggle('hidden', !ok);
        $('#fBcBad', dr).textContent = val && !ok ? t('it.bcInvalid') : '';
        $('#fBcDl', dr).disabled = !ok;
      }).catch(() => { prev.classList.add('hidden'); $('#fBcDl', dr).disabled = true; });
    };
    preview();
    bc.addEventListener('input', () => { clearTimeout(bcT); bcT = setTimeout(preview, 150); });
    $('#fBcGen', dr).addEventListener('click', () => { bc.value = newBarcode(); preview(); });
    $('#fBcDl', dr).addEventListener('click', () => prev.toBlob(b => b && saveBlob(b, `${fileSafe($('#fCode', dr).value || bc.value)}.png`)));

    // Unit definition (e.g. 1 carton = 12 pieces) — shown once a unit is chosen
    const unitSel = $('#fUnit', dr), defWrap = $('#fDefWrap', dr), def = $('#fDef', dr);
    const clearDef = () => { $('#fDefQty', dr).value = ''; $('#fDefUnit', dr).value = ''; $('#fDefErr', dr).textContent = ''; };
    unitSel.addEventListener('change', () => {
      defWrap.classList.toggle('hidden', !unitSel.value);
      $('#fDefBase', dr).textContent = `1 ${unitName(unitSel.value)} =`;
      if (!unitSel.value) { def.classList.add('hidden'); clearDef(); }
    });
    $('#fDefToggle', dr).addEventListener('click', e => {
      const open = def.classList.toggle('hidden') === false;
      e.currentTarget.setAttribute('aria-expanded', open);
      if (open) $('#fDefQty', dr).focus(); else clearDef();
    });
    if (isP) $('#fFixed', dr).addEventListener('change', e => $('#fFixedFields', dr).classList.toggle('hidden', !e.target.checked));

    const save = async e => {
      e && e.preventDefault();
      if (saving) return;
      const val = sel => $(sel, dr).value.trim();
      const num = sel => Number(val(sel) || 0);
      const nameAr = val('#fAr'), nameEn = val('#fEn'), unitId = val('#fUnit');
      const defQty = def.classList.contains('hidden') ? '' : val('#fDefQty'), defUnit = def.classList.contains('hidden') ? '' : val('#fDefUnit');
      const fixedOn = isP && $('#fFixed', dr).checked, prodDate = isP ? val('#fProd') : '', expDate = isP ? val('#fExp') : '';
      let bad = false;
      if (!nameAr) { err('#fAr', t('required')); bad = true; }
      if (!nameEn) { err('#fEn', t('required')); bad = true; }
      if (!unitId) { err('#fUnit', t('required')); bad = true; }
      if (!!defQty !== !!defUnit) { $('#fDefErr', dr).textContent = t('it.unitDefBoth'); bad = true; }
      if (fixedOn && !prodDate) { err('#fProd', t('it.datesBoth')); bad = true; }
      if (fixedOn && !expDate) { err('#fExp', t('it.datesBoth')); bad = true; }
      if (bad) { const f = $('.invalid input, .invalid select', dr) || $('#fDefQty', dr); f && f.focus(); return; }
      const cur = id ? (LIVE.cache[C.path] || {})[id] : null;
      if (id && !cur) { toast(t('it.goneElsewhere'), { tone: 'danger', ic: 'alert' }); closeLayers(); return; }
      const openInput = id ? 0 : num('#fOpen');
      const openingQty = id ? Number(cur.openingQty ?? (cur.stockByBranch || {})[cur.mainBranchId || mainBranch()] ?? 0) : openInput;
      const payload = {
        code: id ? (keepOrReplaceCode(val('#fCode'), C.prefix, id) || fixedCode(C.prefix, usedItemCodes(id))) : normalizeItemCode(val('#fCode'), C.prefix),
        barcode: val('#fBc'), nameAr, nameEn, cost: num('#fCost'),
        ...(isP ? { price: num('#fPrice') } : {}),
        unitId, countryOriginId: val('#fOrigin') || null,
        ...(isP ? { fixedExpiryEnabled: fixedOn, fixedProductionDate: fixedOn ? prodDate : null, fixedExpiryDate: fixedOn ? expDate : null } : {}),
        unitDefinitionQty: defQty && defUnit ? defQty : null, unitDefinitionUnitId: defQty && defUnit ? defUnit : null,
        openingQty, minStock: num('#fMin'), reorderPoint: num('#fRe'), maxStock: num('#fMax')
      };
      const btn = $('#fSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) {
          const up = {};
          Object.entries(payload).forEach(([k, x]) => { up[`${C.path}/${id}/${k}`] = x; });
          await LIVE.update(up);
        } else {
          const main = mainBranch();
          await LIVE.update({ [`${C.path}/${LIVE.newKey(C.path)}`]: { ...payload, mainBranchId: main, stockByBranch: main ? { [main]: openingQty } : {}, createdAt: LIVE.now() } });
        }
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#itForm', dr).addEventListener('submit', save);
    $('#fSave', dr).addEventListener('click', save);
    setTimeout(() => $('#fAr', dr).focus(), 320);
  }

  /* An item with movements or stock is never deleted: its vouchers, sales and printed labels
     still point to it. The records are read in full first. */
  let refWatch = null;
  const refsReady = () => { refWatch ||= LIVE.watch(ITEM_WATCH, () => {}); return LIVE.complete(ITEM_WATCH); };
  async function remove(id) {
    const it = (LIVE.cache[C.path] || {})[id]; if (!it) return;
    if (!refsReady()) { toast(t('waitAll'), { ic: 'clock' }); await LIVE.whenLoaded(ITEM_WATCH); if (!(LIVE.cache[C.path] || {})[id]) return; }
    const use = itemUsage(kind, id);
    const stock = Object.values(it.stockByBranch || {}).reduce((s, q) => s + (Number(q) || 0), 0);
    if (use.total || Math.abs(stock) > 1e-9) {
      await confirmDialog({ title: K('cantDelete'), tone: 'danger', icon: 'alert', ok: t('dl.ok'),
        body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(it) || '-')}</b></div><div><small>${t('it.code')}</small><b class="mono">${esc(it.code || '-')}</b></div>
          ${Math.abs(stock) > 1e-9 ? `<div><small>${t('it.stock')}</small><b class="num">${fmtNum(stock, 3)}</b></div>` : ''}
          ${Object.entries(use.by).map(([k, n]) => `<div><small>${esc(k)}</small><b class="num">${fmtNum(n)}</b></div>`).join('')}</div>
          <p class="cf-note">${t('dl.blockNote')}</p>` });
      return;
    }
    const ok = await confirmDialog({ title: K('deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(it) || '-')}</b></div><div><small>${t('it.code')}</small><b class="mono">${esc(it.code || '-')}</b></div></div><p class="cf-note">${t('it.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`${C.path}/${id}`]: null, [`itemDeletions/${id}`]: deletionLog(kind, id, it) }); st.sel.delete(id); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  async function downloadOneBarcode(id) {
    const it = (LIVE.cache[C.path] || {})[id]; if (!it || !it.barcode) return;
    try {
      const blob = await barcodePng(it.barcode);
      if (!blob) { toast(t('it.bcInvalid'), { tone: 'danger', ic: 'alert' }); return; }
      saveBlob(blob, `${fileSafe(it.nameAr || it.nameEn || it.code || it.barcode)}.png`);
    } catch (e) { libFailed(); }
  }

  const selectedItems = () => [...st.sel].map(id => (LIVE.cache[C.path] || {})[id]).filter(Boolean);
  async function exportSelected() {
    const items = selectedItems(); if (!items.length) { toast(t('it.selectFirst'), { tone: 'danger', ic: 'alert' }); return; }
    try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
    const data = items.map(it => ({ code: it.code, nameAr: it.nameAr, nameEn: it.nameEn, cost: it.cost, ...(isP ? { price: it.price } : {}), unitId: it.unitId, openingQty: it.openingQty, minStock: it.minStock, reorderPoint: it.reorderPoint, maxStock: it.maxStock, barcode: it.barcode,
      ...(isP ? {} : { categoryId: it.categoryId || '', storageLocationId: it.storageLocationId || '' }), countryOriginId: it.countryOriginId || '' }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), C.sheet);
    XLSX.writeFile(wb, `${C.file}.xlsx`);
    toast(t('exported'));
  }
  /* ---------- storage location & category: tick several; each list keeps only what the other's ticks hold ---------- */
  const matchLoc = id => st.locs.some(l => inLocation(kind, id, l));
  const catOf = id => (LIVE.cache[C.cats] || {})[id];
  /* Category tree: a category shows as "last sub - main", e.g. "سمبوسة مجمدة - الحبوب الكاملة".
     The middle level is added only when two categories would read the same. */
  const catName = (o, lang) => (!o ? '' : lang === 'en' ? (o.nameEn || o.name_en || o.name || o.nameAr || o.name_ar || '') : (o.nameAr || o.name_ar || o.name || o.nameEn || o.name_en || ''));
  let catMemo = null;
  function catTree() {
    const src = LIVE.cache[C.cats] || {};
    if (catMemo && catMemo.src === src) return catMemo;
    const ok = id => id && src[id] && typeof src[id] === 'object';
    const chain = id => { const ch = [id]; let p = src[id].parentId; while (ok(p) && !ch.includes(p)) { ch.push(p); p = src[p].parentId; } return ch; };
    const chains = {}, kids = {};
    Object.keys(src).forEach(id => { if (!ok(id)) return; chains[id] = chain(id); const p = chains[id][1]; if (p) (kids[p] ||= []).push(id); });
    const label = lang => {
      const short = ch => (ch.length > 1 ? [ch[0], ch[ch.length - 1]] : ch);
      const txt = ids => ids.map(j => catName(src[j], lang)).filter(Boolean).join(' - ');
      const count = {}; Object.values(chains).forEach(ch => { const k = txt(short(ch)); count[k] = (count[k] || 0) + 1; });
      const out = {}; Object.entries(chains).forEach(([id, ch]) => { const k = txt(short(ch)); out[id] = (count[k] > 1 ? txt(ch) : k) || id; });
      return out;
    };
    // sort key: main first, then the middle level, then the last sub, so each main's categories sit together
    const sortKey = id => [...chains[id]].reverse().map(j => catName(src[j], S.lang)).join(' › ');
    const under = id => { const out = [id]; for (let i = 0; i < out.length; i++) (kids[out[i]] || []).forEach(k => { if (!out.includes(k)) out.push(k); }); return out; };
    catMemo = { src, chains, ar: label('ar'), en: label('en'), sortKey, under };
    return catMemo;
  }
  const catLabel = (id, lang = S.lang) => (id ? catTree()[lang === 'en' ? 'en' : 'ar'][id] || '' : '');
  const catBi = id => { const a = catLabel(id, 'ar'), e = catLabel(id, 'en'); return e && e !== a ? (a ? `${a} / ${e}` : e) : a; };
  // the chosen categories plus everything inside them
  const catSet = () => { const tr = catTree(), set = new Set(); st.cats.forEach(id => tr.under(id).forEach(x => set.add(x))); return set; };
  const catOpts = () => { const tr = catTree(); return Object.keys(tr.chains).map(id => [id, catLabel(id)]).sort((a, b) => tr.sortKey(a[0]).localeCompare(tr.sortKey(b[0]), S.lang === 'en' ? 'en' : 'ar')); };
  const MP = {
    locs: { all: () => t('it.allLocs'), many: n => t('ix.nLocs').replace('{n}', n), one: id => locName(id) },
    cats: { all: () => t('it.allCats'), many: n => t('ix.nCats').replace('{n}', n), one: id => catLabel(id) }
  };
  const mpOpts = { locs: [], cats: [] }, mpHint = { locs: '', cats: '' };
  let mpOpen = null;
  function mpCompute(items) {
    const all = Object.entries(items).filter(([, it]) => it && typeof it === 'object');
    const inLoc = st.locs.length ? all.filter(([id]) => matchLoc(id)) : all;
    // only categories that hold products themselves (a folder of sub-categories alone is left out)
    const catIds = new Set(inLoc.map(([, it]) => it.categoryId).filter(Boolean));
    mpOpts.cats = catOpts().filter(([id]) => catIds.has(id) || st.cats.includes(id));
    const cs = catSet(), inCat = st.cats.length ? all.filter(([, it]) => cs.has(it.categoryId)) : all;
    mpOpts.locs = [...sortedOpts(LIVE.cache.storageLocations), [LOC_NONE, t('sl.noLocation')]]
      .filter(([loc]) => !st.cats.length || st.locs.includes(loc) || inCat.some(([id]) => inLocation(kind, id, loc)));
    const names = (ids, key) => ids.map(MP[key].one).filter(Boolean).join('، ');
    mpHint.cats = st.locs.length ? t('ix.catsOfLoc').replace('{x}', names(st.locs, 'locs')) : '';
    mpHint.locs = st.cats.length ? t('ix.locsOfCat').replace('{x}', names(st.cats, 'cats')) : '';
  }
  const mpLabel = key => (!st[key].length ? MP[key].all() : st[key].length === 1 ? MP[key].one(st[key][0]) : MP[key].many(st[key].length));
  function mpPaint() {
    $$('[data-mp]', view).forEach(w => {
      const key = w.dataset.mp, b = $('.mp-btn', w), cap = $('.cb-cap', w);
      b.textContent = mpLabel(key);
      w.classList.toggle('mp-on', st[key].length > 0);
      if (cap.offsetWidth) b.style.paddingInlineStart = `${cap.offsetWidth + 22}px`;
    });
    if (mpOpen) { mpList(); mpPlace(); }
  }
  function mpShow(key) {
    mpClose();
    const w = $(`[data-mp="${key}"]`, view); if (!w) return;
    const el = document.createElement('div');
    el.className = 'cb-list mp-list'; el.setAttribute('role', 'listbox'); el.setAttribute('aria-multiselectable', 'true');
    el.innerHTML = `<label class="mp-search">${icon('search')}<input type="search" class="mp-q" placeholder="${esc(t('ix.searchIn'))}" autocomplete="off"></label><p class="mp-hint" hidden></p><div class="mp-opts"></div>`;
    document.body.appendChild(el);
    mpOpen = { key, el, w, q: '' };
    w.classList.add('cb-open');
    $('.mp-q', el).addEventListener('input', e => { mpOpen.q = e.target.value; mpList(); });
    el.addEventListener('mousedown', e => { if (!e.target.closest('.mp-q')) e.preventDefault(); });
    el.addEventListener('click', e => { const o = e.target.closest('[data-v]'); if (o) mpToggle(key, o.dataset.v); });
    mpList(); mpPlace();
    setTimeout(() => { const q = mpOpen && $('.mp-q', mpOpen.el); q && q.focus(); }, 0);
  }
  function mpList() {
    const { key, el, q } = mpOpen, nq = normQ(q), sel = st[key];
    const hint = $('.mp-hint', el); hint.hidden = !mpHint[key]; hint.textContent = mpHint[key];
    const opts = mpOpts[key].filter(([, n]) => !nq || normQ(n).includes(nq));
    const box = on => `<span class="mp-box${on ? ' on' : ''}">${on ? icon('check') : ''}</span>`;
    const opt = (v, n, on) => `<div class="cb-opt mp-opt${on ? ' sel' : ''}" role="option" aria-selected="${on}" data-v="${esc(v)}">${box(on)}<span>${esc(n)}</span></div>`;
    $('.mp-opts', el).innerHTML = (nq ? '' : opt('', MP[key].all(), !sel.length))
      + (opts.length ? opts.map(([id, n]) => opt(id, n, sel.includes(id))).join('') : `<div class="cb-none">${esc(t('noResults'))}</div>`);
  }
  function mpPlace() {
    if (!mpOpen) return;
    const { w, el } = mpOpen, r = w.getBoundingClientRect(), wd = Math.max(r.width, 260);
    const below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 260 && above > below;
    el.style.width = `${wd}px`;
    el.style.maxHeight = `${Math.min(380, Math.max(180, up ? above : below))}px`;
    el.style.left = `${Math.min(Math.max(8, document.dir === 'rtl' ? r.right - wd : r.left), innerWidth - wd - 8)}px`;
    el.style.top = up ? '' : `${r.bottom + 6}px`;
    el.style.bottom = up ? `${innerHeight - r.top + 6}px` : '';
    el.classList.toggle('up', up);
  }
  function mpClose() {
    if (!mpOpen) return;
    mpOpen.el.remove(); mpOpen.w.classList.remove('cb-open'); mpOpen = null;
  }
  function mpToggle(key, v) {
    st[key] = !v ? [] : st[key].includes(v) ? st[key].filter(x => x !== v) : [...st[key], v];
    st.page = 1; draw();
  }
  const mpOutside = e => { if (mpOpen && !mpOpen.el.contains(e.target) && !mpOpen.w.contains(e.target)) mpClose(); };
  const mpKey = e => { if (e.key === 'Escape' && mpOpen) { const w = mpOpen.w; mpClose(); $('.mp-btn', w).focus(); } };
  const mpMove = e => { if (mpOpen && !(e.target && e.target.closest && e.target.closest('.mp-list'))) mpPlace(); };
  document.addEventListener('mousedown', mpOutside, true);
  document.addEventListener('keydown', mpKey);
  addEventListener('scroll', mpMove, true); addEventListener('resize', mpMove);
  const mpCleanup = () => { mpClose(); document.removeEventListener('mousedown', mpOutside, true); document.removeEventListener('keydown', mpKey); removeEventListener('scroll', mpMove, true); removeEventListener('resize', mpMove); };

  /* ---------- Excel / PDF of what the filters show now (every page), in Arabic and English ---------- */
  const bi = k => { if (Array.isArray(k)) return k.filter(Boolean); const a = I18N.ar[k] ?? k, e = I18N.en[k] ?? a; return a === e ? [a] : [a, e]; };
  const biText = k => bi(k).join(' / ');
  const biName = o => { if (!o) return ''; const a = o.nameAr || o.name || '', e = o.nameEn || ''; return e && e !== a ? (a ? `${a} / ${e}` : e) : a; };
  const locBi = loc => (loc === LOC_NONE ? biText('sl.noLocation') : biName((LIVE.cache.storageLocations || {})[loc]));
  function exportTable(mode) {
    const rows = list(), lvl = mode === 'levels';
    // Stock is per branch: one branch chosen → its column, named; all branches → a column for each branch and a total
    const brs = Object.entries(LIVE.cache.branches || {}).filter(([, b]) => b && typeof b === 'object')
      .sort((a, b) => (!!b[1].isMain - !!a[1].isMain) || (a[1].nameAr || '').localeCompare(b[1].nameAr || '', 'ar')).map(([id]) => id);
    const brBi = id => { const b = (LIVE.cache.branches || {})[id] || {}, a = b.nameAr || b.name || branchLabel(id), e = b.nameEn || ''; return [a, e && e !== a ? e : ''].filter(Boolean); };
    const [sA, sE] = bi('it.stock'), [tA, tE] = bi('ix.total');
    const one = st.branch !== 'all', qBr = one ? [st.branch] : brs;
    const stockKeys = one ? [(([a, e]) => [`${sA} - ${a}`, e ? `${sE} - ${e}` : sE])(brBi(st.branch))]
      : [...brs.map(brBi), [tA, tE]];
    const stockVals = it => { const v = qBr.map(b => itemStock(it, b)); return one ? v : [...v, v.reduce((x, y) => x + y, 0)]; };
    const keys = lvl
      ? ['ix.no', 'it.code', 'ix.nameAr', 'ix.nameEn', ...stockKeys]
      : ['ix.no', 'it.code', 'ix.nameAr', 'ix.nameEn', ...(isP ? ['it.price'] : []), 'it.cost', 'it.unit', ...stockKeys, 'it.category', 'it.storage', 'it.origin', 'ix.min', 'it.reorder', 'ix.max', 'it.barcode'];
    const locText = id => locRows(kind, id).map(x => `${locBi(x.loc)} (${n3(x.qty)})`).join('، ');
    const rowData = (r, i) => {
      const it = r.it, stock = stockVals(it);
      const head = [i + 1, it.code || '', it.nameAr || it.name || '', it.nameEn || ''];
      const lim = [Number(it.minStock || 0), Number(it.reorderPoint || 0), Number(it.maxStock || 0)];
      return lvl ? [...head, ...stock]
        : [...head, ...(isP ? [Number(it.price || 0)] : []), Number(it.cost || 0), unitWithDef(it), ...stock, catBi(it.categoryId), locText(r.id), biName((LIVE.cache.countryOrigins || {})[it.countryOriginId]), ...lim, it.barcode || ''];
    };
    const filters = [
      st.locs.length && [biText('it.storage'), st.locs.map(locBi).join('، ')],
      st.branch !== 'all' && [biText('c.branch'), branchLabel(st.branch)],
      st.origin !== 'all' && [biText('it.origin'), biName((LIVE.cache.countryOrigins || {})[st.origin])],
      st.alert && [biText('it.reorder'), biText(st.alert === 'critical' ? 'it.kCritical' : 'it.kWarning')],
      st.q && [biText('ix.search'), st.q]
    ].filter(Boolean);
    // The chosen categories are not listed under the title (every section is titled by its category); the file name keeps them
    const tag = [...(st.cats.length ? [st.cats.map(catBi).join('، ')] : []), ...filters.map(f => f[1])];
    return { rows, keys, rowData, filters, tag, lvl, qN: stockKeys.length };
  }
  /* One section per category, in the category tree order — the PDF and the Excel file share it */
  function exportGroups(x) {
    const groups = new Map();
    x.rows.forEach(r => { const k = r.it.categoryId && catOf(r.it.categoryId) ? r.it.categoryId : ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    const tr = catTree();
    const order = [...groups.keys()].sort((a, b) => (!a ? 1 : !b ? -1 : tr.sortKey(a).localeCompare(tr.sortKey(b), 'ar')));
    const [noA, noE] = bi('ix.noCat');
    return order.map(k => ({ rs: groups.get(k), ar: k ? catLabel(k, 'ar') : noA, en: k ? catLabel(k, 'en') : noE }));
  }
  function pdfHtml(x) {
    // Each section starts on a new page
    const [titleAr, titleEn] = bi(x.lvl ? 'ix.levelsTitle' : 'ix.allTitle'), [kindAr, kindEn] = bi(C.route);
    const wide = { 'ix.nameAr': 'w-name', 'ix.nameEn': 'w-name', 'it.storage': 'w-loc', 'it.category': 'w-mid', 'it.unit': 'w-mid', 'it.origin': 'w-mid' };
    const head = `<tr>${x.keys.map(k => { const [a, e] = bi(k); return `<th class="${wide[k] || ''}">${esc(a)}${e ? `<small>${esc(e)}</small>` : ''}</th>`; }).join('')}</tr>`;
    const cell = (v, j) => `<td class="${j === 2 ? 'ar' : j === 3 ? 'en' : typeof v === 'number' ? 'n' : ''}"${j === 3 ? ' dir="ltr"' : ''}>${esc(j === 0 ? String(v) : typeof v === 'number' ? fmtNum(v, 3) : v)}</td>`;
    const when = fmtDateTime(Date.now());
    const filt = x.filters.length ? `<div class="filters">${x.filters.map(([k, v]) => `<span><small>${esc(k)}:</small> ${esc(v)}</span>`).join('')}</div>` : '';
    const secs = exportGroups(x).map(({ rs, ar, en }) => {
      return `<section class="sec">
        <header class="top"><div><b class="brand">رصيد · Raseed</b><span>${esc(kindAr)} · ${esc(titleAr)}</span><span dir="ltr">${esc(kindEn)} · ${esc(titleEn)}</span></div><div class="when">${esc(when)}</div></header>
        <h1>${esc(ar)}${en && en !== ar ? `<small dir="ltr">${esc(en)}</small>` : ''}<em>${fmtNum(rs.length)} ${esc(biText('ix.itemsN'))}</em></h1>
        ${filt}
        <table class="${x.lvl ? 'lvl' : 'full'}"><thead>${head}</thead><tbody>${rs.map((r, i) => `<tr>${x.rowData(r, i).map(cell).join('')}</tr>`).join('')}</tbody></table>
      </section>`;
    }).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(kindAr)} · ${esc(titleAr)} — ${esc(kindEn)} · ${esc(titleEn)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
      <style>@page{size:A4${x.lvl ? '' : ' landscape'};margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#0f172a;margin:0;font-size:${x.lvl ? 11 : 9.5}px;line-height:1.35}
      .sec+.sec{break-before:page;page-break-before:always}
      .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #16a34a;padding-bottom:6px}
      .top div:first-child{display:flex;flex-direction:column;font-size:11px;color:#334155;font-weight:600}.brand{color:#16a34a;font-size:12px}
      .when{font-size:10.5px;color:#475569;white-space:nowrap}
      h1{text-align:center;font-size:22px;margin:14px 0 4px;line-height:1.3}h1 small{display:block;font-size:15px;color:#334155;font-weight:600}
      h1 em{display:block;font-style:normal;font-size:11px;color:#64748b;font-weight:400;margin-top:2px}
      .filters{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 16px;font-size:10.5px;margin-bottom:8px}.filters small{color:#64748b}
      table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #64748b;margin-top:6px}
      thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}
      th{background:#e2e8f0;font-weight:700;padding:4px 3px;border:1px solid #64748b;text-align:center;vertical-align:middle;line-height:1.2}
      th small{display:block;font-weight:600;color:#475569;font-size:.85em}
      td{padding:3px 4px;border:1px solid #94a3b8;text-align:center;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word}
      tbody tr:nth-child(even) td{background:#f8fafc}
      td.ar{text-align:right}td.en{text-align:left}td.n{font-variant-numeric:tabular-nums}
      th.w-name{width:${x.lvl ? (84 - x.qN * (x.qN > 1 ? 10 : 14)) / 2 : 14}%}th.w-loc{width:10%}th.w-mid{width:7%}
      table.lvl th:first-child{width:5%}table.lvl th:nth-child(2){width:11%}table.lvl th:nth-child(n+5){width:${x.qN > 1 ? 10 : 14}%}
      table.full th:first-child{width:3%}table.full th:nth-child(2){width:5.5%}</style></head>
      <body>${secs}</body></html>`;
  }
  async function exportResults(fmt, mode) {
    const x = exportTable(mode);
    if (!x.rows.length) { toast(t('ix.empty'), { tone: 'danger', ic: 'alert' }); return; }
    if (fmt === 'pdf') { printHtml(pdfHtml(x)); return; }
    try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
    // Same layout as the PDF: a titled section per category, the same columns in the same order, the same colours
    const n = x.keys.length, last = n - 1, aoa = [], merges = [], heights = [];
    const [titleAr, titleEn] = bi(x.lvl ? 'ix.levelsTitle' : 'ix.allTitle'), [kindAr, kindEn] = bi(C.route);
    const when = fmtDateTime(Date.now());
    const line = (c, e) => ({ style: 'thin', color: { rgb: c } }), box = c => ({ top: line(c), bottom: line(c), left: line(c), right: line(c) });
    const font = (o = {}) => ({ name: 'Arial', sz: 10, color: { rgb: '0F172A' }, ...o });
    const mid = { horizontal: 'center', vertical: 'center', wrapText: true };
    const S_ = {
      brand: { font: font({ bold: true, color: { rgb: '16A34A' } }), alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 }, border: { bottom: { style: 'medium', color: { rgb: '16A34A' } } } },
      h1: { font: font({ sz: 18, bold: true }), alignment: { ...mid, readingOrder: 2 } },
      h2: { font: font({ sz: 13, bold: true, color: { rgb: '334155' } }), alignment: { ...mid, readingOrder: 1 } },
      sub: { font: font({ sz: 9, color: { rgb: '64748B' } }), alignment: mid },
      th: { font: font({ bold: true }), fill: { fgColor: { rgb: 'E2E8F0' } }, alignment: mid, border: box('64748B') }
    };
    const td = (j, v, even) => ({ font: font(), alignment: { ...mid, horizontal: j === 2 ? 'right' : j === 3 ? 'left' : 'center', ...(j === 2 ? { readingOrder: 2 } : j === 3 ? { readingOrder: 1 } : {}) },
      border: box('94A3B8'), ...(even ? { fill: { fgColor: { rgb: 'F8FAFC' } } } : {}), ...(typeof v === 'number' && j ? { numFmt: Number.isInteger(v) ? '0' : '0.###' } : {}) });
    const cell = (v, s) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });
    const wideRow = (v, s, h) => { merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: last } }); heights[aoa.length] = h; aoa.push([cell(v, s), ...Array(last).fill(cell('', s))]); };
    exportGroups(x).forEach(({ rs, ar, en }, g) => {
      if (g) aoa.push([]);
      wideRow(`رصيد · Raseed   |   ${kindAr} · ${titleAr}   |   ${kindEn} · ${titleEn}   |   ${when}`, S_.brand, 20);
      wideRow(ar, S_.h1, 30);
      if (en && en !== ar) wideRow(en, S_.h2, 22);
      wideRow(`${fmtNum(rs.length)} ${biText('ix.itemsN')}${x.filters.length ? '   ·   ' + x.filters.map(([k, v]) => `${k}: ${v}`).join('   ·   ') : ''}`, S_.sub, 16);
      heights[aoa.length] = 30;
      aoa.push(x.keys.map(k => cell(bi(k).join('\n'), S_.th)));
      rs.forEach((r, i) => aoa.push(x.rowData(r, i).map((v, j) => cell(v, td(j, v, i % 2 === 1)))));
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!rows'] = Array.from({ length: aoa.length }, (_, i) => (heights[i] ? { hpt: heights[i] } : {}));
    const wch = { 'ix.no': 5, 'it.code': 11, 'ix.nameAr': 34, 'ix.nameEn': 34, 'it.unit': 13, 'it.category': 30, 'it.storage': 26, 'it.origin': 13, 'it.barcode': 16 };
    ws['!cols'] = x.keys.map(k => ({ wch: typeof k === 'string' ? wch[k] || 9 : 13 }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, x.lvl ? 'Stock levels' : C.sheet);
    const tag = [x.lvl ? 'stock-levels' : 'all', ...x.tag].join('-');
    XLSX.writeFile(wb, `${C.file}-${fileSafe(tag).slice(0, 80)}.xlsx`);
    toast(t('exported'));
  }

  async function barcodesZip(btn) {
    const items = selectedItems(); if (!items.length) { toast(t('it.selectFirst'), { tone: 'danger', ic: 'alert' }); return; }
    try { await Promise.all([needLib('JSZip'), needLib('JsBarcode')]); } catch (e) { libFailed(); return; }
    btn.classList.add('loading');
    try {
      const zip = new JSZip(), names = new Set();
      for (const it of items) {
        const value = it.barcode || newBarcode();
        const blob = await barcodePng(value); if (!blob) continue;
        let name = fileSafe(it.nameAr || it.nameEn || it.code || value), n = name, i = 2;
        while (names.has(n)) n = `${name} (${i++})`;
        names.add(n);
        zip.file(`${n}.png`, blob);
      }
      saveBlob(await zip.generateAsync({ type: 'blob' }), C.zip);
    } finally { btn.classList.remove('loading'); }
  }

  /* ---------- deleted items still named in records: restore under the same id ----------
     Brings the item back with the name, barcode, unit and price its records carry, so its
     vouchers, item card and printed labels find it again. Stock starts at zero (the deleted
     balance is not kept anywhere): count the item after restoring it. */
  function openDeleted() {
    if (!refsReady()) { toast(t('waitAll'), { ic: 'clock' }); LIVE.whenLoaded(ITEM_WATCH).then(openDeleted); return; }
    if (!afterCatalog([C.other], openDeleted)) return;
    const dr = freshDrawer(true);
    const sel = new Set(), restored = new Set();
    let list = [], busy = false;
    const n3 = v => fmtNum(Number(v || 0), 3);
    const body = () => {
      list = deletedItems(kind).filter(d => !restored.has(d.id));
      [...sel].forEach(id => { if (!list.some(d => d.id === id)) sel.delete(id); });
      if (!list.length) return `<div class="empty-state">${icon('check')}<b>${t('dl.none')}</b><small>${t('dl.noneSub')}</small></div>`;
      return `<p class="dl-note">${icon('alert')}<span>${t('dl.note')}</span></p>
        <div class="table-wrap"><table class="dt dl-table"><thead><tr><th class="sel-col"><input type="checkbox" id="dlAll" aria-label="${t('it.selectAll')}"></th><th>${t('c.name')}</th><th>${t('dl.byWho')}</th><th>${t('dl.at')}</th><th>${t('dl.where')}</th><th>${t('dl.last')}</th><th>${t('dl.similar')}</th></tr></thead>
        <tbody>${list.map(d => {
          const ar = S.lang === 'ar', main = (ar ? d.nameAr : d.nameEn) || d.nameAr || d.nameEn, alt = (ar ? d.nameEn : d.nameAr) || '';
          const near = closestItem(kind, d.nameAr || d.nameEn);
          return `<tr data-id="${esc(d.id)}">
            <td class="sel-col"><input type="checkbox" data-dl ${sel.has(d.id) ? 'checked' : ''} aria-label="${esc(main)}"></td>
            <td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(main)}</b>${alt && alt !== main ? `<small>${esc(alt)}</small>` : ''}${d.barcode ? `<small class="mono">${esc(d.barcode)}</small>` : ''}</span></td>
            <td data-label="${t('dl.byWho')}">${d.del ? `<span class="cell-2"><b>${esc(nameOf((LIVE.cache.users || {})[d.del.by]) || (LIVE.cache.users || {})[d.del.by]?.name || d.del.byName || '-')}</b>${d.del.byRole ? `<small>${esc(t('role_' + d.del.byRole))}</small>` : ''}</span>` : `<span class="muted" data-tip="${t('dl.noLogTip')}">${t('dl.noLog')}</span>`}</td>
            <td data-label="${t('dl.at')}">${d.del && d.del.at ? `<span class="num">${esc(fmtDateTime(d.del.at))}</span>` : `<span class="muted">${t('dl.noLog')}</span>`}</td>
            <td data-label="${t('dl.where')}"><span class="dl-where">${!d.recs.size ? '<span class="muted">—</span>' : ''}${Object.entries(d.by).map(([k, n]) => `<span>${esc(k)} <b class="num">${fmtNum(n)}</b></span>`).join('')}</span></td>
            <td data-label="${t('dl.last')}"><span class="num">${d.last ? esc(fmtDate(d.last)) : '—'}</span></td>
            <td data-label="${t('dl.similar')}">${near ? `<span class="dl-near">${icon('alert')}<span>${esc(nameOf(near.it))}<small class="mono">${esc(near.it.code || '')}</small></span></span>` : '<span class="muted">—</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`;
    };
    const sync = () => {
      const all = $('#dlAll', dr);
      if (all) { all.checked = list.length > 0 && sel.size === list.length; all.indeterminate = sel.size > 0 && sel.size < list.length; }
      $('#dlGo', dr).disabled = busy || !sel.size;
      $('#dlGoTxt', dr).textContent = t('dl.go').replace('{n}', sel.size || '');
    };
    const paint = () => { $('#dlBody', dr).innerHTML = body(); $('#dlCount', dr).textContent = list.length ? `${fmtNum(list.length)} ${t('it.items')}` : ''; sync(); };
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('trash')}</span><div><h2 id="drawerTitle">${K('deletedTitle')}</h2><p>${t('dl.sub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body" id="dlBody"></div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><small class="muted" id="dlCount"></small><span class="tb-spacer"></span>
        <button class="btn btn-primary" id="dlGo" disabled>${icon('refresh')}<span id="dlGoTxt"></span></button></footer>`;
    openLayer('#drawer');
    paint();
    // Redrawn while open when an item or a record changes (another device, or data still arriving)
    let tm = 0;
    const watched = new Set([...ITEM_WATCH, 'products', 'stockMaterials', 'users']);
    const off = LIVE.listen(path => {
      if (!$('#dlBody', dr)) { off(); clearTimeout(tm); return; }
      if (watched.has(path) && !busy) { clearTimeout(tm); tm = setTimeout(() => { if ($('#dlBody', dr)) paint(); }, 200); }
    });
    dr.onclick = e => {
      if (e.target.id === 'dlAll') { if (e.target.checked) list.forEach(d => sel.add(d.id)); else sel.clear(); paint(); return; }
      const cb = e.target.closest('[data-dl]');
      if (cb) { const id = cb.closest('tr').dataset.id; if (cb.checked) sel.add(id); else sel.delete(id); sync(); }
    };
    $('#dlGo', dr).addEventListener('click', async () => {
      const picked = list.filter(d => sel.has(d.id)); if (!picked.length || busy) return;
      const ok = await confirmDialog({ title: t('dl.confirmQ').replace('{n}', picked.length), ok: t('dl.restore'), icon: 'refresh',
        body: `<p class="cf-note">${t('dl.confirmNote')}</p>` });
      if (!ok) return;
      const used = usedItemCodes(), main = mainBranch();
      const bcs = new Set(); [LIVE.cache.products, LIVE.cache.stockMaterials].forEach(l => Object.values(l || {}).forEach(it => it && it.barcode && bcs.add(String(it.barcode))));
      const units = LIVE.cache.units || {}, origins = LIVE.cache.countryOrigins || {};
      const originId = name => { if (!name) return null; if (origins[name]) return name; const q = normQ(name); const hit = Object.entries(origins).find(([, o]) => o && [o.nameAr, o.nameEn, o.name].some(n => n && normQ(n) === q)); return hit ? hit[0] : null; };
      const up = {};
      picked.forEach(d => {
        const bc = d.barcode && !bcs.has(d.barcode) ? d.barcode : '';
        if (bc) bcs.add(bc);
        const snap = d.del && d.del.item && typeof d.del.item === 'object' ? d.del.item : null;
        if (snap) {
          const code = snap.code && !used.has(String(snap.code).trim().toUpperCase()) ? snap.code : fixedCode(C.prefix, used);
          used.add(String(code).trim().toUpperCase());
          up[`${C.path}/${d.id}`] = { ...snap, code, barcode: snap.barcode && (snap.barcode === bc || !bcs.has(String(snap.barcode))) ? snap.barcode : bc, restoredAt: LIVE.now() };
          if (snap.barcode) bcs.add(String(snap.barcode));
          return;
        }
        up[`${C.path}/${d.id}`] = {
          code: fixedCode(C.prefix, used), barcode: bc, nameAr: d.nameAr || d.nameEn, nameEn: d.nameEn || '', cost: 0,
          ...(isP ? { price: d.price || 0 } : {}),
          unitId: units[d.unitId] ? d.unitId : null, countryOriginId: originId(d.origin),
          openingQty: 0, minStock: 0, reorderPoint: 0, maxStock: 0, mainBranchId: main, stockByBranch: main ? { [main]: 0 } : {},
          incompleteInfo: true, missingInfo: true, restoredFromRecords: true, restoredAt: LIVE.now(), createdAt: d.last || LIVE.now()
        };
      });
      busy = true; const btn = $('#dlGo', dr); btn.classList.add('loading'); sync();
      try { await LIVE.update(up); picked.forEach(d => restored.add(d.id)); sel.clear(); toast(t('dl.done').replace('{n}', picked.length)); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { busy = false; btn.classList.remove('loading'); if (dr.isConnected) paint(); }
    });
  }

  /* ---------- bulk import from Excel ---------- */
  function openImport() {
    if (!afterCatalog([C.other], openImport)) return;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('upload')}</span><div><h2 id="drawerTitle">${K('importTitle')}</h2><p>${t('imp.sub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body imp">
        <div class="imp-step"><span class="imp-n">1</span><div><b>${t('imp.step1')}</b><small>${t('imp.step1Sub')}</small></div><button type="button" class="btn btn-ghost btn-sm" id="impTpl">${icon('download')}<span>${t('imp.template')}</span></button></div>
        <div class="imp-step"><span class="imp-n">2</span><div><b>${t('imp.step2')}</b><small>${t('imp.step2Sub')}</small></div></div>
        <label class="imp-drop" id="impDrop">${icon('upload')}<b id="impFile">${t('imp.choose')}</b><small>xlsx · xls</small><input type="file" id="impIn" accept=".xlsx,.xls" hidden></label>
        <div class="imp-status" id="impStatus" aria-live="polite"></div>
        <div class="imp-prog hidden" id="impProg"><div class="imp-track"><i id="impBar"></i></div><small id="impCount"></small></div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><span class="tb-spacer"></span><button class="btn btn-primary" id="impGo" disabled>${icon('plus')}<span id="impGoTxt">${t('imp.go').replace('{n}', '')}</span></button></footer>`;
    openLayer('#drawer');
    let busy = false;
    const status = () => {
      const s = st.imp;
      $('#impStatus', dr).innerHTML = s ? [
        s.name ? `<span>${icon('check')}${t('imp.loaded').replace('{n}', s.total + s.dupFile + s.existing)}</span>` : '',
        s.dupFile ? `<span class="warn">${icon('alert')}${t('imp.dupFile').replace('{n}', s.dupFile)}</span>` : '',
        s.existing ? `<span class="warn">${icon('alert')}${t('imp.existing').replace('{n}', s.existing)}</span>` : '',
        s.msg ? `<span class="${s.tone || ''}">${icon(s.tone === 'danger' ? 'alert' : 'check')}${s.msg}</span>` : ''
      ].join('') : '';
      $('#impGo', dr).disabled = busy || !(s && s.rows.length);
      $('#impGoTxt', dr).textContent = t('imp.go').replace('{n}', s && s.rows.length ? s.rows.length : '');
      if (s && s.name) $('#impFile', dr).textContent = s.name;
    };
    status();
    $('#impTpl', dr).addEventListener('click', async () => {
      try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
      const ar = S.lang === 'ar';
      const ws = XLSX.utils.json_to_sheet([Object.fromEntries(TEMPLATE_COLS[kind].map(([a, en]) => [ar ? a : en, '']))]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Template'); XLSX.writeFile(wb, C.tpl);
    });
    $('#impIn', dr).addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try { await needLib('XLSX'); } catch (ex) { libFailed(); return; }
      try {
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).filter(r => !rowEmpty(r)).map(r => mapImportRow(r, IMPORT_MAP[kind]));
        const d = dedupeImport(raw, LIVE.cache[C.path]);
        st.imp = { name: file.name, total: d.rows.length, rows: d.rows, dupFile: d.dupFile, existing: d.existing, msg: d.rows.length ? t('imp.ready').replace('{n}', d.rows.length) : t('imp.nothing'), tone: d.rows.length ? '' : 'danger' };
      } catch (ex) { st.imp = { name: file.name, total: 0, rows: [], dupFile: 0, existing: 0, msg: t('imp.badFile'), tone: 'danger' }; }
      e.target.value = '';
      status();
    });
    const drop = $('#impDrop', dr);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('over');
      const f = e.dataTransfer.files[0]; if (!f) return;
      const dt = new DataTransfer(); dt.items.add(f); $('#impIn', dr).files = dt.files;
      $('#impIn', dr).dispatchEvent(new Event('change'));
    });
    $('#impGo', dr).addEventListener('click', async () => {
      const s = st.imp; if (busy || !s || !s.rows.length) return;
      busy = true; status();
      const btn = $('#impGo', dr); btn.classList.add('loading');
      const prog = $('#impProg', dr); prog.classList.remove('hidden');
      const main = mainBranch(), used = usedItemCodes();
      const cache = LIVE.cache;
      const build = r => {
        const open = Number(r.openingQty || 0);
        return clean({
          code: normalizeItemCode(r.code, C.prefix, used), barcode: String(r.barcode || '').trim() || newBarcode(),
          nameAr: String(r.nameAr || '').trim(), nameEn: String(r.nameEn || '').trim(),
          cost: Number(r.cost || 0), ...(isP ? { price: Number(r.price || 0) } : {}),
          unitId: refId(cache.units, r.unitId), openingQty: open, minStock: Number(r.minStock || 0), reorderPoint: Number(r.reorderPoint || 0), maxStock: Number(r.maxStock || 0),
          ...(isP ? {} : { categoryId: refId(cache[C.cats], r.categoryId) || null }),
          countryOriginId: refId(cache.countryOrigins, r.countryOriginId) || null,
          mainBranchId: main, stockByBranch: main ? { [main]: open } : {}
        });
      };
      const total = s.rows.length, failed = [];
      let done = 0;
      const tick = () => { $('#impBar', dr).style.width = `${Math.round((done / total) * 100)}%`; $('#impCount', dr).textContent = t('imp.progress').replace('{a}', done).replace('{b}', total); };
      tick();
      for (let i = 0; i < total; i += 25) {
        const chunk = s.rows.slice(i, i + 25).map(r => ({ r, key: LIVE.newKey(C.path), p: { ...build(r), createdAt: LIVE.now() } }));
        try { await LIVE.update(Object.fromEntries(chunk.map(c => [`${C.path}/${c.key}`, c.p]))); }
        catch (ex) {
          for (const c of chunk) { try { await LIVE.update({ [`${C.path}/${c.key}`]: c.p }); } catch (e2) { failed.push(c.r); } }
        }
        done = Math.min(total, i + chunk.length); tick();
      }
      busy = false; btn.classList.remove('loading');
      const okN = total - failed.length;
      st.imp = failed.length
        ? { ...s, rows: failed, total: failed.length, dupFile: 0, existing: 0, msg: t('imp.partial').replace('{ok}', okN).replace('{n}', failed.length), tone: 'danger' }
        : { name: '', total: 0, rows: [], dupFile: 0, existing: 0, msg: t('imp.done').replace('{n}', okN), tone: 'success' };
      if (!failed.length) $('#impFile', dr).textContent = t('imp.choose');
      status();
      toast(st.imp.msg, failed.length ? { tone: 'danger', ic: 'alert' } : {});
      if (!failed.length) st.imp = null;
    });
  }

  /* ---------- events ---------- */
  let deb;
  $('#itQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  const onSel = (sel, key, fn) => $(sel, view).addEventListener('change', e => { st[key] = key === 'per' ? +e.target.value : e.target.value; st.page = 1; fn && fn(); draw(); });
  onSel('#itBranch', 'branch'); onSel('#itOrigin', 'origin'); onSel('#itPer', 'per');
  if (isP) onSel('#itSort', 'sort', ensureOrders);
  $('#itAll', view).addEventListener('change', e => {
    pageIds.forEach(id => (e.target.checked ? st.sel.add(id) : st.sel.delete(id)));
    $$('#itBody [data-sel]', view).forEach(c => { c.checked = e.target.checked; });
    syncSelection(pageIds);
  });
  view.addEventListener('change', e => {
    const c = e.target.closest('[data-sel]'); if (!c) return;
    const id = c.closest('tr').dataset.id;
    c.checked ? st.sel.add(id) : st.sel.delete(id);
    syncSelection(pageIds);
  });
  // The reorder cards open the items they count; opening one quiets its stock alarm
  const openAlert = kind => { st.alert = kind; st.page = 1; STOCK_ALARM.ack(C.route, kind); draw(); scrollTo({ top: 0, behavior: 'smooth' }); };
  view.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const k = e.target.closest && e.target.closest('[data-alert]'); if (k) { e.preventDefault(); openAlert(k.dataset.alert); }
  });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const ak = e.target.closest('[data-alert]'); if (ak) { openAlert(ak.dataset.alert); return; }
    const mb = e.target.closest('.mp-btn');
    if (mb) { const key = mb.closest('[data-mp]').dataset.mp; if (mpOpen && mpOpen.key === key) mpClose(); else mpShow(key); return; }
    const ix = e.target.closest('[data-ix]');
    if (ix) { $$('.dd.open', view).forEach(d => d.classList.remove('open')); const [f, m] = ix.dataset.ix.split(':'); exportResults(f, m); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy).then(() => toast(t('it.copied')), () => {}); return; }
    const b = e.target.closest('[data-it]'); if (!b || b.disabled) return;
    const a = b.dataset.it;
    if (a === 'back') { st.alert = null; st.page = 1; draw(); return; }
    if (a === 'new') return openForm(null);
    if (a === 'import') return openImport();
    if (a === 'deleted') return openDeleted();
    if (a === 'export') return exportSelected();
    if (a === 'zip') return barcodesZip(b);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ edit: openForm, delete: remove, bc: downloadOneBarcode })[a](id);
  });

  // Card page: every category with how many items it holds and how many need reordering
  const closeDrill = kpiDrills(view, { paths: PATHS, ready: () => LIVE.loaded(PATHS), build: kind => {
    if (kind !== 'cats') return null;
    const items = Object.values(LIVE.cache[C.path] || {}).filter(it => it && typeof it === 'object');
    const cats = Object.entries(LIVE.cache[C.cats] || {}).filter(([, c]) => c && typeof c === 'object');
    const row = (id, name, parent) => {
      const its = items.filter(it => (id ? it.categoryId === id : !it.categoryId || !(LIVE.cache[C.cats] || {})[it.categoryId]));
      let warn = 0, crit = 0;
      its.forEach(it => { const tone = reorderTone(itemStock(it, st.branch), Number(it.reorderPoint || 0)); if (tone === 'critical') crit++; else if (tone === 'warning') warn++; });
      return { id: id || null, name, parent, n: its.length, warn, crit };
    };
    const list = cats.map(([id, c]) => row(id, nameOf(c) || '-', c.parentId ? nameOf((LIVE.cache[C.cats] || {})[c.parentId]) : '')).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    const none = row(null, t('kd.noCat'), ''); if (none.n) list.push(none);
    const badge = (v, tone) => (v ? `<span class="badge tone-${tone}">${fmtNum(v)}</span>` : '<span class="muted">0</span>');
    return { title: t('it.kCats'), sub: t('kd.catsSub'), ic: 'folder', file: `${C.route}-categories.xlsx`,
      onRow: id => { st.cats = [id]; st.page = 1; closeDrill(); draw(); },
      chips: [[t('it.kCats'), fmtNum(cats.length)], [K('kTotal'), fmtNum(items.length)], [t('it.kWarning'), fmtNum(list.reduce((s, x) => s + x.warn, 0))], [t('it.kCritical'), fmtNum(list.reduce((s, x) => s + x.crit, 0)), 'danger']],
      cols: [{ h: t('it.category') }, { h: t('kd.parentCat') }, { h: K('kTotal'), end: 1 }, { h: t('it.kWarning'), end: 1 }, { h: t('it.kCritical'), end: 1 }],
      rows: list.map(x => ({ id: x.id, text: `${x.name} ${x.parent}`,
        cells: [`<b>${esc(x.name)}</b>`, x.parent ? esc(x.parent) : '<span class="muted">—</span>', fmtNum(x.n), badge(x.warn, 'warning'), badge(x.crit, 'danger')],
        x: { [t('it.category')]: x.name, [t('kd.parentCat')]: x.parent, [K('kTotal')]: x.n, [t('it.kWarning')]: x.warn, [t('it.kCritical')]: x.crit } })) };
  } });
  const unsub = LIVE.watch([...PATHS, C.other], draw);
  LIVE.whenLoaded(['products', 'stockMaterials']).then(fixItemCodes);
  ensureOrders();
  draw();
  return () => { unsub(); closeDrill(); mpCleanup(); ordersUnsub && ordersUnsub(); freshDrawer(false); };
}

PAGES.products = view => itemsPage(view, 'product');
PAGES['stock-materials'] = view => itemsPage(view, 'material');

/* =====================================================================
   تصنيفات المنتجات / تصنيفات المواد — folders, as in the old page:
   «قسم جديد» adds at the top level, «قسم فرعي» inside the open one.
   ===================================================================== */
const CAT_CFG = {
  product: { route: 'product-categories', path: 'productCategories', items: 'products', state: 'pcat', subCount: true },
  material: { route: 'material-categories', path: 'materialCategories', items: 'stockMaterials', state: 'mcat', subCount: false }
};
const PC_PAGE = 60;

function categoriesPage(view, kind) {
  const C = CAT_CFG[kind];
  const PATHS = [C.path, C.items];
  const st = (S[C.state] ||= { trail: [], q: '' });
  const K = k => t(`pc.${kind}.${k}`);
  let first = true, saving = false;

  view.innerHTML = `
    ${pageHeader(C.route, `<button class="btn btn-ghost" data-pc="sub">${icon('folder')}<span>${t('pc.newSub')}</span></button>
      <button class="btn btn-ghost" data-pc="assign">${icon('plus')}<span>${K('assign')}</span></button>
      <button class="btn btn-primary" data-pc="new">${icon('plus')}<span>${t('pc.newCat')}</span></button>`, K('sub'))}
    <section class="card pc-card" data-anim>
      <div class="toolbar pc-bar">
        <button class="btn-icon" data-pc="back" aria-label="${t('pc.back')}" data-tip="${t('pc.back')}">${icon('chevLeft', 'flip')}</button>
        <nav class="pc-trail" id="pcTrail" aria-label="${t('pc.path')}"></nav>
        <label class="search-field">${icon('search')}<input type="search" id="pcQ" placeholder="${t('pc.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
      </div>
      <div class="pc-grid" id="pcGrid"></div>
      <div class="pc-items-wrap">
        <div class="pc-items-head"><b id="pcItemsTitle"></b></div>
        <div class="pc-items" id="pcItems"></div>
      </div>
    </section>`;

  const cats = () => LIVE.cache[C.path] || {};
  const items = () => LIVE.cache[C.items] || {};
  const active = () => st.trail[st.trail.length - 1] || null;
  const itemsIn = id => Object.entries(items()).filter(([, it]) => it && it.categoryId === id);
  const children = id => Object.entries(cats()).filter(([, c]) => c && (c.parentId || null) === id);
  function subtree(rootId) {
    const ids = [rootId], all = Object.entries(cats());
    for (let i = 0; i < ids.length; i++) all.forEach(([id, c]) => { if (c && c.parentId === ids[i] && !ids.includes(id)) ids.push(id); });
    return ids;
  }

  function draw() {
    const grid = $('#pcGrid', view); if (!grid) return;
    if (!LIVE.loaded(PATHS)) { setHtml(grid, Array.from({ length: 6 }, () => '<div class="pc-tile skel-tile"><i class="skel lg"></i><i class="skel"></i></div>').join('')); return; }
    // A folder deleted elsewhere: go back up to the nearest one that still exists
    while (st.trail.length && !cats()[active()]) st.trail.pop();
    const cur = active();
    $('[data-pc="back"]', view).disabled = !cur;
    $('[data-pc="sub"]', view).disabled = !cur;
    $('[data-pc="assign"]', view).disabled = !cur;
    setHtml($('#pcTrail', view), `<button type="button" class="pc-crumb${cur ? '' : ' on'}" data-trail="0">${icon('layers')}<span>${t('pc.home')}</span></button>`
      + st.trail.map((id, i) => `${icon('chevRight', 'flip')}<button type="button" class="pc-crumb${i === st.trail.length - 1 ? ' on' : ''}" data-trail="${i + 1}">${esc(nameOf(cats()[id]) || '-')}</button>`).join(''));
    const q = normQ(st.q);
    const list = children(cur).filter(([, c]) => !q || normQ(`${c.nameAr || ''} ${c.nameEn || ''} ${kind === 'product' ? c.name || '' : ''}`).includes(q))
      .sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    setHtml(grid, list.length ? list.map(([id, c], i) => {
      const n = itemsIn(id).length, subs = children(id).length;
      const count = C.subCount && subs > 0 && n === 0 ? t('pc.subsN').replace('{n}', subs) : K('itemsN').replace('{n}', n);
      const alt = S.lang === 'ar' ? c.nameEn : c.nameAr;
      return `<div class="pc-tile${first ? ' row-in' : ''}" data-id="${esc(id)}" style="--r:${i}">
        <button type="button" class="pc-open" data-pc="open" aria-label="${t('pc.open')}: ${esc(nameOf(c))}">
          <span class="pc-ic">${icon('folder')}</span>
          <span class="pc-txt"><b>${esc(nameOf(c) || '-')}</b>${alt && alt !== nameOf(c) ? `<small>${esc(alt)}</small>` : ''}<em>${count}${subs && !(C.subCount && n === 0) ? ` · ${t('pc.subsN').replace('{n}', subs)}` : ''}</em></span>
        </button>
        <div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-pc="open" aria-label="${t('pc.open')}">${icon('eye')}</button>
          <button class="btn-icon sm" data-pc="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-pc="delete" aria-label="${t('delete')}">${icon('trash')}</button>
        </div></div>`;
    }).join('') : `<div class="empty-state pc-empty">${icon(q ? 'search' : 'folder')}<b>${q ? t('emptyTitle') : t('pc.noCats')}</b><small>${q ? t('emptySub') : cur ? t('pc.noCatsSubIn') : t('pc.noCatsSub')}</small></div>`);
    // Items of the open folder
    const its = cur ? itemsIn(cur).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1]))) : [];
    $('#pcItemsTitle', view).innerHTML = cur ? `${K('itemsTitle')} <em>${its.length}</em>` : K('itemsTitle');
    setHtml($('#pcItems', view), !cur ? `<p class="muted pc-hint">${icon('info')}${K('pickFolder')}</p>`
      : its.length ? its.map(([id, it]) => `<span class="item-chip pc-item" data-item="${esc(id)}"><span class="cell-2"><b>${esc(nameOf(it) || '-')}</b>${it.code ? `<small class="mono">${esc(it.code)}</small>` : ''}</span>
          <button type="button" class="chip-x" data-pc="unlink" aria-label="${t('pc.removeItem')}" data-tip="${t('pc.removeItem')}">${icon('x')}</button></span>`).join('')
      : `<p class="muted pc-hint">${icon('info')}${K('noItems')}</p>`);
    first = false;
    if (picker) drawPicker();
  }

  /* ---------- add / edit ---------- */
  function openForm(editId, parentId) {
    const c = editId ? cats()[editId] : null;
    const parent = editId ? (c && c.parentId) || null : parentId;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(c ? 'pencil' : 'folder')}</span><div><h2 id="drawerTitle">${c ? t('pc.editTitle') : parent ? t('pc.newSub') : t('pc.newCat')}</h2><p>${parent ? t('pc.inside').replace('{name}', esc(nameOf(cats()[parent]) || '-')) : t('pc.atTop')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="pcForm">
        <div class="field"><label for="cAr">${t('it.nameAr')} <em>*</em></label><input id="cAr" dir="rtl" value="${esc(c ? c.nameAr || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="cEn">${t('it.nameEn')} <em>*</em></label><input id="cEn" dir="ltr" value="${esc(c ? c.nameEn || '' : '')}" autocomplete="off"><small class="err"></small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="cSave">${icon('check')}<span>${t(c ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input', dr).forEach(i => i.addEventListener('input', () => err('#' + i.id, '')));
    const save = async e => {
      e && e.preventDefault();
      if (saving) return;
      const nameAr = $('#cAr', dr).value.trim(), nameEn = $('#cEn', dr).value.trim();
      let bad = false;
      if (!nameAr) { err('#cAr', t('required')); bad = true; }
      if (!nameEn) { err('#cEn', t('required')); bad = true; }
      if (bad) return;
      const payload = { nameAr, nameEn, parentId: parent || null };
      const btn = $('#cSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (editId) await LIVE.update({ [`${C.path}/${editId}/nameAr`]: nameAr, [`${C.path}/${editId}/nameEn`]: nameEn, [`${C.path}/${editId}/parentId`]: payload.parentId });
        else await LIVE.update({ [`${C.path}/${LIVE.newKey(C.path)}`]: payload });
        toast(t(editId ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#pcForm', dr).addEventListener('submit', save);
    $('#cSave', dr).addEventListener('click', save);
    setTimeout(() => $('#cAr', dr).focus(), 320);
  }

  /* Deleting a folder removes its sub-folders too; their items become uncategorised */
  async function remove(id) {
    const c = cats()[id]; if (!c) return;
    const ids = subtree(id);
    const affected = Object.entries(items()).filter(([, it]) => it && ids.includes(it.categoryId));
    const ok = await confirmDialog({ title: t('pc.deleteQ'), body: `<div class="cf-sum"><div><small>${t('pc.folder')}</small><b>${esc(nameOf(c) || '-')}</b></div><div><small>${t('pc.subFolders')}</small><b>${ids.length - 1}</b></div><div><small>${K('itemsWord')}</small><b>${affected.length}</b></div></div><p class="cf-note">${K('deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const up = {};
    affected.forEach(([iid]) => { up[`${C.items}/${iid}/categoryId`] = null; });
    ids.forEach(cid => { up[`${C.path}/${cid}`] = null; });
    try { await LIVE.update(up); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  async function unlink(itemId) {
    const it = items()[itemId]; if (!it) return;
    try { await LIVE.update({ [`${C.items}/${itemId}/categoryId`]: null }); toast(`«${nameOf(it)}» ${t('pc.removed')}`); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- assign items to the open folder ----------
     Lists items with no category or already in this one (as the old page),
     ticked when they are in it; unticking takes an item out. */
  let picker = null, pkQ = '', pkShown = PC_PAGE;
  const picked = new Set();
  let pickFor = null;
  const pickable = () => {
    const q = normQ(pkQ);
    return Object.entries(items()).filter(([, it]) => it && typeof it === 'object' && (!it.categoryId || it.categoryId === pickFor || !cats()[it.categoryId]))
      .filter(([, it]) => !q || normQ(`${it.nameAr || ''} ${it.nameEn || ''} ${it.name || ''} ${it.code || ''} ${it.barcode || ''}`).includes(q))
      .sort((a, b) => (b[1].categoryId === pickFor) - (a[1].categoryId === pickFor) || nameOf(a[1]).localeCompare(nameOf(b[1])));
  };
  const changes = () => {
    const now = new Set(itemsIn(pickFor).map(([id]) => id));
    let add = 0, out = 0;
    picked.forEach(id => { if (!now.has(id)) add++; });
    now.forEach(id => { if (!picked.has(id)) out++; });
    return { add, out, now };
  };
  function drawPicker() {
    if (!picker) return;
    if (!cats()[pickFor]) { closePicker(); return; }
    const list = pickable(), shown = list.slice(0, pkShown);
    $('#pkList', picker).innerHTML = shown.length ? shown.map(([id, it]) => {
      const on = picked.has(id);
      return `<button type="button" class="pk-row${on ? ' on' : ''}" data-k="${esc(id)}" role="checkbox" aria-checked="${on}">
        <span class="pk-check">${icon('check')}</span>
        <span class="pk-txt"><b>${esc(nameOf(it) || '-')}</b><small>${esc([it.code, unitName(it.unitId)].filter(Boolean).join(' · '))}</small></span>
        ${it.categoryId === pickFor ? `<span class="pk-type in">${t('pc.inFolder')}</span>` : ''}</button>`;
    }).join('') + (list.length > shown.length ? `<button type="button" class="pk-more" data-pk-more>${t('sp.showMore')} <em>${list.length - shown.length}</em></button>` : '')
      : `<div class="empty-state">${icon(pkQ ? 'search' : 'box')}<b>${pkQ ? t('emptyTitle') : K('noFree')}</b><small>${pkQ ? t('emptySub') : K('noFreeSub')}</small></div>`;
    paintPickFoot();
  }
  function paintPickFoot() {
    const { add, out } = changes();
    $('#pkCount', picker).textContent = [add ? t('pc.willAdd').replace('{n}', add) : '', out ? t('pc.willRemove').replace('{n}', out) : ''].filter(Boolean).join(' · ');
    $('#pkAdd', picker).disabled = !(add || out);
  }
  function closePicker() {
    if (!picker) return;
    const el = picker; picker = null;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 200);
    document.removeEventListener('keydown', pickerKeys, true);
  }
  const pickerKeys = e => { if (picker && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } };
  function openPicker() {
    const cur = active(); if (!cur || picker) return;
    pickFor = cur; pkQ = ''; pkShown = PC_PAGE;
    picked.clear(); itemsIn(cur).forEach(([id]) => picked.add(id));
    picker = document.createElement('div');
    picker.className = 'pk-wrap';
    picker.innerHTML = `<div class="pk-backdrop" data-pk-close></div>
      <div class="pk" role="dialog" aria-modal="true" aria-labelledby="pkTitle">
        <header class="pk-head"><span class="ph-ic sm">${icon('folder')}</span><div><h3 id="pkTitle">${K('assign')}</h3><p>${esc(nameOf(cats()[cur]))} · ${K('assignSub')}</p></div>
          <button class="btn-icon" data-pk-close aria-label="${t('close')}">${icon('x')}</button></header>
        <label class="search-field pk-search">${icon('search')}<input type="search" id="pkQ" placeholder="${t('it.searchPh')}" autocomplete="off"></label>
        <div class="pk-list" id="pkList"></div>
        <footer class="pk-foot"><span class="muted" id="pkCount"></span><span class="tb-spacer"></span>
          <button class="btn btn-ghost" data-pk-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="pkAdd" disabled>${icon('check')}<span>${t('save')}</span></button></footer>
      </div>`;
    document.body.appendChild(picker);
    drawPicker();
    void picker.offsetWidth;
    picker.classList.add('open');
    document.addEventListener('keydown', pickerKeys, true);
    setTimeout(() => { const q = picker && $('#pkQ', picker); q && q.focus(); }, 120);
    $('#pkQ', picker).addEventListener('input', e => { pkQ = e.target.value; pkShown = PC_PAGE; $('#pkList', picker).scrollTop = 0; drawPicker(); });
    picker.addEventListener('click', async e => {
      if (e.target.closest('[data-pk-close]')) { closePicker(); return; }
      if (e.target.closest('[data-pk-more]')) { pkShown += PC_PAGE; drawPicker(); return; }
      const p = e.target.closest('.pk-row[data-k]');
      if (p) {
        const k = p.dataset.k, on = !picked.has(k);
        on ? picked.add(k) : picked.delete(k);
        p.classList.toggle('on', on); p.setAttribute('aria-checked', on);
        paintPickFoot();
        return;
      }
      const go = e.target.closest('#pkAdd'); if (!go || go.disabled || saving) return;
      const { now } = changes();
      const up = {};
      picked.forEach(id => { if (!now.has(id) && items()[id]) up[`${C.items}/${id}/categoryId`] = pickFor; });
      now.forEach(id => { if (!picked.has(id)) up[`${C.items}/${id}/categoryId`] = null; });
      saving = true; go.classList.add('loading');
      try { await LIVE.update(up); toast(t('pc.assigned')); closePicker(); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; go.classList.remove('loading'); }
    });
  }

  /* ---------- events ---------- */
  let deb;
  $('#pcQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); draw(); }, 120); });
  const go = trail => { st.trail = trail; st.q = ''; $('#pcQ', view).value = ''; first = true; draw(); };
  view.addEventListener('click', e => {
    const cr = e.target.closest('[data-trail]'); if (cr) { go(st.trail.slice(0, +cr.dataset.trail)); return; }
    const b = e.target.closest('[data-pc]'); if (!b || b.disabled) return;
    const a = b.dataset.pc;
    if (a === 'new') return openForm(null, null);
    if (a === 'sub') return openForm(null, active());
    if (a === 'assign') return openPicker();
    if (a === 'back') return go(st.trail.slice(0, -1));
    const tile = b.closest('[data-id]'), chip = b.closest('[data-item]');
    if (a === 'unlink' && chip) return unlink(chip.dataset.item);
    if (!tile) return;
    const id = tile.dataset.id;
    if (a === 'open') return go([...st.trail, id]);
    if (a === 'edit') return openForm(id, null);
    if (a === 'delete') return remove(id);
  });

  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); closePicker(); freshDrawer(false); };
}

PAGES['product-categories'] = view => categoriesPage(view, 'product');
PAGES['material-categories'] = view => categoriesPage(view, 'material');
