/* Administration pages wired to live server data. */

const LIVE_ROUTES = new Set(['pending-movements']);

/* ---------- shared helpers for live pages ---------- */
const nameOf = o => (!o ? '' : S.lang === 'en' ? (o.nameEn || o.name || o.nameAr || '') : (o.nameAr || o.name || o.nameEn || ''));
const items$ = list => (!list ? [] : Array.isArray(list) ? list.filter(Boolean) : Object.values(list));
const itemType = it => it.itemType || it.type || 'product';
const unitName = id => nameOf(LIVE.cache.units && LIVE.cache.units[id]);
const OLD_BRANCH = { main: ['الفرع الرئيسي', 'Main Branch'], yarmouk: ['اليرموك', 'Yarmouk'], abu_hasaniya: ['أبو الحصانية', 'Abu Al-Hasaniya'], main_warehouse: ['المخزن الرئيسي', 'Main Warehouse'] };
function branchLabel(id) {
  if (!id) return '-';
  const n = nameOf(LIVE.cache.branches && LIVE.cache.branches[id]);
  if (n) return n;
  return OLD_BRANCH[id] ? OLD_BRANCH[id][S.lang === 'en' ? 1 : 0] : id;
}
/* Names follow the interface language: the live catalog record first, then the names saved on the line */
const liveItem = it => { const id = it.itemId || it.productId || it.materialId, cat = itemType(it) === 'product' ? LIVE.cache.products : LIVE.cache.stockMaterials; return (id && cat && cat[id]) || null; };
const liveItemName = it => nameOf(liveItem(it)) || nameOf({ nameAr: it.nameAr || it.itemNameAr, nameEn: it.nameEn || it.itemNameEn }) || it.name || it.itemName || it.productName || '-';
const liveUnitName = it => unitName(it.unitId) || unitName((liveItem(it) || {}).unitId) || it.unitName || '';
const itemLabel = it => { const u = liveUnitName(it); return `${liveItemName(it)}${u ? ` (${u})` : ''}`; };
const unitPrice = it => Number(it.unitPrice ?? it.cost ?? it.price ?? 0);
const expectedTotal = p => items$(p && p.items).reduce((s, it) => s + Number(it.qty || 0) * unitPrice(it), 0);
const fmtDateTime = ts => (!ts ? '-' : new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)));

/* Latest received price for an item (from purchase receipts), with its unit */
/* With unitId, a price recorded in that same unit wins over a newer one in another unit */
/* Receipt prices indexed by item, rebuilt only when the receipts change
   (instead of scanning every receipt for every item shown). */
