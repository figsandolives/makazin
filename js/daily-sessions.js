/* =====================================================================
   يوميات الموظفين — dailySessions/{id} {cashierName, cashierCode, branch (name), openedAt, closedAt,
   openingAmount, status: open|closed, payments: [{name, amount}], and what the cashier saved when
   closing: totals {cash, online, knet}, ordersCount, firstInvoice, lastInvoice}. A session's invoices
   are the orders with its dailySessionId (older ones: same branch and cashier code inside its time).
   Same as the old page (the list and the 80mm daily receipt), plus fixes: invoices paid by payment
   link (or any other method) were left out of the revenue, and a session whose closing figures
   differ from its invoices is flagged (the cashier counts only that day's invoices when a session
   runs past midnight).
   ===================================================================== */
LIVE_ROUTES.add('employee-journal');

PAGES['employee-journal'] = view => {
  const st = (S.dj ||= { per: 10, page: 1, q: '' });
  const PATHS = ['dailySessions', 'orders', 'branches', 'cashiers', 'orderTypes', 'paymentMethods', 'customers', 'deliveryZones'];
  let first = true;
  const PAYS = ['cash', 'online', 'knet', 'link'];
  view.innerHTML = `
    ${pageHeader('employee-journal', '', t('dj.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="djQ" placeholder="${t('dj.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <span class="tb-spacer"></span><span class="muted" id="djCount"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('dj.employee')}</th><th>${t('c.branch')}</th><th>${t('dj.opened')}</th><th>${t('dj.closed')}</th><th class="end">${t('dj.opening')}</th><th>${t('c.status')}</th><th class="act-col"></th></tr></thead>
        <tbody id="djBody"></tbody></table></div>
      <footer class="pager" id="djPager"></footer>
    </section>`;

  const sessions = () => Object.entries(LIVE.cache.dailySessions || {}).filter(([, s]) => s && typeof s === 'object').map(([id, s]) => ({ ...s, id }));
  const n3 = v => Number(v || 0).toFixed(3);
  // The session's invoices, oldest first (as the old page found them)
  function ordersOf(s) {
    return Object.entries(LIVE.cache.orders || {}).map(([id, o]) => ({ ...o, id })).filter(o => {
      if (o.dailySessionId) return o.dailySessionId === s.id;
      const ts = oTime(o);
      return o.branch === s.branch && String(o.cashierCode || '') === String(s.cashierCode || '') && ts >= (s.openedAt || 0) && (!s.closedAt || ts <= s.closedAt);
    }).sort((a, b) => oTime(a) - oTime(b));
  }
  // cash / online / knet / link as the cashier writes them (or a payment method record's name)
  const PAY_ALIAS = { cash: 'cash', 'كاش': 'cash', online: 'online', 'اونلاين': 'online', knet: 'knet', 'k-net': 'knet', 'كي نت': 'knet', 'كي-نت': 'knet', payment_link: 'link', subscription: 'link', 'رابط دفع': 'link' };
  const payKey = o => {
    const raw = oPayValue(o), pm = (LIVE.cache.paymentMethods || {})[raw];
    const names = pm ? [pm.nameEn, pm.nameAr] : [raw];
    for (const n of names) { const k = PAY_ALIAS[normQ(n).replace(/ى/g, 'ي')] || PAY_ALIAS[String(n || '').toLowerCase()]; if (k) return k; }
    return 'other';
  };
  const dayOf = ts => { const d = new Date(ts || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function summary(s) {
    const orders = ordersOf(s), active = orders.filter(o => !oCancelled(o));
    const totals = { cash: 0, online: 0, knet: 0, link: 0, other: 0 };
    active.forEach(o => { totals[payKey(o)] += Number(o.total) || 0; });
    const delivery = active.filter(o => o.orderType === 'delivery');
    const pending = delivery.filter(o => !String(o.courierName || '').trim()), day = dayOf(s.openedAt);
    const payments = (Array.isArray(s.payments) ? s.payments : Object.values(s.payments || {})).filter(Boolean);
    const num = o => o.invoiceNumber || oNum(o);
    return {
      orders, active, totals, payments, paid: payments.reduce((a, p) => a + (Number(p.amount) || 0), 0),
      cancelled: orders.filter(oCancelled), delivered: delivery.filter(o => String(o.courierName || '').trim()),
      sameDay: pending.filter(o => !o.deliveryDate || o.deliveryDate === day), future: pending.filter(o => o.deliveryDate && o.deliveryDate !== day),
      firstInvoice: orders.length ? num(orders[0]) : '-', lastInvoice: orders.length ? num(orders[orders.length - 1]) : '-'
    };
  }
  // Closing figures the cashier saved that don't match the invoices
  function mismatch(s, sm) {
    if (s.status !== 'closed' || s.ordersCount == null) return null;
    const saved = s.totals || {}, diff = ['cash', 'online', 'knet'].some(k => Math.abs((Number(saved[k]) || 0) - sm.totals[k]) > 0.0005);
    return Number(s.ordersCount) !== sm.orders.length || diff ? { count: Number(s.ordersCount), first: s.firstInvoice || '-', last: s.lastInvoice || '-', totals: saved } : null;
  }

  function list() {
    const q = normQ(st.q);
    return sessions().filter(s => !q || normQ(`${s.cashierName || ''} ${s.cashierCode || ''} ${s.branch || ''}`).includes(q)).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
  }
  function draw() {
    const body = $('#djBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 7)); return; }
    const all = list();
    $('#djCount', view).textContent = t('dj.count').replace('{n}', all.length);
    setHtml($('#djPager', view), pagerHtml(st, all.length));
    const slice = all.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map((s, i) => {
      const closed = s.status === 'closed', off = closed && mismatch(s, summary(s));
      return `<tr data-id="${esc(s.id)}" class="${first ? 'row-in' : ''} dj-row" style="--r:${i}" tabindex="0">
        <td data-label="${t('dj.employee')}"><span class="us-name"><span class="av" style="--h:${hue(s.cashierName || s.id)}">${esc(String(s.cashierName || '?').trim().charAt(0) || '?')}</span>
          <span class="cell-2"><b>${esc(s.cashierName || '-')}</b>${s.cashierCode ? `<small class="mono">${esc(s.cashierCode)}</small>` : ''}</span></span></td>
        <td data-label="${t('c.branch')}">${esc(s.branch || '-')}</td>
        <td data-label="${t('dj.opened')}"><span class="date">${s.openedAt ? fmtDateTime(s.openedAt) : '-'}</span></td>
        <td data-label="${t('dj.closed')}"><span class="date">${s.closedAt ? fmtDateTime(s.closedAt) : '-'}</span></td>
        <td data-label="${t('dj.opening')}" class="end num">${moneyPlain(s.openingAmount)}</td>
        <td data-label="${t('c.status')}"><span class="badge tone-${closed ? 'neutral' : 'success'}"><i></i>${t(closed ? 'dj.st_closed' : 'dj.st_open')}</span>${off ? ` <span class="badge tone-warning" data-tip="${esc(t('dj.offTip'))}">${icon('alert')}${t('dj.off')}</span>` : ''}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-dj="view" aria-label="${t('dj.view')}">${icon('eye')}</button>
          <button class="btn-icon sm" data-dj="print" aria-label="${t('dj.print')}">${icon('printer')}</button></div></td></tr>`;
    }).join('')
      : `<tr class="empty"><td colspan="7"><div class="empty-state">${icon(st.q ? 'search' : 'journal')}<b>${t(st.q ? 'emptyTitle' : 'dj.none')}</b><small>${t(st.q ? 'emptySub' : 'dj.noneSub')}</small></div></td></tr>`);
    first = false;
  }

  /* ---------- details ---------- */
  const payLabel = k => t('dj.p_' + k);
  const orderPay = o => payLabel(payKey(o));
  function details(id) {
    const s = sessions().find(x => x.id === id); if (!s) return;
    const sm = summary(s), off = mismatch(s, sm);
    const shownPays = PAYS.concat('other').filter(k => k !== 'link' && k !== 'other' || sm.totals[k] > 0);
    const oTable = (rows, cols, line) => rows.length ? `<div class="table-wrap"><table class="dt mini-dt"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(o => `<tr data-oid="${esc(o.id)}" class="dj-inv">${line(o).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('dj.noneHere')}</p>`;
    const num = o => `<span class="badge tone-info">#${esc(o.invoiceNumber || oNum(o))}</span>`;
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('journal')}</span><div><h2 id="drawerTitle">${t('dj.title')} ${esc(s.cashierName || '')}</h2><p>${esc(s.branch || '-')} · ${t(s.status === 'closed' ? 'dj.st_closed' : 'dj.st_open')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body dj-body">
        ${off ? `<div class="dj-warn">${icon('alert')}<div><b>${t('dj.offTitle')}</b><p>${t('dj.offBody').replace('{c}', off.count).replace('{f}', esc(off.first)).replace('{l}', esc(off.last)).replace('{n}', sm.orders.length)}</p>
          <small>${t('dj.offSaved')}: ${['cash', 'online', 'knet'].map(k => `${payLabel(k)} ${n3(off.totals[k])}`).join(' · ')}</small></div></div>` : ''}
        <div class="info-grid three">
          <div><small>${t('dj.opened')}</small><b>${s.openedAt ? fmtDateTime(s.openedAt) : '-'}</b></div>
          <div><small>${t('dj.closed')}</small><b>${s.closedAt ? fmtDateTime(s.closedAt) : '-'}</b></div>
          <div><small>${t('dj.opening')}</small><b>${moneyPlain(s.openingAmount)}</b></div>
          <div><small>${t('dj.first')}</small><b>${esc(sm.firstInvoice)}</b></div>
          <div><small>${t('dj.last')}</small><b>${esc(sm.lastInvoice)}</b></div>
          <div><small>${t('dj.invoices')}</small><b>${sm.orders.length}</b></div>
        </div>
        <h3 class="dj-h">${t('dj.revenue')}</h3>
        <div class="dj-pays">${shownPays.map(k => `<div><small>${payLabel(k)}</small><b>${moneyPlain(sm.totals[k])}</b></div>`).join('')}</div>
        <h3 class="dj-h">${t('dj.payments')}</h3>
        ${sm.payments.length ? `<ul class="dj-list">${sm.payments.map(p => `<li><span>${esc(p.name || '-')}</span><b>${moneyPlain(p.amount)}</b></li>`).join('')}<li class="tot"><span>${t('dj.paymentsTotal')}</span><b>${moneyPlain(sm.paid)}</b></li></ul>` : `<p class="muted">${t('dj.noPayments')}</p>`}
        ${sm.cancelled.length ? `<h3 class="dj-h">${t('dj.cancelled')}</h3>${oTable(sm.cancelled, [t('o.number'), t('o.grand'), t('dj.pay')], o => [num(o), moneyPlain(o.total), orderPay(o)])}` : ''}
        <h3 class="dj-h">${t('dj.delivered')}</h3>
        ${oTable(sm.delivered, [t('o.number'), t('dj.pay'), t('o.grand'), t('o.fee'), t('dj.courier')], o => [num(o), orderPay(o), moneyPlain(o.total), moneyPlain(oFee(o)), esc(o.courierName || '-')])}
        ${sm.sameDay.length ? `<h3 class="dj-h">${t('dj.sameDay')}</h3>${oTable(sm.sameDay, [t('o.number'), t('dj.pay'), t('o.grand'), t('o.fee'), t('dj.time')], o => [num(o), orderPay(o), moneyPlain(o.total), moneyPlain(oFee(o)), esc(timeRange(o))])}` : ''}
        ${sm.future.length ? `<h3 class="dj-h">${t('dj.future')}</h3>${oTable(sm.future, [t('o.number'), t('dj.pay'), t('o.grand'), t('dj.when')], o => [num(o), orderPay(o), moneyPlain(o.total), esc(`${o.deliveryDate || '-'} · ${timeRange(o)}`)])}` : ''}
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><button class="btn btn-primary" id="djPrint">${icon('printer')}<span>${t('dj.print')}</span></button></footer>`;
    openLayer('#drawer');
    $('#djPrint', dr).addEventListener('click', () => print(id));
    dr.addEventListener('click', e => { const r = e.target.closest('tr.dj-inv'); if (!r) return; const o = (LIVE.cache.orders || {})[r.dataset.oid]; if (o) invoiceDetails(o); });
  }
  const hm = v => { if (!v) return '-'; const [h, m = '00'] = String(v).split(':'); const n = parseInt(h, 10); if (isNaN(n)) return v; return `${n % 12 || 12}:${m} ${n === 12 ? t('dj.noon') : n > 12 ? t('dj.pm') : t('dj.am')}`; };
  const timeRange = o => `${hm(o.deliveryTimeFrom)} – ${hm(o.deliveryTimeTo)}`;

  /* ---------- 80mm receipt (same layout as the old page) ---------- */
  function print(id) {
    const s = sessions().find(x => x.id === id); if (!s) return;
    const sm = summary(s), cur = t('currency');
    const row = (a, b) => `<div class="row"><span>${a}</span><span class="b">${b}</span></div>`;
    const tbl = (cols, rows) => `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    const cancelMark = o => (oCancelled(o) ? ` (${t('dj.cancelledMark')})` : '');
    const num = o => esc(o.invoiceNumber || oNum(o));
    const dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    const doc = `<!doctype html><html lang="${S.lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(t('dj.title'))}</title>
      <style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}body{width:80mm;margin:0;padding:4mm 7mm;font-family:Arial,sans-serif;color:#111}
      .r{width:64mm;margin:0 auto}h1{font-size:18px;margin:2mm 0;text-align:center}h2{font-size:14px;margin:4mm 0 2mm;border-top:1px dashed #000;padding-top:2mm}
      .row{display:flex;justify-content:space-between;gap:3mm;font-size:12px;margin:1.5mm 0}.b{font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:8px;margin-top:2mm;table-layout:fixed}th{background:#e5e7eb;border-bottom:1px solid #000;padding:1mm .5mm}
      td{border-bottom:1px dotted #bbb;padding:1mm .5mm;text-align:center;overflow-wrap:anywhere}.thanks{text-align:center;font-weight:900;font-size:15px;margin-top:5mm;border-top:1px dashed #000;padding-top:3mm}</style></head>
      <body><div class="r"><h1>${esc(t('dj.title'))} ${esc(s.cashierName || '')}</h1>
      ${row(t('dj.opened') + ':', s.openedAt ? esc(fmtDateTime(s.openedAt)) : '-')}${row(t('dj.opening') + ':', `${n3(s.openingAmount)} ${cur}`)}${row(t('dj.closed') + ':', s.closedAt ? esc(fmtDateTime(s.closedAt)) : '-')}
      <h2>${t('dj.revenue')}</h2>${['cash', 'online', 'knet'].concat(sm.totals.link > 0 ? ['link'] : [], sm.totals.other > 0 ? ['other'] : []).map(k => row(payLabel(k), `${n3(sm.totals[k])} ${cur}`)).join('')}
      <h2>${t('dj.payments')}</h2>${sm.payments.length ? sm.payments.map(p => row(esc(p.name || '-'), `${n3(p.amount)} ${cur}`)).join('') : row(t('dj.noPayments'), `0.000 ${cur}`)}${row(t('dj.paymentsTotal'), `${n3(sm.paid)} ${cur}`)}
      <h2>${t('dj.invoicesH')}</h2>${row(t('dj.first') + ':', esc(sm.firstInvoice))}${row(t('dj.last') + ':', esc(sm.lastInvoice))}
      ${sm.cancelled.length ? `<h2>${t('dj.cancelled')}</h2>${sm.cancelled.map(o => `<div>#${num(o)}</div>`).join('')}` : ''}
      <h2>${t('dj.delivered')}</h2>${tbl([t('dj.inv'), t('dj.pay'), t('dj.value'), t('o.fee'), t('dj.courier')], sm.delivered.map(o => `<tr><td>${num(o)}${cancelMark(o)}</td><td>${orderPay(o)}</td><td>${n3(o.total)}</td><td>${n3(oFee(o))}</td><td>${esc(o.courierName || '-')}</td></tr>`).join('') || `<tr><td colspan="5">${t('dj.noDelivered')}</td></tr>`)}
      ${sm.sameDay.length ? `<h2>${t('dj.sameDay')}</h2>${tbl([t('dj.inv'), t('dj.pay'), t('dj.value'), t('o.fee'), t('dj.time')], sm.sameDay.map(o => `<tr><td>${num(o)}</td><td>${orderPay(o)}</td><td>${n3(o.total)}</td><td>${n3(oFee(o))}</td><td>${esc(timeRange(o))}</td></tr>`).join(''))}` : ''}
      ${sm.future.length ? `<h2>${t('dj.future')}</h2>${tbl([t('dj.inv'), t('dj.pay'), t('dj.value'), t('dj.when')], sm.future.map(o => `<tr><td>${num(o)}</td><td>${orderPay(o)}</td><td>${n3(o.total)}</td><td>${esc(`${o.deliveryDate || '-'} · ${timeRange(o)}`)}</td></tr>`).join(''))}` : ''}
      <div class="thanks">${t('dj.thanks')}</div></div></body></html>`;
    printHtml(doc);
  }

  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  $('#djQ', view).addEventListener('input', e => { st.q = e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const tr = e.target.closest('tr.dj-row'); if (!tr) return;
    const b = e.target.closest('[data-dj]');
    if (b && b.dataset.dj === 'print') { if (allLoaded()) print(tr.dataset.id); return; }
    if (e.target.closest('.row-acts') && !b) return;
    details(tr.dataset.id);
  });
  view.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr.dj-row')) details(e.target.dataset.id); });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
