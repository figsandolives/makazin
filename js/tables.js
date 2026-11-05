/* =====================================================================
   الطاولات — tables/{id} {tableNumber, branchId, location, active}; each table's orders and revenue
   come from the dine-in invoices that carry its number (orders/{id}.tableNumber + branchId).
   Without any table set up, a branch's tableCount stands for tables 1..n (as on the old page).
   Same as the old page, plus fixes: printing the list works (the old page failed on missing totals),
   a table's invoices leave out cancelled ones like its totals do, numbers match whatever way they were
   typed (5 / 05 / ٥), the sort is one clear choice, and the form says which field is missing.
   ===================================================================== */
LIVE_ROUTES.add('tables');

PAGES.tables = view => {
  const st = (S.tb ||= { q: '', from: '', to: '', branch: 'all', sort: 'ordersDesc', per: 10, page: 1, detail: null, dq: '', dCashier: 'all' });
  const PATHS = ['tables', 'branches', 'orders', 'cashiers', 'orderTypes', 'paymentMethods', 'customers', 'deliveryZones'];
  let first = true, saving = false;
  const tNo = v => { const s = toLatin(String(v ?? '')).trim(); return /^\d+$/.test(s) ? String(+s) : s; };
  const keyOf = (branchId, no) => `${branchId}:${tNo(no)}`;

  /* ---------- data ---------- */
  function tablesList() {
    const list = Object.entries(LIVE.cache.tables || {}).filter(([, x]) => x && typeof x === 'object')
      .map(([id, x]) => ({ id, no: String(x.tableNumber ?? x.number ?? '').trim(), branchId: x.branchId || '', location: x.location || '' }))
      .filter(x => x.no && x.branchId);
    if (list.length) return list;
    return Object.entries(LIVE.cache.branches || {}).flatMap(([bid, b]) => {
      const n = Math.max(0, Math.floor(Number((b && (b.tableCount || b.tablesCount || b.tables)) || 0)) || 0);
      return Array.from({ length: n }, (_, i) => ({ id: `virtual-${bid}-${i + 1}`, no: String(i + 1), branchId: bid, location: '', virtual: true }));
    });
  }
  // Active dine-in invoices of the period, by branch:table
  function tableOrders() {
    const map = new Map();
    Object.entries(LIVE.cache.orders || {}).forEach(([id, o]) => {
      if (!o || typeof o !== 'object' || oCancelled(o) || !String(o.tableNumber ?? '').trim() || !o.branchId) return;
      if (!inRange(oTime(o), st.from, st.to)) return;
      const k = keyOf(o.branchId, o.tableNumber);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ id, ...o });
    });
    return map;
  }
  function rows() {
    const byTable = tableOrders(), q = normQ(st.q);
    const list = tablesList().map(x => {
      const os = byTable.get(keyOf(x.branchId, x.no)) || [];
      return { ...x, branchName: branchLabel(x.branchId) || '-', orders: os.length, revenue: os.reduce((s, o) => s + oTotal(o), 0) };
    }).filter(x => (st.branch === 'all' || x.branchId === st.branch) && (!q || normQ(`${x.no} ${x.branchName} ${x.location}`).includes(q)));
    const [k, dir] = { ordersDesc: ['orders', -1], ordersAsc: ['orders', 1], revenueDesc: ['revenue', -1], revenueAsc: ['revenue', 1], number: ['no', 1] }[st.sort] || ['orders', -1];
    const byNo = (a, b) => String(a.branchName).localeCompare(String(b.branchName)) || String(a.no).localeCompare(String(b.no), undefined, { numeric: true });
    return list.sort((a, b) => (k === 'no' ? byNo(a, b) : dir * (a[k] - b[k]) || byNo(a, b)));
  }

  /* ---------- list ---------- */
  function mountList() {
    view.innerHTML = `
      ${pageHeader('tables', `<button class="btn btn-ghost" data-tb="print">${icon('printer')}<span>${t('o.printReport')}</span></button>
        <button class="btn btn-ghost" data-tb="export">${icon('download')}<span>${t('iv.excel')}</span></button>
        <button class="btn btn-primary" data-tb="new">${icon('plus')}<span>${t('tb.add')}</span></button>`, t('tb.sub'))}
      <section class="kpis" id="tbK"></section>
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools">
          <label class="search-field">${icon('search')}<input type="search" id="tbQ" placeholder="${t('tb.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
          <label class="date-field"><small>${t('c.from')}</small><input type="date" id="tbFrom" value="${st.from}"></label>
          <label class="date-field"><small>${t('c.to')}</small><input type="date" id="tbTo" value="${st.to}"></label>
          <div class="select tb-select">${icon('chevDown')}<select id="tbBranch" aria-label="${t('c.branch')}"></select></div>
          <div class="select tb-select">${icon('chevDown')}<select id="tbSort" aria-label="${t('tb.sort')}">${['ordersDesc', 'ordersAsc', 'revenueDesc', 'revenueAsc', 'number'].map(k => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${t('tb.s.' + k)}</option>`).join('')}</select></div>
          <span class="tb-spacer"></span>${perHtml(st)}</div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr><th>${t('tb.number')}</th><th>${t('c.branch')}</th><th>${t('tb.location')}</th><th class="end">${t('tb.orders')}</th><th class="end">${t('tb.revenue')}</th><th class="act-col"></th></tr></thead>
          <tbody id="tbBody"></tbody></table></div>
        <footer class="pager" id="tbPager"></footer>
      </section>`;
    first = true;
    $('#tbQ', view).addEventListener('input', e => { st.q = e.target.value; st.page = 1; draw(); });
    [['#tbFrom', 'from'], ['#tbTo', 'to'], ['#tbBranch', 'branch'], ['#tbSort', 'sort']].forEach(([s, k]) => $(s, view).addEventListener('change', e => { st[k] = e.target.value; st.page = 1; draw(); }));
    $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  }
  function drawList() {
    const body = $('#tbBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 6)); $('#tbK', view).innerHTML = skeletonKpis(); return; }
    const bs = $('#tbBranch', view);
    if (bs.options.length !== Object.keys(LIVE.cache.branches || {}).length + 1) bs.innerHTML = `<option value="all">${t('allBranches')}</option>${Object.entries(LIVE.cache.branches || {}).map(([id, b]) => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join('')}`;
    const list = rows();
    const orders = list.reduce((s, x) => s + x.orders, 0), revenue = list.reduce((s, x) => s + x.revenue, 0);
    setKpis($('#tbK', view), [
      kpiCard({ label: t('tb.count'), value: list.length, ic: 'utensils', tone: 'c1' }),
      kpiCard({ label: t('tb.orders'), value: orders, ic: 'receipt', tone: 'c2', drill: 'orders' }),
      kpiCard({ label: t('tb.revenue'), value: revenue, kind: 'money', ic: 'chart', tone: 'c3', drill: 'revenue' })
    ].join(''), first);
    setHtml($('#tbPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map((x, i) => `<tr data-id="${esc(x.id)}" data-k="${esc(keyOf(x.branchId, x.no))}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('tb.number')}"><span class="tb-no">${esc(x.no)}</span>${x.virtual ? ` <span class="pk-type">${t('tb.virtual')}</span>` : ''}</td>
        <td data-label="${t('c.branch')}">${esc(x.branchName)}</td>
        <td data-label="${t('tb.location')}">${x.location ? esc(x.location) : '<span class="muted">—</span>'}</td>
        <td data-label="${t('tb.orders')}" class="end num">${x.orders}</td>
        <td data-label="${t('tb.revenue')}" class="end num">${moneyPlain(x.revenue)}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-tb="view" aria-label="${t('view')}">${icon('eye')}</button>
          ${x.virtual ? '' : `<button class="btn-icon sm" data-tb="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-tb="delete" aria-label="${t('delete')}">${icon('trash')}</button>`}</div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="6"><div class="empty-state">${icon(st.q || st.branch !== 'all' ? 'search' : 'utensils')}<b>${t(st.q || st.branch !== 'all' ? 'emptyTitle' : 'tb.none')}</b><small>${t(st.q || st.branch !== 'all' ? 'emptySub' : 'tb.noneSub')}</small></div></td></tr>`);
    first = false;
  }
  const filterMeta = () => [[t('c.from'), st.from || '-'], [t('c.to'), st.to || '-'], [t('c.branch'), st.branch === 'all' ? t('allBranches') : branchLabel(st.branch)]];
  function exportList() {
    excelOut(rows().map(x => ({ [t('tb.number')]: x.no, [t('c.branch')]: x.branchName, [t('tb.location')]: x.location || '-', [t('tb.orders')]: x.orders, [t('tb.revenue')]: moneyPlain(x.revenue) })), 'tables-report.xlsx');
  }
  function printList() {
    const list = rows();
    printDoc(t('tables'), filterMeta(), [t('tb.number'), t('c.branch'), t('tb.location'), t('tb.orders'), t('tb.revenue')],
      list.map(x => [x.no, x.branchName, x.location || '-', x.orders, moneyPlain(x.revenue)]),
      [[t('tb.orders'), String(list.reduce((s, x) => s + x.orders, 0))], [t('tb.revenue'), moneyPlain(list.reduce((s, x) => s + x.revenue, 0))]]);
  }

  /* ---------- one table's invoices ---------- */
  const session = o => {
    const a = Number(o.tableOpenedAt || o.createdAt || 0), b = Number(o.tableClosedAt || o.createdAt || 0);
    if (!a || !b) return '-';
    const min = Math.floor(Math.max(b - a, 0) / 60000), h = Math.floor(min / 60);
    return `${fmtDateTime(a)} → ${fmtDateTime(b)} (${h ? `${h} ${t('tb.h')} ` : ''}${min % 60} ${t('tb.m')})`;
  };
  function detailRows() {
    const [bid, no] = st.detail.split(':');
    const all = (tableOrders().get(keyOf(bid, no)) || []).sort((a, b) => oTime(b) - oTime(a));
    const q = normQ(st.dq);
    return { bid, no, all, list: all.filter(o => (st.dCashier === 'all' || o.cashierId === st.dCashier) && (!q || normQ(`${oNum(o)} ${oCustName(o)} ${oPhone(o)} ${oCashier(o)}`).includes(q))) };
  }
  function mountDetail() {
    const [bid, no] = st.detail.split(':');
    view.innerHTML = `
      ${pageHeader('tables', `<button class="btn btn-ghost" data-tb="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
        <button class="btn btn-ghost" data-tb="dprint">${icon('printer')}<span>${t('o.printReport')}</span></button>
        <button class="btn btn-primary" data-tb="dexport">${icon('download')}<span>${t('iv.excel')}</span></button>`, `${t('tb.table')} #${esc(no)} · ${esc(branchLabel(bid) || '-')}`)}
      <section class="kpis" id="tbDK"></section>
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools">
          <label class="search-field">${icon('search')}<input type="search" id="tbDQ" placeholder="${t('tb.dSearchPh')}" value="${esc(st.dq)}" autocomplete="off"></label>
          <div class="select tb-select">${icon('chevDown')}<select id="tbDC" aria-label="${t('o.cashier')}"></select></div>
          <span class="tb-spacer"></span><span class="muted" id="tbRange"></span></div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr><th>${t('o.number')}</th><th>${t('o.customer')}</th><th>${t('c.phone')}</th><th>${t('o.branch')}</th><th>${t('o.cashier')}</th><th class="end">${t('o.net')}</th><th>${t('o.type')}</th><th class="end">${t('o.fee')}</th><th class="end">${t('o.grand')}</th><th>${t('o.payment')}</th><th>${t('c.date')}</th><th>${t('tb.session')}</th></tr></thead>
          <tbody id="tbDBody"></tbody></table></div>
      </section>`;
    first = true;
    $('#tbDQ', view).addEventListener('input', e => { st.dq = e.target.value; drawDetail(); });
    $('#tbDC', view).addEventListener('change', e => { st.dCashier = e.target.value; drawDetail(); });
  }
  function drawDetail() {
    const body = $('#tbDBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 12)); $('#tbDK', view).innerHTML = skeletonKpis(); return; }
    const { all, list } = detailRows();
    const cs = new Map(all.filter(o => o.cashierId).map(o => [o.cashierId, oCashier(o)]));
    const sel = $('#tbDC', view);
    sel.innerHTML = `<option value="all">${t('tb.allCashiers')}</option>${[...cs].sort((a, b) => String(a[1]).localeCompare(String(b[1]))).map(([id, n]) => `<option value="${esc(id)}" ${st.dCashier === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}`;
    $('#tbRange', view).textContent = st.from || st.to ? `${st.from || '…'} → ${st.to || '…'}` : t('tb.allTime');
    setKpis($('#tbDK', view), [
      kpiCard({ label: t('tb.kProducts'), value: list.reduce((s, o) => s + oSub(o), 0), kind: 'money', ic: 'package', tone: 'c1' }),
      kpiCard({ label: t('tb.kDelivery'), value: list.reduce((s, o) => s + oFee(o), 0), kind: 'money', ic: 'bike', tone: 'c2' }),
      kpiCard({ label: t('tb.kTotal'), value: list.reduce((s, o) => s + oTotal(o), 0), kind: 'money', ic: 'chart', tone: 'c3' })
    ].join(''), first);
    setHtml(body, list.length ? list.map((o, i) => `<tr data-oid="${esc(o.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('o.number')}"><button class="badge tone-info badge-btn" data-tb="invoice">#${esc(oNum(o))}</button></td>
        <td data-label="${t('o.customer')}">${esc(oCustName(o))}</td><td data-label="${t('c.phone')}"><span class="mono">${esc(oPhone(o))}</span></td>
        <td data-label="${t('o.branch')}">${esc(oBranch(o))}</td><td data-label="${t('o.cashier')}">${esc(oCashier(o))}</td>
        <td data-label="${t('o.net')}" class="end num">${moneyPlain(oSub(o))}</td><td data-label="${t('o.type')}">${esc(oType(o))}</td>
        <td data-label="${t('o.fee')}" class="end num">${moneyPlain(oFee(o))}</td><td data-label="${t('o.grand')}" class="end num"><b>${moneyPlain(oTotal(o))}</b></td>
        <td data-label="${t('o.payment')}">${esc(oPay(o))}</td><td data-label="${t('c.date')}"><span class="date">${fmtDateTime(oTime(o))}</span></td>
        <td data-label="${t('tb.session')}"><small>${esc(session(o))}</small></td></tr>`).join('')
      : `<tr class="empty"><td colspan="12"><div class="empty-state">${icon('receipt')}<b>${t('tb.noOrders')}</b><small>${t('tb.noOrdersSub')}</small></div></td></tr>`);
    first = false;
  }
  const detailCols = () => [t('o.number'), t('o.customer'), t('c.phone'), t('o.branch'), t('o.cashier'), t('o.net'), t('o.type'), t('o.fee'), t('o.grand'), t('o.payment'), t('c.date'), t('tb.session')];
  const detailLine = o => [oNum(o), oCustName(o), oPhone(o), oBranch(o), oCashier(o), moneyPlain(oSub(o)), oType(o), moneyPlain(oFee(o)), moneyPlain(oTotal(o)), oPay(o), fmtDateTime(oTime(o)), session(o)];
  function exportDetail() {
    const { no, list } = detailRows(), c = detailCols();
    excelOut(list.map(o => Object.fromEntries(detailLine(o).map((v, i) => [c[i], v]))), `table-${no}-orders.xlsx`);
  }
  function printDetail() {
    const { bid, no, list } = detailRows();
    printDoc(`${t('tb.table')} #${no}`, [[t('c.branch'), branchLabel(bid) || '-'], [t('c.from'), st.from || '-'], [t('c.to'), st.to || '-']], detailCols(), list.map(detailLine),
      [[t('tb.kProducts'), moneyPlain(list.reduce((s, o) => s + oSub(o), 0))], [t('tb.kDelivery'), moneyPlain(list.reduce((s, o) => s + oFee(o), 0))], [t('tb.kTotal'), moneyPlain(list.reduce((s, o) => s + oTotal(o), 0))]]);
  }

  /* ---------- add / edit / delete ---------- */
  function openForm(id) {
    const x = id ? (LIVE.cache.tables || {})[id] : null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(x ? 'pencil' : 'utensils')}</span><div><h2 id="drawerTitle">${t(x ? 'tb.edit' : 'tb.add')}</h2><p>${t('tb.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="tbForm">
        <div class="field"><label for="tbNo">${t('tb.number')} *</label><input id="tbNo" dir="ltr" inputmode="numeric" value="${esc(x ? x.tableNumber ?? '' : '')}" autocomplete="off"><small class="err" id="tbNoErr"></small></div>
        <div class="field"><label for="tbBr">${t('c.branch')} *</label><div class="select">${icon('chevDown')}<select id="tbBr"><option value="">${t('iv.chooseBranch')}</option>${Object.entries(LIVE.cache.branches || {}).map(([bid, b]) => `<option value="${esc(bid)}" ${x && x.branchId === bid ? 'selected' : ''}>${esc(nameOf(b) || bid)}</option>`).join('')}</select></div><small class="err" id="tbBrErr"></small></div>
        <div class="field"><label for="tbLoc">${t('tb.location')}</label><input id="tbLoc" value="${esc(x ? x.location || '' : '')}" placeholder="${t('tb.locationPh')}" autocomplete="off"></div>
        ${x ? `<p class="cf-note">${icon('info')} ${t('tb.renumberNote')}</p>` : ''}
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="tbSave">${icon('check')}<span>${t(x ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const noIn = $('#tbNo', dr), brIn = $('#tbBr', dr);
    noIn.addEventListener('input', () => { $('#tbNoErr', dr).textContent = ''; });
    brIn.addEventListener('change', () => { $('#tbBrErr', dr).textContent = ''; $('#tbNoErr', dr).textContent = ''; });
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const no = toLatin(noIn.value.trim()), branchId = brIn.value, location = $('#tbLoc', dr).value.trim();
      let bad = false;
      if (!no) { $('#tbNoErr', dr).textContent = t('required'); bad = true; }
      if (!branchId) { $('#tbBrErr', dr).textContent = t('required'); bad = true; }
      if (!bad && Object.entries(LIVE.cache.tables || {}).some(([tid, y]) => tid !== id && y && y.branchId === branchId && tNo(y.tableNumber ?? y.number) === tNo(no))) { $('#tbNoErr', dr).textContent = t('tb.exists'); bad = true; }
      if (bad) { (no ? brIn : noIn).focus(); return; }
      const btn = $('#tbSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`tables/${id}/tableNumber`]: no, [`tables/${id}/branchId`]: branchId, [`tables/${id}/location`]: location || null, [`tables/${id}/updatedAt`]: LIVE.now() });
        else await LIVE.update({ [`tables/${LIVE.newKey('tables')}`]: { tableNumber: no, branchId, location: location || null, active: true, createdAt: LIVE.now(), updatedAt: LIVE.now() } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#tbForm', dr).addEventListener('submit', save);
    $('#tbSave', dr).addEventListener('click', save);
    setTimeout(() => noIn.focus(), 320);
  }
  async function remove(id) {
    const x = (LIVE.cache.tables || {})[id]; if (!x) return;
    const ok = await confirmDialog({ title: t('tb.deleteQ'), body: `<div class="cf-sum"><div><small>${t('tb.number')}</small><b>${esc(x.tableNumber ?? '-')}</b></div><div><small>${t('c.branch')}</small><b>${esc(branchLabel(x.branchId) || '-')}</b></div></div><p class="cf-note">${t('tb.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`tables/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- events ---------- */
  const mount = () => (st.detail ? mountDetail() : mountList());
  const draw = () => (st.detail ? drawDetail() : drawList());
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-tb]'); if (!b || b.disabled) return;
    const a = b.dataset.tb;
    if (a === 'new') return openForm(null);
    if (a === 'export') return allLoaded() && exportList();
    if (a === 'print') return allLoaded() && printList();
    if (a === 'dexport') return allLoaded() && exportDetail();
    if (a === 'dprint') return allLoaded() && printDetail();
    if (a === 'back') { st.detail = null; mount(); draw(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'invoice') { const o = (LIVE.cache.orders || {})[b.closest('tr').dataset.oid]; if (o) invoiceDetails(o); return; }
    const tr = b.closest('tr'); if (!tr) return;
    if (a === 'view') { st.detail = tr.dataset.k; st.dq = ''; st.dCashier = 'all'; mount(); draw(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'edit') return openForm(tr.dataset.id);
    if (a === 'delete') return remove(tr.dataset.id);
  });
  mount();
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  // Card pages: the invoices behind the tables shown (same branch/search/date filters)
  const closeDrill = kpiDrills(view, { paths: PATHS, ready: () => LIVE.loaded(PATHS), build: kind => {
    const byTable = tableOrders(), shown = rows();
    const list = shown.flatMap(x => (byTable.get(keyOf(x.branchId, x.no)) || []).map(o => ({ ...o, _table: x.no }))).sort((a, b) => oTime(b) - oTime(a));
    const range = st.from || st.to ? `${st.from || '…'} → ${st.to || '…'}` : t('tb.allTime');
    if (kind === 'orders') {
      const cfg = kdOrders({ title: t('tb.orders'), sub: `${t('kd.filtered')} · ${range}`, ic: 'receipt', file: 'table-orders.xlsx', list });
      cfg.cols.splice(1, 0, { h: t('tb.number') });
      cfg.rows.forEach((r, i) => { r.cells.splice(1, 0, `<span class="tb-no">${esc(list[i]._table)}</span>`); r.x = { [t('tb.number')]: list[i]._table, ...r.x }; r.text += ` ${list[i]._table}`; });
      return cfg;
    }
    if (kind === 'revenue') return kdBreakdown({ title: `${t('tb.revenue')} ${t('kd.byBranch')}`, sub: `${t('kd.filtered')} · ${range}`, ic: 'chart', file: 'tables-revenue-by-branch.xlsx',
      groupH: t('kd.branch'), countH: t('kd.orders'), valueH: t('tb.revenue'), items: kdGroup(list, o => o.branchId, o => branchLabel(o.branchId), oTotal) });
    return null;
  } });
  return () => { unsub(); closeDrill(); freshDrawer(false); };
};