let priceIdx = { src: null, map: new Map() };
function priceIndex() {
  const src = LIVE.cache.purchaseReceipts;
  if (priceIdx.src === src) return priceIdx.map;
  const map = new Map();
  Object.values(src || {}).forEach(rc => {
    const at = Number(rc.createdAt || 0);
    items$(rc.items).forEach(it => {
      const k = `${itemType(it)}:${it.itemId || it.id}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ price: Number(it.cost ?? it.unitPrice ?? it.price ?? 0), at, unitId: it.unitId || null });
    });
  });
  priceIdx = { src, map };
  return map;
}
function latestPrice(type, id, unitId) {
  if (!id) return null;
  let best = null, same = null;
  (priceIndex().get(`${type}:${id}`) || []).forEach(e => {
    if (!best || e.at > best.at) best = e;
    if (unitId && (!e.unitId || e.unitId === unitId) && (!same || e.at > same.at)) same = e;
  });
  return same || best;
}
/* "1.250 KWD / Carton" — the unit is shown when it differs from the ordered one */
function latestText(it) {
  const lp = latestPrice(itemType(it), it.itemId || it.id, it.unitId);
  if (!lp) return '<span class="muted">—</span>';
  const diff = lp.unitId && it.unitId && lp.unitId !== it.unitId;
  return `<span class="lc-v num">${fmtMoney(lp.price)}${diff ? ` <span class="unit-warn" title="${esc(t('pm.unitDiff'))}">/ ${esc(unitName(lp.unitId) || lp.unitId)}</span>` : ''}</span>`;
}

/* ---------- confirm dialog ---------- */
function confirmDialog({ title, body = '', ok, tone = 'success', icon: ic = 'check' }) {
  return new Promise(resolve => {
    const wrap = $('#confirm');
    wrap.innerHTML = `<div class="cf-backdrop" data-cf="0"></div>
      <div class="cf" role="alertdialog" aria-modal="true" aria-labelledby="cfT">
        <span class="cf-ic tone-${tone}">${icon(ic)}</span>
        <h2 id="cfT">${title}</h2><div class="cf-body">${body}</div>
        <div class="cf-btns"><button class="btn btn-ghost" data-cf="0">${t('cancel')}</button>
          <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-cf="1">${ok}</button></div>
      </div>`;
    const prev = document.activeElement;
    requestAnimationFrame(() => wrap.classList.add('open'));
    const done = v => {
      wrap.classList.remove('open'); document.removeEventListener('keydown', key, true);
      setTimeout(() => { wrap.innerHTML = ''; prev && prev.focus && prev.focus({ preventScroll: true }); }, 250);
      resolve(v);
    };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', key, true);
    wrap.onclick = e => { const b = e.target.closest('[data-cf]'); if (b) done(b.dataset.cf === '1'); };
    setTimeout(() => $('[data-cf="1"]', wrap).focus(), 60);
  });
}

/* ---------- print ---------- */
/* opts: { extra: { title, cols, rows } — a second table, barcode — printed under the header } */
function printDoc(title, metaPairs, cols, rows, footer, opts = {}) {
  const table = (c, r) => `<table><thead><tr>${c.map((h, i) => `<th class="${i ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${r.map(x => `<tr>${x.map((v, i) => `<td class="${i ? 'n' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  let bc = '';
  if (opts.barcode && window.JsBarcode) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try { JsBarcode(svg, String(opts.barcode), { format: 'CODE128', height: 46, width: 1.6, margin: 0, fontSize: 12 }); bc = `<div class="bc">${svg.outerHTML}</div>`; } catch (e) { bc = ''; }
  }
  const dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  const doc = `<!doctype html><html lang="${S.lang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>@page{size:A4;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#0f172a;margin:0;font-size:12px;line-height:1.45}
    header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid #16a34a;padding-bottom:8px;margin-bottom:12px}
    h1{font-size:19px;margin:0}.brand{color:#16a34a;font-weight:700;font-size:12px}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #94a3b8;border-radius:6px;overflow:hidden;margin-bottom:12px}
    .meta div{display:flex;gap:6px;align-items:baseline;padding:6px 9px;border-bottom:1px solid #cbd5e1;border-inline-end:1px solid #cbd5e1;font-weight:600;min-width:0}
    .meta div:nth-child(3n){border-inline-end:0}.meta small{color:#475569;font-size:11px;font-weight:400;white-space:nowrap}.meta small::after{content:':'}
    table{width:100%;border-collapse:collapse;border:1px solid #64748b}
    th{background:#e2e8f0;color:#0f172a;font-weight:700;padding:6px 8px;text-align:center;border:1px solid #64748b}
    td{padding:5px 8px;border:1px solid #94a3b8;vertical-align:middle;text-align:center}tbody tr:nth-child(even) td{background:#f8fafc}
    td.n,th.n{text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap;width:1%}tfoot td{font-weight:700;background:#e2e8f0;border-top:2px solid #0f172a}
    footer{margin-top:10px;color:#475569;font-size:10.5px}h2{font-size:14px;margin:16px 0 6px}.bc{direction:ltr}.bc svg{height:56px}</style></head>
    <body><header><div><div class="brand">${esc(t('brand'))}</div><h1>${esc(title)}</h1></div>${bc}</header>
    <div class="meta">${metaPairs.map(([k, v]) => `<div><small>${esc(k)}</small>${esc(v)}</div>`).join('')}</div>
    ${table(cols, rows)}${footer ? `<tfoot>${(Array.isArray(footer[0]) ? footer : [footer]).map(f => `<tr><td colspan="${cols.length - 1}">${esc(f[0])}</td><td class="n">${esc(f[1])}</td></tr>`).join('')}</tfoot>` : ''}</table>
    ${opts.extra ? `<h2>${esc(opts.extra.title)}</h2>${table(opts.extra.cols, opts.extra.rows)}</table>` : ''}
    <footer>${esc(t('pm.printedAt'))}: ${esc(fmtDateTime(Date.now()))}</footer></body></html>`;
  printHtml(doc);
}
/* Prints a full HTML document through a hidden frame (no pop-up window to block) */
function printHtml(doc) {
  // In the Windows app: straight to the printer chosen in its settings (80mm receipts to the
  // receipt printer, the rest to the A4 printer), as the old site did. A failure falls back to the dialog.
  if (window.figsDesktop && window.figsDesktop.isDesktopApp) {
    const type = /size:\s*80mm/i.test(doc) ? 'receipt' : 'a4';
    window.figsDesktop.printHtml({ html: doc, type, silent: true })
      .then(() => toast(t('printSent')), () => { toast(t('printFailed'), { tone: 'danger', ic: 'alert' }); printFrame(doc); });
    return;
  }
  printFrame(doc);
}
function printFrame(doc) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(doc); f.contentDocument.close();
  const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); };
  f.contentDocument.fonts ? f.contentDocument.fonts.ready.then(() => setTimeout(go, 150)) : setTimeout(go, 500);
}
const moneyPlain = n => `${fmtNum(n, 3, 3)} ${t('currency')}`;

/* =====================================================================
   حركات مخزون معلقة — Pending stock moves
   ===================================================================== */
const PM_PATHS = ['pendingStockMoves', 'purchases', 'purchaseReceipts', 'branches', 'units'];
const PM_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const PSTATUS = { pending: 'pending', approved: 'approved', rejected: 'rejected', received: 'received', partial: 'partial' };

function pmRows() {
  const c = LIVE.cache;
  return Object.entries(c.pendingStockMoves || {}).map(([id, m]) => {
    const linked = m.type === 'purchase' && m.purchaseId;
    const p = linked ? (c.purchases || {})[m.purchaseId] || null : null;
    return {
      id, m, p, purchaseId: m.purchaseId || null,
      status: PM_TONE[m.status] ? m.status : 'pending',
      missing: !!(linked && !p),
      title: p && p.purchaseNumber != null ? `${t('pm.purchaseReq')} #${p.purchaseNumber}` : (m.name || '-'),
      supplier: (p && p.supplierName) || m.note || '-',
      branchId: m.branchId || (p && p.branchId) || '',
      storekeeper: (p && p.storekeeperName) || '-',
      total: p ? expectedTotal(p) : null,
      items: items$(p && p.items),
      createdAt: Number(m.createdAt || 0)
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

PAGES['pending-movements'] = view => {
  const st = (S.pm ||= { q: '', status: 'pending', branch: 'all', page: 1 });
  const busy = new Set();
  let first = true;

  view.innerHTML = `
    ${pageHeader('pending-movements', `<button class="btn btn-ghost" data-pm="export">${icon('download')}<span>${t('export')}</span></button>`, t('pm.sub'))}
    <section class="kpis" id="pmK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="pmQ" placeholder="${t('pm.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <div class="chips" id="pmChips"></div>
        <div class="select tb-select">${icon('chevDown')}<select id="pmBranch" aria-label="${t('c.branch')}"></select></div>
      </div>
      <div class="table-wrap"><table class="dt pm-table">
        <thead><tr><th>${t('pm.request')}</th><th>${t('c.branch')}</th><th>${t('c.date')}</th><th>${t('pm.latestCost')}</th><th class="end">${t('pm.value')}</th><th>${t('c.status')}</th><th class="act-col"></th></tr></thead>
        <tbody id="pmBody"></tbody>
      </table></div>
      <footer class="pager" id="pmPager"></footer>
    </section>`;

  const filtered = rows => {
    const q = st.q.toLowerCase();
    return rows.filter(r => (st.status === 'all' || r.status === st.status)
      && (st.branch === 'all' || r.branchId === st.branch)
      && (!q || [r.title, r.supplier, r.storekeeper, r.m.name, r.p && r.p.purchaseInvoiceNumber, ...r.items.map(i => i.name)].some(x => String(x || '').toLowerCase().includes(q))));
  };

  const row = (r, i) => {
    const b = busy.has(r.id);
    const shown = r.items.slice(0, 2);
    return `<tr data-id="${r.id}" class="${first ? 'row-in' : ''}${b ? ' is-busy' : ''}" style="--r:${i}">
      <td data-label="${t('pm.request')}"><span class="person"><span class="pr-ic" style="--h:${r.missing ? 0 : 152}">${icon(r.missing ? 'alert' : 'cart')}</span>
        <span class="cell-2"><b>${esc(r.title)}</b><small>${esc(r.supplier)}</small>${r.missing ? `<small class="neg">${t('pm.missing')}</small>` : r.p && r.p.purchaseInvoiceNumber ? `<small class="mono">${t('pm.invNo')} ${esc(r.p.purchaseInvoiceNumber)}</small>` : ''}</span></span></td>
      <td data-label="${t('c.branch')}">${esc(branchLabel(r.branchId))}</td>
      <td data-label="${t('c.date')}"><span class="cell-2"><span class="date">${fmtDateTime(r.createdAt)}</span>${r.storekeeper !== '-' ? `<small>${t('pm.storekeeper')}: ${esc(r.storekeeper)}</small>` : ''}</span></td>
      <td data-label="${t('pm.latestCost')}"><div class="lc">${shown.length ? shown.map(it => `<span><em>${esc(itemLabel(it))}</em>${latestText(it)}</span>`).join('') : '<span class="muted">—</span>'}
        ${r.items.length > 2 ? `<button class="link" data-pm="view">+${r.items.length - 2} ${t('pm.more')}</button>` : ''}</div></td>
      <td data-label="${t('pm.value')}" class="end">${r.total == null ? '<span class="muted">—</span>' : `<span class="num">${fmtMoney(r.total)}</span>`}</td>
      <td data-label="${t('c.status')}"><span class="badge tone-${PM_TONE[r.status]}"><i></i>${t('st.' + r.status)}</span>${r.m.decidedByName ? `<small class="by">${esc(r.m.decidedByName)}</small>` : ''}</td>
      <td class="act-col"><div class="row-acts pm-acts">${rowMenuBtn()}
        ${r.p ? `<button class="btn-icon sm" data-pm="view" aria-label="${t('view')}" data-tip="${t('view')}" data-tip-always>${icon('eye')}</button>
          <button class="btn-icon sm" data-pm="print" aria-label="${t('print')}" data-tip="${t('print')}" data-tip-always>${icon('printer')}</button>` : ''}
        ${r.status === 'pending' && !r.missing ? `<button class="btn btn-sm btn-approve" data-pm="approve" aria-label="${t('pm.approve')}" data-tip="${t('pm.approve')}" data-tip-always ${b ? 'disabled' : ''}>${icon('check')}<span>${t('pm.approve')}</span></button>
          <button class="btn btn-sm btn-reject" data-pm="reject" aria-label="${t('pm.reject')}" data-tip="${t('pm.reject')}" data-tip-always ${b ? 'disabled' : ''}>${icon('x')}<span>${t('pm.reject')}</span></button>` : ''}
        ${r.status === 'pending' && r.p ? '' : `<button class="btn-icon sm danger" data-pm="delete" aria-label="${t('delete')}" data-tip="${t('delete')}" data-tip-always ${b ? 'disabled' : ''}>${icon('trash')}</button>`}
      </div></td></tr>`;
  };

  function draw() {
    const body = $('#pmBody', view);
    if (!body) return;
    if (!LIVE.loaded(PM_PATHS)) {
      setHtml(body, Array.from({ length: 5 }, () => `<tr class="skel-row">${'<td><i class="skel"></i></td>'.repeat(7)}</tr>`).join(''));
      $('#pmK', view).innerHTML = Array.from({ length: 4 }, () => '<article class="kpi card"><i class="skel lg"></i><i class="skel"></i></article>').join('');
      return;
    }
    const all = pmRows();
    const month = Date.now() - 30 * 86400000;
    const pend = all.filter(r => r.status === 'pending');
    const decided = s => all.filter(r => r.status === s && Number(r.m.decidedAt || r.createdAt) >= month).length;
    setKpis($('#pmK', view), [
      kpiCard({ label: t('pm.kPending'), value: pend.length, ic: 'clock', tone: 'c4' }),
      kpiCard({ label: t('pm.kValue'), value: pend.reduce((s, r) => s + (r.total || 0), 0), kind: 'money', ic: 'wallet', tone: 'c1', drill: 'value' }),
      kpiCard({ label: t('pm.kApproved'), value: decided('approved'), ic: 'check', tone: 'c2', drill: 'approved' }),
      kpiCard({ label: t('pm.kRejected'), value: decided('rejected'), ic: 'x', tone: 'c3', drill: 'rejected' })
    ].join(''), first);

    const counts = s => (s === 'all' ? all.length : all.filter(r => r.status === s).length);
    patchChildren($('#pmChips', view), ['pending', 'approved', 'rejected', 'all'].map(s =>
      `<button class="chip${st.status === s ? ' on' : ''}" data-status="${s}">${s === 'all' ? '' : `<i class="dot tone-${PM_TONE[s]}"></i>`}${t(s === 'all' ? 'all' : 'st.' + s)}<em>${counts(s)}</em></button>`).join(''));
    const bsel = $('#pmBranch', view);
    const ids = [...new Set([...Object.keys(LIVE.cache.branches || {}), ...all.map(r => r.branchId).filter(Boolean)])];
    setHtml(bsel, `<option value="all">${t('allBranches')}</option>` + ids.map(id => `<option value="${esc(id)}" ${st.branch === id ? 'selected' : ''}>${esc(branchLabel(id))}</option>`).join(''));

    const rows = filtered(all);
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    st.page = Math.min(st.page, pages);
    const slice = rows.slice((st.page - 1) * PER, st.page * PER);
    setHtml(body, slice.length ? slice.map(row).join('')
      : `<tr class="empty"><td colspan="7"><div class="empty-state">${icon(st.status === 'pending' && !st.q ? 'check' : 'search')}<b>${st.status === 'pending' && !st.q ? t('pm.allClear') : t('emptyTitle')}</b><small>${st.status === 'pending' && !st.q ? t('pm.allClearSub') : t('emptySub')}</small></div></td></tr>`);
    const from = rows.length ? (st.page - 1) * PER + 1 : 0, to = Math.min(st.page * PER, rows.length);
    setHtml($('#pmPager', view), `<span class="pager-info">${t('showing')} <b>${from}–${to}</b> ${t('of')} <b>${rows.length}</b></span>
      <div class="pager-btns"><button class="btn-icon sm" data-page="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="${t('prev')}">${icon('chevLeft', 'flip')}</button>
      ${Array.from({ length: pages }, (_, i) => `<button class="pg${i + 1 === st.page ? ' on' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
      <button class="btn-icon sm" data-page="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="${t('next')}">${icon('chevRight', 'flip')}</button></div>`);
    first = false;
  }

  /* ---- actions ---- */
  const find = id => pmRows().find(r => r.id === id);
  const summary = r => `<div class="cf-sum"><div><small>${t('pm.request')}</small><b>${esc(r.title)}</b></div><div><small>${t('c.supplier')}</small><b>${esc(r.supplier)}</b></div>
    <div><small>${t('c.branch')}</small><b>${esc(branchLabel(r.branchId))}</b></div><div><small>${t('pm.value')}</small><b>${r.total == null ? '—' : fmtMoney(r.total)}</b></div></div>`;

  async function decide(r, status) {
    if (busy.has(r.id)) return;
    const yes = status === 'approved';
    const ok = await confirmDialog({ title: t(yes ? 'pm.approveQ' : 'pm.rejectQ'), body: summary(r) + (yes ? '' : `<p class="cf-note">${t('pm.rejectNote')}</p>`), ok: t(yes ? 'pm.approve' : 'pm.reject'), tone: yes ? 'success' : 'danger', icon: yes ? 'check' : 'x' });
    if (!ok) return;
    const cur = (LIVE.cache.pendingStockMoves || {})[r.id];
    if (!cur || (cur.status || 'pending') !== 'pending') { toast(t('pm.alreadyDecided'), { tone: 'danger', ic: 'alert' }); return; }
    const now = LIVE.now(), u = LIVE.user;
    const up = {
      [`pendingStockMoves/${r.id}/status`]: status,
      [`pendingStockMoves/${r.id}/decidedAt`]: now,
      [`pendingStockMoves/${r.id}/decidedById`]: u.id,
      [`pendingStockMoves/${r.id}/decidedByName`]: u.name
    };
    const p = r.purchaseId && (LIVE.cache.purchases || {})[r.purchaseId];
    // A purchase that was already received keeps its status.
    if (p && !['received', 'partial'].includes(p.status)) {
      up[`purchases/${r.purchaseId}/status`] = status;
      up[`purchases/${r.purchaseId}/decidedAt`] = now;
    }
    busy.add(r.id); draw();
    try {
      await LIVE.update(up);
      toast(`${r.title} — ${t(yes ? 'pm.approvedOk' : 'pm.rejectedOk')}`, { tone: yes ? 'success' : 'danger', ic: yes ? 'check' : 'x' });
    } catch (e) {
      toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' });
    } finally { busy.delete(r.id); draw(); }
  }

  async function remove(r) {
    if (r.status === 'pending' && r.p) { toast(t('pm.rejectFirst'), { tone: 'info', ic: 'info' }); return; }
    const ok = await confirmDialog({ title: t('pm.deleteQ'), body: summary(r) + `<p class="cf-note">${t('pm.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const up = { [`pendingStockMoves/${r.id}`]: null };
    if (r.p) up[`purchases/${r.purchaseId}/pendingMoveId`] = null;
    busy.add(r.id); draw();
    try { await LIVE.update(up); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    finally { busy.delete(r.id); draw(); }
  }

  function details(r) {
    const p = r.p; if (!p) return;
    const its = items$(p.items);
    const d = $('#drawer .drawer');
    d.oninput = null; d.classList.remove('wide');
    const ps = PSTATUS[p.status] || 'pending';
    d.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('cart')}</span><div><h2 id="drawerTitle">${esc(r.title)}</h2><p>${t('pending-movements')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">
        <div class="info-grid">
          ${[[t('c.supplier'), r.supplier], [t('c.branch'), branchLabel(r.branchId)], [t('pm.storekeeper'), r.storekeeper], [t('pm.invNo'), p.purchaseInvoiceNumber || '-'], [t('c.date'), fmtDateTime(p.createdAt)]].map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}
          <div><small>${t('pm.purchaseStatus')}</small><b><span class="badge tone-${TONE[ps] || PM_TONE[ps] || 'neutral'}"><i></i>${t('st.' + ps)}</span></b></div>
          ${r.m.decidedByName ? `<div class="wide"><small>${t('pm.decidedBy')}</small><b>${esc(r.m.decidedByName)} · ${fmtDateTime(r.m.decidedAt)}</b></div>` : ''}
        </div>
        <div class="dr-items"><table class="dt compact"><thead><tr><th>${t('c.name')}</th><th class="end">${t('c.qty')}</th><th class="end">${t('pm.unitPrice')}</th><th class="end">${t('pm.latestCost')}</th><th class="end">${t('c.total')}</th></tr></thead>
          <tbody>${its.map(it => `<tr><td data-label="${t('c.name')}">${esc(itemLabel(it))}</td><td data-label="${t('c.qty')}" class="end num">${fmtNum(Number(it.qty || 0), 3)}</td><td data-label="${t('pm.unitPrice')}" class="end num">${fmtMoney(unitPrice(it))}</td><td data-label="${t('pm.latestCost')}" class="end num">${latestText(it)}</td><td data-label="${t('c.total')}" class="end num">${fmtMoney(Number(it.qty || 0) * unitPrice(it))}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${t('emptyTitle')}</td></tr>`}</tbody>
          <tfoot><tr><td colspan="4">${t('pm.value')}</td><td class="end num"><b>${fmtMoney(r.total || 0)}</b></td></tr></tfoot></table></div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-pmd="print">${icon('printer')}<span>${t('print')}</span></button>
        ${r.status === 'pending' ? `<span class="tb-spacer"></span><button class="btn btn-reject" data-pmd="reject">${icon('x')}<span>${t('pm.reject')}</span></button><button class="btn btn-primary" data-pmd="approve">${icon('check')}<span>${t('pm.approve')}</span></button>` : ''}</footer>`;
    openLayer('#drawer');
    d.onclick = e => {
      const b = e.target.closest('[data-pmd]'); if (!b) return;
      if (b.dataset.pmd === 'print') print(r);
      else { closeLayers(); decide(r, b.dataset.pmd === 'approve' ? 'approved' : 'rejected'); }
    };
  }

  function print(r) {
    const p = r.p; if (!p) return;
    const its = items$(p.items);
    printDoc(r.title,
      [[t('c.supplier'), r.supplier], [t('c.branch'), branchLabel(r.branchId)], [t('c.date'), fmtDateTime(p.createdAt)], [t('pm.storekeeper'), r.storekeeper], [t('pm.purchaseStatus'), t('st.' + (PSTATUS[p.status] || 'pending'))], [t('c.items'), String(its.length)]],
      [t('c.name'), t('c.qty'), t('pm.unitPrice'), t('c.total')],
      its.map(it => [itemLabel(it), fmtNum(Number(it.qty || 0), 3), moneyPlain(unitPrice(it)), moneyPlain(Number(it.qty || 0) * unitPrice(it))]),
      [t('pm.value'), moneyPlain(r.total || 0)]);
  }

  function exportCsv() {
    const rows = filtered(pmRows());
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const head = [t('pm.request'), t('c.supplier'), t('c.branch'), t('c.date'), t('pm.storekeeper'), t('pm.value'), t('c.status'), t('pm.decidedBy')];
    const csv = [head.map(q).join(','), ...rows.map(r => [r.title, r.supplier, branchLabel(r.branchId), fmtDateTime(r.createdAt), r.storekeeper, r.total == null ? '' : r.total.toFixed(3), t('st.' + r.status), r.m.decidedByName || ''].map(q).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `pending-stock-moves-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('exported'));
  }

  /* ---- events ---- */
  let deb;
  $('#pmQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 120); });
  $('#pmBranch', view).addEventListener('change', e => { st.branch = e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const chip = e.target.closest('[data-status]');
    if (chip) { st.status = chip.dataset.status; st.page = 1; draw(); return; }
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-pm]'); if (!b) return;
    if (b.dataset.pm === 'export') { if (allLoaded()) exportCsv(); return; }
    const r = find(b.closest('tr').dataset.id); if (!r) return;
    ({ view: details, print, approve: x => decide(x, 'approved'), reject: x => decide(x, 'rejected'), delete: remove })[b.dataset.pm](r);
  });

  // Card pages: pending value by request, and what was approved / rejected in the last 30 days
  const closeDrill = kpiDrills(view, { paths: PM_PATHS, ready: () => LIVE.loaded(PM_PATHS), build: kind => {
    const all = pmRows(), month = Date.now() - 30 * 86400000;
    const list = kind === 'value' ? all.filter(r => r.status === 'pending').sort((a, b) => (b.total || 0) - (a.total || 0))
      : all.filter(r => r.status === kind && Number(r.m.decidedAt || r.createdAt) >= month).sort((a, b) => Number(b.m.decidedAt || b.createdAt) - Number(a.m.decidedAt || a.createdAt));
    const sum = list.reduce((s, r) => s + (r.total || 0), 0), decidedCol = kind !== 'value';
    const lbl = { value: 'pm.kValue', approved: 'pm.kApproved', rejected: 'pm.kRejected' }[kind];
    if (!lbl) return null;
    return { title: t(lbl), sub: t('pm.sub'), ic: { value: 'wallet', approved: 'check', rejected: 'x' }[kind], file: `pending-moves-${kind}.xlsx`,
      onRow: id => { const r = pmRows().find(x => x.id === id); if (r && r.p) details(r); },
      chips: [[t('kd.rows'), fmtNum(list.length)], [t('pm.value'), fmtMoney(sum)], [t('kd.branch'), fmtNum(new Set(list.map(r => r.branchId)).size)]],
      cols: [{ h: t('pm.request') }, { h: t('c.supplier') }, { h: t('c.branch') }, { h: t('pm.storekeeper') }, { h: t('c.items'), end: 1 }, { h: t('pm.value'), end: 1 }, { h: t('c.date') }, ...(decidedCol ? [{ h: t('pm.decidedBy') }] : [])],
      rows: list.map(r => ({ id: r.id, text: `${r.title} ${r.supplier} ${branchLabel(r.branchId)} ${r.storekeeper}`,
        cells: [`<b>${esc(r.title)}</b>`, esc(r.supplier), esc(branchLabel(r.branchId) || '-'), esc(r.storekeeper), fmtNum(r.items.length), r.total == null ? '—' : fmtMoney(r.total), `<span class="date">${fmtDateTime(r.createdAt)}</span>`,
          ...(decidedCol ? [`<span class="cell-2"><b>${esc(r.m.decidedByName || '-')}</b>${r.m.decidedAt ? `<small class="muted">${fmtDateTime(r.m.decidedAt)}</small>` : ''}</span>`] : [])],
        x: { [t('pm.request')]: r.title, [t('c.supplier')]: r.supplier, [t('c.branch')]: branchLabel(r.branchId) || '', [t('pm.storekeeper')]: r.storekeeper, [t('c.items')]: r.items.length, [t('pm.value')]: r.total == null ? '' : +r.total.toFixed(3), [t('c.date')]: fmtDateTime(r.createdAt),
          ...(decidedCol ? { [t('pm.decidedBy')]: r.m.decidedByName || '', [t('st.' + kind)]: r.m.decidedAt ? fmtDateTime(r.m.decidedAt) : '' } : {}) } })) };
  } });
  const unsub = LIVE.watch(PM_PATHS, draw);
  draw();
  return () => { unsub(); closeDrill(); };
};
