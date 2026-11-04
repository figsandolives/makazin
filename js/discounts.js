/* =====================================================================
   خصومات — discounts/{id}: a code {type:'code', code, audience, startDate, endDate, valueType, value},
   a product discount {type:'product', targetType: product|category, productId|categoryId, startDate,
   endDate, valueType, value, applyTiming: start_date|before_expiry, daysBeforeExpiry}, and the fixed
   manager discount (discounts/managerDiscount, locked). Each one opens its invoices over a period.
   Same as the old page, plus fixes: a product discount can be saved (the old form read a batch field
   that wasn't on it and stopped), every field the form shows is saved and loaded back, values and
   dates are checked (no 0 or over-100% discount, no end before start, no repeated code), editing
   keeps the creation date, and the manager discount counts the invoices the cashier really
   discounts (it looked for a flag the cashier never writes, so it always showed 0).
   ===================================================================== */
LIVE_ROUTES.add('discounts');

PAGES.discounts = view => {
  const st = (S.ds ||= { per: 10, page: 1, detail: null, from: '', to: '' });
  const PATHS = ['discounts', 'discountUsage', 'orders', 'products', 'productCategories', 'branches', 'cashiers', 'customers', 'orderTypes', 'paymentMethods', 'deliveryZones'];
  const MANAGER = 'managerDiscount';
  const AUD = ['all', 'vip', 'vvip'];
  let first = true, saving = false;

  const discounts = () => LIVE.cache.discounts || {};
  const isManager = (id, d) => id === MANAGER || !!(d && (d.type === 'manager' || d.locked));
  const products = () => LIVE.cache.products || {};
  const cats = () => LIVE.cache.productCategories || {};
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const valueText = d => (Number(d.value) > 0 ? (d.valueType === 'amount' ? moneyPlain(d.value) : `${fmtNum(d.value, 3, 0)}%`) : '');
  function title(id, d) {
    if (isManager(id, d)) return t('ds.manager');
    if (d.type === 'code') return `${t('ds.code')}: ${d.code || '-'}`;
    if ((d.targetType || 'product') === 'category') return `${t('ds.product')}: ${t('ds.tCategory')} — ${rpCatTrail(d.categoryId)}`;
    return `${t('ds.product')}: ${nameOf(products()[d.productId]) || '-'}`;
  }
  function sub(id, d) {
    if (isManager(id, d)) return t('ds.managerSub');
    const parts = [valueText(d), d.startDate || d.endDate ? `${d.startDate || '…'} → ${d.endDate || '…'}` : ''];
    if (d.type === 'code' && d.audience && d.audience !== 'all') parts.push(t('ds.aud_' + d.audience));
    if (d.type === 'product' && d.applyTiming === 'before_expiry' && d.daysBeforeExpiry) parts.push(t('ds.daysShort').replace('{n}', d.daysBeforeExpiry));
    return parts.filter(Boolean).join(' · ');
  }
  const expired = d => !!d.endDate && d.endDate < today();
  // Invoices of a discount: the manager one is every discounted invoice, the others are in discountUsage
  function ordersOf(id, d, from = '', to = '') {
    const all = Object.entries(LIVE.cache.orders || {}).filter(([, o]) => o && typeof o === 'object' && !oCancelled(o)).map(([oid, o]) => ({ id: oid, ...o }));
    let list;
    if (isManager(id, d)) list = all.filter(o => oDiscount(o) > 0);
    else {
      const use = (LIVE.cache.discountUsage || {})[id] || {};
      const keys = new Set(Object.keys(use)), ids = new Set(), nums = new Set();
      Object.values(use).forEach(u => { if (!u) return; const i = String(u.orderId || u.id || '').trim(), n = String(u.orderNumber || u.invoiceNumber || '').trim(); if (i) ids.add(i); if (n) nums.add(n); });
      list = all.filter(o => keys.has(o.id) || ids.has(String(o.id)) || nums.has(String(o.orderNumber || '')));
    }
    return list.filter(o => inRange(oTime(o), from, to)).sort((a, b) => oTime(b) - oTime(a));
  }

  /* ---------- list ---------- */
  function mountList() {
    view.innerHTML = `
      ${pageHeader('discounts', `<button class="btn btn-primary" data-ds="new">${icon('plus')}<span>${t('ds.add')}</span></button>`, t('ds.sub'))}
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools"><span class="tb-spacer"></span>${perHtml(st)}</div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr><th>${t('ds.type')}</th><th>${t('c.status')}</th><th class="end">${t('ds.usage')}</th><th>${t('c.date')}</th><th class="act-col"></th></tr></thead>
          <tbody id="dsBody"></tbody></table></div>
        <footer class="pager" id="dsPager"></footer>
      </section>`;
    $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
    first = true;
  }
  function drawList() {
    const body = $('#dsBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 5)); return; }
    ensureManager();
    const list = Object.entries(discounts()).filter(([, d]) => d && typeof d === 'object')
      .sort((a, b) => isManager(...b) - isManager(...a) || Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0));
    setHtml($('#dsPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, d], i) => {
      const mgr = isManager(id, d), status = !d.active ? 'off' : expired(d) ? 'expired' : 'on';
      return `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('ds.type')}"><button class="ds-name" data-ds="view"><span class="ph-ic sm ds-ic ${mgr ? 'mgr' : d.type === 'code' ? 'code' : 'prd'}">${icon(mgr ? 'shield' : d.type === 'code' ? 'tag' : 'package')}</span>
          <span class="cell-2"><b>${esc(title(id, d))}</b><small>${esc(sub(id, d))}</small></span></button></td>
        <td data-label="${t('c.status')}"><span class="badge tone-${{ on: 'success', off: 'neutral', expired: 'warning' }[status]}"><i></i>${t('ds.st_' + status)}</span></td>
        <td data-label="${t('ds.usage')}" class="end num">${ordersOf(id, d).length}</td>
        <td data-label="${t('c.date')}"><span class="date">${d.createdAt ? fmtDateTime(d.createdAt) : '-'}</span></td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-ds="toggle" aria-label="${t(d.active ? 'ds.deactivate' : 'ds.activate')}" data-tip="${t(d.active ? 'ds.deactivate' : 'ds.activate')}">${icon(d.active ? 'x' : 'check')}</button>
          ${mgr ? '' : `<button class="btn-icon sm" data-ds="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-ds="delete" aria-label="${t('delete')}">${icon('trash')}</button>`}</div></td></tr>`;
    }).join('')
      : `<tr class="empty"><td colspan="5"><div class="empty-state">${icon('percent')}<b>${t('ds.none')}</b><small>${t('ds.noneSub')}</small></div></td></tr>`);
    first = false;
  }
  // The manager discount is always there (as the old page made sure)
  let ensured = false;
  function ensureManager() {
    if (ensured || discounts()[MANAGER]) return;
    ensured = true;
    LIVE.update({ [`discounts/${MANAGER}`]: { type: 'manager', label: 'manager_discount', active: true, locked: true, createdAt: LIVE.now() } }).catch(() => { ensured = false; });
  }

  /* ---------- details ---------- */
  const dCols = () => [t('o.number'), t('o.branch'), t('o.cashier'), t('ds.kProducts'), t('o.fee'), t('ds.discount'), t('o.grand'), t('c.date')];
  const dLine = o => [oNum(o), oBranch(o), oCashier(o), moneyPlain(rpProducts(o)), moneyPlain(oFee(o)), moneyPlain(oDiscount(o)), moneyPlain(oTotal(o)), fmtDateTime(oTime(o))];
  const sums = list => ({ products: list.reduce((s, o) => s + rpProducts(o), 0), delivery: list.reduce((s, o) => s + oFee(o), 0), total: list.reduce((s, o) => s + oTotal(o), 0), net: list.reduce((s, o) => s + rpNet(o), 0), disc: list.reduce((s, o) => s + oDiscount(o), 0) });
  function mountDetail() {
    const d = discounts()[st.detail] || {};
    view.innerHTML = `
      ${pageHeader('discounts', `<button class="btn btn-ghost" data-ds="back">${icon('chevRight', 'flip')}<span>${t('pt.back')}</span></button>
        <button class="btn btn-ghost" data-ds="dprint">${icon('printer')}<span>${t('o.printReport')}</span></button>
        <button class="btn btn-primary" data-ds="dexport">${icon('download')}<span>${t('iv.excel')}</span></button>`, esc(title(st.detail, d)))}
      <section class="kpis" id="dsK"></section>
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools">
          <label class="date-field"><small>${t('c.from')}</small><input type="date" id="dsFrom" value="${st.from}"></label>
          <label class="date-field"><small>${t('c.to')}</small><input type="date" id="dsTo" value="${st.to}"></label>
          <span class="tb-spacer"></span><span class="muted" id="dsCount"></span></div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr>${dCols().map((c, i) => `<th class="${i >= 3 && i <= 6 ? 'end' : ''}">${c}</th>`).join('')}</tr></thead>
          <tbody id="dsDBody"></tbody></table></div>
      </section>`;
    [['#dsFrom', 'from'], ['#dsTo', 'to']].forEach(([s, k]) => $(s, view).addEventListener('change', e => { st[k] = e.target.value; drawDetail(); }));
    first = true;
  }
  const detailList = () => ordersOf(st.detail, discounts()[st.detail], st.from, st.to);
  function drawDetail() {
    const body = $('#dsDBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 8)); $('#dsK', view).innerHTML = skeletonKpis(); return; }
    if (!discounts()[st.detail]) { st.detail = null; mount(); draw(); return; }
    const list = detailList(), s = sums(list);
    setKpis($('#dsK', view), [
      kpiCard({ label: t('ds.kProductsT'), value: s.products, kind: 'money', ic: 'package', tone: 'c1' }),
      kpiCard({ label: t('ds.kDelivery'), value: s.delivery, kind: 'money', ic: 'bike', tone: 'c2' }),
      kpiCard({ label: t('ds.kTotal'), value: s.total, kind: 'money', ic: 'chart', tone: 'c3' }),
      kpiCard({ label: t('ds.kNet'), value: s.net, kind: 'money', ic: 'wallet', tone: 'c4' })
    ].join(''), first);
    $('#dsCount', view).textContent = t('ds.count').replace('{n}', list.length).replace('{d}', moneyPlain(s.disc));
    setHtml(body, list.length ? list.map((o, i) => `<tr data-oid="${esc(o.id)}" class="${first ? 'row-in' : ''} ds-row" style="--r:${Math.min(i, 20)}" tabindex="0">
        <td data-label="${t('o.number')}"><span class="badge tone-info">#${esc(oNum(o))}</span></td>
        <td data-label="${t('o.branch')}">${esc(oBranch(o))}</td><td data-label="${t('o.cashier')}">${esc(oCashier(o))}</td>
        <td data-label="${t('ds.kProducts')}" class="end num">${moneyPlain(rpProducts(o))}</td>
        <td data-label="${t('o.fee')}" class="end num">${moneyPlain(oFee(o))}</td>
        <td data-label="${t('ds.discount')}" class="end num neg">${moneyPlain(oDiscount(o))}</td>
        <td data-label="${t('o.grand')}" class="end num"><b>${moneyPlain(oTotal(o))}</b></td>
        <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(oTime(o))}</span></td></tr>`).join('')
      : `<tr class="empty"><td colspan="8"><div class="empty-state">${icon('receipt')}<b>${t('ds.noOrders')}</b><small>${t('ds.noOrdersSub')}</small></div></td></tr>`);
    first = false;
  }
  function exportDetail() {
    const c = dCols();
    excelOut(detailList().map(o => Object.fromEntries(dLine(o).map((v, i) => [c[i], v]))), `discount-${st.detail}-orders.xlsx`);
  }
  function printDetail() {
    const list = detailList(), s = sums(list);
    printDoc(t('discounts'), [[t('ds.discount'), title(st.detail, discounts()[st.detail])], [t('c.from'), st.from || '-'], [t('c.to'), st.to || '-']], dCols(), list.map(dLine),
      [[t('ds.kProductsT'), moneyPlain(s.products)], [t('ds.kDelivery'), moneyPlain(s.delivery)], [t('ds.kTotal'), moneyPlain(s.total)], [t('ds.kNet'), moneyPlain(s.net)]]);
  }

  /* ---------- add / edit ---------- */
  function openForm(id) {
    const d = id ? discounts()[id] : null;
    if (d && isManager(id, d)) return;
    let type = d ? d.type || 'code' : 'code';
    const v = (k, def = '') => esc(d && d[k] != null ? d[k] : def);
    const prodOpts = Object.entries(products()).filter(([, p]) => p && typeof p === 'object').map(([pid, p]) => [pid, nameOf(p) || pid]).sort((a, b) => a[1].localeCompare(b[1]));
    const catOpts = Object.keys(cats()).map(cid => [cid, rpCatTrail(cid)]).sort((a, b) => a[1].localeCompare(b[1]));
    const sel = (idv, opts, cur, ph) => `<div class="select">${icon('chevDown')}<select id="${idv}">${ph ? `<option value="">${ph}</option>` : ''}${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    const vtOpts = [['percent', t('ds.vt_percent')], ['amount', t('ds.vt_amount')]];
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(d ? 'pencil' : 'percent')}</span><div><h2 id="drawerTitle">${t(d ? 'ds.edit' : 'ds.add')}</h2><p>${t('ds.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="dsForm">
        <div class="field"><label>${t('ds.type')}</label>
          <div class="us-roles ds-types" role="radiogroup">${['code', 'product'].map(k => `<button type="button" role="radio" data-type="${k}" class="${type === k ? 'on' : ''}" aria-checked="${type === k}" ${d ? 'disabled' : ''}>${icon(k === 'code' ? 'tag' : 'package')}<span>${t('ds.' + k)}</span></button>`).join('')}</div></div>
        <div data-for="code">
          <div class="row2">
            <div class="field"><label for="dsCode">${t('ds.codeL')} *</label><input id="dsCode" class="mono" dir="ltr" value="${v('code')}" autocomplete="off"><small class="err" id="dsCodeErr"></small></div>
            <div class="field"><label for="dsAud">${t('ds.audience')}</label>${sel('dsAud', AUD.map(a => [a, t('ds.aud_' + a)]), d ? d.audience || 'all' : 'all')}</div>
          </div>
        </div>
        <div data-for="product">
          <div class="field"><label>${t('ds.target')}</label>
            <div class="seg full ds-target"><i class="thumb"></i>${['product', 'category'].map(k => `<button type="button" data-target="${k}" class="${(d && d.targetType || 'product') === k ? 'on' : ''}">${t(k === 'product' ? 'ds.tProduct' : 'ds.tCategory')}</button>`).join('')}</div></div>
          <div class="field" data-tg="product"><label for="dsProd">${t('ds.tProduct')} *</label>${sel('dsProd', prodOpts, d ? d.productId || '' : '', t('ds.choose'))}<small class="err" id="dsProdErr"></small></div>
          <div class="field" data-tg="category"><label for="dsCat">${t('ds.tCategory')} *</label>${sel('dsCat', catOpts, d ? d.categoryId || '' : '', t('ds.choose'))}<small class="err" id="dsCatErr"></small></div>
        </div>
        <div class="row2">
          <div class="field"><label for="dsStart">${t('ds.start')} *</label><input type="date" id="dsStart" value="${v('startDate')}"><small class="err" id="dsStartErr"></small></div>
          <div class="field"><label for="dsEnd">${t('ds.end')} *</label><input type="date" id="dsEnd" value="${v('endDate')}"><small class="err" id="dsEndErr"></small></div>
        </div>
        <div class="row2">
          <div class="field"><label for="dsVt">${t('ds.valueType')}</label>${sel('dsVt', vtOpts, d ? d.valueType || 'percent' : 'percent')}</div>
          <div class="field"><label for="dsVal">${t('ds.discount')} *</label><input id="dsVal" class="mono" dir="ltr" inputmode="decimal" value="${v('value')}" autocomplete="off"><small class="err" id="dsValErr"></small></div>
        </div>
        <div data-for="product" class="row2">
          <div class="field"><label for="dsTiming">${t('ds.timing')}</label>${sel('dsTiming', [['start_date', t('ds.tm_start')], ['before_expiry', t('ds.tm_expiry')]], d ? d.applyTiming || 'start_date' : 'start_date')}</div>
          <div class="field" id="dsDaysF"><label for="dsDays">${t('ds.days')} *</label><input id="dsDays" class="mono" dir="ltr" inputmode="numeric" value="${v('daysBeforeExpiry')}" autocomplete="off"><small class="err" id="dsDaysErr"></small></div>
        </div>
        <div class="field inline"><label for="dsActive">${t('c.active')}</label><button type="button" class="switch" role="switch" id="dsActive" aria-checked="${d ? !!d.active : true}"><i></i></button></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="dsSave">${icon('check')}<span>${t(d ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    let target = d && d.targetType === 'category' ? 'category' : 'product';
    const show = () => {
      $$('[data-for]', dr).forEach(x => { x.hidden = x.dataset.for !== type; });
      $$('[data-tg]', dr).forEach(x => { x.hidden = x.dataset.tg !== target; });
      $('#dsDaysF', dr).hidden = $('#dsTiming', dr).value !== 'before_expiry';
      placeThumb($('.ds-target', dr));
    };
    dr.addEventListener('click', e => {
      const ty = e.target.closest('[data-type]');
      if (ty && !ty.disabled) { type = ty.dataset.type; $$('[data-type]', dr).forEach(x => { x.classList.toggle('on', x === ty); x.setAttribute('aria-checked', x === ty); }); show(); }
      const tg = e.target.closest('[data-target]');
      if (tg) { target = tg.dataset.target; $$('[data-target]', dr).forEach(x => x.classList.toggle('on', x === tg)); show(); }
      if (e.target.closest('#dsActive')) { const s = $('#dsActive', dr); s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true'); }
    });
    $('#dsTiming', dr).addEventListener('change', show);
    dr.addEventListener('input', e => { const er = e.target.id && $(`#${e.target.id}Err`, dr); if (er) er.textContent = ''; });
    dr.addEventListener('change', e => { const er = e.target.id && $(`#${e.target.id}Err`, dr); if (er) er.textContent = ''; });
    show();
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const val = id2 => $('#' + id2, dr).value.trim();
      const errs = {};
      const startDate = val('dsStart'), endDate = val('dsEnd'), valueType = val('dsVt');
      const value = Number(toLatin(val('dsVal')).replace(/[٫,]/g, '.'));
      if (!startDate) errs.dsStart = t('required');
      if (!endDate) errs.dsEnd = t('required');
      else if (startDate && endDate < startDate) errs.dsEnd = t('ds.endBefore');
      if (!val('dsVal')) errs.dsVal = t('required');
      else if (!Number.isFinite(value) || value <= 0) errs.dsVal = t('ds.badValue');
      else if (valueType === 'percent' && value > 100) errs.dsVal = t('ds.over100');
      const payload = { active: $('#dsActive', dr).getAttribute('aria-checked') === 'true', type, startDate, endDate, valueType, value: Number(value.toFixed(3)) };
      if (type === 'code') {
        const code = toLatin(val('dsCode'));
        if (!code) errs.dsCode = t('required');
        else if (Object.entries(discounts()).some(([oid, x]) => oid !== id && x && x.type === 'code' && normQ(x.code) === normQ(code))) errs.dsCode = t('ds.codeTaken');
        Object.assign(payload, { code, audience: val('dsAud') || 'all' });
      } else {
        const timing = val('dsTiming'), days = Number(toLatin(val('dsDays')));
        if (target === 'product' && !val('dsProd')) errs.dsProd = t('required');
        if (target === 'category' && !val('dsCat')) errs.dsCat = t('required');
        if (timing === 'before_expiry' && !(Number.isInteger(days) && days > 0)) errs.dsDays = t(val('dsDays') ? 'ds.badDays' : 'required');
        Object.assign(payload, { targetType: target, productId: target === 'product' ? val('dsProd') : null, categoryId: target === 'category' ? val('dsCat') : null,
          applyTiming: timing, daysBeforeExpiry: timing === 'before_expiry' ? days : null });
      }
      $$('.err', dr).forEach(x => { x.textContent = errs[x.id.replace(/Err$/, '')] || ''; });
      const bad = Object.keys(errs)[0];
      if (bad) { const el = $('#' + bad, dr); el && el.focus(); return; }
      const btn = $('#dsSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update(Object.fromEntries(Object.entries(payload).map(([k, x]) => [`discounts/${id}/${k}`, x])));
        else await LIVE.update({ [`discounts/${LIVE.newKey('discounts')}`]: { ...payload, createdAt: LIVE.now() } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#dsForm', dr).addEventListener('submit', save);
    $('#dsSave', dr).addEventListener('click', save);
  }

  async function toggle(id) {
    const d = discounts()[id]; if (!d) return;
    try { await LIVE.update({ [`discounts/${id}/active`]: !d.active }); toast(t(d.active ? 'ds.deactivated' : 'ds.activated')); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  async function remove(id) {
    const d = discounts()[id]; if (!d || isManager(id, d)) return;
    const ok = await confirmDialog({ title: t('ds.deleteQ'), body: `<div class="cf-sum"><div><small>${t('ds.type')}</small><b>${esc(title(id, d))}</b></div><div><small>${t('ds.usage')}</small><b>${ordersOf(id, d).length}</b></div></div><p class="cf-note">${t('ds.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`discounts/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- events ---------- */
  const mount = () => (st.detail ? mountDetail() : mountList());
  const draw = () => (st.detail ? drawDetail() : drawList());
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const row = e.target.closest('tr.ds-row');
    if (row) { const o = (LIVE.cache.orders || {})[row.dataset.oid]; if (o) invoiceDetails(o); return; }
    const b = e.target.closest('[data-ds]'); if (!b || b.disabled) return;
    const a = b.dataset.ds;
    if (a === 'new') return openForm(null);
    if (a === 'back') { st.detail = null; mount(); draw(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'dexport') return allLoaded() && exportDetail();
    if (a === 'dprint') return allLoaded() && printDetail();
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    if (a === 'view') { st.detail = id; mount(); draw(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    ({ edit: openForm, toggle, delete: remove })[a](id);
  });
  view.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest('tr.ds-row'); if (row) { const o = (LIVE.cache.orders || {})[row.dataset.oid]; if (o) invoiceDetails(o); }
  });
  mount();
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
