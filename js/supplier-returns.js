/* مرتجع للمورد (supplier returns) — live page.
   Same data as the old accounting page: supplierReturns, meta/supplierReturnCounter,
   and the stock of the main branch (the stock-movement report reads returns from there). */

LIVE_ROUTES.add('supplier-returns');

// The list shows as soon as SR_PATHS arrive; the catalog for the form follows in the background.
const SR_PATHS = ['supplierReturns', 'suppliers', 'branches', 'units'];
const SR_CATALOG = ['products', 'stockMaterials', 'production', 'purchaseReceipts'];
const SR_REASONS = ['damaged', 'expired', 'wrong', 'other'];
const mainBranchId = () => (Object.entries(LIVE.cache.branches || {}).find(([, b]) => b.isMain) || [])[0] || '';
const srItems = r => items$(r && r.items).map(it => ({ ...it, itemType: itemType(it), itemId: it.itemId || it.id, qty: Number(it.qty || 0) }));
const srTotal = r => srItems(r).reduce((s, it) => s + it.qty * Number(it.unitPrice || 0), 0);
const srHasPrices = r => srItems(r).some(it => it.unitPrice != null);
const srSupName = r => nameOf((LIVE.cache.suppliers || {})[r.supplierId]) || r.supplierName || '-';
/* Quantity per item (all batches together) — what the stock actually moves by */
const qtyByItem = items => { const m = {}; items.forEach(it => { const k = keyOf(it); m[k] = (m[k] || 0) + Number(it.qty || 0); }); return m; };

