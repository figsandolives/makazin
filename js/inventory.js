/* المخازن (inventory) — voucher pages wired to live server data.
   Same paths, counters and stock moves as the old accounting page:
   صرف stockIssue · جرد inventoryCount · تحويلات transfers · مرتجع للمخزن stockReturn · مرتجع توالف scrapReturn.
   Every save sends the voucher and all its stock changes in one update, and an
   edit moves stock only by the difference against what is on the server now. */

['issue', 'stocktake', 'transfers', 'return-warehouse', 'damaged-returns'].forEach(r => LIVE_ROUTES.add(r));

const IV_CAT = ['products', 'stockMaterials', 'production', 'units'];
// Kept as in the old page until the first branch stocktake is done: transfers may exceed stock.
const ALLOW_TRANSFERS_WITHOUT_STOCK = true;

const ivEntries = types => [['product', LIVE.cache.products], ['material', LIVE.cache.stockMaterials]]
  .filter(([ty]) => !types || !types.length || types.includes(ty))
  .flatMap(([type, list]) => Object.entries(list || {}).filter(([, it]) => it && typeof it === 'object').map(([id, item]) => ({ id, type, item })));
const ivText = e => normQ(`${e.item.nameAr || ''} ${e.item.nameEn || ''} ${e.item.name || ''} ${e.item.code || ''} ${e.item.barcode || ''}`);
/* Code/barcode scan: one exact item, or one production batch barcode */
function ivExact(list, raw) {
  const q = normQ(raw); if (!q) return null;
  const exact = list.filter(e => [e.item.code, e.item.barcode].some(c => c && normQ(c) === q));
  if (exact.length === 1) return { e: exact[0], batchKey: null };
  // A batch label: product + its production and expiry dates
  const b = parseBatchCode(raw);
  if (b) { const e = list.find(x => x.type === 'product' && String(x.id) === String(b.pid)); if (e) return { e, batchKey: b.key }; }
  return null;
}
/* Old lines named the production voucher; batches are now named by their dates */
function lineBatchKey(it) {
  if (it.batchKey) return it.batchKey;
  if (!it.productionId || ivType(it) !== 'product') return '';
  const l = productionLines(it.itemId).find(x => x.recId === it.productionId);
  return l ? l.key : '';
}
const batchNote = it => (it.batchKey ? batchLabel(it.batchKey)
  : it.alloc && Object.keys(it.alloc).length ? `${t('iv.bt.auto')}: ${Object.entries(it.alloc).map(([k, q]) => `${keyDates(k).expiryDate || '—'} × ${qtyFmt(q)}`).join('، ')}` : '');
