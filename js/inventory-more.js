/* المخازن (inventory) — the pages that are not plain item vouchers:
   إنتاج production · موظفو الإنتاج productionStaff · استلام receiving ·
   طلبات تحويل الكاشير transferRequests. Same data as the old accounting page. */

['production', 'production-staff', 'receiving', 'cashier-requests'].forEach(r => LIVE_ROUTES.add(r));

const prItems = r => (Array.isArray(r && r.items) && r.items.length ? r.items : r && r.itemId ? [{
  itemId: r.itemId, itemType: r.itemType || 'product', itemName: r.itemName || '-', itemNameAr: r.itemNameAr || r.itemName || '-', itemNameEn: r.itemNameEn || '',
  unitId: r.unitId || null, unitName: r.unitName || null, qty: r.qty || 0, ingredients: r.ingredients || null, origin: r.origin || null,
  productionDate: r.productionDate || '', expiryDate: r.expiryDate || ''
}] : []).map(it => ({ ...it, itemType: ivType(it), qty: Number(it.qty || 0) }));
const prName = it => liveItemName(it);
const prUnit = it => liveUnitName(it);
const prQty = it => `${qtyFmt(it.qty)}${prUnit(it) ? ` ${prUnit(it)}` : ''}`;
// Products also go into their batch (production + expiry date) at the branch
const prBatchKey = (r, it) => batchKeyOf(it.productionDate || r.productionDate, it.expiryDate || r.expiryDate);
const prMoves = r => sumByPath(prItems(r).filter(it => itemData(it.itemType, it.itemId)).flatMap(it => {
  const br = r.branchId || mainBranch();
  return [[stockKey(it.itemType, it.itemId, br), it.qty], ...(it.itemType === 'product' ? [[batchPath(it.itemId, prBatchKey(r, it), br), it.qty]] : []), ...lineLocMoves(it, br, 1)];
}));
const PR_PATHS = ['production', 'productionStaff', 'stockIssue', 'branches', 'products', 'stockMaterials', 'units', 'productInfos', 'countryOrigins'];

/* What a production label carries (same fallbacks as the old page) */
function prLabelRec(r, it) {
  const product = it.itemType === 'product' ? (LIVE.cache.products || {})[it.itemId] : null;
  const material = it.itemType !== 'product' ? (LIVE.cache.stockMaterials || {})[it.itemId] : null;
  const info = it.itemType === 'product' ? productInfoOf(it.itemId) : null;
  const originSel = product && product.countryOriginId ? nameOf((LIVE.cache.countryOrigins || {})[product.countryOriginId]) : '';
  const item = product || material || {};
  return {
    itemId: it.itemId, itemType: it.itemType, itemName: it.itemName || nameOf(item),
    itemNameAr: it.itemNameAr || item.nameAr || item.name || it.itemName || '', itemNameEn: it.itemNameEn || item.nameEn || item.name || it.itemName || '',
    labelIngredients: (info && info.ingredients) ?? (material && material.ingredients) ?? it.ingredients ?? '',
    labelOrigin: (info && info.origin) ?? (material && material.origin) ?? it.origin ?? originSel ?? '',
    // A product label carries its batch: product barcode + production and expiry dates
    barcode: (product && batchBarcode(it.itemId, prBatchKey(r, it))) || (info && info.barcode) || (product && product.barcode) || (material && material.barcode) || r.productionBarcode || newBarcode(),
    productionDate: it.productionDate || r.productionDate || '', expiryDate: it.expiryDate || r.expiryDate || ''
  };
}
/* One print job for several items: each item gets `copies` labels */
async function printProdLabels(r, list) {
  try { await needLib('JsBarcode'); } catch (e) { libFailed(); return; }
  const recs = list.map(({ it, copies }) => ({ rec: prLabelRec(r, it), copies: Math.max(1, Math.floor(copies || 1)) }));
  try {
    if (window.figsDesktop && window.figsDesktop.isDesktopApp) {
      for (const x of recs) await window.figsDesktop.printZpl({ zpl: await labelZpl(x.rec, x.copies) });
      return;
    }
    const docs = recs.map(x => labelHtml(x.rec, x.copies));
    const bodies = docs.map(h => h.slice(h.indexOf('<body>') + 6, h.lastIndexOf('</body>')));
    printHtml(docs[0].slice(0, docs[0].indexOf('<body>') + 6) + bodies.join('') + '</body></html>');
  } catch (e) { toast(`${t('iv.pr.labelFail')}: ${e && e.message ? e.message : ''}`, { tone: 'danger', ic: 'alert' }); }
}

/* The printed production voucher: x = { r, items } */
function prPrintReport(x) {
  const r = x.r, issue = (LIVE.cache.stockIssue || {})[r.issueId], used = ivItems(issue);
  needLib('JsBarcode').catch(() => null).then(() => printDoc(`${t('iv.pr.voucher')} #${r.productionNumber ?? ''}`,
    [[t('c.date'), fmtDateTime(r.createdAt)], [t('c.branch'), branchLabel(r.branchId)], [t('pm.storekeeper'), r.storekeeperName || '-'], [t('iv.staffOne'), ivStaffLabel(r)], [t('iv.pr.linkedIssue'), r.issueNumber || '-']],
    [t('c.name'), t('c.qty'), t('iv.prodDate'), t('iv.expiry')], x.items.map(it => [`${prName(it)}${prUnit(it) ? ` (${prUnit(it)})` : ''}`, prQty(it), it.productionDate || r.productionDate || '-', it.expiryDate || r.expiryDate || '-']),
    null, { barcode: r.productionBarcode, extra: { title: t('iv.pr.used'), cols: [t('c.name'), t('c.qty')], rows: used.length ? used.map(it => [itemLabel(it), qtyFmt(it.qty)]) : [[t('iv.none'), '-']] } }));
}
/* =====================================================================
   إنتاج — production vouchers: produced items are added to a branch
   ===================================================================== */
