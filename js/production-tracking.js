/* متابعة الإنتاج — production follow-up, as on the old page (products → their production vouchers,
   filtered by date, branch and production staff, with the near-expiry count), plus the batches:
   what each branch still holds of every production + expiry date, expiry alerts, and where a batch went. */

LIVE_ROUTES.add('production-tracking');
const PT_PATHS = ['production', 'productionStaff', 'stockIssue', 'branches', 'products', 'stockMaterials', 'units', 'productInfos', 'countryOrigins',
  'transfers', 'stockReturn', 'scrapReturn', 'inventoryCount', 'transferRequests'];
const PT_SOON = 7; // days: the old page's near-expiry window

const ptDays = days => (days == null ? `<span class="muted">—</span>`
  : days < 0 ? `<span class="badge tone-danger"><i></i>${t('pt.expiredAgo').replace('{n}', -days)}</span>`
  : days === 0 ? `<span class="badge tone-danger"><i></i>${t('pt.today')}</span>`
  : `<span class="badge tone-${days <= PT_SOON ? 'warning' : 'success'}"><i></i>${t('pt.daysLeft').replace('{n}', days)}</span>`);
const ptBranches = () => Object.keys(LIVE.cache.branches || {});
/* Every batch of a product with what each branch holds of it */
function ptBatches(pid, branchFilter = 'all') {
  const brs = branchFilter === 'all' ? ptBranches() : [branchFilter];
  const lines = productionLines(pid), rows = new Map();
  const row = key => { if (!rows.has(key)) rows.set(key, { key, ...keyDates(key), days: batchDaysLeft(key), produced: 0, vouchers: [], by: {}, stock: 0 }); return rows.get(key); };
  lines.forEach(l => { const x = row(l.key); x.produced += l.qty; x.vouchers.push(l); });
  let loose = 0;
  brs.forEach(br => {
    const v = batchView(pid, br);
    v.list.forEach(b => { const x = row(b.key); x.by[br] = b.qty; x.stock += b.qty; });
    loose += v.loose;
  });
  return { list: [...rows.values()].sort((a, b) => batchExpTs(a.key) - batchExpTs(b.key) || b.key.localeCompare(a.key)), loose };
}
/* The batch's last production line (for its label), or just its dates */
function ptLabelSrc(pid, key) {
  const l = productionLines(pid).filter(x => x.key === key).sort((a, b) => (b.rec.createdAt || 0) - (a.rec.createdAt || 0))[0];
  if (l) { const it = prItems(l.rec).find(i => String(i.itemId) === String(pid)) || { itemId: pid, itemType: 'product' }; return { r: l.rec, it }; }
  return { r: keyDates(key), it: { itemId: pid, itemType: 'product', ...keyDates(key) } };
}
/* What happened to one batch: produced, issued, moved, returned, scrapped, counted */
function ptTrace(pid, key) {
  const out = [], qOf = it => (it.batchKey === key ? Number(it.qty || 0) : it.alloc && it.alloc[key] != null ? Number(it.alloc[key]) : 0);
  productionLines(pid).filter(l => l.key === key).forEach(l => out.push({ ts: l.rec.createdAt, kind: 'production', ic: 'factory', num: l.rec.productionNumber, qty: l.qty, sign: 1, to: l.branchId, rec: l.rec, recId: l.recId }));
  const scan = (path, kind, ic, num, from, to, sign, qtyOf = qOf) => Object.entries(LIVE.cache[path] || {}).forEach(([id, r]) => {
    if (!r || typeof r !== 'object') return;
    ivItems(r).filter(it => it.itemType === 'product' && String(it.itemId) === String(pid)).forEach(it => {
      const q = qtyOf(it, r); if (q == null || (!q && sign !== 2)) return;
      out.push({ ts: r.createdAt, kind, ic, num: r[num], qty: q, sign, from: from(r), to: to(r), rec: r, recId: id });
    });
  });
  scan('stockIssue', 'issue', 'out', 'issueNumber', r => r.branchId, () => '', -1);
  scan('transfers', 'transfers', 'swap', 'transferNumber', r => r.fromBranchId, r => r.toBranchId, 0);
  scan('stockReturn', 'return-warehouse', 'undo', 'stockReturnNumber', r => r.fromBranchId, r => r.toBranchId || mainBranch(), 0);
  scan('scrapReturn', 'damaged-returns', 'trash', 'scrapReturnNumber', r => r.branchId, () => '', -1);
  scan('transferRequests', 'cashier-requests', 'send', 'requestNumber', r => r.stockSentFromBranchId || mainBranch(), r => r.branchId, 0,
    it => (it.alloc && it.alloc[key] != null ? Number(it.alloc[key]) : 0));
  scan('inventoryCount', 'stocktake', 'clipcheck', 'countNumber', () => '', r => r.branchId, 2, it => (it.batchKey === key ? Number(it.qty || 0) : null));
  return out.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

PAGES['production-tracking'] = view => {
  const st = (S.pt ||= { q: '', from: '', to: '', branch: 'all', staff: 'all', pid: null, alert: null });
  const sel = new Set(); // selected batch rows of an alert list: pid|key|branch
  let first = true;
  view.innerHTML = `${pageHeader('production-tracking', `<button class="btn btn-primary" data-pt="new">${icon('plus')}<span>${t('iv.pr.new')}</span></button>`, t('pt.sub'))}<div id="ptMain"></div>`;
  const main = () => $('#ptMain', view);

  const recs = () => Object.entries(LIVE.cache.production || {}).filter(([, r]) => r && typeof r === 'object')
    .filter(([, r]) => (st.branch === 'all' || (r.branchId || '') === st.branch) && (st.staff === 'all' || (r.productionStaffId || '') === st.staff)
      && (!st.from && !st.to || inRange(r.createdAt, st.from, st.to)))
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
  /* One row per produced item: its vouchers and how many of them are near expiry (old page), plus stock in batches */
  function products() {
    const map = new Map(), q = normQ(st.q);
    recs().forEach(([id, r]) => prItems(r).forEach(it => {
      if (!it.itemId) return;
      const k = `${it.itemType}:${it.itemId}`;
      if (!map.has(k)) map.set(k, { k, type: it.itemType, id: it.itemId, item: itemData(it.itemType, it.itemId) || {}, sample: it, vouchers: new Set(), near: 0 });
      const x = map.get(k); x.vouchers.add(id);
      const days = batchDaysLeft(batchKeyOf(it.productionDate || r.productionDate, it.expiryDate || r.expiryDate));
      if (days != null && days >= 0 && days <= PT_SOON) x.near += 1;
    }));
    return [...map.values()].filter(x => !q || normQ([x.item.code, x.item.barcode, x.item.nameAr, x.item.nameEn, x.sample.itemName, x.sample.itemNameAr, x.sample.itemNameEn,
      ...[...x.vouchers].map(id => (LIVE.cache.production[id] || {}).productionNumber)].join(' ')).includes(q))
      .map(x => ({ ...x, count: x.vouchers.size, ...(x.type === 'product' ? (() => { const b = ptBatches(x.id, st.branch); return { stock: b.list.reduce((s, y) => s + y.stock, 0), live: b.list.filter(y => y.stock > 1e-9).length }; })() : { stock: null, live: null }) }))
      .sort((a, b) => b.count - a.count);
  }
  /* Batches still on a shelf: 'soon' = expire within the window, 'expired' = already expired */
  const isAlert = (kind, b) => b.days != null && (kind === 'expired' ? b.days < 0 : b.days >= 0 && b.days <= PT_SOON);
  function alerts(kind) {
    const out = [];
    Object.keys(LIVE.cache.products || {}).forEach(pid => {
      (st.branch === 'all' ? ptBranches() : [st.branch]).forEach(br => batchView(pid, br).list.forEach(b => {
        if (isAlert(kind, b)) out.push({ pid, br, ...b, id: `${pid}|${b.key}|${br}` });
      }));
    });
    return out.sort((a, b) => a.days - b.days || nameOf(LIVE.cache.products[a.pid]).localeCompare(nameOf(LIVE.cache.products[b.pid])));
  }

  const filtersHtml = search => `
      ${search ? `<label class="search-field">${icon('search')}<input type="search" id="ptQ" placeholder="${t('pt.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>` : ''}
      <label class="date-field"><small>${t('c.from')}</small><input type="date" id="ptFrom" value="${st.from}"></label>
      <label class="date-field"><small>${t('c.to')}</small><input type="date" id="ptTo" value="${st.to}"></label>
      <div class="select tb-select">${icon('chevDown')}<select id="ptBr" aria-label="${t('c.branch')}"><option value="all">${t('iv.allBranches')}</option>${Object.entries(LIVE.cache.branches || {}).map(([id, b]) => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join('')}</select></div>
      <div class="select tb-select">${icon('chevDown')}<select id="ptSt" aria-label="${t('iv.staffOne')}"><option value="all">${t('iv.allStaff')}</option>${Object.entries(LIVE.cache.productionStaff || {}).map(([id, s]) => `<option value="${esc(id)}" ${st.staff === id ? 'selected' : ''}>${esc(staffName(s) || id)}</option>`).join('')}</select></div>`;
  const batchActs = (pid, key, br) => `<div class="row-acts pm-acts">${rowMenuBtn()}
    ${actBtn('trace', 'pb', 'activity', t('pt.trace'))}${actBtn('label', 'pb', 'tag', t('iv.pr.printLabel'))}
    ${br ? actBtn('transfer', 'pb', 'swap', t('pt.toTransfer')) : ''}${br ? actBtn('scrap', 'pb', 'trash', t('pt.toScrap'), 'danger') : ''}</div>`;
  const batchAttrs = (pid, key, br, qty) => `data-pid="${esc(pid)}" data-key="${esc(key)}" data-br="${esc(br || '')}" data-qty="${qty || 0}"`;

  function draw() {
    if (!LIVE.loaded(PT_PATHS)) { if (first) main().innerHTML = `<section class="kpis">${skeletonKpis()}</section>`; return; }
    if (st.pid && !itemData(st.pid.split(':')[0], st.pid.split(':').slice(1).join(':'))) st.pid = null;
    const focus = document.activeElement && document.activeElement.id;
    if (st.alert) drawAlerts(); else if (st.pid) drawProduct(); else drawList();
    if (focus === 'ptQ') { const q = $('#ptQ', view); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    first = false;
  }

  function drawList() {
    const rows = products();
    const allBatches = Object.keys(LIVE.cache.products || {}).flatMap(pid => (st.branch === 'all' ? ptBranches() : [st.branch]).flatMap(br => batchView(pid, br).list));
    main().innerHTML = `
      <section class="kpis" id="ptK"></section>
      <section class="card table-card" data-anim>
        <div class="toolbar">${filtersHtml(true)}</div>
        <div class="table-wrap"><table class="dt iv-table">
          <thead><tr><th>${t('pt.code')}</th><th>${t('c.name')}</th><th class="end">${t('pt.vouchers')}</th><th class="end">${t('pt.near')}</th><th class="end">${t('pt.liveBatches')}</th><th class="end">${t('pt.inStock')}</th><th class="act-col"></th></tr></thead>
          <tbody>${rows.length ? rows.map((x, i) => `<tr class="pt-row${first ? ' row-in' : ''}" data-k="${esc(x.k)}" style="--r:${i}" tabindex="0">
            <td data-label="${t('pt.code')}"><span class="mono">${esc(x.item.code || '-')}</span></td>
            <td data-label="${t('c.name')}"><b>${esc(nameOf(x.item) || liveItemName(x.sample))}</b></td>
            <td data-label="${t('pt.vouchers')}" class="end num">${x.count}</td>
            <td data-label="${t('pt.near')}" class="end num${x.near ? ' neg' : ''}">${x.near}</td>
            <td data-label="${t('pt.liveBatches')}" class="end num">${x.live ?? '—'}</td>
            <td data-label="${t('pt.inStock')}" class="end num">${x.stock == null ? '—' : qtyFmt(x.stock)}</td>
            <td class="act-col"><div class="row-acts pm-acts">${actBtn('open', 'pt', 'chevLeft', t('view'))}</div></td></tr>`).join('')
            : ivEmpty(7, !!(st.q || st.from || st.to || st.branch !== 'all' || st.staff !== 'all'), 'activity', t('pt.none'), t('pt.noneSub'))}</tbody>
        </table></div>
      </section>`;
    setKpis($('#ptK', view), [
      kpiCard({ label: t('pt.kLive'), value: allBatches.length, ic: 'layers', tone: 'c1' }),
      kpiCard({ label: t('pt.kQty'), value: allBatches.reduce((s, b) => s + b.qty, 0), ic: 'box', tone: 'c2' }),
      alertKpi('soon', t('pt.kSoon'), allBatches.filter(b => isAlert('soon', b)).length, 'clock'),
      alertKpi('expired', t('pt.kExpired'), allBatches.filter(b => isAlert('expired', b)).length, 'alert')
    ].join(''), first);
  }

  /* The batches of one alert card, to transfer or scrap several at once */
  function drawAlerts() {
    const list = alerts(st.alert), ids = new Set(list.map(a => a.id));
    [...sel].forEach(id => { if (!ids.has(id)) sel.delete(id); });
    const allOn = list.length && list.every(a => sel.has(a.id));
    main().innerHTML = `
      <section class="card pt-head" data-anim>
        <div class="toolbar"><button class="btn btn-ghost" data-pt="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
          <h2 class="pt-title">${t(st.alert === 'expired' ? 'pt.kExpired' : 'pt.kSoon')}<small>${list.length} ${t('pt.batch')}</small></h2>
          <span class="tb-spacer"></span>
          <div class="select tb-select">${icon('chevDown')}<select id="ptBr" aria-label="${t('c.branch')}"><option value="all">${t('iv.allBranches')}</option>${Object.entries(LIVE.cache.branches || {}).map(([id, b]) => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join('')}</select></div>
          <button class="btn btn-ghost" data-bulk="transfer" ${sel.size ? '' : 'disabled'}>${icon('swap')}<span>${t('pt.bulkTransfer')}</span><b class="sel-n">${sel.size || ''}</b></button>
          <button class="btn btn-danger" data-bulk="scrap" ${sel.size ? '' : 'disabled'}>${icon('trash')}<span>${t('pt.bulkScrap')}</span><b class="sel-n">${sel.size || ''}</b></button></div>
      </section>
      <section class="card table-card" data-anim>
        <div class="table-wrap"><table class="dt iv-table">
          <thead><tr><th class="sel-col"><input type="checkbox" id="ptAll" ${allOn ? 'checked' : ''} ${list.length ? '' : 'disabled'} aria-label="${t('pt.selectAll')}"></th><th>${t('c.name')}</th><th>${t('iv.bt.code')}</th><th>${t('iv.prodDate')}</th><th>${t('iv.expiry')}</th><th>${t('c.branch')}</th><th class="end">${t('pt.inStock')}</th><th>${t('pt.state')}</th><th class="act-col"></th></tr></thead>
          <tbody>${list.length ? list.map(a => `<tr ${batchAttrs(a.pid, a.key, a.br, a.qty)} data-id="${esc(a.id)}" class="${sel.has(a.id) ? 'is-sel' : ''}">
            <td class="sel-col"><input type="checkbox" data-sel ${sel.has(a.id) ? 'checked' : ''} aria-label="${esc(nameOf(LIVE.cache.products[a.pid]) || '-')}"></td>
            <td data-label="${t('c.name')}"><b>${esc(nameOf(LIVE.cache.products[a.pid]) || '-')}</b></td>
            <td data-label="${t('iv.bt.code')}"><span class="mono">${esc(batchBarcode(a.pid, a.key) || a.key)}</span></td>
            <td data-label="${t('iv.prodDate')}"><span class="mono">${esc(a.productionDate || '—')}</span></td>
            <td data-label="${t('iv.expiry')}"><span class="mono">${esc(a.expiryDate || '—')}</span></td>
            <td data-label="${t('c.branch')}">${esc(branchLabel(a.br))}</td>
            <td data-label="${t('pt.inStock')}" class="end num"><b>${qtyFmt(a.qty)}</b></td>
            <td data-label="${t('pt.state')}">${ptDays(a.days)}</td>
            <td class="act-col">${batchActs(a.pid, a.key, a.br)}</td></tr>`).join('')
            : ivEmpty(9, false, 'check', t('pt.noAlerts'), t('pt.noAlertsSub'))}</tbody>
        </table></div>
      </section>`;
  }
  /* The selected batches go into one new transfer or damaged-return voucher (one branch at a time) */
  function bulk(kind) {
    const rows = alerts(st.alert).filter(a => sel.has(a.id));
    if (!rows.length) return;
    const brs = [...new Set(rows.map(a => a.br))];
    if (brs.length > 1) { toast(t('pt.oneBranch'), { tone: 'info', ic: 'info' }); return; }
    startVoucher(kind === 'transfer' ? 'transfers' : 'damaged-returns', brs[0], rows.map(a => {
      const p = LIVE.cache.products[a.pid];
      return { itemId: a.pid, itemType: 'product', name: nameOf(p) || arName(p), qty: a.qty, unitId: p.unitId || null, unitName: unitName(p.unitId) || null, batchKey: a.key };
    }));
  }

  function drawProduct() {
    const [type, ...rest] = st.pid.split(':'), id = rest.join(':'), item = itemData(type, id) || {};
    const lines = recs().flatMap(([rid, r]) => prItems(r).filter(it => it.itemType === type && String(it.itemId) === String(id)).map(it => ({ rid, r, it })));
    const bt = type === 'product' ? ptBatches(id, st.branch) : { list: [], loose: 0 };
    const brs = st.branch === 'all' ? ptBranches() : [st.branch];
    main().innerHTML = `
      <section class="card pt-head" data-anim>
        <div class="toolbar"><button class="btn btn-ghost" data-pt="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
          <h2 class="pt-title">${esc(nameOf(item) || '-')}<small class="mono">${esc(item.code || '')}${item.barcode ? ` · ${esc(item.barcode)}` : ''}</small></h2></div>
        <div class="toolbar">${filtersHtml(false)}</div>
      </section>
      ${type === 'product' ? `<section class="card table-card" data-anim>
        <header class="card-head"><h2>${icon('layers')}${t('pt.batches')}</h2>${bt.loose > 1e-9 ? `<span class="badge tone-neutral" data-tip="${esc(t('pt.looseTip'))}"><i></i>${t('iv.bt.loose')}: ${qtyFmt(bt.loose)}</span>` : ''}</header>
        <div class="table-wrap"><table class="dt iv-table">
          <thead><tr><th>${t('iv.bt.code')}</th><th>${t('iv.prodDate')}</th><th>${t('iv.expiry')}</th><th>${t('pt.state')}</th><th class="end">${t('pt.produced')}</th><th>${t('pt.byBranch')}</th><th class="end">${t('pt.inStock')}</th><th class="act-col"></th></tr></thead>
          <tbody>${bt.list.length ? bt.list.map(b => {
            const only = Object.entries(b.by).filter(([, q]) => q > 1e-9);
            const br = only.length === 1 ? only[0][0] : brs.length === 1 ? brs[0] : '';
            return `<tr ${batchAttrs(id, b.key, br, br ? b.by[br] || 0 : 0)} class="${b.stock > 1e-9 ? '' : 'pt-empty'}">
            <td data-label="${t('iv.bt.code')}"><span class="mono">${esc(batchBarcode(id, b.key) || b.key)}</span></td>
            <td data-label="${t('iv.prodDate')}"><span class="mono">${esc(b.productionDate || '—')}</span></td>
            <td data-label="${t('iv.expiry')}"><span class="mono">${esc(b.expiryDate || '—')}</span></td>
            <td data-label="${t('pt.state')}">${b.stock > 1e-9 ? ptDays(b.days) : `<span class="badge tone-neutral"><i></i>${t('pt.finished')}</span>`}</td>
            <td data-label="${t('pt.produced')}" class="end num">${b.produced ? qtyFmt(b.produced) : '—'}</td>
            <td data-label="${t('pt.byBranch')}"><span class="pt-chips">${only.length ? only.map(([bid, q]) => `<span class="pt-chip">${esc(branchLabel(bid))} <b class="num">${qtyFmt(q)}</b></span>`).join('') : '<span class="muted">—</span>'}</span></td>
            <td data-label="${t('pt.inStock')}" class="end num"><b>${qtyFmt(b.stock)}</b></td>
            <td class="act-col">${batchActs(id, b.key, br)}</td></tr>`;
          }).join('') : ivEmpty(8, false, 'layers', t('pt.noBatches'), t('pt.noBatchesSub'))}</tbody>
        </table></div></section>` : ''}
      <section class="card table-card" data-anim>
        <header class="card-head"><h2>${icon('factory')}${t('pt.prodVouchers')}</h2></header>
        <div class="table-wrap"><table class="dt iv-table">
          <thead><tr><th>${t('iv.pr.number')}</th><th class="end">${t('c.qty')}</th><th>${t('c.date')}</th><th>${t('iv.prodDate')}</th><th>${t('iv.expiry')}</th><th>${t('c.branch')}</th><th>${t('pm.storekeeper')}</th><th>${t('iv.staffOne')}</th><th>${t('iv.pr.issueNo')}</th><th class="act-col"></th></tr></thead>
          <tbody>${lines.length ? lines.map(({ rid, r, it }) => {
            const pd = it.productionDate || r.productionDate, ed = it.expiryDate || r.expiryDate;
            return `<tr data-rid="${esc(rid)}">
            <td data-label="${t('iv.pr.number')}"><b class="mono">#${esc(r.productionNumber ?? '-')}</b></td>
            <td data-label="${t('c.qty')}" class="end num">${esc(prQty(it))}</td>
            <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(r.createdAt)}</span></td>
            <td data-label="${t('iv.prodDate')}"><span class="mono">${esc(pd || '-')}</span></td>
            <td data-label="${t('iv.expiry')}"><span class="cell-2"><span class="mono">${esc(ed || '-')}</span>${ed ? ptDays(batchDaysLeft(batchKeyOf(pd, ed))) : ''}</span></td>
            <td data-label="${t('c.branch')}">${esc(branchLabel(r.branchId) || '-')}</td>
            <td data-label="${t('pm.storekeeper')}">${esc(r.storekeeperName || '-')}</td>
            <td data-label="${t('iv.staffOne')}">${esc(ivStaffLabel(r))}</td>
            <td data-label="${t('iv.pr.issueNo')}">${r.issueNumber ? `<button class="badge tone-info badge-btn" data-pv="issue">#${esc(r.issueNumber)}</button>` : '<span class="muted">—</span>'}</td>
            <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}${actBtn('report', 'pv', 'printer', t('iv.printReport'))}${actBtn('label', 'pv', 'tag', t('iv.pr.printLabel'))}</div></td></tr>`;
          }).join('') : ivEmpty(10, true, 'factory', t('iv.pr.none'), t('iv.pr.noneSub'))}</tbody>
        </table></div></section>`;
  }

  /* Where one batch went */
  function trace(pid, key) {
    const p = (LIVE.cache.products || {})[pid] || {}, steps = ptTrace(pid, key), now = ptBatches(pid).list.find(b => b.key === key) || { by: {}, stock: 0, produced: 0 };
    const arrow = document.dir === 'rtl' ? '←' : '→';
    const where = s => (s.from && s.to ? `${branchLabel(s.from)} ${arrow} ${branchLabel(s.to)}` : branchLabel(s.to || s.from) || '-');
    const qtyTxt = s => (s.sign === 2 ? `${t('pt.countedAs')} ${qtyFmt(s.qty)}` : `${s.sign > 0 ? '+' : s.sign < 0 ? '−' : ''}${qtyFmt(s.qty)}`);
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('activity')}</span><div><h2 id="drawerTitle">${esc(nameOf(p) || '-')}</h2><p class="mono">${esc(batchBarcode(pid, key) || key)}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid three">
          <div><small>${t('iv.prodDate')}</small><b class="mono">${esc(keyDates(key).productionDate || '—')}</b></div>
          <div><small>${t('iv.expiry')}</small><b class="mono">${esc(keyDates(key).expiryDate || '—')}</b></div>
          <div><small>${t('pt.state')}</small><b>${now.stock > 1e-9 ? ptDays(batchDaysLeft(key)) : t('pt.finished')}</b></div>
          <div><small>${t('pt.produced')}</small><b class="num">${qtyFmt(now.produced || 0)}</b></div>
          <div><small>${t('pt.inStock')}</small><b class="num">${qtyFmt(now.stock || 0)}</b></div>
          <div><small>${t('pt.byBranch')}</small><b>${Object.entries(now.by).filter(([, q]) => q > 1e-9).map(([b, q]) => `${esc(branchLabel(b))}: ${qtyFmt(q)}`).join(' · ') || '—'}</b></div>
        </div>
        <h3 class="dr-sub">${t('pt.path')}</h3>
        ${steps.length ? `<ol class="pt-trace">${steps.map((s, i) => `<li data-i="${i}">
          <span class="pt-dot">${icon(s.ic)}</span>
          <div><b>${t(s.kind)} #${esc(s.num ?? '-')}</b><small>${esc(fmtDateTime(s.ts))} · ${esc(where(s))}</small>
            ${s.kind === 'production' && s.rec.issueNumber ? `<button class="badge tone-info badge-btn" data-tr="issue" data-i="${i}">${t('iv.pr.linkedIssue')} #${esc(s.rec.issueNumber)}</button>` : ''}</div>
          <b class="num ${s.sign < 0 ? 'neg' : ''}">${qtyTxt(s)}</b></li>`).join('')}</ol>` : `<p class="muted">${t('pt.noPath')}</p>`}
        <p class="muted pt-note">${t('pt.traceNote')}</p>
      </div>`;
    openLayer('#drawer');
    dr.onclick = e => {
      const b = e.target.closest('[data-tr]'); if (!b) return;
      const s = steps[+b.dataset.i], i = s && (LIVE.cache.stockIssue || {})[s.rec.issueId];
      if (i) { dr.onclick = null; issueDetails(i); } else toast(t('iv.pr.issueGone'), { tone: 'info', ic: 'info' });
    };
  }

  function batchAction(a, tr) {
    const pid = tr.dataset.pid, key = tr.dataset.key, br = tr.dataset.br, qty = Number(tr.dataset.qty || 0);
    if (a === 'trace') return trace(pid, key);
    if (a === 'label') { const { r, it } = ptLabelSrc(pid, key); return printProdLabels(r, [{ it, copies: 1 }]); }
    const p = (LIVE.cache.products || {})[pid]; if (!p) return;
    if (!br) { toast(t('pt.pickBranch'), { tone: 'info', ic: 'info' }); return; }
    startVoucher(a === 'transfer' ? 'transfers' : 'damaged-returns', br, [{ itemId: pid, itemType: 'product', name: nameOf(p) || arName(p), qty, unitId: p.unitId || null, unitName: unitName(p.unitId) || null, batchKey: key }]);
  }

  let deb;
  view.addEventListener('input', e => { if (e.target.id !== 'ptQ') return; clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); draw(); }, 150); });
  view.addEventListener('change', e => {
    const f = { ptFrom: 'from', ptTo: 'to', ptBr: 'branch', ptSt: 'staff' }[e.target.id]; if (!f) return;
    st[f] = e.target.value; draw();
  });
  view.addEventListener('change', e => {
    if (e.target.id === 'ptAll') { alerts(st.alert).forEach(a => (e.target.checked ? sel.add(a.id) : sel.delete(a.id))); draw(); return; }
    if (e.target.matches('[data-sel]')) { const id = e.target.closest('tr').dataset.id; e.target.checked ? sel.add(id) : sel.delete(id); draw(); }
  });
  const openAlert = kind => { st.alert = kind; sel.clear(); draw(); scrollTo({ top: 0, behavior: 'smooth' }); };
  const open = tr => { st.pid = tr.dataset.k; draw(); scrollTo({ top: 0, behavior: 'smooth' }); };
  view.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const k = e.target.closest && e.target.closest('[data-alert]'); if (k) { e.preventDefault(); openAlert(k.dataset.alert); return; }
    const tr = e.target.closest && e.target.closest('tr.pt-row'); if (tr && e.key === 'Enter') open(tr);
  });
  view.addEventListener('click', e => {
    const top = e.target.closest('[data-pt]');
    if (top && top.dataset.pt === 'new') { location.hash = '#/production'; return; }
    if (top && top.dataset.pt === 'back') { if (st.alert) st.alert = null; else st.pid = null; draw(); return; }
    const k = e.target.closest('[data-alert]'); if (k) { openAlert(k.dataset.alert); return; }
    const bk = e.target.closest('[data-bulk]'); if (bk) { bulk(bk.dataset.bulk); return; }
    const pb = e.target.closest('[data-pb]'); if (pb) { batchAction(pb.dataset.pb, pb.closest('tr')); return; }
    const pv = e.target.closest('[data-pv]');
    if (pv) {
      const rid = pv.closest('tr').dataset.rid, r = (LIVE.cache.production || {})[rid]; if (!r) return;
      if (pv.dataset.pv === 'issue') { const i = (LIVE.cache.stockIssue || {})[r.issueId]; if (i) issueDetails(i); else toast(t('iv.pr.issueGone'), { tone: 'info', ic: 'info' }); }
      else if (pv.dataset.pv === 'report') prPrintReport({ r, items: prItems(r) });
      else if (pv.dataset.pv === 'label') { const [type, ...rest] = st.pid.split(':'); printProdLabels(r, prItems(r).filter(it => it.itemType === type && String(it.itemId) === rest.join(':')).map(it => ({ it, copies: 1 }))); }
      return;
    }
    const tr = e.target.closest('tr.pt-row'); if (tr && !e.target.closest('.rm-btn')) open(tr);
  });
  const unsub = LIVE.watch(PT_PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