const ivType = it => (itemType(it) === 'product' ? 'product' : 'material');
const ivItems = r => items$(r && r.items).map(it => ({ ...it, itemType: ivType(it), itemId: it.itemId || it.id, qty: Number(it.qty || 0) }));
const stockKey = (type, id, branch) => `${itemPath(type, id)}/stockByBranch/${branch}`;
const ivQtySum = r => ivItems(r).reduce((s, it) => s + it.qty, 0);
const inLast30 = r => (r.createdAt || 0) >= Date.now() - 30 * 86400000;
const typeLabel = type => t(type === 'product' ? 'products' : 'stock-materials');
const branchOpts = (val, { exclude, first = t('iv.chooseBranch') } = {}) =>
  `<option value="">${esc(first)}</option>` + Object.entries(LIVE.cache.branches || {}).filter(([id]) => id !== exclude)
    .map(([id, b]) => `<option value="${esc(id)}" ${val === id ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join('');
const staffName = s => (s ? nameOf(s) || s.name || s.code || '' : '');
const ivStaffLabel = r => staffName((LIVE.cache.productionStaff || {})[r.productionStaffId]) || r.productionStaffName || '-';
const shake = el => el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
const actBtn = (k, attr, ic, label, cls = '') => `<button class="btn-icon sm ${cls}" data-${attr}="${k}" aria-label="${label}" data-tip="${label}" data-tip-always>${icon(ic)}</button>`;
const sumByPath = list => { const m = {}; list.forEach(([p, q]) => { m[p] = (m[p] || 0) + q; }); return m; };
function ivEmpty(cols, filteredView, ic, none, noneSub) {
  return `<tr class="empty"><td colspan="${cols}"><div class="empty-state">${icon(filteredView ? 'search' : ic)}<b>${filteredView ? t('emptyTitle') : none}</b><small>${filteredView ? t('emptySub') : noneSub}</small></div></td></tr>`;
}

/* =====================================================================
   Shared voucher page: list + form drawer + details + print + delete.
   cfg.moves(rec) gives the stock change a saved voucher made ({path: delta});
   a stocktake overrides that with cfg.stock (it sets balances instead).
   ===================================================================== */
function voucherPage(view, cfg) {
  const k = key => t(`iv.${cfg.p}.${key}`);
  const st = (S[`iv_${cfg.p}`] ||= { q: '', page: 1, per: 10, ...(cfg.state || {}) });
  const PATHS = [cfg.path, 'branches', ...(cfg.watch || [])];
  let first = true, saving = false;

  view.innerHTML = `
    ${pageHeader(cfg.route, `<button class="btn btn-primary" data-v="new">${icon('plus')}<span>${k('new')}</span></button>`, k('sub'))}
    <section class="kpis" id="vK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="vQ" placeholder="${k('searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        ${cfg.filterHtml ? cfg.filterHtml(st) : ''}<span class="tb-spacer"></span>${perHtml(st)}
      </div>
      <div class="table-wrap"><table class="dt iv-table">
        <thead><tr>${cfg.cols.map(c => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}<th class="act-col"></th></tr></thead>
        <tbody id="vBody"></tbody>
      </table></div>
      <footer class="pager" id="vPager"></footer>
    </section>`;

  const all = () => Object.entries(LIVE.cache[cfg.path] || {}).filter(([, r]) => r && typeof r === 'object').map(([id, r]) => ({ id, r, items: ivItems(r) }))
    .sort((a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0));
  const filtered = rows => {
    const q = normQ(st.q);
    return rows.filter(x => (!cfg.filterTest || cfg.filterTest(x.r, st))
      && (!q || normQ([x.r[cfg.numKey], x.r.storekeeperName, cfg.searchText(x.r), ...x.items.map(i => `${i.name || ''} ${i.code || ''}`)].join(' ')).includes(q)));
  };
  const numOf = r => (r[cfg.numKey] ?? '-');

  function draw() {
    const body = $('#vBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, cfg.cols.length + 1)); $('#vK', view).innerHTML = skeletonKpis(); return; }
    const rows = all();
    setKpis($('#vK', view), cfg.kpis(rows).join(''), first);
    cfg.drawFilters && cfg.drawFilters(view, st);
    const list = filtered(rows);
    setHtml($('#vPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    const isFiltered = !!(st.q || (cfg.isFiltered && cfg.isFiltered(st)));
    setHtml(body, slice.length ? slice.map((x, i) => `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        ${cfg.cols.map(c => `<td data-label="${c.h}" class="${c.cls || ''}">${c.cell(x.r, x)}</td>`).join('')}
        <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
          ${actBtn('view', 'v', 'eye', t('view'))}${actBtn('print', 'v', 'printer', t('print'))}${actBtn('edit', 'v', 'pencil', t('edit'))}${actBtn('delete', 'v', 'trash', t('delete'), 'danger')}
        </div></td></tr>`).join('')
      : ivEmpty(cfg.cols.length + 1, isFiltered, cfg.ic, k('none'), k('noneSub')));
    first = false;
  }

  /* ---------- form ---------- */
  function openForm(rec, pre) {
    if (!afterCatalog(IV_CAT, () => openForm(rec, pre))) return;
    const main = mainBranch();
    if (cfg.needsMain && !main) { toast(t('sr.noMain'), { tone: 'danger', ic: 'alert' }); return; }
    const r = rec ? rec.r : null;
    // `pre` = a new voucher started from another page (a batch in production tracking)
    const d = { editingId: rec ? rec.id : null, items: r ? ivItems(r).map(it => ({ ...it, batchKey: lineBatchKey(it) || null })) : pre ? pre.items.map(x => ({ ...x })) : [], q: '', types: [],
      ...(pre ? { ...cfg.init({ fromBranchId: pre.branch, branchId: pre.branch }, main), ...(cfg.route === 'transfers' ? { to: '' } : {}) } : cfg.init(r, main)) };
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(rec ? 'pencil' : cfg.ic)}</span><div><h2 id="drawerTitle">${rec ? `${t('edit')} ${k('voucher')} #${esc(numOf(r))}` : k('new')}</h2><p>${k('formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body pu-form">
        <div class="form-grid" id="fFields">
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(r ? r.storekeeperName || '-' : me().name)}" readonly></div>
          ${cfg.fields(d)}
        </div>
        <section class="picker">
          <div class="picker-head"><b>${t('iv.addItems')}</b>
            ${cfg.pickTypes === false ? '' : `<div class="chips iv-types">${['product', 'material'].map(ty => `<button type="button" class="chip" data-ty="${ty}">${typeLabel(ty)}</button>`).join('')}</div>`}
            <label class="search-field">${icon('barcode')}<input type="search" id="fQ" placeholder="${t('pu.itemSearchPh')}" autocomplete="off"></label></div>
          <div class="picker-list" id="fPick"></div>
        </section>
        <section class="draft">
          <div class="draft-head"><b>${t('c.items')}</b><span class="muted" id="fCount"></span></div>
          <div id="fItems"></div>
          <small class="err" id="fItemsErr"></small>
        </section>
      </div>
      <footer class="dr-foot iv-foot"><div class="dr-total"><small>${t('iv.totalQty')}</small><b id="fTotal">0</b></div><span class="tb-spacer"></span>
        ${rec ? '' : `<label class="check-line"><input type="checkbox" id="fPrint"> ${t('sr.printAfter')}</label>`}
        <button class="btn btn-ghost" data-close>${t('cancel')}</button>
        <button class="btn btn-primary" id="fSave">${icon('check')}<span>${rec ? t('save') : k('submit')}</span></button></footer>`;
    openLayer('#drawer');

    const serverRec = () => (d.editingId ? (LIVE.cache[cfg.path] || {})[d.editingId] : null);
    // Stock as if this voucher had not been saved yet: on-hand minus what it already moved there.
    const before = () => (serverRec() && cfg.moves ? cfg.moves(serverRec()) : {});
    const branch = () => cfg.stockBranch(d);
    const available = (type, id) => { const b = branch(); return b ? stockAt(itemData(type, id), b) - (before()[stockKey(type, id, b)] || 0) : 0; };
    const draftQty = (type, id) => d.items.filter(x => x.itemType === type && String(x.itemId) === String(id)).reduce((s, x) => s + Number(x.qty || 0), 0);
    const blocks = () => cfg.mode === 'deduct' && !(cfg.allowOver && cfg.allowOver(d));
    const isOver = (type, id) => cfg.mode === 'deduct' && !!itemData(type, id) && draftQty(type, id) > available(type, id) + 1e-9;
    const batchesHere = id => (branch() ? batchView(id, branch(), before()).list : []);
    const batchAvail = (id, key) => { const x = batchesHere(id).find(b => b.key === key); return x ? x.qty : 0; };
    const batchDraft = (id, key) => d.items.filter(x => x.itemType === 'product' && String(x.itemId) === String(id) && x.batchKey === key).reduce((s, x) => s + Number(x.qty || 0), 0);
    const overBatch = it => cfg.mode === 'deduct' && blocks() && it.itemType === 'product' && it.batchKey && batchDraft(it.itemId, it.batchKey) > batchAvail(it.itemId, it.batchKey) + 1e-9;
    const batchSelect = it => {
      if (it.itemType !== 'product' || !branch()) return '';
      const here = batchesHere(it.itemId);
      const keys = cfg.mode === 'set' ? knownBatchKeys(it.itemId) : here.map(b => b.key);
      if (it.batchKey && !keys.includes(it.batchKey)) keys.unshift(it.batchKey);
      if (!keys.length) return '';
      const opt = key => { const b = here.find(x => x.key === key); return `<option value="${key}" ${it.batchKey === key ? 'selected' : ''}>${esc(batchLabel(key))}${cfg.mode === 'set' ? '' : ` · ${t('sr.available')} ${qtyFmt(b ? b.qty : 0)}`}${batchState(key) === 'expired' ? ` · ${t('iv.bt.s.expired')}` : ''}</option>`; };
      return `<div class="select mini bt-sel">${icon('chevDown')}<select data-f="batch" aria-label="${t('pu.batch')}"><option value="">${t(cfg.mode === 'set' ? 'iv.bt.loose' : 'iv.bt.auto')}</option>${keys.map(opt).join('')}</select></div>`;
    };

    /* Storage location of a line where the main branch takes or receives it ('out' / 'in') */
    const locMode = () => (cfg.locMode && mainBranch() ? cfg.locMode(d) : null);
    // A count of one location of the main branch compares with what that location holds
    const countLoc = () => (cfg.locCount ? cfg.locCount(d) : null);
    const nowQty = (type, id) => (countLoc() ? locView(type, id, before()).locs[countLoc()] || 0 : available(type, id));
    const locHere = (it, loc) => (locView(it.itemType, it.itemId, before()).locs[loc] || 0);
    const locDraft = (it, loc) => d.items.filter(x => x.itemType === it.itemType && String(x.itemId) === String(it.itemId) && x.locId === loc).reduce((s, x) => s + Number(x.qty || 0), 0);
    const overLoc = it => locMode() === 'out' && blocks() && it.locId && locDraft(it, it.locId) > locHere(it, it.locId) + 1e-9;
    // Only an item kept in several places asks which one; the others use their place by themselves
    const locSelect = it => (locMode() && multiLoc(it.itemType, it.itemId, mainBranch()) ? locPick(it.itemType, it.itemId, locMode(), it.locId, before()) : '');

    const lineRow = (it, idx) => {
      const exists = !!itemData(it.itemType, it.itemId), b = branch();
      const over = isOver(it.itemType, it.itemId);
      const stockTxt = !exists ? `<small class="neg">${t('pu.itemGone')}</small>`
        : !b ? '' : cfg.mode === 'set' ? `<small class="muted">${t(countLoc() ? 'sl.inLocNow' : 'iv.currentStock')}: ${qtyFmt(nowQty(it.itemType, it.itemId))}</small>`
        : `<small class="${over && blocks() ? 'neg' : over ? 'warn' : 'muted'}">${t('sr.available')}: ${qtyFmt(available(it.itemType, it.itemId))}${over ? ` — ${t('sr.overStock')}` : ''}</small>`;
      const ob = overBatch(it), ol = overLoc(it);
      return `<div class="line iv-line${(over && blocks()) || ob || ol ? ' over' : ''}" data-i="${idx}">
        <div class="line-name"><b>${esc(itemLabel(it))}</b><small class="muted">${typeLabel(it.itemType)}</small>${stockTxt}
          ${batchSelect(it)}${ob ? `<small class="neg">${t('iv.bt.overBatch')}: ${qtyFmt(batchAvail(it.itemId, it.batchKey))}</small>` : ''}
          ${locSelect(it)}${ol ? `<small class="neg">${t('sl.overLoc')}: ${qtyFmt(locHere(it, it.locId))}</small>` : ''}</div>
        <label class="line-in"><small>${cfg.mode === 'set' ? t('iv.counted') : t('c.qty')}</small><input type="number" data-f="qty" min="0" step="any" inputmode="decimal" value="${it.qty === '' || it.qty == null ? '' : it.qty}"></label>
        <button class="btn-icon sm danger" data-f="del" aria-label="${t('delete')}">${icon('trash')}</button>
      </div>`;
    };
    const updateTotal = () => { $('#fTotal', dr).textContent = qtyFmt(d.items.reduce((s, it) => s + Number(it.qty || 0), 0)); };
    const drawItems = flashIdx => {
      $('#fItems', dr).innerHTML = d.items.length ? d.items.map(lineRow).join('') : `<div class="empty-state sm">${icon(cfg.ic)}<b>${t('pu.noItems')}</b><small>${cfg.needBranchFirst && !branch() ? t('iv.pickBranchFirst') : t('iv.noItemsSub')}</small></div>`;
      $('#fCount', dr).textContent = d.items.length ? `${d.items.length} ${t('pu.itemsWord')}` : '';
      if (flashIdx != null) { const el = $(`.line[data-i="${flashIdx}"]`, dr); el && el.classList.add('flash-in'); }
      updateTotal();
    };
    const pool = () => { const list = ivEntries(d.types); return cfg.pickFilter ? list.filter(e => cfg.pickFilter(e, d)) : list; };
    /* Counting a product kept in several dates: pick the dates first, each becomes its own line */
    let chooser = null;
    const LOOSE = '__loose';
    const countKeys = id => { const here = batchesHere(id); return knownBatchKeys(id).filter(k => (here.find(b => b.key === k) || {}).qty > 0 || batchState(k) !== 'expired'); };
    const drawChooser = box => {
      const item = itemData('product', chooser.id), here = batchesHere(chooser.id);
      const inDraft = k => d.items.some(x => x.itemType === 'product' && String(x.itemId) === String(chooser.id) && (x.batchKey || LOOSE) === k);
      const chip = (k, label, sub) => { const done = inDraft(k), on = chooser.sel.has(k); return `<button type="button" class="chip bt-chip${on ? ' on' : ''}${done ? ' done' : ''}" data-bk="${esc(k)}" ${done ? 'disabled' : ''} aria-pressed="${on}">${icon(done || on ? 'check' : 'plus')}<span><b>${esc(label)}</b><small>${esc(sub)}</small></span></button>`; };
      const keys = countKeys(chooser.id);
      box.innerHTML = `<div class="bt-choose"><div class="bt-ch-head"><b>${esc(nameOf(item) || '-')}</b><small>${t('iv.bt.chooseDates')}</small></div>
        <div class="bt-chips">${keys.map(k => { const x = keyDates(k), b = here.find(y => y.key === k); return chip(k, `${t('iv.expiry')} ${x.expiryDate || '—'}`, `${t('iv.prodDate')} ${x.productionDate || '—'} · ${t('iv.currentStock')} ${qtyFmt(b ? b.qty : 0)}${batchState(k) === 'expired' ? ` · ${t('iv.bt.s.expired')}` : ''}`); }).join('')}
          ${chip(LOOSE, t('iv.bt.loose'), t('iv.bt.looseSub'))}</div>
        <div class="bt-ch-foot"><button type="button" class="btn btn-ghost" data-bt="back">${t('pt.back')}</button><span class="tb-spacer"></span>
          <button type="button" class="btn btn-primary" data-bt="add" ${chooser.sel.size ? '' : 'disabled'}>${icon('plus')}<span>${t('iv.bt.addDates')}</span>${chooser.sel.size ? `<b class="sel-n">${chooser.sel.size}</b>` : ''}</button></div></div>`;
    };
    const drawPicker = () => {
      $$('.iv-types .chip', dr).forEach(c => c.classList.toggle('on', d.types.includes(c.dataset.ty)));
      const box = $('#fPick', dr), q = normQ(d.q);
      if (chooser) { drawChooser(box); return; }
      if (cfg.needBranchFirst && !branch()) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t('iv.pickBranchFirst')}</p>`; return; }
      if (!q && !cfg.pickEmptyShows) { box.innerHTML = `<p class="muted pick-hint">${icon('search')}${t('iv.typeToSearch')}</p>`; return; }
      const list = pool().filter(e => !q || ivText(e).includes(q)).sort((a, b) => nameOf(a.item).localeCompare(nameOf(b.item)));
      if (!list.length) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t('noResults')}</p>`; return; }
      const b = branch();
      box.innerHTML = list.slice(0, 60).map(e => {
        const inDraft = d.items.some(x => x.itemType === e.type && String(x.itemId) === String(e.id));
        const avail = b ? (cfg.mode === 'set' ? nowQty(e.type, e.id) : available(e.type, e.id)) : null;
        return `<button type="button" class="pick${inDraft ? ' added' : ''}${blocks() && avail != null && avail <= 0 ? ' empty' : ''}" data-type="${e.type}" data-id="${esc(e.id)}">
          <span class="pick-ic">${icon(e.type === 'product' ? 'package' : 'box')}</span>
          <span class="pick-txt"><b>${esc(nameOf(e.item))}</b><small>${e.item.code ? `<span class="mono">${esc(e.item.code)}</span> · ` : ''}${esc(unitName(e.item.unitId) || '-')}${avail != null ? ` · ${blocks() && avail <= 0 ? `<span class="neg">${t('sr.noStock')}</span>` : `${t(cfg.mode === 'set' ? (countLoc() ? 'sl.inLocNow' : 'iv.currentStock') : 'sr.available')} ${qtyFmt(avail)}`}` : ''}</small></span>
          <span class="pick-add">${icon(inDraft ? 'check' : 'plus')}</span></button>`;
      }).join('') + (list.length > 60 ? `<p class="muted pick-hint">${t('pu.refine')}</p>` : '');
    };
    const addEntry = (type, id, batchKey, fromChooser) => {
      const item = itemData(type, id); if (!item) return;
      if (cfg.needBranchFirst && !branch()) { toast(t('iv.pickBranchFirst'), { tone: 'info', ic: 'info' }); return; }
      if (cfg.mode === 'set' && type === 'product' && !batchKey && !fromChooser && countKeys(id).length > 1) { chooser = { id, sel: new Set() }; drawPicker(); return; }
      // Without a scanned batch the line takes the first-expiring batches when saved
      const key = type === 'product' && batchKey ? batchKey : null;
      if (key && cfg.mode === 'deduct' && blocks() && batchAvail(id, key) - batchDraft(id, key) <= 1e-9) { toast(t('iv.bt.noneLeft').replace('{batch}', batchLabel(key)), { tone: 'info', ic: 'info' }); return; }
      let idx = d.items.findIndex(x => x.itemType === type && String(x.itemId) === String(id) && (x.batchKey || null) === key);
      let step = 1;
      if (cfg.mode === 'deduct' && blocks()) {
        const left = available(type, id) - draftQty(type, id);
        if (left <= 1e-9) { toast(t('sr.noStockFor').replace('{name}', nameOf(item)), { tone: 'info', ic: 'info' }); return; }
        step = Math.min(1, left);
      }
      if (idx >= 0) {
        if (cfg.mode === 'set') { const inp = $(`.line[data-i="${idx}"] [data-f="qty"]`, dr); inp && inp.focus(); return; }
        d.items[idx].qty = Number(d.items[idx].qty || 0) + step;
      } else {
        d.items.push({ itemId: id, itemType: type, name: nameOf(item) || arName(item), qty: cfg.mode === 'set' ? '' : step, unitId: item.unitId || null, unitName: unitName(item.unitId) || null, batchKey: key });
        idx = d.items.length - 1;
      }
      $('#fItemsErr', dr).textContent = '';
      drawItems(idx); drawPicker();
      if (cfg.mode === 'set') setTimeout(() => { const inp = $(`.line[data-i="${idx}"] [data-f="qty"]`, dr); inp && inp.focus(); }, 60);
    };
    const redraw = () => { drawItems(); drawPicker(); };
    drawItems(); drawPicker();
    cfg.bind(dr, d, redraw);

    $$('.iv-types .chip', dr).forEach(c => c.addEventListener('click', () => {
      const ty = c.dataset.ty; d.types = d.types.includes(ty) ? d.types.filter(x => x !== ty) : [...d.types, ty]; drawPicker();
    }));
    $('#fQ', dr).addEventListener('input', e => { d.q = e.target.value; chooser = null; drawPicker(); });
    $('#fQ', dr).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const list = pool(), hit = ivExact(list, d.q);
      const byName = hit ? null : list.filter(x => ivText(x).includes(normQ(d.q)));
      const pick = hit || (byName && byName.length === 1 ? { e: byName[0], batchKey: null } : null);
      if (pick) { addEntry(pick.e.type, pick.e.id, pick.batchKey); e.target.value = ''; d.q = ''; drawPicker(); }
      else if (normQ(d.q)) toast(t('pu.noMatch'), { tone: 'info', ic: 'search' });
    });
    $('#fPick', dr).addEventListener('click', e => {
      const bk = e.target.closest('[data-bk]');
      if (bk && chooser) { const k = bk.dataset.bk; chooser.sel.has(k) ? chooser.sel.delete(k) : chooser.sel.add(k); drawPicker(); return; }
      const bt = e.target.closest('[data-bt]');
      if (bt && chooser) {
        const { id, sel } = chooser; chooser = null;
        if (bt.dataset.bt === 'add') [...sel].forEach(k => addEntry('product', id, k === LOOSE ? null : k, true));
        drawPicker(); return;
      }
      const b = e.target.closest('.pick'); if (b) addEntry(b.dataset.type, b.dataset.id);
    });
    $('#fItems', dr).addEventListener('input', e => {
      const line = e.target.closest('.line'); if (!line || e.target.dataset.f !== 'qty') return;
      const it = d.items[+line.dataset.i];
      it.qty = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
      updateTotal();
    });
    $('#fItems', dr).addEventListener('change', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i];
      if (e.target.dataset.f === 'batch') it.batchKey = e.target.value || null;
      if (e.target.dataset.f === 'loc') it.locId = e.target.value || null;
      drawItems();
    });
    $('#fItems', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-f="del"]'); if (!b) return;
      const line = b.closest('.line');
      line.classList.add('row-out');
      setTimeout(() => { d.items.splice(+line.dataset.i, 1); drawItems(); drawPicker(); }, 220);
    });

    $('#fSave', dr).addEventListener('click', async () => {
      if (saving) return;
      const errs = $('#fItemsErr', dr); errs.textContent = '';
      $$('.field.invalid', dr).forEach(f => { f.classList.remove('invalid'); const er = $('.err', f); if (er) er.textContent = ''; });
      let bad = false;
      (cfg.validate(d) || []).forEach(([sel, msg]) => { const f = $(sel, dr) && $(sel, dr).closest('.field'); if (f) { f.classList.add('invalid'); $('.err', f).textContent = msg; } bad = true; });
      if (!d.items.length) { errs.textContent = t('pu.needItems'); bad = true; }
      else if (d.items.some(it => (cfg.mode === 'set' ? it.qty === '' || it.qty == null || !(Number(it.qty) >= 0) : !(Number(it.qty) > 0)))) { errs.textContent = t(cfg.mode === 'set' ? 'iv.needCounted' : 'pu.needQty'); bad = true; }
      else if (blocks()) {
        const over = d.items.find(it => isOver(it.itemType, it.itemId) || overBatch(it) || overLoc(it));
        if (over) { errs.textContent = t('sr.overStockFor').replace('{name}', over.name); bad = true; drawItems(); }
      }
      if (!bad && locMode()) {
        const name = needLocName(d.items, mainBranch(), l => l.name);
        if (name) { errs.textContent = t('sl.needLoc').replace('{name}', name); bad = true; }
      }
      if (bad) { shake(dr); return; }

      // Lines that name no batch: where the goods go on to another branch, split them now over the
      // first-expiring batches, so the receiving branch gets the same batches.
      const allocAt = cfg.allocFrom ? cfg.allocFrom(d) : null, taken = { ...before() };
      const items = d.items.map(it => {
        const key = it.itemType === 'product' ? it.batchKey || null : null;
        let alloc = null;
        if (allocAt && it.itemType === 'product' && !key && itemData('product', it.itemId)) {
          alloc = fefoAlloc(it.itemId, allocAt, Number(it.qty), taken).alloc;
          Object.entries(alloc).forEach(([k2, q]) => { const pth = batchPath(it.itemId, k2, allocAt); taken[pth] = (taken[pth] || 0) + q; });
          taken[stockKey('product', it.itemId, allocAt)] = (taken[stockKey('product', it.itemId, allocAt)] || 0) + Object.values(alloc).reduce((a, q) => a + q, 0);
          if (!Object.keys(alloc).length) alloc = null;
        }
        const dates = key ? keyDates(key) : {};
        return clean({ itemId: it.itemId, itemType: it.itemType, name: it.name, qty: Number(it.qty), unitId: it.unitId || null, unitName: it.unitName || null,
          batchKey: key, productionDate: dates.productionDate || null, expiryDate: dates.expiryDate || null, alloc, locId: locMode() && multiLoc(it.itemType, it.itemId, mainBranch()) ? it.locId || null : null });
      });
      const wantPrint = !!($('#fPrint', dr) || {}).checked;
      const btn = $('#fSave', dr); saving = true; btn.classList.add('loading');
      try {
        const cur = serverRec();
        if (d.editingId && !cur) { toast(t('sr.goneElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
        const base = cfg.build(d, cur);
        const up = {};
        let printRec, num;
        if (d.editingId) {
          const next = { ...cur, ...base, items };
          Object.assign(up, cfg.stock ? cfg.stock(cur, next) : diffMoves(cfg.moves(cur), cfg.moves(next)));
          const path = `${cfg.path}/${d.editingId}`;
          Object.entries({ ...base, items: next.items, ...('batchBefore' in next ? { batchBefore: next.batchBefore } : {}) }).forEach(([key, v]) => { up[`${path}/${key}`] = v; });
          num = cur[cfg.numKey];
        } else {
          num = await LIVE.counter(cfg.counter);
          const key = LIVE.newKey(cfg.path);
          printRec = { [cfg.numKey]: num, createdAt: Date.now(), storekeeperId: me().id || null, storekeeperName: me().name || null, ...base, items };
          if (cfg.stock) Object.assign(up, cfg.stock(null, printRec));
          else Object.entries(cfg.moves(printRec)).forEach(([p, q]) => { if (Math.abs(q) > 1e-9) up[p] = LIVE.increment(q); });
          up[`${cfg.path}/${key}`] = clean({ ...printRec, items: printRec.items, createdAt: LIVE.now() });
        }
        await LIVE.update(withBatchSeed(up));
        toast(`${k('voucher')} #${num ?? ''} — ${t(d.editingId ? 'saved' : 'iv.savedStock')}`);
        closeLayers();
        if (printRec && wantPrint) printVoucher(printRec);
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
    setTimeout(() => $('#fQ', dr).focus(), 350);
  }

  /* ---------- details ---------- */
  const metaOf = r => [...cfg.meta(r), [t('pm.storekeeper'), r.storekeeperName || '-'], [t('c.date'), fmtDateTime(r.createdAt)]];
  function details(rec) {
    const r = rec.r, its = ivItems(r);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(cfg.ic)}</span><div><h2 id="drawerTitle">${k('voucher')} #${esc(numOf(r))}</h2><p>${esc(cfg.subtitle(r))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">${metaOf(r).map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th>${t('c.type')}</th><th class="end">${cfg.mode === 'set' ? t('iv.counted') : t('c.qty')}</th>${cfg.mode === 'set' ? `<th class="end">${t('iv.before')}</th>` : ''}</tr></thead>
          <tbody>${its.map(it => `<tr><td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(itemLabel(it))}</b>${batchNote(it) ? `<small>${esc(batchNote(it))}</small>` : it.productionDate ? `<small>${t('iv.prodDate')}: ${esc(it.productionDate)}</small>` : ''}</span></td>
            <td data-label="${t('c.type')}">${typeLabel(it.itemType)}</td><td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.qty)}</td>
            ${cfg.mode === 'set' ? `<td data-label="${t('iv.before')}" class="end num">${it.previousQty == null ? '—' : qtyFmt(it.previousQty)}</td>` : ''}</tr>`).join('')}</tbody></table></div>
      </div>
      <footer class="dr-foot iv-foot"><button class="btn btn-ghost" data-d="print">${icon('printer')}<span>${t('print')}</span></button><span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-d="edit">${icon('pencil')}<span>${t('edit')}</span></button></footer>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'print') printVoucher(r);
      else { dr.onclick = null; openForm(rec); }
    };
  }

  function printVoucher(r) {
    const its = ivItems(r);
    printDoc(`${k('voucher')} #${numOf(r)}`, [...metaOf(r), [t('c.items'), String(its.length)]],
      [t('c.name'), t('c.qty')], its.map(it => [`${itemLabel(it)}${batchNote(it) ? ` — ${batchNote(it)}` : ''}`, `${qtyFmt(it.qty)}${liveUnitName(it) ? ` ${liveUnitName(it)}` : ''}`]));
  }

  async function remove(rec) {
    const blocked = cfg.canDelete && cfg.canDelete(rec);
    if (blocked) { toast(blocked, { tone: 'danger', ic: 'alert' }); return; }
    const r = rec.r;
    const ok = await confirmDialog({ title: k('deleteQ'), body: `<div class="cf-sum"><div><small>${k('number')}</small><b>#${esc(numOf(r))}</b></div><div><small>${t('c.items')}</small><b>${ivItems(r).length}</b></div></div><p class="cf-note">${k('deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const cur = (LIVE.cache[cfg.path] || {})[rec.id];
    if (!cur) return;
    let up = { [`${cfg.path}/${rec.id}`]: null };
    if (cfg.unstock) {
      const res = cfg.unstock(cur);
      if (typeof res === 'string') { toast(res, { tone: 'danger', ic: 'alert' }); return; }
      Object.assign(up, res);
    } else Object.entries(cfg.moves(cur)).forEach(([p, q]) => { if (Math.abs(q) > 1e-9) up[p] = LIVE.increment(-q); });
    try { await LIVE.update(withBatchSeed(up)); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  let deb;
  $('#vQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  cfg.bindFilters && cfg.bindFilters(view, st, () => { st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-v]'); if (!b) return;
    if (b.dataset.v === 'new') { openForm(null); return; }
    const id = b.closest('tr').dataset.id, r = (LIVE.cache[cfg.path] || {})[id]; if (!r) return;
    const rec = { id, r };
    ({ view: details, print: x => printVoucher(x.r), edit: openForm, delete: remove })[b.dataset.v](rec);
  });

  /* ---------- card pages ---------- */
  const lineQty = v => fmtNum(v, 3);
  function drillCfg(kind) {
    const rows = all().filter(x => inLast30(x.r)), per = t('kd.last30');
    const [base, arg] = kind.split(':');
    const lineUnit = it => (it.unitId && unitName(it.unitId)) || it.unitName || it.unit || '';
    const itemRow = it => `<span class="cell-2"><b>${esc(liveItemName(it))}</b><small class="muted">${esc(typeLabel(it.itemType))}${it.code ? ` · ${esc(it.code)}` : ''}</small></span>`;
    if (base === 'v30') {
      const [f, v] = (arg || '').split('=');
      const list = f ? rows.filter(x => String(x.r[f] || (f === 'issueType' ? 'order' : '')) === v) : rows;
      const cols = cfg.cols.map(c => ({ h: c.h, end: /\bend\b/.test(c.cls || '') }));
      return { title: '', sub: `${t(cfg.route)} · ${per}`, ic: cfg.ic, file: `${cfg.route}-${base}.xlsx`,
        onRow: id => { const r = (LIVE.cache[cfg.path] || {})[id]; if (r) details({ id, r }); },
        chips: [[t('kd.vouchers'), fmtNum(list.length)], [t('kd.lines'), fmtNum(list.reduce((s2, x) => s2 + x.items.length, 0))], [t('iv.totalQty'), lineQty(list.reduce((s2, x) => s2 + ivQtySum(x.r), 0))]],
        cols, rows: list.map(x => ({ id: x.id, text: [numOf(x.r), x.r.storekeeperName, cfg.searchText(x.r), ...x.items.map(i => liveItemName(i))].join(' '),
          cells: cfg.cols.map(c => c.cell(x.r, x)),
          x: Object.fromEntries(cfg.cols.map(c => [String(c.h).replace(/<[^>]+>/g, ''), String(c.cell(x.r, x)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()])) })) };
    }
    if (base === 'qty30') {
      const m = new Map();
      rows.forEach(x => x.items.forEach(it => { const key = `${it.itemType}:${it.itemId || liveItemName(it)}`; const g = m.get(key) || { it, qty: 0, n: 0, v: new Set() }; g.qty += it.qty; g.n++; g.v.add(x.id); m.set(key, g); }));
      const list = [...m.values()].sort((a, b) => b.qty - a.qty);
      return { title: `${t('iv.qty30')}`, sub: `${t(cfg.route)} · ${t('kd.byItem')}`, ic: 'box', file: `${cfg.route}-items-30d.xlsx`,
        chips: [[t('kd.itemsN'), fmtNum(list.length)], [t('iv.totalQty'), lineQty(list.reduce((s2, g) => s2 + g.qty, 0))], [t('kd.vouchers'), fmtNum(rows.length)]],
        cols: [{ h: '#' }, { h: t('kd.item') }, { h: t('kd.unit') }, { h: t('kd.vouchers'), end: 1 }, { h: t('iv.totalQty'), end: 1 }],
        rows: list.map((g, i) => ({ id: null, text: `${liveItemName(g.it)} ${g.it.code || ''}`,
          cells: [`<span class="muted">${i + 1}</span>`, itemRow(g.it), esc(lineUnit(g.it) || '—'), fmtNum(g.v.size), `<b>${lineQty(g.qty)}</b>`],
          x: { [t('kd.item')]: liveItemName(g.it), [t('kd.type')]: typeLabel(g.it.itemType), [t('kd.unit')]: lineUnit(g.it), [t('kd.vouchers')]: g.v.size, [t('iv.totalQty')]: +g.qty.toFixed(3) } })) };
    }
    if (base === 'br30') {
      const items = kdGroup(rows, x => x.r[arg] || '-', x => branchLabel(x.r[arg]) || '-', x => ivQtySum(x.r));
      return kdBreakdown({ title: '', sub: `${t(cfg.route)} · ${per}`, ic: 'building', file: `${cfg.route}-branches-30d.xlsx`,
        groupH: t('kd.branch'), countH: t('kd.vouchers'), valueH: t('iv.totalQty'), items, kind: 'num' });
    }
    if (base === 'lines30' || base === 'diff30') {
      const lines = rows.flatMap(x => x.items.map(it => ({ x, it, prev: it.previousQty == null ? null : Number(it.previousQty) })))
        .filter(l => base === 'lines30' || (l.prev !== null && Math.abs(l.prev - l.it.qty) > 1e-9));
      const diff = l => (l.prev === null ? null : l.it.qty - l.prev);
      const dCell = l => { const d = diff(l); return d === null ? '<span class="muted">—</span>' : `<b class="${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}"><bdi dir="ltr">${d > 0 ? '+' : ''}${lineQty(d)}</bdi></b>`; };
      return { title: t(base === 'lines30' ? 'iv.ic.kItems30' : 'iv.ic.kDiff30'), sub: `${t(cfg.route)} · ${per}`, ic: base === 'lines30' ? 'box' : 'alert', file: `${cfg.route}-${base}.xlsx`,
        onRow: id => { const r = (LIVE.cache[cfg.path] || {})[id]; if (r) details({ id, r }); },
        chips: [[t('kd.lines'), fmtNum(lines.length)], [t('kd.vouchers'), fmtNum(new Set(lines.map(l => l.x.id)).size)],
          ...(base === 'diff30' ? [[t('kd.plus'), fmtNum(lines.filter(l => diff(l) > 0).length), 'success'], [t('kd.minus'), fmtNum(lines.filter(l => diff(l) < 0).length), 'danger']] : [])],
        cols: [{ h: k('number') }, { h: t('c.branch') }, { h: t('kd.item') }, { h: t('kd.before'), end: 1 }, { h: t('kd.counted'), end: 1 }, { h: t('kd.diff'), end: 1 }, { h: t('c.date') }],
        rows: lines.map(l => ({ id: l.x.id, text: `${numOf(l.x.r)} ${liveItemName(l.it)} ${branchLabel(l.x.r.branchId)}`,
          cells: [`<b class="mono">#${esc(numOf(l.x.r))}</b>`, esc(branchLabel(l.x.r.branchId) || '-'), itemRow(l.it), l.prev === null ? '—' : lineQty(l.prev), lineQty(l.it.qty), dCell(l), `<span class="date">${fmtDateTime(l.x.r.createdAt)}</span>`],
          x: { [k('number')]: numOf(l.x.r), [t('c.branch')]: branchLabel(l.x.r.branchId) || '', [t('kd.item')]: liveItemName(l.it), [t('kd.before')]: l.prev, [t('kd.counted')]: l.it.qty, [t('kd.diff')]: diff(l), [t('c.date')]: fmtDateTime(l.x.r.createdAt) } })) };
    }
    return null;
  }
  const closeDrill = kpiDrills(view, { paths: [...PATHS, ...IV_CAT], ready: () => LIVE.loaded(PATHS), build: drillCfg });

  const unsub = LIVE.watch([...PATHS, ...IV_CAT], draw);
  draw();
  takeDoc(cfg.route, [...PATHS, ...IV_CAT], id => { const r = (LIVE.cache[cfg.path] || {})[id]; if (r) details({ id, r }); });
  if (IV_PREFILL && IV_PREFILL.route === cfg.route) { const pre = IV_PREFILL; IV_PREFILL = null; LIVE.whenLoaded([...PATHS, ...IV_CAT]).then(() => openForm(null, pre)); }
  return () => { unsub(); closeDrill(); freshDrawer(false); };
}
let IV_PREFILL = null;
/* Open another voucher page with a new voucher for some lines, e.g. a batch to transfer or scrap */
function startVoucher(route, branch, items) { IV_PREFILL = { route, branch, items }; location.hash = `#/${route}`; }
/* {path: delta} before → after, as server increments */
function diffMoves(before, after) {
  const up = {};
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach(p => {
    const diff = (after[p] || 0) - (before[p] || 0);
    if (Math.abs(diff) > 1e-9) up[p] = LIVE.increment(diff);
  });
  return up;
}
/* Every line of a voucher moves its quantity at one branch, with this sign */
const movesAt = (r, branch, sign) => (!branch ? {} : sumByPath(ivItems(r).filter(it => itemData(it.itemType, it.itemId))
  .flatMap(it => [[stockKey(it.itemType, it.itemId, branch), sign * it.qty], ...lineBatchMoves(it, branch, sign), ...lineLocMoves(it, branch, sign)])));