PAGES.production = view => {
  const st = (S.iv_pr ||= { q: '', from: '', to: '', branch: 'all', staff: 'all', page: 1, per: 10 });
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('production', `<button class="btn btn-ghost" data-pr="export">${icon('download')}<span>${t('iv.excel')}</span></button>
      <button class="btn btn-ghost" data-pr="report">${icon('printer')}<span>${t('iv.printReport')}</span></button>
      <button class="btn btn-primary" data-pr="new">${icon('plus')}<span>${t('iv.pr.new')}</span></button>`, t('iv.pr.sub'))}
    <section class="kpis" id="prK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="prQ" placeholder="${t('iv.pr.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <label class="date-field"><small>${t('c.from')}</small><input type="date" id="prFrom" value="${st.from}"></label>
        <label class="date-field"><small>${t('c.to')}</small><input type="date" id="prTo" value="${st.to}"></label>
        <div class="select tb-select">${icon('chevDown')}<select id="prBr" aria-label="${t('c.branch')}"></select></div>
        <div class="select tb-select">${icon('chevDown')}<select id="prSt" aria-label="${t('iv.staffOne')}"></select></div>
        <span class="tb-spacer"></span>${perHtml(st)}
      </div>
      <div class="table-wrap"><table class="dt iv-table">
        <thead><tr><th>${t('iv.pr.number')}</th><th>${t('iv.pr.product')}</th><th class="end">${t('c.qty')}</th><th>${t('c.date')}</th><th>${t('iv.prodDate')}</th><th>${t('iv.expiry')}</th><th>${t('c.branch')}</th><th>${t('iv.staffOne')}</th><th>${t('iv.pr.issueNo')}</th><th class="act-col"></th></tr></thead>
        <tbody id="prBody"></tbody>
      </table></div>
      <footer class="pager" id="prPager"></footer>
    </section>`;

  /* Old records of one voucher may be split per product: they show as one row */
  const all = () => {
    const grouped = new Map();
    Object.entries(LIVE.cache.production || {}).filter(([, r]) => r && typeof r === 'object').forEach(([id, r]) => {
      const key = r.productionNumber ? `n:${r.productionNumber}` : `id:${id}`;
      const g = grouped.get(key);
      if (!g) grouped.set(key, { id, r, ids: [id], items: prItems(r) });
      else { g.ids.push(id); g.items.push(...prItems(r)); g.r = { ...g.r, createdAt: Math.min(g.r.createdAt || Infinity, r.createdAt || Infinity) }; }
    });
    return [...grouped.values()].sort((a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0));
  };
  const filtered = rows => {
    const q = normQ(st.q);
    return rows.filter(x => (st.branch === 'all' || (x.r.branchId || '') === st.branch) && (st.staff === 'all' || (x.r.productionStaffId || '') === st.staff)
      && (!st.from && !st.to || inRange(x.r.createdAt, st.from, st.to))
      && (!q || normQ([x.r.productionNumber, x.r.issueNumber, ivStaffLabel(x.r), ...x.items.map(i => `${i.itemName || ''} ${i.itemNameAr || ''} ${i.itemNameEn || ''}`)].join(' ')).includes(q)));
  };

  function draw() {
    const body = $('#prBody', view); if (!body) return;
    if (!LIVE.loaded(PR_PATHS)) { setHtml(body, skeletonRows(5, 10)); $('#prK', view).innerHTML = skeletonKpis(); return; }
    const rows = all(), r30 = rows.filter(x => inLast30(x.r));
    const soon = Date.now() + 7 * 86400000;
    setKpis($('#prK', view), [
      kpiCard({ label: t('iv.pr.k30'), value: r30.length, ic: 'factory', tone: 'c1', drill: 'v30' }),
      kpiCard({ label: t('iv.pr.kQty30'), value: r30.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0), ic: 'box', tone: 'c2', drill: 'qty30' }),
      kpiCard({ label: t('iv.pr.kSoon'), value: rows.filter(x => x.items.some(i => { const e = i.expiryDate || x.r.expiryDate; const ts = e ? new Date(`${e}T23:59:59`).getTime() : 0; return ts >= Date.now() && ts <= soon; })).length, ic: 'clock', tone: 'c4', drill: 'soon' }),
      kpiAll(rows, t('iv.kTotal'))
    ].join(''), first);
    setHtml($('#prBr', view), `<option value="all">${t('iv.allBranches')}</option>` + Object.entries(LIVE.cache.branches || {}).map(([id, b]) => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join(''));
    setHtml($('#prSt', view), `<option value="all">${t('iv.allStaff')}</option>` + Object.entries(LIVE.cache.productionStaff || {}).map(([id, s]) => `<option value="${esc(id)}" ${st.staff === id ? 'selected' : ''}>${esc(staffName(s) || id)}</option>`).join(''));
    const list = filtered(rows);
    setHtml($('#prPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    const isF = !!(st.q || st.from || st.to || st.branch !== 'all' || st.staff !== 'all');
    setHtml(body, slice.length ? slice.map((x, i) => {
      const r = x.r;
      return `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('iv.pr.number')}"><b class="mono">#${esc(r.productionNumber ?? '-')}</b></td>
        <td data-label="${t('iv.pr.product')}"><span class="cell-2 pr-names">${x.items.map(it => `<b>${esc(prName(it))}</b>`).join('')}</span></td>
        <td data-label="${t('c.qty')}" class="end"><span class="cell-2">${x.items.map(it => `<b class="num">${esc(prQty(it))}</b>`).join('')}</span></td>
        <td data-label="${t('c.date')}"><span class="cell-2"><span class="date">${fmtDateTime(r.createdAt)}</span>${r.storekeeperName ? `<small>${esc(r.storekeeperName)}</small>` : ''}</span></td>
        <td data-label="${t('iv.prodDate')}"><span class="mono">${esc(r.productionDate || '-')}</span></td>
        <td data-label="${t('iv.expiry')}"><span class="mono">${esc(r.expiryDate || '-')}</span></td>
        <td data-label="${t('c.branch')}">${esc(branchLabel(r.branchId) || r.branchName || '-')}</td>
        <td data-label="${t('iv.staffOne')}">${esc(ivStaffLabel(r))}</td>
        <td data-label="${t('iv.pr.issueNo')}">${r.issueNumber ? `<button class="badge tone-info badge-btn" data-pr="issue">#${esc(r.issueNumber)}</button>` : '<span class="muted">—</span>'}</td>
        <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
          ${actBtn('view', 'pr', 'eye', t('view'))}${actBtn('print', 'pr', 'printer', t('iv.printReport'))}${actBtn('label', 'pr', 'tag', t('iv.pr.printLabel'))}
          ${x.ids.length === 1 ? actBtn('edit', 'pr', 'pencil', t('edit')) : ''}${actBtn('delete', 'pr', 'trash', t('delete'), 'danger')}</div></td></tr>`;
    }).join('') : ivEmpty(10, isF, 'factory', t('iv.pr.none'), t('iv.pr.noneSub')));
    first = false;
  }

  /* ---------- form ---------- */
  function openForm(rec) {
    if (!afterCatalog(PR_PATHS, () => openForm(rec))) return;
    const main = mainBranch();
    const r = rec ? rec.r : null;
    const d = {
      editingId: rec ? rec.id : null, staffId: r ? r.productionStaffId || '' : '', branchId: r ? r.branchId || main || '' : main || '',
      productionDate: r ? r.productionDate || '' : '', expiryDate: r ? r.expiryDate || '' : '', issueId: r ? r.issueId || null : null, q: '',
      items: r ? prItems(r).map(it => ({ type: it.itemType, id: it.itemId, qty: it.qty, origin: it.origin || '', ingredients: it.ingredients || '', locId: it.locId || null })) : []
    };
    const staff = Object.entries(LIVE.cache.productionStaff || {});
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(rec ? 'pencil' : 'factory')}</span><div><h2 id="drawerTitle">${rec ? `${t('edit')} ${t('iv.pr.voucher')} #${esc(r.productionNumber ?? '')}` : t('iv.pr.new')}</h2><p>${t('iv.pr.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body pu-form">
        <div class="form-grid">
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(r ? r.storekeeperName || '-' : me().name)}" readonly></div>
          <div class="field"><label for="pStaff">${t('production-staff')} <em>*</em></label><div class="select"><select id="pStaff"><option value="">${t('iv.choose')}</option>${staff.map(([id, s]) => `<option value="${esc(id)}" ${d.staffId === id ? 'selected' : ''}>${esc(staffName(s) || id)}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="pBr">${t('c.branch')} <em>*</em></label><div class="select"><select id="pBr">${branchOpts(d.branchId)}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="pDate">${t('iv.pr.commonDate')} <em>*</em></label><input type="date" id="pDate" value="${esc(d.productionDate)}"><small class="err"></small></div>
          <div class="field"><label for="pExp">${t('iv.pr.commonExpiry')} <em>*</em></label><input type="date" id="pExp" value="${esc(d.expiryDate)}"><small class="err"></small></div>
        </div>
        <section class="picker">
          <div class="picker-head"><b>${t('iv.pr.addProducts')}</b><label class="search-field">${icon('search')}<input type="search" id="pQ" placeholder="${t('iv.pr.itemSearchPh')}" autocomplete="off"></label></div>
          <div class="picker-list" id="pPick"></div>
        </section>
        <section class="draft">
          <div class="draft-head"><b>${t('iv.pr.produced')}</b><span class="muted" id="pCount"></span></div>
          <div id="pItems"></div>
          <small class="err" id="pItemsErr"></small>
        </section>
      </div>
      <footer class="dr-foot iv-foot"><div class="dr-total"><small>${t('iv.totalQty')}</small><b id="pTotal">0</b></div><span class="tb-spacer"></span>
        ${rec ? '' : `<label class="check-line"><input type="checkbox" id="pPrint" checked> ${t('iv.pr.printLabels')}</label>`}
        <button class="btn btn-ghost" data-close>${t('cancel')}</button>
        <button class="btn btn-primary" id="pNext">${icon('out')}<span>${t('iv.pr.pickIssue')}</span></button></footer>`;
    openLayer('#drawer');

    const entryOf = it => ({ id: it.id, type: it.type, item: itemData(it.type, it.id) || {} });
    // A product with fixed dates fills the common dates when they are still empty (as in the old page)
    const applyFixed = item => {
      if (!item || !item.fixedExpiryEnabled) return;
      if (!d.productionDate && item.fixedProductionDate) { d.productionDate = item.fixedProductionDate; $('#pDate', dr).value = d.productionDate; }
      if (!d.expiryDate && item.fixedExpiryDate) { d.expiryDate = item.fixedExpiryDate; $('#pExp', dr).value = d.expiryDate; }
    };
    const defaults = e => {
      if (e.type !== 'product') return { ingredients: e.item.ingredients || '', origin: e.item.origin || '' };
      const info = productInfoOf(e.id), p = e.item;
      return { ingredients: (info && info.ingredients) || p.ingredients || '', origin: (info && info.origin) || p.origin || (p.countryOriginId ? nameOf((LIVE.cache.countryOrigins || {})[p.countryOriginId]) : '') || '' };
    };
    const lineRow = (it, idx) => {
      const e = entryOf(it);
      return `<div class="line pr-line" data-i="${idx}">
        <div class="line-name"><b>${esc(nameOf(e.item) || '-')}</b><small class="muted">${esc([e.item.code, unitName(e.item.unitId)].filter(Boolean).join(' · '))}</small>${!itemData(it.type, it.id) ? `<small class="neg">${t('pu.itemGone')}</small>` : ''}
          ${multiLoc(it.type, it.id, d.branchId) ? locPick(it.type, it.id, 'in', it.locId, prUndo()) : ''}</div>
        <label class="line-in"><small>${t('iv.pr.origin')}</small><input data-f="origin" value="${esc(it.origin)}" dir="auto" autocomplete="off"></label>
        <label class="line-in"><small>${t('iv.pr.ingredients')}</small><input data-f="ingredients" value="${esc(it.ingredients)}" dir="auto" autocomplete="off"></label>
        <label class="line-in"><small>${t('c.qty')}</small><input data-f="qty" inputmode="numeric" value="${it.qty || ''}" autocomplete="off"></label>
        <button class="btn-icon sm danger" data-f="del" aria-label="${t('delete')}">${icon('trash')}</button></div>`;
    };
    // Moves this voucher already made (when editing), so a place shows what it held before it
    const prUndo = () => (d.editingId && (LIVE.cache.production || {})[d.editingId] ? prMoves((LIVE.cache.production || {})[d.editingId]) : {});
    const valid = () => d.items.length && d.productionDate && d.expiryDate && d.items.every(it => Math.floor(Number(it.qty)) > 0);
    const updateTotal = () => { $('#pTotal', dr).textContent = qtyFmt(d.items.reduce((s, it) => s + Math.floor(Number(it.qty || 0)), 0)); $('#pNext', dr).disabled = !valid(); };
    const drawItems = flash => {
      $('#pItems', dr).innerHTML = d.items.length ? d.items.map(lineRow).join('') : `<div class="empty-state sm">${icon('factory')}<b>${t('pu.noItems')}</b><small>${t('iv.pr.noItemsSub')}</small></div>`;
      $('#pCount', dr).textContent = d.items.length ? `${d.items.length} ${t('pu.itemsWord')}` : '';
      if (flash != null) { const el = $(`.line[data-i="${flash}"]`, dr); el && el.classList.add('flash-in'); }
      updateTotal();
    };
    const drawPicker = () => {
      const q = normQ(d.q), box = $('#pPick', dr);
      const list = ivEntries().filter(e => !q || ivText(e).includes(q));
      const shown = (q ? list : list.slice(0, 30));
      box.innerHTML = shown.length ? shown.map(e => {
        const on = d.items.some(x => x.type === e.type && String(x.id) === String(e.id));
        return `<button type="button" class="pick${on ? ' added' : ''}" data-type="${e.type}" data-id="${esc(e.id)}"><span class="pick-ic">${icon(e.type === 'product' ? 'package' : 'box')}</span>
          <span class="pick-txt"><b>${esc(nameOf(e.item) || '-')}</b><small>${esc([e.item.code, unitName(e.item.unitId)].filter(Boolean).join(' · '))}</small></span><span class="pick-add">${icon(on ? 'check' : 'plus')}</span></button>`;
      }).join('') : `<p class="muted pick-hint">${icon('info')}${t('noResults')}</p>`;
    };
    const toggle = (type, id) => {
      const idx = d.items.findIndex(x => x.type === type && String(x.id) === String(id));
      if (idx >= 0) { d.items.splice(idx, 1); drawItems(); drawPicker(); return; }
      const e = { id, type, item: itemData(type, id) }; if (!e.item) return;
      d.items.push({ type, id, qty: '', ...defaults(e) });
      applyFixed(e.item);
      drawItems(d.items.length - 1); drawPicker();
      setTimeout(() => { const inp = $(`.line[data-i="${d.items.length - 1}"] [data-f="qty"]`, dr); inp && inp.focus(); }, 60);
    };
    drawItems(); drawPicker();
    $('#pStaff', dr).addEventListener('change', e => { d.staffId = e.target.value; });
    $('#pBr', dr).addEventListener('change', e => { d.branchId = e.target.value; drawItems(); });
    $('#pDate', dr).addEventListener('change', e => { d.productionDate = e.target.value; updateTotal(); });
    $('#pExp', dr).addEventListener('change', e => { d.expiryDate = e.target.value; updateTotal(); });
    $('#pQ', dr).addEventListener('input', e => { d.q = e.target.value; drawPicker(); });
    $('#pQ', dr).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const hit = ivExact(ivEntries(), d.q);
      if (hit) { if (!d.items.some(x => x.type === hit.e.type && String(x.id) === String(hit.e.id))) toggle(hit.e.type, hit.e.id); e.target.value = ''; d.q = ''; drawPicker(); }
    });
    $('#pPick', dr).addEventListener('click', e => { const b = e.target.closest('.pick'); if (b) toggle(b.dataset.type, b.dataset.id); });
    $('#pItems', dr).addEventListener('input', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i], f = e.target.dataset.f;
      if (f === 'qty') { e.target.value = toLatin(e.target.value).replace(/[^\d]/g, ''); it.qty = Number(e.target.value || 0); updateTotal(); }
      if (f === 'origin' || f === 'ingredients') it[f] = e.target.value;
    });
    $('#pItems', dr).addEventListener('change', e => {
      const line = e.target.closest('.line'); if (!line || e.target.dataset.f !== 'loc') return;
      d.items[+line.dataset.i].locId = e.target.value || null; drawItems();
    });
    $('#pItems', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-f="del"]'); if (!b) return;
      const line = b.closest('.line'); line.classList.add('row-out');
      setTimeout(() => { d.items.splice(+line.dataset.i, 1); drawItems(); drawPicker(); }, 220);
    });

    const setErr = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $('#pNext', dr).addEventListener('click', async () => {
      if (saving) return;
      let bad = false;
      setErr('#pStaff', d.staffId ? '' : t('required')); setErr('#pBr', d.branchId ? '' : t('required'));
      setErr('#pDate', d.productionDate ? '' : t('required')); setErr('#pExp', d.expiryDate ? '' : t('required'));
      bad = !d.staffId || !d.branchId || !d.productionDate || !d.expiryDate;
      const noLoc = needLocName(d.items.map(it => ({ itemType: it.type, itemId: it.id, qty: it.qty, locId: it.locId })), d.branchId, l => nameOf(itemData(l.itemType, l.itemId)));
      $('#pItemsErr', dr).textContent = !d.items.length ? t('pu.needItems') : d.items.some(it => !(Math.floor(Number(it.qty)) > 0)) ? t('iv.pr.needWhole') : noLoc ? t('sl.needLoc').replace('{name}', noLoc) : '';
      if (bad || $('#pItemsErr', dr).textContent) { shake(dr); return; }
      const link = await pickIssue(d.issueId);
      if (link === undefined) return;
      d.issueId = link;
      save();
    });

    async function save() {
      const wantPrint = !!($('#pPrint', dr) || {}).checked;
      const issue = d.issueId ? (LIVE.cache.stockIssue || {})[d.issueId] : null;
      const items = d.items.map(row => {
        const it = itemData(row.type, row.id) || {};
        return clean({ itemId: row.id, itemType: row.type, itemName: nameOf(it) || arName(it), itemNameAr: it.nameAr || it.name || null, itemNameEn: it.nameEn || it.name || null,
          unitId: it.unitId || null, unitName: unitName(it.unitId) || null, qty: Math.floor(Number(row.qty)), productionDate: d.productionDate, expiryDate: d.expiryDate,
          ingredients: row.ingredients || null, origin: row.origin || null, locId: multiLoc(row.type, row.id, d.branchId) ? row.locId || null : null });
      });
      const base = { productionStaffId: d.staffId, productionStaffName: staffName((LIVE.cache.productionStaff || {})[d.staffId]) || me().name || null,
        issueId: d.issueId || null, issueNumber: issue ? issue.issueNumber || null : null, branchId: d.branchId, productionDate: d.productionDate, expiryDate: d.expiryDate,
        // The first product also sits at the top level, as older screens and records read it there
        items, ...items[0] };
      const btn = $('#pNext', dr); saving = true; btn.classList.add('loading');
      try {
        const up = {};
        if (d.editingId) {
          const cur = (LIVE.cache.production || {})[d.editingId];
          if (!cur) { toast(t('sr.goneElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
          Object.assign(up, diffMoves(prMoves(cur), prMoves({ ...cur, ...base })));
          Object.entries(base).forEach(([key, v]) => { up[`production/${d.editingId}/${key}`] = v; });
          await LIVE.update(withBatchSeed(up));
          toast(`${t('iv.pr.voucher')} #${cur.productionNumber ?? ''} — ${t('saved')}`);
          closeLayers();
        } else {
          const num = await LIVE.counter('meta/productionCounter');
          const key = LIVE.newKey('production');
          const recNew = { productionNumber: num, productionBarcode: newBarcode(), createdAt: Date.now(), storekeeperId: me().id || null, storekeeperName: me().name || null, ...base };
          Object.entries(prMoves(recNew)).forEach(([p, q]) => { up[p] = LIVE.increment(q); });
          up[`production/${key}`] = clean({ ...recNew, createdAt: LIVE.now() });
          await LIVE.update(withBatchSeed(up));
          toast(`${t('iv.pr.voucher')} #${num} — ${t('iv.pr.added')}`);
          closeLayers();
          // One label per produced unit of each line
          if (wantPrint) printProdLabels(recNew, items.map(it => ({ it, copies: it.qty })));
        }
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    }
    setTimeout(() => (d.staffId ? $('#pQ', dr) : $('#pStaff', dr)).focus(), 350);
  }

  /* Link to a production take-out voucher, or continue without one.
     Resolves to the issue id, null (skipped), or undefined (cancelled). */
  function pickIssue(current) {
    const list = Object.entries(LIVE.cache.stockIssue || {}).filter(([, i]) => i && i.issueType === 'production').sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    return new Promise(resolve => {
      const wrap = $('#confirm');
      wrap.innerHTML = `<div class="cf-backdrop" data-x="cancel"></div>
        <div class="cf pr-link" role="alertdialog" aria-modal="true" aria-labelledby="cfT">
          <span class="cf-ic tone-success">${icon('out')}</span><h2 id="cfT">${t('iv.pr.pickIssue')}</h2>
          <div class="cf-body">${list.length ? `<div class="pr-issues">${list.map(([id, i]) => `<label class="pr-issue"><input type="radio" name="prIssue" value="${esc(id)}" ${current === id ? 'checked' : ''}>
            <span class="cell-2"><b>${t('iv.is.voucher')} #${esc(i.issueNumber ?? '-')}</b><small>${esc(fmtDateTime(i.createdAt))} · ${esc(issueEmpLabel(i))} · ${ivItems(i).length} ${t('pu.itemsWord')}</small></span></label>`).join('')}</div>`
            : `<p class="cf-note">${t('iv.pr.noIssues')}</p>`}</div>
          <div class="cf-btns"><button class="btn btn-ghost" data-x="skip">${t('iv.pr.skip')}</button><button class="btn btn-primary" data-x="ok" ${list.length ? '' : 'disabled'}>${t('iv.pr.confirm')}</button></div></div>`;
      requestAnimationFrame(() => wrap.classList.add('open'));
      const done = v => { wrap.classList.remove('open'); document.removeEventListener('keydown', key, true); setTimeout(() => { wrap.innerHTML = ''; }, 250); resolve(v); };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(undefined); } };
      document.addEventListener('keydown', key, true);
      wrap.onclick = e => {
        const b = e.target.closest('[data-x]'); if (!b) return;
        if (b.dataset.x === 'cancel') done(undefined);
        else if (b.dataset.x === 'skip') done(null);
        else { const sel = $('input[name="prIssue"]:checked', wrap); if (!sel) { toast(t('iv.pr.chooseIssue'), { tone: 'info', ic: 'info' }); return; } done(sel.value); }
      };
    });
  }

  /* Voucher details: the produced items and the materials taken by the linked issue */
  function details(x) {
    const r = x.r, issue = (LIVE.cache.stockIssue || {})[r.issueId], used = ivItems(issue);
    const meta = [[t('c.date'), fmtDateTime(r.createdAt)], [t('c.branch'), branchLabel(r.branchId)], [t('pm.storekeeper'), r.storekeeperName || '-'], [t('iv.staffOne'), ivStaffLabel(r)],
      [t('iv.prodDate'), r.productionDate || '-'], [t('iv.expiry'), r.expiryDate || '-']];
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('factory')}</span><div><h2 id="drawerTitle">${t('iv.pr.voucher')} #${esc(r.productionNumber ?? '-')}</h2><p>${esc(ivStaffLabel(r))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">${meta.map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}
          <div><small>${t('iv.pr.linkedIssue')}</small>${r.issueNumber ? `<button class="badge tone-info badge-btn" data-d="issue">#${esc(r.issueNumber)}</button>` : '<b>-</b>'}</div></div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('c.qty')}</th><th>${t('iv.bt.code')}</th><th>${t('iv.pr.origin')}</th></tr></thead>
          <tbody>${x.items.map(it => `<tr><td data-label="${t('c.name')}"><b>${esc(prName(it))}</b></td><td data-label="${t('c.qty')}" class="end num">${esc(prQty(it))}</td><td data-label="${t('iv.bt.code')}" class="mono">${esc((it.itemType === 'product' && batchBarcode(it.itemId, prBatchKey(r, it))) || '-')}</td><td data-label="${t('iv.pr.origin')}">${esc(it.origin || '-')}</td></tr>`).join('')}</tbody></table></div>
        ${used.length ? `<h3 class="dr-sub">${t('iv.pr.used')}</h3><div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('c.qty')}</th></tr></thead>
          <tbody>${used.map(it => `<tr><td data-label="${t('c.name')}"><b>${esc(itemLabel(it))}</b></td><td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.qty)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </div>
      <footer class="dr-foot iv-foot"><button class="btn btn-ghost" data-d="print">${icon('printer')}<span>${t('iv.printReport')}</span></button><button class="btn btn-ghost" data-d="label">${icon('tag')}<span>${t('iv.pr.printLabel')}</span></button>
        <span class="tb-spacer"></span>${x.ids.length === 1 ? `<button class="btn btn-ghost" data-d="edit">${icon('pencil')}<span>${t('edit')}</span></button>` : ''}</footer>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'print') printReport(x);
      else if (b.dataset.d === 'label') printProdLabels(r, x.items.map(it => ({ it, copies: 1 })));
      else if (b.dataset.d === 'issue') { if (issue) { dr.onclick = null; issueDetails(issue); } else toast(t(LIVE.partial('stockIssue') ? 'waitAll' : 'iv.pr.issueGone'), { tone: 'info', ic: 'info' }); }
      else if (b.dataset.d === 'edit') { dr.onclick = null; openForm({ id: x.id, r }); }
    };
  }
  const printReport = prPrintReport;
  function exportExcel() {
    excelOut(filtered(all()).map((x, i) => ({
      [t('iv.rowNo')]: i + 1, [t('iv.pr.number')]: x.r.productionNumber || '-', [t('iv.pr.product')]: x.items.map(prName).join('\n'), [t('c.qty')]: x.items.map(prQty).join('\n'),
      [t('c.date')]: fmtDateTime(x.r.createdAt), [t('iv.prodDate')]: x.r.productionDate || '-', [t('iv.expiry')]: x.r.expiryDate || '-', [t('c.branch')]: branchLabel(x.r.branchId),
      [t('pm.storekeeper')]: x.r.storekeeperName || '-', [t('iv.staffOne')]: ivStaffLabel(x.r), [t('iv.pr.issueNo')]: x.r.issueNumber || '-'
    })), 'production-report.xlsx');
  }
  function printTable() {
    const list = filtered(all());
    if (!list.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
    printDoc(t('production'), [[t('c.from'), st.from || '-'], [t('c.to'), st.to || '-'], [t('c.branch'), st.branch === 'all' ? t('iv.allBranches') : branchLabel(st.branch)],
      [t('iv.staffOne'), st.staff === 'all' ? t('iv.allStaff') : staffName((LIVE.cache.productionStaff || {})[st.staff]) || '-']],
    [t('iv.rowNo'), t('iv.pr.number'), t('iv.pr.product'), t('c.qty'), t('c.date'), t('iv.prodDate'), t('iv.expiry'), t('c.branch'), t('pm.storekeeper'), t('iv.staffOne'), t('iv.pr.issueNo')],
    list.map((x, i) => [i + 1, x.r.productionNumber || '-', x.items.map(prName).join(' | '), x.items.map(prQty).join(' | '), fmtDateTime(x.r.createdAt), x.r.productionDate || '-', x.r.expiryDate || '-', branchLabel(x.r.branchId), x.r.storekeeperName || '-', ivStaffLabel(x.r), x.r.issueNumber || '-']),
    [t('c.qty'), qtyFmt(list.reduce((s, x) => s + x.items.reduce((a, it) => a + it.qty, 0), 0))]);
  }
  async function remove(x) {
    const ok = await confirmDialog({ title: t('iv.pr.deleteQ'), body: `<div class="cf-sum"><div><small>${t('iv.pr.number')}</small><b>#${esc(x.r.productionNumber ?? '-')}</b></div><div><small>${t('c.items')}</small><b>${x.items.length}</b></div></div><p class="cf-note">${t('iv.pr.deleteNote').replace('{branch}', esc(branchLabel(x.r.branchId)))}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const up = {}, prod = LIVE.cache.production || {};
    const moves = mergeMoves(...x.ids.filter(id => prod[id]).map(id => prMoves(prod[id])));
    Object.entries(moves).forEach(([p, q]) => { if (Math.abs(q) > 1e-9) up[p] = LIVE.increment(-q); });
    x.ids.forEach(id => { up[`production/${id}`] = null; });
    try { await LIVE.update(withBatchSeed(up)); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  let deb;
  $('#prQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  [['#prFrom', 'from'], ['#prTo', 'to'], ['#prBr', 'branch'], ['#prSt', 'staff']].forEach(([sel, f]) => $(sel, view).addEventListener('change', e => { st[f] = e.target.value; st.page = 1; draw(); }));
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-pr]'); if (!b) return;
    const a = b.dataset.pr;
    if (a === 'new') return openForm(null);
    if (a === 'export') return allLoaded() && exportExcel();
    if (a === 'report') return allLoaded() && printTable();
    const id = b.closest('tr').dataset.id, x = all().find(g => g.id === id); if (!x) return;
    if (a === 'issue') { const i = (LIVE.cache.stockIssue || {})[x.r.issueId]; if (i) issueDetails(i); else toast(t(LIVE.partial('stockIssue') ? 'waitAll' : 'iv.pr.issueGone'), { tone: 'info', ic: 'info' }); }
    else if (a === 'view') details(x);
    else if (a === 'print') printReport(x);
    else if (a === 'label') printProdLabels(x.r, x.items.map(it => ({ it, copies: 1 })));
    else if (a === 'edit') openForm({ id, r: x.r });
    else if (a === 'delete') remove(x);
  });
  // Card pages: production of the last 30 days, quantities per product, and batches expiring within 7 days
  const closeDrill = kpiDrills(view, { paths: PR_PATHS, ready: () => LIVE.loaded(PR_PATHS), build: kind => {
    const rows = all(), r30 = rows.filter(x => inLast30(x.r)), per = t('kd.last30'), q3 = v => fmtNum(v, 3);
    const open = id => { const x = all().find(y => y.id === id); if (x) details(x); };
    const unitOf = it => (it.unitId && unitName(it.unitId)) || it.unitName || '';
    if (kind === 'v30') return { sub: `${t('production')} · ${per}`, ic: 'factory', file: 'production-30d.xlsx', onRow: open,
      chips: [[t('kd.vouchers'), fmtNum(r30.length)], [t('iv.totalQty'), q3(r30.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0))], [t('kd.branch'), fmtNum(new Set(r30.map(x => x.r.branchId)).size)]],
      cols: [{ h: t('iv.pr.number') }, { h: t('iv.pr.product') }, { h: t('c.qty'), end: 1 }, { h: t('c.branch') }, { h: t('iv.staffOne') }, { h: t('iv.expiry') }, { h: t('c.date') }],
      rows: r30.map(x => ({ id: x.id, text: [x.r.productionNumber, ivStaffLabel(x.r), branchLabel(x.r.branchId), ...x.items.map(prName)].join(' '),
        cells: [`<b class="mono">#${esc(x.r.productionNumber ?? '-')}</b>`, `<span class="cell-2 pr-names">${x.items.map(it => `<b>${esc(prName(it))}</b>`).join('')}</span>`, `<span class="cell-2">${x.items.map(it => `<b class="num">${esc(prQty(it))}</b>`).join('')}</span>`,
          esc(branchLabel(x.r.branchId) || x.r.branchName || '-'), esc(ivStaffLabel(x.r)), `<span class="mono">${esc(x.r.expiryDate || '-')}</span>`, `<span class="date">${fmtDateTime(x.r.createdAt)}</span>`],
        x: { [t('iv.pr.number')]: x.r.productionNumber ?? '', [t('iv.pr.product')]: x.items.map(prName).join('، '), [t('c.qty')]: x.items.reduce((a, i) => a + i.qty, 0), [t('c.branch')]: branchLabel(x.r.branchId) || '', [t('iv.staffOne')]: ivStaffLabel(x.r), [t('iv.expiry')]: x.r.expiryDate || '', [t('c.date')]: fmtDateTime(x.r.createdAt) } })) };
    if (kind === 'qty30') {
      const m = new Map();
      r30.forEach(x => x.items.forEach(it => { const k = it.itemId || prName(it); const g = m.get(k) || { it, qty: 0, ids: new Set() }; g.qty += it.qty; g.ids.add(x.id); m.set(k, g); }));
      const list = [...m.values()].sort((a, b) => b.qty - a.qty), tot = list.reduce((s, g) => s + g.qty, 0);
      return { sub: `${t('production')} · ${t('kd.byItem')} · ${per}`, ic: 'box', file: 'production-qty-30d.xlsx',
        chips: [[t('kd.itemsN'), fmtNum(list.length)], [t('iv.totalQty'), q3(tot)], [t('kd.vouchers'), fmtNum(r30.length)]],
        cols: [{ h: '#' }, { h: t('iv.pr.product') }, { h: t('kd.unit') }, { h: t('kd.vouchers'), end: 1 }, { h: t('iv.totalQty'), end: 1 }, { h: t('kd.share') }],
        rows: list.map((g, i) => { const pct = tot ? (g.qty / tot) * 100 : 0; return { id: null, text: prName(g.it),
          cells: [`<span class="muted">${i + 1}</span>`, `<b>${esc(prName(g.it))}</b>`, esc(unitOf(g.it) || '—'), fmtNum(g.ids.size), `<b>${q3(g.qty)}</b>`, `<span class="kd-share"><i style="--w:${pct.toFixed(1)}%"></i><bdi dir="ltr">${fmtNum(pct, 1)}%</bdi></span>`],
          x: { [t('iv.pr.product')]: prName(g.it), [t('kd.unit')]: unitOf(g.it), [t('kd.vouchers')]: g.ids.size, [t('iv.totalQty')]: +g.qty.toFixed(3) } }; }) };
    }
    if (kind === 'soon') {
      const now = Date.now(), soon = now + 7 * 86400000;
      const lines = rows.flatMap(x => x.items.map(it => { const e = it.expiryDate || x.r.expiryDate; const ts = e ? new Date(`${e}T23:59:59`).getTime() : 0; return { x, it, e, ts }; }))
        .filter(l => l.ts >= now && l.ts <= soon).sort((a, b) => a.ts - b.ts);
      const days = l => Math.max(0, Math.ceil((l.ts - now) / 86400000) - 1);
      return { sub: t('kd.soonSub'), ic: 'clock', file: 'production-expiring-7d.xlsx', onRow: open, empty: t('kd.soonNone'),
        chips: [[t('kd.lines'), fmtNum(lines.length), 'danger'], [t('kd.today'), fmtNum(lines.filter(l => days(l) === 0).length), 'danger']],
        cols: [{ h: t('iv.pr.product') }, { h: t('c.qty'), end: 1 }, { h: t('iv.expiry') }, { h: t('kd.left') }, { h: t('c.branch') }, { h: t('iv.pr.number') }],
        rows: lines.map(l => ({ id: l.x.id, text: `${prName(l.it)} ${l.x.r.productionNumber || ''} ${branchLabel(l.x.r.branchId)}`,
          cells: [`<b>${esc(prName(l.it))}</b>`, esc(prQty(l.it)), `<span class="mono">${esc(l.e)}</span>`, `<span class="badge tone-${days(l) <= 1 ? 'danger' : 'warning'}">${days(l) === 0 ? t('kd.today') : t('kd.daysLeft').replace('{n}', days(l))}</span>`, esc(branchLabel(l.x.r.branchId) || '-'), `<span class="mono">#${esc(l.x.r.productionNumber ?? '-')}</span>`],
          x: { [t('iv.pr.product')]: prName(l.it), [t('c.qty')]: l.it.qty, [t('iv.expiry')]: l.e, [t('c.branch')]: branchLabel(l.x.r.branchId) || '', [t('iv.pr.number')]: l.x.r.productionNumber ?? '' } })) };
    }
    return null;
  } });
  const unsub = LIVE.watch(PR_PATHS, draw);
  draw();
  takeDoc('production', PR_PATHS, id => { const x = all().find(g => g.id === id); if (x) details(x); });
  return () => { unsub(); closeDrill(); freshDrawer(false); };
};

