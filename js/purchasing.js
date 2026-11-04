/* الشراء (purchases) and الموردون (suppliers) — live pages.
   Same data paths as the old accounting page: purchases, purchaseReceipts,
   pendingStockMoves, suppliers, products, stockMaterials, meta counters. */

LIVE_ROUTES.add('purchases');
LIVE_ROUTES.add('suppliers');

/* ---------- catalog helpers ---------- */
const normQ = v => String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[ـً-ْٰ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .toLowerCase().replace(/\s+/g, ' ').trim();
const catalog = type => (type === 'product' ? LIVE.cache.products : LIVE.cache.stockMaterials) || {};
const itemData = (type, id) => catalog(type)[id] || null;
const itemPath = (type, id) => `${type === 'product' ? 'products' : 'stockMaterials'}/${id}`;
// A branch's stock: the stored balance less the cashier's sales the warehouse takes off (sales-stock.js)
const stockAt = (item, branchId) => Number(((item && item.stockByBranch) || {})[branchId] || 0) - soldOf(item, branchId);
const arName = o => (o ? o.nameAr || o.name || o.nameEn || '' : '');

function supplierIdsOf(item) {
  if (!item) return [];
  const raw = [];
  if (item.supplierId) raw.push(item.supplierId);
  const ids = item.supplierIds;
  if (Array.isArray(ids)) raw.push(...ids);
  else if (ids && typeof ids === 'object') Object.entries(ids).forEach(([k, v]) => { if (v === true) raw.push(k); else if (typeof v === 'string' || typeof v === 'number') raw.push(v); else if (v && typeof v === 'object') raw.push(v.id || v.supplierId || v.value || k); });
  else if (typeof ids === 'string') raw.push(ids);
  return [...new Set(raw.map(x => String(x || '').trim()).filter(Boolean))];
}
/* Some suppliers list their items on the supplier record itself */
const SUP_FIELDS = ['productIds', 'products', 'itemIds', 'items', 'materialIds', 'materials'];
function supplierSideIds(sup) {
  const out = [];
  const walk = v => {
    if (!v) return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'object') return Object.entries(v).forEach(([k, x]) => { if (x === true) out.push(k); else if (typeof x === 'string' || typeof x === 'number') out.push(x); else walk(x); });
    out.push(v);
  };
  SUP_FIELDS.forEach(f => walk(sup && sup[f]));
  return new Set(out.map(x => String(x || '').trim()).filter(Boolean));
}
function supplierItems(sid) {
  const side = supplierSideIds((LIVE.cache.suppliers || {})[sid]);
  const out = [];
  [['product', LIVE.cache.products], ['material', LIVE.cache.stockMaterials]].forEach(([type, list]) =>
    Object.entries(list || {}).forEach(([id, item]) => { if (supplierIdsOf(item).includes(sid) || side.has(String(id))) out.push({ id, type, item }); }));
  return out;
}
const itemSupplierUpdates = (path, ids) => { const n = [...new Set(ids.map(String).filter(Boolean))]; return { [`${path}/supplierId`]: n[0] || null, [`${path}/supplierIds`]: n.length ? n : null }; };
/* Production batches indexed by product, rebuilt only when production changes */
let batchIdx = { src: null, map: new Map() };
function batchesOf(productId) {
  const src = LIVE.cache.production;
  if (batchIdx.src !== src) {
    const map = new Map();
    // A voucher may hold several products (items[]); each product line is its own batch
    Object.entries(src || {}).forEach(([id, r]) => {
      if (!r || typeof r !== 'object') return;
      const lines = Array.isArray(r.items) && r.items.length ? r.items : [r];
      lines.forEach((it, n) => {
        if (!it || (it.itemType || r.itemType || 'product') !== 'product' || !it.itemId) return;
        const k = String(it.itemId);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ ...r, id, line: n, itemId: it.itemId, qty: it.qty ?? r.qty, items: undefined,
          productionDate: it.productionDate || r.productionDate || '', expiryDate: it.expiryDate || r.expiryDate || '', single: lines.length === 1 });
      });
    });
    batchIdx = { src, map };
  }
  return batchIdx.map.get(String(productId)) || [];
}
/* Forms need the full catalog, which loads in the background after the list shows */
function afterCatalog(paths, fn) {
  if (LIVE.complete(paths)) return true;
  toast(t('loadingItems'), { ic: 'clock' });
  LIVE.whenLoaded(paths).then(fn);
  return false;
}
/* Exports and printed lists need every record, not just the first page shown while the rest loads */
function allLoaded() {
  if (!LIVE.partial()) return true;
  toast(t('waitAll'), { ic: 'clock' });
  return false;
}
/* A scanned production barcode → { itemId, batchId } when it names one product batch */
function batchByBarcode(q) {
  if (!q) return null;
  const hits = [];
  Object.entries(LIVE.cache.production || {}).forEach(([id, r]) => {
    if (!r || !r.productionBarcode || normQ(r.productionBarcode) !== q) return;
    const lines = (Array.isArray(r.items) && r.items.length ? r.items : [r]).filter(it => it && it.itemId && (it.itemType || r.itemType || 'product') === 'product');
    // One barcode for a voucher of several products can't tell which product was scanned
    if (lines.length === 1) hits.push({ itemId: lines[0].itemId, batchId: id });
  });
  return hits.length === 1 ? hits[0] : null;
}
function activeBatches(productId) {
  return batchesOf(productId)
    .filter(r => !r.expiryDate || new Date(`${r.expiryDate}T23:59:59`).getTime() >= Date.now())
    .sort((a, b) => (new Date(`${b.productionDate || '1970-01-01'}T00:00:00`) - new Date(`${a.productionDate || '1970-01-01'}T00:00:00`)) || (b.createdAt || 0) - (a.createdAt || 0));
}
const supName = p => nameOf((LIVE.cache.suppliers || {})[p.supplierId]) || p.supplierName || '-';
const PU_TONE = { pending: 'warning', approved: 'info', partial: 'accent', received: 'success', rejected: 'danger' };
const puStatus = p => (PU_TONE[p.status] ? p.status : 'pending');
const keyOf = it => `${itemType(it)}:${it.itemId || it.id}`;
const receivedMap = p => { const m = {}; items$(p && p.receivedItems).forEach(it => { const k = keyOf(it); m[k] = (m[k] || 0) + Number(it.qty || 0); }); return m; };
const receiptsOf = pid => Object.entries(LIVE.cache.purchaseReceipts || {}).map(([id, r]) => ({ id, ...r })).filter(r => r.purchaseId === pid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const branchAr = id => arName((LIVE.cache.branches || {})[id]) || (OLD_BRANCH[id] ? OLD_BRANCH[id][0] : id || '');
const clean = o => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));
const qtyFmt = n => fmtNum(Number(n || 0), 3);
/* Every drawer starts clean: no handlers left over from the previous one */
function freshDrawer(wide) {
  const dr = $('#drawer .drawer');
  dr.onclick = null; dr.oninput = null;
  dr.classList.toggle('wide', !!wide);
  return dr;
}

function pagerHtml(st, total) {
  const per = st.per || PER;
  const pages = Math.max(1, Math.ceil(total / per));
  st.page = Math.min(st.page, pages);
  const from = total ? (st.page - 1) * per + 1 : 0, to = Math.min(st.page * per, total);
  const nums = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return `<span class="pager-info">${t('showing')} <b>${from}–${to}</b> ${t('of')} <b>${total}</b></span>
    <div class="pager-btns"><button class="btn-icon sm" data-page="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="${t('prev')}">${icon('chevLeft', 'flip')}</button>
    ${nums.map(p => (p === '…' ? '<span class="dots">…</span>' : `<button class="pg${p === st.page ? ' on' : ''}" data-page="${p}">${p}</button>`)).join('')}
    <button class="btn-icon sm" data-page="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="${t('next')}">${icon('chevRight', 'flip')}</button></div>`;
}
const skeletonRows = (n, cols) => Array.from({ length: n }, () => `<tr class="skel-row">${'<td><i class="skel"></i></td>'.repeat(cols)}</tr>`).join('');
const skeletonKpis = () => Array.from({ length: 4 }, () => '<article class="kpi card"><i class="skel lg"></i><i class="skel"></i></article>').join('');

/* =====================================================================
   الشراء — Purchases
   ===================================================================== */
// The list shows as soon as PU_PATHS arrive; the big catalog (PU_CATALOG) follows in the background.
const PU_PATHS = ['purchases', 'purchaseReceipts', 'pendingStockMoves', 'suppliers', 'branches', 'units'];
const PU_CATALOG = ['products', 'stockMaterials', 'production'];

