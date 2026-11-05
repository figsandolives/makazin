/* التقارير — live reports.
   Same views, numbers and workflow as the old reports page: the dashboard
   (orders and sales for a day, week or month, optionally compared with another
   period), sales by product, sales by cashier, returns, orders sales with a
   running balance, and top / least selling products. Cancelled invoices are
   left out everywhere, as before. */

LIVE_ROUTES.add('reports');

const RP_PATHS = ['orders', 'branches', 'cashiers', 'customers', 'products', 'productCategories', 'deliveryZones', 'orderTypes', 'paymentMethods'];
const RP_RET_PATHS = ['stockReturn', 'scrapReturn', 'supplierReturns', 'stockMaterials'];
const RP_HOUR = 36e5;

/* ---------- periods ---------- */
const rpIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rpDate = v => { const d = v ? new Date(`${v}T00:00:00`) : new Date(); return Number.isNaN(d.getTime()) ? new Date() : d; };
const rpMonday = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const rpDays = (start, count) => Array.from({ length: count + 1 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime());
/* day = 24 hours · week = Monday to Sunday of the chosen week (the old page
   counted the six days before the chosen Monday) · month = its own days */
function rpRange(period, value) {
  const a = rpDate(value);
  if (period === 'week' || period === 'month') {
    const s = period === 'week' ? rpMonday(a) : new Date(a.getFullYear(), a.getMonth(), 1);
    const count = period === 'week' ? 7 : new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
    const edges = rpDays(s, count);
    return { period, start: edges[0], end: edges[count] - 1, count, edges };
  }
  const s = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return { period, start: s, end: s + 24 * RP_HOUR - 1, count: 24, edges: Array.from({ length: 25 }, (_, i) => s + i * RP_HOUR) };
}
const rpBucket = (ts, r) => { if (ts < r.start || ts > r.end) return -1; for (let i = 0; i < r.count; i++) if (ts < r.edges[i + 1]) return i; return -1; };
function rpDefaultCompare(period, value) {
  const a = rpDate(value);
  if (period === 'month') return rpIso(new Date(a.getFullYear(), a.getMonth() - 1, 1));
  return rpIso(new Date(a.getFullYear(), a.getMonth(), a.getDate() - (period === 'week' ? 7 : 1)));
}
/* The date a period starts on, so switching day/week/month keeps the same place */
function rpAlign(period, value) {
  const a = rpDate(value);
  if (period === 'week') return rpIso(rpMonday(a));
  if (period === 'month') return rpIso(new Date(a.getFullYear(), a.getMonth(), 1));
  return rpIso(a);
}
function rpPointLabel(ts, period) {
  const d = new Date(ts);
  if (period === 'day') return new Intl.DateTimeFormat(loc(), { hour: 'numeric' }).format(d);
  if (period === 'week') return new Intl.DateTimeFormat(loc(), { weekday: 'short', day: '2-digit', month: 'short' }).format(d);
  return new Intl.DateTimeFormat(loc(), { day: '2-digit', month: 'short' }).format(d);
}
const rpRangeLabel = r => `${new Date(r.start).toLocaleDateString(loc())} - ${new Date(r.end).toLocaleDateString(loc())}`;
function rpWeeks(y, m) {
  const out = [], d = new Date(y, m, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d.getMonth() === m) {
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
    out.push([rpIso(d), `${rpPointLabel(d.getTime(), 'week')} - ${rpPointLabel(end.getTime(), 'week')}`]);
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/* ---------- orders ---------- */
const rpNum = v => Number(v || 0) || 0;
/* Online-platform invoices (فواتير الأونلاين) count with the cashier's. They come
   from the platform server (OO in sales.js); none of them is saved again as a
   cashier invoice, so nothing is counted twice. Their branch follows the
   catalog, not the platform's branchId (that is only where the customer picks
   up): bakery invoices belong to the main branch (Hawalli) and restaurant
   invoices to Abu Al-Hasaniya — Yarmouk sells nothing online. Their items to the accounting products by name, and they show as one
   "cashier" so the per-cashier report keeps them apart. */
const RP_PLATFORM_BRANCH = { hawalli: /حولي|hawalli/i, abu: /حصاني|hasaniya/i };
const rpNameKey = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
let rpOnlineMemo = { rows: null, products: null, branches: null, lang: '', list: [] };
function rpOnlineAll() {
  const products = LIVE.cache.products || {}, branches = LIVE.cache.branches || {}, m = rpOnlineMemo;
  if (m.rows === OO.rows && m.products === products && m.branches === branches && m.lang === S.lang) return m.list;
  const byName = new Map();
  Object.entries(products).forEach(([id, p]) => { if (!p) return; [p.nameAr, p.name, p.nameEn].forEach(n => { const k = rpNameKey(n); if (k && !byName.has(k)) byName.set(k, id); }); });
  const find = re => (Object.entries(branches).find(([, b]) => b && re.test(`${nameOf(b)} ${b.name || ''} ${b.nameAr || ''} ${b.nameEn || ''}`)) || [])[0];
  const mainId = (Object.entries(branches).find(([, b]) => b && b.isMain) || [])[0];
  const bakery = mainId || find(RP_PLATFORM_BRANCH.hawalli) || 'hawalli', restaurant = find(RP_PLATFORM_BRANCH.abu) || 'abu';
  const list = Object.values(OO.rows || {}).filter(o => o && typeof o === 'object' && o.orderId).map(o => {
    const items = (Array.isArray(o.items) ? o.items : Object.values(o.items || {})).filter(Boolean).map(it => {
      const pid = (products[it.productId] && it.productId) || byName.get(rpNameKey(it.name)) || byName.get(rpNameKey(it.nameEn));
      return { ...it, productId: pid || `online:${it.id || rpNameKey(it.name)}`, productName: it.name, productNameEn: it.nameEn, price: it.unitPrice ?? it.price };
    });
    const x = { ...o, items, branchId: ooCatalog(o) === 'restaurant' ? restaurant : bakery, pickupBranchId: o.branchId || '', cashierId: 'online', cashierName: t('online-orders'), online: true };
    return { id: `online:${o.orderId}`, o: x, ts: oTime(x) };
  });
  rpOnlineMemo = { rows: OO.rows, products, branches, lang: S.lang, list };
  return list;
}
/* Every invoice, cancelled ones too: the cashier's and the online platform's */
const rpAll = () => [...Object.entries(LIVE.cache.orders || {}).filter(([, o]) => o && typeof o === 'object').map(([id, o]) => ({ id, o, ts: oTime(o) })), ...rpOnlineAll()];
const rpActive = () => rpAll().filter(x => !oCancelled(x.o));
const rpBetween = (start, end, branch = 'all') => rpActive().filter(x => x.ts && x.ts >= start && x.ts <= end && (branch === 'all' || x.o.branchId === branch));
const rpOrders = (from, to, branch = 'all') => rpActive().filter(x => inRange(x.ts, from, to) && (branch === 'all' || String(x.o.branchId || '') === String(branch))).sort((a, b) => b.ts - a.ts);
const rpCost = o => oItems(o).reduce((s, it) => s + it.qty * rpNum(((LIVE.cache.products || {})[it.productId] || {}).cost), 0);
/* Delivery: the cashier saves it as deliveryPrice (deliveryFee only on old-site
   orders), so counting deliveryFee alone missed most of it. oFee reads both. */
const rpNet = o => rpNum(o.total) - oFee(o) - rpCost(o);
const rpProducts = o => Number(o.subtotal ?? o.subTotal ?? o.netTotal ?? (rpNum(o.total) - oFee(o))) || 0;
/* The real clock time of an order. oTime puts a deferred invoice on its
   accountingDate at midnight, which made a false peak at 12 AM. */
const rpClock = o => { const v = o && (o.createdAt ?? o.timestamp ?? o.date); const n = typeof v === 'number' ? v : new Date(v || 0).getTime(); return Number.isFinite(n) && n > 0 ? n : oTime(o); };
/* Walk-in sales are saved with filler phones ("965.", "96500000") and names
   (".", "000"): they are not customers. */
function rpPhoneKey(o) {
  let d = String(oPhone(o)).replace(/\D/g, '');
  const core = d.startsWith('965') ? d.slice(3) : d;
  if (!core.replace(/0/g, '') || /^(\d)\1+$/.test(core)) return null;
  if (d.length > 8 && d.startsWith('965')) d = core;
  return d.length >= 7 ? d : null;
}
const rpCustKey = o => (o && o.customerId ? `id:${o.customerId}` : rpPhoneKey(o));
const rpCustLabel = o => { const n = String(oCustName(o) || '').trim(); return /\p{L}/u.test(n) ? n : (oPhone(o) !== '-' ? oPhone(o) : n || '-'); };
const rpBranchName = id => (id === 'all' ? t('allBranches') : nameOf((LIVE.cache.branches || {})[id]) || '-');
function rpCatTrail(id) {
  const cats = LIVE.cache.productCategories || {}, out = [];
  for (let c = id, n = 0; c && cats[c] && n < 20; c = cats[c].parentId, n++) out.unshift(nameOf(cats[c]));
  return out.filter(Boolean).join(' / ') || '-';
}
function rpCatSet(rootId) {
  const cats = LIVE.cache.productCategories || {};
  if (!rootId || !cats[rootId]) return new Set();
  const set = new Set([rootId]), queue = [rootId];
  while (queue.length) { const cur = queue.shift(); Object.entries(cats).forEach(([id, c]) => { if (c && (c.parentId || null) === cur && !set.has(id)) { set.add(id); queue.push(id); } }); }
  return set;
}

PAGES.reports = view => {
  const today = rpIso(new Date());
  const st = (S.rp ||= {
    view: 'dashboard', period: 'day', date: today, cmp: false, cmpVals: { day: '', week: '', month: '' }, branch: 'all',
    md: { metric: 'orders', branch: 'all', cashier: 'all', customer: 'all', q: '' },
    sales: { from: '', to: '', q: '', cat: 'all', sel: new Set(), auto: true },
    det: { productId: null, branch: 'all' },
    cs: { from: '', to: '', branch: 'all' }, csd: { cashierId: null },
    ret: { from: '', to: '', branch: 'all', q: '', sort: 'desc' },
    tp: { from: '', to: '', q: '', mode: 'top', limit: 10 },
    tpd: { productId: null, branch: 'all', from: '', to: '', cashier: 'all', q: '' },
    os: { from: '', to: '', branch: 'all', q: '' }
  });
  let first = true, picker = null;
  // The online invoices are read from the platform every minute, as on their own page
  const onlineSub = () => draw();
  OO.subs.add(onlineSub);
  if (!OO.loaded) refreshOnline();
  const onlineTimer = setInterval(refreshOnline, 60000);
  const unsubs = [LIVE.watch(RP_PATHS, () => draw()), () => { OO.subs.delete(onlineSub); clearInterval(onlineTimer); }];
  let retWatched = false;

  const money = n => fmtMoney(n);
  const empty = (cols, filtering) => `<tr class="empty"><td colspan="${cols}"><div class="empty-state">${icon(filtering ? 'search' : 'chart')}<b>${t(filtering ? 'emptyTitle' : 'rp.noData')}</b><small>${t(filtering ? 'emptySub' : 'rp.noDataSub')}</small></div></td></tr>`;
  const th = (cols) => `<tr>${cols.map(c => (Array.isArray(c) ? `<th class="${c[1]}">${c[0]}</th>` : `<th>${c}</th>`)).join('')}</tr>`;
  const td = (label, html, cls = '') => `<td data-label="${esc(label)}"${cls ? ` class="${cls}"` : ''}>${html}</td>`;
  const dateF = (f, label, v) => `<label class="date-field"><small>${label}</small><input type="date" data-f="${f}" value="${esc(v || '')}"></label>`;
  const selF = (f, label) => `<div class="select tb-select"><select data-f="${f}" aria-label="${esc(label)}"></select>${icon('chevDown')}</div>`;
  const searchF = (f, ph, v) => `<label class="search-field">${icon('search')}<input type="search" data-f="${f}" placeholder="${esc(ph)}" value="${esc(v || '')}" autocomplete="off"></label>`;
  const fill = (f, html) => { const el = $(`[data-f="${f}"]`, view); if (el) setHtml(el, html); };
  /* Rows that stand for one invoice open it (invoiceDetails, as the orders page) */
  let invRef = new Map();
  const inv = o => { const k = String(invRef.size); invRef.set(k, o); return k; };
  const clk = (html, kind, label, val = '') => html.replace('<article class="kpi card"', `<article class="kpi card rp-click" data-drill="${kind}" data-val="${esc(val)}" data-label="${esc(label)}" role="button" tabindex="0"`);
  const viewBtn = (kind, label) => `<button class="btn btn-sm btn-soft" data-drill="${kind}" data-label="${esc(label)}">${icon('eye')}<span>${t('rp.view')}</span></button>`;
  // Chart image download (chart-image.js); `name` is the chart's own title
  const dlBtn = name => `<button class="btn-icon sm rp-dl" data-chart-dl="${esc(name)}" aria-label="${esc(t('ci.download'))}" data-tip="${esc(t('ci.download'))}" data-tip-always>${icon('download')}</button>`;
  /* What the dashboard shows, in words: «لشهر أكتوبر 2026 لكل الفروع» */
  function periodWords() {
    const r = rpRange(st.period, st.date), ar = S.lang === 'ar';
    const day = ts => new Date(ts).toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' });
    const when = st.period === 'month' ? `${ar ? 'لشهر ' : ''}${new Date(r.start).toLocaleDateString(loc(), { month: 'long', year: 'numeric' })}`
      : st.period === 'week' ? (ar ? `للأسبوع من ${day(r.start)} إلى ${day(r.end)}` : `${day(r.start)} – ${day(r.end)}`)
      : `${ar ? 'ليوم ' : ''}${day(r.start)}`;
    const where = st.branch === 'all' ? (ar ? 'لكل الفروع' : t('allBranches')) : `${ar ? 'لفرع ' : ''}${rpBranchName(st.branch)}`;
    return ar ? `${when} ${where}` : `${when} — ${where}`;
  }
  const branchOpts = v => `<option value="all">${t('allBranches')}</option>` + optsHtml(sortedOpts(LIVE.cache.branches), v);

  /* Sub-report frame: back, title, export / print, totals, filters, table */
  function shell(title, sub, tools, { chart = false, k = 3 } = {}) {
    return `<header class="ph rp-head" data-anim>
        <button class="btn-icon rp-back" data-rp="back" aria-label="${t('back')}">${icon('chevLeft', 'flip')}</button>
        <div class="ph-txt"><h1>${esc(title)}</h1><p id="rpSub">${sub}</p></div>
        <div class="ph-actions"><button class="btn btn-ghost" data-rp="print">${icon('printer')}<span>${t('o.printReport')}</span></button>
          <button class="btn btn-primary" data-rp="export">${icon('download')}<span>${t('o.download')}</span></button></div>
      </header>
      <section class="kpis rp-kpis k${k}" id="rpK"></section>
      <section class="card rp-tools" data-anim><div class="toolbar it-tools">${tools}</div><p class="rp-note" id="rpNote" hidden></p></section>
      ${chart ? '<section class="card tp-card" data-anim id="rpChart"></section>' : ''}
      <section class="card table-card" data-anim>
        <div class="table-wrap"><table class="dt it-table rp-table"><thead id="rpHead"></thead><tbody id="rpBody"></tbody><tfoot id="rpFoot"></tfoot></table></div>
      </section>`;
  }
  function kpis(list) {
    setKpis($('#rpK', view), list.map(([label, value, kind, ic, tone]) => kpiCard({ label, value, kind, ic, tone })).join(''), first);
  }
  function loading(cols) {
    if (LIVE.loaded(RP_PATHS) && OO.loaded && (st.view !== 'returns' || LIVE.loaded(RP_RET_PATHS))) return false;
    setHtml($('#rpBody', view), skeletonRows(6, cols));
    const k = $('#rpK', view); if (k) k.innerHTML = skeletonKpis();
    return true;
  }

  /* The dashboard period as from / to dates, for the reports it opens */
  const periodF = () => { const r = rpRange(st.period, st.date); return { from: rpIso(new Date(r.start)), to: rpIso(new Date(r.end)) }; };
  /* Open the invoices behind a card, a chart point or a row of the dashboard */
  function drill(kind, label, val = '', metric = '') {
    Object.assign(st.md, { metric: metric || (kind === 'all' || kind === 'fee' ? 'revenue' : 'orders'), branch: kind === 'branch' ? val : st.branch, cashier: 'all', customer: kind === 'cust' ? val : 'all', q: '', pick: { kind, val: String(val), label } });
    go('metricDetails');
  }

  /* =================== dashboard =================== */
  function periodCtl(key, value, range) {
    const period = st.period;
    let d = rpDate(value);
    if (period === 'week') d = rpMonday(d);
    const y = d.getFullYear(), m = d.getMonth();
    const sel = (part, opts, cur, label) => `<span class="select mini"><select data-pc="${key}" data-part="${part}" aria-label="${esc(label)}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('chevDown')}</span>`;
    let html;
    if (period === 'day') html = `<input type="date" class="rp-day" data-pc="${key}" data-part="day" value="${rpIso(d)}" aria-label="${t('rp.day')}">`;
    else {
      html = sel('year', [-2, -1, 0, 1, 2].map(n => [y + n, String(y + n)]), y, t('rp.year'))
        + sel('month', Array.from({ length: 12 }, (_, i) => [i, new Intl.DateTimeFormat(loc(), { month: 'long' }).format(new Date(y, i, 1))]), m, t('rp.month'));
      if (period === 'week') html += sel('week', rpWeeks(y, m), rpIso(d), t('rp.week'));
    }
    return `<div class="rp-pc-in">${html}</div><small class="rp-range">${rpRangeLabel(range)}</small>`;
  }
  function onPeriod(el) {
    const key = el.dataset.pc, box = el.closest('.rp-pc'), period = st.period;
    let value;
    if (el.dataset.part === 'day') value = el.value;
    else if (period === 'week' && el.dataset.part === 'week') value = el.value;
    else {
      const y = +$('[data-part="year"]', box).value, m = +$('[data-part="month"]', box).value;
      value = period === 'month' ? rpIso(new Date(y, m, 1)) : (rpWeeks(y, m)[0] || [])[0];
    }
    if (!value) return;
    if (key === 'p') st.date = value; else st.cmpVals[period] = value;
    draw();
  }
  function metrics(range, cmpRange) {
    const blank = n => ({ orders: Array(n).fill(0), revenue: Array(n).fill(0), tot: { orders: 0, revenue: 0 } });
    const cur = blank(range.count), cmp = blank(cmpRange.count);
    [[range, cur], [cmpRange, cmp]].forEach(([r, out]) => rpBetween(r.start, r.end, st.branch).forEach(({ o, ts }) => {
      const i = rpBucket(ts, r); if (i < 0) return;
      out.orders[i] += 1; out.revenue[i] += rpNum(o.total); out.tot.orders += 1; out.tot.revenue += rpNum(o.total);
    }));
    return { cur, cmp };
  }
  const pct = (cur, base) => (base === 0 ? (cur === 0 ? 0 : null) : ((cur - base) / base) * 100);
  const pctText = p => (p === null ? '(+100.0%)' : `(${p >= 0 ? '+' : ''}${p.toFixed(1)}%)`);
  const pctCls = p => (p === null || p > 0 ? 'up' : p < 0 ? 'down' : '');
  function metricCard(key, title, isCount, range, cmpRange, cur, cmp, total, cmpTotal) {
    const fmtV = v => (isCount ? fmtNum(Math.round(v)) : fmtMoney(v));
    const pointLabel = t(isCount ? 'rp.ordersCount' : 'rp.salesAmount');
    const labels = range.edges.slice(0, range.count).map(ts => rpPointLabel(ts, range.period));
    const cmpVals = Array.from({ length: range.count }, (_, i) => rpNum(cmp[i]));
    const series = [{ values: cur, cls: 'c1', name: t('rp.current') }].concat(st.cmp ? [{ values: cmpVals, cls: 'c3', name: t('rp.compare') }] : []);
    let diff = '';
    if (st.cmp) {
      const v = total - cmpTotal;
      const txt = !cmpTotal ? t('rp.newValue') : `${v / cmpTotal >= 0 ? '+' : ''}${((v / cmpTotal) * 100).toFixed(1)}% | ${isCount ? `${v >= 0 ? '+' : ''}${Math.round(v)}` : `${v >= 0 ? '+' : '-'}${moneyPlain(Math.abs(v))}`}`;
      diff = `<span dir="ltr" class="rp-diff ${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${esc(txt)}</span>`;
    }
    const tip = i => {
      let h = `<b>${esc(labels[i])}</b>`;
      if (!st.cmp) {
        const p = i > 0 ? pct(cur[i], cur[i - 1]) : 0;
        return h + `<span>${pointLabel}<em>${fmtV(cur[i])} <i dir="ltr" class="rp-pct ${pctCls(p)}">${pctText(p)}</i></em></span>`;
      }
      const p = pct(cur[i], cmpVals[i]), cl = rpPointLabel(cmpRange.edges[Math.min(i, cmpRange.count - 1)], range.period);
      return h + `<span><i class="sw c1"></i>${t('rp.current')}<em>${fmtV(cur[i])}</em></span><span><i class="sw dashed"></i>${t('rp.compare')} (${esc(cl)})<em>${fmtV(cmpVals[i])}</em></span><span class="rp-pct ${pctCls(p)}"><i dir="ltr">${pctText(p)}</i></span>`;
    };
    return {
      html: `<article class="card rp-metric" data-anim>
        <header class="card-head"><div><p class="kpi-label">${title}</p><b class="rp-val">${fmtV(total)}</b>${diff}</div>
          <div class="rp-cardacts">${dlBtn(title)}<button class="btn btn-sm btn-soft" data-metric="${key}">${icon('eye')}<span>${t('rp.view')}</span></button></div></header>
        ${st.cmp ? `<div class="legend"><span><i class="sw c1"></i>${t('rp.current')}</span><span><i class="sw dashed"></i>${t('rp.compare')}</span></div>` : ''}
        <div class="chart-wrap"><div class="chart-tip"></div>${areaChart(series, labels, { h: 200, int: isCount, fmt: v => (isCount ? fmtNum(v) : fmtCompact(v)) })}</div>
      </article>`,
      bind: el => {
        const wrap = $('.chart-wrap', el);
        bindAreaHover(wrap, series, labels, null, tip);
        wrap.classList.add('rp-click');
        wrap.addEventListener('click', () => { const i = +wrap.dataset.i; if (Number.isInteger(i)) drill('bucket', `${title} · ${labels[i]}`, i, key); });
      }
    };
  }
  function dashShell() {
    return `${pageHeader('reports', '', t('rp.sub'))}
      <section class="card rp-bar" data-anim>
        <div class="select tb-select"><select id="rpBranch" aria-label="${t('allBranches')}"></select>${icon('chevDown')}</div>
        <div class="rp-pc" id="rpPrimary"></div>
        <label class="rp-cmp"><input type="checkbox" id="rpCmp" ${st.cmp ? 'checked' : ''}><span>${t('rp.comparison')}</span></label>
        <div class="rp-pc" id="rpCompare"></div>
        <div class="seg range-seg" id="rpSeg" role="tablist"><i class="thumb"></i>${['day', 'week', 'month'].map(p => `<button class="${st.period === p ? 'on' : ''}" data-period="${p}">${t('rp.' + p)}</button>`).join('')}</div>
      </section>
      <section class="kpis" id="rpDK"></section>
      <section class="rp-metrics" id="rpMetrics"></section>
      <section class="rp-ins" id="rpIns"></section>
      <section class="card" data-anim>
        <header class="card-head"><h3>${t('rp.available')}</h3></header>
        <div class="rp-links">${[['sales', 'tag', 'c1', 'rp.sales'], ['cashierSales', 'users', 'c2', 'rp.cashierSales'], ['returns', 'ret', 'c3', 'rp.returns'], ['orderSales', 'receipt', 'c4', 'rp.orderSales']]
          .map(([v, ic, tone, k]) => `<button class="rp-link" data-open="${v}"><span class="kpi-ic ${tone}">${icon(ic)}</span><span>${t(k)}</span>${icon('chevLeft', 'flip')}</button>`).join('')}</div>
      </section>
      <section class="card tp-card" data-anim>
        <header class="card-head"><div><h3>${t('rp.tpChart')}</h3><p class="muted" id="rpTpSub"></p></div>
          <div class="tp-ctl"><span class="select mini"><select id="rpTpMode" aria-label="${t('rp.tpChart')}"></select>${icon('chevDown')}</span>
            <span class="select mini"><select id="rpTpLimit" aria-label="${t('it.perPage')}"></select>${icon('chevDown')}</span>
            <button class="btn btn-sm btn-primary" data-open="topProducts">${t('rp.showReport')}</button></div></header>
        <div id="rpTp"></div>
      </section>`;
  }
  function drawDash() {
    if (!LIVE.loaded(RP_PATHS) || !OO.loaded) { $('#rpMetrics', view).innerHTML = `<article class="card rp-metric"><i class="skel lg"></i><i class="skel"></i></article>`.repeat(2); return; }
    setHtml($('#rpBranch', view), branchOpts(st.branch));
    const range = rpRange(st.period, st.date);
    if (!st.cmpVals[st.period]) st.cmpVals[st.period] = rpDefaultCompare(st.period, st.date);
    const cmpRange = rpRange(st.period, st.cmpVals[st.period]);
    setHtml($('#rpPrimary', view), periodCtl('p', st.date, range));
    setHtml($('#rpCompare', view), st.cmp ? periodCtl('c', st.cmpVals[st.period], cmpRange) : '');
    $('#rpCompare', view).hidden = !st.cmp;
    const { cur, cmp } = metrics(range, cmpRange);
    const cards = [metricCard('orders', t('o.kCount'), true, range, cmpRange, cur.orders, cmp.orders, cur.tot.orders, cmp.tot.orders),
      metricCard('revenue', t('rp.revenue'), false, range, cmpRange, cur.revenue, cmp.revenue, cur.tot.revenue, cmp.tot.revenue)];
    const box = $('#rpMetrics', view), html = cards.map(c => c.html).join('');
    if (box._html !== html) {
      box.innerHTML = html; box._html = html;
      if (!first) $$('[data-anim]', box).forEach(x => x.removeAttribute('data-anim'));
      $$('.rp-metric', box).forEach((el, i) => cards[i].bind(el));
    }
    drawInsights(range, cmpRange);
    setHtml($('#rpTpMode', view), [['top', t('rp.modeTop')], ['bottom', t('rp.modeBottom')]].map(([v, l]) => `<option value="${v}" ${st.tp.mode === v ? 'selected' : ''}>${l}</option>`).join(''));
    setHtml($('#rpTpLimit', view), [10, 50, 100].map(n => `<option ${st.tp.limit === n ? 'selected' : ''}>${n}</option>`).join(''));
    setHtml($('#rpTpSub', view), `${rpRangeLabel(range)} · ${esc(rpBranchName(st.branch))}`);
    setHtml($('#rpTp', view), tpChart(tpData({ ...st.tp, q: '', ...periodF(), branch: st.branch })));
    placeThumb($('#rpSeg', view));
  }

  /* ---------- extra analytics for the dashboard period ---------- */
  function drawInsights(range, cmpRange) {
    const cur = rpBetween(range.start, range.end, st.branch);
    const prev = st.cmp ? rpBetween(cmpRange.start, cmpRange.end, st.branch) : null;
    const sum = list => list.reduce((a, { o }) => ({ n: a.n + 1, total: a.total + rpNum(o.total), fee: a.fee + oFee(o), net: a.net + rpNet(o) }), { n: 0, total: 0, fee: 0, net: 0 });
    const c = sum(cur), p = prev && sum(prev);
    const delta = (a, b) => (p && b ? ((a - b) / b) * 100 : undefined);
    const avg = x => (x.n ? x.total / x.n : 0);
    const cancelled = rpAll().map(x => x.o).filter(o => {
      if (!o || !oCancelled(o) || (st.branch !== 'all' && o.branchId !== st.branch)) return false;
      const ts = oTime(o); return ts >= range.start && ts <= range.end;
    });
    const cancelledSum = cancelled.reduce((s, o) => s + rpNum(o.total), 0);
    const deltas = [delta(c.net, p && p.net), delta(avg(c), p && avg(p)), delta(c.fee, p && p.fee)];
    // The change badges only appear when comparing: rebuild the cards when they come or go
    const kBox = $('#rpDK', view), sig = JSON.stringify(deltas);
    const kFirst = first || kBox._sig !== sig; kBox._sig = sig;
    setKpis(kBox, [
      clk(kpiCard({ label: t('rp.kNet'), value: c.net, kind: 'money', ic: 'chart', tone: 'c1', delta: deltas[0] }), 'all', t('rp.kNet')),
      clk(kpiCard({ label: t('rp.kAvg'), value: avg(c), kind: 'money', ic: 'receipt', tone: 'c2', delta: deltas[1] }), 'all', t('rp.kAvg')),
      clk(kpiCard({ label: t('rp.kFee'), value: c.fee, kind: 'money', ic: 'bike', tone: 'c3', delta: deltas[2] }), 'fee', t('rp.kFee')),
      clk(kpiCard({ label: cancelled.length ? `${t('rp.kCancelled')} · ${moneyPlain(cancelledSum)}` : t('rp.kCancelled'), value: cancelled.length, ic: 'alert', tone: 'c4' }), 'cancelled', t('rp.kCancelled'))
    ].join(''), kFirst);

    const none = `<div class="empty-state sm">${icon('chart')}<b>${t('rp.noData')}</b><small>${t('rp.noDataSub')}</small></div>`;
    const group = (list, keyOf, labelOf, val) => Object.values(list.reduce((m, x) => { const k = keyOf(x.o); if (k == null) return m; (m[k] ||= { key: k, label: labelOf(x.o), v: 0, n: 0 }).v += val(x.o); m[k].n += 1; return m; }, {})).sort((a, b) => b.v - a.v);
    const card = (title, sub, body, cls = '') => `<article class="card rp-in ${cls}"><header class="card-head"><div><h3>${title}</h3><p class="muted">${sub}</p></div><div class="rp-cardacts">${dlBtn(title)}${viewBtn('all', title)}</div></header>${body}</article>`;

    // Branches: every branch (the branch filter doesn't apply), share of sales and change vs the compare period
    const bAll = rpBetween(range.start, range.end), bPrev = st.cmp ? group(rpBetween(cmpRange.start, cmpRange.end), o => o.branchId || 'unknown', oBranch, o => rpNum(o.total)) : [];
    const branches = group(bAll, o => o.branchId || 'unknown', oBranch, o => rpNum(o.total)), bTotal = branches.reduce((s, b) => s + b.v, 0);
    const branchHtml = branches.length ? `<ul class="branch-list">${branches.map((b, i) => {
      const before = bPrev.find(x => x.key === b.key), d = st.cmp ? (before && before.v ? ((b.v - before.v) / before.v) * 100 : null) : undefined;
      return `<li class="rp-click" data-drill="branch" data-val="${esc(b.key)}" data-label="${esc(b.label)}"><span class="b-ic" style="--h:${hue(b.label)}">${icon('building')}</span><div class="bar-body"><div class="bar-top"><span>${esc(b.label)}</span><b>${money(b.v)}</b></div>
        <span class="bar thin"><i class="c${(i % 5) + 1}" style="--w:${((b.v / (branches[0].v || 1)) * 100).toFixed(1)}%;--d:${i * 70}ms"></i></span>
        <small class="rp-bmeta"><bdi dir="ltr">${fmtNum((b.v / (bTotal || 1)) * 100, 1)}%</bdi> ${t('rp.ofSales')} · ${b.n} ${t('rp.ordersWord')}</small></div>
        ${d === undefined ? '' : d === null ? `<span class="delta up">${t('rp.newShort')}</span>` : `<span class="delta ${d >= 0 ? 'up' : 'down'}" dir="ltr">${d >= 0 ? '+' : ''}${d.toFixed(1)}%</span>`}</li>`;
    }).join('')}</ul>` : none;

    // Peak hours: orders in each hour of the day over the whole period
    const hrs = Array.from({ length: 24 }, () => ({ n: 0, v: 0 }));
    cur.forEach(({ o }) => { const h = hrs[new Date(rpClock(o)).getHours()]; h.n += 1; h.v += rpNum(o.total); });
    const hMax = Math.max(...hrs.map(h => h.n)), peak = hrs.findIndex(h => h.n === hMax);
    const hLabel = h => new Intl.DateTimeFormat(loc(), { hour: 'numeric' }).format(new Date(2000, 0, 1, h));
    const peakHtml = hMax ? `<p class="rp-peak rp-click" data-drill="hour" data-val="${peak}" data-label="${esc(`${t('rp.peak')} · ${hLabel(peak)} – ${hLabel((peak + 1) % 24)}`)}">${icon('clock')}<span>${t('rp.peakAt')}</span><b>${hLabel(peak)} – ${hLabel((peak + 1) % 24)}</b><small>${hrs[peak].n} ${t('rp.ordersWord')}</small></p>
      <div class="rp-hrs" dir="ltr">${hrs.map((h, i) => `<span class="${i === peak ? 'on' : ''}${h.n ? ' rp-click" data-drill="hour" data-val="' + i + '" data-label="' + esc(`${t('rp.peak')} · ${hLabel(i)} – ${hLabel((i + 1) % 24)}`) : ''}" data-tip-always data-tip="${esc(`${hLabel(i)} – ${hLabel((i + 1) % 24)} · ${h.n} ${t('rp.ordersWord')} · ${moneyPlain(h.v)}`)}"><i style="--h:${((h.n / hMax) * 100).toFixed(1)}%;--d:${i * 20}ms"></i></span>`).join('')}</div>
      <div class="rp-hrs-ax" dir="ltr">${[0, 6, 12, 18, 23].map(h => `<small>${hLabel(h)}</small>`).join('')}</div>` : none;

    // Payment methods by sales value
    const pays = group(cur, oPay, oPay, o => rpNum(o.total));
    const top5 = list => (list.length > 5 ? list.slice(0, 4).concat([{ label: t('rp.other'), v: list.slice(4).reduce((s, x) => s + x.v, 0), n: list.slice(4).reduce((s, x) => s + x.n, 0) }]) : list);
    const pList = top5(pays), pTotal = pList.reduce((s, x) => s + x.v, 0);
    const payAttr = x => (x.key != null ? ` class="rp-click" data-drill="pay" data-val="${esc(x.key)}" data-label="${esc(`${t('rp.pay')} · ${x.label}`)}"` : '');
    const payDonut = donut(pList.map((x, i) => ({ value: x.v, cls: `c${i + 1}` })), 150, 18).replace(/<circle class="seg (c(\d+))"/g, (m, c, n) => { const x = pList[n - 1]; return x && x.key != null ? `<circle class="seg ${c} rp-click" data-drill="pay" data-val="${esc(x.key)}" data-label="${esc(`${t('rp.pay')} · ${x.label}`)}"` : m; });
    const payHtml = pTotal > 0 ? `<div class="rp-donut"><div class="donut-box">${payDonut}<div class="donut-center"><b>${pList.length}</b><small>${t('rp.payWord')}</small></div></div>
      <ul class="legend-list">${pList.map((x, i) => `<li${payAttr(x)}><i class="sw c${i + 1}"></i><span>${esc(x.label)}</span><b><bdi dir="ltr">${fmtNum((x.v / pTotal) * 100, 0)}%</bdi></b></li>`).join('')}</ul></div>` : none;

    // Order types by number of orders
    const types = group(cur, oType, oType, () => 1), tTotal = types.reduce((s, x) => s + x.v, 0);
    const typeHtml = tTotal ? `<ul class="bars">${top5(types).map((x, i) => `<li${x.key != null ? ` class="rp-click" data-drill="type" data-val="${esc(x.key)}" data-label="${esc(`${t('rp.types')} · ${x.label}`)}"` : ''}><span class="rank">${i + 1}</span><div class="bar-body"><div class="bar-top"><span>${esc(x.label)}</span><b>${x.n} <small><bdi dir="ltr">${fmtNum((x.n / tTotal) * 100, 0)}%</bdi></small></b></div>
      <span class="bar"><i class="c${(i % 5) + 1}" style="--w:${((x.n / types[0].v) * 100).toFixed(1)}%;--d:${i * 70}ms"></i></span></div></li>`).join('')}</ul>` : none;

    // Best customers in the period
    const custs = group(cur, rpCustKey, rpCustLabel, o => rpNum(o.total)).slice(0, 5);
    const custHtml = custs.length ? `<ul class="rp-cust">${custs.map((x, i) => `<li class="rp-click" data-drill="cust" data-val="${esc(x.key)}" data-label="${esc(`${t('rp.topCust')} · ${x.label}`)}"><span class="rank">${i + 1}</span><span class="cell-2"><b>${esc(x.label)}</b><small>${x.n} ${t('rp.ordersWord')}</small></span><b class="num">${money(x.v)}</b></li>`).join('')}</ul>` : none;

    const box = $('#rpIns', view);
    const html = card(t('rp.peak'), t('rp.peakSub'), peakHtml, 'span-2') + card(t('rp.branchPerf'), t('rp.branchPerfSub'), branchHtml)
      + card(t('rp.pay'), t('rp.paySub'), payHtml) + card(t('rp.types'), t('rp.typesSub'), typeHtml) + card(t('rp.topCust'), t('rp.topCustSub'), custHtml);
    if (box._html !== html) { box.innerHTML = html; box._html = html; }
  }

  /* =================== top products (shared by the dashboard) =================== */
  function tpData(f) {
    const products = LIVE.cache.products || {}, branches = LIVE.cache.branches || {}, q = normQ(f.q), map = {}, cols = new Map();
    rpOrders(f.from, f.to, f.branch || 'all').forEach(({ o }) => {
      const bk = String(o.branchId || '') || 'unknown';
      oItems(o).forEach(it => {
        const pid = String(it.productId || ''); if (!pid) return;
        const p = products[pid] || {};
        if (!cols.has(bk)) cols.set(bk, { key: bk, name: oBranch(o), main: !!(branches[bk] || {}).isMain });
        const r = (map[pid] ||= { productId: pid, code: p.code || '-', nameAr: p.nameAr || it.productName || '-', nameEn: p.nameEn || it.productNameEn || '', by: {}, total: 0 });
        r.by[bk] = (r.by[bk] || 0) + it.total; r.total += it.total;
      });
    });
    let rows = Object.values(map);
    if (q) rows = rows.filter(r => normQ(`${r.code} ${r.nameAr} ${r.nameEn}`).includes(q));
    rows.sort((a, b) => (f.mode === 'bottom' ? a.total - b.total : b.total - a.total));
    rows = rows.slice(0, [10, 50, 100].includes(+f.limit) ? +f.limit : 10);
    const columns = [...cols.values()].sort((a, b) => (b.main - a.main) || a.name.localeCompare(b.name)).map((c, i) => ({ ...c, tone: `c${(i % 5) + 1}`, label: `${t('rp.salesOf')} ${c.name}` }));
    return { rows, columns, branch: f.branch || 'all', total: rows.reduce((s, r) => s + r.total, 0) };
  }
  function tpChart({ rows, columns, branch = 'all' }) {
    if (!rows.length) return `<div class="empty-state">${icon('chart')}<b>${t('rp.noData')}</b><small>${t('rp.noDataSub')}</small></div>`;
    const max = Math.max(...rows.map(r => r.total), 1);
    return `<div class="legend tp-legend">${columns.map(c => `<span><i class="sw ${c.tone}"></i>${esc(c.label)}</span>`).join('')}</div>
      <ol class="tp-list">${rows.map((r, i) => {
        const w = r.total > 0 ? Math.max((r.total / max) * 100, 4) : 0;
        const en = r.nameEn && normQ(r.nameEn) !== normQ(r.nameAr) ? r.nameEn : '-';
        return `<li class="tp-row rp-click" data-tpd="${esc(r.productId)}" data-b="${esc(branch)}" style="--d:${Math.min(i, 20) * 30}ms"><span class="rank">${i + 1}</span>
          <span class="cell-2 tp-name"><b>${esc(r.nameAr)}</b><small>${esc(en)}</small></span>
          <span class="tp-track"><span class="tp-bar" style="--w:${w.toFixed(2)}%">${columns.map(c => `<i class="${c.tone}" style="width:${r.total > 0 ? ((rpNum(r.by[c.key]) / r.total) * 100).toFixed(2) : 0}%" title="${esc(c.label)}: ${esc(moneyPlain(rpNum(r.by[c.key])))}"></i>`).join('')}</span></span>
          <b class="num">${money(r.total)}</b></li>`;
      }).join('')}</ol>`;
  }

  /* =================== the sub-reports =================== */
  const V = {};

  /* ---- orders / sales of the dashboard period ---- */
  V.metricDetails = {
    title: () => (st.md.pick && st.md.pick.label) || (st.md.metric === 'revenue' ? t('rp.revenue') : t('o.kCount')),
    shell: () => shell(V.metricDetails.title(), '', searchF('q', t('rp.searchInvoice'), st.md.q) + selF('branch', t('o.branch')) + selF('cashier', t('o.cashier')) + selF('customer', t('o.customer')), { k: 5 }),
    data() {
      const range = rpRange(st.period, st.date), f = st.md, q = normQ(f.q), pick = f.pick || { kind: 'all' };
      const inPeriod = pick.kind === 'cancelled'
        ? rpAll().filter(x => oCancelled(x.o)).filter(x => x.ts >= range.start && x.ts <= range.end)
        : rpBetween(range.start, range.end, 'all');
      const match = ({ o, ts }) => {
        if (pick.kind === 'fee') return oFee(o) > 0;
        if (pick.kind === 'bucket') { const i = +pick.val; return ts >= range.edges[i] && ts < range.edges[i + 1]; }
        if (pick.kind === 'hour') return new Date(rpClock(o)).getHours() === +pick.val;
        if (pick.kind === 'pay') return oPay(o) === pick.val;
        if (pick.kind === 'type') return oType(o) === pick.val;
        return true;
      };
      const rows = inPeriod.filter(x => match(x) && (f.branch === 'all' || x.o.branchId === f.branch) && (f.cashier === 'all' || String(x.o.cashierId || '') === f.cashier) && (f.customer === 'all' || rpCustKey(x.o) === f.customer))
        .map(({ o, ts }) => ({ o, ts, num: oNum(o), cust: oCustName(o), phone: oPhone(o), products: rpProducts(o), fee: oCancelled(o) ? rpNum(o.deliveryFee ?? o.deliveryPrice) : oFee(o), total: rpNum(o.total), net: oCancelled(o) ? 0 : rpNet(o) }))
        .filter(r => !q || normQ(`${r.num} ${r.cust} ${r.phone}`).includes(q) || oProductText(r.o).includes(q)).sort((a, b) => b.ts - a.ts);
      const tot = rows.reduce((a, r) => ({ n: a.n + 1, products: a.products + r.products, fee: a.fee + r.fee, total: a.total + r.total, net: a.net + r.net }), { n: 0, products: 0, fee: 0, total: 0, net: 0 });
      const opts = (key, label) => [...new Set(inPeriod.map(({ o }) => o[key]).filter(Boolean))].map(id => [id, label(id)]).sort((a, b) => a[1].localeCompare(b[1]));
      return { range, rows, tot, branches: opts('branchId', id => nameOf((LIVE.cache.branches || {})[id]) || id), cashiers: opts('cashierId', id => (id === 'online' ? t('online-orders') : ((LIVE.cache.cashiers || {})[id] || {}).name || id)), customers: [...inPeriod.reduce((m, { o }) => { const k = rpCustKey(o); if (k && !m.has(k)) m.set(k, rpCustLabel(o)); return m; }, new Map())].sort((a, b) => a[1].localeCompare(b[1])) };
    },
    cols: () => ['#', t('o.number'), t('c.date'), t('o.customer'), t('c.phone'), t('o.branch'), t('o.cashier'), t('rp.productsAmount'), t('o.fee'), t('o.grand')],
    draw() {
      const d = this.data(), f = st.md;
      setHtml($('#rpSub', view), `${t('rp.period')}: ${rpRangeLabel(d.range)}${f.branch !== 'all' ? ` · ${esc(rpBranchName(f.branch))}` : ''}`);
      fill('branch', `<option value="all">${t('all')}</option>` + optsHtml(d.branches, f.branch));
      fill('cashier', `<option value="all">${t('all')}</option>` + optsHtml(d.cashiers, f.cashier));
      fill('customer', `<option value="all">${t('all')}</option>` + optsHtml(d.customers, f.customer));
      kpis([[t('rp.invoices'), d.tot.n, 'num', 'receipt', 'c1'], [t('rp.totalProducts'), d.tot.products, 'money', 'package', 'c2'], [t('rp.totalDelivery'), d.tot.fee, 'money', 'bike', 'c3'], [t('rp.totalSales'), d.tot.total, 'money', 'wallet', 'c4'], [t('rp.totalNet'), d.tot.net, 'money', 'chart', 'c5']]);
      const c = this.cols();
      setHtml($('#rpHead', view), th(c.slice(0, 7).concat(c.slice(7).map(x => [x, 'end']))));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-inv="${inv(r.o)}" class="rp-click-row ${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td('#', i + 1)}${td(c[1], `<b class="mono">#${esc(r.num)}</b>`)}${td(c[2], `<span class="date">${fmtDateTime(oTime(r.o))}</span>`)}${td(c[3], esc(r.cust))}${td(c[4], `<span class="mono">${esc(r.phone)}</span>`)}${td(c[5], esc(oBranch(r.o)))}${td(c[6], esc(oCashier(r.o)))}${td(c[7], money(r.products), 'end num')}${td(c[8], money(r.fee), 'end num')}${td(c[9], `<b>${money(r.total)}</b>`, 'end num')}</tr>`).join('') : empty(10, f.q || f.branch !== 'all' || f.cashier !== 'all' || f.customer !== 'all'));
      setHtml($('#rpFoot', view), '');
    },
    rows() { return this.data().rows.map((r, i) => [i + 1, r.num, fmtDateTime(oTime(r.o)), r.cust, r.phone, oBranch(r.o), oCashier(r.o), r.products, r.fee, r.total]); },
    export() { const c = this.cols(); excelOut(this.rows().map(r => Object.fromEntries(c.map((h, j) => [h, j >= 7 ? +r[j].toFixed(3) : r[j]]))), 'metric-details.xlsx'); },
    print() {
      const d = this.data(), f = st.md;
      printDoc(this.title(), [[t('rp.period'), rpRangeLabel(d.range)], [t('o.branch'), f.branch === 'all' ? t('all') : rpBranchName(f.branch)], [t('o.cashier'), f.cashier === 'all' ? t('all') : ((LIVE.cache.cashiers || {})[f.cashier] || {}).name || f.cashier], [t('o.customer'), f.customer === 'all' ? t('all') : (d.customers.find(c => c[0] === f.customer) || [, f.customer])[1]]],
        this.cols(), this.rows().map(r => r.map((v, j) => (j >= 7 ? moneyPlain(v) : String(v)))),
        [[t('rp.invoices'), String(d.tot.n)], [t('rp.totalProducts'), moneyPlain(d.tot.products)], [t('rp.totalDelivery'), moneyPlain(d.tot.fee)], [t('rp.totalSales'), moneyPlain(d.tot.total)], [t('rp.totalNet'), moneyPlain(d.tot.net)]]);
    }
  };

  /* ---- sales by product ---- */
  V.sales = {
    title: () => t('rp.sales'),
    shell: () => shell(t('rp.sales'), t('rp.salesSub'), searchF('q', t('rp.searchProducts'), st.sales.q) + dateF('from', t('c.from'), st.sales.from) + dateF('to', t('c.to'), st.sales.to)
      + `<button class="btn btn-ghost rp-cat" data-rp="cats">${icon('folder')}<span id="rpCatName"></span>${icon('chevDown')}</button>`),
    data() {
      const f = st.sales, products = LIVE.cache.products || {}, q = normQ(f.q), cats = f.cat !== 'all' ? rpCatSet(f.cat) : null;
      const map = {}; let total = 0;
      const text = (p, pid, it) => normQ(`${(p && p.nameAr) || (it && it.name) || ''} ${(p && p.nameEn) || (it && it.name) || ''} ${(p && p.code) || ''} ${pid}`);
      rpOrders(f.from, f.to).forEach(({ o }) => {
        const bid = o.branchId || 'unknown';
        oItems(o).forEach(it => {
          const pid = it.productId; if (!pid) return;
          const p = products[pid];
          if (cats && !cats.has((p && p.categoryId) || '')) return;
          if (q && !text(p, pid, it).includes(q)) return;
          const key = `${pid}:${bid}`;
          const r = (map[key] ||= { key, productId: String(pid), code: (p && p.code) || '-', nameAr: (p && p.nameAr) || it.name || '-', nameEn: (p && p.nameEn) || it.name || '-', cat: rpCatTrail(p && p.categoryId), branchId: bid, branch: oBranch(o), qty: 0, revenue: 0 });
          r.qty += it.qty; r.revenue += it.total; total += it.total;
        });
      });
      // Searching or picking a category also lists the products that sold nothing
      if (q || cats) Object.entries(products).forEach(([pid, p]) => {
        if (!p || (cats && !cats.has(p.categoryId || '')) || (q && !text(p, pid).includes(q))) return;
        if (Object.keys(map).some(k => k.startsWith(`${pid}:`))) return;
        map[`${pid}:all`] = { key: `${pid}:all`, productId: pid, code: p.code || '-', nameAr: p.nameAr || '-', nameEn: p.nameEn || '-', cat: rpCatTrail(p.categoryId), branchId: 'all', branch: t('allBranches'), qty: 0, revenue: 0 };
      });
      return { rows: Object.values(map).sort((a, b) => b.revenue - a.revenue), total };
    },
    cols: () => ['#', t('it.code'), t('rp.nameAr'), t('rp.nameEn'), t('it.category'), t('o.branch'), t('rp.soldQty'), t('rp.productRevenue')],
    draw() {
      const f = st.sales, d = this.data(), keys = d.rows.map(r => r.key);
      if (f.auto && d.rows.length) { f.sel = new Set(keys); f.auto = false; }
      [...f.sel].forEach(k => { if (!keys.includes(k)) f.sel.delete(k); });
      const chosen = d.rows.filter(r => f.sel.has(r.key));
      $('#rpCatName', view).textContent = f.cat !== 'all' ? nameOf((LIVE.cache.productCategories || {})[f.cat]) || t('rp.allCats') : t('rp.allCats');
      kpis([[t('rp.totalRevenue'), d.total, 'money', 'wallet', 'c1'], [t('rp.selected'), chosen.length, 'num', 'check', 'c2'], [t('rp.selectedRevenue'), chosen.reduce((s, r) => s + r.revenue, 0), 'money', 'chart', 'c3']]);
      const c = this.cols(), all = d.rows.length > 0 && d.rows.every(r => f.sel.has(r.key));
      setHtml($('#rpHead', view), `<tr><th class="sel-col"><input type="checkbox" id="rpAll" aria-label="${t('it.selectAll')}" ${all ? 'checked' : ''}></th>${c.slice(0, 6).map(x => `<th>${x}</th>`).join('')}${c.slice(6).map(x => `<th class="end">${x}</th>`).join('')}</tr>`);
      const box = $('#rpAll', view); if (box) box.checked = all;
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-go="${esc(r.key)}" class="${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">
        <td class="sel-col"><input type="checkbox" data-pick="${esc(r.key)}" ${f.sel.has(r.key) ? 'checked' : ''} aria-label="${esc(r.nameAr)}"></td>
        ${td('#', i + 1)}${td(c[1], `<span class="mono">${esc(r.code)}</span>`)}${td(c[2], `<b>${esc(r.nameAr)}</b>`)}${td(c[3], esc(r.nameEn))}${td(c[4], esc(r.cat))}${td(c[5], esc(r.branch))}${td(c[6], fmtNum(r.qty, 3), 'end num')}${td(c[7], `<b>${money(r.revenue)}</b>`, 'end num')}</tr>`).join('') : empty(9, f.q || f.cat !== 'all' || f.from || f.to));
      $$('[data-pick]', view).forEach(x => { x.checked = f.sel.has(x.dataset.pick); });
      setHtml($('#rpFoot', view), '');
    },
    chosen() { const d = this.data(); return d.rows.filter(r => st.sales.sel.has(r.key)); },
    export() { const c = this.cols(); excelOut(this.chosen().map((r, i) => ({ [c[0]]: i + 1, [c[1]]: r.code, [c[2]]: r.nameAr, [c[3]]: r.nameEn, [c[4]]: r.cat, [c[5]]: r.branch, [c[6]]: +r.qty.toFixed(3), [c[7]]: +r.revenue.toFixed(3) })), 'sales-report.xlsx'); },
    print() {
      const rows = this.chosen();
      if (!rows.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
      printDoc(t('rp.sales'), [[t('c.from'), st.sales.from || '-'], [t('c.to'), st.sales.to || '-'], [t('it.category'), $('#rpCatName', view).textContent]], this.cols(),
        rows.map((r, i) => [String(i + 1), r.code, r.nameAr, r.nameEn, r.cat, r.branch, fmtNum(r.qty, 3), moneyPlain(r.revenue)]), [t('rp.totalRevenue'), moneyPlain(rows.reduce((s, r) => s + r.revenue, 0))]);
    }
  };

  /* ---- invoices of one product (from the sales report) ---- */
  V.productDetails = {
    product: () => (LIVE.cache.products || {})[st.det.productId] || null,
    title: () => t('rp.productDetails'),
    shell: () => shell(t('rp.productDetails'), '', selF('branch', t('o.branch')), { k: 2 }),
    data() {
      const pid = String(st.det.productId || ''); let total = 0;
      const rows = rpOrders(st.sales.from, st.sales.to, st.det.branch).map(({ o, ts }) => {
        let qty = 0, revenue = 0;
        oItems(o).forEach(it => { if (String(it.productId) === pid) { qty += it.qty; revenue += it.total; } });
        return qty ? { o, ts, qty, revenue } : null;
      }).filter(Boolean);
      rows.forEach(r => { total += r.revenue; });
      return { rows, total };
    },
    cols: () => ['#', t('o.number'), t('o.customer'), t('o.cashier'), t('rp.invoiceQty'), t('rp.invoiceRevenue'), t('c.date')],
    draw() {
      const p = this.product();
      if (!p) { go('sales'); return; }
      const d = this.data(), c = this.cols();
      setHtml($('#rpSub', view), `<b>${esc(p.nameAr || '-')}</b> · ${esc(p.nameEn || '-')} · ${t('c.from')} ${esc(st.sales.from || '-')} ${t('c.to')} ${esc(st.sales.to || '-')}`);
      fill('branch', branchOpts(st.det.branch));
      kpis([[t('rp.totalRevenue'), d.total, 'money', 'wallet', 'c1'], [t('rp.invoices'), d.rows.length, 'num', 'receipt', 'c2']]);
      setHtml($('#rpHead', view), th([c[0], c[1], c[2], c[3], [c[4], 'end'], [c[5], 'end'], c[6]]));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-inv="${inv(r.o)}" class="rp-click-row ${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td('#', i + 1)}${td(c[1], `<b class="mono">#${esc(oNum(r.o))}</b>`)}${td(c[2], esc(oCustName(r.o)))}${td(c[3], esc(oCashier(r.o)))}${td(c[4], fmtNum(r.qty, 3), 'end num')}${td(c[5], `<b>${money(r.revenue)}</b>`, 'end num')}${td(c[6], `<span class="date">${fmtDateTime(oTime(r.o))}</span>`)}</tr>`).join('') : empty(7, st.det.branch !== 'all'));
      setHtml($('#rpFoot', view), '');
    },
    rows() { return this.data().rows.map((r, i) => [i + 1, oNum(r.o), oCustName(r.o), oCashier(r.o), r.qty, r.revenue, fmtDateTime(oTime(r.o))]); },
    export() { const c = this.cols(); excelOut(this.rows().map(r => Object.fromEntries(c.map((h, j) => [h, j === 5 ? +r[j].toFixed(3) : r[j]]))), 'product-sales-details.xlsx'); },
    print() {
      const p = this.product() || {}, d = this.data();
      printDoc(t('rp.productDetails'), [[t('rp.item'), `${p.nameAr || '-'} / ${p.nameEn || '-'}`], [t('c.from'), st.sales.from || '-'], [t('c.to'), st.sales.to || '-'], [t('o.branch'), rpBranchName(st.det.branch)]],
        this.cols(), this.rows().map(r => [String(r[0]), r[1], r[2], r[3], fmtNum(r[4], 3), moneyPlain(r[5]), r[6]]), [t('rp.totalRevenue'), moneyPlain(d.total)]);
    }
  };

  /* ---- sales by cashier ---- */
  V.cashierSales = {
    title: () => t('rp.cashierSales'),
    shell: () => shell(t('rp.cashierSales'), t('rp.cashierSub'), dateF('from', t('c.from'), st.cs.from) + dateF('to', t('c.to'), st.cs.to) + selF('branch', t('o.branch'))),
    data() {
      const map = {};
      rpOrders(st.cs.from, st.cs.to, st.cs.branch).forEach(({ o }) => {
        const id = o.cashierId || 'unknown';
        const r = (map[id] ||= { id, name: oCashier(o) === '-' ? id : oCashier(o), n: 0, revenue: 0, net: 0 });
        r.n += 1; r.revenue += rpNum(o.total); r.net += rpNet(o);
      });
      const rows = Object.values(map).sort((a, b) => b.revenue - a.revenue);
      return { rows, tot: rows.reduce((a, r) => ({ n: a.n + r.n, revenue: a.revenue + r.revenue, net: a.net + r.net }), { n: 0, revenue: 0, net: 0 }) };
    },
    cols: () => [t('o.cashier'), t('rp.ordersCount'), t('rp.salesAmount'), t('rp.netAmount')],
    draw() {
      const d = this.data(), c = this.cols();
      fill('branch', branchOpts(st.cs.branch));
      kpis([[c[1], d.tot.n, 'num', 'receipt', 'c1'], [c[2], d.tot.revenue, 'money', 'wallet', 'c2'], [c[3], d.tot.net, 'money', 'chart', 'c3']]);
      setHtml($('#rpHead', view), th([c[0], [c[1], 'end'], [c[2], 'end'], [c[3], 'end']]));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-go="${esc(r.id)}" class="${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td(c[0], `<b>${esc(r.name)}</b>`)}${td(c[1], fmtNum(r.n), 'end num')}${td(c[2], money(r.revenue), 'end num')}${td(c[3], `<b>${money(r.net)}</b>`, 'end num')}</tr>`).join('') : empty(4, st.cs.from || st.cs.to || st.cs.branch !== 'all'));
      setHtml($('#rpFoot', view), '');
    },
    export() { const c = this.cols(); excelOut(this.data().rows.map(r => ({ [c[0]]: r.name, [c[1]]: r.n, [c[2]]: +r.revenue.toFixed(3), [c[3]]: +r.net.toFixed(3) })), 'cashier-sales-report.xlsx'); },
    print() {
      const d = this.data(), c = this.cols();
      printDoc(t('rp.cashierSales'), [[t('c.from'), st.cs.from || '-'], [t('c.to'), st.cs.to || '-'], [t('o.branch'), rpBranchName(st.cs.branch)]], c,
        d.rows.map(r => [r.name, String(r.n), moneyPlain(r.revenue), moneyPlain(r.net)]), [[c[1], String(d.tot.n)], [c[2], moneyPlain(d.tot.revenue)], [c[3], moneyPlain(d.tot.net)]]);
    }
  };

  /* ---- invoices of one cashier ---- */
  V.cashierSalesDetails = {
    title: () => t('rp.cashierSales'),
    shell: () => shell(t('rp.cashierSales'), '', '', {}),
    data() {
      const id = String(st.csd.cashierId || 'unknown');
      const rows = rpOrders(st.cs.from, st.cs.to, st.cs.branch).filter(({ o }) => String(o.cashierId || 'unknown') === id)
        .map(({ o, ts }) => ({ o, ts, products: rpProducts(o), fee: oFee(o), total: rpNum(o.total) }));
      return { rows, tot: rows.reduce((a, r) => ({ products: a.products + r.products, fee: a.fee + r.fee, total: a.total + r.total }), { products: 0, fee: 0, total: 0 }) };
    },
    name() { const r = this.data().rows[0]; return (r && oCashier(r.o)) || ((LIVE.cache.cashiers || {})[st.csd.cashierId] || {}).name || st.csd.cashierId || '-'; },
    cols: () => [t('o.number'), t('o.customer'), t('c.phone'), t('o.branch'), t('o.cashier'), t('rp.productsAmount'), t('o.fee'), t('o.grand'), t('c.date')],
    draw() {
      const d = this.data(), c = this.cols();
      setHtml($('#rpSub', view), `${t('o.cashier')}: <b>${esc(this.name())}</b>`);
      $('.rp-tools', view).hidden = true;
      kpis([[t('rp.totalProducts'), d.tot.products, 'money', 'package', 'c1'], [t('rp.totalDelivery'), d.tot.fee, 'money', 'bike', 'c2'], [t('rp.totalSales'), d.tot.total, 'money', 'wallet', 'c3']]);
      setHtml($('#rpHead', view), th(c.slice(0, 5).concat(c.slice(5, 8).map(x => [x, 'end'])).concat([c[8]])));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-inv="${inv(r.o)}" class="rp-click-row ${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td(c[0], `<b class="mono">#${esc(oNum(r.o))}</b>`)}${td(c[1], esc(oCustName(r.o)))}${td(c[2], `<span class="mono">${esc(oPhone(r.o))}</span>`)}${td(c[3], esc(oBranch(r.o)))}${td(c[4], esc(oCashier(r.o)))}${td(c[5], money(r.products), 'end num')}${td(c[6], money(r.fee), 'end num')}${td(c[7], `<b>${money(r.total)}</b>`, 'end num')}${td(c[8], `<span class="date">${fmtDateTime(oTime(r.o))}</span>`)}</tr>`).join('') : empty(9));
      setHtml($('#rpFoot', view), '');
    },
    rows() { return this.data().rows.map(r => [oNum(r.o), oCustName(r.o), oPhone(r.o), oBranch(r.o), oCashier(r.o), r.products, r.fee, r.total, fmtDateTime(oTime(r.o))]); },
    export() { const c = this.cols(); excelOut(this.rows().map(r => Object.fromEntries(c.map((h, j) => [h, j >= 5 && j <= 7 ? +r[j].toFixed(3) : r[j]]))), `cashier-${st.csd.cashierId}-orders.xlsx`); },
    print() {
      const d = this.data();
      printDoc(`${t('rp.cashierSales')} — ${this.name()}`, [[t('c.from'), st.cs.from || '-'], [t('c.to'), st.cs.to || '-'], [t('o.branch'), rpBranchName(st.cs.branch)]], this.cols(),
        this.rows().map(r => r.map((v, j) => (j >= 5 && j <= 7 ? moneyPlain(v) : String(v)))), [[t('rp.totalProducts'), moneyPlain(d.tot.products)], [t('rp.totalDelivery'), moneyPlain(d.tot.fee)], [t('rp.totalSales'), moneyPlain(d.tot.total)]]);
    }
  };

  /* ---- returns: to stock, scrap and to supplier, per item / branch / storekeeper ---- */
  V.returns = {
    title: () => t('rp.returns'),
    shell: () => shell(t('rp.returns'), t('rp.returnsSub'), searchF('q', t('rp.searchReturns'), st.ret.q) + dateF('from', t('c.from'), st.ret.from) + dateF('to', t('c.to'), st.ret.to) + selF('branch', t('o.branch')) + selF('sort', t('rp.sort')), { k: 4 }),
    data() {
      const f = st.ret, map = {}, branches = LIVE.cache.branches || {};
      const mainId = (Object.entries(branches).find(([, b]) => b && b.isMain) || [])[0] || null;
      const add = (rec, type, src) => {
        if (!rec || !inRange(rpNum(rec.createdAt), f.from, f.to)) return;
        if (f.branch !== 'all' && String(src || '') !== String(f.branch)) return;
        const keeper = rec.storekeeperName || '-';
        (Array.isArray(rec.items) ? rec.items : Object.values(rec.items || {})).forEach(it => {
          const id = String((it && (it.itemId || it.id)) || ''); if (!id) return;
          const kind = it.itemType || it.type || 'product';
          const data = (kind === 'product' ? LIVE.cache.products : LIVE.cache.stockMaterials || {}) || {};
          const item = data[id];
          const key = `${kind}:${id}:${src || 'none'}:${keeper}`;
          const r = (map[key] ||= { code: (item && item.code) || it.code || id, name: nameOf(item) || it.name || '-', branch: nameOf(branches[src]) || '-', keeper, stock: 0, scrap: 0, supplier: 0, total: 0 });
          const q = rpNum(it.qty);
          r[type] += q; r.total += q;
        });
      };
      Object.values(LIVE.cache.stockReturn || {}).forEach(r => add(r, 'stock', r && r.fromBranchId));
      Object.values(LIVE.cache.scrapReturn || {}).forEach(r => add(r, 'scrap', r && r.branchId));
      Object.values(LIVE.cache.supplierReturns || {}).forEach(r => add(r, 'supplier', mainId));
      const q = normQ(f.q);
      const rows = Object.values(map).filter(r => !q || normQ(`${r.code} ${r.name} ${r.keeper}`).includes(q)).sort((a, b) => (f.sort === 'asc' ? a.total - b.total : b.total - a.total));
      return { rows, tot: rows.reduce((a, r) => ({ stock: a.stock + r.stock, scrap: a.scrap + r.scrap, supplier: a.supplier + r.supplier, total: a.total + r.total }), { stock: 0, scrap: 0, supplier: 0, total: 0 }) };
    },
    cols: () => [t('it.code'), t('rp.name'), t('rp.fromBranch'), t('rp.storekeeper'), t('rp.returnQtys')],
    draw() {
      const d = this.data(), c = this.cols();
      fill('branch', branchOpts(st.ret.branch));
      fill('sort', [['desc', t('rp.sortDesc')], ['asc', t('rp.sortAsc')]].map(([v, l]) => `<option value="${v}" ${st.ret.sort === v ? 'selected' : ''}>${l}</option>`).join(''));
      kpis([[t('rp.toStock'), d.tot.stock, 'num', 'in', 'c1'], [t('rp.scrap'), d.tot.scrap, 'num', 'trash', 'c2'], [t('rp.toSupplier'), d.tot.supplier, 'num', 'truck', 'c3'], [t('rp.retTotal'), d.tot.total, 'num', 'ret', 'c4']]);
      setHtml($('#rpHead', view), th(c));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr class="${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td(c[0], `<span class="mono">${esc(r.code)}</span>`)}${td(c[1], `<b>${esc(r.name)}</b>`)}${td(c[2], esc(r.branch))}${td(c[3], esc(r.keeper))}
        ${td(c[4], `<span class="rp-ret"><span>${t('rp.toStock')}: <b class="num">${fmtNum(r.stock, 3)}</b></span><span>${t('rp.scrap')}: <b class="num">${fmtNum(r.scrap, 3)}</b></span><span>${t('rp.toSupplier')}: <b class="num">${fmtNum(r.supplier, 3)}</b></span></span>`)}</tr>`).join('') : empty(5, st.ret.q || st.ret.from || st.ret.to || st.ret.branch !== 'all'));
      setHtml($('#rpFoot', view), '');
    },
    pcols: () => [t('it.code'), t('rp.name'), t('rp.fromBranch'), t('rp.storekeeper'), t('rp.toStock'), t('rp.scrap'), t('rp.toSupplier'), t('rp.returnQtys')],
    export() { const c = this.pcols(); excelOut(this.data().rows.map(r => ({ [c[0]]: r.code, [c[1]]: r.name, [c[2]]: r.branch, [c[3]]: r.keeper, [c[4]]: r.stock, [c[5]]: r.scrap, [c[6]]: r.supplier, [c[7]]: r.total })), 'returns-report.xlsx'); },
    print() {
      const d = this.data();
      printDoc(t('rp.returns'), [[t('c.from'), st.ret.from || '-'], [t('c.to'), st.ret.to || '-'], [t('o.branch'), rpBranchName(st.ret.branch)]], this.pcols(),
        d.rows.map(r => [r.code, r.name, r.branch, r.keeper, fmtNum(r.stock, 3), fmtNum(r.scrap, 3), fmtNum(r.supplier, 3), fmtNum(r.total, 3)]),
        [[t('rp.toStock'), fmtNum(d.tot.stock, 3)], [t('rp.scrap'), fmtNum(d.tot.scrap, 3)], [t('rp.toSupplier'), fmtNum(d.tot.supplier, 3)], [t('rp.retTotal'), fmtNum(d.tot.total, 3)]]);
    }
  };

  /* ---- orders sales with a running balance (needs a period) ---- */
  V.orderSales = {
    title: () => t('rp.orderSales'),
    shell: () => shell(t('rp.orderSales'), t('rp.orderSalesSub'), searchF('q', t('rp.searchInvoice'), st.os.q) + dateF('from', t('c.from'), st.os.from) + dateF('to', t('c.to'), st.os.to) + selF('branch', t('o.branch'))),
    data() {
      const f = st.os;
      if (!f.from || !f.to) return { rows: [], tot: { products: 0, fee: 0, total: 0, balance: 0 }, missing: true };
      const q = normQ(f.q); let balance = 0;
      const rows = rpOrders(f.from, f.to, f.branch).slice().sort((a, b) => a.ts - b.ts)
        .filter(({ o }) => !q || normQ(`${oNum(o)} ${oCustName(o)} ${oPhone(o)}`).includes(q) || oProductText(o).includes(q))
        .map(({ o, ts }) => { balance += rpNum(o.total); return { o, ts, products: rpProducts(o), fee: oFee(o), total: rpNum(o.total), balance }; });
      const tot = rows.reduce((a, r) => ({ products: a.products + r.products, fee: a.fee + r.fee, total: a.total + r.total }), { products: 0, fee: 0, total: 0 });
      tot.balance = rows.length ? rows[rows.length - 1].balance : 0;
      return { rows, tot, missing: false };
    },
    cols: () => ['#', t('o.number'), t('o.customer'), t('c.phone'), t('rp.productsAmount'), t('rp.deliveryPrice'), t('o.grand'), t('c.date'), t('rp.balance')],
    draw() {
      const d = this.data(), c = this.cols();
      fill('branch', branchOpts(st.os.branch));
      const note = $('#rpNote', view); note.hidden = !d.missing; note.textContent = t('rp.pickPeriod');
      kpis([[t('rp.productsAmount'), d.tot.products, 'money', 'package', 'c1'], [t('rp.deliveryPrice'), d.tot.fee, 'money', 'bike', 'c2'], [t('rp.totalSales'), d.tot.total, 'money', 'wallet', 'c3']]);
      setHtml($('#rpHead', view), th([c[0], c[1], c[2], c[3], [c[4], 'end'], [c[5], 'end'], [c[6], 'end'], c[7], [c[8], 'end']]));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-inv="${inv(r.o)}" class="rp-click-row ${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td('#', i + 1)}${td(c[1], `<b class="mono">#${esc(oNum(r.o))}</b>`)}${td(c[2], esc(oCustName(r.o)))}${td(c[3], `<span class="mono">${esc(oPhone(r.o))}</span>`)}${td(c[4], money(r.products), 'end num')}${td(c[5], money(r.fee), 'end num')}${td(c[6], money(r.total), 'end num')}${td(c[7], `<span class="date">${fmtDateTime(oTime(r.o))}</span>`)}${td(c[8], `<b>${money(r.balance)}</b>`, 'end num')}</tr>`).join('')
        : d.missing ? `<tr class="empty"><td colspan="9"><div class="empty-state">${icon('calendar')}<b>${t('rp.pickPeriod')}</b><small>${t('rp.pickPeriodSub')}</small></div></td></tr>` : empty(9, st.os.q || st.os.branch !== 'all'));
      setHtml($('#rpFoot', view), d.rows.length ? `<tr><td colspan="4">${t('rp.total')}</td><td class="end num">${money(d.tot.products)}</td><td class="end num">${money(d.tot.fee)}</td><td class="end num">${money(d.tot.total)}</td><td class="rp-foot-gap">-</td><td class="end num">${money(d.tot.balance)}</td></tr>` : '');
    },
    rows() { return this.data().rows.map((r, i) => [i + 1, oNum(r.o), oCustName(r.o), oPhone(r.o), r.products, r.fee, r.total, fmtDateTime(oTime(r.o)), r.balance]); },
    export() {
      const c = this.cols(), d = this.data(), m = v => +v.toFixed(3);
      if (!d.rows.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
      const out = this.rows().map(r => ({ [c[0]]: r[0], [c[1]]: r[1], [c[2]]: r[2], [c[3]]: r[3], [c[4]]: m(r[4]), [c[5]]: m(r[5]), [c[6]]: m(r[6]), [c[7]]: r[7], [c[8]]: m(r[8]) }));
      out.push({ [c[0]]: '', [c[1]]: t('rp.total'), [c[2]]: '', [c[3]]: '', [c[4]]: m(d.tot.products), [c[5]]: m(d.tot.fee), [c[6]]: m(d.tot.total), [c[7]]: '', [c[8]]: m(d.tot.balance) });
      excelOut(out, 'orders-sales-report.xlsx');
    },
    print() {
      const d = this.data();
      if (!d.rows.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
      printDoc(t('rp.orderSales'), [[t('c.from'), st.os.from || '-'], [t('c.to'), st.os.to || '-'], [t('o.branch'), rpBranchName(st.os.branch)]], this.cols(),
        this.rows().map(r => [String(r[0]), r[1], r[2], r[3], moneyPlain(r[4]), moneyPlain(r[5]), moneyPlain(r[6]), r[7], moneyPlain(r[8])]),
        [[t('rp.productsAmount'), moneyPlain(d.tot.products)], [t('rp.deliveryPrice'), moneyPlain(d.tot.fee)], [t('o.grand'), moneyPlain(d.tot.total)], [t('rp.balance'), moneyPlain(d.tot.balance)]]);
    }
  };

  /* ---- top / least selling products, split by branch ---- */
  V.topProducts = {
    title: () => t('rp.topProducts'),
    shell: () => shell(t('rp.topProducts'), t('rp.topSub'), searchF('q', t('rp.searchProduct'), st.tp.q) + dateF('from', t('c.from'), st.tp.from) + dateF('to', t('c.to'), st.tp.to) + selF('mode', t('rp.tpChart')) + selF('limit', t('it.perPage')), { chart: true, k: 2 }),
    draw() {
      const d = tpData(st.tp), cols = d.columns;
      fill('mode', [['top', t('rp.modeTop')], ['bottom', t('rp.modeBottom')]].map(([v, l]) => `<option value="${v}" ${st.tp.mode === v ? 'selected' : ''}>${l}</option>`).join(''));
      fill('limit', [10, 50, 100].map(n => `<option ${st.tp.limit === n ? 'selected' : ''}>${n}</option>`).join(''));
      kpis([[t('rp.shownCount'), d.rows.length, 'num', 'package', 'c1'], [t('rp.shownTotal'), d.total, 'money', 'wallet', 'c2']]);
      setHtml($('#rpChart', view), `<header class="card-head"><h3>${t('rp.tpChart')}</h3>${dlBtn(t('rp.topProducts'))}</header>${tpChart(d)}`);
      setHtml($('#rpHead', view), th([t('rp.nameAr'), t('rp.nameEn')].concat(cols.map(c => [esc(c.label), 'end']))));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr class="${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td(t('rp.nameAr'), `<b>${esc(r.nameAr)}</b>`)}${td(t('rp.nameEn'), esc(r.nameEn || '-'))}
        ${cols.map(c => { const v = rpNum(r.by[c.key]); return td(c.label, v ? `<button class="link num" data-tpd="${esc(r.productId)}" data-b="${esc(c.key)}">${money(v)}</button>` : `<span class="num muted">${money(0)}</span>`, 'end'); }).join('')}</tr>`).join('') : empty(2 + cols.length, st.tp.q || st.tp.from || st.tp.to));
      setHtml($('#rpFoot', view), '');
    },
    export() {
      const d = tpData(st.tp);
      excelOut(d.rows.map(r => Object.assign({ [t('rp.nameAr')]: r.nameAr, [t('rp.nameEn')]: r.nameEn || '-' }, Object.fromEntries(d.columns.map(c => [c.label, +rpNum(r.by[c.key]).toFixed(3)])))), 'top-products-report.xlsx');
    },
    print() {
      const d = tpData(st.tp);
      printDoc(t('rp.topProducts'), [[t('c.from'), st.tp.from || '-'], [t('c.to'), st.tp.to || '-'], [t('rp.tpChart'), st.tp.mode === 'bottom' ? t('rp.modeBottom') : t('rp.modeTop')]],
        [t('rp.nameAr'), t('rp.nameEn')].concat(d.columns.map(c => c.label)), d.rows.map(r => [r.nameAr, r.nameEn || '-'].concat(d.columns.map(c => moneyPlain(rpNum(r.by[c.key]))))), [t('rp.shownTotal'), moneyPlain(d.total)]);
    }
  };

  /* ---- invoices of one product in one branch (from the top products report) ---- */
  V.topProductDetails = {
    product: () => (LIVE.cache.products || {})[st.tpd.productId] || null,
    title: () => t('rp.productDetails'),
    shell: () => shell(t('rp.productDetails'), '', searchF('q', t('rp.searchTpd'), st.tpd.q) + dateF('from', t('c.from'), st.tpd.from) + dateF('to', t('c.to'), st.tpd.to) + selF('cashier', t('o.cashier'))),
    branchLabel() { const b = st.tpd.branch; return b === 'all' ? t('allBranches') : nameOf((LIVE.cache.branches || {})[b]) || (b === 'unknown' ? '-' : b); },
    data() {
      const f = st.tpd, pid = String(f.productId || ''), q = normQ(f.q), cashiers = new Map();
      const rows = [];
      rpOrders(f.from, f.to).forEach(({ o, ts }) => {
        if (f.branch !== 'all' && (String(o.branchId || '') || 'unknown') !== f.branch) return;
        if (f.cashier !== 'all' && String(o.cashierId || '') !== f.cashier) return;
        const value = oItems(o).reduce((s, it) => s + (String(it.productId) === pid ? it.total : 0), 0);
        if (!value) return;
        const r = { o, ts, value, addr: custOrderAddress(o), type: custOrderType(o), fee: oFee(o), total: rpNum(o.total) };
        if (q && !normQ(`${oNum(o)} ${oBranch(o)} ${oCashier(o)} ${r.type} ${r.addr}`).includes(q)) return;
        rows.push(r);
        if (o.cashierId) cashiers.set(String(o.cashierId), oCashier(o));
      });
      return { rows, cashiers: [...cashiers].sort((a, b) => a[1].localeCompare(b[1])), tot: rows.reduce((a, r) => ({ products: a.products + r.value, fee: a.fee + r.fee, total: a.total + r.total }), { products: 0, fee: 0, total: 0 }) };
    },
    cols: () => [t('o.number'), t('o.branch'), t('o.cashier'), t('o.type'), t('rp.address'), t('rp.productsAmount'), t('o.fee'), t('o.grand'), t('c.date')],
    draw() {
      const p = this.product();
      if (!p) { go('topProducts'); return; }
      const d = this.data(), c = this.cols();
      setHtml($('#rpSub', view), `<b>${esc(nameOf(p) || '-')}</b> · ${t('it.code')}: <span class="mono">${esc(p.code || '-')}</span> · ${t('o.branch')}: ${esc(this.branchLabel())}`);
      fill('cashier', `<option value="all">${t('all')}</option>` + optsHtml(d.cashiers, st.tpd.cashier));
      kpis([[t('rp.productsAmount'), d.tot.products, 'money', 'package', 'c1'], [t('o.fee'), d.tot.fee, 'money', 'bike', 'c2'], [t('rp.totalSales'), d.tot.total, 'money', 'wallet', 'c3']]);
      setHtml($('#rpHead', view), th(c.slice(0, 5).concat(c.slice(5, 8).map(x => [x, 'end'])).concat([c[8]])));
      setHtml($('#rpBody', view), d.rows.length ? d.rows.map((r, i) => `<tr data-inv="${inv(r.o)}" class="rp-click-row ${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">${td(c[0], `<b class="mono">#${esc(oNum(r.o))}</b>`)}${td(c[1], esc(oBranch(r.o)))}${td(c[2], esc(oCashier(r.o)))}${td(c[3], esc(r.type))}${td(c[4], esc(r.addr))}${td(c[5], money(r.value), 'end num')}${td(c[6], money(r.fee), 'end num')}${td(c[7], `<b>${money(r.total)}</b>`, 'end num')}${td(c[8], `<span class="date">${fmtDateTime(oTime(r.o))}</span>`)}</tr>`).join('') : empty(9, st.tpd.q || st.tpd.cashier !== 'all'));
      setHtml($('#rpFoot', view), '');
    },
    rows() { return this.data().rows.map(r => [oNum(r.o), oBranch(r.o), oCashier(r.o), r.type, r.addr, r.value, r.fee, r.total, fmtDateTime(oTime(r.o))]); },
    export() { const c = this.cols(); excelOut(this.rows().map(r => Object.fromEntries(c.map((h, j) => [h, j >= 5 && j <= 7 ? +r[j].toFixed(3) : r[j]]))), 'top-product-branch-details.xlsx'); },
    print() {
      const p = this.product() || {}, d = this.data();
      printDoc(t('rp.productDetails'), [[t('rp.name'), nameOf(p) || '-'], [t('o.branch'), this.branchLabel()], [t('c.from'), st.tpd.from || '-'], [t('c.to'), st.tpd.to || '-']], this.cols(),
        this.rows().map(r => r.map((v, j) => (j >= 5 && j <= 7 ? moneyPlain(v) : String(v)))), [[t('rp.productsAmount'), moneyPlain(d.tot.products)], [t('o.fee'), moneyPlain(d.tot.fee)], [t('o.grand'), moneyPlain(d.tot.total)]]);
    }
  };

  /* Where "back" goes from each report (as the old page) */
  const BACK = { productDetails: 'sales', cashierSalesDetails: 'cashierSales', topProductDetails: 'topProducts' };
  /* The filter state each report's fields write to */
  const FILTERS = { metricDetails: 'md', sales: 'sales', productDetails: 'det', cashierSales: 'cs', returns: 'ret', orderSales: 'os', topProducts: 'tp', topProductDetails: 'tpd' };

  /* =================== render =================== */
  function render() {
    closePicker();
    first = true;
    if (st.view === 'returns' && !retWatched) { retWatched = true; unsubs.push(LIVE.watch(RP_RET_PATHS, () => draw())); }
    view.innerHTML = st.view === 'dashboard' || !V[st.view] ? dashShell() : V[st.view].shell();
    stagger(view);
    draw();
  }
  function draw() {
    if (!view.isConnected) return;
    invRef = new Map();
    if (st.view === 'dashboard' || !V[st.view]) drawDash();
    else if (!loading(9)) V[st.view].draw();
    if (picker) drawPicker();
    first = false;
  }
  function go(v) { st.view = v; render(); window.scrollTo({ top: 0 }); }

  /* =================== sales category picker (folders, as the old page) =================== */
  let pkPath = [];
  const kids = parent => Object.entries(LIVE.cache.productCategories || {}).filter(([, c]) => c && (c.parentId || null) === (parent || null)).sort((a, b) => (nameOf(a[1]) || '').localeCompare(nameOf(b[1]) || ''));
  const keys = e => { if (picker && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } };
  function closePicker() {
    if (!picker) return;
    const el = picker; picker = null;
    el.classList.remove('open'); setTimeout(() => el.remove(), 200);
    document.removeEventListener('keydown', keys, true);
  }
  function drawPicker() {
    const cats = LIVE.cache.productCategories || {}, parent = pkPath[pkPath.length - 1] || null, list = kids(parent);
    $('#pkPath', picker).textContent = pkPath.length ? pkPath.map(id => nameOf(cats[id]) || '-').join(' / ') : t('rp.allCats');
    $('#pkBack', picker).disabled = !pkPath.length;
    $('#pkCur', picker).disabled = !pkPath.length;
    $('#pkList', picker).innerHTML = list.length ? list.map(([id, c]) => {
      const more = kids(id).length > 0;
      return `<button type="button" class="pk-row rp-cat-row${st.sales.cat === id ? ' on' : ''}" data-cat="${esc(id)}" data-more="${more ? 1 : ''}"><span class="pk-type">${icon('folder')}</span><span class="pk-txt"><b>${esc(nameOf(c) || '-')}</b>${more ? `<small>${kids(id).length} ${t('rp.subCats')}</small>` : ''}</span>${more ? icon('chevLeft', 'flip') : ''}</button>`;
    }).join('') : `<div class="empty-state">${icon('folder')}<b>${t('rp.noData')}</b></div>`;
  }
  function pickCat(id) {
    st.sales.cat = id; st.sales.sel = new Set(); st.sales.auto = true;
    closePicker(); draw();
  }
  function openPicker() {
    if (picker || !LIVE.loaded(RP_PATHS)) return;
    pkPath = [];
    picker = document.createElement('div');
    picker.className = 'pk-wrap';
    picker.innerHTML = `<div class="pk-backdrop" data-pk-close></div>
      <div class="pk rp-pk" role="dialog" aria-modal="true" aria-labelledby="pkTitle">
        <header class="pk-head"><span class="ph-ic sm">${icon('folder')}</span><div><h3 id="pkTitle">${t('rp.pickCat')}</h3><p id="pkPath"></p></div>
          <button class="btn-icon" data-pk-close aria-label="${t('close')}">${icon('x')}</button></header>
        <div class="pk-list" id="pkList"></div>
        <footer class="pk-foot"><button class="btn btn-ghost" id="pkBack">${icon('chevRight', 'flip')}<span>${t('back')}</span></button><span class="tb-spacer"></span>
          <button class="btn btn-ghost" id="pkAll">${t('rp.allCats')}</button>
          <button class="btn btn-primary" id="pkCur">${icon('check')}<span>${t('rp.applyCur')}</span></button></footer>
      </div>`;
    document.body.appendChild(picker);
    drawPicker();
    void picker.offsetWidth; picker.classList.add('open');
    document.addEventListener('keydown', keys, true);
    picker.addEventListener('click', e => {
      if (e.target.closest('[data-pk-close]')) { closePicker(); return; }
      if (e.target.closest('#pkBack')) { pkPath = pkPath.slice(0, -1); drawPicker(); return; }
      if (e.target.closest('#pkAll')) { pickCat('all'); return; }
      if (e.target.closest('#pkCur')) { if (pkPath.length) pickCat(pkPath[pkPath.length - 1]); return; }
      const row = e.target.closest('[data-cat]'); if (!row) return;
      if (row.dataset.more) { pkPath = [...pkPath, row.dataset.cat]; drawPicker(); } else pickCat(row.dataset.cat);
    });
  }

  /* =================== events =================== */
  let deb;
  const filterOf = () => st[FILTERS[st.view]];
  function setFilter(el) {
    const f = filterOf(); if (!f) return;
    const k = el.dataset.f;
    f[k] = k === 'limit' ? +el.value : el.value;
    if (st.view === 'sales') { f.sel = new Set(); f.auto = true; }
    draw();
  }
  view.addEventListener('input', e => {
    const el = e.target.closest('input[type="search"][data-f]'); if (!el) return;
    clearTimeout(deb); deb = setTimeout(() => setFilter(el), 250);
  });
  view.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('[data-pc]')) { onPeriod(el); return; }
    if (el.id === 'rpBranch') { st.branch = el.value; draw(); return; }
    if (el.id === 'rpCmp') { st.cmp = el.checked; draw(); return; }
    if (el.id === 'rpTpMode') { st.tp.mode = el.value === 'bottom' ? 'bottom' : 'top'; draw(); return; }
    if (el.id === 'rpTpLimit') { st.tp.limit = +el.value || 10; draw(); return; }
    if (el.id === 'rpAll') { const d = V.sales.data(); st.sales.sel = el.checked ? new Set(d.rows.map(r => r.key)) : new Set(); st.sales.auto = false; draw(); return; }
    if (el.dataset.pick) { el.checked ? st.sales.sel.add(el.dataset.pick) : st.sales.sel.delete(el.dataset.pick); st.sales.auto = false; draw(); return; }
    if (el.matches('[data-f]') && el.type !== 'search') setFilter(el);
  });
  view.addEventListener('click', e => {
    const per = e.target.closest('[data-period]');
    if (per) {
      if (per.classList.contains('on')) return;
      st.period = per.dataset.period;
      st.date = rpAlign(st.period, st.date);
      $$('button', per.parentElement).forEach(b => b.classList.toggle('on', b === per));
      draw(); return;
    }
    const metric = e.target.closest('[data-metric]');
    if (metric) { Object.assign(st.md, { metric: metric.dataset.metric, branch: st.branch, cashier: 'all', customer: 'all', q: '', pick: null }); go('metricDetails'); return; }
    const dr = e.target.closest('[data-drill]');
    if (dr) { drill(dr.dataset.drill, dr.dataset.label, dr.dataset.val); return; }
    const open = e.target.closest('[data-open]');
    if (open) {
      const v = open.dataset.open, f = st[FILTERS[v]];
      if (v === 'cashierSales') st.csd.cashierId = null;
      // Opened from the dashboard: the report starts on the same period and branch
      if (st.view === 'dashboard' && f) { Object.assign(f, periodF()); if ('branch' in f) f.branch = st.branch; if (v === 'sales') { f.sel = new Set(); f.auto = true; } }
      go(v); return;
    }
    const tpd = e.target.closest('[data-tpd]');
    if (tpd) {
      const fromDash = st.view === 'dashboard';
      st.tpdBack = fromDash ? 'dashboard' : 'topProducts';
      st.tpd = { productId: tpd.dataset.tpd, branch: tpd.dataset.b || 'all', ...(fromDash ? periodF() : { from: st.tp.from, to: st.tp.to }), cashier: 'all', q: '' };
      go('topProductDetails'); return;
    }
    const dl = e.target.closest('[data-chart-dl]');
    if (dl) {
      const card = dl.closest('.card'), name = dl.dataset.chartDl, ar = S.lang === 'ar';
      const day = v => (v ? rpDate(v).toLocaleDateString(loc(), { day: 'numeric', month: 'long', year: 'numeric' }) : '-');
      const words = st.view === 'dashboard' ? periodWords()
        : st.tp.from && st.tp.from === st.tp.to ? `${ar ? 'ليوم ' : ''}${day(st.tp.from)}`
        : ar ? `من ${day(st.tp.from)} إلى ${day(st.tp.to)}` : `${day(st.tp.from)} – ${day(st.tp.to)}`;
      const sub = $('.card-head p', card);
      dl.classList.add('loading');
      downloadChartImage(card, { title: `${chartTitle(name)} ${words}`, caption: [sub && sub.textContent, st.cmp && st.view === 'dashboard' ? t('rp.compare') : ''].filter(Boolean).join(' · '), file: `${name} ${words}`.replace(/[\\/:*?"<>|]+/g, '-') })
        .then(() => toast(t('ci.done')), () => toast(t('ci.failed'), { tone: 'danger', ic: 'alert' }))
        .finally(() => dl.classList.remove('loading'));
      return;
    }
    const b = e.target.closest('[data-rp]');
    if (b) {
      const act = b.dataset.rp, v = V[st.view];
      if (act === 'back') go(st.view === 'topProductDetails' ? st.tpdBack || 'topProducts' : BACK[st.view] || 'dashboard');
      else if (act === 'cats') openPicker();
      else if (act === 'export' && v && LIVE.loaded(RP_PATHS) && allLoaded()) v.export();
      else if (act === 'print' && v && LIVE.loaded(RP_PATHS) && allLoaded()) v.print();
      return;
    }
    if (e.target.closest('input, button, a, select, label')) return;
    const invRow = e.target.closest('tr[data-inv]');
    if (invRow) { const o = invRef.get(invRow.dataset.inv); if (o) invoiceDetails(o); return; }
    const row = e.target.closest('tr[data-go]'); if (!row) return;
    if (st.view === 'sales') {
      const r = V.sales.data().rows.find(x => x.key === row.dataset.go); if (!r) return;
      st.det = { productId: r.productId, branch: r.branchId === 'unknown' ? 'all' : r.branchId };
      go('productDetails');
    } else if (st.view === 'cashierSales') { st.csd.cashierId = row.dataset.go; go('cashierSalesDetails'); }
  });

  view.addEventListener('keydown', e => { const el = e.target.closest('.kpi[data-drill]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); } });
  render();
  return () => { unsubs.forEach(u => u()); clearTimeout(deb); closePicker(); };
};