PAGES['supplier-returns'] = view => {
  const st = (S.sr ||= { q: '', supplier: 'all', from: '', to: '', page: 1 });
  let first = true, saving = false;

  view.innerHTML = `
    ${pageHeader('supplier-returns', `<button class="btn btn-ghost" data-sr="export">${icon('download')}<span>${t('export')}</span></button>
      <button class="btn btn-primary" data-sr="new">${icon('plus')}<span>${t('sr.new')}</span></button>`, t('sr.sub'))}
    <section class="kpis" id="srK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="srQ" placeholder="${t('sr.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <div class="select tb-select">${icon('chevDown')}<select id="srSup" aria-label="${t('c.supplier')}"></select></div>
        <label class="date-field"><small>${t('c.from')}</small><input type="date" id="srFrom" value="${st.from}"></label>
        <label class="date-field"><small>${t('c.to')}</small><input type="date" id="srTo" value="${st.to}"></label>
      </div>
      <div class="table-wrap"><table class="dt sr-table">
        <thead><tr><th>${t('sr.number')}</th><th>${t('c.supplier')}</th><th>${t('c.date')}</th><th>${t('c.items')}</th><th class="end">${t('pm.value')}</th><th>${t('sr.reason')}</th><th class="act-col"></th></tr></thead>
        <tbody id="srBody"></tbody>
      </table></div>
      <footer class="pager" id="srPager"></footer>
    </section>`;

  const all = () => Object.entries(LIVE.cache.supplierReturns || {}).map(([id, r]) => ({ id, r, items: srItems(r), total: srTotal(r) }))
    .sort((a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0));
  const filtered = rows => {
    const q = normQ(st.q);
    const from = st.from ? new Date(`${st.from}T00:00:00`).getTime() : 0, to = st.to ? new Date(`${st.to}T23:59:59`).getTime() : Infinity;
    return rows.filter(x => (st.supplier === 'all' || x.r.supplierId === st.supplier)
      && (!st.from && !st.to || ((x.r.createdAt || 0) >= from && (x.r.createdAt || 0) <= to))
      && (!q || normQ([x.r.returnNumber, srSupName(x.r), x.r.storekeeperName, x.r.note, x.r.reason ? t('sr.r.' + x.r.reason) : '', ...x.items.map(i => `${i.name} ${i.code || ''}`)].join(' ')).includes(q)));
  };

  const reasonCell = r => (r.reason || r.note
    ? `<span class="cell-2">${r.reason ? `<b>${t('sr.r.' + r.reason)}</b>` : ''}${r.note ? `<small class="clip" title="${esc(r.note)}">${esc(r.note)}</small>` : ''}</span>`
    : '<span class="muted">—</span>');

  const row = (x, i) => {
    const r = x.r;
    return `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
      <td data-label="${t('sr.number')}"><b class="mono">#${esc(r.returnNumber ?? '-')}</b></td>
      <td data-label="${t('c.supplier')}"><span class="cell-2"><b>${esc(srSupName(r))}</b><small>${esc(branchLabel(r.branchId || mainBranchId()))}</small></span></td>
      <td data-label="${t('c.date')}"><span class="cell-2"><span class="date">${fmtDateTime(r.createdAt)}</span>${r.storekeeperName ? `<small>${esc(r.storekeeperName)}</small>` : ''}</span></td>
      <td data-label="${t('c.items')}"><span class="cell-2 items-cell"><b>${x.items.length} ${t('pu.itemsWord')}</b><small>${esc(x.items.slice(0, 2).map(it => it.name).join('، '))}${x.items.length > 2 ? '…' : ''}</small></span></td>
      <td data-label="${t('pm.value')}" class="end">${srHasPrices(r) ? `<span class="num">${fmtMoney(x.total)}</span>` : '<span class="muted">—</span>'}</td>
      <td data-label="${t('sr.reason')}">${reasonCell(r)}</td>
      <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-sr="view" aria-label="${t('view')}" data-tip="${t('view')}" data-tip-always>${icon('eye')}</button>
        <button class="btn-icon sm" data-sr="print" aria-label="${t('print')}" data-tip="${t('print')}" data-tip-always>${icon('printer')}</button>
        <button class="btn-icon sm" data-sr="edit" aria-label="${t('edit')}" data-tip="${t('edit')}" data-tip-always>${icon('pencil')}</button>
        <button class="btn-icon sm danger" data-sr="delete" aria-label="${t('delete')}" data-tip="${t('delete')}" data-tip-always>${icon('trash')}</button>
      </div></td></tr>`;
  };

  function draw() {
    const body = $('#srBody', view); if (!body) return;
    if (!LIVE.loaded(SR_PATHS)) { setHtml(body, skeletonRows(5, 7)); $('#srK', view).innerHTML = skeletonKpis(); return; }
    const rows = all();
    const month = Date.now() - 30 * 86400000;
    const recent = rows.filter(x => (x.r.createdAt || 0) >= month);
    setKpis($('#srK', view), [
      kpiCard({ label: t('sr.kCount30'), value: recent.length, ic: 'ret', tone: 'c4' }),
      kpiCard({ label: t('sr.kValue30'), value: recent.reduce((s, x) => s + x.total, 0), kind: 'money', ic: 'wallet', tone: 'c1' }),
      kpiCard({ label: t('sr.kSuppliers30'), value: new Set(recent.map(x => x.r.supplierId).filter(Boolean)).size, ic: 'truck', tone: 'c2' }),
      kpiCard({ label: t('sr.kTotal'), value: rows.length, ic: 'clipcheck', tone: 'c3' })
    ].join(''), first);
    const sups = Object.entries(LIVE.cache.suppliers || {}).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    setHtml($('#srSup', view), `<option value="all">${t('pu.allSuppliers')}</option>` + sups.map(([id, s]) => `<option value="${esc(id)}" ${st.supplier === id ? 'selected' : ''}>${esc(nameOf(s))}</option>`).join(''));
    const list = filtered(rows);
    setHtml($('#srPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * PER, st.page * PER);
    setHtml(body, slice.length ? slice.map(row).join('')
      : `<tr class="empty"><td colspan="7"><div class="empty-state">${icon(st.q || st.supplier !== 'all' || st.from || st.to ? 'search' : 'ret')}<b>${t(st.q || st.supplier !== 'all' || st.from || st.to ? 'emptyTitle' : 'sr.none')}</b><small>${t(st.q || st.supplier !== 'all' || st.from || st.to ? 'emptySub' : 'sr.noneSub')}</small></div></td></tr>`);
    first = false;
  }

  /* ---------- return form ---------- */
  function openForm(rec) {
    if (!afterCatalog(SR_CATALOG, () => openForm(rec))) return;
    const main = mainBranchId();
    if (!main) { toast(t('sr.noMain'), { tone: 'danger', ic: 'alert' }); return; }
    const r = rec ? rec.r : null;
    const d = {
      editingId: rec ? rec.id : null,
      supplierId: r ? r.supplierId || '' : '',
      reason: r ? r.reason || '' : '',
      note: r ? r.note || '' : '',
      items: r ? srItems(r).map(it => ({ ...it, unitPrice: it.unitPrice != null ? Number(it.unitPrice) : defaultPrice(it.itemType, it.itemId, it.unitId) })) : [],
      q: ''
    };
    const branchId = r && r.branchId ? r.branchId : main;
    const dr = freshDrawer(true);
    const sups = Object.entries(LIVE.cache.suppliers || {}).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(rec ? 'pencil' : 'ret')}</span><div><h2 id="drawerTitle">${rec ? `${t('sr.editTitle')} #${esc(r.returnNumber ?? '')}` : t('sr.new')}</h2><p>${t('sr.formSub')} <b>${esc(branchLabel(branchId))}</b></p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body pu-form">
        <div class="form-grid">
          <div class="field"><label>${t('pm.storekeeper')}</label><input value="${esc(r ? r.storekeeperName || '-' : me().name)}" readonly></div>
          <div class="field"><label for="rSup">${t('c.supplier')} <em>*</em></label><div class="select"><select id="rSup"><option value="">${t('pu.chooseSupplier')}</option>${sups.map(([id, s]) => `<option value="${esc(id)}" ${d.supplierId === id ? 'selected' : ''}>${esc(nameOf(s))}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>
          <div class="field"><label for="rReason">${t('sr.reason')}</label><div class="select"><select id="rReason"><option value="">${t('sr.chooseReason')}</option>${SR_REASONS.map(k => `<option value="${k}" ${d.reason === k ? 'selected' : ''}>${t('sr.r.' + k)}</option>`).join('')}</select>${icon('chevDown')}</div></div>
          <div class="field"><label for="rNote">${t('sr.note')}</label><input id="rNote" value="${esc(d.note)}" maxlength="200" autocomplete="off" dir="auto" placeholder="${t('sr.notePh')}"></div>
        </div>
        <section class="picker">
          <div class="picker-head"><b>${t('pu.addItems')}</b><label class="search-field">${icon('barcode')}<input type="search" id="rQ" placeholder="${t('pu.itemSearchPh')}" autocomplete="off"></label></div>
          <div class="picker-list" id="rPick"></div>
        </section>
        <section class="draft">
          <div class="draft-head"><b>${t('sr.returnItems')}</b><span class="muted" id="rCount"></span></div>
          <div id="rItems"></div>
          <small class="err" id="rItemsErr"></small>
        </section>
      </div>
      <footer class="dr-foot"><div class="dr-total"><small>${t('sr.returnValue')}</small><b id="rTotal">${fmtMoney(0)}</b></div><span class="tb-spacer"></span>
        ${rec ? '' : `<label class="check-line"><input type="checkbox" id="rPrint" checked> ${t('sr.printAfter')}</label>`}
        <button class="btn btn-ghost" data-close>${t('cancel')}</button>
        <button class="btn btn-primary" id="rSave">${icon('check')}<span>${rec ? t('save') : t('sr.submit')}</span></button></footer>`;
    openLayer('#drawer');

    /* Stock that can still be returned: what is on hand now, plus what this
       return already took out (when editing). */
    const origQty = () => qtyByItem(d.editingId ? srItems((LIVE.cache.supplierReturns || {})[d.editingId]) : []);
    const available = (type, id) => stockAt(itemData(type, id), branchId) + (origQty()[`${type}:${id}`] || 0);
    const draftQty = (type, id) => d.items.filter(x => x.itemType === type && String(x.itemId) === String(id)).reduce((s, x) => s + Number(x.qty || 0), 0);
    // Places the saved return already took from (when editing), so each place shows what it held before
    const placeUndo = () => locMovesOf(d.editingId ? srItems((LIVE.cache.supplierReturns || {})[d.editingId]) : [], branchId, -1);

    const lineRow = (it, idx) => {
      const exists = !!itemData(it.itemType, it.itemId);
      const avail = available(it.itemType, it.itemId), used = draftQty(it.itemType, it.itemId);
      const over = exists && used > avail + 1e-9;
      const batches = it.itemType === 'product' ? activeBatches(it.itemId) : [];
      return `<div class="line${over ? ' over' : ''}" data-i="${idx}">
        <div class="line-name"><b>${esc(itemLabel(it))}</b>
          ${!exists ? `<small class="neg">${t('pu.itemGone')}</small>` : `<small class="${over ? 'neg' : 'muted'}">${t('sr.available')}: ${qtyFmt(avail)}${over ? ` — ${t('sr.overStock')}` : ''}</small>`}
          ${batches.length ? `<div class="select mini">${icon('chevDown')}<select data-f="batch" aria-label="${t('pu.batch')}"><option value="">${t('pu.noBatch')}</option>${batches.map(b => `<option value="${esc(b.id)}" ${it.productionId === b.id ? 'selected' : ''}>${t('pu.batch')} #${esc(b.productionNumber ?? '')} · ${esc(b.productionDate || '')}</option>`).join('')}</select></div>` : it.productionNumber ? `<small class="muted">${t('pu.batch')} #${esc(it.productionNumber)} · ${esc(it.productionDate || '')}</small>` : ''}
          ${exists && multiLoc(it.itemType, it.itemId, branchId) ? locPick(it.itemType, it.itemId, 'out', it.locId, placeUndo()) : ''}</div>
        <label class="line-in"><small>${t('c.qty')}</small><input type="number" data-f="qty" min="0" step="any" inputmode="decimal" value="${it.qty}"></label>
        <label class="line-in"><small>${t('pm.unitPrice')}</small><input type="number" data-f="price" min="0" step="0.001" inputmode="decimal" value="${it.unitPrice}"></label>
        <div class="line-total"><small>${t('c.total')}</small><b class="num">${fmtMoney(Number(it.qty || 0) * Number(it.unitPrice || 0))}</b></div>
        <button class="btn-icon sm danger" data-f="del" aria-label="${t('delete')}">${icon('trash')}</button>
      </div>`;
    };
    const updateTotal = () => { $('#rTotal', dr).innerHTML = fmtMoney(d.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0)); };
    const drawItems = flashIdx => {
      $('#rItems', dr).innerHTML = d.items.length ? d.items.map(lineRow).join('') : `<div class="empty-state sm">${icon('ret')}<b>${t('pu.noItems')}</b><small>${t(d.supplierId ? 'pu.noItemsSub' : 'pu.pickSupplierFirst')}</small></div>`;
      $('#rCount', dr).textContent = d.items.length ? `${d.items.length} ${t('pu.itemsWord')}` : '';
      if (flashIdx != null) { const el = $(`.line[data-i="${flashIdx}"]`, dr); el && el.classList.add('flash-in'); }
      updateTotal();
    };
    const drawPicker = () => {
      const box = $('#rPick', dr);
      if (!d.supplierId) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t('pu.pickSupplierFirst')}</p>`; return; }
      const q = normQ(d.q);
      const mine = supplierItems(d.supplierId);
      const list = mine.filter(e => !q || normQ(`${e.item.nameAr || ''} ${e.item.nameEn || ''} ${e.item.name || ''} ${e.item.code || ''} ${e.item.barcode || ''}`).includes(q))
        .sort((a, b) => (available(b.type, b.id) > 0) - (available(a.type, a.id) > 0));
      if (!list.length) { box.innerHTML = `<p class="muted pick-hint">${icon('info')}${t(mine.length ? 'noResults' : 'pu.supplierNoItems')}</p>`; return; }
      box.innerHTML = list.slice(0, 40).map(e => {
        const avail = available(e.type, e.id);
        const inDraft = d.items.some(x => x.itemType === e.type && String(x.itemId) === String(e.id));
        return `<button type="button" class="pick${inDraft ? ' added' : ''}${avail <= 0 ? ' empty' : ''}" data-type="${e.type}" data-id="${esc(e.id)}">
          <span class="pick-ic">${icon(e.type === 'product' ? 'package' : 'box')}</span>
          <span class="pick-txt"><b>${esc(nameOf(e.item))}</b><small>${e.item.code ? `<span class="mono">${esc(e.item.code)}</span> · ` : ''}${esc(unitName(e.item.unitId) || '-')} · ${avail > 0 ? `${t('sr.available')} ${qtyFmt(avail)}` : `<span class="neg">${t('sr.noStock')}</span>`}</small></span>
          <span class="pick-add">${icon(inDraft ? 'check' : 'plus')}</span></button>`;
      }).join('') + (list.length > 40 ? `<p class="muted pick-hint">${t('pu.refine')}</p>` : '');
    };
    const addEntry = (type, id, batchId) => {
      const item = itemData(type, id); if (!item) return;
      const left = available(type, id) - draftQty(type, id);
      if (left <= 1e-9) { toast(t('sr.noStockFor').replace('{name}', nameOf(item)), { tone: 'info', ic: 'info' }); return; }
      const step = Math.min(1, left);
      const batches = type === 'product' ? activeBatches(id) : [];
      const batch = batchId ? batches.find(b => b.id === batchId) : batches[0];
      let idx = d.items.findIndex(x => x.itemType === type && String(x.itemId) === String(id) && (type !== 'product' || String(x.productionId || '') === String((batch && batch.id) || '')));
      if (idx >= 0) d.items[idx].qty = Number(d.items[idx].qty || 0) + step;
      else {
        d.items.push({ itemId: id, itemType: type, name: nameOf(item) || arName(item), qty: step, unitId: item.unitId || null, unitName: unitName(item.unitId) || null,
          unitPrice: defaultPrice(type, id, item.unitId), productionId: batch ? batch.id : null, productionDate: batch ? batch.productionDate || null : null, productionNumber: batch ? batch.productionNumber || null : null });
        idx = d.items.length - 1;
      }
      $('#rItemsErr', dr).textContent = '';
      drawItems(idx); drawPicker();
    };

    drawItems(); drawPicker();
    const setErr = (id, msg) => { const f = $(id, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $('#rSup', dr).addEventListener('change', async e => {
      const next = e.target.value;
      if (d.items.length && next !== d.supplierId) {
        const ok = await confirmDialog({ title: t('pu.changeSupplierQ'), body: `<p class="cf-note">${t('pu.changeSupplierNote')}</p>`, ok: t('pu.changeSupplier'), tone: 'danger', icon: 'swap' });
        if (!ok) { e.target.value = d.supplierId; return; }
        d.items = [];
      }
      d.supplierId = next; setErr('#rSup', ''); drawItems(); drawPicker();
    });
    $('#rReason', dr).addEventListener('change', e => { d.reason = e.target.value; });
    $('#rNote', dr).addEventListener('input', e => { d.note = e.target.value; });
    $('#rQ', dr).addEventListener('input', e => { d.q = e.target.value; drawPicker(); });
    $('#rQ', dr).addEventListener('keydown', e => {
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
      const byName = list.filter(x => normQ(`${x.item.nameAr || ''} ${x.item.nameEn || ''} ${x.item.code || ''}`).includes(q));
      if (!hit && byName.length === 1) hit = byName[0];
      if (hit) { addEntry(hit.type, hit.id, batchId); e.target.value = ''; d.q = ''; drawPicker(); }
      else toast(t('pu.noMatch'), { tone: 'info', ic: 'search' });
    });
    $('#rPick', dr).addEventListener('click', e => { const b = e.target.closest('.pick'); if (b) addEntry(b.dataset.type, b.dataset.id); });
    $('#rItems', dr).addEventListener('input', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i], f = e.target.dataset.f;
      if (f === 'qty') it.qty = Math.max(0, Number(e.target.value || 0));
      if (f === 'price') it.unitPrice = Math.max(0, Number(e.target.value || 0));
      $('.line-total b', line).innerHTML = fmtMoney(Number(it.qty || 0) * Number(it.unitPrice || 0));
      updateTotal();
    });
    $('#rItems', dr).addEventListener('change', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const it = d.items[+line.dataset.i];
      if (e.target.dataset.f === 'batch') {
        const b = activeBatches(it.itemId).find(x => x.id === e.target.value);
        Object.assign(it, { productionId: b ? b.id : null, productionDate: b ? b.productionDate || null : null, productionNumber: b ? b.productionNumber || null : null });
      }
      if (e.target.dataset.f === 'loc') { it.locId = e.target.value || null; drawItems(); }
      if (e.target.dataset.f === 'qty' || e.target.dataset.f === 'price') drawItems();
    });
    $('#rItems', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-f="del"]'); if (!b) return;
      const line = b.closest('.line');
      line.classList.add('row-out');
      setTimeout(() => { d.items.splice(+line.dataset.i, 1); drawItems(); drawPicker(); }, 220);
    });

    $('#rSave', dr).addEventListener('click', async () => {
      if (saving) return;
      let bad = false;
      const errs = $('#rItemsErr', dr);
      errs.textContent = '';
      if (!d.supplierId) { setErr('#rSup', t('required')); bad = true; }
      if (!d.items.length) { errs.textContent = t('pu.needItems'); bad = true; }
      else if (d.items.some(it => !(Number(it.qty) > 0))) { errs.textContent = t('pu.needQty'); bad = true; }
      else {
        const over = d.items.find(it => itemData(it.itemType, it.itemId) && draftQty(it.itemType, it.itemId) > available(it.itemType, it.itemId) + 1e-9);
        if (over) { errs.textContent = t('sr.overStockFor').replace('{name}', over.name); bad = true; drawItems(); }
        const noLoc = !bad && needLocName(d.items, branchId, l => l.name);
        if (noLoc) { errs.textContent = t('sl.needLoc').replace('{name}', noLoc); bad = true; }
      }
      if (bad) { dr.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 }); return; }

      const sup = (LIVE.cache.suppliers || {})[d.supplierId];
      const items = d.items.map(it => clean({ itemId: it.itemId, itemType: it.itemType, name: it.name, qty: Number(it.qty), unitId: it.unitId || null, unitName: it.unitName || null,
        unitPrice: Number(it.unitPrice || 0), productionId: it.productionId || null, productionDate: it.productionDate || null, productionNumber: it.productionNumber || null,
        locId: multiLoc(it.itemType, it.itemId, branchId) ? it.locId || null : null }));
      const wantPrint = !!($('#rPrint', dr) || {}).checked;
      const btn = $('#rSave', dr); saving = true; btn.classList.add('loading');
      try {
        const up = {};
        // Stock moves by the difference against what is saved on the server right now,
        // so an edit made on another device is never applied twice.
        const before = d.editingId ? origQty() : {};
        if (d.editingId && !(LIVE.cache.supplierReturns || {})[d.editingId]) { toast(t('sr.goneElsewhere'), { tone: 'danger', ic: 'alert' }); return; }
        const after = qtyByItem(items);
        new Set([...Object.keys(before), ...Object.keys(after)]).forEach(k => {
          const diff = (after[k] || 0) - (before[k] || 0);
          const [type, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
          if (Math.abs(diff) > 1e-9 && itemData(type, id)) up[`${itemPath(type, id)}/stockByBranch/${branchId}`] = LIVE.increment(-diff);
        });
        const placeMoves = mergeMoves(locMovesOf(srItems({ items: items }), branchId, -1), d.editingId ? locMovesOf(srItems((LIVE.cache.supplierReturns || {})[d.editingId]), branchId, 1) : {});
        Object.entries(placeMoves).forEach(([pth, q]) => { if (Math.abs(q) > 1e-9) up[pth] = LIVE.increment(q); });
        const base = { supplierId: d.supplierId, supplierName: arName(sup) || '-', branchId, reason: d.reason || null, note: String(d.note || '').trim() || null, items };
        let printRec;
        if (d.editingId) {
          const path = `supplierReturns/${d.editingId}`;
          Object.entries(base).forEach(([k, v]) => { up[`${path}/${k}`] = v; });
          up[`${path}/updatedAt`] = LIVE.now();
          up[`${path}/updatedByName`] = me().name || null;
          await LIVE.update(up);
          toast(`${t('sr.voucher')} #${r.returnNumber ?? ''} — ${t('saved')}`);
        } else {
          const num = await LIVE.counter('meta/supplierReturnCounter');
          const key = LIVE.newKey('supplierReturns');
          printRec = { returnNumber: num, createdAt: Date.now(), storekeeperId: me().id || null, storekeeperName: me().name || null, ...base };
          up[`supplierReturns/${key}`] = clean({ ...printRec, createdAt: LIVE.now() });
          await LIVE.update(up);
          toast(`${t('sr.voucher')} #${num} — ${t('sr.savedOut')}`);
        }
        closeLayers();
        if (printRec && wantPrint) printReturn(printRec);
      } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    });
    setTimeout(() => (d.supplierId ? $('#rQ', dr) : $('#rSup', dr)).focus(), 350);
  }

  /* Default price: last purchase price in the same unit, else the item's cost */
  function defaultPrice(type, id, unitId) {
    const lp = latestPrice(type, id, unitId);
    if (lp && (!lp.unitId || !unitId || lp.unitId === unitId)) return lp.price;
    return Number((itemData(type, id) || {}).cost || 0);
  }

  /* ---------- details ---------- */
  function details(rec) {
    const r = rec.r, its = srItems(r), priced = srHasPrices(r);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('ret')}</span><div><h2 id="drawerTitle">${t('sr.voucher')} #${esc(r.returnNumber ?? '-')}</h2><p>${esc(srSupName(r))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">
          ${[[t('c.supplier'), srSupName(r)], [t('sr.fromBranch'), branchLabel(r.branchId || mainBranchId())], [t('c.date'), fmtDateTime(r.createdAt)], [t('pm.storekeeper'), r.storekeeperName || '-'],
            [t('sr.reason'), r.reason ? t('sr.r.' + r.reason) : '-'], [t('sr.lastEdit'), r.updatedAt ? `${r.updatedByName || '-'} · ${fmtDateTime(r.updatedAt)}` : '-']].map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}
        </div>
        ${r.note ? `<p class="note-box">${icon('info')}<span>${esc(r.note)}</span></p>` : ''}
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('c.qty')}</th>${priced ? `<th class="end">${t('pm.unitPrice')}</th><th class="end">${t('c.total')}</th>` : ''}</tr></thead>
          <tbody>${its.map(it => `<tr><td data-label="${t('c.name')}"><span class="cell-2"><b>${esc(itemLabel(it))}</b>${it.productionNumber ? `<small>${t('pu.batch')} #${esc(it.productionNumber)} · ${esc(it.productionDate || '')}</small>` : ''}</span></td>
            <td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.qty)}</td>${priced ? `<td data-label="${t('pm.unitPrice')}" class="end num">${fmtMoney(Number(it.unitPrice || 0))}</td><td data-label="${t('c.total')}" class="end num">${fmtMoney(it.qty * Number(it.unitPrice || 0))}</td>` : ''}</tr>`).join('')}</tbody>
          ${priced ? `<tfoot><tr><td colspan="3">${t('sr.returnValue')}</td><td class="end num"><b>${fmtMoney(srTotal(r))}</b></td></tr></tfoot>` : ''}</table></div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-d="print">${icon('printer')}<span>${t('print')}</span></button><span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-d="edit">${icon('pencil')}<span>${t('edit')}</span></button></footer>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'print') printReturn(r);
      else { dr.onclick = null; openForm(rec); }
    };
  }

  function printReturn(r) {
    const its = srItems(r), priced = srHasPrices(r);
    printDoc(`${t('sr.voucher')} #${r.returnNumber ?? ''}`,
      [[t('c.supplier'), srSupName(r)], [t('sr.fromBranch'), branchLabel(r.branchId || mainBranchId())], [t('c.date'), fmtDateTime(r.createdAt)], [t('pm.storekeeper'), r.storekeeperName || '-'], [t('sr.reason'), r.reason ? t('sr.r.' + r.reason) : '-'], [t('sr.note'), r.note || '-']],
      priced ? [t('c.name'), t('c.qty'), t('pm.unitPrice'), t('c.total')] : [t('c.name'), t('c.qty')],
      its.map(it => priced ? [itemLabel(it), qtyFmt(it.qty), moneyPlain(Number(it.unitPrice || 0)), moneyPlain(it.qty * Number(it.unitPrice || 0))] : [itemLabel(it), qtyFmt(it.qty)]),
      priced ? [t('sr.returnValue'), moneyPlain(srTotal(r))] : null);
  }

  async function remove(rec) {
    const r = rec.r;
    const ok = await confirmDialog({ title: t('sr.deleteQ'), body: `<div class="cf-sum"><div><small>${t('sr.number')}</small><b>#${esc(r.returnNumber ?? '-')}</b></div><div><small>${t('c.supplier')}</small><b>${esc(srSupName(r))}</b></div></div><p class="cf-note">${t('sr.deleteNote').replace('{branch}', esc(branchLabel(r.branchId || mainBranchId())))}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const cur = (LIVE.cache.supplierReturns || {})[rec.id];
    if (!cur) return;
    const branchId = cur.branchId || mainBranchId();
    if (!branchId) { toast(t('sr.noMain'), { tone: 'danger', ic: 'alert' }); return; }
    // Record removal and stock coming back go to the server together.
    const up = { [`supplierReturns/${rec.id}`]: null };
    Object.entries(qtyByItem(srItems(cur))).forEach(([k, q]) => {
      const type = k.slice(0, k.indexOf(':')), id = k.slice(k.indexOf(':') + 1);
      if (q && itemData(type, id)) up[`${itemPath(type, id)}/stockByBranch/${branchId}`] = LIVE.increment(q);
    });
    Object.entries(locMovesOf(srItems(cur), branchId, 1)).forEach(([pth, q]) => { up[pth] = LIVE.increment(q); });
    try { await LIVE.update(up); toast(t('sr.deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  function exportCsv() {
    const rows = filtered(all());
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const head = [t('sr.number'), t('c.supplier'), t('c.date'), t('pm.storekeeper'), t('c.items'), t('pm.value'), t('sr.reason'), t('sr.note')];
    const csv = [head.map(q).join(','), ...rows.map(x => [x.r.returnNumber, srSupName(x.r), fmtDateTime(x.r.createdAt), x.r.storekeeperName || '', x.items.length, x.total.toFixed(3), x.r.reason ? t('sr.r.' + x.r.reason) : '', x.r.note || ''].map(q).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `supplier-returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('exported'));
  }

  /* ---------- events ---------- */
  let deb;
  $('#srQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('#srSup', view).addEventListener('change', e => { st.supplier = e.target.value; st.page = 1; draw(); });
  $('#srFrom', view).addEventListener('change', e => { st.from = e.target.value; st.page = 1; draw(); });
  $('#srTo', view).addEventListener('change', e => { st.to = e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-sr]'); if (!b) return;
    if (b.dataset.sr === 'new') { openForm(null); return; }
    if (b.dataset.sr === 'export') { if (allLoaded()) exportCsv(); return; }
    const id = b.closest('tr').dataset.id, r = (LIVE.cache.supplierReturns || {})[id]; if (!r) return;
    const rec = { id, r };
    ({ view: details, print: x => printReturn(x.r), edit: openForm, delete: remove })[b.dataset.sr](rec);
  });

  const unsub = LIVE.watch([...SR_PATHS, ...SR_CATALOG], draw);
  draw();
  takeDoc('supplier-returns', [...SR_PATHS, ...SR_CATALOG], id => { const r = (LIVE.cache.supplierReturns || {})[id]; if (r) details({ id, r }); });
  return () => { unsub(); freshDrawer(false); };
};