const mergeMoves = (...maps) => { const m = {}; maps.forEach(x => Object.entries(x).forEach(([p, q]) => { m[p] = (m[p] || 0) + q; })); return m; };
/* Card drill keys understood by voucherPage: v30[:field=value] · qty30 · br30:field · lines30 · diff30 */
const kpi30 = (rows, label, ic, tone, drill = 'v30') => kpiCard({ label, value: rows.filter(x => inLast30(x.r)).length, ic, tone, drill });
const kpiQty30 = (rows, label, tone = 'c2') => kpiCard({ label, value: rows.filter(x => inLast30(x.r)).reduce((s, x) => s + ivQtySum(x.r), 0), ic: 'box', tone, drill: 'qty30' });
const kpiBranches30 = (rows, label, field, tone) => kpiCard({ label, value: new Set(rows.filter(x => inLast30(x.r)).map(x => x.r[field]).filter(Boolean)).size, ic: 'building', tone, drill: `br30:${field}` });
const kpiAll = (rows, label) => kpiCard({ label, value: rows.length, ic: 'clipcheck', tone: 'c3' });

/* =====================================================================
   صرف — take-out vouchers (order / production / for use)
   ===================================================================== */
const ISSUE_TYPES = ['order', 'production', 'use'];
// Production and for-use vouchers take stock out now; order vouchers are deducted by the invoice.
const issueDeducts = type => type === 'production' || type === 'use';
const issueEmployees = () => [
  ...Object.entries(LIVE.cache.cashiers || {}).map(([id, c]) => [id, nameOf(c) || c.code || id]),
  ...Object.entries(LIVE.cache.issueEmployees || {}).map(([id, e]) => [`emp:${id}`, nameOf(e) || id])
];
function issueEmployeeName(id) {
  if (!id) return null;
  if (String(id).startsWith('emp:')) { const e = (LIVE.cache.issueEmployees || {})[String(id).slice(4)]; return e ? nameOf(e) || null : null; }
  const c = (LIVE.cache.cashiers || {})[id]; return c ? nameOf(c) || c.code || null : null;
}
const issueEmpLabel = r => issueEmployeeName(r.cashierId) || r.cashierName || (r.productionStaffId || r.productionStaffName ? ivStaffLabel(r) : '') || '-';
const issueEmpRec = id => (!id ? null : String(id).startsWith('emp:') ? (LIVE.cache.issueEmployees || {})[String(id).slice(4)] : (LIVE.cache.cashiers || {})[id]) || null;
const issueTypeLabel = type => t(`iv.is.t.${ISSUE_TYPES.includes(type) ? type : 'order'}`);
const issueLinked = id => Object.values(LIVE.cache.production || {}).some(p => p && p.issueId === id);

