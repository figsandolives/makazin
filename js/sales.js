/* الطلبات · طلبات الأونلاين · العملاء — live pages.
   Same data and rules as the old accounting page: orders (cashier invoices,
   edited/cancelled through a transaction so a cancelled invoice is never changed),
   online orders from the platform API (/accounting/online-orders), customers. */

['orders', 'online-orders', 'customers'].forEach(r => LIVE_ROUTES.add(r));

/* ---------- order helpers (same fallbacks as the old page) ---------- */
const oCancelled = o => !!o && (o.status === 'cancelled' || o.isCancelled === true);
const oCancelText = o => (!oCancelled(o) ? '' : `${t('o.cancelledBy')} ${o.cancelledByName || t('o.unknown')}${o.cancelledAt ? ` — ${fmtDateTime(o.cancelledAt)}` : ''}`);
function oTime(o) {
  // accountingDate = the day a deferred invoice counts on (local midnight)
  if (o && o.accountingDate && /^\d{4}-\d{2}-\d{2}$/.test(o.accountingDate)) {
    const d = new Date(`${o.accountingDate}T00:00:00`).getTime();
    if (Number.isFinite(d)) return d;
  }
  const v = o && (o.createdAt ?? o.timestamp ?? o.date ?? o.createdAtMs);
  const time = typeof v === 'number' ? v : new Date(v || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}
const oNum = o => (o && (o.orderNumber || o.invoiceNumber || o.invoiceNo || o.orderId || o.number)) || '-';
/* Orders are tied to customers by phone number (the cashier saves the customer's name and phone
   on the order, not its id) — customerId is used only when an order carries a valid one. */
const phoneKey = v => { const d = toLatin(String(v || '')).replace(/\D/g, '').replace(/^00965/, '').replace(/^965(?=\d{8}$)/, ''); return d; };
let custIdxSrc = null, custIdx = new Map();
function custPhoneIndex() {
  const cs = LIVE.cache.customers || {};
  if (cs !== custIdxSrc) { custIdxSrc = cs; custIdx = new Map(); Object.entries(cs).forEach(([id, c]) => { const k = c && phoneKey(c.phone); if (k && !custIdx.has(k)) custIdx.set(k, id); }); }
  return custIdx;
}
const oCustId = o => { if (!o) return null; const cs = LIVE.cache.customers || {}; if (o.customerId && cs[o.customerId]) return o.customerId;
  const k = phoneKey(o.customerPhone || o.phoneNumber || o.phone); return (k && custPhoneIndex().get(k)) || null; };
const oCustomer = o => { const id = oCustId(o); return id ? (LIVE.cache.customers || {})[id] || null : null; };
/* The cashier's fixed area list (customer addresses and delivery prices are keyed by these names) */
const CASHIER_AREAS = ['السرة', 'الزهراء', 'السلام', 'حطين', 'الفيحاء', 'القادسية', 'مشرف', 'كيفان', 'الروضة', 'العديلية',
  'الخالدية', 'النزهة', 'الدعية', 'المنصورية', 'قرطبة', 'الشامية', 'الرميثية', 'عبدالله السالم', 'الجابرية',
  'بيان', 'الصديق', 'الشهداء', 'اليرموك', 'الفروانية', 'خيطان', 'بنيد القار', 'الدسمة', 'حولي', 'ميدان حولي',
  'مبارك الكبير', 'القصور', 'الرابية', 'العمرية', 'الرقعي', 'غرناطة', 'القرين', 'الشويخ', 'المسيلة', 'الكويت',
  'اشبيليا', 'السالمية', 'شرق', 'الرحاب', 'المرقاب', 'صباح السالم', 'الفردوس', 'صباح الناصر', 'المسايل',
  'الاندلس', 'العارضية', 'سلوى', 'العدان', 'الشعب', 'هدية', 'الصليبيخات', 'الجهراء', 'الفنطاس', 'سعد العبدالله',
  'الفنيطيس', 'الدوحة', 'العقيلة', 'جابر العلي', 'جابر الاحمد', 'عبدالله مبارك', 'المهبولة', 'المنقف', 'الاحمدي',
  'الصليبية', 'الصباحية', 'فهد الاحمد', 'صبحان', 'ابو فطيرة', 'ابو الحصانية', 'الظهر', 'ابو حليفة', 'الفحيحيل',
  'جليب الشيوخ', 'ام الهيمان', 'المطلاع', 'صباح الاحمد', 'الوفرة'];
const oCustName = o => (o && (o.customerName || o.name)) || nameOf(oCustomer(o)) || '-';
const oPhone = o => (o && (o.customerPhone || o.phoneNumber || o.phone)) || (oCustomer(o) || {}).phone || '-';
const PLATFORM_BRANCH = { hawalli: ['فرع حولي', 'Hawalli'], yarmouk: ['فرع اليرموك', 'Yarmouk'], abu: ['فرع أبو الحصانية', 'Abu Al-Hasaniya'] };
function oBranch(o) {
  const id = String((o && o.branchId) || '');
  const p = PLATFORM_BRANCH[id];
  return (o && (o.branchName || o.branch)) || nameOf((LIVE.cache.branches || {})[id]) || (p ? p[S.lang === 'ar' ? 0 : 1] : '') || id || '-';
}
const oCashier = o => { const c = (LIVE.cache.cashiers || {})[o && o.cashierId] || {}; return (o && (o.cashierName || o.cashier)) || c.name || c.code || '-'; };
function oZone(o) {
  const direct = o && (o.deliveryZoneName || o.deliveryArea || o.area || o.areaName || o.zoneName);
  if (direct) return direct;
  const z = nameOf((LIVE.cache.deliveryZones || {})[o && o.deliveryZoneId]);
  if (z) return z;
  const addr = String((o && o.address) || '').trim();
  return addr ? addr.split(/[-،,]/)[0].trim() : '-';
}
function oType(o) {
  const direct = nameOf((LIVE.cache.orderTypes || {})[o && o.orderTypeId]);
  if (direct) return direct;
  const raw = String((o && (o.orderTypeName || o.orderType || o.type || o.mode)) || '').toLowerCase();
  if (['delivery', 'توصيل'].includes(raw)) return t('o.delivery');
  if (['pickup', 'takeaway', 'استلام'].includes(raw)) return t('o.pickup');
  return (o && (o.orderTypeName || o.orderType)) || '-';
}
const oPayValue = o => (o && (o.paymentMethod || o.paymentMethodId || o.payment)) || '';
function oPay(o) {
  const direct = nameOf((LIVE.cache.paymentMethods || {})[o && o.paymentMethodId]);
  if (direct) return direct;
  const raw = String(oPayValue(o)).toLowerCase();
  if (['cash', 'كاش'].includes(raw)) return t('o.cash');
  if (['online', 'أونلاين', 'اونلاين'].includes(raw)) return t('o.online');
  if (['knet', 'k-net', 'كي-نت', 'كي نت'].includes(raw)) return t('o.knet');
  return (o && (o.paymentMethodName || o.paymentMethod || o.paymentMethodId)) || '-';
}
const oFee = o => (oCancelled(o) ? 0 : Number(o.deliveryFee ?? o.deliveryPrice ?? o.deliveryCharge ?? 0) || 0);
function oItems(o) {
  const products = LIVE.cache.products || {};
  const src = Array.isArray(o && o.items) ? o.items.filter(Boolean) : Object.entries((o && o.items) || {}).map(([k, v]) => ({ productId: k, ...(v || {}) }));
  return src.map(it => {
    const productId = it.productId || it.itemId || it.id || '';
    const p = productId ? products[productId] : null;
    const quantity = Number(it.quantity ?? it.qty ?? it.count ?? 1) || 1;
    const price = Number(it.price ?? it.unitPrice ?? 0) || 0;
    const productName = it.productName || it.name || it.nameAr || nameOf(p) || productId || '-';
    return { ...it, productId, productName, productNameEn: it.productNameEn || it.nameEn || (p && p.nameEn) || '', name: productName, quantity, qty: quantity, price,
      unit: it.unit || it.unitName || (p && p.unit) || 'حبة', total: Number(it.total ?? it.lineTotal ?? quantity * price) || 0 };
  });
}
function oSub(o) {
  if (oCancelled(o)) return 0;
  const itemsTotal = oItems(o).reduce((s, it) => s + Number(it.total || it.quantity * it.price || 0), 0);
  return Number(o.subTotal ?? o.subtotal ?? o.itemsNetTotal ?? o.netTotal ?? itemsTotal) || 0;
}
const oTotal = o => (oCancelled(o) ? 0 : Number(o.total ?? o.grandTotal ?? oSub(o) + oFee(o)) || 0);
const oDiscount = o => (oCancelled(o) ? 0 : Number(o.discountAmount ?? o.discountTotal ?? o.discount ?? 0) || 0);
// Names (Arabic and English) and codes of the products on an invoice, for searching by product.
// Kept per order object: the live copy replaces an order's object only when that order changes.
const oProdCache = new WeakMap();
function oProductText(o) {
  if (!o || typeof o !== 'object') return '';
  let v = oProdCache.get(o);
  if (v === undefined) {
    const products = LIVE.cache.products || {};
    v = normQ(oItems(o).map(it => { const p = products[it.productId]; return [it.productName, it.productNameEn, p && p.nameAr, p && p.nameEn, p && p.code].filter(Boolean).join(' '); }).join(' '));
    oProdCache.set(o, v);
  }
  return v;
}
const oText = o => normQ([oNum(o), oCustName(o), oPhone(o), oBranch(o), oCashier(o), oPay(o), oZone(o)].join(' ')) + ' ' + oProductText(o);
const dayStart = d => new Date(`${d}T00:00:00`).getTime(), dayEnd = d => new Date(`${d}T23:59:59`).getTime();
const inRange = (ts, from, to) => !!ts && (!from || ts >= dayStart(from)) && (!to || ts <= dayEnd(to));
const toLatin = v => String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

async function excelOut(rows, file) {
  if (!rows.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
  try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Report');
  XLSX.writeFile(wb, file);
  toast(t('exported'));
}

/* ---------- printed invoice (same content as the old page's invoice) ---------- */
function printInvoice(o) {
  const items = oItems(o), num = [oNum(o), oCancelText(o)].filter(Boolean).join(' — ');
  const dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  const m = n => `${fmtNum(n, 3, 3)} ${t('currency')}`;
  const meta = [[t('o.customer'), oCustName(o)], [t('c.phone'), oPhone(o)], [t('o.cashier'), oCashier(o)], [t('o.payment'), oPay(o)], [t('o.type'), oType(o)], [t('o.zone'), oZone(o)]];
  if (o.tableNumber) meta.push([t('o.table'), o.tableNumber]);
  if (o.address) meta.push([t('o.address'), o.address]);
  printHtml(`<!doctype html><html lang="${S.lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(t('o.invoice'))} ${esc(oNum(o))}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#0f172a;margin:0;font-size:12.5px}
    header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #16a34a;padding-bottom:12px;margin-bottom:16px}h1{font-size:22px;margin:0 0 4px}.brand{color:#16a34a;font-weight:700}
    .cancel{color:#b91c1c;font-weight:700}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px}.meta div{background:#f1f5f9;border-radius:8px;padding:8px 10px}.meta small{display:block;color:#64748b;font-size:11px}
    table{width:100%;border-collapse:collapse}th{background:#0f172a;color:#fff;font-weight:600;padding:8px;text-align:start}td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.n{text-align:end;font-variant-numeric:tabular-nums}
    .note{color:#1d4ed8;font-size:11px;margin-top:3px}.totals{width:300px;margin-top:16px;margin-inline-start:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
    .totals div{display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e2e8f0}.totals div:last-child{border:0;background:#0f172a;color:#fff;font-weight:700}</style></head>
    <body><header><div><div class="brand">${esc(t('brand'))}</div><h1>${esc(t('o.invoice'))} #${esc(oNum(o))}</h1>${oCancelled(o) ? `<div class="cancel">${esc(oCancelText(o))}</div>` : ''}</div>
    <div style="text-align:end">${esc(oBranch(o))}<br>${esc(fmtDateTime(oTime(o)))}</div></header>
    <div class="meta">${meta.map(([k, v]) => `<div><small>${esc(k)}</small>${esc(v)}</div>`).join('')}</div>
    <table><thead><tr><th>${esc(t('o.product'))}</th><th class="n">${esc(t('c.qty'))}</th><th class="n">${esc(t('o.price'))}</th><th class="n">${esc(t('c.total'))}</th></tr></thead>
    <tbody>${items.length ? items.map(it => `<tr><td>${esc(it.productName)}${it.notes || it.note ? `<div class="note">${esc(it.notes || it.note)}</div>` : ''}</td><td class="n">${esc(fmtNum(it.quantity, 3))} ${esc(it.unit || '')}</td><td class="n">${m(it.price)}</td><td class="n">${m(it.total)}</td></tr>`).join('') : `<tr><td colspan="4">—</td></tr>`}</tbody></table>
    <div class="totals"><div><span>${esc(t('o.net'))}</span><b>${m(oSub(o))}</b></div><div><span>${esc(t('o.fee'))}</span><b>${m(oFee(o))}</b></div><div><span>${esc(t('o.grand'))}</span><b>${m(oTotal(o))}</b></div></div></body></html>`);
}

/* A sale invoice in a drawer (the item card opens it like its other documents); print stays a button */
function invoiceDetails(o) {
  const items = oItems(o), m = n => `${fmtNum(n, 3, 3)} ${t('currency')}`;
  const meta = [[t('o.branch'), oBranch(o)], [t('c.date'), fmtDateTime(oTime(o))], [t('o.customer'), oCustName(o)], [t('c.phone'), oPhone(o)], [t('o.cashier'), oCashier(o)],
    [t('o.payment'), oPay(o)], [t('o.type'), oType(o)], [t('o.zone'), oZone(o)], ...(o.tableNumber ? [[t('o.table'), o.tableNumber]] : []), ...(o.address ? [[t('o.address'), o.address]] : [])];
  const dr = freshDrawer(true);
  dr.innerHTML = `
    <header class="dr-head"><span class="ph-ic sm">${icon('receipt')}</span><div><h2 id="drawerTitle">${t('o.invoice')} #${esc(oNum(o))}</h2><p>${oCancelled(o) ? `<span class="neg">${esc(oCancelText(o))}</span>` : esc(oBranch(o))}</p></div>
      <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
    <div class="dr-body">
      <div class="info-grid three">${meta.map(([a, b]) => `<div><small>${a}</small><b>${esc(b ?? '-')}</b></div>`).join('')}</div>
      <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('o.product')}</th><th class="end">${t('c.qty')}</th><th class="end">${t('o.price')}</th><th class="end">${t('c.total')}</th></tr></thead>
        <tbody>${items.length ? items.map(it => `<tr><td data-label="${t('o.product')}"><b>${esc(it.productName)}</b>${it.notes || it.note ? `<small class="muted"> — ${esc(it.notes || it.note)}</small>` : ''}</td>
          <td data-label="${t('c.qty')}" class="end num">${qtyFmt(it.quantity)} <small>${esc(it.unit || '')}</small></td><td data-label="${t('o.price')}" class="end num">${m(it.price)}</td><td data-label="${t('c.total')}" class="end num">${m(it.total)}</td></tr>`).join('')
          : `<tr><td colspan="4" class="muted">—</td></tr>`}</tbody></table></div>
      <div class="inv-totals"><div><span>${t('o.net')}</span><b class="num">${m(oSub(o))}</b></div><div><span>${t('o.fee')}</span><b class="num">${m(oFee(o))}</b></div><div class="grand"><span>${t('o.grand')}</span><b class="num">${m(oTotal(o))}</b></div></div>
    </div>
    <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><span class="tb-spacer"></span><button class="btn btn-primary" id="invPrint">${icon('printer')}<span>${t('print')}</span></button></footer>`;
  openLayer('#drawer');
  $('#invPrint', dr).addEventListener('click', () => printInvoice(o));
}

/* ---------- multi-select with search (delivery zones) ---------- */
function msHtml(id) {
  return `<div class="ms" id="${id}"><button type="button" class="ms-btn" aria-haspopup="listbox" aria-expanded="false">${icon('pin')}<span class="ms-label"></span>${icon('chevDown')}</button>
    <div class="ms-pop" hidden><label class="search-field">${icon('search')}<input type="search" class="ms-q" placeholder="${t('o.searchZone')}" autocomplete="off"></label>
      <div class="ms-acts"><button type="button" class="link" data-ms="all">${t('o.selectAll')}</button><button type="button" class="link" data-ms="none">${t('o.clearAll')}</button></div>
      <div class="ms-list" role="listbox" aria-multiselectable="true"></div></div></div>`;
}
function msControl(root, { items, get, set }) {
  const btn = $('.ms-btn', root), pop = $('.ms-pop', root), q = $('.ms-q', root);
  const paint = () => {
    const all = items(), sel = get();
    const one = sel.length === 1 && all.find(([id]) => id === sel[0]);
    $('.ms-label', root).textContent = !sel.length ? t('o.allZones') : one ? one[1] : `${t('o.zones')} (${sel.length})`;
    btn.classList.toggle('on', sel.length > 0);
    if (pop.hidden) return;
    const k = normQ(q.value);
    const list = all.filter(([, n]) => !k || normQ(n).includes(k));
    $('.ms-list', root).innerHTML = list.length ? list.map(([id, n]) => `<label class="ms-opt"><input type="checkbox" value="${esc(id)}" ${sel.includes(id) ? 'checked' : ''}><span>${esc(n)}</span></label>`).join('') : `<p class="muted ms-empty">${t('emptyTitle')}</p>`;
  };
  const open = v => { pop.hidden = !v; btn.setAttribute('aria-expanded', v); if (v) { q.value = ''; paint(); setTimeout(() => q.focus(), 30); } };
  btn.addEventListener('click', () => open(pop.hidden));
  q.addEventListener('input', paint);
  root.addEventListener('change', e => {
    const c = e.target.closest('.ms-opt input'); if (!c) return;
    const s = new Set(get()); c.checked ? s.add(c.value) : s.delete(c.value); set([...s]);
  });
  root.addEventListener('click', e => { const a = e.target.closest('[data-ms]'); if (!a) return; set(a.dataset.ms === 'all' ? items().map(([id]) => id) : []); });
  const outside = e => { if (!pop.hidden && !root.contains(e.target)) open(false); };
  const key = e => { if (!pop.hidden && e.key === 'Escape') { e.stopPropagation(); open(false); btn.focus(); } };
  document.addEventListener('click', outside, true);
  document.addEventListener('keydown', key, true);
  return { paint, destroy: () => { document.removeEventListener('click', outside, true); document.removeEventListener('keydown', key, true); } };
}
const zoneItems = () => Object.entries(LIVE.cache.deliveryZones || {}).map(([id, z]) => [id, nameOf(z) || '-']).sort((a, b) => a[1].localeCompare(b[1]));

/* Selection shared by the order lists: select-all ticks the visible page;
   export/print use the ticked orders, or every filtered one when none are ticked (old behaviour). */
function selectionBits(view, st, ids) {
  const all = $('#sAll', view); if (!all) return;
  const on = ids.filter(id => st.sel.has(id)).length;
  all.checked = ids.length > 0 && on === ids.length;
  all.indeterminate = on > 0 && on < ids.length;
  $$('.sel-n', view).forEach(e => { e.textContent = st.sel.size || ''; });
}
function bindSelection(view, st, getIds, onChange) {
  $('#sAll', view).addEventListener('change', e => {
    getIds().forEach(id => (e.target.checked ? st.sel.add(id) : st.sel.delete(id)));
    $$('[data-sel]', view).forEach(c => { c.checked = e.target.checked; });
    onChange();
  });
  view.addEventListener('change', e => {
    const c = e.target.closest('[data-sel]'); if (!c) return;
    const id = c.closest('tr').dataset.id;
    c.checked ? st.sel.add(id) : st.sel.delete(id);
    onChange();
  });
}
const perHtml = st => `<label class="per-field"><small>${t('it.perPage')}</small><span class="select mini"><select data-per>${[10, 50, 100].map(n => `<option ${st.per === n ? 'selected' : ''}>${n}</option>`).join('')}</select>${icon('chevDown')}</span></label>`;

/* Card page listing invoices one by one (row → invoice details when the order has an id) */
function kdOrders({ title, sub, ic = 'receipt', file, list, chips }) {
  const fee = list.reduce((s, o) => s + oFee(o), 0), net = list.reduce((s, o) => s + oSub(o), 0), tot = list.reduce((s, o) => s + oTotal(o), 0);
  const byId = new Map(list.filter(o => o.id).map(o => [String(o.id), o]));
  return { title, sub, ic, file, onRow: id => { const o = byId.get(id); if (o) invoiceDetails(o); },
    chips: chips || [[t('kd.orders'), fmtNum(list.length)], [t('o.net'), fmtMoney(net)], [t('o.fee'), fmtMoney(fee)], [t('o.grand'), fmtMoney(tot)]],
    cols: [{ h: t('o.number') }, { h: t('o.customer') }, { h: t('c.phone') }, { h: t('o.zone') }, { h: t('o.branch') }, { h: t('o.payment') }, { h: t('o.fee'), end: 1 }, { h: t('o.grand'), end: 1 }, { h: t('c.date') }],
    rows: list.map(o => ({ id: o.id ? String(o.id) : null, text: `${oNum(o)} ${oCustName(o)} ${oPhone(o)} ${oZone(o)} ${oBranch(o)} ${oPay(o)}`,
      cells: [`<b class="mono">#${esc(oNum(o))}</b>`, esc(oCustName(o)), `<span class="mono">${esc(oPhone(o))}</span>`, esc(oZone(o)), esc(oBranch(o)), esc(oPay(o)), fmtMoney(oFee(o)), `<b>${fmtMoney(oTotal(o))}</b>`, `<span class="date">${fmtDateTime(oTime(o))}</span>`],
      x: { [t('o.number')]: oNum(o), [t('o.customer')]: oCustName(o), [t('c.phone')]: oPhone(o), [t('o.zone')]: oZone(o), [t('o.branch')]: oBranch(o), [t('o.payment')]: oPay(o), [t('o.fee')]: oFee(o), [t('o.grand')]: oTotal(o), [t('c.date')]: fmtDateTime(oTime(o)) } })) };
}

/* =====================================================================
   الطلبات — cashier invoices
   ===================================================================== */
const OR_PATHS = ['orders', 'branches', 'cashiers', 'deliveryZones', 'orderTypes', 'paymentMethods', 'customers'];

PAGES.orders = view => {
  const st = (S.ord ||= { q: '', from: '', to: '', branch: 'all', cashier: 'all', type: 'all', zones: [], per: 10, page: 1, sel: new Set() });
  let first = true, pageIds = [], saving = false;
  view.innerHTML = `
    ${pageHeader('orders', `<button class="btn btn-ghost" data-o="print">${icon('printer')}<span>${t('o.printReport')}</span><em class="sel-n"></em></button>
      <button class="btn btn-primary" data-o="export">${icon('download')}<span>${t('o.download')}</span><em class="sel-n"></em></button>`, t('o.sub'))}
    <section class="kpis" id="oK"></section>
    <div id="oDeferred"></div>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="oQ" placeholder="${t('o.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <label class="date-field"><small>${t('c.from')}</small><input type="date" id="oFrom" value="${st.from}"></label>
        <label class="date-field"><small>${t('c.to')}</small><input type="date" id="oTo" value="${st.to}"></label>
        <div class="select tb-select"><select id="oBranch" aria-label="${t('c.branch')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="oCashier" aria-label="${t('o.cashier')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="oType" aria-label="${t('o.type')}"></select>${icon('chevDown')}</div>
        ${msHtml('oZones')}
        ${perHtml(st)}
      </div>
      <div class="table-wrap"><table class="dt it-table o-table">
        <thead><tr><th class="sel-col"><input type="checkbox" id="sAll" aria-label="${t('it.selectAll')}"></th><th>${t('o.number')}</th><th>${t('o.customer')}</th><th>${t('o.zone')}</th><th>${t('c.phone')}</th><th>${t('c.date')}</th><th>${t('o.cashier')}</th><th>${t('o.branch')}</th><th>${t('o.type')}</th><th class="end">${t('o.net')}</th><th class="end">${t('o.fee')}</th><th class="end">${t('o.grand')}</th><th>${t('o.payment')}</th><th class="act-col"></th></tr></thead>
        <tbody id="oBody"></tbody></table></div>
      <footer class="pager" id="oPager"></footer>
    </section>`;

  const zones = msControl($('#oZones', view), { items: zoneItems, get: () => st.zones, set: v => { st.zones = v; st.page = 1; zones.paint(); draw(); } });
  const sortedOrders = () => Object.entries(LIVE.cache.orders || {}).filter(([, o]) => o && typeof o === 'object').map(([id, o]) => ({ id, o })).sort((a, b) => oTime(b.o) - oTime(a.o));
  function matches(o) {
    const br = LIVE.cache.branches || {}, ca = LIVE.cache.cashiers || {}, ty = LIVE.cache.orderTypes || {};
    if (st.branch !== 'all' && o.branchId !== st.branch && oBranch(o) !== nameOf(br[st.branch])) return false;
    if (st.cashier !== 'all' && o.cashierId !== st.cashier && oCashier(o) !== ((ca[st.cashier] || {}).name || (ca[st.cashier] || {}).code)) return false;
    if (st.zones.length && !st.zones.includes(o.deliveryZoneId || '')) return false;
    if (st.type !== 'all' && (o.orderTypeId || '') !== st.type && oType(o) !== nameOf(ty[st.type])) return false;
    const ts = oTime(o);
    if (st.from && ts < dayStart(st.from)) return false;
    if (st.to && ts > dayEnd(st.to)) return false;
    return !st.q || oText(o).includes(normQ(st.q));
  }
  const filteredList = () => sortedOrders().filter(x => matches(x.o));
  const chosen = () => { const f = filteredList(); return st.sel.size ? f.filter(x => st.sel.has(x.id)) : f; };

  function row(x, i) {
    const o = x.o, c = oCancelled(o);
    return `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}${c ? ' is-cancelled' : ''}" style="--r:${i}">
      <td class="sel-col"><input type="checkbox" data-sel ${st.sel.has(x.id) ? 'checked' : ''} aria-label="${esc(oNum(o))}"></td>
      <td data-label="${t('o.number')}"><span class="cell-2"><b class="mono">#${esc(oNum(o))}</b>${c ? `<small class="cancel-note">${esc(oCancelText(o))}</small>` : ''}${o.isInvoiceDeferred && o.accountingDate ? `<small class="defer-note">${icon('clock')}${t('o.deferredTo')} ${esc(o.accountingDate)}</small>` : ''}</span></td>
      <td data-label="${t('o.customer')}">${oCustId(o) ? `<button type="button" class="link" data-o="customer">${esc(oCustName(o))}</button>` : esc(oCustName(o))}</td>
      <td data-label="${t('o.zone')}">${esc(oZone(o))}</td>
      <td data-label="${t('c.phone')}"><span class="mono">${esc(oPhone(o))}</span></td>
      <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(oTime(o))}</span></td>
      <td data-label="${t('o.cashier')}">${esc(oCashier(o))}</td>
      <td data-label="${t('o.branch')}">${esc(oBranch(o))}</td>
      <td data-label="${t('o.type')}">${esc(oType(o))}</td>
      <td data-label="${t('o.net')}" class="end"><span class="num">${fmtMoney(oSub(o))}</span></td>
      <td data-label="${t('o.fee')}" class="end"><span class="num">${fmtMoney(oFee(o))}</span></td>
      <td data-label="${t('o.grand')}" class="end"><b class="num">${fmtMoney(oTotal(o))}</b></td>
      <td data-label="${t('o.payment')}">${esc(oPay(o))}</td>
      <td class="act-col"><div class="row-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-o="print1" aria-label="${t('print')}">${icon('printer')}</button>
        <button class="btn-icon sm" data-o="pdf" aria-label="${t('o.pdf')}">${icon('download')}</button>
        <button class="btn-icon sm" data-o="edit" aria-label="${t('edit')}" ${c ? 'disabled' : ''}>${icon('pencil')}</button>
      </div></td></tr>`;
  }

  function draw() {
    const body = $('#oBody', view); if (!body) return;
    if (!LIVE.loaded(OR_PATHS)) { setHtml(body, skeletonRows(6, 14)); $('#oK', view).innerHTML = skeletonKpis(); return; }
    const all = sortedOrders();
    // Ticked orders removed elsewhere drop out
    const orders = LIVE.cache.orders || {};
    [...st.sel].forEach(id => { if (!orders[id]) st.sel.delete(id); });
    const list = all.filter(x => matches(x.o));
    const live = list.filter(x => !oCancelled(x.o));
    setKpis($('#oK', view), [
      kpiCard({ label: t('o.kCount'), value: live.length, ic: 'receipt', tone: 'c1' }),
      kpiCard({ label: t('o.net'), value: live.reduce((s, x) => s + oSub(x.o), 0), kind: 'money', ic: 'wallet', tone: 'c2', drill: 'net' }),
      kpiCard({ label: t('o.fee'), value: live.reduce((s, x) => s + oFee(x.o), 0), kind: 'money', ic: 'bike', tone: 'c3', drill: 'fee' }),
      kpiCard({ label: t('o.grand'), value: live.reduce((s, x) => s + oTotal(x.o), 0), kind: 'money', ic: 'chart', tone: 'c4', drill: 'grand' })
    ].join(''), first);
    setHtml($('#oBranch', view), `<option value="all">${t('allBranches')}</option>` + optsHtml(sortedOpts(LIVE.cache.branches), st.branch));
    setHtml($('#oCashier', view), `<option value="all">${t('o.allCashiers')}</option>` + optsHtml(Object.entries(LIVE.cache.cashiers || {}).map(([id, c]) => [id, (c && (c.name || c.code)) || id]), st.cashier));
    setHtml($('#oType', view), `<option value="all">${t('o.allTypes')}</option>` + optsHtml(sortedOpts(LIVE.cache.orderTypes), st.type));
    zones.paint();
    // One day selected: show invoices created that day but moved to a later accounting day
    const day = st.from && st.from === st.to ? st.from : '';
    const deferred = day ? all.filter(x => x.o.isInvoiceDeferred && inRange(createdSort(x.id, x.o), day, day)) : [];
    setHtml($('#oDeferred', view), deferred.length ? `<section class="card defer-card"><div class="defer-head">${icon('clock')}<b>${t('o.deferred')}</b><em>${deferred.length}</em><small>${t('o.deferredSub')}</small></div>
      <div class="defer-list">${deferred.map(x => `<span class="item-chip"><b class="mono">#${esc(oNum(x.o))}</b><small>${esc(x.o.accountingDate || '')}</small></span>`).join('')}</div></section>` : '');
    setHtml($('#oPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    pageIds = slice.map(x => x.id);
    const filtering = st.q || st.from || st.to || st.branch !== 'all' || st.cashier !== 'all' || st.type !== 'all' || st.zones.length;
    setHtml(body, slice.length ? slice.map(row).join('') : `<tr class="empty"><td colspan="14"><div class="empty-state">${icon(filtering ? 'search' : 'receipt')}<b>${t(filtering ? 'emptyTitle' : 'o.none')}</b><small>${t(filtering ? 'emptySub' : 'o.noneSub')}</small></div></td></tr>`);
    selectionBits(view, st, pageIds);
    first = false;
  }

  function exportOrders() {
    const rows = chosen().slice().sort((a, b) => oTime(a.o) - oTime(b.o)).map(({ o }) => ({
      [t('o.number')]: oNum(o), [t('o.status')]: oCancelled(o) ? t('o.cancelled') : t('o.active'), [t('o.cancelledByCol')]: o.cancelledByName || '', [t('o.cancelledAt')]: o.cancelledAt ? fmtDateTime(o.cancelledAt) : '',
      [t('o.customer')]: oCustName(o), [t('o.zone')]: oZone(o), [t('c.phone')]: oPhone(o), [t('c.date')]: fmtDateTime(oTime(o)), [t('o.payment')]: oPay(o), [t('o.cashier')]: oCashier(o),
      [t('o.branch')]: oBranch(o), [t('o.type')]: oType(o), [t('o.net')]: +oSub(o).toFixed(3), [t('o.fee')]: +oFee(o).toFixed(3), [t('o.grand')]: +oTotal(o).toFixed(3) }));
    excelOut(rows, 'orders-report.xlsx');
  }
  function printOrders() {
    const list = chosen().slice().sort((a, b) => oTime(a.o) - oTime(b.o));
    if (!list.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
    const tot = list.reduce((a, { o }) => ({ net: a.net + oSub(o), fee: a.fee + oFee(o), all: a.all + oTotal(o) }), { net: 0, fee: 0, all: 0 });
    printDoc(t('orders'), [[t('c.from'), st.from || '-'], [t('c.to'), st.to || '-'], [t('o.kCount'), String(list.length)]],
      [t('o.number'), t('o.customer'), t('c.phone'), t('o.zone'), t('o.branch'), t('o.cashier'), t('o.type'), t('o.net'), t('o.fee'), t('o.grand'), t('c.date')],
      list.map(({ o }) => [[oNum(o), oCancelText(o)].filter(Boolean).join(' — '), oCustName(o), oPhone(o), oZone(o), oBranch(o), oCashier(o), oType(o), moneyPlain(oSub(o)), moneyPlain(oFee(o)), moneyPlain(oTotal(o)), fmtDateTime(oTime(o))]),
      [[t('o.net'), moneyPlain(tot.net)], [t('o.fee'), moneyPlain(tot.fee)], [t('o.grand'), moneyPlain(tot.all)]]);
  }

  /* Orders of one customer (the old page's customer pop-up) */
  function customerOrders(customerId) {
    const c = (LIVE.cache.customers || {})[customerId];
    const list = Object.entries(LIVE.cache.orders || {}).map(([id, o]) => ({ id, o })).filter(x => x.o && oCustId(x.o) === customerId).sort((a, b) => (b.o.createdAt || 0) - (a.o.createdAt || 0));
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('user')}</span><div><h2 id="drawerTitle">${esc(nameOf(c) || oCustName(list[0] ? list[0].o : {}))}</h2><p>${esc((c && c.phone) || '')} · ${list.length} ${t('o.ordersWord')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body"><div class="dr-items"><table class="dt compact"><thead><tr><th>${t('o.number')}</th><th>${t('c.date')}</th><th class="end">${t('o.grand')}</th><th>${t('o.branch')}</th><th>${t('o.cashier')}</th></tr></thead>
        <tbody>${list.length ? list.map(({ o }) => `<tr class="${oCancelled(o) ? 'is-cancelled' : ''}"><td data-label="${t('o.number')}"><span class="cell-2"><b class="mono">#${esc(oNum(o))}</b>${oCancelled(o) ? `<small class="cancel-note">${esc(oCancelText(o))}</small>` : ''}</span></td>
          <td data-label="${t('c.date')}">${fmtDateTime(o.createdAt)}</td><td data-label="${t('o.grand')}" class="end num">${fmtMoney(Number(o.total || 0))}</td><td data-label="${t('o.branch')}">${esc(oBranch(o))}</td><td data-label="${t('o.cashier')}">${esc(oCashier(o))}</td></tr>`).join('')
        : `<tr class="empty"><td colspan="5"><div class="empty-state">${icon('receipt')}<b>${t('o.none')}</b></div></td></tr>`}</tbody></table></div></div>`;
    openLayer('#drawer');
  }

  /* ---------- edit invoice ----------
     As the old page: customer name/phone/address, delivery fee, deferral,
     discount and the items; saved through a transaction that refuses a cancelled invoice. */
  function openEdit(id) {
    if (!afterCatalog(['products'], () => openEdit(id))) return;
    const orig = (LIVE.cache.orders || {})[id];
    if (!orig) return;
    if (oCancelled(orig)) { toast(oCancelText(orig), { tone: 'danger', ic: 'alert' }); return; }
    const d = { items: oItems(orig).map(it => ({ ...it, notes: it.notes || it.note || '' })), pick: null };
    const dDisc = orig.discountType || (oDiscount(orig) > 0 ? 'fixed' : 'none');
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('pencil')}</span><div><h2 id="drawerTitle">${t('o.editTitle')} #${esc(oNum(orig))}</h2><p>${esc(oBranch(orig))} · ${fmtDateTime(oTime(orig))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body it-form" id="eForm" novalidate>
        <section class="ed-sec"><h3>${t('o.custInfo')}</h3>
          <div class="form-grid">
            <div class="field"><label for="eName">${t('o.customer')}</label><input id="eName" value="${esc(oCustName(orig) === '-' ? '' : oCustName(orig))}" autocomplete="off"></div>
            <div class="field"><label for="ePhone">${t('c.phone')}</label><input id="ePhone" dir="ltr" inputmode="tel" value="${esc(oPhone(orig) === '-' ? '' : oPhone(orig))}" autocomplete="off"></div>
            <div class="field"><label for="eAddr">${t('o.address')}</label><input id="eAddr" value="${esc(orig.address || '')}" autocomplete="off"></div>
            <div class="field"><label for="eFee">${t('o.fee')}</label><input id="eFee" type="number" step="0.001" min="0" dir="ltr" value="${oFee(orig).toFixed(3)}"></div>
          </div>
          <div class="def-wrap"><label class="check-line"><input type="checkbox" id="eDefer" ${orig.isInvoiceDeferred && orig.accountingDate ? 'checked' : ''}> ${t('o.defer')}</label>
            <div class="field${orig.isInvoiceDeferred && orig.accountingDate ? '' : ' hidden'}" id="eDeferWrap"><label for="eDeferDate">${t('o.deferDate')}</label><input type="date" id="eDeferDate" value="${esc(orig.accountingDate || orig.deliveryDate || '')}"><small class="err"></small></div></div>
        </section>
        <section class="ed-sec"><h3>${t('o.discount')}</h3>
          <div class="form-grid">
            <div class="field"><label for="eDiscType">${t('o.discType')}</label><div class="select"><select id="eDiscType">${['none', 'percent', 'fixed'].map(k => `<option value="${k}" ${dDisc === k ? 'selected' : ''}>${t('o.disc.' + k)}</option>`).join('')}</select>${icon('chevDown')}</div></div>
            <div class="field"><label for="eDiscVal">${t('o.discValue')}</label><input id="eDiscVal" inputmode="decimal" dir="ltr" value="${esc(orig.discountValue || oDiscount(orig) || '')}" placeholder="30" autocomplete="off"></div>
          </div>
        </section>
        <section class="ed-sec"><h3>${t('products')}</h3>
          <div id="eLines"></div>
          <div class="ed-add">
            <label class="search-field">${icon('search')}<input type="search" id="eQ" placeholder="${t('o.findProduct')}" autocomplete="off"></label>
            <div class="ed-results" id="eRes"></div>
            <div class="ed-add-row"><span class="muted" id="ePicked">${t('o.pickFirst')}</span><span class="tb-spacer"></span>
              <input id="eQty" type="number" min="0.001" step="any" value="1" dir="ltr" class="qty-in" aria-label="${t('c.qty')}">
              <button type="button" class="btn btn-soft" id="eAdd" disabled>${icon('plus')}<span>${t('o.addItem')}</span></button></div>
          </div>
          <div class="ed-totals" id="eTot"></div>
          <small class="err" id="eErr"></small>
        </section>
      </form>
      <footer class="dr-foot"><button class="btn btn-danger" id="eCancelInv">${icon('x')}<span>${t('o.cancelInvoice')}</span></button><span class="tb-spacer"></span>
        <button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="eSave">${icon('check')}<span>${t('save')}</span></button></footer>`;
    openLayer('#drawer');

    const r3 = n => Number(Number(n || 0).toFixed(3));
    function calc() {
      const subtotal = r3(d.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0));
      const type = $('#eDiscType', dr).value, val = Number(toLatin($('#eDiscVal', dr).value)) || 0;
      const want = type === 'percent' ? r3(subtotal * val / 100) : type === 'fixed' ? r3(val) : 0;
      // A discount can't make the invoice negative
      const discount = Math.min(Math.max(want, 0), subtotal), net = Math.max(subtotal - discount, 0);
      const fee = Number($('#eFee', dr).value) || 0;
      return { subtotal, discount, net, fee, total: r3(net + fee), type, val };
    }
    function paintTotals() {
      const c = calc();
      $('#eTot', dr).innerHTML = `<div><span>${t('o.beforeDisc')}</span><b>${fmtMoney(c.subtotal)}</b></div>${c.discount > 0 ? `<div class="neg"><span>${t('o.discount')}</span><b>-${fmtMoney(c.discount)}</b></div>` : ''}${c.fee > 0 ? `<div><span>${t('o.fee')}</span><b>${fmtMoney(c.fee)}</b></div>` : ''}<div class="grand"><span>${t('o.grand')}</span><b>${fmtMoney(c.total)}</b></div>`;
    }
    function paintLines() {
      $('#eLines', dr).innerHTML = d.items.length ? `<div class="ed-line ed-head"><span>${t('o.product')}</span><span>${t('c.qty')}</span><span>${t('o.unit')}</span><span>${t('o.price')}</span><span>${t('c.total')}</span><span></span></div>` + d.items.map((it, i) => `
        <div class="ed-line" data-i="${i}"><span class="cell-2"><b>${esc(it.productName)}</b>${it.productNameEn ? `<small>${esc(it.productNameEn)}</small>` : ''}</span>
          <input data-f="quantity" type="number" min="0.001" step="0.001" dir="ltr" value="${esc(it.quantity)}" aria-label="${t('c.qty')}">
          <input data-f="unit" value="${esc(it.unit || 'حبة')}" aria-label="${t('o.unit')}">
          <input data-f="price" type="number" min="0" step="0.001" dir="ltr" value="${esc(it.price)}" aria-label="${t('o.price')}">
          <b class="num" data-tot>${fmtMoney(r3(it.quantity * it.price))}</b>
          <button type="button" class="chip-x" data-rm aria-label="${t('delete')}">${icon('x')}</button>
          <textarea data-f="notes" rows="1" placeholder="${t('o.itemNote')}">${esc(it.notes || '')}</textarea></div>`).join('')
        : `<p class="muted pc-hint">${icon('info')}${t('o.noItems')}</p>`;
      paintTotals();
    }
    paintLines();
    dr.oninput = e => {
      const f = e.target.dataset.f, line = e.target.closest('.ed-line[data-i]');
      if (f && line) {
        const it = d.items[+line.dataset.i];
        if (f === 'quantity' || f === 'price') { it[f] = Number(e.target.value) || 0; if (f === 'quantity') it.qty = it.quantity; $('[data-tot]', line).innerHTML = fmtMoney(r3(it.quantity * it.price)); paintTotals(); }
        else it[f] = e.target.value;
        return;
      }
      if (['eFee', 'eDiscVal', 'eDiscType'].includes(e.target.id)) paintTotals();
      if (e.target.id === 'eQ') search(e.target.value);
    };
    $('#eDiscType', dr).addEventListener('change', paintTotals);
    $('#eDefer', dr).addEventListener('change', e => $('#eDeferWrap', dr).classList.toggle('hidden', !e.target.checked));
    dr.onclick = e => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { d.items.splice(+rm.closest('.ed-line').dataset.i, 1); paintLines(); return; }
      const p = e.target.closest('[data-pick]');
      if (p) { pickProduct(p.dataset.pick); return; }
    };
    function search(v) {
      const q = normQ(v); d.pick = null; $('#eAdd', dr).disabled = true; $('#ePicked', dr).textContent = t('o.pickFirst');
      if (!q) { $('#eRes', dr).innerHTML = ''; return; }
      const hits = Object.entries(LIVE.cache.products || {}).filter(([, p]) => p && normQ([p.nameAr, p.nameEn, p.name, p.code, p.barcode].filter(Boolean).join(' ')).includes(q)).slice(0, 30);
      $('#eRes', dr).innerHTML = hits.length ? hits.map(([pid, p]) => `<button type="button" class="ed-hit" data-pick="${esc(pid)}"><span class="cell-2"><b>${esc(p.nameAr || p.name || nameOf(p))}</b><small>${esc([p.nameEn, p.code || p.barcode].filter(Boolean).join(' · '))}</small></span><span class="num">${fmtMoney(Number(p.price || 0))}</span></button>`).join('')
        : `<p class="muted pc-hint">${icon('search')}${t('emptyTitle')}</p>`;
    }
    function pickProduct(pid) {
      const p = (LIVE.cache.products || {})[pid]; if (!p) return;
      d.pick = pid; $('#eRes', dr).innerHTML = ''; $('#eQ', dr).value = p.nameAr || p.name || nameOf(p);
      $('#ePicked', dr).innerHTML = `${t('o.picked')} <b>${esc(p.nameAr || p.name || nameOf(p))}</b>`;
      $('#eAdd', dr).disabled = false; $('#eQty', dr).select();
    }
    const addPicked = () => {
      const p = (LIVE.cache.products || {})[d.pick]; if (!p) return;
      const q = Number($('#eQty', dr).value) > 0 ? Number($('#eQty', dr).value) : 1;
      const ex = d.items.find(it => it.productId === d.pick);
      if (ex) { ex.quantity = ex.qty = (Number(ex.quantity) || 0) + q; ex.total = r3(ex.quantity * ex.price); }
      else d.items.push({ productId: d.pick, productName: p.nameAr || p.name || nameOf(p), productNameEn: p.nameEn || '', name: p.nameAr || p.name || nameOf(p), price: Number(p.price || 0), quantity: q, qty: q, unit: p.unit || 'حبة', notes: '', total: r3(Number(p.price || 0) * q) });
      $('#eQty', dr).value = 1; $('#eQ', dr).value = ''; search('');
      paintLines();
      $('#eQ', dr).focus();
    };
    $('#eAdd', dr).addEventListener('click', addPicked);
    $('#eQty', dr).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (d.pick) addPicked(); } });
    $('#eQ', dr).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const h = $('[data-pick]', dr); h && pickProduct(h.dataset.pick); } });

    const save = async e => {
      e && e.preventDefault();
      if (saving) return;
      $('#eErr', dr).textContent = '';
      const items = d.items.filter(it => Number(it.quantity) > 0).map(it => {
        const quantity = Number(it.quantity), price = Number(it.price || 0), total = r3(quantity * price);
        const nm = it.productName || it.name || it.productId || '-';
        return clean({ ...it, productName: nm, productNameEn: it.productNameEn || '', name: nm, quantity, qty: quantity, price, unit: it.unit || 'حبة', grossTotal: total, total });
      });
      if (!items.length) { $('#eErr', dr).textContent = t('o.emptyCart'); return; }
      const deferOn = $('#eDefer', dr).checked, deferDate = $('#eDeferDate', dr).value;
      if (deferOn && !deferDate) { const f = $('#eDeferWrap', dr); f.classList.add('invalid'); $('.err', f).textContent = t('o.pickDeferDate'); return; }
      const c = calc();
      const nameIn = $('#eName', dr).value.trim(), phone = toLatin($('#ePhone', dr).value.trim());
      const customerName = nameIn || orig.customerName || orig.name || null;
      const payload = {
        items, subTotal: c.net, subtotal: c.subtotal, discount: c.discount, discountType: c.type, discountValue: c.val, discountAmount: c.discount, discountTotal: c.discount,
        itemsGrossTotal: c.subtotal, itemsNetTotal: c.net, netTotal: c.net, deliveryPrice: c.fee, deliveryFee: c.fee, total: c.total,
        customerName, name: customerName, customerPhone: phone || null, phoneNumber: phone || null, phone: phone || null,
        address: $('#eAddr', dr).value.trim(), accountingDate: deferOn ? deferDate : '', isInvoiceDeferred: deferOn, updatedAt: Date.now()
      };
      const btn = $('#eSave', dr); saving = true; btn.classList.add('loading');
      try {
        const res = await LIVE.transaction(`orders/${id}`, cur => (!cur || oCancelled(cur) ? undefined : { ...cur, ...payload }));
        if (!res.committed) throw Object.assign(new Error(''), { refused: true });
        toast(t('saved')); closeLayers();
      } catch (ex) { $('#eErr', dr).textContent = ex.refused ? t('o.cantEditCancelled') : t('pm.saveFailed'); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#eForm', dr).addEventListener('submit', save);
    $('#eSave', dr).addEventListener('click', save);
    $('#eCancelInv', dr).addEventListener('click', () => cancelInvoice(id));
  }

  /* Cancel: the invoice stays in the ledger with who cancelled it and when;
     stock the cashier deducted goes back (same steps as the old page). */
  async function cancelInvoice(id) {
    const o = (LIVE.cache.orders || {})[id]; if (!o) return;
    const ok = await confirmDialog({ title: t('o.cancelQ'), body: `<div class="cf-sum"><div><small>${t('o.number')}</small><b class="mono">#${esc(oNum(o))}</b></div><div><small>${t('o.grand')}</small><b>${fmtMoney(oTotal(o))}</b></div></div><p class="cf-note">${t('o.cancelNote')}</p>`, ok: t('o.cancelInvoice'), tone: 'danger', icon: 'x' });
    if (!ok) return;
    const actor = me();
    if (!actor || !actor.name || actor.name === '-') { toast(t('o.needLogin'), { tone: 'danger', ic: 'alert' }); return; }
    const stamp = at => ({ status: 'cancelled', isCancelled: true, cancelledAt: at, cancelledByName: actor.name, cancelledById: actor.id || '', cancelledByCode: '', updatedAt: at });
    try {
      const original = await LIVE.read(`orders/${id}`);
      if (original && original.stockDeducted && original.stockMovements) {
        if (oCancelled(original)) throw new Error(t('o.alreadyCancelled'));
        let done = false;
        for (let attempt = 0; attempt < 16 && !done; attempt++) {
          const cur = await LIVE.read(`orders/${id}`);
          if (!cur || oCancelled(cur)) throw new Error(t('o.alreadyCancelled'));
          const at = Date.now(), up = { [`orders/${id}`]: { ...cur, ...stamp(at), stockRestored: true } };
          for (const [pid, mv] of Object.entries(cur.stockMovements)) {
            const path = `products/${pid}/stockByBranch/${mv.branchId}`;
            const before = Number((await LIVE.read(path)) || 0), after = Number((before + Number(mv.quantity || 0)).toFixed(6));
            up[path] = after;
            up[`invoiceStockCancellations/${id}/${pid}`] = { branchId: mv.branchId, before, after, quantity: mv.quantity };
          }
          try { await LIVE.update(up); done = true; }
          catch (err) { const w = await LIVE.read(`orders/${id}`); if (oCancelled(w)) done = true; else if (attempt === 15) throw err; }
        }
      } else {
        const res = await LIVE.transaction(`orders/${id}`, cur => (!cur || oCancelled(cur) ? undefined : { ...cur, ...stamp(Date.now()) }));
        if (!res.committed) throw new Error(t('o.alreadyCancelled'));
      }
      toast(t('o.cancelledOk'), { tone: 'danger' }); closeLayers();
    } catch (e) { toast(e.message || t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- events ---------- */
  let deb;
  $('#oQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 150); });
  [['#oFrom', 'from'], ['#oTo', 'to'], ['#oBranch', 'branch'], ['#oCashier', 'cashier'], ['#oType', 'type']].forEach(([sel, k]) => $(sel, view).addEventListener('change', e => { st[k] = e.target.value; st.page = 1; draw(); }));
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  bindSelection(view, st, () => pageIds, () => selectionBits(view, st, pageIds));
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-o]'); if (!b || b.disabled) return;
    const a = b.dataset.o;
    if (a === 'export') return allLoaded() && exportOrders();
    if (a === 'print') return allLoaded() && printOrders();
    const id = b.closest('tr') && b.closest('tr').dataset.id, o = id && (LIVE.cache.orders || {})[id]; if (!o) return;
    if (a === 'print1' || a === 'pdf') return printInvoice(o);
    if (a === 'edit') return openEdit(id);
    if (a === 'customer') return customerOrders(oCustId(o));
  });

  const unsub = LIVE.watch([...OR_PATHS, 'products'], draw);
  draw();
  // Card pages: the same filtered, non-cancelled orders the cards add up, broken down
  const closeDrill = kpiDrills(view, { paths: OR_PATHS, ready: () => LIVE.loaded(OR_PATHS), build: kind => {
    const live = sortedOrders().filter(x => matches(x.o) && !oCancelled(x.o)).map(x => x.o);
    const sub = t('kd.filtered');
    if (kind === 'net') return { ...kdBreakdown({ title: `${t('o.net')} ${t('kd.byBranch')}`, sub, ic: 'wallet', file: 'orders-net-by-branch.xlsx', groupH: t('kd.branch'), countH: t('kd.orders'), valueH: t('o.net'),
      items: kdGroup(live, o => o.branchId || oBranch(o), oBranch, oSub) }), onRow: id => { if (LIVE.cache.branches && LIVE.cache.branches[id]) { st.branch = id; st.page = 1; closeDrill(); draw(); } } };
    if (kind === 'fee') return kdBreakdown({ title: `${t('o.fee')} ${t('kd.byArea')}`, sub, ic: 'bike', file: 'orders-delivery-by-area.xlsx', groupH: t('kd.area'), countH: t('kd.orders'), valueH: t('o.fee'),
      items: kdGroup(live.filter(o => oFee(o) > 0), oZone, oZone, oFee) });
    if (kind === 'grand') return kdBreakdown({ title: `${t('o.grand')} ${t('kd.byPay')}`, sub, ic: 'chart', file: 'orders-total-by-payment.xlsx', groupH: t('kd.pay'), countH: t('kd.orders'), valueH: t('o.grand'),
      items: kdGroup(live, oPay, oPay, oTotal) });
    return null;
  } });
  return () => { unsub(); closeDrill(); zones.destroy(); freshDrawer(false); };
};

/* =====================================================================
   طلبات الأونلاين — read from the platform server every minute (as the old page)
   ===================================================================== */
const OO = { rows: {}, loaded: false, error: null, timer: 0, busy: false, subs: new Set() };
async function refreshOnline() {
  if (OO.busy) return;
  OO.busy = true;
  try {
    const rows = await LIVE.platform('/accounting/online-orders');
    OO.rows = Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => r && r.rawOrder).filter(o => o && o.orderId).map(o => [String(o.orderId), o]));
    OO.error = null;
  } catch (e) { OO.error = e.status === 401 || e.status === 403 ? 'denied' : 'network'; }
  OO.loaded = true; OO.busy = false;
  OO.subs.forEach(fn => fn());
}
const ooCatalog = o => (o && o.catalogType === 'restaurant' ? 'restaurant' : /^R/i.test(String(oNum(o))) ? 'restaurant' : 'bakery');
const OO_PATHS = ['branches', 'deliveryZones', 'orderTypes', 'paymentMethods', 'customers'];