/* =====================================================================
   موظفو الإنتاج — production staff (Arabic + English name, both required)
   ===================================================================== */
PAGES['production-staff'] = view => {
  const st = (S.iv_ps ||= { per: 10, page: 1 });
  const PATHS = ['productionStaff', 'production', 'stockIssue'];
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('production-staff', `<button class="btn btn-primary" data-ps="new">${icon('plus')}<span>${t('iv.ps.new')}</span></button>`, t('iv.ps.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools"><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('c.name')}</th><th class="end">${t('iv.ps.vouchers')}</th><th class="act-col"></th></tr></thead>
        <tbody id="psBody"></tbody></table></div>
      <footer class="pager" id="psPager"></footer>
    </section>`;
  const staff = () => LIVE.cache.productionStaff || {};
  const used = id => Object.values(LIVE.cache.production || {}).filter(p => p && p.productionStaffId === id).length;
  function draw() {
    const body = $('#psBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 3)); return; }
    const list = Object.entries(staff()).filter(([, s]) => s && typeof s === 'object');
    setHtml($('#psPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, s], i) => `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('c.name')}"><b>${esc(staffName(s) || '-')}</b></td>
        <td data-label="${t('iv.ps.vouchers')}" class="end num">${used(id)}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}${actBtn('edit', 'ps', 'pencil', t('edit'))}${actBtn('delete', 'ps', 'trash', t('delete'), 'danger')}</div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="3"><div class="empty-state">${icon('hardhat')}<b>${t('iv.ps.none')}</b><small>${t('iv.ps.noneSub')}</small></div></td></tr>`);
    first = false;
  }
  function openForm(id) {
    const s = id ? staff()[id] : null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(s ? 'pencil' : 'hardhat')}</span><div><h2 id="drawerTitle">${t(s ? 'iv.ps.edit' : 'iv.ps.new')}</h2><p>${t('iv.ps.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="psForm">
        <div class="field"><label for="sAr">${t('it.nameAr')} <em>*</em></label><input id="sAr" dir="rtl" value="${esc(s ? s.nameAr || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="sEn">${t('it.nameEn')} <em>*</em></label><input id="sEn" dir="ltr" value="${esc(s ? s.nameEn || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <small class="err form-err" id="sErr"></small>
      </form>
      <footer class="dr-foot iv-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="sSave">${icon('check')}<span>${t(s ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const setErr = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input', dr).forEach(i => i.addEventListener('input', () => setErr(`#${i.id}`, '')));
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const nameAr = $('#sAr', dr).value.trim(), nameEn = $('#sEn', dr).value.trim();
      setErr('#sAr', nameAr ? '' : t('required')); setErr('#sEn', nameEn ? '' : t('required'));
      if (!nameAr || !nameEn) { shake(dr); return; }
      const btn = $('#sSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`productionStaff/${id}/nameAr`]: nameAr, [`productionStaff/${id}/nameEn`]: nameEn });
        else await LIVE.update({ [`productionStaff/${LIVE.newKey('productionStaff')}`]: { nameAr, nameEn } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { $('#sErr', dr).textContent = t('pm.saveFailed'); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#psForm', dr).addEventListener('submit', save);
    $('#sSave', dr).addEventListener('click', save);
    setTimeout(() => $('#sAr', dr).focus(), 320);
  }
  async function remove(id) {
    const s = staff()[id]; if (!s) return;
    const n = used(id);
    const ok = await confirmDialog({ title: t('iv.ps.deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(staffName(s) || '-')}</b></div><div><small>${t('iv.ps.vouchers')}</small><b>${n}</b></div></div>${n ? `<p class="cf-note">${t('iv.ps.inUseNote')}</p>` : ''}`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`productionStaff/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-ps]'); if (!b) return;
    if (b.dataset.ps === 'new') return openForm(null);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ edit: openForm, delete: remove })[b.dataset.ps](id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};

/* =====================================================================
   استلام — goods received from a named source (typed items, no stock move)
   ===================================================================== */
PAGES.receiving = view => {
  const st = (S.iv_rc ||= { q: '', page: 1, per: 10 });
  const PATHS = ['receiving', 'storageLocations'];
  let first = true, saving = false;
  const locName = id => nameOf((LIVE.cache.storageLocations || {})[id]) || '';
  view.innerHTML = `
    ${pageHeader('receiving', `<button class="btn btn-primary" data-rc="new">${icon('plus')}<span>${t('iv.rc.new')}</span></button>`, t('iv.rc.sub'))}
    <section class="kpis" id="rcK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar"><label class="search-field">${icon('search')}<input type="search" id="rcQ" placeholder="${t('iv.rc.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt iv-table">
        <thead><tr><th>${t('iv.rc.number')}</th><th>${t('iv.rc.source')}</th><th>${t('pm.storekeeper')}</th><th>${t('c.date')}</th><th class="end">${t('c.items')}</th><th>${t('storage-locations')}</th><th class="act-col"></th></tr></thead>
        <tbody id="rcBody"></tbody></table></div>
      <footer class="pager" id="rcPager"></footer>
    </section>`;
  const all = () => Object.entries(LIVE.cache.receiving || {}).filter(([, r]) => r && typeof r === 'object').map(([id, r]) => ({ id, r, items: items$(r.items) })).sort((a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0));
  const locsOf = items => [...new Set(items.map(it => locName(it.storageLocationId)).filter(Boolean))];
  const filtered = rows => { const q = normQ(st.q); return rows.filter(x => !q || normQ([x.r.receivingNumber, x.r.sourceName, x.r.storekeeperName, ...x.items.map(i => `${i.nameAr || ''} ${i.nameEn || ''}`)].join(' ')).includes(q)); };
  function draw() {
    const body = $('#rcBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 7)); $('#rcK', view).innerHTML = skeletonKpis(); return; }
    const rows = all(), r30 = rows.filter(x => inLast30(x.r));
    setKpis($('#rcK', view), [kpiCard({ label: t('iv.rc.k30'), value: r30.length, ic: 'in', tone: 'c1', drill: 'v30' }), kpiCard({ label: t('iv.rc.kItems30'), value: r30.reduce((s, x) => s + x.items.length, 0), ic: 'box', tone: 'c2', drill: 'items30' }),
      kpiCard({ label: t('iv.rc.kSources30'), value: new Set(r30.map(x => normQ(x.r.sourceName)).filter(Boolean)).size, ic: 'truck', tone: 'c4', drill: 'src30' }), kpiAll(rows, t('iv.kTotal'))].join(''), first);
    const list = filtered(rows);
    setHtml($('#rcPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map((x, i) => `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('iv.rc.number')}"><b class="mono">#${esc(x.r.receivingNumber ?? '-')}</b></td>
        <td data-label="${t('iv.rc.source')}"><b>${esc(x.r.sourceName || '-')}</b></td>
        <td data-label="${t('pm.storekeeper')}">${esc(x.r.storekeeperName || '-')}</td>
        <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(x.r.createdAt)}</span></td>
        <td data-label="${t('c.items')}" class="end"><b>${x.items.length}</b></td>
        <td data-label="${t('storage-locations')}">${esc(locsOf(x.items).join('، ') || '-')}</td>
        <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}${actBtn('view', 'rc', 'eye', t('view'))}${actBtn('print', 'rc', 'printer', t('print'))}${actBtn('edit', 'rc', 'pencil', t('edit'))}${actBtn('delete', 'rc', 'trash', t('delete'), 'danger')}</div></td></tr>`).join('')
      : ivEmpty(7, !!st.q, 'in', t('iv.rc.none'), t('iv.rc.noneSub')));
    first = false;
  }
  const meta = r => [[t('iv.rc.source'), r.sourceName || '-'], [t('c.date'), fmtDateTime(r.createdAt)], [t('pm.storekeeper'), r.storekeeperName || '-'], [t('c.items'), String(items$(r.items).length)]];
  const printRc = r => printDoc(`${t('iv.rc.voucher')} #${r.receivingNumber ?? ''}`, meta(r), [t('it.nameAr'), t('it.nameEn'), t('c.qty'), t('iv.rc.location')],
    items$(r.items).map(it => [it.nameAr || '-', it.nameEn || '-', qtyFmt(it.qty), locName(it.storageLocationId) || '-']));
  function details(id) {
    const r = (LIVE.cache.receiving || {})[id]; if (!r) return;
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('in')}</span><div><h2 id="drawerTitle">${t('iv.rc.voucher')} #${esc(r.receivingNumber ?? '-')}</h2><p>${esc(r.sourceName || '-')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body"><div class="info-grid">${meta(r).map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('c.qty')}</th><th>${t('iv.rc.location')}</th></tr></thead>
        <tbody>${items$(r.items).map(it => `<tr><td data-label="${t('c.name')}"><b>${esc(nameOf(it) || '-')}</b></td><td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.qty)}</td><td data-label="${t('iv.rc.location')}">${esc(locName(it.storageLocationId) || '-')}</td></tr>`).join('')}</tbody></table></div></div>
      <footer class="dr-foot iv-foot"><button class="btn btn-ghost" data-d="print">${icon('printer')}<span>${t('print')}</span></button><span class="tb-spacer"></span><button class="btn btn-ghost" data-d="edit">${icon('pencil')}<span>${t('edit')}</span></button></footer>`;
    openLayer('#drawer');
    dr.onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; if (b.dataset.d === 'print') printRc(r); else { dr.onclick = null; openForm(id); } };
  }
  function openForm(id) {
    const r = id ? (LIVE.cache.receiving || {})[id] : null;
    const d = { source: r ? r.sourceName || '' : '', items: r ? items$(r.items).map(it => ({ ...it })) : [] };
    const locOpts = val => `<option value="">${t('iv.choose')}</option>` + Object.entries(LIVE.cache.storageLocations || {}).map(([lid, l]) => `<option value="${esc(lid)}" ${val === lid ? 'selected' : ''}>${esc(nameOf(l) || lid)}</option>`).join('');
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(r ? 'pencil' : 'in')}</span><div><h2 id="drawerTitle">${r ? `${t('edit')} ${t('iv.rc.voucher')} #${esc(r.receivingNumber ?? '')}` : t('iv.rc.new')}</h2><p>${t('iv.rc.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body pu-form">
        <div class="form-grid">
          <div class="field"><label for="rSrc">${t('iv.rc.source')} <em>*</em></label><input id="rSrc" value="${esc(d.source)}" autocomplete="off" dir="auto"><small class="err"></small></div>
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(r ? r.storekeeperName || '-' : me().name)}" readonly></div>
        </div>
        <section class="picker rc-entry">
          <div class="picker-head"><b>${t('iv.rc.addItem')}</b></div>
          <div class="form-grid">
            <div class="field"><label for="iAr">${t('it.nameAr')}</label><input id="iAr" dir="rtl" autocomplete="off"></div>
            <div class="field"><label for="iEn">${t('it.nameEn')}</label><input id="iEn" dir="ltr" autocomplete="off"></div>
            <div class="field"><label for="iQty">${t('c.qty')}</label><input id="iQty" type="number" min="0" step="0.01" inputmode="decimal"></div>
            <div class="field"><label for="iLoc">${t('iv.rc.location')}</label><div class="select"><select id="iLoc">${locOpts('')}</select>${icon('chevDown')}</div></div>
          </div>
          <div class="rc-add"><small class="err" id="iErr"></small><button type="button" class="btn btn-ghost" id="iAdd">${icon('plus')}<span>${t('add')}</span></button></div>
        </section>
        <section class="draft"><div class="draft-head"><b>${t('c.items')}</b><span class="muted" id="rCount"></span></div><div id="rItems"></div><small class="err" id="rItemsErr"></small></section>
      </div>
      <footer class="dr-foot iv-foot"><span class="tb-spacer"></span>${r ? '' : `<label class="check-line"><input type="checkbox" id="rPrint"> ${t('sr.printAfter')}</label>`}
        <button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="rSave">${icon('check')}<span>${r ? t('save') : t('iv.rc.submit')}</span></button></footer>`;
    openLayer('#drawer');
    const drawItems = flash => {
      $('#rItems', dr).innerHTML = d.items.length ? d.items.map((it, i) => `<div class="line rc-line" data-i="${i}">
          <div class="line-name"><b>${esc(nameOf(it) || '-')}</b><small class="muted">${t('c.qty')}: ${qtyFmt(it.qty)} · ${t('iv.rc.location')}: ${esc(locName(it.storageLocationId) || '-')}</small></div>
          <button class="btn-icon sm" data-f="edit" aria-label="${t('edit')}">${icon('pencil')}</button><button class="btn-icon sm danger" data-f="del" aria-label="${t('delete')}">${icon('trash')}</button></div>`).join('')
        : `<div class="empty-state sm">${icon('in')}<b>${t('pu.noItems')}</b><small>${t('iv.rc.noItemsSub')}</small></div>`;
      $('#rCount', dr).textContent = d.items.length ? `${d.items.length} ${t('pu.itemsWord')}` : '';
      if (flash != null) { const el = $(`.line[data-i="${flash}"]`, dr); el && el.classList.add('flash-in'); }
    };
    const add = () => {
      const nameAr = $('#iAr', dr).value.trim(), nameEn = $('#iEn', dr).value.trim(), qty = Number(String($('#iQty', dr).value).replace(',', '.')), loc = $('#iLoc', dr).value;
      if (!nameAr || !nameEn || !qty || Number.isNaN(qty) || !loc) { $('#iErr', dr).textContent = t('iv.rc.allFields'); shake($('.rc-entry', dr)); return; }
      $('#iErr', dr).textContent = ''; $('#rItemsErr', dr).textContent = '';
      d.items.push({ nameAr, nameEn, qty, storageLocationId: loc });
      ['#iAr', '#iEn', '#iQty', '#iLoc'].forEach(s => { $(s, dr).value = ''; });
      drawItems(d.items.length - 1); $('#iAr', dr).focus();
    };
    drawItems();
    $('#iAdd', dr).addEventListener('click', add);
    $('#iQty', dr).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    $('#rSrc', dr).addEventListener('input', e => { d.source = e.target.value.trim(); const f = e.target.closest('.field'); f.classList.remove('invalid'); $('.err', f).textContent = ''; });
    $('#rItems', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const i = +b.closest('.line').dataset.i, it = d.items[i];
      // Edit moves the line back into the entry fields (as in the old page)
      if (b.dataset.f === 'edit') { $('#iAr', dr).value = it.nameAr || ''; $('#iEn', dr).value = it.nameEn || ''; $('#iQty', dr).value = it.qty || ''; $('#iLoc', dr).value = it.storageLocationId || ''; $('#iAr', dr).focus(); }
      d.items.splice(i, 1); drawItems();
    });
    $('#rSave', dr).addEventListener('click', async () => {
      if (saving) return;
      const f = $('#rSrc', dr).closest('.field');
      f.classList.toggle('invalid', !d.source); $('.err', f).textContent = d.source ? '' : t('required');
      $('#rItemsErr', dr).textContent = d.items.length ? '' : t('pu.needItems');
      if (!d.source || !d.items.length) { shake(dr); return; }
      const wantPrint = !!($('#rPrint', dr) || {}).checked;
      const btn = $('#rSave', dr); saving = true; btn.classList.add('loading');
      try {
        const items = d.items.map(it => clean({ nameAr: it.nameAr, nameEn: it.nameEn, qty: Number(it.qty), storageLocationId: it.storageLocationId }));
        if (id) {
          if (!(LIVE.cache.receiving || {})[id]) { toast(t('sr.goneElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
          await LIVE.update({ [`receiving/${id}/sourceName`]: d.source, [`receiving/${id}/items`]: items });
          toast(t('saved'));
          closeLayers();
        } else {
          const num = await LIVE.counter('meta/receivingCounter');
          const rec = { receivingNumber: num, createdAt: Date.now(), sourceName: d.source, storekeeperId: me().id || null, storekeeperName: me().name || null, items };
          await LIVE.update({ [`receiving/${LIVE.newKey('receiving')}`]: { ...rec, createdAt: LIVE.now() } });
          toast(`${t('iv.rc.voucher')} #${num} — ${t('saved')}`);
          closeLayers();
          if (wantPrint) printRc(rec);
        }
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
    setTimeout(() => $('#rSrc', dr).focus(), 350);
  }
  async function remove(id) {
    const r = (LIVE.cache.receiving || {})[id]; if (!r) return;
    const ok = await confirmDialog({ title: t('iv.rc.deleteQ'), body: `<div class="cf-sum"><div><small>${t('iv.rc.number')}</small><b>#${esc(r.receivingNumber ?? '-')}</b></div><div><small>${t('iv.rc.source')}</small><b>${esc(r.sourceName || '-')}</b></div></div>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`receiving/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  let deb;
  $('#rcQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-rc]'); if (!b) return;
    if (b.dataset.rc === 'new') return openForm(null);
    const id = b.closest('tr').dataset.id, r = (LIVE.cache.receiving || {})[id]; if (!r) return;
    ({ view: () => details(id), print: () => printRc(r), edit: () => openForm(id), delete: () => remove(id) })[b.dataset.rc]();
  });
  // Card pages: receiving of the last 30 days — vouchers, received lines, and sources
  const closeDrill = kpiDrills(view, { paths: PATHS, ready: () => LIVE.loaded(PATHS), build: kind => {
    const r30 = all().filter(x => inLast30(x.r)), per = t('kd.last30'), q3 = v => fmtNum(v, 3);
    const lines = () => r30.flatMap(x => x.items.map(it => ({ x, it })));
    if (kind === 'v30') return { sub: `${t('receiving')} · ${per}`, ic: 'in', file: 'receiving-30d.xlsx', onRow: details,
      chips: [[t('kd.vouchers'), fmtNum(r30.length)], [t('kd.lines'), fmtNum(lines().length)], [t('iv.rc.source'), fmtNum(new Set(r30.map(x => normQ(x.r.sourceName)).filter(Boolean)).size)]],
      cols: [{ h: t('iv.rc.number') }, { h: t('iv.rc.source') }, { h: t('pm.storekeeper') }, { h: t('c.items'), end: 1 }, { h: t('storage-locations') }, { h: t('c.date') }],
      rows: r30.map(x => ({ id: x.id, text: [x.r.receivingNumber, x.r.sourceName, x.r.storekeeperName, ...x.items.map(liveItemName)].join(' '),
        cells: [`<b class="mono">#${esc(x.r.receivingNumber ?? '-')}</b>`, `<b>${esc(x.r.sourceName || '-')}</b>`, esc(x.r.storekeeperName || '-'), fmtNum(x.items.length), esc(locsOf(x.items).join('، ') || '—'), `<span class="date">${fmtDateTime(x.r.createdAt)}</span>`],
        x: { [t('iv.rc.number')]: x.r.receivingNumber ?? '', [t('iv.rc.source')]: x.r.sourceName || '', [t('pm.storekeeper')]: x.r.storekeeperName || '', [t('c.items')]: x.items.length, [t('storage-locations')]: locsOf(x.items).join('، '), [t('c.date')]: fmtDateTime(x.r.createdAt) } })) };
    if (kind === 'items30') {
      const ls = lines();
      return { sub: `${t('receiving')} · ${per}`, ic: 'box', file: 'receiving-lines-30d.xlsx', onRow: details,
        chips: [[t('kd.lines'), fmtNum(ls.length)], [t('kd.itemsN'), fmtNum(new Set(ls.map(l => l.it.itemId || liveItemName(l.it))).size)], [t('kd.vouchers'), fmtNum(r30.length)]],
        cols: [{ h: t('kd.item') }, { h: t('c.qty'), end: 1 }, { h: t('kd.unit') }, { h: t('storage-locations') }, { h: t('iv.rc.source') }, { h: t('iv.rc.number') }, { h: t('c.date') }],
        rows: ls.map(l => { const u = (l.it.unitId && unitName(l.it.unitId)) || l.it.unitName || ''; return { id: l.x.id, text: `${liveItemName(l.it)} ${l.x.r.sourceName || ''} ${l.x.r.receivingNumber || ''}`,
          cells: [`<b>${esc(liveItemName(l.it))}</b>`, q3(Number(l.it.qty || 0)), esc(u || '—'), esc(locName(l.it.storageLocationId) || '—'), esc(l.x.r.sourceName || '-'), `<span class="mono">#${esc(l.x.r.receivingNumber ?? '-')}</span>`, `<span class="date">${fmtDateTime(l.x.r.createdAt)}</span>`],
          x: { [t('kd.item')]: liveItemName(l.it), [t('c.qty')]: Number(l.it.qty || 0), [t('kd.unit')]: u, [t('storage-locations')]: locName(l.it.storageLocationId) || '', [t('iv.rc.source')]: l.x.r.sourceName || '', [t('iv.rc.number')]: l.x.r.receivingNumber ?? '', [t('c.date')]: fmtDateTime(l.x.r.createdAt) } }; }) };
    }
    if (kind === 'src30') return kdBreakdown({ title: '', sub: `${t('receiving')} · ${per}`, ic: 'truck', file: 'receiving-sources-30d.xlsx', groupH: t('iv.rc.source'), countH: t('kd.vouchers'), valueH: t('kd.lines'), kind: 'num',
      items: kdGroup(r30, x => normQ(x.r.sourceName) || '-', x => x.r.sourceName || '-', x => x.items.length) });
    return null;
  } });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); closeDrill(); freshDrawer(false); };
};

/* =====================================================================
   طلبات تحويل الكاشير — shortage requests sent from the cashier app:
   pending → accepted → sent (stock leaves the main branch) → received in the cashier
   ===================================================================== */
const CR_GROUPS = ['sweets', 'tableware', 'supplies', 'other'];
const crGroup = g => (CR_GROUPS.includes(String(g || '').toLowerCase().trim()) ? String(g).toLowerCase().trim() : 'other');
const CR_TONE = { pending: 'warning', accepted: 'info', sent: 'accent', transferred: 'success', received: 'success', partial_received: 'warning', rejected: 'danger' };
const crStatus = r => (CR_TONE[r && r.status] ? r.status : 'pending');
const crBranch = r => (r.branchId ? branchLabel(r.branchId) : r.branch || r.branchName || '-');
const crTypeLabel = type => t(type === 'stock' || type === 'material' ? 'stock-materials' : 'products');
function crNames(it) {
  const data = itemData(ivType(it), it.itemId) || {};
  const u = unitName(it.unitId || data.unitId);
  const ar = it.nameAr || it.name || nameOf(data) || '-', en = it.nameEn || data.nameEn || '';
  return { ar: u ? `${ar} (${u})` : ar, en: en && normQ(en) !== normQ(ar) ? (u ? `${en} (${u})` : en) : '-' };
}
const crExecutor = r => r.sentBy || r.processedBy || ((LIVE.cache.cashierTransfers || {})[r.transferId] || {}).storekeeperName || '-';
const crMeta = r => [[t('iv.cr.number'), r.requestNumber || '-'], [t('c.branch'), crBranch(r)], [t('iv.cr.requester'), r.cashierName || '-'], [t('iv.cr.executor'), crExecutor(r)],
  [t('c.date'), fmtDateTime(r.createdAt)], [t('c.status'), t(`iv.cr.s.${crStatus(r)}`)],
  ...(r.status === 'received' || r.status === 'partial_received' ? [[t('iv.cr.receiver'), r.receivedByCashier || r.receivedBy || '-']] : [])];

PAGES['cashier-requests'] = view => {
  const st = (S.iv_cr ||= { q: '', page: 1, per: 10 });
  const PATHS = ['transferRequests', 'cashierTransfers', 'branches', 'products', 'stockMaterials', 'units', 'production'];
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('cashier-requests', '', t('iv.cr.sub'))}
    <section class="kpis" id="crK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar"><label class="search-field">${icon('search')}<input type="search" id="crQ" placeholder="${t('iv.cr.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt iv-table">
        <thead><tr><th>${t('iv.cr.number')}</th><th>${t('c.branch')}</th><th>${t('iv.cr.cashier')}</th><th>${t('c.date')}</th><th class="end">${t('c.items')}</th><th>${t('c.status')}</th><th class="act-col"></th></tr></thead>
        <tbody id="crBody"></tbody></table></div>
      <footer class="pager" id="crPager"></footer>
    </section>`;
  const all = () => Object.entries(LIVE.cache.transferRequests || {}).filter(([, r]) => r && typeof r === 'object').map(([id, r]) => ({ id, r, items: items$(r.items) })).sort((a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0));
  const filtered = rows => { const q = normQ(st.q); return rows.filter(x => !q || normQ([x.r.requestNumber, crBranch(x.r), x.r.cashierName, t(`iv.cr.s.${crStatus(x.r)}`), ...x.items.map(i => `${i.nameAr || i.name || ''} ${i.nameEn || ''}`)].join(' ')).includes(q)); };
  const actions = r => {
    const s = crStatus(r);
    if (s === 'pending') return `${actBtn('view', 'cr', 'eye', t('view'))}<button class="btn btn-sm btn-approve" data-cr="accept">${icon('check')}<span>${t('iv.cr.accept')}</span></button>`;
    if (s === 'accepted') return `${actBtn('view', 'cr', 'eye', t('view'))}${actBtn('print', 'cr', 'printer', t('print'))}<button class="btn btn-sm btn-primary" data-cr="deliver">${icon('send')}<span>${t('iv.cr.deliver')}</span></button>`;
    if (['sent', 'received', 'transferred', 'partial_received'].includes(s)) return `${actBtn('view', 'cr', 'eye', t('view'))}${actBtn('print', 'cr', 'printer', t('iv.cr.pdf'))}${actBtn('sheet', 'cr', 'barcode', t('iv.cr.sheet'))}`;
    return '';
  };
  function draw() {
    const body = $('#crBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 7)); $('#crK', view).innerHTML = skeletonKpis(); return; }
    const rows = all(), cnt = s => rows.filter(x => crStatus(x.r) === s).length;
    setKpis($('#crK', view), [kpiCard({ label: t('iv.cr.s.pending'), value: cnt('pending'), ic: 'clock', tone: 'c4', drill: 'pending' }), kpiCard({ label: t('iv.cr.s.accepted'), value: cnt('accepted'), ic: 'clipcheck', tone: 'c2', drill: 'accepted' }),
      kpiCard({ label: t('iv.cr.s.sent'), value: cnt('sent'), ic: 'send', tone: 'c1', drill: 'sent' }), kpiAll(rows, t('iv.cr.kTotal'))].join(''), first);
    const list = filtered(rows);
    setHtml($('#crPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map((x, i) => `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('iv.cr.number')}"><b class="mono">${esc(x.r.requestNumber || '-')}</b></td>
        <td data-label="${t('c.branch')}">${esc(crBranch(x.r))}</td>
        <td data-label="${t('iv.cr.cashier')}">${esc(x.r.cashierName || '-')}</td>
        <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(x.r.createdAt)}</span></td>
        <td data-label="${t('c.items')}" class="end"><b>${x.items.length}</b></td>
        <td data-label="${t('c.status')}"><span class="badge tone-${CR_TONE[crStatus(x.r)]}"><i></i>${t(`iv.cr.s.${crStatus(x.r)}`)}</span></td>
        <td class="act-col"><div class="row-acts pm-acts cr-acts">${actions(x.r) ? rowMenuBtn() : ""}${actions(x.r)}</div></td></tr>`).join('')
      : ivEmpty(7, !!st.q, 'send', t('iv.cr.none'), t('iv.cr.noneSub')));
    first = false;
  }

  async function accept(id) {
    const cur = (LIVE.cache.transferRequests || {})[id];
    if (!cur || crStatus(cur) !== 'pending') { toast(t('pm.alreadyDecided'), { tone: 'info', ic: 'info' }); return; }
    try {
      await LIVE.update({ [`transferRequests/${id}/status`]: 'accepted', [`transferRequests/${id}/alertAcknowledged`]: true, [`transferRequests/${id}/acceptedAt`]: LIVE.now(), [`transferRequests/${id}/acceptedBy`]: me().name || null });
      toast(`${cur.requestNumber || ''} — ${t('iv.cr.accepted')}`);
    } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  function deliver(id) {
    const r = (LIVE.cache.transferRequests || {})[id]; if (!r) return;
    const its = items$(r.items);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('send')}</span><div><h2 id="drawerTitle">${t('iv.cr.deliverTitle')} ${esc(r.requestNumber || '')}</h2><p>${esc(crBranch(r))} · ${esc(r.cashierName || '-')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="rcv-tools"><button class="btn btn-ghost" id="cFill">${icon('check')}<span>${t('iv.cr.fillAll')}</span></button><span class="muted">${t('iv.cr.deliverNote').replace('{branch}', esc(branchLabel(mainBranch())))}</span></div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('iv.cr.requested')}</th><th class="end">${t('iv.cr.sentQty')}</th></tr></thead>
          <tbody>${its.map((it, i) => `<tr data-row="${i}"><td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(itemLabel(it))}</b><small>${t(`iv.cr.g.${crGroup(it.groupKey)}`)}</small></span>${it.itemId && multiLoc(ivType(it), it.itemId, mainBranch()) ? locPick(ivType(it), it.itemId, 'out', it.locId || '') : ''}</td>
            <td data-label="${t('iv.cr.requested')}" class="end num">${qtyFmt(Number(it.requestedQty || it.qty || 0))}</td>
            <td data-label="${t('iv.cr.sentQty')}" class="end"><input class="qty-in" data-i="${i}" inputmode="decimal" value="${it.sentQty ?? ''}" autocomplete="off"></td></tr>`).join('')}</tbody></table></div>
        <small class="err" id="cErr"></small>
      </div>
      <footer class="dr-foot iv-foot"><span class="tb-spacer"></span><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="cSend">${icon('send')}<span>${t('iv.cr.send')}</span></button></footer>`;
    openLayer('#drawer');
    $('#cFill', dr).addEventListener('click', () => $$('.qty-in', dr).forEach(inp => { const it = its[+inp.dataset.i]; inp.value = Number(it.requestedQty || it.qty || 0); }));
    $$('.qty-in', dr).forEach(inp => inp.addEventListener('input', () => { inp.value = toLatin(inp.value).replace(/[^0-9.]/g, ''); }));
    const placeOf = i => { const s = $(`tr[data-row="${i}"] [data-f="loc"]`, dr); return s ? s.value || null : null; };
    $('#cSend', dr).addEventListener('click', async () => {
      if (saving) return;
      const cur = (LIVE.cache.transferRequests || {})[id];
      if (!cur) { toast(t('sr.goneElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
      const main = mainBranch();
      if (!main) { $('#cErr', dr).textContent = t('sr.noMain'); return; }
      const inputs = $$('.qty-in', dr);
      const items = items$(cur.items).map((it, i) => ({ ...it, requestedQty: Number(it.requestedQty || it.qty || 0), sentQty: Number(toLatin((inputs[i] || {}).value || '0')) || 0, locId: placeOf(i) }));
      if (!items.length || items.some(it => it.sentQty < 0)) { $('#cErr', dr).textContent = t('iv.cr.badQty'); return; }
      const noLoc = needLocName(items.filter(it => it.itemId).map(it => ({ ...it, qty: it.sentQty })), main, l => itemLabel(l));
      if (noLoc) { $('#cErr', dr).textContent = t('sl.needLoc').replace('{name}', noLoc); return; }
      // Sending takes the sent quantities out of the main branch in the same save (all or nothing);
      // the branch adds what it actually receives when it confirms receipt in the cashier.
      const already = !!cur.stockSentAt || cur.status !== 'accepted';
      const base = `transferRequests/${id}`;
      const up = { [`${base}/status`]: 'sent', [`${base}/sentAt`]: LIVE.now(), [`${base}/sentBy`]: me().name || null, [`${base}/items`]: clean(items), [`${base}/sentItems`]: clean(items) };
      if (!already) {
        up[`${base}/stockSentAt`] = LIVE.now(); up[`${base}/stockSentFromBranchId`] = main;
        // Products leave main from their first-expiring batches; the split is kept on the line
        const taken = {};
        items.forEach(it => {
          if (!it.sentQty || ivType(it) !== 'product' || !itemData('product', it.itemId)) return;
          const { alloc } = fefoAlloc(it.itemId, main, it.sentQty, taken);
          Object.entries(alloc).forEach(([k2, q]) => { const pth = batchPath(it.itemId, k2, main); taken[pth] = (taken[pth] || 0) + q; });
          taken[stockKey('product', it.itemId, main)] = (taken[stockKey('product', it.itemId, main)] || 0) + Object.values(alloc).reduce((a, q) => a + q, 0);
          if (Object.keys(alloc).length) it.alloc = alloc;
        });
        up[`${base}/items`] = clean(items); up[`${base}/sentItems`] = clean(items);
        Object.entries(sumByPath(items.filter(it => it.sentQty && it.itemId).flatMap(it => [[stockKey(ivType(it), it.itemId, main), it.sentQty],
          ...Object.entries(it.alloc || {}).map(([k2, q]) => [batchPath(it.itemId, k2, main), q]),
          ...Object.entries(locMovesOf([{ ...it, qty: it.sentQty }], main, 1))]))).forEach(([p, q]) => { up[p] = LIVE.increment(-q); });
      }
      const btn = $('#cSend', dr); saving = true; btn.classList.add('loading');
      try { await LIVE.update(withBatchSeed(up)); toast(`${cur.requestNumber || ''} — ${t('iv.cr.sentOk')}`); closeLayers(); }
      catch (e) { $('#cErr', dr).textContent = t('pm.saveFailed'); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
  }

  function details(id) {
    const r = (LIVE.cache.transferRequests || {})[id]; if (!r) return;
    const its = items$(r.items);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('send')}</span><div><h2 id="drawerTitle">${t('iv.cr.details')} ${esc(r.requestNumber || '')}</h2><p>${esc(crBranch(r))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">${crMeta(r).map(([a, b]) => `<div><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>
        <div class="cr-groups">${CR_GROUPS.map(g => {
          const rows = its.filter(it => crGroup(it.groupKey) === g);
          return `<section class="cr-col"><header><b>${t(`iv.cr.g.${g}`)}</b><button class="btn-icon sm" data-g="${g}" ${rows.length ? '' : 'disabled'} aria-label="${t('print')}" data-tip="${t('print')}" data-tip-always>${icon('printer')}</button></header>
            ${rows.length ? rows.map(it => `<div class="cr-item"><b>${esc(itemLabel(it))}</b>
              <small class="muted">${crTypeLabel(it.itemType)} · ${t('iv.cr.requested')}: ${qtyFmt(Number(it.requestedQty || it.qty || 0))}${it.sentQty != null ? ` · ${t('iv.cr.sentQty')}: ${qtyFmt(Number(it.sentQty))}` : ''}</small></div>`).join('') : `<p class="muted">${t('iv.none')}</p>`}</section>`;
        }).join('')}</div>
      </div>
      <footer class="dr-foot iv-foot"><button class="btn btn-ghost" data-d="sheet">${icon('barcode')}<span>${t('iv.cr.sheet')}</span></button><span class="tb-spacer"></span><button class="btn btn-primary" data-d="print">${icon('printer')}<span>${t('iv.cr.printFull')}</span></button></footer>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const g = e.target.closest('[data-g]'); if (g) { printGroup(r, g.dataset.g); return; }
      const b = e.target.closest('[data-d]'); if (!b) return;
      b.dataset.d === 'print' ? printFull(r) : printSheet(r);
    };
  }

  function printGroup(r, g) {
    const rows = items$(r.items).filter(it => crGroup(it.groupKey) === g);
    printDoc(t('cashier-requests'), [...crMeta(r), [t('iv.cr.group'), t(`iv.cr.g.${g}`)]], [t('iv.rowNo'), t('it.nameAr'), t('it.nameEn'), t('c.type'), t('c.qty')],
      rows.map((it, i) => [i + 1, crNames(it).ar, crNames(it).en, crTypeLabel(it.itemType), qtyFmt(Number(it.qty || it.requestedQty || 0))]));
  }
  function printFull(r) {
    printDoc(t('cashier-requests'), crMeta(r), [t('iv.rowNo'), t('it.nameAr'), t('it.nameEn'), t('iv.cr.group'), t('c.type'), t('iv.cr.requested'), t('iv.cr.sentQty'), t('iv.cr.receivedQty')],
      items$(r.items).map((it, i) => [i + 1, crNames(it).ar, crNames(it).en, t(`iv.cr.g.${crGroup(it.groupKey)}`), crTypeLabel(it.itemType), qtyFmt(Number(it.requestedQty || it.qty || 0)), qtyFmt(Number(it.sentQty || 0)), qtyFmt(Number(it.receivedQty || 0))]),
      r.status === 'received' ? [[t('iv.cr.ack'), t('iv.cr.ackText').replace('{name}', r.receivedByCashier || r.cashierName || '-')], [t('iv.cr.receivedAt'), fmtDateTime(r.receivedAt)]] : null);
  }
  /* The A4 sheet handed over with the goods: its barcode opens the receipt in the cashier */
  async function printSheet(r) {
    const m = /^TR-(\d{8})-(\d+)$/.exec(String(r.requestNumber || ''));
    if (!m) { toast(t('iv.cr.noBarcode'), { tone: 'danger', ic: 'alert' }); return; }
    try { await needLib('JsBarcode'); } catch (e) { libFailed(); return; }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, `990${m[1]}${m[2]}`, { format: 'CODE128', displayValue: true, height: 140, width: 3, margin: 24, fontSize: 24 });
    printHtml(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ورقة تسليم نواقص</title>
      <style>@page{size:A4 portrait;margin:18mm}body{font-family:Tahoma,Arial,sans-serif;color:#000;margin:0}.head{text-align:center}.logo svg{width:110px;height:110px}h1{font-size:36px;margin:20px 0 40px}.meta{font-size:23px;line-height:2.1}.barcode{text-align:center;margin-top:55px;direction:ltr}.barcode svg{max-width:100%;height:auto}.hint{text-align:center;font-size:18px;margin-top:25px}</style></head><body>
      <div class="head"><div class="logo">${LOGO}</div><h1>ورقة تسليم نواقص</h1></div>
      <div class="meta"><div><strong>مقدم الطلب:</strong> ${esc(r.cashierName || '-')}</div><div><strong>منفذ الطلب:</strong> ${esc(crExecutor(r))}</div>
      <div><strong>تاريخ الطلب:</strong> ${esc(fmtDateTime(r.createdAt))}</div><div><strong>رقم الطلب:</strong> ${esc(r.requestNumber || '-')}</div><div><strong>الفرع:</strong> ${esc(crBranch(r))}</div></div>
      <div class="barcode">${svg.outerHTML}</div><p class="hint">امسح الباركود في شاشة الكاشير لفتح استلام هذا الطلب</p></body></html>`);
  }

  let deb;
  $('#crQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-cr]'); if (!b) return;
    const id = b.closest('tr').dataset.id, r = (LIVE.cache.transferRequests || {})[id]; if (!r) return;
    ({ accept: () => accept(id), deliver: () => deliver(id), view: () => details(id), print: () => printFull(r), sheet: () => printSheet(r) })[b.dataset.cr]();
  });
  // Card pages: the requests in one status, oldest waiting first, with their items
  const closeDrill = kpiDrills(view, { paths: PATHS, ready: () => LIVE.loaded(PATHS), build: kind => {
    if (!['pending', 'accepted', 'sent'].includes(kind)) return null;
    const list = all().filter(x => crStatus(x.r) === kind).sort((a, b) => (a.r.createdAt || 0) - (b.r.createdAt || 0));
    const age = x => Math.floor((Date.now() - (x.r.createdAt || Date.now())) / 86400000);
    return { sub: t('iv.cr.sub'), ic: { pending: 'clock', accepted: 'clipcheck', sent: 'send' }[kind], file: `cashier-requests-${kind}.xlsx`, onRow: details,
      chips: [[t('kd.rows'), fmtNum(list.length)], [t('kd.lines'), fmtNum(list.reduce((s2, x) => s2 + x.items.length, 0))], [t('kd.branch'), fmtNum(new Set(list.map(x => crBranch(x.r))).size)]],
      cols: [{ h: t('iv.cr.number') }, { h: t('c.branch') }, { h: t('iv.cr.cashier') }, { h: t('c.items') }, { h: t('c.date') }, { h: t('kd.waiting') }],
      rows: list.map(x => ({ id: x.id, text: [x.r.requestNumber, crBranch(x.r), x.r.cashierName, ...x.items.map(i => i.nameAr || i.name || '')].join(' '),
        cells: [`<b class="mono">${esc(x.r.requestNumber || '-')}</b>`, esc(crBranch(x.r)), esc(x.r.cashierName || '-'),
          `<span class="cell-2 items-cell"><b>${x.items.length} ${t('pu.itemsWord')}</b><small>${esc(x.items.slice(0, 3).map(i => nameOf(i) || i.name || '-').join('، '))}${x.items.length > 3 ? '…' : ''}</small></span>`,
          `<span class="date">${fmtDateTime(x.r.createdAt)}</span>`, age(x) ? `<span class="badge tone-${age(x) >= 2 ? 'danger' : 'warning'}">${t('kd.daysN').replace('{n}', age(x))}</span>` : `<span class="badge tone-neutral">${t('kd.todayShort')}</span>`],
        x: { [t('iv.cr.number')]: x.r.requestNumber || '', [t('c.branch')]: crBranch(x.r), [t('iv.cr.cashier')]: x.r.cashierName || '', [t('c.items')]: x.items.map(i => `${nameOf(i) || i.name || '-'} × ${i.qty ?? ''}`).join('، '), [t('c.date')]: fmtDateTime(x.r.createdAt) } })) };
  } });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  takeDoc('cashier-requests', PATHS, details);
  return () => { unsub(); closeDrill(); freshDrawer(false); };
};