/* Issue details as a drawer — also opened from a production voucher */
function issueDetails(r) {
  const its = ivItems(r);
  const dr = freshDrawer(true);
  dr.innerHTML = `
    <header class="dr-head"><span class="ph-ic sm">${icon('out')}</span><div><h2 id="drawerTitle">${t('iv.is.voucher')} #${esc(r.issueNumber ?? '-')}</h2><p>${esc(issueTypeLabel(r.issueType))}</p></div>
      <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
    <div class="dr-body">
      <div class="info-grid three">${issueMeta(r).map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>
      <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th>${t('c.type')}</th><th class="end">${t('c.qty')}</th></tr></thead>
        <tbody>${its.map(it => `<tr><td data-label="${t('c.name')}"><b>${esc(itemLabel(it))}</b></td><td data-label="${t('c.type')}">${typeLabel(it.itemType)}</td><td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.qty)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  openLayer('#drawer');
}
const issueMeta = r => [[t('iv.is.type'), issueTypeLabel(r.issueType)], [t('c.branch'), branchLabel(r.branchId)], [t('iv.is.employee'), issueEmpLabel(r)],
  ...(r.issueType === 'order' || r.invoiceNumber ? [[t('iv.is.invoice'), r.invoiceNumber || '-']] : [])];

PAGES.issue = view => voucherPage(view, {
  p: 'is', route: 'issue', path: 'stockIssue', numKey: 'issueNumber', counter: 'meta/issueCounter', ic: 'out', needsMain: true,
  watch: ['cashiers', 'issueEmployees', 'productionStaff', 'production'], mode: 'deduct', pickEmptyShows: true, state: { type: 'all' },
  filterHtml: st => `<div class="select tb-select">${icon('chevDown')}<select id="vType" aria-label="${t('iv.is.type')}"><option value="all">${t('iv.allTypes')}</option>${ISSUE_TYPES.map(x => `<option value="${x}" ${st.type === x ? 'selected' : ''}>${issueTypeLabel(x)}</option>`).join('')}</select></div>`,
  bindFilters: (view, st, go) => $('#vType', view).addEventListener('change', e => { st.type = e.target.value; go(); }),
  filterTest: (r, st) => st.type === 'all' || r.issueType === st.type,
  isFiltered: st => st.type !== 'all',
  searchText: r => [issueTypeLabel(r.issueType), issueEmpLabel(r), r.cashierName, r.invoiceNumber].join(' '),
  cols: [
    { h: t('iv.is.number'), cell: r => `<b class="mono">#${esc(r.issueNumber ?? '-')}</b>` },
    { h: t('iv.is.type'), cell: r => `<span class="badge tone-${{ order: 'info', production: 'accent', use: 'warning' }[r.issueType] || 'info'}"><i></i>${issueTypeLabel(r.issueType)}</span>` },
    { h: t('c.date'), cell: r => `<span class="cell-2"><span class="date">${fmtDateTime(r.createdAt)}</span>${r.storekeeperName ? `<small>${esc(r.storekeeperName)}</small>` : ''}</span>` },
    { h: t('iv.is.employee'), cell: r => esc(issueEmpLabel(r)) },
    { h: t('iv.is.invoice'), cell: r => (r.invoiceNumber ? `<span class="mono">${esc(r.invoiceNumber)}</span>` : '<span class="muted">—</span>') },
    { h: t('c.items'), cell: (r, x) => `<span class="cell-2 items-cell"><b>${x.items.length} ${t('pu.itemsWord')}</b><small>${esc(x.items.slice(0, 2).map(liveItemName).join('، '))}${x.items.length > 2 ? '…' : ''}</small></span>` }
  ],
  kpis: rows => {
    const r30 = rows.filter(x => inLast30(x.r));
    return [kpiCard({ label: t('iv.is.k30'), value: r30.length, ic: 'out', tone: 'c1', drill: 'v30' }),
      ...ISSUE_TYPES.map((ty, i) => kpiCard({ label: `${issueTypeLabel(ty)} (${t('iv.days30')})`, value: r30.filter(x => (x.r.issueType || 'order') === ty).length, ic: ['receipt', 'factory', 'box'][i], tone: ['c2', 'c4', 'c3'][i], drill: `v30:issueType=${ty}` }))];
  },
  init: (r, main) => ({ type: r ? r.issueType || 'order' : 'order', cashierId: r ? r.cashierId || '' : '', invoiceNumber: r ? r.invoiceNumber || '' : '', branchId: (r && r.branchId) || main }),
  stockBranch: d => d.branchId,
  locMode: d => (issueDeducts(d.type) && d.branchId === mainBranch() ? 'out' : null),
  fields: d => `
    <div class="field"><label for="fType">${t('iv.is.type')}</label><div class="select"><select id="fType">${ISSUE_TYPES.map(x => `<option value="${x}" ${d.type === x ? 'selected' : ''}>${issueTypeLabel(x)}</option>`).join('')}</select>${icon('chevDown')}</div></div>
    <div class="field" data-for="emp"><label for="fEmp">${t('iv.is.employee')} <em>*</em></label>
      <div class="iv-inline"><div class="select"><select id="fEmp"></select>${icon('chevDown')}</div><button type="button" class="btn-icon" id="fEditEmp" aria-label="${t('iv.is.editEmployee')}" data-tip="${t('iv.is.editEmployee')}" data-tip-always>${icon('pencil')}</button><button type="button" class="btn-icon" id="fAddEmp" aria-label="${t('iv.is.addEmployee')}" data-tip="${t('iv.is.addEmployee')}" data-tip-always>${icon('plus')}</button></div><small class="err"></small></div>
    <div class="field" data-for="inv"><label for="fInv">${t('iv.is.invoice')} <em>*</em></label><input id="fInv" value="${esc(d.invoiceNumber)}" autocomplete="off" inputmode="numeric"><small class="err"></small></div>`,
  bind: (dr, d, redraw) => {
    const show = () => { $('[data-for="inv"]', dr).hidden = d.type !== 'order'; $('#fEditEmp', dr).disabled = !issueEmpRec(d.cashierId); };
    const fillEmp = () => { $('#fEmp', dr).innerHTML = `<option value="">${t('iv.choose')}</option>` + issueEmployees().map(([id, n]) => `<option value="${esc(id)}" ${d.cashierId === id ? 'selected' : ''}>${esc(n)}</option>`).join(''); };
    fillEmp(); show();
    $('#fType', dr).addEventListener('change', e => { d.type = e.target.value; show(); redraw(); });
    $('#fEmp', dr).addEventListener('change', e => { d.cashierId = e.target.value; show(); });
    $('#fInv', dr).addEventListener('input', e => { d.invoiceNumber = e.target.value.trim(); });
    // Every person has an Arabic and an English name; the list shows the one for the interface language
    const askNames = (title, cur = {}) => askValue({ title, ok: t('save'), icon: 'user',
      field: `<label for="eAr">${t('it.nameAr')}</label><input id="eAr" dir="rtl" autocomplete="off" value="${esc(cur.nameAr || cur.name || '')}"><label for="eEn" class="iv-lbl2">${t('it.nameEn')}</label><input id="eEn" dir="ltr" autocomplete="off" value="${esc(cur.nameEn || '')}">`,
      read: () => ({ nameAr: $('#eAr').value.trim(), nameEn: $('#eEn').value.trim() }),
      valid: v => (v.nameAr && v.nameEn ? true : t('iv.bothNames')), onOpen: f => $('#eAr', f).focus() });
    $('#fEditEmp', dr).addEventListener('click', async () => {
      const id = d.cashierId, cur = issueEmpRec(id); if (!cur) return;
      const v = await askNames(t('iv.is.editEmployee'), cur);
      if (!v) return;
      const path = String(id).startsWith('emp:') ? `issueEmployees/${String(id).slice(4)}` : `cashiers/${id}`;
      try { await LIVE.update({ [`${path}/nameAr`]: v.nameAr, [`${path}/nameEn`]: v.nameEn }); Object.assign(cur, v); fillEmp(); toast(t('saved')); }
      catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    });
    $('#fAddEmp', dr).addEventListener('click', async () => {
      const v = await askNames(t('iv.is.addEmployee'));
      if (!v) return;
      try {
        const key = LIVE.newKey('issueEmployees');
        await LIVE.update({ [`issueEmployees/${key}`]: { ...v, createdAt: LIVE.now() } });
        LIVE.cache.issueEmployees = { ...(LIVE.cache.issueEmployees || {}), [key]: v };
        d.cashierId = `emp:${key}`; fillEmp(); show(); toast(t('added'));
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    });
  },
  validate: d => [
    ...(!d.cashierId ? [['#fEmp', t('required')]] : []),
    ...(d.type === 'order' && !d.invoiceNumber ? [['#fInv', t('required')]] : [])
  ],
  build: d => ({ issueType: d.type, cashierId: d.cashierId, cashierName: issueEmployeeName(d.cashierId), invoiceNumber: d.type === 'order' ? d.invoiceNumber : null,
    productionStaffId: null, productionStaffName: null, branchId: d.branchId }),
  moves: r => (issueDeducts(r.issueType) ? movesAt(r, r.branchId || mainBranch(), -1) : {}),
  canDelete: rec => (issueLinked(rec.id) ? t('iv.is.linked') : null),
  subtitle: r => issueTypeLabel(r.issueType),
  meta: issueMeta,
  number: 'is.number'
});

/* =====================================================================
   تحويلات — branch to branch transfers
   ===================================================================== */
const routeLabel = (from, to) => t('iv.tr.route').replace('{from}', branchLabel(from)).replace('{to}', branchLabel(to));
PAGES.transfers = view => voucherPage(view, {
  p: 'tr', route: 'transfers', path: 'transfers', numKey: 'transferNumber', counter: 'meta/transferCounter', ic: 'swap', mode: 'deduct', pickEmptyShows: true,
  allowOver: () => ALLOW_TRANSFERS_WITHOUT_STOCK,
  searchText: r => [branchLabel(r.fromBranchId), branchLabel(r.toBranchId), r.receiverName].join(' '),
  cols: [
    { h: t('iv.tr.number'), cell: r => `<span class="cell-2"><b class="mono">#${esc(r.transferNumber ?? '-')}</b><small>${esc(routeLabel(r.fromBranchId || mainBranch(), r.toBranchId))}</small></span>` },
    { h: t('iv.fromBranch'), cell: r => esc(branchLabel(r.fromBranchId || mainBranch())) },
    { h: t('iv.toBranch'), cell: r => esc(branchLabel(r.toBranchId)) },
    { h: t('pm.storekeeper'), cell: r => esc(r.storekeeperName || '-') },
    { h: t('iv.tr.receiver'), cell: r => esc(r.receiverName || '-') },
    { h: t('c.date'), cell: r => `<span class="date">${fmtDateTime(r.createdAt)}</span>` },
    { h: t('c.items'), cell: (r, x) => `<b>${x.items.length}</b>`, cls: 'end' }
  ],
  kpis: rows => [kpi30(rows, t('iv.tr.k30'), 'swap', 'c1'), kpiQty30(rows, t('iv.qty30')), kpiBranches30(rows, t('iv.tr.kBranches'), 'toBranchId', 'c4'), kpiAll(rows, t('iv.kTotal'))],
  init: (r, main) => ({ from: r ? r.fromBranchId || main || '' : main || '', to: r ? r.toBranchId || '' : '', receiver: r ? r.receiverName || '' : '' }),
  stockBranch: d => d.from,
  locMode: d => (d.from === mainBranch() ? 'out' : d.to === mainBranch() ? 'in' : null),
  needBranchFirst: true,
  fields: d => `
    <div class="field"><label for="fRecv">${t('iv.tr.receiver')}</label><input id="fRecv" value="${esc(d.receiver)}" autocomplete="off" dir="auto"></div>
    <div class="field"><label for="fFrom">${t('iv.fromBranch')} <em>*</em></label><div class="select"><select id="fFrom">${branchOpts(d.from)}</select>${icon('chevDown')}</div><small class="err"></small></div>
    <div class="field"><label for="fTo">${t('iv.toBranch')} <em>*</em></label><div class="select"><select id="fTo">${branchOpts(d.to, { exclude: d.from })}</select>${icon('chevDown')}</div><small class="err"></small></div>`,
  bind: (dr, d, redraw) => {
    $('#fRecv', dr).addEventListener('input', e => { d.receiver = e.target.value; });
    $('#fFrom', dr).addEventListener('change', e => {
      d.from = e.target.value;
      if (d.to === d.from) d.to = '';
      $('#fTo', dr).innerHTML = branchOpts(d.to, { exclude: d.from });
      redraw();
    });
    $('#fTo', dr).addEventListener('change', e => { d.to = e.target.value; redraw(); });
  },
  validate: d => [...(!d.from ? [['#fFrom', t('required')]] : []), ...(!d.to ? [['#fTo', t('required')]] : d.to === d.from ? [['#fTo', t('iv.tr.same')]] : [])],
  build: d => ({ fromBranchId: d.from, toBranchId: d.to, receiverName: d.receiver || '' }),
  allocFrom: d => d.from,
  moves: r => mergeMoves(movesAt(r, r.fromBranchId || mainBranch(), -1), movesAt(r, r.toBranchId, 1)),
  subtitle: r => routeLabel(r.fromBranchId || mainBranch(), r.toBranchId),
  meta: r => [[t('c.branch'), routeLabel(r.fromBranchId || mainBranch(), r.toBranchId)], [t('iv.tr.receiver'), r.receiverName || '-']]
});

/* =====================================================================
   مرتجع للمخزن — a branch sends items back to the main branch
   ===================================================================== */
PAGES['return-warehouse'] = view => voucherPage(view, {
  p: 'rw', route: 'return-warehouse', path: 'stockReturn', numKey: 'stockReturnNumber', counter: 'meta/stockReturnCounter', ic: 'undo', mode: 'deduct', needsMain: true, needBranchFirst: true,
  searchText: r => [branchLabel(r.fromBranchId), r.reason].join(' '),
  cols: [
    { h: t('iv.rw.number'), cell: r => `<b class="mono">#${esc(r.stockReturnNumber ?? '-')}</b>` },
    { h: t('iv.fromBranch'), cell: r => esc(branchLabel(r.fromBranchId)) },
    { h: t('iv.toBranch'), cell: r => esc(branchLabel(r.toBranchId || mainBranch())) },
    { h: t('pm.storekeeper'), cell: r => esc(r.storekeeperName || '-') },
    { h: t('c.date'), cell: r => `<span class="cell-2"><span class="date">${fmtDateTime(r.createdAt)}</span>${r.reason ? `<small class="clip" title="${esc(r.reason)}">${esc(r.reason)}</small>` : ''}</span>` },
    { h: t('c.items'), cell: (r, x) => `<b>${x.items.length}</b>`, cls: 'end' }
  ],
  kpis: rows => [kpi30(rows, t('iv.rw.k30'), 'undo', 'c1'), kpiQty30(rows, t('iv.qty30')), kpiBranches30(rows, t('iv.rw.kBranches'), 'fromBranchId', 'c4'), kpiAll(rows, t('iv.kTotal'))],
  init: r => ({ from: r ? r.fromBranchId || '' : '', reason: r ? r.reason || '' : '' }),
  stockBranch: d => d.from,
  locMode: () => 'in',
  fields: d => `
    <div class="field"><label for="fFrom">${t('iv.fromBranch')} <em>*</em></label><div class="select"><select id="fFrom">${branchOpts(d.from, { exclude: mainBranch() })}</select>${icon('chevDown')}</div><small class="err"></small></div>
    <div class="field iv-wide"><label for="fReason">${t('iv.rw.reason')} <em>*</em></label><input id="fReason" value="${esc(d.reason)}" maxlength="200" autocomplete="off" dir="auto" placeholder="${t('iv.rw.reasonPh')}"><small class="err"></small></div>`,
  bind: (dr, d, redraw) => {
    $('#fFrom', dr).addEventListener('change', e => { d.from = e.target.value; redraw(); });
    $('#fReason', dr).addEventListener('input', e => { d.reason = e.target.value; });
  },
  validate: d => [...(!d.from ? [['#fFrom', t('required')]] : []), ...(!String(d.reason || '').trim() ? [['#fReason', t('required')]] : [])],
  build: d => ({ fromBranchId: d.from, toBranchId: mainBranch(), reason: String(d.reason || '').trim() }),
  allocFrom: d => d.from,
  moves: r => mergeMoves(movesAt(r, r.fromBranchId, -1), movesAt(r, r.toBranchId || mainBranch(), 1)),
  subtitle: r => `${branchLabel(r.fromBranchId)} ← ${branchLabel(r.toBranchId || mainBranch())}`,
  meta: r => [[t('iv.fromBranch'), branchLabel(r.fromBranchId)], [t('iv.toBranch'), branchLabel(r.toBranchId || mainBranch())], [t('iv.rw.reason'), r.reason || '-']]
});

/* =====================================================================
   مرتجع توالف — damaged items written off a branch
   ===================================================================== */
PAGES['damaged-returns'] = view => voucherPage(view, {
  p: 'dm', route: 'damaged-returns', path: 'scrapReturn', numKey: 'scrapReturnNumber', counter: 'meta/scrapReturnCounter', ic: 'trash', mode: 'deduct', pickEmptyShows: true, needBranchFirst: true,
  searchText: r => [branchLabel(r.branchId), r.senderName].join(' '),
  cols: [
    { h: t('iv.dm.number'), cell: r => `<b class="mono">#${esc(r.scrapReturnNumber ?? '-')}</b>` },
    { h: t('iv.fromBranch'), cell: r => esc(branchLabel(r.branchId)) },
    { h: t('pm.storekeeper'), cell: r => esc(r.storekeeperName || '-') },
    { h: t('iv.dm.sender'), cell: r => esc(r.senderName || '-') },
    { h: t('c.date'), cell: r => `<span class="date">${fmtDateTime(r.createdAt)}</span>` },
    { h: t('c.items'), cell: (r, x) => `<b>${x.items.length}</b>`, cls: 'end' }
  ],
  kpis: rows => [kpi30(rows, t('iv.dm.k30'), 'trash', 'c4'), kpiQty30(rows, t('iv.qty30')), kpiBranches30(rows, t('iv.rw.kBranches'), 'branchId', 'c1'), kpiAll(rows, t('iv.kTotal'))],
  init: r => ({ branchId: r ? r.branchId || '' : '', sender: r ? r.senderName || '' : '' }),
  stockBranch: d => d.branchId,
  locMode: d => (d.branchId === mainBranch() ? 'out' : null),
  fields: d => `
    <div class="field"><label for="fSender">${t('iv.dm.sender')}</label><input id="fSender" value="${esc(d.sender)}" autocomplete="off" dir="auto"></div>
    <div class="field"><label for="fBr">${t('iv.fromBranch')} <em>*</em></label><div class="select"><select id="fBr">${branchOpts(d.branchId)}</select>${icon('chevDown')}</div><small class="err"></small></div>`,
  bind: (dr, d, redraw) => {
    $('#fSender', dr).addEventListener('input', e => { d.sender = e.target.value; });
    $('#fBr', dr).addEventListener('change', e => { d.branchId = e.target.value; redraw(); });
  },
  validate: d => (!d.branchId ? [['#fBr', t('required')]] : []),
  build: d => ({ branchId: d.branchId, senderName: d.sender || '' }),
  moves: r => movesAt(r, r.branchId, -1),
  subtitle: r => branchLabel(r.branchId),
  meta: r => [[t('iv.fromBranch'), branchLabel(r.branchId)], [t('iv.dm.sender'), r.senderName || '-']]
});

/* =====================================================================
   جرد — stocktake: the counted quantity becomes the branch balance
   ===================================================================== */
const isMainBranch = id => !!(id && ((LIVE.cache.branches || {})[id] || {}).isMain);
// The storage location a count of the main branch was for (its quantities are per location)
const countAt = r => (r && isMainBranch(r.branchId) && r.storageLocationId && locList()[r.storageLocationId] ? r.storageLocationId : null);
/* Counted and "before" quantity per item (lines of the same item in several batches are one balance) */
function countByItem(r) {
  const m = new Map();
  ivItems(r).forEach(it => {
    const k = keyOf(it), cur = m.get(k) || { type: it.itemType, id: it.itemId, qty: 0, prev: it.previousQty };
    cur.qty += Number(it.qty || 0); m.set(k, cur);
  });
  return m;
}
/* Counted quantity per batch of each product, from the lines that name a batch: {pid: {key: qty}} */
function countByBatch(r) {
  const m = {};
  ivItems(r).forEach(it => { if (it.itemType !== 'product' || !it.batchKey || !BATCH_RX.test(it.batchKey)) return; const x = (m[it.itemId] ||= {}); x[it.batchKey] = (x[it.batchKey] || 0) + Number(it.qty || 0); });
  return m;
}
/* A product counted by batch: each counted batch becomes its count and the product's other batches
   at the branch become 0. What each batch held before is kept (batchBefore) so the count can be undone. */
function stocktakeBatches(cur, next, up, skip) {
  const b = next.branchId, same = cur && (cur.branchId || b) === b;
  const oldC = cur ? countByBatch(cur) : {}, newC = countByBatch(next);
  if (skip) Object.keys(newC).forEach(pid => { if (skip(pid) && !(cur && (cur.batchBefore || {})[pid])) delete newC[pid]; });
  const before = { ...((same && cur.batchBefore) || {}) };
  Object.entries(newC).forEach(([pid, counted]) => {
    if (!itemData('product', pid)) return;
    if (same && oldC[pid] && before[pid]) {
      // Edited count: move each batch by the change in its count
      new Set([...Object.keys(oldC[pid]), ...Object.keys(counted), ...Object.keys(before[pid])]).forEach(key => {
        const diff = (counted[key] || 0) - (oldC[pid][key] || 0);
        if (Math.abs(diff) > 1e-9) up[batchPath(pid, key, b)] = LIVE.increment(diff);
      });
      const prev = before[pid];
      Object.keys(counted).forEach(key => { if (prev[key] == null) prev[key] = 0; });
      return;
    }
    const view = {}; batchView(pid, b).list.forEach(x => { view[x.key] = x.qty; });
    const raw = rawBatches(pid), prev = {};
    new Set([...Object.keys(raw).filter(k => BATCH_RX.test(k) && Number((raw[k] || {})[b] || 0)), ...Object.keys(counted)]).forEach(key => {
      prev[key] = view[key] || 0;
      up[batchPath(pid, key, b)] = counted[key] || 0;
    });
    before[pid] = prev;
  });
  // Products no longer counted by batch (or a count moved to another branch): give back what they held
  if (cur) Object.entries(oldC).forEach(([pid, counted]) => {
    if (same && newC[pid]) return;
    const prev = (cur.batchBefore || {})[pid]; if (!prev || !itemData('product', pid)) return;
    Object.keys(prev).forEach(key => { const undo = Number(prev[key] || 0) - (counted[key] || 0); if (Math.abs(undo) > 1e-9) up[batchPath(pid, key, cur.branchId || b)] = LIVE.increment(undo); });
    delete before[pid];
  });
  next.batchBefore = Object.keys(before).length ? before : null;
}
PAGES.stocktake = view => voucherPage(view, {
  p: 'ic', route: 'stocktake', path: 'inventoryCount', numKey: 'countNumber', counter: 'meta/inventoryCounter', ic: 'clipcheck', mode: 'set', pickTypes: false, needBranchFirst: true,
  watch: ['storageLocations'],
  searchText: r => [branchLabel(r.branchId), nameOf((LIVE.cache.storageLocations || {})[r.storageLocationId])].join(' '),
  cols: [
    { h: t('iv.ic.number'), cell: r => `<b class="mono">#${esc(r.countNumber ?? '-')}</b>` },
    { h: t('c.branch'), cell: r => esc(branchLabel(r.branchId)) },
    { h: t('storage-locations'), cell: r => esc(nameOf((LIVE.cache.storageLocations || {})[r.storageLocationId]) || '-') },
    { h: t('c.date'), cell: r => `<span class="date">${fmtDateTime(r.createdAt)}</span>` },
    { h: t('pm.storekeeper'), cell: r => esc(r.storekeeperName || '-') },
    { h: t('c.items'), cell: (r, x) => `<b>${x.items.length}</b>`, cls: 'end' }
  ],
  kpis: rows => [kpi30(rows, t('iv.ic.k30'), 'clipcheck', 'c1'), kpiCard({ label: t('iv.ic.kItems30'), value: rows.filter(x => inLast30(x.r)).reduce((s, x) => s + x.items.length, 0), ic: 'box', tone: 'c2', drill: 'lines30' }),
    kpiCard({ label: t('iv.ic.kDiff30'), value: rows.filter(x => inLast30(x.r)).reduce((s, x) => s + x.items.filter(i => i.previousQty != null && Math.abs(Number(i.previousQty) - i.qty) > 1e-9).length, 0), ic: 'alert', tone: 'c4', drill: 'diff30' }), kpiAll(rows, t('iv.kTotal'))],
  init: r => ({ branchId: r ? r.branchId || '' : '', storageId: r ? r.storageLocationId || '' : '' }),
  stockBranch: d => d.branchId,
  // An item not kept anywhere yet (no location) can be counted in any location; the count places it there
  pickFilter: (e, d) => !(isMainBranch(d.branchId) && d.storageId) || inLocation(e.type, e.id, d.storageId) || !locRows(e.type, e.id).length,
  locCount: d => (isMainBranch(d.branchId) && d.storageId ? d.storageId : null),
  fields: d => `
    <div class="field"><label for="fBr">${t('c.branch')} <em>*</em></label><div class="select"><select id="fBr">${branchOpts(d.branchId)}</select>${icon('chevDown')}</div><small class="err"></small></div>
    <div class="field" data-for="loc"><label for="fLoc">${t('storage-locations')} <em>*</em></label><div class="select"><select id="fLoc"><option value="">${t('iv.choose')}</option>${Object.entries(LIVE.cache.storageLocations || {}).map(([id, l]) => `<option value="${esc(id)}" ${d.storageId === id ? 'selected' : ''}>${esc(nameOf(l) || id)}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>`,
  bind: (dr, d, redraw) => {
    const show = () => { const m = isMainBranch(d.branchId); $('[data-for="loc"]', dr).hidden = !m; if (!m) { d.storageId = ''; $('#fLoc', dr).value = ''; } };
    show();
    $('#fBr', dr).addEventListener('change', e => { d.branchId = e.target.value; show(); redraw(); });
    $('#fLoc', dr).addEventListener('change', e => { d.storageId = e.target.value; redraw(); });
  },
  validate: d => [...(!d.branchId ? [['#fBr', t('required')]] : []), ...(isMainBranch(d.branchId) && !d.storageId ? [['#fLoc', t('required')]] : [])],
  build: d => ({ branchId: d.branchId, storageLocationId: d.storageId || null }),
  /* New count: each counted item's balance becomes the counted total, and the
     balance before is kept on the line so the count can be undone later.
     Edit: lines already in the count move by the difference (sales and transfers
     made since are kept), new lines are set, removed lines are undone. */
  stock: (cur, next) => {
    const up = {}, b = next.branchId, L = countAt(next), oldL = cur ? countAt(cur) : null;
    const old = cur ? countByItem(cur) : new Map();
    const same = cur && (cur.branchId || b) === b && oldL === L;
    // A location of the main branch: the count is that location's quantity; the branch total moves by the change
    const nowStock = (type, id) => (L ? locView(type, id).locs[L] || 0 : stockAt(itemData(type, id), b));
    const move = (type, id, branch, loc, q) => {
      up[stockKey(type, id, branch)] = LIVE.increment(q);
      if (loc) up[locPath(type, id, loc)] = LIVE.increment(q);
    };
    next.items = ivItems(next).map(it => {
      const o = same ? old.get(keyOf(it)) : null;
      return { ...it, previousQty: o && o.prev != null ? o.prev : it.previousQty != null && same ? it.previousQty : nowStock(it.itemType, it.itemId) };
    }).map(it => clean(it));
    const prevOf = new Map(next.items.map(it => [keyOf(it), Number(it.previousQty || 0)]));
    countByItem(next).forEach((c, key) => {
      if (!itemData(c.type, c.id)) return;
      const o = same ? old.get(key) : null;
      if (o) { const diff = c.qty - o.qty; if (Math.abs(diff) > 1e-9) move(c.type, c.id, b, L, diff); }
      else if (L) {
        up[stockKey(c.type, c.id, b)] = LIVE.increment(c.qty - prevOf.get(key)); up[locPath(c.type, c.id, L)] = c.qty;
        if (!locList()[(itemData(c.type, c.id) || {}).storageLocationId]) up[`${itemPath(c.type, c.id)}/storageLocationId`] = L; // first place of an unplaced item
      }
      else up[stockKey(c.type, c.id, b)] = c.qty + (c.type === 'product' ? soldQty(c.id, b) : 0); // shown = stored − sales
    });
    if (cur) {
      const nextKeys = new Set([...countByItem(next).keys()]);
      old.forEach((o, key) => {
        if (same && nextKeys.has(key)) return;
        if (o.prev == null || !itemData(o.type, o.id)) return;
        const undo = Number(o.prev) - o.qty;
        if (Math.abs(undo) > 1e-9) move(o.type, o.id, cur.branchId || b, oldL, undo);
      });
    }
    // An item kept in several locations is counted one location at a time: its batches follow FEFO
    stocktakeBatches(cur, next, up, L ? pid => locRows('product', pid).length > 1 : null);
    return up;
  },
  // Undo only what the count changed (counted − before), so later sales and transfers stay.
  unstock: cur => {
    const its = ivItems(cur);
    if (its.some(it => it.previousQty === undefined || it.previousQty === null)) return t('iv.ic.cannotRevert');
    const up = {}, L = countAt(cur);
    countByItem(cur).forEach(c => {
      const undo = Number(c.prev || 0) - c.qty;
      if (Math.abs(undo) <= 1e-9 || !itemData(c.type, c.id)) return;
      up[stockKey(c.type, c.id, cur.branchId)] = LIVE.increment(undo);
      if (L) up[locPath(c.type, c.id, L)] = LIVE.increment(undo);
    });
    const counted = countByBatch(cur);
    Object.entries(cur.batchBefore || {}).forEach(([pid, prev]) => {
      if (!itemData('product', pid)) return;
      Object.keys(prev).forEach(key => { const undo = Number(prev[key] || 0) - ((counted[pid] || {})[key] || 0); if (Math.abs(undo) > 1e-9) up[batchPath(pid, key, cur.branchId)] = LIVE.increment(undo); });
    });
    return up;
  },
  subtitle: r => branchLabel(r.branchId),
  meta: r => [[t('c.branch'), branchLabel(r.branchId)], [t('storage-locations'), nameOf((LIVE.cache.storageLocations || {})[r.storageLocationId]) || '-']]
});