PAGES['online-orders'] = view => {
  const st = (S.oo ||= { q: '', from: '', to: '', branch: 'all', catalog: 'all', type: 'all', per: 10, page: 1, sel: new Set() });
  let first = true, pageIds = [];
  view.innerHTML = `
    ${pageHeader('online-orders', `<button class="btn btn-ghost" data-oo="refresh">${icon('refresh')}<span>${t('oo.refresh')}</span></button>
      <button class="btn btn-ghost" data-oo="print">${icon('printer')}<span>${t('o.printReport')}</span><em class="sel-n"></em></button>
      <button class="btn btn-primary" data-oo="export">${icon('download')}<span>${t('o.download')}</span><em class="sel-n"></em></button>`, t('oo.sub'))}
    <section class="kpis" id="ooK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="ooQ" placeholder="${t('o.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <label class="date-field"><small>${t('c.from')}</small><input type="date" id="ooFrom" value="${st.from}"></label>
        <label class="date-field"><small>${t('c.to')}</small><input type="date" id="ooTo" value="${st.to}"></label>
        <div class="select tb-select"><select id="ooBranch" aria-label="${t('c.branch')}"></select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="ooCat" aria-label="${t('oo.catalog')}">${['all', 'bakery', 'restaurant'].map(k => `<option value="${k}" ${st.catalog === k ? 'selected' : ''}>${t('oo.cat.' + k)}</option>`).join('')}</select>${icon('chevDown')}</div>
        <div class="select tb-select"><select id="ooType" aria-label="${t('o.type')}">${[['all', 'o.allTypes'], ['delivery', 'o.delivery'], ['pickup', 'o.pickup']].map(([k, l]) => `<option value="${k}" ${st.type === k ? 'selected' : ''}>${t(l)}</option>`).join('')}</select>${icon('chevDown')}</div>
        ${perHtml(st)}
      </div>
      <div id="ooErr"></div>
      <div class="table-wrap"><table class="dt it-table o-table">
        <thead><tr><th class="sel-col"><input type="checkbox" id="sAll" aria-label="${t('it.selectAll')}"></th><th>${t('o.number')}</th><th>${t('o.customer')}</th><th>${t('o.zone')}</th><th>${t('c.phone')}</th><th>${t('c.date')}</th><th>${t('o.branch')}</th><th>${t('oo.catalog')}</th><th>${t('o.type')}</th><th class="end">${t('o.net')}</th><th class="end">${t('o.fee')}</th><th class="end">${t('o.grand')}</th><th>${t('o.payment')}</th><th class="act-col"></th></tr></thead>
        <tbody id="ooBody"></tbody></table></div>
      <footer class="pager" id="ooPager"></footer>
    </section>`;

  const all = () => Object.entries(OO.rows).map(([id, o]) => ({ id, o: { ...o, orderId: o.orderId || id } })).sort((a, b) => oTime(b.o) - oTime(a.o));
  const matches = o => (st.branch === 'all' || String(o.branchId || '') === st.branch)
    && (st.catalog === 'all' || ooCatalog(o) === st.catalog)
    && (st.type === 'all' || String(o.mode || o.orderType || '').toLowerCase() === st.type)
    && (!st.from || oTime(o) >= dayStart(st.from)) && (!st.to || oTime(o) <= dayEnd(st.to))
    && (!st.q || oText(o).includes(normQ(st.q)));
  const filteredList = () => all().filter(x => matches(x.o));
  const chosen = () => { const f = filteredList(); return st.sel.size ? f.filter(x => st.sel.has(x.id)) : f; };
  const catBadge = o => `<span class="badge tone-${ooCatalog(o) === 'restaurant' ? 'accent' : 'info'}">${t('oo.cat.' + ooCatalog(o))}</span>`;

  function draw() {
    const body = $('#ooBody', view); if (!body) return;
    if (!OO.loaded || !LIVE.loaded(OO_PATHS)) { setHtml(body, skeletonRows(6, 14)); $('#ooK', view).innerHTML = skeletonKpis(); return; }
    setHtml($('#ooErr', view), OO.error ? `<p class="note-box warn-box">${icon('alert')}<span>${t(OO.error === 'denied' ? 'oo.denied' : 'oo.offline')}</span></p>` : '');
    const rows = all();
    [...st.sel].forEach(id => { if (!OO.rows[id]) st.sel.delete(id); });
    const list = rows.filter(x => matches(x.o)), live = list.filter(x => !oCancelled(x.o));
    setKpis($('#ooK', view), [
      kpiCard({ label: t('o.kCount'), value: live.length, ic: 'bag', tone: 'c1' }),
      kpiCard({ label: t('oo.kDelivery'), value: live.filter(x => String(x.o.mode || x.o.orderType || '').toLowerCase() === 'delivery').length, ic: 'bike', tone: 'c3', drill: 'delivery' }),
      kpiCard({ label: t('o.fee'), value: live.reduce((s, x) => s + oFee(x.o), 0), kind: 'money', ic: 'wallet', tone: 'c2', drill: 'fee' }),
      kpiCard({ label: t('o.grand'), value: live.reduce((s, x) => s + oTotal(x.o), 0), kind: 'money', ic: 'chart', tone: 'c4', drill: 'grand' })
    ].join(''), first);
    const branchIds = [...new Set(rows.map(x => String(x.o.branchId || '')).filter(Boolean))];
    setHtml($('#ooBranch', view), `<option value="all">${t('allBranches')}</option>` + branchIds.map(id => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(oBranch({ branchId: id }))}</option>`).join(''));
    setHtml($('#ooPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    pageIds = slice.map(x => x.id);
    const filtering = st.q || st.from || st.to || st.branch !== 'all' || st.catalog !== 'all' || st.type !== 'all';
    setHtml(body, slice.length ? slice.map((x, i) => {
      const o = x.o, c = oCancelled(o);
      return `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}${c ? ' is-cancelled' : ''}" style="--r:${i}">
        <td class="sel-col"><input type="checkbox" data-sel ${st.sel.has(x.id) ? 'checked' : ''} aria-label="${esc(oNum(o))}"></td>
        <td data-label="${t('o.number')}"><span class="cell-2"><b class="mono">#${esc(oNum(o))}</b>${c ? `<small class="cancel-note">${esc(oCancelText(o))}</small>` : ''}</span></td>
        <td data-label="${t('o.customer')}">${esc(oCustName(o))}</td>
        <td data-label="${t('o.zone')}">${esc(oZone(o))}</td>
        <td data-label="${t('c.phone')}"><span class="mono">${esc(oPhone(o))}</span></td>
        <td data-label="${t('c.date')}"><span class="date">${fmtDateTime(oTime(o))}</span></td>
        <td data-label="${t('o.branch')}">${esc(oBranch(o))}</td>
        <td data-label="${t('oo.catalog')}">${catBadge(o)}</td>
        <td data-label="${t('o.type')}">${esc(oType(o))}</td>
        <td data-label="${t('o.net')}" class="end"><span class="num">${fmtMoney(oSub(o))}</span></td>
        <td data-label="${t('o.fee')}" class="end"><span class="num">${fmtMoney(oFee(o))}</span></td>
        <td data-label="${t('o.grand')}" class="end"><b class="num">${fmtMoney(oTotal(o))}</b></td>
        <td data-label="${t('o.payment')}">${esc(oPay(o))}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-oo="print1" aria-label="${t('print')}">${icon('printer')}</button>
          <button class="btn-icon sm" data-oo="pdf" aria-label="${t('o.pdf')}">${icon('download')}</button>
        </div></td></tr>`;
    }).join('') : `<tr class="empty"><td colspan="14"><div class="empty-state">${icon(filtering ? 'search' : 'bag')}<b>${t(filtering ? 'emptyTitle' : 'oo.none')}</b><small>${t(filtering ? 'emptySub' : 'oo.noneSub')}</small></div></td></tr>`);
    selectionBits(view, st, pageIds);
    first = false;
  }

  const catLabel = () => t('oo.cat.' + st.catalog);
  function exportRows() {
    const rows = chosen().map(({ o }) => ({
      [t('o.number')]: oNum(o), [t('o.status')]: oCancelled(o) ? t('o.cancelled') : t('o.active'), [t('o.cancelledByCol')]: o.cancelledByName || '', [t('o.cancelledAt')]: o.cancelledAt ? fmtDateTime(o.cancelledAt) : '',
      [t('o.customer')]: oCustName(o), [t('o.zone')]: oZone(o), [t('c.phone')]: oPhone(o), [t('c.date')]: fmtDateTime(oTime(o)), [t('o.branch')]: oBranch(o), [t('oo.catalog')]: t('oo.cat.' + ooCatalog(o)),
      [t('o.type')]: oType(o), [t('o.net')]: +oSub(o).toFixed(3), [t('o.fee')]: +oFee(o).toFixed(3), [t('o.grand')]: +oTotal(o).toFixed(3), [t('o.payment')]: oPay(o) }));
    excelOut(rows, 'online-orders-report.xlsx');
  }
  function printRows() {
    const list = chosen();
    if (!list.length) { toast(t('o.nothingToExport'), { tone: 'danger', ic: 'alert' }); return; }
    const tot = list.reduce((a, { o }) => ({ net: a.net + oSub(o), fee: a.fee + oFee(o), all: a.all + oTotal(o) }), { net: 0, fee: 0, all: 0 });
    printDoc(t('online-orders'), [[t('c.from'), st.from || '-'], [t('c.to'), st.to || '-'], [t('oo.catalog'), catLabel()]],
      [t('o.number'), t('o.customer'), t('c.phone'), t('o.zone'), t('o.branch'), t('oo.catalog'), t('o.type'), t('o.net'), t('o.fee'), t('o.grand'), t('c.date')],
      list.map(({ o }) => [oNum(o), oCustName(o), oPhone(o), oZone(o), oBranch(o), t('oo.cat.' + ooCatalog(o)), oType(o), moneyPlain(oSub(o)), moneyPlain(oFee(o)), moneyPlain(oTotal(o)), fmtDateTime(oTime(o))]),
      [[t('o.net'), moneyPlain(tot.net)], [t('o.fee'), moneyPlain(tot.fee)], [t('o.grand'), moneyPlain(tot.all)]]);
  }

  let deb;
  $('#ooQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 150); });
  [['#ooFrom', 'from'], ['#ooTo', 'to'], ['#ooBranch', 'branch'], ['#ooCat', 'catalog'], ['#ooType', 'type']].forEach(([sel, k]) => $(sel, view).addEventListener('change', e => { st[k] = e.target.value; st.page = 1; draw(); }));
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  bindSelection(view, st, () => pageIds, () => selectionBits(view, st, pageIds));
  view.addEventListener('click', async e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-oo]'); if (!b || b.disabled) return;
    const a = b.dataset.oo;
    if (a === 'export') return exportRows();
    if (a === 'print') return printRows();
    if (a === 'refresh') { b.classList.add('loading'); await refreshOnline(); b.classList.remove('loading'); toast(t('oo.refreshed')); return; }
    const id = b.closest('tr') && b.closest('tr').dataset.id, o = id && OO.rows[id];
    if (o && (a === 'print1' || a === 'pdf')) printInvoice(o);
  });

  OO.subs.add(draw);
  if (!OO.loaded) refreshOnline(); else draw();
  clearInterval(OO.timer); OO.timer = setInterval(refreshOnline, 60000);
  const unsub = LIVE.watch(OO_PATHS, draw);
  draw();
  const closeDrill = kpiDrills(view, { paths: OO_PATHS, ready: () => OO.loaded && LIVE.loaded(OO_PATHS), build: kind => {
    const live = filteredList().filter(x => !oCancelled(x.o)).map(x => x.o), sub = t('kd.filtered');
    if (kind === 'delivery') return { ...kdOrders({ title: t('oo.kDelivery'), sub, ic: 'bike', file: 'online-delivery-orders.xlsx', list: live.filter(o => String(o.mode || o.orderType || '').toLowerCase() === 'delivery') }), onRow: null };
    if (kind === 'fee') return kdBreakdown({ title: `${t('o.fee')} ${t('kd.byArea')}`, sub, ic: 'wallet', file: 'online-delivery-by-area.xlsx', groupH: t('kd.area'), countH: t('kd.orders'), valueH: t('o.fee'),
      items: kdGroup(live.filter(o => oFee(o) > 0), oZone, oZone, oFee) });
    if (kind === 'grand') return kdBreakdown({ title: `${t('o.grand')} ${t('kd.byBranch')}`, sub, ic: 'chart', file: 'online-total-by-branch.xlsx', groupH: t('kd.branch'), countH: t('kd.orders'), valueH: t('o.grand'),
      items: kdGroup(live, o => String(o.branchId || '') || oBranch(o), oBranch, oTotal) });
    return null;
  } });
  const drillSub = () => closeDrill.refresh();
  OO.subs.add(drillSub);
  return () => { unsub(); closeDrill(); OO.subs.delete(drillSub); OO.subs.delete(draw); clearInterval(OO.timer); OO.timer = 0; };
};

/* =====================================================================
   العملاء — list, customer details and favourite-product views (as the old page)
   ===================================================================== */
const CU_PATHS = ['customers', 'deliveryZones', 'orders', 'branches', 'orderTypes', 'paymentMethods', 'products', 'cashiers', 'customerLevelSettings'];
/* Addresses as the cashier saves them: [{ area: 'السرة', details: 'ق 6 ش 12' }] (area = the area's name).
   Older records written by this page used zoneId — read both. */
const custAreaOf = a => (a && (a.area || nameOf((LIVE.cache.deliveryZones || {})[a.zoneId]))) || '';
const custAddresses = c => (!c ? [] : Array.isArray(c.addresses) && c.addresses.filter(Boolean).length ? c.addresses.filter(Boolean)
  : c.zoneId || c.address ? [{ zoneId: c.zoneId || '', details: c.address || '' }] : []);
const custAreas = c => [...new Set(custAddresses(c).map(custAreaOf).map(x => String(x).trim()).filter(Boolean))];
function custAddressText(c) {
  const list = custAddresses(c); if (!list.length) return '-';
  const a = list[0], area = custAreaOf(a), det = String(a.details || '').trim();
  return `${[area, det].filter(Boolean).join(' - ') || '-'}${list.length > 1 ? ` (+${list.length - 1})` : ''}`;
}
/* Level rules — saved in customerLevelSettings, editable from «إعدادات المستويات».
   Counted over the last `days` days: number of orders, total paid, and how recent the last order is.
   Both orders and total must be reached and the last order must be recent; VVIP is checked first. */
const LEVEL_DEFAULTS = { vvipOrders: 8, vvipSpend: 150, vvipRecent: 30, vipOrders: 4, vipSpend: 60, vipRecent: 45, days: 90 };
const levelRules = () => { const r = LIVE.cache.customerLevelSettings || {}; const o = {}; Object.keys(LEVEL_DEFAULTS).forEach(k => { const v = Number(r[k]); o[k] = r[k] !== undefined && r[k] !== null && r[k] !== '' && Number.isFinite(v) && v >= 0 ? v : LEVEL_DEFAULTS[k]; }); return o; };
function custStats(entries) {
  const m = {};
  entries.forEach(o => {
    const id = oCustId(o); if (!id) return;
    const s = (m[id] ||= { total: 0, count: 0, first: null, last: null });
    const at = oTime(o);
    s.total += Number(o.total || 0); s.count++;
    s.first = s.first === null ? at : Math.min(s.first, at);
    s.last = s.last === null ? at : Math.max(s.last, at);
  });
  return m;
}
const statAvg = s => (s && s.count ? s.total / s.count : 0);
const statGap = s => (s && s.count > 1 ? (s.last - s.first) / (s.count - 1) / 86400000 : null);
function custLevel(s, r = levelRules(), now = Date.now()) {
  if (!s || !s.count) return 'regular';
  const ago = s.last ? (now - s.last) / 86400000 : Infinity;
  const hit = p => s.count >= r[p + 'Orders'] && s.total >= r[p + 'Spend'] && (!r[p + 'Recent'] || ago <= r[p + 'Recent']);
  return hit('vvip') ? 'vvip' : hit('vip') ? 'vip' : 'regular';
}
const LEVEL_TONE = { regular: 'neutral', vip: 'info', vvip: 'accent' };
const custOrderAddress = o => {
  const z = (o && (nameOf((LIVE.cache.deliveryZones || {})[o.deliveryZoneId]) || o.deliveryZoneName || o.area)) || '', d = String((o && (o.deliveryAddress || o.address)) || '').trim();
  return z && d ? (d.startsWith(z) ? d : `${z} - ${d}`) : d || z || '-';
};
const custOrderType = o => oType(o);
const productsAmount = o => Number(o.subtotal ?? o.netTotal ?? (Number(o.total || 0) - Number(o.deliveryFee || 0)));

PAGES.customers = view => {
  const st = (S.cu ||= { q: '', zones: [], level: 'all', sort: 'desc', from: '', to: '', blocked: false, per: 10, page: 1, sel: new Set(), detail: null, fav: null, imp: null, drill: null });
  let first = true, pageIds = [], saving = false, zones = null;
  let statsAll = {};
  // Area filter: the cashier's areas + any other area written on a customer's address
  const areaItems = () => { const set = new Set(CASHIER_AREAS); Object.values(LIVE.cache.customers || {}).forEach(c => custAreas(c).forEach(a => set.add(a))); return [...set].sort((a, b) => a.localeCompare(b, 'ar')).map(a => [a, a]); };

  // Level window: the rules' «days» (0 = every order). Cached per orders/customers/rules snapshot.
  let statsKey = null;
  function allStats() {
    const r = levelRules(), key = [LIVE.cache.orders, LIVE.cache.customers, r.days];
    if (!statsKey || key.some((v, i) => v !== statsKey[i])) {
      statsKey = key;
      const since = r.days > 0 ? Date.now() - r.days * 86400000 : 0;
      statsAll = custStats(Object.values(LIVE.cache.orders || {}).filter(o => o && !oCancelled(o) && oTime(o) >= since));
    }
    return statsAll;
  }
  let lifeKey = null, lifeAll = {};
  function lifeStats() {
    const key = [LIVE.cache.orders, LIVE.cache.customers];
    if (!lifeKey || key.some((v, i) => v !== lifeKey[i])) { lifeKey = key; lifeAll = custStats(Object.values(LIVE.cache.orders || {}).filter(o => o && !oCancelled(o))); }
    return lifeAll;
  }
  const levelOf = (id, c, r) => c.level || custLevel(allStats()[id], r);
  function entries() {
    const useRange = !!(st.from || st.to), r = levelRules();
    const range = useRange ? custStats(Object.values(LIVE.cache.orders || {}).filter(o => o && !oCancelled(o) && inRange(oTime(o), st.from, st.to))) : lifeStats();
    const q = normQ(st.q);
    return Object.entries(LIVE.cache.customers || {}).filter(([, c]) => c && typeof c === 'object').map(([id, c]) => {
      const s = range[id] || { total: 0, count: 0, first: null, last: null };
      const areas = custAreas(c);
      return { id, c, areas, zone: areas[0] || '-', addr: custAddressText(c), last: s.last, count: s.count,
        avg: statAvg(s), gap: statGap(s), level: levelOf(id, c, r) };
    }).filter(x => (!st.zones.length || x.areas.some(z => st.zones.includes(z)))
      && (st.level === 'all' || x.level === st.level) && (!st.blocked || x.c.isBlocked) && (!useRange || x.count > 0)
      && (!q || normQ(`${nameOf(x.c)} ${x.c.phone || ''} ${x.zone} ${x.addr}`).includes(q)))
      .sort((a, b) => ((b.count - a.count) * (st.sort === 'asc' ? -1 : 1)) || ((b.last || 0) - (a.last || 0)));
  }

  /* ---------- views ---------- */
  function mount() {
    zones && zones.destroy(); zones = null; first = true;
    const c = st.detail && (LIVE.cache.customers || {})[st.detail];
    if (st.detail && LIVE.loaded(['customers']) && !c) { st.detail = null; st.fav = null; }
    if (st.detail && st.fav) return mountFav();
    if (st.detail) return mountDetail();
    if (st.drill) { view.innerHTML = '<div id="cuDrill"></div>'; return draw(); }
    view.innerHTML = `
      ${pageHeader('customers', `<button class="btn btn-ghost" data-cu="levels">${icon('sliders')}<span>${t('cu.levelSettings')}</span></button>
        <button class="btn btn-ghost" data-cu="import">${icon('upload')}<span>${t('cu.import')}</span></button>
        <button class="btn btn-ghost" data-cu="export">${icon('download')}<span>${t('cu.download')}</span><em class="sel-n"></em></button>
        <button class="btn btn-primary" data-cu="new">${icon('plus')}<span>${t('cu.new')}</span></button>`, t('cu.sub'))}
      <section class="kpis" id="cuK"></section>
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools">
          <label class="search-field">${icon('search')}<input type="search" id="cuQ" placeholder="${t('cu.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
          ${msHtml('cuZones')}
          <div class="select tb-select"><select id="cuLevel" aria-label="${t('cu.level')}">${['all', 'regular', 'vip', 'vvip'].map(k => `<option value="${k}" ${st.level === k ? 'selected' : ''}>${t('cu.lv.' + k)}</option>`).join('')}</select>${icon('chevDown')}</div>
          <div class="select tb-select"><select id="cuSort" aria-label="${t('it.sort')}"><option value="desc" ${st.sort === 'desc' ? 'selected' : ''}>${t('cu.sortDesc')}</option><option value="asc" ${st.sort === 'asc' ? 'selected' : ''}>${t('cu.sortAsc')}</option></select>${icon('chevDown')}</div>
          <label class="date-field"><small>${t('c.from')}</small><input type="date" id="cuFrom" value="${st.from}"></label>
          <label class="date-field"><small>${t('c.to')}</small><input type="date" id="cuTo" value="${st.to}"></label>
          <label class="check-line"><input type="checkbox" id="cuBlocked" ${st.blocked ? 'checked' : ''}> ${t('cu.blockedOnly')}</label>
          ${perHtml(st)}
        </div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr><th class="sel-col"><input type="checkbox" id="sAll" aria-label="${t('it.selectAll')}"></th><th>${t('c.name')}</th><th>${t('c.phone')}</th><th>${t('o.zone')}</th><th>${t('o.address')}</th><th>${t('cu.lastOrder')}</th><th class="end">${t('cu.orders')}</th><th class="end">${t('cu.avgValue')}</th><th class="end">${t('cu.avgGap')}</th><th>${t('cu.level')}</th><th>${t('cu.status')}</th><th class="act-col"></th></tr></thead>
          <tbody id="cuBody"></tbody></table></div>
        <footer class="pager" id="cuPager"></footer>
      </section>`;
    zones = msControl($('#cuZones', view), { items: areaItems, get: () => st.zones, set: v => { st.zones = v; st.page = 1; zones.paint(); draw(); } });
    let deb;
    $('#cuQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 150); });
    [['#cuLevel', 'level'], ['#cuSort', 'sort'], ['#cuFrom', 'from'], ['#cuTo', 'to']].forEach(([sel, k]) => $(sel, view).addEventListener('change', e => { st[k] = e.target.value; st.page = 1; draw(); }));
    $('#cuBlocked', view).addEventListener('change', e => { st.blocked = e.target.checked; st.page = 1; draw(); });
    $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
    bindSelection(view, st, () => pageIds, () => selectionBits(view, st, pageIds));
    draw();
  }

  function drawList() {
    const body = $('#cuBody', view); if (!body) return;
    // Counts, averages and levels need every order, not just the first page of them
    if (!LIVE.complete(CU_PATHS)) { setHtml(body, skeletonRows(6, 12)); $('#cuK', view).innerHTML = skeletonKpis(); return; }
    const custs = LIVE.cache.customers || {};
    [...st.sel].forEach(id => { if (!custs[id]) st.sel.delete(id); });
    const all = lifeStats(), r = levelRules(), list = entries();
    const cl = Object.entries(custs).filter(([, c]) => c && typeof c === 'object');
    setKpis($('#cuK', view), [
      kpiCard({ label: t('cu.kTotal'), value: cl.length, ic: 'users', tone: 'c1' }),
      kpiCard({ label: t('cu.kOrdering'), value: cl.filter(([id]) => all[id]).length, ic: 'receipt', tone: 'c2', drill: 'ordering' }),
      kpiCard({ label: t('cu.kVip'), value: cl.filter(([id, c]) => levelOf(id, c, r) !== 'regular').length, ic: 'star', tone: 'c3', drill: 'vip' }),
      kpiCard({ label: t('cu.kBlocked'), value: cl.filter(([, c]) => c.isBlocked).length, ic: 'shield', tone: 'c4', drill: 'blocked' })
    ].join(''), first);
    zones && zones.paint();
    setHtml($('#cuPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    pageIds = slice.map(x => x.id);
    const filtering = st.q || st.zones.length || st.level !== 'all' || st.blocked || st.from || st.to;
    setHtml(body, slice.length ? slice.map((x, i) => `<tr data-id="${esc(x.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
      <td class="sel-col"><input type="checkbox" data-sel ${st.sel.has(x.id) ? 'checked' : ''} aria-label="${esc(nameOf(x.c))}"></td>
      <td data-label="${t('c.name')}"><button type="button" class="person link-person" data-cu="details"><span class="av" style="--h:${hue(x.c.phone || x.id)}">${esc((nameOf(x.c) || '?').trim()[0] || '?')}</span><b>${esc(nameOf(x.c) || '-')}</b></button></td>
      <td data-label="${t('c.phone')}">${x.c.phone ? `<a class="mono link-plain" href="tel:${esc(String(x.c.phone).replace(/\s+/g, ''))}">${esc(x.c.phone)}</a>` : '<span class="muted">—</span>'}</td>
      <td data-label="${t('o.zone')}">${esc(x.zone)}</td>
      <td data-label="${t('o.address')}"><span class="clip" title="${esc(x.addr)}">${esc(x.addr)}</span></td>
      <td data-label="${t('cu.lastOrder')}"><span class="date">${x.last ? fmtDateTime(x.last) : '—'}</span></td>
      <td data-label="${t('cu.orders')}" class="end num">${x.count}</td>
      <td data-label="${t('cu.avgValue')}" class="end num">${fmtNum(x.avg, 3, 3)}</td>
      <td data-label="${t('cu.avgGap')}" class="end num">${x.gap === null ? '—' : x.gap.toFixed(1)}</td>
      <td data-label="${t('cu.level')}"><span class="badge tone-${LEVEL_TONE[x.level] || 'neutral'}" ${x.c.level ? `title="${t('cu.lvManual')}"` : ''}>${t('cu.lv.' + (LEVEL_TONE[x.level] ? x.level : 'regular'))}</span></td>
      <td data-label="${t('cu.status')}">${x.c.isBlocked ? `<span class="badge tone-danger" ${x.c.blockReason ? `title="${esc(x.c.blockReason)}"` : ''}><i></i>${t('cu.blocked')}</span>` : `<span class="badge tone-success"><i></i>${t('cu.active')}</span>`}</td>
      <td class="act-col"><div class="row-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-cu="details" aria-label="${t('cu.details')}">${icon('eye')}</button>
        <button class="btn-icon sm" data-cu="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
        <button class="btn-icon sm" data-cu="block" aria-label="${t(x.c.isBlocked ? 'cu.unblock' : 'cu.block')}">${icon(x.c.isBlocked ? 'check' : 'shield')}</button>
        <button class="btn-icon sm danger" data-cu="delete" aria-label="${t('delete')}">${icon('trash')}</button>
      </div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="12"><div class="empty-state">${icon(filtering ? 'search' : 'users')}<b>${t(filtering ? 'emptyTitle' : 'cu.none')}</b><small>${t(filtering ? 'emptySub' : 'cu.noneSub')}</small></div></td></tr>`);
    selectionBits(view, st, pageIds);
    first = false;
  }

  const detailOrders = id => Object.entries(LIVE.cache.orders || {}).filter(([, o]) => o && oCustId(o) === id).map(([oid, o]) => ({ id: oid, o, at: oTime(o) }))
    .filter(x => inRange(x.at, st.from, st.to) || (!st.from && !st.to && x.at)).sort((a, b) => b.at - a.at);
  function favorite(rows) {
    const counts = {};
    rows.forEach(({ o }) => {
      if (oCancelled(o)) return;
      oItems(o).forEach(it => {
        const pid = it.productId || '', key = pid || it.name; if (!key) return;
        const q = Number(it.qty || 0);
        (counts[key] ||= { name: it.name || nameOf((LIVE.cache.products || {})[pid]) || '-', count: 0, productId: pid || null }).count += q > 0 ? q : 1;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count)[0] || null;
  }
  const backBar = (label) => `<div class="back-bar"><button class="btn btn-ghost btn-sm" data-cu="back">${icon('chevLeft', 'flip')}<span>${label}</span></button></div>`;
  const dateBar = () => `<div class="toolbar it-tools"><label class="date-field"><small>${t('c.from')}</small><input type="date" id="cuFrom" value="${st.from}"></label><label class="date-field"><small>${t('c.to')}</small><input type="date" id="cuTo" value="${st.to}"></label></div>`;

  function mountDetail() {
    view.innerHTML = `${backBar(t(st.drill ? 'kd.back' : 'cu.backList'))}<div id="cuDetail"></div>`;
    draw();
  }
  function drawDetail() {
    const box = $('#cuDetail', view); if (!box) return;
    if (!LIVE.complete(CU_PATHS)) { setHtml(box, `<section class="kpis">${skeletonKpis()}</section>`); return; }
    const c = (LIVE.cache.customers || {})[st.detail]; if (!c) { st.detail = null; mount(); return; }
    const rows = detailOrders(st.detail), fav = favorite(rows);
    const tot = rows.reduce((a, { o }) => (oCancelled(o) ? a : { p: a.p + productsAmount(o), d: a.d + Number(o.deliveryFee || 0), t: a.t + Number(o.total || 0) }), { p: 0, d: 0, t: 0 });
    const was = box._html;
    setHtml(box, `
      ${pageHeader('customers', `<button class="btn btn-ghost" data-cu="dprint">${icon('printer')}<span>${t('o.printReport')}</span></button><button class="btn btn-primary" data-cu="dexport">${icon('download')}<span>${t('o.download')}</span></button>`, `${esc(nameOf(c) || '-')} · <span class="mono">${esc(c.phone || '-')}</span>`)}
      <section class="kpis">${[kpiCard({ label: t('cu.productsAmount'), value: tot.p, kind: 'money', ic: 'package', tone: 'c1' }), kpiCard({ label: t('cu.deliveryAmount'), value: tot.d, kind: 'money', ic: 'bike', tone: 'c3' }), kpiCard({ label: t('cu.totalSales'), value: tot.t, kind: 'money', ic: 'wallet', tone: 'c2' })].join('')}
        <article class="kpi card fav-card"><div class="kpi-top"><span class="kpi-ic c4">${icon('star')}</span></div><span class="kpi-label">${t('cu.favorite')}</span>
          <b class="fav-name">${fav ? `${esc(fav.name)} <em>(${Math.round(fav.count)})</em>` : '—'}</b>${fav && fav.productId ? `<button class="btn btn-soft btn-sm" data-cu="fav" data-pid="${esc(fav.productId)}">${icon('eye')}<span>${t('view')}</span></button>` : ''}</article></section>
      <section class="card table-card">${dateBar()}
        <div class="table-wrap"><table class="dt it-table"><thead><tr><th>${t('o.number')}</th><th>${t('o.branch')}</th><th>${t('o.cashier')}</th><th>${t('o.type')}</th><th>${t('o.address')}</th><th class="end">${t('cu.productsAmount')}</th><th class="end">${t('o.fee')}</th><th class="end">${t('cu.totalSales')}</th><th>${t('c.date')}</th></tr></thead>
        <tbody>${rows.length ? rows.map(({ o, at }) => `<tr class="${oCancelled(o) ? 'is-cancelled' : ''}"><td data-label="${t('o.number')}"><span class="cell-2"><b class="mono">#${esc(oNum(o))}</b>${oCancelled(o) ? `<small class="cancel-note">${esc(oCancelText(o))}</small>` : ''}</span></td>
          <td data-label="${t('o.branch')}">${esc(nameOf((LIVE.cache.branches || {})[o.branchId]) || o.branchName || '-')}</td><td data-label="${t('o.cashier')}">${esc(oCashier(o))}</td><td data-label="${t('o.type')}">${esc(custOrderType(o))}</td>
          <td data-label="${t('o.address')}"><span class="clip">${esc(custOrderAddress(o))}</span></td><td data-label="${t('cu.productsAmount')}" class="end num">${fmtNum(productsAmount(o), 3, 3)}</td><td data-label="${t('o.fee')}" class="end num">${fmtMoney(Number(o.deliveryFee || 0))}</td>
          <td data-label="${t('cu.totalSales')}" class="end"><b class="num">${fmtMoney(Number(o.total || 0))}</b></td><td data-label="${t('c.date')}"><span class="date">${fmtDateTime(at)}</span></td></tr>`).join('')
          : `<tr class="empty"><td colspan="9"><div class="empty-state">${icon('receipt')}<b>${t('cu.noOrders')}</b></div></td></tr>`}</tbody></table></div></section>`);
    if (box._html !== was) { stagger(box); paintCounts(box); }
    if (!box._wired) {
      box._wired = true;
      box.addEventListener('change', e => { if (e.target.id === 'cuFrom' || e.target.id === 'cuTo') { st[e.target.id === 'cuFrom' ? 'from' : 'to'] = e.target.value; draw(); } });
    }
    first = false;
  }
  function detailExport() {
    const rows = detailOrders(st.detail);
    excelOut(rows.map(({ o, at }) => ({ [t('o.number')]: oNum(o), [t('o.status')]: oCancelText(o) || t('o.active'), [t('o.branch')]: nameOf((LIVE.cache.branches || {})[o.branchId]) || o.branchName || '-', [t('o.cashier')]: oCashier(o),
      [t('o.type')]: custOrderType(o), [t('o.address')]: custOrderAddress(o), [t('cu.productsAmount')]: +productsAmount(o).toFixed(3), [t('o.fee')]: Number(o.deliveryFee || 0), [t('cu.totalSales')]: Number(o.total || 0), [t('c.date')]: fmtDateTime(at) })), `customer-${st.detail}-orders.xlsx`);
  }
  function detailPrint() {
    const c = (LIVE.cache.customers || {})[st.detail] || {}, rows = detailOrders(st.detail);
    const tot = rows.reduce((a, { o }) => (oCancelled(o) ? a : { p: a.p + productsAmount(o), d: a.d + Number(o.deliveryFee || 0), t: a.t + Number(o.total || 0) }), { p: 0, d: 0, t: 0 });
    printDoc(t('customers'), [[t('c.name'), nameOf(c) || '-'], [t('c.phone'), c.phone || '-'], [t('c.from'), st.from || '-'], [t('c.to'), st.to || '-']],
      [t('o.number'), t('o.branch'), t('o.cashier'), t('o.type'), t('o.address'), t('cu.productsAmount'), t('o.fee'), t('cu.totalSales'), t('c.date')],
      rows.map(({ o, at }) => [[oNum(o), oCancelText(o)].filter(Boolean).join(' — '), nameOf((LIVE.cache.branches || {})[o.branchId]) || o.branchName || '-', oCashier(o), custOrderType(o), custOrderAddress(o), fmtNum(productsAmount(o), 3, 3), moneyPlain(Number(o.deliveryFee || 0)), moneyPlain(Number(o.total || 0)), fmtDateTime(at)]),
      [[t('cu.productsAmount'), moneyPlain(tot.p)], [t('cu.deliveryAmount'), moneyPlain(tot.d)], [t('cu.totalSales'), moneyPlain(tot.t)]]);
  }

  /* Orders of this customer that contain the favourite product */
  function favRows() {
    const c = (LIVE.cache.customers || {})[st.detail] || {};
    return detailOrders(st.detail).filter(({ o }) => !oCancelled(o) && oItems(o).some(it => String(it.productId) === String(st.fav))).map(({ o, at }) => ({
      num: o.orderNumber || '-', name: nameOf(c) || '-', zone: oZone(o), phone: c.phone || oPhone(o), at,
      cashier: oCashier(o), branch: nameOf((LIVE.cache.branches || {})[o.branchId]) || o.branchName || '-', type: custOrderType(o),
      net: Number(o.netTotal ?? o.subtotal ?? (Number(o.total || 0) - Number(o.deliveryFee || 0))), fee: Number(o.deliveryFee || 0), total: Number(o.total || 0),
      pay: oPay(o) }));
  }
  const FAV_COLS = () => [t('o.number'), t('o.customer'), t('o.zone'), t('c.phone'), t('c.date'), t('o.cashier'), t('o.branch'), t('o.type'), t('o.net'), t('o.fee'), t('o.grand'), t('o.payment')];
  function mountFav() {
    view.innerHTML = `${backBar(t('cu.backCustomer'))}<div id="cuFav"></div>`;
    draw();
  }
  function drawFav() {
    const box = $('#cuFav', view); if (!box) return;
    if (!LIVE.complete(CU_PATHS)) { setHtml(box, `<section class="kpis">${skeletonKpis()}</section>`); return; }
    const c = (LIVE.cache.customers || {})[st.detail]; if (!c) { st.detail = null; st.fav = null; mount(); return; }
    const p = (LIVE.cache.products || {})[st.fav], rows = favRows();
    const tot = rows.reduce((a, r) => ({ n: a.n + r.net, d: a.d + r.fee, t: a.t + r.total }), { n: 0, d: 0, t: 0 });
    const was = box._html;
    setHtml(box, `
      ${pageHeader('customers', `<button class="btn btn-ghost" data-cu="fprint">${icon('printer')}<span>${t('o.printReport')}</span></button><button class="btn btn-primary" data-cu="fexport">${icon('download')}<span>${t('o.download')}</span></button>`, `${t('cu.favorite')}: <b>${esc(nameOf(p) || '-')}</b> · ${esc(nameOf(c) || '-')} · <span class="mono">${esc(c.phone || '-')}</span>`)}
      <section class="kpis">${[kpiCard({ label: t('o.net'), value: tot.n, kind: 'money', ic: 'package', tone: 'c1' }), kpiCard({ label: t('o.fee'), value: tot.d, kind: 'money', ic: 'bike', tone: 'c3' }), kpiCard({ label: t('cu.totalSales'), value: tot.t, kind: 'money', ic: 'wallet', tone: 'c2' })].join('')}</section>
      <section class="card table-card"><div class="table-wrap"><table class="dt it-table"><thead><tr>${FAV_COLS().map((h, i) => `<th class="${i >= 8 && i <= 10 ? 'end' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.map(r => `<tr><td><b class="mono">#${esc(r.num)}</b></td><td>${esc(r.name)}</td><td>${esc(r.zone)}</td><td class="mono">${esc(r.phone)}</td><td><span class="date">${fmtDateTime(r.at)}</span></td><td>${esc(r.cashier)}</td><td>${esc(r.branch)}</td><td>${esc(r.type)}</td>
          <td class="end num">${fmtMoney(r.net)}</td><td class="end num">${fmtMoney(r.fee)}</td><td class="end"><b class="num">${fmtMoney(r.total)}</b></td><td>${esc(r.pay)}</td></tr>`).join('')
          : `<tr class="empty"><td colspan="12"><div class="empty-state">${icon('receipt')}<b>${t('cu.noOrders')}</b></div></td></tr>`}</tbody></table></div></section>`);
    if (box._html !== was) { stagger(box); paintCounts(box); }
    first = false;
  }
  function favExport() {
    excelOut(favRows().map(r => { const h = FAV_COLS(); return { [h[0]]: r.num, [h[1]]: r.name, [h[2]]: r.zone, [h[3]]: r.phone, [h[4]]: fmtDateTime(r.at), [h[11]]: r.pay, [h[5]]: r.cashier, [h[6]]: r.branch, [h[7]]: r.type, [h[8]]: +r.net.toFixed(3), [h[9]]: r.fee, [h[10]]: r.total }; }), `customer-${st.detail}-favorite-product.xlsx`);
  }
  function favPrint() {
    const c = (LIVE.cache.customers || {})[st.detail] || {}, p = (LIVE.cache.products || {})[st.fav], rows = favRows();
    const tot = rows.reduce((a, r) => ({ n: a.n + r.net, d: a.d + r.fee, t: a.t + r.total }), { n: 0, d: 0, t: 0 });
    printDoc(t('cu.favorite'), [[t('c.name'), nameOf(c) || '-'], [t('c.phone'), c.phone || '-'], [t('o.product'), nameOf(p) || '-'], [t('c.from'), st.from || '-'], [t('c.to'), st.to || '-']], FAV_COLS(),
      rows.map(r => [r.num, r.name, r.zone, r.phone, fmtDateTime(r.at), r.cashier, r.branch, r.type, moneyPlain(r.net), moneyPlain(r.fee), moneyPlain(r.total), r.pay]),
      [[t('o.net'), moneyPlain(tot.n)], [t('o.fee'), moneyPlain(tot.d)], [t('o.grand'), moneyPlain(tot.t)]]);
  }

  function draw() { if (st.detail && st.fav) drawFav(); else if (st.detail) drawDetail(); else if (st.drill) drawDrill(); else drawList(); }

  /* ---------- list actions ---------- */
  function exportList() {
    const list = entries(), sel = st.sel.size ? list.filter(x => st.sel.has(x.id)) : list;
    excelOut(sel.map(x => ({ [t('c.name')]: nameOf(x.c), [t('c.phone')]: x.c.phone || '', [t('o.zone')]: x.zone, [t('o.address')]: x.addr, [t('cu.lastOrder')]: x.last ? fmtDateTime(x.last) : '',
      [t('cu.orders')]: x.count, [t('cu.avgValue')]: +x.avg.toFixed(3), [t('cu.avgGap')]: x.gap === null ? '' : +x.gap.toFixed(1), [t('cu.level')]: t('cu.lv.' + (LEVEL_TONE[x.level] ? x.level : 'regular')), [t('cu.status')]: x.c.isBlocked ? t('cu.blocked') : t('cu.active') })), 'customers-report.xlsx');
  }
  // Area choices = the cashier's list; an area already on the address but not in it stays selectable
  const zoneOpts = val => optsHtml([...CASHIER_AREAS, ...(val && !CASHIER_AREAS.includes(val) ? [val] : [])].map(a => [a, a]), val, t('cu.chooseZone'));
  const phoneTaken = (phone, exceptId) => { const k = phoneKey(phone); return !!k && Object.entries(LIVE.cache.customers || {}).some(([id, c]) => id !== exceptId && c && phoneKey(c.phone) === k); };
  // Same phone format and phone index as the cashier (it finds customers by customerPhoneIndex/965XXXXXXXX)
  // Same rule as the cashier: 8 digits, not a filler like 00000000
  const cashierPhone = v => { const k = phoneKey(v); return /^\d{8}$/.test(k) && !/^(\d)\1{7}$/.test(k) ? `965${k}` : ''; };

  function openNew() {
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('user')}</span><div><h2 id="drawerTitle">${t('cu.new')}</h2><p>${t('fillForm')}</p></div><button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body it-form" id="cuForm" novalidate>
        <div class="field"><label for="nName">${t('c.name')} <em>*</em></label><input id="nName" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="nPhone">${t('c.phone')} <em>*</em></label><input id="nPhone" dir="ltr" inputmode="tel" autocomplete="off"><small class="err"></small></div>
        <label class="check-line"><input type="checkbox" id="nOnly"> ${t('cu.nameOnly')}</label>
        <div class="def-wrap" id="nAddr"><div class="field"><label for="nZone">${t('o.zone')}</label><div class="select"><select id="nZone">${zoneOpts('')}</select>${icon('chevDown')}</div></div>
          <div class="field"><label for="nDet">${t('cu.addrDetails')}</label><input id="nDet" autocomplete="off"></div></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="nSave">${icon('check')}<span>${t('add')}</span></button></footer>`;
    openLayer('#drawer');
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input', dr).forEach(i => i.addEventListener('input', () => i.closest('.field') && err('#' + i.id, '')));
    $('#nOnly', dr).addEventListener('change', e => $('#nAddr', dr).classList.toggle('hidden', e.target.checked));
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const name = $('#nName', dr).value.trim(), phone = toLatin($('#nPhone', dr).value.trim()), only = $('#nOnly', dr).checked;
      const zoneId = $('#nZone', dr).value, details = $('#nDet', dr).value.trim();
      let bad = false;
      if (!name) { err('#nName', t('required')); bad = true; }
      if (!phone) { err('#nPhone', t('required')); bad = true; } else if (!cashierPhone(phone)) { err('#nPhone', t('cu.phoneBad')); bad = true; } else if (phoneTaken(phone)) { err('#nPhone', t('cu.phoneTaken')); bad = true; }
      if (bad) return;
      const addr = !only && (zoneId || details) ? [{ area: zoneId || '', details: details || '' }] : [];
      const btn = $('#nSave', dr); saving = true; btn.classList.add('loading');
      try {
        const id = LIVE.newKey('customers'), ph = cashierPhone(phone);
        await LIVE.update({ [`customers/${id}`]: clean({ id, name, phone: ph, addresses: addr, createdAt: LIVE.now() }), [`customerPhoneIndex/${ph}`]: id });
        toast(t('added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#cuForm', dr).addEventListener('submit', save); $('#nSave', dr).addEventListener('click', save);
    setTimeout(() => $('#nName', dr).focus(), 320);
  }

  function openEdit(id) {
    const c = (LIVE.cache.customers || {})[id]; if (!c) return;
    const uid = () => `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const addrs = custAddresses(c).map(a => ({ id: uid(), area: custAreaOf(a), details: a.details || '' }));
    if (!addrs.length) addrs.push({ id: uid(), area: '', details: '' });
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('pencil')}</span><div><h2 id="drawerTitle">${t('cu.editTitle')}</h2><p>${esc(nameOf(c) || '-')}</p></div><button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body it-form" id="cuForm" novalidate>
        <div class="field"><label for="uName">${t('c.name')} <em>*</em></label><input id="uName" value="${esc(nameOf(c))}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="uPhone">${t('c.phone')} <em>*</em></label><input id="uPhone" dir="ltr" inputmode="tel" value="${esc(c.phone || '')}" autocomplete="off"><small class="err"></small></div>
        <div class="draft-head"><b>${t('cu.addresses')}</b><button type="button" class="btn btn-soft btn-sm" id="uAdd">${icon('plus')}<span>${t('cu.addAddress')}</span></button></div>
        <div id="uAddrs" class="addr-list"></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="uSave">${icon('check')}<span>${t('save')}</span></button></footer>`;
    openLayer('#drawer');
    const paint = () => { $('#uAddrs', dr).innerHTML = addrs.length ? addrs.map((a, i) => `<div class="addr-item" data-i="${i}"><span class="addr-n">${i + 1}</span>
        <div class="select"><select data-f="area" aria-label="${t('o.zone')}">${zoneOpts(a.area)}</select>${icon('chevDown')}</div>
        <input data-f="details" value="${esc(a.details)}" placeholder="${t('cu.addrDetails')}" autocomplete="off">
        <button type="button" class="chip-x" data-rm aria-label="${t('delete')}">${icon('x')}</button></div>`).join('') : `<p class="muted pc-hint">${icon('info')}${t('cu.noAddress')}</p>`; };
    paint();
    dr.oninput = e => { const f = e.target.dataset.f, it = e.target.closest('.addr-item'); if (f && it) addrs[+it.dataset.i][f] = e.target.value; const fl = e.target.closest('.field'); if (fl) { fl.classList.remove('invalid'); $('.err', fl).textContent = ''; } };
    dr.onclick = e => { const rm = e.target.closest('[data-rm]'); if (rm) { addrs.splice(+rm.closest('.addr-item').dataset.i, 1); paint(); } };
    $('#uAdd', dr).addEventListener('click', () => { addrs.push({ id: uid(), area: '', details: '' }); paint(); $$('.addr-item select', dr).at(-1).focus(); });
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const name = $('#uName', dr).value.trim(), phone = toLatin($('#uPhone', dr).value.trim());
      let bad = false;
      if (!name) { err('#uName', t('required')); bad = true; }
      if (!phone) { err('#uPhone', t('required')); bad = true; } else if (!cashierPhone(phone)) { err('#uPhone', t('cu.phoneBad')); bad = true; } else if (phoneTaken(phone, id)) { err('#uPhone', t('cu.phoneTaken')); bad = true; }
      if (bad) return;
      const list = addrs.map(a => ({ area: a.area || '', details: String(a.details || '').trim() })).filter(a => a.area || a.details);
      const btn = $('#uSave', dr); saving = true; btn.classList.add('loading');
      try {
        const ph = cashierPhone(phone), was = cashierPhone(c.phone);
        const up = { [`customers/${id}/name`]: name, [`customers/${id}/nameAr`]: null, [`customers/${id}/nameEn`]: null, [`customers/${id}/phone`]: ph,
          [`customers/${id}/addresses`]: list.length ? list : null, [`customers/${id}/zoneId`]: null, [`customers/${id}/address`]: null, [`customers/${id}/updatedAt`]: LIVE.now(), [`customerPhoneIndex/${ph}`]: id };
        if (was && was !== ph) up[`customerPhoneIndex/${was}`] = null;
        await LIVE.update(up);
        toast(t('saved')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#cuForm', dr).addEventListener('submit', save); $('#uSave', dr).addEventListener('click', save);
  }

  async function toggleBlock(id) {
    const c = (LIVE.cache.customers || {})[id]; if (!c) return;
    if (c.isBlocked) {
      const ok = await confirmDialog({ title: t('cu.unblockQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(c))}</b></div></div>${c.blockReason ? `<p class="cf-note">${t('cu.reason')}: ${esc(c.blockReason)}</p>` : ''}`, ok: t('cu.unblock'), icon: 'check' });
      if (!ok) return;
      try { await LIVE.update({ [`customers/${id}/isBlocked`]: false, [`customers/${id}/blockReason`]: '' }); toast(t('cu.unblocked')); } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      return;
    }
    const wait = confirmDialog({ title: t('cu.blockQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(c))}</b></div></div><div class="field cf-field"><label for="bReason">${t('cu.reason')} <em>*</em></label><textarea id="bReason" rows="2" maxlength="200"></textarea><small class="err"></small></div>`, ok: t('cu.block'), tone: 'danger', icon: 'shield' });
    // The reason is required: block the confirm button until it's written
    setTimeout(() => {
      const ta = $('#bReason'), okBtn = $('#confirm [data-cf="1"]'); if (!ta || !okBtn) return;
      okBtn.disabled = true; ta.focus();
      ta.addEventListener('input', () => { okBtn.disabled = !ta.value.trim(); });
      ta._get = () => ta.value.trim();
    }, 80);
    let reason = '';
    const grab = e => { if (e.target.closest('#confirm [data-cf="1"]')) reason = ($('#bReason') || {}).value || ''; };
    document.addEventListener('click', grab, true);
    const ok = await wait;
    document.removeEventListener('click', grab, true);
    reason = reason.trim();
    if (!ok || !reason) return;
    try { await LIVE.update({ [`customers/${id}/isBlocked`]: true, [`customers/${id}/blockReason`]: reason }); toast(t('cu.blockedOk'), { tone: 'danger' }); } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  async function remove(id) {
    const c = (LIVE.cache.customers || {})[id]; if (!c) return;
    const n = (allStats()[id] || {}).count || 0;
    const ok = await confirmDialog({ title: t('cu.deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(c))}</b></div><div><small>${t('cu.orders')}</small><b>${n}</b></div></div><p class="cf-note">${t('cu.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const ph = cashierPhone(c.phone);
    try { await LIVE.update({ [`customers/${id}`]: null, ...(ph ? { [`customerPhoneIndex/${ph}`]: null } : {}) }); st.sel.delete(id); toast(t('deleted'), { tone: 'danger' }); } catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- Excel import (old template: name, phone, address «zone - details») ---------- */
  const IMPORT_COLS = { 'اسم الزبون': 'name', 'اسم العميل': 'name', 'الاسم': 'name', 'رقم الهاتف': 'phone', 'الهاتف': 'phone', 'العنوان': 'address', name: 'name', phone: 'phone', address: 'address' };
  const zoneKey = v => normQ(String(v || '').replace(/^منطقة\s+/u, '').replace(/^محافظة\s+/u, '').replace(/\s+/g, ' '));
  function zoneMatch(token) {
    const k = zoneKey(token); if (!k) return null;
    // Match against the cashier's area names (what addresses store)
    const list = CASHIER_AREAS.map(a => ({ area: a, keys: [zoneKey(a)] }));
    return list.find(e => e.keys.includes(k)) || list.find(e => e.keys.some(x => x.includes(k) || k.includes(x))) || null;
  }
  function prepareImport(rows) {
    const existing = new Set(Object.values(LIVE.cache.customers || {}).map(c => phoneKey(c && c.phone)).filter(Boolean));
    const inFile = new Set(), out = { rows: [], dup: 0, existing: 0, invalid: 0, noZone: 0 };
    rows.forEach((raw, i) => {
      const r = mapImportRow(raw, IMPORT_COLS);
      const name = String(r.name || '').trim(), phone = cashierPhone(String(r.phone || '').trim()), addr = String(r.address || '').trim(), k = phoneKey(phone);
      if (!name || !phone || !addr) { out.invalid++; return; }
      if (inFile.has(k)) { out.dup++; return; }
      if (existing.has(k)) { out.existing++; return; }
      const parts = addr.replace(/\r?\n+/g, ' ').split(/\s*[-/\\|،]+\s*/u).map(s => s.trim()).filter(Boolean);
      const z = zoneMatch(parts.shift() || '');
      if (!z) { out.noZone++; return; }
      inFile.add(k);
      const details = parts.join(' - ').trim() || null;
      out.rows.push({ name, phone, addresses: [{ area: z.area, details: details || '' }] });
    });
    return out;
  }
  function openImport() {
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('upload')}</span><div><h2 id="drawerTitle">${t('cu.importTitle')}</h2><p>${t('imp.sub')}</p></div><button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body imp">
        <div class="imp-step"><span class="imp-n">1</span><div><b>${t('imp.step1')}</b><small>${t('cu.impStep1Sub')}</small></div><button type="button" class="btn btn-ghost btn-sm" id="impTpl">${icon('download')}<span>${t('imp.template')}</span></button></div>
        <div class="imp-step"><span class="imp-n">2</span><div><b>${t('imp.step2')}</b><small>${t('cu.impStep2Sub')}</small></div></div>
        <label class="imp-drop" id="impDrop">${icon('upload')}<b id="impFile">${t('imp.choose')}</b><small>xlsx · xls</small><input type="file" id="impIn" accept=".xlsx,.xls" hidden></label>
        <div class="imp-status" id="impStatus" aria-live="polite"></div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><span class="tb-spacer"></span><button class="btn btn-primary" id="impGo" disabled>${icon('plus')}<span id="impGoTxt">${t('imp.go').replace('{n}', '')}</span></button></footer>`;
    openLayer('#drawer');
    const status = () => {
      const s = st.imp;
      $('#impStatus', dr).innerHTML = !s ? '' : [s.name ? `<span>${icon('check')}${t('imp.ready').replace('{n}', s.rows.length)}</span>` : '', s.dup ? `<span class="warn">${icon('alert')}${t('imp.dupFile').replace('{n}', s.dup)}</span>` : '',
        s.existing ? `<span class="warn">${icon('alert')}${t('cu.impExisting').replace('{n}', s.existing)}</span>` : '', s.invalid ? `<span class="warn">${icon('alert')}${t('cu.impInvalid').replace('{n}', s.invalid)}</span>` : '',
        s.noZone ? `<span class="warn">${icon('alert')}${t('cu.impNoZone').replace('{n}', s.noZone)}</span>` : '', s.msg ? `<span class="${s.tone || ''}">${icon(s.tone === 'danger' ? 'alert' : 'check')}${s.msg}</span>` : ''].join('');
      $('#impGo', dr).disabled = !(s && s.rows.length);
      $('#impGoTxt', dr).textContent = t('imp.go').replace('{n}', s && s.rows.length ? s.rows.length : '');
      $('#impFile', dr).textContent = s && s.name ? s.name : t('imp.choose');
    };
    status();
    $('#impTpl', dr).addEventListener('click', async () => {
      try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
      const ar = S.lang === 'ar';
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ [ar ? 'اسم الزبون' : 'name']: '', [ar ? 'رقم الهاتف' : 'phone']: '', [ar ? 'العنوان' : 'address']: '' }]), 'Customers');
      XLSX.writeFile(wb, 'customers-template.xlsx');
    });
    const load = async file => {
      if (!file) return;
      try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
      try {
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
        const p = prepareImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).filter(r => !rowEmpty(r)));
        st.imp = { name: file.name, ...p, msg: p.rows.length ? '' : t('imp.nothing'), tone: p.rows.length ? '' : 'danger' };
      } catch (e) { st.imp = { name: file.name, rows: [], msg: t('imp.badFile'), tone: 'danger' }; }
      status();
    };
    $('#impIn', dr).addEventListener('change', e => { load(e.target.files[0]); e.target.value = ''; });
    const drop = $('#impDrop', dr);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); load(e.dataTransfer.files[0]); });
    $('#impGo', dr).addEventListener('click', async () => {
      const s = st.imp; if (!s || !s.rows.length || saving) return;
      const btn = $('#impGo', dr); saving = true; btn.classList.add('loading');
      try {
        const up = {};
        s.rows.forEach(r => { const id = LIVE.newKey('customers'); up[`customers/${id}`] = clean({ id, ...r, createdAt: LIVE.now() }); up[`customerPhoneIndex/${r.phone}`] = id; });
        await LIVE.update(up);
        st.imp = { rows: [], msg: t('imp.done').replace('{n}', s.rows.length), tone: 'success' };
        toast(st.imp.msg);
      } catch (e) { st.imp = { ...s, msg: t('pm.saveFailed'), tone: 'danger' }; }
      finally { saving = false; btn.classList.remove('loading'); status(); if (st.imp && !st.imp.rows.length && st.imp.tone === 'success') st.imp = null; }
    });
  }

  /* ---------- what's behind each summary card ---------- */
  // A customer opened from a card's page; «back» from the customer returns to that page
  const openCust = id => { st.detail = id; st.fav = null; mount(); scrollTo({ top: 0, behavior: 'smooth' }); };
  const drillBack = () => { st.drill = null; mount(); scrollTo({ top: 0, behavior: 'smooth' }); };
  function drawDrill() {
    const box = $('#cuDrill', view); if (!box) return;
    if (!LIVE.complete(CU_PATHS)) { if (!box._kd) box.innerHTML = `<section class="kpis">${skeletonKpis()}</section>`; return; }
    const cfg = drill(st.drill); if (!cfg) { st.drill = null; mount(); return; }
    if (!box._kd) box.innerHTML = '';
    kpiPage(box, { ...cfg, onRow: openCust, onBack: drillBack });
  }
  const custCell = c => `<span class="person"><span class="av" style="--h:${hue(c.phone || '')}">${esc((nameOf(c) || '?').trim()[0] || '?')}</span><b>${esc(nameOf(c) || '-')}</b></span>`;
  const lvBadge = lv => `<span class="badge tone-${LEVEL_TONE[lv] || 'neutral'}">${t('cu.lv.' + (LEVEL_TONE[lv] ? lv : 'regular'))}</span>`;
  function drill(kind) {
    const custs = Object.entries(LIVE.cache.customers || {}).filter(([, c]) => c && typeof c === 'object');
    const life = lifeStats(), win = allStats(), r = levelRules(), H = { name: t('c.name'), phone: t('c.phone'), area: t('o.zone') };
    if (kind === 'ordering') {
      const list = custs.filter(([id]) => life[id]).map(([id, c]) => ({ id, c, s: life[id] })).sort((a, b) => b.s.total - a.s.total);
      const tot = list.reduce((a, x) => ({ n: a.n + x.s.count, v: a.v + x.s.total }), { n: 0, v: 0 });
      return ({ title: t('cu.kOrdering'), sub: t('cu.dOrderingSub'), ic: 'receipt', file: 'customers-with-orders.xlsx', onRow: openCust,
        chips: [[t('cu.kOrdering'), fmtNum(list.length)], [t('cu.orders'), fmtNum(tot.n)], [t('cu.totalSales'), fmtMoney(tot.v)], [t('cu.avgValue'), fmtMoney(tot.n ? tot.v / tot.n : 0)]],
        cols: [{ h: '#' }, { h: H.name }, { h: H.phone }, { h: H.area }, { h: t('cu.orders'), end: 1 }, { h: t('cu.totalSales'), end: 1 }, { h: t('cu.avgValue'), end: 1 }, { h: t('cu.lastOrder') }],
        rows: list.map((x, i) => ({ id: x.id, text: `${nameOf(x.c)} ${x.c.phone || ''} ${custAreas(x.c).join(' ')}`,
          cells: [`<span class="muted">${i + 1}</span>`, custCell(x.c), `<span class="mono">${esc(x.c.phone || '-')}</span>`, esc(custAreas(x.c)[0] || '-'), fmtNum(x.s.count), fmtMoney(x.s.total), fmtMoney(x.s.total / x.s.count), `<span class="date">${fmtDateTime(x.s.last)}</span>`],
          x: { [H.name]: nameOf(x.c), [H.phone]: x.c.phone || '', [H.area]: custAreas(x.c)[0] || '', [t('cu.orders')]: x.s.count, [t('cu.totalSales')]: +x.s.total.toFixed(3), [t('cu.avgValue')]: +(x.s.total / x.s.count).toFixed(3), [t('cu.lastOrder')]: fmtDateTime(x.s.last) } })) });
    }
    if (kind === 'vip') {
      const rank = { vvip: 0, vip: 1 }, now = Date.now();
      const list = custs.map(([id, c]) => ({ id, c, s: win[id] || { total: 0, count: 0, last: null }, lv: levelOf(id, c, r) })).filter(x => x.lv !== 'regular')
        .sort((a, b) => (rank[a.lv] - rank[b.lv]) || (b.s.total - a.s.total));
      const n = lv => list.filter(x => x.lv === lv).length, per = r.days > 0 ? t('cu.dLastDays').replace('{n}', r.days) : t('cu.dAllTime');
      const ago = x => (x.s.last ? Math.floor((now - x.s.last) / 86400000) : null);
      return ({ title: t('cu.kVip'), sub: `${t('cu.dVipSub')} · ${per}`, ic: 'star', file: 'customers-vip.xlsx', onRow: openCust,
        chips: [['VVIP', fmtNum(n('vvip')), 'accent'], ['VIP', fmtNum(n('vip')), 'info'], [`${t('cu.totalSales')} (${per})`, fmtMoney(list.reduce((a, x) => a + x.s.total, 0))]],
        cols: [{ h: H.name }, { h: H.phone }, { h: t('cu.level') }, { h: `${t('cu.orders')} <small class="muted">(${esc(per)})</small>`, end: 1 }, { h: `${t('cu.totalSales')} <small class="muted">(${esc(per)})</small>`, end: 1 }, { h: t('cu.lastOrder') }],
        rows: list.map(x => ({ id: x.id, text: `${nameOf(x.c)} ${x.c.phone || ''} ${x.lv}`,
          cells: [custCell(x.c), `<span class="mono">${esc(x.c.phone || '-')}</span>`, lvBadge(x.lv) + (x.c.level ? ` <small class="muted" title="${t('cu.lvManual')}">✎</small>` : ''), fmtNum(x.s.count), fmtMoney(x.s.total),
            x.s.last ? `<span class="cell-2"><span class="date">${fmtDateTime(x.s.last)}</span><small class="muted">${ago(x) === 0 ? t('cu.dToday') : t('cu.dAgo').replace('{n}', ago(x))}</small></span>` : '—'],
          x: { [H.name]: nameOf(x.c), [H.phone]: x.c.phone || '', [t('cu.level')]: x.lv.toUpperCase(), [t('cu.orders')]: x.s.count, [t('cu.totalSales')]: +x.s.total.toFixed(3), [t('cu.lastOrder')]: x.s.last ? fmtDateTime(x.s.last) : '' } })) });
    }
    if (kind === 'blocked') {
      const list = custs.filter(([, c]) => c.isBlocked).map(([id, c]) => ({ id, c, s: life[id] || { total: 0, count: 0, last: null } }));
      return ({ title: t('cu.kBlocked'), sub: t('cu.dBlockedSub'), ic: 'shield', file: 'customers-blocked.xlsx', onRow: openCust, empty: t('cu.dNoBlocked'),
        chips: [[t('cu.kBlocked'), fmtNum(list.length), 'danger']],
        cols: [{ h: H.name }, { h: H.phone }, { h: t('cu.reason') }, { h: t('cu.orders'), end: 1 }, { h: t('cu.lastOrder') }],
        rows: list.map(x => ({ id: x.id, text: `${nameOf(x.c)} ${x.c.phone || ''} ${x.c.blockReason || ''}`,
          cells: [custCell(x.c), `<span class="mono">${esc(x.c.phone || '-')}</span>`, x.c.blockReason ? esc(x.c.blockReason) : '<span class="muted">—</span>', fmtNum(x.s.count), x.s.last ? `<span class="date">${fmtDateTime(x.s.last)}</span>` : '—'],
          x: { [H.name]: nameOf(x.c), [H.phone]: x.c.phone || '', [t('cu.reason')]: x.c.blockReason || '', [t('cu.orders')]: x.s.count, [t('cu.lastOrder')]: x.s.last ? fmtDateTime(x.s.last) : '' } })) });
    }
  }

  /* ---------- level settings ---------- */
  function openLevels() {
    const r = levelRules(), dr = freshDrawer(false);
    const num = (id, v, step, suf) => `<div class="lv-in"><input id="${id}" type="number" min="0" step="${step}" value="${v}" dir="ltr" inputmode="decimal"><span>${suf}</span></div>`;
    const kd = t('cu.kd'), dd = t('cu.days'), ow = t('o.ordersWord');
    const box = (p, tone, label) => `<fieldset class="lv-box lv-3 tone-${tone}"><legend><span class="badge tone-${tone}">${label}</span></legend>
          <div class="field"><label for="lv_${p}Orders">${t('cu.lvOrders')}</label>${num(`lv_${p}Orders`, r[p + 'Orders'], '1', ow)}</div>
          <div class="field"><label for="lv_${p}Spend">${t('cu.lvSpend')}</label>${num(`lv_${p}Spend`, r[p + 'Spend'], '1', kd)}</div>
          <div class="field"><label for="lv_${p}Recent">${t('cu.lvRecent')}</label>${num(`lv_${p}Recent`, r[p + 'Recent'], '1', dd)}</div></fieldset>`;
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('sliders')}</span><div><h2 id="drawerTitle">${t('cu.levelSettings')}</h2><p>${t('cu.lvSub')}</p></div><button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body it-form" id="lvForm" novalidate>
        <div class="lv-how">${icon('info')}<div><b>${t('cu.lvHow')}</b><ul>
          <li>${t('cu.lvHow1')}</li><li>${t('cu.lvHow2')}</li><li>${t('cu.lvHow3')}</li><li>${t('cu.lvHow4')}</li></ul></div></div>
        <fieldset class="lv-box"><legend>${t('cu.lvGeneral')}</legend>
          <div class="field"><label for="lvDays">${t('cu.lvDays')}</label>${num('lvDays', r.days, '1', dd)}<small class="lv-hint">${t('cu.lvDaysHint')}</small></div></fieldset>
        ${box('vvip', 'accent', 'VVIP')}
        ${box('vip', 'info', 'VIP')}
        <div class="lv-preview" id="lvPrev"></div>
        <small class="err" id="lvErr"></small>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" type="button" id="lvReset">${icon('refresh')}<span>${t('cu.lvReset')}</span></button><span class="tb-spacer"></span><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="lvSave">${icon('check')}<span>${t('save')}</span></button></footer>`;
    openLayer('#drawer');
    const F = { days: '#lvDays', ...Object.fromEntries(['vvip', 'vip'].flatMap(p => ['Orders', 'Spend', 'Recent'].map(f => [p + f, `#lv_${p}${f}`]))) };
    const read = () => Object.fromEntries(Object.entries(F).map(([k, sel]) => [k, Number(toLatin($(sel, dr).value))]));
    // Live preview: how many customers each level would hold with these numbers
    const preview = () => {
      const v = read(), bad = Object.values(v).some(x => !Number.isFinite(x) || x < 0);
      $('#lvErr', dr).textContent = bad ? t('cu.lvBad') : '';
      if (bad || !LIVE.complete(['orders', 'customers'])) { $('#lvPrev', dr).innerHTML = ''; return; }
      const since = v.days > 0 ? Date.now() - v.days * 86400000 : 0;
      const stats = custStats(Object.values(LIVE.cache.orders || {}).filter(o => o && !oCancelled(o) && oTime(o) >= since));
      const n = { regular: 0, vip: 0, vvip: 0 };
      Object.entries(LIVE.cache.customers || {}).forEach(([id, c]) => { if (c && typeof c === 'object') n[c.level && n[c.level] !== undefined ? c.level : custLevel(stats[id], v)]++; });
      $('#lvPrev', dr).innerHTML = `<b>${t('cu.lvPreview')}</b><div class="lv-counts"><span class="badge tone-accent">VVIP <em>${n.vvip}</em></span><span class="badge tone-info">VIP <em>${n.vip}</em></span><span class="badge tone-neutral">${t('cu.lv.regular')} <em>${n.regular}</em></span></div>`;
    };
    let deb; dr.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(preview, 200); });
    preview();
    $('#lvReset', dr).addEventListener('click', () => { Object.entries(F).forEach(([k, sel]) => { $(sel, dr).value = LEVEL_DEFAULTS[k]; }); preview(); });
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const v = read();
      if (Object.values(v).some(x => !Number.isFinite(x) || x < 0)) { $('#lvErr', dr).textContent = t('cu.lvBad'); return; }
      const btn = $('#lvSave', dr); saving = true; btn.classList.add('loading');
      try { await LIVE.update(Object.fromEntries([...Object.entries(v).map(([k, x]) => [`customerLevelSettings/${k}`, x]), ['customerLevelSettings/updatedAt', LIVE.now()]])); toast(t('saved')); closeLayers(); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#lvForm', dr).addEventListener('submit', save); $('#lvSave', dr).addEventListener('click', save);
  }

  /* ---------- events ---------- */
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const k = e.target.closest('.kpi-link[data-drill]'); if (k) { if (!LIVE.complete(CU_PATHS)) return; st.drill = k.dataset.drill; mount(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const b = e.target.closest('[data-cu]'); if (!b || b.disabled) return;
    const a = b.dataset.cu;
    if (a === 'new') return openNew();
    if (a === 'levels') return openLevels();
    if (a === 'import') return openImport();
    if (a === 'export') return allLoaded() && exportList();
    if (a === 'back') { if (st.fav) st.fav = null; else st.detail = null; mount(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'fav') { st.fav = b.dataset.pid; mount(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a === 'dexport') return detailExport();
    if (a === 'dprint') return detailPrint();
    if (a === 'fexport') return favExport();
    if (a === 'fprint') return favPrint();
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    if (a === 'details') { st.detail = id; st.fav = null; mount(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    ({ edit: openEdit, block: toggleBlock, delete: remove })[a](id);
  });

  const unsub = LIVE.watch(CU_PATHS, draw);
  mount();
  return () => { unsub(); zones && zones.destroy(); freshDrawer(false); };
};
