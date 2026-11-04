/* المنتجات · مواد المخزون · تصنيفاتها — live pages.
   Same collections and rules as the old accounting page: products / stockMaterials
   (codes FG-#### / SK-####, unique across both), productCategories / materialCategories
   (folders with parentId; items link through categoryId), storageLocations, countryOrigins. */

['products', 'stock-materials', 'product-categories', 'material-categories'].forEach(r => LIVE_ROUTES.add(r));

/* ---------- libraries (same versions as the old page), loaded only when needed ---------- */
const LIBS = {
  JsBarcode: 'https://unpkg.com/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  XLSX: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
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
  if (!branchId || branchId === 'all') return (Number(by[it.mainBranchId] ?? it.openingQty ?? it.stock ?? 0) || 0) - soldOf(it, it.mainBranchId);
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

function itemsPage(view, kind) {
  const C = ITEM_CFG[kind], isP = kind === 'product';
  const PATHS = [C.path, C.cats, 'storageLocations', 'countryOrigins', 'branches', 'units'];
  const st = (S[C.state] ||= { q: '', branch: 'all', cat: 'all', loc: 'all', origin: 'all', sort: 'default', per: 10, page: 1, sel: new Set(), imp: null, alert: null });
  const K = k => t(`it.${kind}.${k}`);
  let first = true, saving = false, ordersUnsub = null;
  const COLS = isP ? 15 : 14;

  view.innerHTML = `
    ${pageHeader(C.route, `<button class="btn btn-ghost" data-it="export" disabled>${icon('download')}<span>${t('it.exportSel')}</span><em class="sel-n"></em></button>
      <button class="btn btn-ghost" data-it="zip" disabled>${icon('barcode')}<span>${t('it.bcZip')}</span><em class="sel-n"></em></button>
      <button class="btn btn-ghost" data-it="import">${icon('upload')}<span>${t('it.import')}</span></button>
      <button class="btn btn-primary" data-it="new">${icon('plus')}<span>${K('new')}</span></button>`, K('sub'))}
    <section class="kpis" id="itK"></section>
    <section class="card pt-head" id="itAlert" hidden></section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="itQ" placeholder="${t('it.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <div class="select tb-select"><select id="itBranch" aria-label="${t('allBranches')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="itCat" aria-label="${t('it.category')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="itLoc" aria-label="${t('it.storage')}"></select>${icon('chevDown')}</div>
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
    if (st.cat !== 'all') rows = rows.filter(r => r.it.categoryId === st.cat);
    if (st.loc !== 'all') rows = rows.filter(r => inLocation(kind, r.id, st.loc));
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
      <td data-label="${t('it.category')}">${named(C.cats, it.categoryId)}</td>
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
      kpiCard({ label: t('it.kCats'), value: Object.keys(LIVE.cache[C.cats] || {}).length, ic: 'folder', tone: 'c2' }),
      alertKpi('warning', t('it.kWarning'), warn, 'clock', STOCK_ALARM.unseen(C.route, 'warning')),
      alertKpi('critical', t('it.kCritical'), crit, 'alert', STOCK_ALARM.unseen(C.route, 'critical'))
    ].join(''), first);
    const bar = $('#itAlert', view);
    bar.hidden = !st.alert;
    if (st.alert) setHtml(bar, `<div class="toolbar"><button class="btn btn-ghost" data-it="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
      <h2 class="pt-title">${t(st.alert === 'critical' ? 'it.kCritical' : 'it.kWarning')}<small>${st.alert === 'critical' ? crit : warn} ${t('it.items')}</small></h2></div>`);
    setHtml($('#itBranch', view), `<option value="all">${t('allBranches')}</option>` + optsHtml(sortedOpts(LIVE.cache.branches).map(([id]) => [id, branchLabel(id)]), st.branch));
    setHtml($('#itCat', view), `<option value="all">${t('it.allCats')}</option>` + optsHtml(sortedOpts(LIVE.cache[C.cats]), st.cat));
    setHtml($('#itLoc', view), `<option value="all">${t('it.allLocs')}</option>` + optsHtml([...sortedOpts(LIVE.cache.storageLocations), [LOC_NONE, t('sl.noLocation')]], st.loc));
    setHtml($('#itOrigin', view), `<option value="all">${t('it.allOrigins')}</option>` + optsHtml(sortedOpts(LIVE.cache.countryOrigins), st.origin));
    if (needsSales() && !LIVE.loaded(['orders'])) { setHtml(body, skeletonRows(6, COLS)); setHtml($('#itPager', view), `<span class="pager-info">${t('it.loadingSales')}</span>`); return; }
    const rows = list();
    const per = st.per;
    setHtml($('#itPager', view), pagerHtml(st, rows.length));
    const slice = rows.slice((st.page - 1) * per, st.page * per);
    pageIds = slice.map(r => r.id);
    const filtering = st.alert || st.q || st.cat !== 'all' || st.loc !== 'all' || st.origin !== 'all' || st.sort === 'incompleteInfo';
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
          <div class="field"><label for="fOpen">${t('it.opening')}</label>${it ? `<input id="fOpen" value="${esc(fmtNum(Number(it.openingQty ?? (it.stockByBranch || {})[it.mainBranchId] ?? 0), 3))}" readonly dir="ltr"><small class="hint">${t('it.openingLocked')}</small>` : numIn('fOpen', 'openingQty')}</div>
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
      const openingQty = id ? Number(cur.openingQty ?? (cur.stockByBranch || {})[cur.mainBranchId] ?? 0) : openInput;
      const payload = {
        code: id ? keepOrReplaceCode(val('#fCode'), C.prefix, id) : normalizeItemCode(val('#fCode'), C.prefix),
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

  async function remove(id) {
    const it = (LIVE.cache[C.path] || {})[id]; if (!it) return;
    const ok = await confirmDialog({ title: K('deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(it) || '-')}</b></div><div><small>${t('it.code')}</small><b class="mono">${esc(it.code || '-')}</b></div></div><p class="cf-note">${t('it.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`${C.path}/${id}`]: null }); st.sel.delete(id); toast(t('deleted'), { tone: 'danger' }); }
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
  onSel('#itBranch', 'branch'); onSel('#itCat', 'cat'); onSel('#itLoc', 'loc'); onSel('#itOrigin', 'origin'); onSel('#itPer', 'per');
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
    const cp = e.target.closest('[data-copy]');
    if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy).then(() => toast(t('it.copied')), () => {}); return; }
    const b = e.target.closest('[data-it]'); if (!b || b.disabled) return;
    const a = b.dataset.it;
    if (a === 'back') { st.alert = null; st.page = 1; draw(); return; }
    if (a === 'new') return openForm(null);
    if (a === 'import') return openImport();
    if (a === 'export') return exportSelected();
    if (a === 'zip') return barcodesZip(b);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ edit: openForm, delete: remove, bc: downloadOneBarcode })[a](id);
  });

  const unsub = LIVE.watch([...PATHS, C.other], draw);
  ensureOrders();
  draw();
  return () => { unsub(); ordersUnsub && ordersUnsub(); freshDrawer(false); };
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