PAGES.purchases = view => {
  const st = (S.pu ||= { q: '', status: 'all', supplier: 'all', from: '', to: '', page: 1 });
  let first = true, saving = false;

  view.innerHTML = `
    ${pageHeader('purchases', `<button class="btn btn-ghost" data-pu="export">${icon('download')}<span>${t('export')}</span></button>
      <button class="btn btn-primary" data-pu="new">${icon('plus')}<span>${t('pu.new')}</span></button>`, t('pu.sub'))}
    <section class="kpis" id="puK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="puQ" placeholder="${t('pu.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <div class="select tb-select">${icon('chevDown')}<select id="puSup" aria-label="${t('c.supplier')}"></select></div>
        <label class="date-field"><small>${t('c.from')}</small><input type="date" id="puFrom" value="${st.from}"></label>
        <label class="date-field"><small>${t('c.to')}</small><input type="date" id="puTo" value="${st.to}"></label>
        <div class="chips chips-row" id="puChips"></div>
      </div>
      <div class="table-wrap"><table class="dt pu-table">
        <thead><tr><th>${t('pu.number')}</th><th>${t('c.supplier')}</th><th>${t('c.date')}</th><th>${t('c.items')}</th><th class="end">${t('pm.value')}</th><th>${t('c.status')}</th><th class="act-col"></th></tr></thead>
        <tbody id="puBody"></tbody>
      </table></div>
      <footer class="pager" id="puPager"></footer>
    </section>`;

  const all = () => Object.entries(LIVE.cache.purchases || {}).map(([id, p]) => ({ id, p, status: puStatus(p), total: expectedTotal(p), items: items$(p.items) }))
    .sort((a, b) => (b.p.createdAt || 0) - (a.p.createdAt || 0));
  const filtered = rows => {
    const q = normQ(st.q);
    const from = st.from ? new Date(`${st.from}T00:00:00`).getTime() : 0, to = st.to ? new Date(`${st.to}T23:59:59`).getTime() : Infinity;
    return rows.filter(r => (st.status === 'all' || r.status === st.status)
      && (st.supplier === 'all' || r.p.supplierId === st.supplier)
      && (!st.from && !st.to || ((r.p.createdAt || 0) >= from && (r.p.createdAt || 0) <= to))
      && (!q || normQ([r.p.purchaseNumber, r.p.purchaseInvoiceNumber, supName(r.p), r.p.storekeeperName, ...r.items.map(i => `${i.name} ${i.code || ''}`)].join(' ')).includes(q)));
  };

  const row = (r, i) => {
    const p = r.p, s = r.status;
    const its = s === 'received' || s === 'partial' ? items$(p.receivedItems) : r.items;
    return `<tr data-id="${r.id}" class="${first ? 'row-in' : ''}" style="--r:${i}">
      <td data-label="${t('pu.number')}"><span class="cell-2"><b class="mono">#${esc(p.purchaseNumber ?? '-')}</b>${p.purchaseInvoiceNumber ? `<small>${t('pm.invNo')}: <span class="mono">${esc(p.purchaseInvoiceNumber)}</span></small>` : ''}</span></td>
      <td data-label="${t('c.supplier')}"><span class="cell-2"><b>${esc(supName(p))}</b><small>${esc(branchLabel(p.branchId))}</small></span></td>
      <td data-label="${t('c.date')}"><span class="cell-2"><span class="date">${fmtDateTime(p.createdAt)}</span>${p.storekeeperName ? `<small>${esc(p.storekeeperName)}</small>` : ''}</span></td>
      <td data-label="${t('c.items')}"><span class="cell-2 items-cell"><b>${its.length} ${t('pu.itemsWord')}</b><small>${esc(its.slice(0, 2).map(x => x.name).join('، '))}${its.length > 2 ? '…' : ''}</small></span></td>
      <td data-label="${t('pm.value')}" class="end"><span class="num">${fmtMoney(r.total)}</span></td>
      <td data-label="${t('c.status')}"><span class="badge tone-${PU_TONE[s]}"><i></i>${t('pu.st.' + s)}</span></td>
      <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-pu="view" aria-label="${t('view')}" data-tip="${t('view')}" data-tip-always>${icon('eye')}</button>
        <button class="btn-icon sm" data-pu="print" aria-label="${t('print')}" data-tip="${t('print')}" data-tip-always>${icon('printer')}</button>
        ${s === 'pending' ? `<button class="btn-icon sm" data-pu="edit" aria-label="${t('edit')}" data-tip="${t('edit')}" data-tip-always>${icon('pencil')}</button>` : ''}
        ${s === 'approved' || s === 'partial' ? `<button class="btn btn-sm btn-approve" data-pu="receive" aria-label="${t('pu.receive')}" data-tip="${t('pu.receive')}" data-tip-always>${icon('in', 'flip')}<span>${t('pu.receive')}</span></button>` : ''}
        ${['pending', 'approved', 'rejected'].includes(s) ? `<button class="btn-icon sm danger" data-pu="delete" aria-label="${t('delete')}" data-tip="${t('delete')}" data-tip-always>${icon('trash')}</button>` : ''}
      </div></td></tr>`;
  };

  function draw() {
    const body = $('#puBody', view); if (!body) return;
    if (!LIVE.loaded(PU_PATHS)) { setHtml(body, skeletonRows(5, 7)); $('#puK', view).innerHTML = skeletonKpis(); return; }
    if (S.puOpenNew) { const sid = S.puOpenNew; S.puOpenNew = null; setTimeout(() => openForm(null, typeof sid === 'string' ? sid : ''), 250); }
    const rows = all();
    const month = Date.now() - 30 * 86400000;
    const recv30 = Object.values(LIVE.cache.purchaseReceipts || {}).filter(r => (r.createdAt || 0) >= month).reduce((s, r) => s + items$(r.items).reduce((a, it) => a + Number(it.qty || 0) * Number(it.cost ?? it.unitPrice ?? 0), 0), 0);
    setKpis($('#puK', view), [
      kpiCard({ label: t('pu.kPending'), value: rows.filter(r => r.status === 'pending').length, ic: 'clock', tone: 'c4' }),
      kpiCard({ label: t('pu.kReady'), value: rows.filter(r => r.status === 'approved' || r.status === 'partial').length, ic: 'truck', tone: 'c2' }),
      kpiCard({ label: t('pu.kOpenValue'), value: rows.filter(r => ['pending', 'approved', 'partial'].includes(r.status)).reduce((s, r) => s + r.total, 0), kind: 'money', ic: 'wallet', tone: 'c1' }),
      kpiCard({ label: t('pu.kReceived30'), value: recv30, kind: 'money', ic: 'in', tone: 'c3' })
    ].join(''), first);
    const cnt = s => (s === 'all' ? rows.length : rows.filter(r => r.status === s).length);
    patchChildren($('#puChips', view), ['all', 'pending', 'approved', 'partial', 'received', 'rejected'].map(s =>
      `<button class="chip${st.status === s ? ' on' : ''}" data-status="${s}">${s === 'all' ? '' : `<i class="dot tone-${PU_TONE[s]}"></i>`}${t(s === 'all' ? 'all' : 'pu.st.' + s)}<em>${cnt(s)}</em></button>`).join(''));
    const sups = Object.entries(LIVE.cache.suppliers || {}).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    setHtml($('#puSup', view), `<option value="all">${t('pu.allSuppliers')}</option>` + sups.map(([id, s]) => `<option value="${esc(id)}" ${st.supplier === id ? 'selected' : ''}>${esc(nameOf(s))}</option>`).join(''));
    const list = filtered(rows);
    setHtml($('#puPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * PER, st.page * PER);
    setHtml(body, slice.length ? slice.map(row).join('') : `<tr class="empty"><td colspan="7"><div class="empty-state">${icon('search')}<b>${t('emptyTitle')}</b><small>${t('emptySub')}</small></div></td></tr>`);
    first = false;
  }

  /* ---------- purchase request form ---------- */
  function openForm(rec, presetSupplier) {
    if (!afterCatalog(PU_CATALOG, () => openForm(rec, presetSupplier))) return;
    if (rec && puStatus(rec.p) !== 'pending') { toast(t('pu.onlyPendingEdit'), { tone: 'info', ic: 'info' }); return; }
    const mainBranch = (Object.entries(LIVE.cache.branches || {}).find(([, b]) => b.isMain) || [])[0] || '';
    const d = {
      editingId: rec ? rec.id : null,
      purchaseNumber: rec ? rec.p.purchaseNumber : null,
      pendingMoveId: rec ? rec.p.pendingMoveId || null : null,
      supplierId: rec ? rec.p.supplierId || '' : presetSupplier || '',
      branchId: rec ? rec.p.branchId || mainBranch : mainBranch,
      invoice: rec ? rec.p.purchaseInvoiceNumber || '' : '',
      items: rec ? items$(rec.p.items).map(it => ({ ...it, itemType: itemType(it), itemId: it.itemId || it.id, qty: Number(it.qty || 0), unitPrice: unitPrice(it) })) : [],
      q: ''
    };
    const dr = freshDrawer(true);
    const sups = Object.entries(LIVE.cache.suppliers || {}).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    const branches = Object.keys(LIVE.cache.branches || {});
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(rec ? 'pencil' : 'cart')}</span><div><h2 id="drawerTitle">${rec ? `${t('pu.editTitle')} #${esc(rec.p.purchaseNumber)}` : t('pu.new')}</h2><p>${t('pu.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body pu-form">
        <div class="form-grid">
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(me().name)}" readonly></div>
          <div class="field"><label for="fSup">${t('c.supplier')} <em>*</em></label><div class="select"><select id="fSup"><option value="">${t('pu.chooseSupplier')}</option>${sups.map(([id, s]) => `<option value="${esc(id)}" ${d.supplierId === id ? 'selected' : ''}>${esc(nameOf(s))}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="fBr">${t('c.branch')} <em>*</em></label><div class="select"><select id="fBr"><option value="">${t('pu.chooseBranch')}</option>${branches.map(id => `<option value="${esc(id)}" ${d.branchId === id ? 'selected' : ''}>${esc(branchLabel(id))}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="fInv">${t('pm.invNo')} <em>*</em></label><input id="fInv" value="${esc(d.invoice)}" autocomplete="off" dir="auto"><small class="err"></small></div>
        </div>
        <section class="picker">
          <div class="picker-head"><b>${t('pu.addItems')}</b><label class="search-field">${icon('barcode')}<input type="search" id="fQ" placeholder="${t('pu.itemSearchPh')}" autocomplete="off"></label></div>
          <div class="picker-list" id="fPick"></div>
        </section>
        <section class="draft">
          <div class="draft-head"><b>${t('pu.requestItems')}</b><span class="muted" id="fCount"></span></div>
          <div id="fItems"></div>
          <small class="err" id="fItemsErr"></small>
        </section>
      </div>
      <footer class="dr-foot"><div class="dr-total"><small>${t('pm.value')}</small><b id="fTotal">${fmtMoney(0)}</b></div><span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-close>${t('cancel')}</button>
        <button class="btn btn-primary" id="fSave">${icon('check')}<span>${rec ? t('save') : t('pu.submit')}</span></button></footer>`;
    openLayer('#drawer');

    const lineRow = (it, idx) => {
      const lp = latestPrice(it.itemType, it.itemId, it.unitId);
      const sameUnit = lp && (!lp.unitId || !it.unitId || lp.unitId === it.unitId);
      const diff = lp && sameUnit ? Number(it.unitPrice || 0) - lp.price : 0;
      const batches = it.itemType === 'product' ? activeBatches(it.itemId) : [];
      const exists = !!itemData(it.itemType, it.itemId);
      return `<div class="line" data-i="${idx}">
        <div class="line-name"><b>${esc(itemLabel(it))}</b>
          ${!exists ? `<small class="neg">${t('pu.itemGone')}</small>` : ''}
          ${batches.length ? `<div class="select mini">${icon('chevDown')}<select data-f="batch" aria-label="${t('pu.batch')}"><option value="">${t('pu.noBatch')}</option>${batches.map(b => `<option value="${esc(b.id)}" ${it.productionId === b.id ? 'selected' : ''}>${t('pu.batch')} #${esc(b.productionNumber ?? '')} · ${esc(b.productionDate || '')}</option>`).join('')}</select></div>` : ''}
          <small class="muted">${t('pu.lastPrice')}: ${lp ? `${fmtMoney(lp.price)}${!sameUnit ? ` <span class="unit-warn">/ ${esc(unitName(lp.unitId))}</span>` : ''}` : '—'}</small>
          ${Math.abs(diff) > 0.0005 ? `<small class="${diff > 0 ? 'neg' : 'pos'}">${icon(diff > 0 ? 'up' : 'down')} ${t(diff > 0 ? 'pu.priceUp' : 'pu.priceDown')} ${fmtMoney(Math.abs(diff))}</small>` : ''}</div>
        <label class="line-in"><small>${t('c.qty')}</small><input type="number" data-f="qty" min="0" step="any" inputmode="decimal" value="${it.qty}"></label>
        <label class="line-in"><small>${t('pm.unitPrice')}</small><input type="number" data-f="price" min="0" step="0.001" inputmode="decimal" value="${it.unitPrice}"></label>
        <div class="line-total"><small>${t('c.total')}</small><b class="num">${fmtMoney(Number(it.qty || 0) * Number(it.unitPrice || 0))}</b></div>
        <button class="btn-icon sm danger" data-f="del" aria-label="${t('delete')}">${icon('trash')}</button>
      </div>`;
    };
    const drawItems = flashIdx => {
      $('#fItems', dr).innerHTML = d.items.length ? d.items.map(lineRow).join('') : `<div class="empty-state sm">${icon('cart')}<b>${t('pu.noItems')}</b><small>${t(d.supplierId ? 'pu.noItemsSub' : 'pu.pickSupplierFirst')}</small></div>`;
      $('#fCount', dr).textContent = d.items.length ? `${d.items.length} ${t('pu.itemsWord')}` : '';
      if (flashIdx != null) { const el = $(`.line[data-i="${flashIdx}"]`, dr); el && el.classList.add('flash-in'); }
      updateTotal();
    };
    const updateTotal = () => { $('#fTotal', dr).innerHTML = fmtMoney(d.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0)); };
    const drawPicker = () => {
      const box = $('#fPick', dr);
      if (!d.supplierId) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t('pu.pickSupplierFirst')}</p>`; return; }
      const q = normQ(d.q);
      const list = supplierItems(d.supplierId).filter(e => !q || normQ(`${e.item.nameAr || ''} ${e.item.nameEn || ''} ${e.item.name || ''} ${e.item.code || ''} ${e.item.barcode || ''}`).includes(q));
      if (!list.length) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t(supplierItems(d.supplierId).length ? 'noResults' : 'pu.supplierNoItems')}</p>`; return; }
      box.innerHTML = list.slice(0, 40).map(e => {
        const lp = latestPrice(e.type, e.id, e.item.unitId);
        const inDraft = d.items.some(x => x.itemType === e.type && String(x.itemId) === String(e.id));
        return `<button type="button" class="pick${inDraft ? ' added' : ''}" data-type="${e.type}" data-id="${esc(e.id)}">
          <span class="pick-ic">${icon(e.type === 'product' ? 'package' : 'box')}</span>
          <span class="pick-txt"><b>${esc(nameOf(e.item))}</b><small>${e.item.code ? `<span class="mono">${esc(e.item.code)}</span> · ` : ''}${esc(unitName(e.item.unitId) || '-')} · ${t('pu.inStock')} ${qtyFmt(stockAt(e.item, d.branchId))}${lp ? ` · ${fmtMoney(lp.price)}` : ''}</small></span>
          <span class="pick-add">${icon(inDraft ? 'check' : 'plus')}</span></button>`;
      }).join('') + (list.length > 40 ? `<p class="muted pick-hint">${t('pu.refine')}</p>` : '');
    };
    const addEntry = (type, id, batchId) => {
      const item = itemData(type, id); if (!item) return;
      const batches = type === 'product' ? activeBatches(id) : [];
      const batch = batchId ? batches.find(b => b.id === batchId) : batches[0];
      let idx = d.items.findIndex(x => x.itemType === type && String(x.itemId) === String(id) && (type !== 'product' || String(x.productionId || '') === String((batch && batch.id) || '')));
      if (idx >= 0) d.items[idx].qty = Number(d.items[idx].qty || 0) + 1;
      else {
        const lp = latestPrice(type, id, item.unitId);
        const lpOk = lp && (!lp.unitId || !item.unitId || lp.unitId === item.unitId);
        d.items.push({ itemId: id, itemType: type, name: nameOf(item) || arName(item), qty: 1, unitId: item.unitId || null, unitName: unitName(item.unitId) || null,
          unitPrice: lpOk ? lp.price : Number(item.cost || 0), productionId: batch ? batch.id : null, productionDate: batch ? batch.productionDate || null : null, productionNumber: batch ? batch.productionNumber || null : null });
        idx = d.items.length - 1;
      }
      $('#fItemsErr', dr).textContent = '';
      drawItems(idx); drawPicker();
    };

    drawItems(); drawPicker();
    const setErr = (id, msg) => { const f = $(id, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $('#fSup', dr).addEventListener('change', async e => {
      const next = e.target.value;
      if (d.items.length && next !== d.supplierId) {
        const ok = await confirmDialog({ title: t('pu.changeSupplierQ'), body: `<p class="cf-note">${t('pu.changeSupplierNote')}</p>`, ok: t('pu.changeSupplier'), tone: 'danger', icon: 'swap' });
        if (!ok) { e.target.value = d.supplierId; return; }
        d.items = [];
      }
      d.supplierId = next; setErr('#fSup', ''); drawItems(); drawPicker();
    });
    $('#fBr', dr).addEventListener('change', e => { d.branchId = e.target.value; setErr('#fBr', ''); drawPicker(); });
    $('#fInv', dr).addEventListener('input', e => { d.invoice = e.target.value; setErr('#fInv', ''); });
    $('#fQ', dr).addEventListener('input', e => { d.q = e.target.value; drawPicker(); });
    $('#fQ', dr).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = normQ(d.q); if (!q || !d.supplierId) return;
      const list = supplierItems(d.supplierId);
      const exact = list.filter(x => [x.item.code, x.item.barcode].some(c => c && normQ(c) === q));
      let hit = exact.length === 1 ? exact[0] : null, batchId = null;
      if (!hit) {
        const b = batchByBarcode(q);
        if (b) { hit = list.find(x => x.type === 'product' && String(x.id) === String(b.itemId)); batchId = b.batchId; }
      }
      if (!hit && list.filter(x => normQ(`${x.item.nameAr || ''} ${x.item.nameEn || ''} ${x.item.code || ''}`).includes(q)).length === 1) hit = list.find(x => normQ(`${x.item.nameAr || ''} ${x.item.nameEn || ''} ${x.item.code || ''}`).includes(q));
      if (hit) { addEntry(hit.type, hit.id, batchId); e.target.value = ''; d.q = ''; drawPicker(); }
      else toast(t('pu.noMatch'), { tone: 'info', ic: 'search' });
    });
    $('#fPick', dr).addEventListener('click', e => { const b = e.target.closest('.pick'); if (b) addEntry(b.dataset.type, b.dataset.id); });
    $('#fItems', dr).addEventListener('input', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i], f = e.target.dataset.f;
      if (f === 'qty') it.qty = Math.max(0, Number(e.target.value || 0));
      if (f === 'price') it.unitPrice = Math.max(0, Number(e.target.value || 0));
      $('.line-total b', line).innerHTML = fmtMoney(Number(it.qty || 0) * Number(it.unitPrice || 0));
      updateTotal();
    });
    $('#fItems', dr).addEventListener('change', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i];
      if (e.target.dataset.f === 'batch') {
        const b = activeBatches(it.itemId).find(x => x.id === e.target.value);
        Object.assign(it, { productionId: b ? b.id : null, productionDate: b ? b.productionDate || null : null, productionNumber: b ? b.productionNumber || null : null });
      }
      if (e.target.dataset.f === 'price' || e.target.dataset.f === 'qty') drawItems();
    });
    $('#fItems', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-f="del"]'); if (!b) return;
      const line = b.closest('.line');
      line.classList.add('row-out');
      setTimeout(() => { d.items.splice(+line.dataset.i, 1); drawItems(); drawPicker(); }, 220);
    });

    $('#fSave', dr).addEventListener('click', async () => {
      if (saving) return;
      let bad = false;
      if (!d.supplierId) { setErr('#fSup', t('required')); bad = true; }
      if (!d.branchId) { setErr('#fBr', t('required')); bad = true; }
      if (!String(d.invoice).trim()) { setErr('#fInv', t('required')); bad = true; }
      if (!d.items.length) { $('#fItemsErr', dr).textContent = t('pu.needItems'); bad = true; }
      else if (d.items.some(it => !(Number(it.qty) > 0))) { $('#fItemsErr', dr).textContent = t('pu.needQty'); bad = true; }
      if (bad) { dr.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 }); return; }
      const sup = (LIVE.cache.suppliers || {})[d.supplierId];
      const supplierName = arName(sup) || '-';
      const items = d.items.map(it => clean({ itemId: it.itemId, itemType: it.itemType, name: it.name, qty: Number(it.qty), unitId: it.unitId || null, unitName: it.unitName || null,
        unitPrice: Number(it.unitPrice || 0), productionId: it.productionId || null, productionDate: it.productionDate || null, productionNumber: it.productionNumber || null }));
      const btn = $('#fSave', dr); saving = true; btn.classList.add('loading');
      try {
        const now = LIVE.now();
        if (d.editingId) {
          const cur = (LIVE.cache.purchases || {})[d.editingId];
          if (!cur || puStatus(cur) !== 'pending') { toast(t('pu.changedElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
          const up = {
            [`purchases/${d.editingId}/supplierId`]: d.supplierId, [`purchases/${d.editingId}/supplierName`]: supplierName,
            [`purchases/${d.editingId}/branchId`]: d.branchId, [`purchases/${d.editingId}/branchName`]: branchAr(d.branchId),
            [`purchases/${d.editingId}/purchaseInvoiceNumber`]: String(d.invoice).trim(), [`purchases/${d.editingId}/items`]: items,
            [`purchases/${d.editingId}/status`]: 'pending', [`purchases/${d.editingId}/updatedAt`]: now
          };
          if (d.pendingMoveId && (LIVE.cache.pendingStockMoves || {})[d.pendingMoveId]) {
            up[`pendingStockMoves/${d.pendingMoveId}/name`] = `طلب شراء ${d.purchaseNumber}`;
            up[`pendingStockMoves/${d.pendingMoveId}/note`] = supplierName;
            up[`pendingStockMoves/${d.pendingMoveId}/branchId`] = d.branchId;
          }
          await LIVE.update(up);
          toast(`#${d.purchaseNumber} — ${t('saved')}`);
        } else {
          const num = await LIVE.counter('meta/purchaseCounter');
          const pid = LIVE.newKey('purchases'), mid = LIVE.newKey('pendingStockMoves');
          await LIVE.update({
            [`purchases/${pid}`]: clean({ purchaseNumber: num, createdAt: now, storekeeperId: me().id || null, storekeeperName: me().name || null, supplierId: d.supplierId, supplierName,
              branchId: d.branchId, branchName: branchAr(d.branchId), purchaseInvoiceNumber: String(d.invoice).trim(), status: 'pending', items, pendingMoveId: mid }),
            [`pendingStockMoves/${mid}`]: { name: `طلب شراء ${num}`, note: supplierName, createdAt: now, status: 'pending', type: 'purchase', purchaseId: pid, branchId: d.branchId }
          });
          toast(`${t('pm.purchaseReq')} #${num} — ${t('pu.sentForApproval')}`);
        }
        closeLayers();
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
    setTimeout(() => (d.supplierId ? $('#fQ', dr) : $('#fSup', dr)).focus(), 350);
  }

  /* ---------- receive ---------- */
  function openReceive(rec) {
    if (!afterCatalog(PU_CATALOG, () => openReceive(rec))) return;
    const p = rec.p;
    if (!['approved', 'partial'].includes(puStatus(p))) { toast(t('pu.notReceivable'), { tone: 'info', ic: 'info' }); return; }
    const got = receivedMap(p);
    const lines = items$(p.items).map(it => {
      const ordered = Number(it.qty || 0), before = got[keyOf(it)] || 0, remaining = Math.max(ordered - before, 0);
      return { it, ordered, before, remaining, qty: remaining, exists: !!itemData(itemType(it), it.itemId || it.id), locId: null };
    });
    // Goods for the main branch: an item kept in several places asks which place they go to
    const rBranch = p.branchId || mainBranch();
    const needsPlace = l => l.exists && l.remaining > 0 && multiLoc(itemType(l.it), l.it.itemId || l.it.id, rBranch);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('in', 'flip')}</span><div><h2 id="drawerTitle">${t('pu.receiveTitle')} #${esc(p.purchaseNumber)}</h2><p>${esc(supName(p))} · ${esc(branchLabel(p.branchId))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="form-grid">
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(me().name)}" readonly></div>
          <div class="field"><label for="rInv">${t('pm.invNo')} <em>*</em></label><input id="rInv" value="${esc(p.purchaseInvoiceNumber || '')}" dir="auto" autocomplete="off"><small class="err"></small></div>
        </div>
        <div class="rcv-tools"><b>${t('c.items')}</b><span class="tb-spacer"></span>
          <button class="btn btn-sm btn-soft" data-r="all">${icon('check')}${t('pu.receiveAll')}</button>
          <button class="btn btn-sm btn-ghost" data-r="none">${icon('x')}${t('pu.clearAll')}</button></div>
        <div class="dr-items"><table class="dt compact rcv-table"><thead><tr><th>${t('c.name')}</th><th class="end">${t('pu.ordered')}</th><th class="end">${t('pu.receivedBefore')}</th><th class="end">${t('pu.remaining')}</th><th class="end">${t('pu.receiveNow')}</th></tr></thead>
          <tbody>${lines.map((l, i) => `<tr data-i="${i}" class="${l.remaining ? '' : 'done-line'}"><td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(itemLabel(l.it))}</b>${!l.exists ? `<small class="neg">${t('pu.itemGoneStock')}</small>` : ''}</span>${needsPlace(l) ? locPick(itemType(l.it), l.it.itemId || l.it.id, 'in', '') : ''}</td>
            <td data-label="${t('pu.ordered')}" class="end num">${qtyFmt(l.ordered)}</td><td data-label="${t('pu.receivedBefore')}" class="end num">${qtyFmt(l.before)}</td><td data-label="${t('pu.remaining')}" class="end num">${qtyFmt(l.remaining)}</td>
            <td data-label="${t('pu.receiveNow')}" class="end"><input class="qty-in" type="number" min="0" max="${l.remaining}" step="any" inputmode="decimal" value="${l.qty}" ${l.remaining ? '' : 'disabled'} aria-label="${t('pu.receiveNow')}"></td></tr>`).join('')}</tbody></table></div>
        <small class="err" id="rErr"></small>
        <label class="check-line"><input type="checkbox" id="rPrint" checked> ${t('pu.printAfter')}</label>
      </div>
      <footer class="dr-foot"><div class="dr-total"><small>${t('pu.receiveValue')}</small><b id="rTotal"></b></div><span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-close>${t('cancel')}</button>
        <button class="btn btn-primary" id="rSave">${icon('check')}<span>${t('pu.confirmReceive')}</span></button></footer>`;
    openLayer('#drawer');
    const total = () => { $('#rTotal', dr).innerHTML = fmtMoney(lines.reduce((s, l) => s + l.qty * unitPrice(l.it), 0)); };
    total();
    dr.querySelector('.rcv-table').addEventListener('input', e => {
      if (!e.target.classList.contains('qty-in')) return;
      const l = lines[+e.target.closest('tr').dataset.i];
      let v = Number(e.target.value || 0);
      if (!(v >= 0)) v = 0;
      if (v > l.remaining) { v = l.remaining; e.target.value = v; e.target.closest('td').animate([{ background: 'color-mix(in srgb, var(--warning) 25%, transparent)' }, { background: 'transparent' }], { duration: 600 }); }
      l.qty = v; total(); $('#rErr', dr).textContent = '';
    });
    dr.querySelector('.rcv-table').addEventListener('change', e => {
      if (e.target.dataset.f !== 'loc') return;
      lines[+e.target.closest('tr').dataset.i].locId = e.target.value || null;
      e.target.closest('.loc-sel').classList.toggle('need', !e.target.value);
    });
    $$('[data-r]', dr).forEach(b => b.addEventListener('click', () => {
      lines.forEach((l, i) => { l.qty = b.dataset.r === 'all' ? l.remaining : 0; const inp = $(`tr[data-i="${i}"] .qty-in`, dr); if (inp) inp.value = l.qty; });
      total();
    }));
    $('#rInv', dr).addEventListener('input', e => { const f = e.target.closest('.field'); f.classList.remove('invalid'); $('.err', f).textContent = ''; });
    $('#rSave', dr).addEventListener('click', async () => {
      if (saving) return;
      const inv = $('#rInv', dr).value.trim();
      if (!inv) { const f = $('#rInv', dr).closest('.field'); f.classList.add('invalid'); $('.err', f).textContent = t('required'); return; }
      const now$ = lines.filter(l => l.qty > 0);
      if (!now$.length) { $('#rErr', dr).textContent = t('pu.needReceiveQty'); return; }
      const noLoc = now$.find(l => needsPlace(l) && !l.locId);
      if (noLoc) { $('#rErr', dr).textContent = t('sl.needLoc').replace('{name}', itemLabel(noLoc.it)); return; }
      const cur = (LIVE.cache.purchases || {})[rec.id];
      if (!cur || !['approved', 'partial'].includes(puStatus(cur))) { toast(t('pu.changedElsewhere'), { tone: 'danger', ic: 'alert' }); closeLayers(); return; }
      // Re-check against the latest received amounts (another device may have received meanwhile)
      const fresh = receivedMap(cur);
      if (now$.some(l => l.qty > Math.max(l.ordered - (fresh[keyOf(l.it)] || 0), 0) + 1e-9)) { toast(t('pu.changedElsewhere'), { tone: 'danger', ic: 'alert' }); closeLayers(); return; }
      const btn = $('#rSave', dr); saving = true; btn.classList.add('loading');
      try {
        const branchId = cur.branchId || p.branchId;
        const receiptNumber = await LIVE.counter('meta/purchaseReceiptCounter');
        const rid = LIVE.newKey('purchaseReceipts');
        const items = now$.map(l => clean({ itemId: l.it.itemId || l.it.id, itemType: itemType(l.it), name: l.it.name, qty: l.qty, unitId: l.it.unitId || null, cost: unitPrice(l.it), unitPrice: unitPrice(l.it), locId: l.locId || null }));
        const up = {};
        now$.forEach(l => { if (l.exists) up[`${itemPath(itemType(l.it), l.it.itemId || l.it.id)}/stockByBranch/${branchId}`] = LIVE.increment(l.qty); });
        Object.entries(locMovesOf(items, branchId, 1)).forEach(([pth, q]) => { up[pth] = LIVE.increment(q); });
        const merged = { ...fresh };
        now$.forEach(l => { merged[keyOf(l.it)] = (merged[keyOf(l.it)] || 0) + l.qty; });
        const receivedItems = items$(cur.items).filter(it => merged[keyOf(it)] > 0).map(it => clean({ itemType: itemType(it), itemId: it.itemId || it.id, qty: merged[keyOf(it)], unitId: it.unitId || null, name: it.name }));
        const complete = items$(cur.items).every(it => (merged[keyOf(it)] || 0) + 1e-9 >= Number(it.qty || 0));
        const now = LIVE.now();
        const receipt = clean({ purchaseId: rec.id, supplierId: cur.supplierId, supplierName: cur.supplierName, branchId, branchName: branchAr(branchId), purchaseInvoiceNumber: inv,
          receiptNumber, createdAt: now, storekeeperId: me().id || null, storekeeperName: me().name || null, items });
        up[`purchaseReceipts/${rid}`] = receipt;
        Object.assign(up, {
          [`purchases/${rec.id}/receivedItems`]: receivedItems, [`purchases/${rec.id}/status`]: complete ? 'received' : 'partial',
          [`purchases/${rec.id}/purchaseInvoiceNumber`]: inv, [`purchases/${rec.id}/branchId`]: branchId, [`purchases/${rec.id}/branchName`]: branchAr(branchId),
          [`purchases/${rec.id}/lastReceiptNumber`]: receiptNumber, [`purchases/${rec.id}/updatedAt`]: now
        });
        if (complete) up[`purchases/${rec.id}/closedAt`] = now;
        await LIVE.update(up);
        toast(`#${cur.purchaseNumber} — ${t(complete ? 'pu.receivedOk' : 'pu.partialOk')}`, { ic: 'in' });
        const doPrint = $('#rPrint', dr).checked;
        closeLayers();
        if (doPrint) printReceipt({ ...receipt, createdAt: Date.now() }, { ...cur, receivedItems });
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
    setTimeout(() => { const f = $('.qty-in:not([disabled])', dr); f && f.focus(); }, 350);
  }

  /* ---------- details ---------- */
  function details(rec) {
    const p = rec.p, s = puStatus(p), got = receivedMap(p), its = items$(p.items), rcs = receiptsOf(rec.id);
    const move = p.pendingMoveId && (LIVE.cache.pendingStockMoves || {})[p.pendingMoveId];
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('cart')}</span><div><h2 id="drawerTitle">${t('pm.purchaseReq')} #${esc(p.purchaseNumber ?? '-')}</h2><p><span class="badge tone-${PU_TONE[s]}"><i></i>${t('pu.st.' + s)}</span></p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">
          ${[[t('c.supplier'), supName(p)], [t('c.branch'), branchLabel(p.branchId)], [t('pm.invNo'), p.purchaseInvoiceNumber || '-'], [t('pm.storekeeper'), p.storekeeperName || '-'], [t('c.date'), fmtDateTime(p.createdAt)], [t('pm.decidedBy'), move && move.decidedByName ? `${move.decidedByName} · ${fmtDateTime(move.decidedAt)}` : '-']].map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}
        </div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('pu.ordered')}</th><th class="end">${t('pu.received')}</th><th class="end">${t('pm.unitPrice')}</th><th class="end">${t('c.total')}</th></tr></thead>
          <tbody>${its.map(it => { const g = got[keyOf(it)] || 0; return `<tr><td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(itemLabel(it))}</b>${it.productionNumber ? `<small>${t('pu.batch')} #${esc(it.productionNumber)} · ${esc(it.productionDate || '')}</small>` : ''}</span></td>
            <td data-label="${t('pu.ordered')}" class="end num">${qtyFmt(it.qty)}</td><td data-label="${t('pu.received')}" class="end num ${g >= Number(it.qty || 0) ? 'pos' : g > 0 ? 'warn' : ''}">${qtyFmt(g)}</td>
            <td data-label="${t('pm.unitPrice')}" class="end num">${fmtMoney(unitPrice(it))}</td><td data-label="${t('c.total')}" class="end num">${fmtMoney(Number(it.qty || 0) * unitPrice(it))}</td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td colspan="4">${t('pm.value')}</td><td class="end num"><b>${fmtMoney(expectedTotal(p))}</b></td></tr></tfoot></table></div>
        <div class="receipts"><b>${t('pu.receipts')}</b>${rcs.length ? rcs.map(r => `<div class="receipt" data-rid="${esc(r.id)}"><span class="ni-ic tone-success">${icon('in', 'flip')}</span>
          <div><b>${t('pu.receiptNo')} #${esc(r.receiptNumber ?? '-')}</b><small>${fmtDateTime(r.createdAt)} · ${esc(r.storekeeperName || '-')} · ${items$(r.items).length} ${t('pu.itemsWord')}</small></div>
          <button class="btn-icon sm" data-rprint="${esc(r.id)}" aria-label="${t('print')}">${icon('printer')}</button></div>`).join('') : `<p class="muted">${t('pu.noReceipts')}</p>`}</div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-d="print">${icon('printer')}<span>${t('print')}</span></button><span class="tb-spacer"></span>
        ${s === 'pending' ? `<button class="btn btn-ghost" data-d="edit">${icon('pencil')}<span>${t('edit')}</span></button>` : ''}
        ${s === 'approved' || s === 'partial' ? `<button class="btn btn-primary" data-d="receive">${icon('in', 'flip')}<span>${t('pu.receive')}</span></button>` : ''}</footer>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const rp = e.target.closest('[data-rprint]');
      if (rp) { const r = rcs.find(x => x.id === rp.dataset.rprint); r && printReceipt(r, p); return; }
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'print') printAny(rec);
      else { dr.onclick = null; ({ edit: openForm, receive: openReceive })[b.dataset.d](rec); }
    };
  }

  function printRequest(rec) {
    const p = rec.p, its = items$(p.items);
    printDoc(`${t('pm.purchaseReq')} #${p.purchaseNumber ?? ''}`,
      [[t('c.supplier'), supName(p)], [t('c.branch'), branchLabel(p.branchId)], [t('c.date'), fmtDateTime(p.createdAt)], [t('pm.storekeeper'), p.storekeeperName || '-'], [t('c.status'), t('pu.st.' + puStatus(p))], [t('pm.invNo'), p.purchaseInvoiceNumber || '-']],
      [t('c.name'), t('c.qty'), t('pm.unitPrice'), t('c.total')],
      its.map(it => [itemLabel(it), qtyFmt(it.qty), moneyPlain(unitPrice(it)), moneyPlain(Number(it.qty || 0) * unitPrice(it))]),
      [t('pm.value'), moneyPlain(expectedTotal(p))]);
  }
  function printReceipt(r, p) {
    const got = receivedMap(p), its = items$(p.items).length ? items$(p.items) : items$(r.items);
    const now = {}; items$(r.items).forEach(it => { now[keyOf(it)] = (now[keyOf(it)] || 0) + Number(it.qty || 0); });
    printDoc(`${t('pu.receiptTitle')} #${r.receiptNumber ?? ''}`,
      [[t('c.supplier'), supName(p)], [t('c.branch'), branchLabel(r.branchId || p.branchId)], [t('pu.number'), `#${p.purchaseNumber ?? '-'}`], [t('pm.invNo'), r.purchaseInvoiceNumber || '-'], [t('c.date'), fmtDateTime(r.createdAt)], [t('pm.storekeeper'), r.storekeeperName || '-']],
      [t('c.name'), t('pu.ordered'), t('pu.receiveNow'), t('pu.receivedTotal')],
      its.map(it => [itemLabel(it), qtyFmt(it.qty), qtyFmt(now[keyOf(it)] || 0), qtyFmt(got[keyOf(it)] || 0)]));
  }
  function printAny(rec) {
    const rcs = receiptsOf(rec.id);
    if ((rec.status === 'received' || rec.status === 'partial') && rcs.length) printReceipt(rcs[0], rec.p);
    else printRequest(rec);
  }

  async function remove(rec) {
    const s = puStatus(rec.p);
    if (s === 'received' || s === 'partial') { toast(t('pu.cannotDeleteReceived'), { tone: 'info', ic: 'info' }); return; }
    const ok = await confirmDialog({ title: t('pu.deleteQ'), body: `<div class="cf-sum"><div><small>${t('pu.number')}</small><b>#${esc(rec.p.purchaseNumber ?? '-')}</b></div><div><small>${t('c.supplier')}</small><b>${esc(supName(rec.p))}</b></div></div><p class="cf-note">${t('pu.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const cur = (LIVE.cache.purchases || {})[rec.id];
    if (!cur) return;
    if (['received', 'partial'].includes(puStatus(cur))) { toast(t('pu.cannotDeleteReceived'), { tone: 'info', ic: 'info' }); return; }
    const up = { [`purchases/${rec.id}`]: null };
    if (cur.pendingMoveId) up[`pendingStockMoves/${cur.pendingMoveId}`] = null;
    try { await LIVE.update(up); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  function exportCsv() {
    const rows = filtered(all());
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const head = [t('pu.number'), t('pm.invNo'), t('c.supplier'), t('c.branch'), t('c.date'), t('pm.storekeeper'), t('c.items'), t('pm.value'), t('c.status')];
    const csv = [head.map(q).join(','), ...rows.map(r => [r.p.purchaseNumber, r.p.purchaseInvoiceNumber || '', supName(r.p), branchLabel(r.p.branchId), fmtDateTime(r.p.createdAt), r.p.storekeeperName || '', r.items.length, r.total.toFixed(3), t('pu.st.' + r.status)].map(q).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('exported'));
  }

  /* ---------- events ---------- */
  let deb;
  $('#puQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('#puSup', view).addEventListener('change', e => { st.supplier = e.target.value; st.page = 1; draw(); });
  $('#puFrom', view).addEventListener('change', e => { st.from = e.target.value; st.page = 1; draw(); });
  $('#puTo', view).addEventListener('change', e => { st.to = e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const chip = e.target.closest('[data-status]'); if (chip) { st.status = chip.dataset.status; st.page = 1; draw(); return; }
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-pu]'); if (!b) return;
    if (b.dataset.pu === 'new') { openForm(null); return; }
    if (b.dataset.pu === 'export') { if (allLoaded()) exportCsv(); return; }
    const id = b.closest('tr').dataset.id, p = (LIVE.cache.purchases || {})[id]; if (!p) return;
    const rec = { id, p, status: puStatus(p), total: expectedTotal(p), items: items$(p.items) };
    ({ view: details, print: printAny, edit: openForm, receive: openReceive, delete: remove })[b.dataset.pu](rec);
  });

  const unsub = LIVE.watch([...PU_PATHS, ...PU_CATALOG], draw);
  draw();
  takeDoc('purchases', [...PU_PATHS, ...PU_CATALOG], id => { const p = (LIVE.cache.purchases || {})[id]; if (p) details({ id, p, status: puStatus(p), total: expectedTotal(p), items: items$(p.items) }); });
  return () => { unsub(); freshDrawer(false); };
};

/* =====================================================================
   الموردون — Suppliers
   ===================================================================== */
const SP_PATHS = ['suppliers', 'products', 'stockMaterials', 'purchases', 'units'];
const OPEN = ['pending', 'approved', 'partial'];

PAGES.suppliers = view => {
  const st = (S.sp ||= { q: '', page: 1 });
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('suppliers', `<button class="btn btn-primary" data-sp="new">${icon('plus')}<span>${t('sp.new')}</span></button>`, t('sp.sub'))}
    <section class="kpis" id="spK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar"><label class="search-field">${icon('search')}<input type="search" id="spQ" placeholder="${t('sp.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label></div>
      <div class="table-wrap"><table class="dt">
        <thead><tr><th>${t('c.name')}</th><th>${t('c.phone')}</th><th>${t('c.items')}</th><th>${t('sp.open')}</th><th>${t('sp.lastPurchase')}</th><th class="end">${t('sp.value30')}</th><th class="act-col"></th></tr></thead>
        <tbody id="spBody"></tbody></table></div>
      <footer class="pager" id="spPager"></footer>
    </section>`;

  const rows = () => {
    const pu = Object.values(LIVE.cache.purchases || {}), month = Date.now() - 30 * 86400000;
    return Object.entries(LIVE.cache.suppliers || {}).map(([id, s]) => {
      const mine = pu.filter(p => p.supplierId === id);
      return { id, s, items: supplierItems(id).length, open: mine.filter(p => OPEN.includes(puStatus(p))).length,
        last: mine.reduce((m, p) => Math.max(m, Number(p.createdAt || 0)), 0),
        value30: mine.filter(p => (p.createdAt || 0) >= month && puStatus(p) !== 'rejected').reduce((a, p) => a + expectedTotal(p), 0) };
    }).sort((a, b) => nameOf(a.s).localeCompare(nameOf(b.s)));
  };

  function draw() {
    const body = $('#spBody', view); if (!body) return;
    if (!LIVE.loaded(SP_PATHS)) { setHtml(body, skeletonRows(5, 7)); $('#spK', view).innerHTML = skeletonKpis(); return; }
    const all = rows();
    const linked = new Set();
    [['product', LIVE.cache.products], ['material', LIVE.cache.stockMaterials]].forEach(([type, list]) => Object.entries(list || {}).forEach(([id, it]) => { if (supplierIdsOf(it).length) linked.add(`${type}:${id}`); }));
    Object.values(LIVE.cache.suppliers || {}).forEach(s => supplierSideIds(s).forEach(id => linked.add(id)));
    setKpis($('#spK', view), [
      kpiCard({ label: t('sp.kCount'), value: all.length, ic: 'truck', tone: 'c1' }),
      kpiCard({ label: t('sp.kItems'), value: linked.size, ic: 'box', tone: 'c2' }),
      kpiCard({ label: t('sp.kOpen'), value: all.reduce((a, r) => a + r.open, 0), ic: 'clock', tone: 'c4' }),
      kpiCard({ label: t('sp.kValue30'), value: all.reduce((a, r) => a + r.value30, 0), kind: 'money', ic: 'wallet', tone: 'c3' })
    ].join(''), first);
    const q = normQ(st.q);
    const list = all.filter(r => !q || normQ(`${r.s.nameAr || ''} ${r.s.nameEn || ''} ${r.s.name || ''} ${r.s.phone || ''}`).includes(q));
    setHtml($('#spPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * PER, st.page * PER);
    setHtml(body, slice.length ? slice.map((r, i) => {
      const alt = S.lang === 'ar' ? r.s.nameEn : r.s.nameAr;
      return `<tr data-id="${esc(r.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('c.name')}"><span class="person"><span class="av" style="--h:${hue(r.s.nameEn || r.id)}">${esc((nameOf(r.s) || '?').trim()[0])}</span><span class="cell-2"><b>${esc(nameOf(r.s) || '-')}</b>${alt && alt !== nameOf(r.s) ? `<small>${esc(alt)}</small>` : ''}</span></span></td>
        <td data-label="${t('c.phone')}">${r.s.phone ? `<a class="mono link-plain" href="tel:${esc(String(r.s.phone).replace(/\s+/g, ''))}">${esc(r.s.phone)}</a>` : '<span class="muted">—</span>'}</td>
        <td data-label="${t('c.items')}"><button class="chip chip-btn" data-sp="items">${icon('box')}${r.items}</button></td>
        <td data-label="${t('sp.open')}">${r.open ? `<button class="badge tone-warning badge-btn" data-sp="purchases"><i></i>${r.open}</button>` : '<span class="muted">0</span>'}</td>
        <td data-label="${t('sp.lastPurchase')}"><span class="date">${r.last ? fmtDate(r.last) : '—'}</span></td>
        <td data-label="${t('sp.value30')}" class="end"><span class="num">${fmtMoney(r.value30)}</span></td>
        <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-sp="neworder" aria-label="${t('pu.new')}" data-tip="${t('pu.new')}" data-tip-always>${icon('cart')}</button>
          <button class="btn-icon sm" data-sp="edit" aria-label="${t('edit')}" data-tip="${t('edit')}" data-tip-always>${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-sp="delete" aria-label="${t('delete')}" data-tip="${t('delete')}" data-tip-always>${icon('trash')}</button>
        </div></td></tr>`;
    }).join('') : `<tr class="empty"><td colspan="7"><div class="empty-state">${icon('truck')}<b>${t(st.q ? 'emptyTitle' : 'sp.none')}</b><small>${t(st.q ? 'emptySub' : 'sp.noneSub')}</small></div></td></tr>`);
    first = false;
    if (itemsOpenFor) drawItemsDrawer();
  }

  /* ---------- supplier form ---------- */
  function openForm(id) {
    const s = id ? (LIVE.cache.suppliers || {})[id] : null;
    itemsOpenFor = null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(s ? 'pencil' : 'truck')}</span><div><h2 id="drawerTitle">${t(s ? 'sp.editTitle' : 'sp.new')}</h2><p>${t('fillForm')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="spForm">
        <div class="field"><label for="sAr">${t('sp.nameAr')} <em>*</em></label><input id="sAr" dir="rtl" value="${esc(s ? s.nameAr || s.name || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="sEn">${t('sp.nameEn')} <em>*</em></label><input id="sEn" dir="ltr" value="${esc(s ? s.nameEn || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="sPh">${t('c.phone')}</label><input id="sPh" dir="ltr" inputmode="tel" value="${esc(s ? s.phone || '' : '')}" autocomplete="off"><small class="err"></small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="sSave">${icon('check')}<span>${t(s ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input', dr).forEach(i => i.addEventListener('input', () => err('#' + i.id, '')));
    const save = async e => {
      e && e.preventDefault();
      if (saving) return;
      const nameAr = $('#sAr', dr).value.trim(), nameEn = $('#sEn', dr).value.trim(), phone = $('#sPh', dr).value.trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      let bad = false;
      if (!nameAr) { err('#sAr', t('required')); bad = true; }
      if (!nameEn) { err('#sEn', t('required')); bad = true; }
      if (phone && !/^[+\d][\d\s-]{5,}$/.test(phone)) { err('#sPh', t('sp.badPhone')); bad = true; }
      const dup = Object.entries(LIVE.cache.suppliers || {}).find(([k, x]) => k !== id && (normQ(x.nameAr || x.name) === normQ(nameAr) || (nameEn && normQ(x.nameEn) === normQ(nameEn))));
      if (dup) { err(normQ(dup[1].nameAr || dup[1].name) === normQ(nameAr) ? '#sAr' : '#sEn', t('sp.duplicate')); bad = true; }
      if (bad) return;
      const btn = $('#sSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`suppliers/${id}/nameAr`]: nameAr, [`suppliers/${id}/nameEn`]: nameEn, [`suppliers/${id}/phone`]: phone });
        else await LIVE.update({ [`suppliers/${LIVE.newKey('suppliers')}`]: { nameAr, nameEn, phone, createdAt: LIVE.now() } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#spForm', dr).addEventListener('submit', save);
    $('#sSave', dr).addEventListener('click', save);
    setTimeout(() => $('#sAr', dr).focus(), 320);
  }

  /* ---------- supplier items ---------- */
  let itemsOpenFor = null;
  const picked = new Set();
  let pickQ = '';
  function unassignUpdates(sid, entry) {
    const up = {};
    const path = itemPath(entry.type, entry.id);
    const ids = supplierIdsOf(entry.item);
    if (ids.includes(sid)) Object.assign(up, itemSupplierUpdates(path, ids.filter(x => x !== sid)));
    const sup = (LIVE.cache.suppliers || {})[sid] || {};
    SUP_FIELDS.forEach(f => {
      const v = sup[f]; if (!v) return;
      if (Array.isArray(v)) { if (v.map(String).includes(String(entry.id))) up[`suppliers/${sid}/${f}`] = v.filter(x => String(x) !== String(entry.id)); }
      else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if ((x === true && k === String(entry.id)) || String(x) === String(entry.id)) up[`suppliers/${sid}/${f}/${k}`] = null; });
    });
    return up;
  }
  function drawItemsDrawer() {
    const dr = $('#drawer .drawer'), sid = itemsOpenFor;
    const sup = (LIVE.cache.suppliers || {})[sid];
    if (!sup || !$('#drawer').classList.contains('open')) { itemsOpenFor = null; closePicker(); return; }
    const mine = supplierItems(sid);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('box')}</span><div><h2 id="drawerTitle">${esc(nameOf(sup))}</h2><p>${t('sp.itemsSub')}</p></div>
        <button class="btn btn-primary btn-sm" data-open-picker>${icon('plus')}<span>${t('sp.addItem')}</span></button>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <section><div class="draft-head"><b>${t('sp.items')}</b><span class="muted">${mine.length}</span></div>
          ${mine.length ? `<div class="chip-list">${mine.map(e => `<span class="item-chip" data-type="${e.type}" data-id="${esc(e.id)}"><span class="pick-ic sm">${icon(e.type === 'product' ? 'package' : 'box')}</span>${esc(nameOf(e.item))}${e.item.code ? ` <small class="mono">${esc(e.item.code)}</small>` : ''}
            <button class="chip-x" data-unassign aria-label="${t('sp.remove')}">${icon('x')}</button></span>`).join('')}</div>`
            : `<div class="empty-state">${icon('box')}<b>${t('sp.noItems')}</b><small>${t('sp.noItemsHint')}</small></div>`}</section>
      </div>
      <footer class="dr-foot"><span class="tb-spacer"></span><button class="btn btn-ghost" data-close>${t('close')}</button></footer>`;
    if (picker) drawPickerList();
  }

  /* ---------- add-items popup (centered, above the drawer) ---------- */
  let picker = null;
  function pickerOthers() {
    const mineKeys = new Set(supplierItems(itemsOpenFor).map(e => `${e.type}:${e.id}`));
    const q = normQ(pickQ), out = [];
    [['material', LIVE.cache.stockMaterials], ['product', LIVE.cache.products]].forEach(([type, list]) => Object.entries(list || {}).forEach(([id, item]) => {
      if (mineKeys.has(`${type}:${id}`)) return;
      if (q && !normQ(`${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''} ${item.code || ''} ${item.barcode || ''}`).includes(q)) return;
      out.push({ id, type, item });
    }));
    return out;
  }
  const PK_PAGE = 60;
  let pkType = 'all', pkShown = PK_PAGE;
  function drawPickerList() {
    if (!picker) return;
    const all = pickerOthers();
    // Items linked meanwhile (another device) drop out of the selection
    const avail = new Set(all.map(e => `${e.type}:${e.id}`));
    [...picked].forEach(k => { if (!avail.has(k) && !pickQ) picked.delete(k); });
    const nMat = all.filter(e => e.type === 'material').length, nPrd = all.length - nMat;
    $('#pkTabs', picker).innerHTML = [['all', all.length], ['material', nMat], ['product', nPrd]].map(([k, n]) =>
      `<button type="button" class="pk-tab${pkType === k ? ' on' : ''}" data-pk-type="${k}">${t(k === 'all' ? 'all' : k === 'product' ? 'products' : 'stock-materials')}<em>${n}</em></button>`).join('');
    const list = pkType === 'all' ? all : all.filter(e => e.type === pkType);
    const shown = list.slice(0, pkShown);
    $('#pkList', picker).innerHTML = shown.length ? shown.map(e => {
      const k = `${e.type}:${e.id}`, on = picked.has(k), n = supplierIdsOf(e.item).length;
      const meta = [e.item.code ? `<span class="mono">${esc(e.item.code)}</span>` : '', esc(unitName(e.item.unitId) || ''), n ? `${t('sp.otherSuppliers')} ${n}` : ''].filter(Boolean).join(' · ');
      return `<button type="button" class="pk-row${on ? ' on' : ''}" data-k="${esc(k)}" role="checkbox" aria-checked="${on}">
        <span class="pk-check">${icon('check')}</span>
        <span class="pk-txt"><b>${esc(nameOf(e.item))}</b>${meta ? `<small>${meta}</small>` : ''}</span>
        <span class="pk-type ${e.type}">${t(e.type === 'product' ? 'sp.typeProduct' : 'sp.typeMaterial')}</span></button>`;
    }).join('') + (list.length > shown.length ? `<button type="button" class="pk-more" data-pk-more>${t('sp.showMore')} <em>${list.length - shown.length}</em></button>` : '')
      : `<div class="empty-state sm">${icon('search')}<b>${t(pickQ ? 'noResults' : 'sp.allLinked')}</b></div>`;
    const add = $('#pkAdd', picker);
    add.disabled = !picked.size;
    $('span', add).textContent = picked.size ? `${t('sp.add')} (${picked.size})` : t('sp.add');
    $('#pkCount', picker).innerHTML = picked.size ? `${t('sp.selectedN').replace('{n}', picked.size)} · <button type="button" class="link" data-pk-clear>${t('sp.clearSel')}</button>` : '';
  }
  function closePicker() {
    if (!picker) return;
    const el = picker; picker = null;
    el.classList.remove('open');
    setTimeout(() => el.remove(), 260);
    const b = $('#drawer [data-open-picker]'); b && b.focus({ preventScroll: true });
  }
  function openPicker() {
    if (picker || !itemsOpenFor) return;
    picked.clear(); pickQ = ''; pkType = 'all'; pkShown = PK_PAGE;
    const sup = (LIVE.cache.suppliers || {})[itemsOpenFor];
    picker = document.createElement('div');
    picker.className = 'pk-wrap';
    picker.innerHTML = `<div class="pk-backdrop" data-pk-close></div>
      <div class="pk" role="dialog" aria-modal="true" aria-labelledby="pkTitle">
        <header class="pk-head"><span class="ph-ic sm">${icon('plus')}</span><div><h3 id="pkTitle">${t('sp.addItems')}</h3><p>${esc(nameOf(sup))}</p></div>
          <button class="btn-icon" data-pk-close aria-label="${t('close')}">${icon('x')}</button></header>
        <label class="search-field pk-search">${icon('search')}<input type="search" id="pkQ" placeholder="${t('pu.itemSearchPh')}" autocomplete="off"></label>
        <div class="pk-tabs" id="pkTabs" role="tablist"></div>
        <div class="pk-list" id="pkList"></div>
        <footer class="pk-foot"><span class="muted" id="pkCount"></span><span class="tb-spacer"></span>
          <button class="btn btn-ghost" data-pk-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="pkAdd" disabled>${icon('plus')}<span>${t('sp.add')}</span></button></footer>
      </div>`;
    document.body.appendChild(picker);
    drawPickerList();
    void picker.offsetWidth; // start the opening transition from the closed state
    picker.classList.add('open');
    setTimeout(() => { const q = picker && $('#pkQ', picker); q && q.focus(); }, 120);
    $('#pkQ', picker).addEventListener('input', e => { pickQ = e.target.value; pkShown = PK_PAGE; $('#pkList', picker).scrollTop = 0; drawPickerList(); });
    $('#pkQ', picker).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const list = pickerOthers(), q = normQ(pickQ);
      const hit = list.filter(x => [x.item.code, x.item.barcode].some(c => c && normQ(c) === q));
      const one = hit.length === 1 ? hit[0] : list.length === 1 ? list[0] : null;
      if (one) { picked.add(`${one.type}:${one.id}`); e.target.value = ''; pickQ = ''; drawPickerList(); }
    });
    picker.addEventListener('click', async e => {
      if (e.target.closest('[data-pk-close]')) { closePicker(); return; }
      const tab = e.target.closest('[data-pk-type]');
      if (tab) { pkType = tab.dataset.pkType; pkShown = PK_PAGE; $('#pkList', picker).scrollTop = 0; drawPickerList(); return; }
      if (e.target.closest('[data-pk-more]')) { pkShown += PK_PAGE; drawPickerList(); return; }
      if (e.target.closest('[data-pk-clear]')) { picked.clear(); drawPickerList(); return; }
      const p = e.target.closest('.pk-row[data-k]');
      if (p) {
        const k = p.dataset.k, on = !picked.has(k);
        on ? picked.add(k) : picked.delete(k);
        // Toggle in place: the list keeps its scroll position and nothing jumps
        p.classList.toggle('on', on); p.setAttribute('aria-checked', on);
        const add = $('#pkAdd', picker); add.disabled = !picked.size;
        $('span', add).textContent = picked.size ? `${t('sp.add')} (${picked.size})` : t('sp.add');
        $('#pkCount', picker).innerHTML = picked.size ? `${t('sp.selectedN').replace('{n}', picked.size)} · <button type="button" class="link" data-pk-clear>${t('sp.clearSel')}</button>` : '';
        return;
      }
      const add = e.target.closest('#pkAdd');
      if (add && picked.size && !add.classList.contains('loading')) {
        const sid = itemsOpenFor, up = {};
        picked.forEach(k => { const i = k.indexOf(':'), type = k.slice(0, i), id = k.slice(i + 1); Object.assign(up, itemSupplierUpdates(itemPath(type, id), [...supplierIdsOf(itemData(type, id)), sid])); });
        const n = picked.size;
        add.classList.add('loading');
        try { await LIVE.update(up); picked.clear(); closePicker(); toast(`${t('sp.addedItems')} (${n})`); }
        catch (ex) { add.classList.remove('loading'); toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      }
    });
  }
  // Esc closes only the popup, not the drawer under it
  const pickerKeys = e => { if (picker && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } };
  document.addEventListener('keydown', pickerKeys, true);

  function openItems(sid) {
    itemsOpenFor = sid; picked.clear(); pickQ = '';
    const dr = freshDrawer(true);
    openLayer('#drawer');
    drawItemsDrawer();
    dr.onclick = async e => {
      if (!itemsOpenFor) return;
      if (e.target.closest('[data-open-picker]')) { openPicker(); return; }
      const un = e.target.closest('[data-unassign]');
      if (un) {
        const chip = un.closest('.item-chip'), type = chip.dataset.type, id = chip.dataset.id;
        const entry = { type, id, item: itemData(type, id) };
        const up = unassignUpdates(sid, entry);
        chip.classList.add('row-out');
        try {
          await LIVE.update(up);
          toast(`${nameOf(entry.item)} — ${t('sp.removed')}`, { tone: 'danger', action: { label: t('undo'), fn: () => LIVE.update(itemSupplierUpdates(itemPath(type, id), [...supplierIdsOf(itemData(type, id)), sid])) } });
        } catch (ex) { chip.classList.remove('row-out'); toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      }
    };
  }

  async function remove(id) {
    const s = (LIVE.cache.suppliers || {})[id]; if (!s) return;
    const open = Object.values(LIVE.cache.purchases || {}).filter(p => p.supplierId === id && OPEN.includes(puStatus(p))).length;
    if (open) { toast(t('sp.hasOpen').replace('{n}', open), { tone: 'info', ic: 'info' }); return; }
    const mine = supplierItems(id);
    const ok = await confirmDialog({ title: t('sp.deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(s))}</b></div><div><small>${t('c.items')}</small><b>${mine.length}</b></div></div><p class="cf-note">${t('sp.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const up = {};
    mine.forEach(e => { const ids = supplierIdsOf(e.item); if (ids.includes(id)) Object.assign(up, itemSupplierUpdates(itemPath(e.type, e.id), ids.filter(x => x !== id))); });
    up[`suppliers/${id}`] = null;
    try { await LIVE.update(up); toast(t('deleted'), { tone: 'danger' }); } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  let deb;
  $('#spQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-sp]'); if (!b) return;
    if (b.dataset.sp === 'new') { openForm(null); return; }
    const id = b.closest('tr').dataset.id;
    if (b.dataset.sp === 'edit') openForm(id);
    else if (b.dataset.sp === 'items') openItems(id);
    else if (b.dataset.sp === 'delete') remove(id);
    else if (b.dataset.sp === 'purchases') { S.pu = { ...(S.pu || {}), q: '', status: 'all', supplier: id, from: '', to: '', page: 1 }; location.hash = '#/purchases'; }
    else if (b.dataset.sp === 'neworder') { S.pu = { ...(S.pu || {}), supplier: 'all', page: 1 }; S.puOpenNew = id; location.hash = '#/purchases'; }
  });

  const unsub = LIVE.watch(SP_PATHS, draw);
  draw();
  return () => { unsub(); itemsOpenFor = null; closePicker(); document.removeEventListener('keydown', pickerKeys, true); freshDrawer(false); };
};
