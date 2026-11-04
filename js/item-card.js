/* بطاقة الصنف — item card: every stock movement of one item (or of every item in a category,
   supplier or storage place) at one branch over a period, with the running balance.
   Same as the old page: item / classification pickers, branch, period with quick periods,
   movement-type filter, opening balance worked back from today's real balance, totals,
   Excel, print, and each row opens its document. Fixed against the old page:
   - lines of multi-product production vouchers (the old page only read the first product)
   - cashier transfer requests (sent from the warehouse / received by the branch) were missing,
     so the opening balance came out wrong
   - sales are counted from what the invoice really took from stock (stockMovements); invoices
     saved before stock tracking are listed but no longer move the balance
   - a stocktake counted per batch is one change per item, not one per line
   - the list follows live data, and a batch barcode scan finds its product */

LIVE_ROUTES.add('item-card');
// What the filters need: shown at once
const IC_BASE = ['products', 'stockMaterials', 'units', 'branches', 'productCategories', 'materialCategories', 'suppliers', 'storageLocations'];
// The movements: loaded when a card is first shown. Sale invoices are many, so only those from the
// month the period starts in are read (older ones never change the period or its opening balance).
const IC_MOVES = ['stockIssue', 'transfers', 'cashierTransfers', 'transferRequests', 'stockReturn', 'scrapReturn', 'supplierReturns', 'purchases', 'purchaseReceipts',
  'production', 'productionStaff', 'inventoryCount'];
let icOrdersPath = 'orders';
const icOrdersFrom = from => { const d = new Date(`${from}T00:00:00`); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const IC_TYPES = ['issue', 'order', 'transfer', 'cashierRequest', 'cashierTransfer', 'stockReturn', 'scrapReturn', 'supplierReturn', 'production', 'inventory', 'purchaseReceipt'];
const icTypeName = k => t(`ic.t.${k}`);

/* Every movement of one item at one branch, then the period with its running balance.
   The opening balance is today's real balance minus everything that happened since the period
   started, so it is right even when the item's early history is incomplete. */
// An invoice number as typed on an issue voucher or saved on the order ("0347" = "347")
const icNo = v => { const s = toLatin(String(v ?? '')).trim(); return /^\d+$/.test(s) ? String(+s) : s; };

/* Every movement of one item at one branch, unsorted */
function icRaw(entry, branchId) {
  const { type, id } = entry, item = itemData(type, id) || {};
  const main = mainBranch(), out = [];
  const name = nameOf(item) || '-', code = item.code || '-';
  const defPrice = type === 'product' ? Number(item.price || 0) : Number(item.cost || 0);
  const same = it => it && ivType(it) === type && String(it.itemId || it.id || it.productId || '') === String(id);
  const lineQty = it => Number(it.qty ?? it.quantity ?? it.count ?? 0) || 0;
  const add = (rec, doc, qty, num, label, ts, o = {}) => out.push({
    rec, doc, qty: Number(qty || 0), num: num ?? '-', label, note: o.note || '', ts: Number(ts || 0), price: o.price ?? defPrice, counts: o.counts !== false,
    unitId: o.unitId || item.unitId || null, invNo: o.invNo || '-', invValue: o.invValue ?? null, keeper: o.keeper || '-', staff: o.staff || '-', batch: o.batch || '', name, code, item: entry,
    br: branchId, link: o.link || '', links: o.links || []
  });
  const each = (path, fn) => Object.entries(LIVE.cache[path] || {}).forEach(([rid, r]) => { if (r && typeof r === 'object') fn({ id: rid, ...r }); });
  const orders = Object.entries(LIVE.cache[icOrdersPath] || {}).filter(([, o]) => o && !(o.status === 'cancelled' || o.isCancelled === true));
  const brName = b => branchLabel(b) || '-';
  const batchOf = it => (typeof batchNote === 'function' ? batchNote(it) : '');

  // صرف: only "production" and "use" take stock; an "order" issue is already taken by its sale
  each('stockIssue', r => {
    if ((r.branchId || main) !== branchId) return;
    items$(r.items).filter(same).forEach(it => {
      let price = null;
      if (r.issueType === 'order') {
        const o = icPickSale(orders.filter(([, x]) => [x.invoiceNumber, x.orderNumber].map(icNo).includes(icNo(r.invoiceNumber))).map(([oid, x]) => ({ id: oid, ...x })), { pid: id, br: branchId, ts: Number(r.createdAt || 0) });
        const ol = o && items$(o.items).find(l => type === 'product' && String(l.productId || l.itemId || l.id) === String(id));
        price = ol ? Number(ol.price || 0) : null;
      }
      add(r, 'issue', -lineQty(it), r.issueNumber, `${icTypeName('issue')} · ${issueTypeLabel(r.issueType)}`, r.createdAt,
        { price, counts: issueDeducts(r.issueType), note: r.issueType === 'order' ? `${t('ic.forInvoice')} #${r.invoiceNumber || '-'} · ${t('ic.noStock')}` : '', batch: batchOf(it), link: r.issueType === 'order' ? icNo(r.invoiceNumber) : '' });
    });
  });
  // فواتير البيع: every sale takes its quantity from the invoice's branch (the cashier's own record of
  // what it took is used when the invoice has one)
  if (type === 'product') orders.forEach(([oid, o]) => {
    const lines = items$(o.items).filter(l => String(l.productId || l.itemId || l.id) === String(id));
    if (!lines.length) return;
    const mv = o.stockDeducted && o.stockMovements ? o.stockMovements[id] : null;
    const price = Number(lines[0].price ?? lines[0].unitPrice ?? 0);
    const rec = { id: oid, ...o }, num = o.invoiceNumber || o.orderNumber || oid;
    const br = mv ? mv.branchId : o.stockBranchId || o.branchId;
    if (br !== branchId) return;
    add(rec, 'order', -(mv ? Number(mv.quantity || 0) : lines.reduce((s, l) => s + lineQty(l), 0)), num, icTypeName('order'), o.createdAt || o.timestamp,
      { price, links: [o.invoiceNumber, o.orderNumber].map(icNo).filter(Boolean) });
  });
  each('transfers', r => {
    const into = r.toBranchId === branchId, outOf = r.fromBranchId === branchId; if (!into && !outOf) return;
    items$(r.items).filter(same).forEach(it => add(r, 'transfer', (into ? 1 : -1) * lineQty(it), r.transferNumber, `${icTypeName('transfer')} ${t(into ? 'ic.in' : 'ic.out')}`, r.createdAt,
      { note: into ? `${t('ic.from')} ${brName(r.fromBranchId)}` : `${t('ic.to')} ${brName(r.toBranchId)}`, batch: batchOf(it) }));
  });
  // طلبات تحويل الكاشير: the warehouse sends, then the branch confirms what it received
  each('transferRequests', r => {
    const its = items$(r.items).filter(same); if (!its.length) return;
    const fromBr = r.stockSentFromBranchId || main, toBr = r.stockReceivedBranchId || r.branchId;
    if (r.stockSentAt && fromBr === branchId) {
      const q = its.reduce((s, it) => s + Number(it.sentQty || 0), 0);
      if (q) add(r, 'cashierRequest', -q, r.requestNumber, `${icTypeName('cashierRequest')} ${t('ic.out')}`, r.stockSentAt, { note: `${t('ic.to')} ${brName(r.branchId)}`, batch: its.map(batchOf).filter(Boolean).join(' · ') });
    }
    if (r.stockReceivedAt && toBr === branchId) {
      const q = its.reduce((s, it) => s + Number(it.receivedQty || 0), 0);
      if (q) add(r, 'cashierRequest', q, r.requestNumber, `${icTypeName('cashierRequest')} ${t('ic.in')}`, r.stockReceivedAt, { note: `${t('ic.from')} ${brName(fromBr)}` });
    }
  });
  // Old cashier transfers (kept for history)
  each('cashierTransfers', r => {
    const into = r.toBranchId === branchId, outOf = r.fromBranchId === branchId; if (!into && !outOf) return;
    const got = ['received', 'partial_received'].includes(r.status);
    items$(r.items).filter(same).forEach(it => {
      if (outOf) add(r, 'cashierTransfer', -Number((got ? it.receivedQty ?? lineQty(it) : lineQty(it)) || 0), r.transferNumber, `${icTypeName('cashierTransfer')} ${t('ic.out')}`, r.createdAt);
      if (into && got) add(r, 'cashierTransfer', Number(it.receivedQty ?? lineQty(it)), r.transferNumber, `${icTypeName('cashierTransfer')} ${t('ic.in')}`, r.receivedAt || r.createdAt);
    });
  });
  each('stockReturn', r => {
    const toBr = r.toBranchId || main, into = toBr === branchId, outOf = r.fromBranchId === branchId; if (!into && !outOf) return;
    items$(r.items).filter(same).forEach(it => add(r, 'stockReturn', (into ? 1 : -1) * lineQty(it), r.stockReturnNumber, `${icTypeName('stockReturn')} ${t(into ? 'ic.in' : 'ic.out')}`, r.createdAt,
      { note: into ? `${t('ic.from')} ${brName(r.fromBranchId)}` : `${t('ic.to')} ${brName(toBr)}`, batch: batchOf(it) }));
  });
  each('scrapReturn', r => {
    if (r.branchId !== branchId) return;
    items$(r.items).filter(same).forEach(it => add(r, 'scrapReturn', -lineQty(it), r.scrapReturnNumber, icTypeName('scrapReturn'), r.createdAt, { batch: batchOf(it) }));
  });
  each('supplierReturns', r => {
    const p = (LIVE.cache.purchases || {})[r.purchaseId];
    if (((p && p.branchId) || r.branchId || main) !== branchId) return;
    items$(r.items).filter(same).forEach(it => add(r, 'supplierReturn', -lineQty(it), r.returnNumber, icTypeName('supplierReturn'), r.createdAt,
      { price: it.unitPrice != null ? Number(it.unitPrice) : null, note: r.supplierName || '' }));
  });
  // إنتاج: every product line of the voucher, not only the first
  each('production', r => {
    if ((r.branchId || main) !== branchId) return;
    prItems(r).filter(same).forEach(it => add(r, 'production', it.qty, r.productionNumber, icTypeName('production'), r.createdAt,
      { price: null, unitId: it.unitId || item.unitId, keeper: r.storekeeperName || '-', staff: ivStaffLabel(r),
        batch: type === 'product' ? batchLabel(batchKeyOf(it.productionDate || r.productionDate, it.expiryDate || r.expiryDate)) : '' }));
  });
  // جرد: the change the count made (counted − before); lines of the same item (batches) are one change
  each('inventoryCount', r => {
    if (r.branchId !== branchId) return;
    const its = items$(r.items).filter(same); if (!its.length) return;
    const prevLine = its.find(it => it.previousQty !== undefined && it.previousQty !== null);
    const counted = its.reduce((s, it) => s + lineQty(it), 0);
    add(r, 'inventory', prevLine ? counted - Number(prevLine.previousQty || 0) : 0, r.countNumber, icTypeName('inventory'), r.createdAt,
      { note: prevLine ? `${t('ic.counted')} ${qtyFmt(counted)} · ${t('ic.before')} ${qtyFmt(prevLine.previousQty)}` : t('ic.noBefore') });
  });
  each('purchaseReceipts', r => {
    const p = (LIVE.cache.purchases || {})[r.purchaseId];
    if ((r.branchId || (p && p.branchId) || main) !== branchId) return;
    items$(r.items).filter(same).forEach(it => {
      const price = it.cost ?? it.unitPrice ?? it.price ?? null, q = lineQty(it);
      add({ ...r, purchaseNumber: (p && p.purchaseNumber) || r.purchaseNumber }, 'purchaseReceipt', q, (p && p.purchaseNumber) || r.receiptNumber || r.purchaseId, icTypeName('purchaseReceipt'), r.createdAt,
        { price, invNo: r.purchaseInvoiceNumber || (p && p.purchaseInvoiceNumber) || '-', invValue: q * Number(price || 0), note: r.supplierName || '' });
    });
  });

  return out;
}

/* Invoice numbers restart per branch (and the cashier's numbering was reset once), so one number can
   name several invoices — e.g. 2023 is both a Yarmouk invoice and a main-branch one. An issue's
   invoice is the one of its branch holding its product, closest before it. Invoices that aren't
   loaded (made before the period's month) are looked up once on the server; the card then redraws. */
const IC_SALES = new Map();
let icSaleFound = null;
const icHas = (o, pid) => items$(o.items).some(l => String(l.productId || l.itemId || l.id) === String(pid));
const icSaleOf = (o, ctx) => (o.stockBranchId || o.branchId) === ctx.br && icHas(o, ctx.pid);
function icSaleCands(no, ctx) {
  const loaded = Object.entries(LIVE.cache[icOrdersPath] || {}).filter(([, o]) => o && typeof o === 'object' && [o.invoiceNumber, o.orderNumber].map(icNo).includes(no)).map(([id, o]) => ({ id, ...o }));
  if (!loaded.some(o => icSaleOf(o, ctx)) && !IC_SALES.has(no)) {
    IC_SALES.set(no, null);
    const raw = /^\d+$/.test(no) ? [no, Number(no)] : [no];
    Promise.all(['invoiceNumber', 'orderNumber'].map(child => LIVE.findAll('orders', child, raw)))
      .then(found => { IC_SALES.set(no, found.flat()); if (icSaleFound) icSaleFound(); })
      .catch(() => IC_SALES.delete(no));
  }
  const extra = (IC_SALES.get(no) || []).filter(o => !loaded.some(l => l.id === o.id));
  return [...loaded, ...extra];
}
function icPickSale(list, ctx) {
  const rank = o => { const ts = Number(o.createdAt || o.timestamp || 0); return [(icSaleOf(o, ctx) ? 4 : 0) + (icHas(o, ctx.pid) ? 1 : 0) + (ts <= ctx.ts ? 1 : 0), -Math.abs(ctx.ts - ts)]; };
  return list.map(o => [rank(o), o]).sort((a, b) => b[0][0] - a[0][0] || b[0][1] - a[0][1]).map(x => x[1])[0] || null;
}

/* The item's movements at one branch ('' = all branches) over a period, with the running balance.
   The opening balance is today's real balance minus everything that happened since the period
   started, so it is right even when the item's early history is incomplete.
   An issue voucher made for a sale sits right under that sale's invoice. */
function icMoves(entry, branchId, from, to) {
  const item = itemData(entry.type, entry.id) || {}, name = nameOf(item) || '-', code = item.code || '-';
  const branches = branchId ? [branchId] : Object.keys(LIVE.cache.branches || {});
  let out = branches.flatMap(b => icRaw(entry, b));
  if (!branchId) out.forEach(m => { m.note = [branchLabel(m.br), m.note].filter(Boolean).join(' · '); });
  out.sort((a, b) => a.ts - b.ts);
  // Each "order" issue goes under its own invoice. When that invoice isn't among these movements
  // (before the period — its stock is already in the opening balance — or in another branch, or
  // cancelled) it still shows above the issue, for reference only: it takes no stock in this card.
  const saleRow = new Map(out.filter(m => m.doc === 'order').map(m => [m.rec.id, m]));
  const parent = new Map(), refs = new Map();
  if (entry.type === 'product') out.filter(m => m.doc === 'issue' && m.link).forEach(m => {
    const o = icPickSale(icSaleCands(m.link, { pid: entry.id, br: m.br, ts: m.ts }), { pid: entry.id, br: m.br, ts: m.ts }); if (!o) return;
    if (saleRow.has(o.id)) { parent.set(m, saleRow.get(o.id)); return; }
    if (!refs.has(o.id)) {
      const lines = items$(o.items).filter(l => String(l.productId || l.itemId || l.id) === String(entry.id));
      const br = o.stockBranchId || o.branchId, ts = Number(o.createdAt || o.timestamp || 0);
      const why = oCancelled(o) ? t('ic.saleCancelled') : br && br !== m.br ? `${branchLabel(br) || '-'} · ${t('ic.saleOther')}` : t('ic.saleEarlier');
      refs.set(o.id, { ...m, rec: o, doc: 'order', qty: -lines.reduce((s, l) => s + (Number(l.qty ?? l.quantity ?? l.count ?? 0) || 0), 0), num: o.invoiceNumber || o.orderNumber || o.id, label: icTypeName('order'),
        note: why, ts, counts: false, price: lines.length ? Number(lines[0].price ?? lines[0].unitPrice ?? 0) : null, invNo: '-', invValue: null, batch: '', link: '', links: [m.link], ref: true, at: m.ts });
    }
    parent.set(m, refs.get(o.id));
  });
  out.push(...refs.values());
  out.sort((a, b) => (a.at ?? a.ts) - (b.at ?? b.ts));
  const under = new Map();
  out = out.filter(m => {
    const p = parent.get(m) || null;
    if (!p) return true;
    m.child = true; m.at = p.ref ? m.ts : p.ts; if (!under.has(p)) under.set(p, []); under.get(p).push(m);
    return false;
  }).flatMap(m => { const kids = under.get(m) || []; if (kids.length) m.parent = true; kids.forEach((k, i) => { k.more = i < kids.length - 1; }); return [m, ...kids]; });
  const when = m => m.at ?? m.ts;
  const start = from ? dayStart(from) : -Infinity, end = to ? dayEnd(to) : Infinity;
  const now = branches.reduce((s, b) => s + stockAt(item, b), 0);
  const opening = now - out.filter(m => when(m) >= start && m.counts).reduce((s, m) => s + m.qty, 0);
  let bal = opening;
  const period = out.filter(m => when(m) >= start && when(m) <= end).map(m => { if (m.counts) bal += m.qty; return { ...m, balance: bal }; });
  return [{ opening: true, rec: null, doc: 'opening', qty: null, num: '-', label: t('ic.opening'), note: '', ts: Number.isFinite(start) ? start : (period[0] || {}).ts || 0, price: null, counts: false,
    unitId: item.unitId || null, invNo: '-', invValue: null, keeper: '-', staff: '-', batch: '', name, code, item: entry, balance: opening }, ...period];
}

/* The items a classification stands for */
function icClassItems(cls) {
  if (!cls) return [];
  const all = [['product', LIVE.cache.products], ['material', LIVE.cache.stockMaterials]].flatMap(([type, list]) => Object.entries(list || {}).map(([id, item]) => ({ type, id, item })));
  if (cls.type === 'suppliers') return supplierItems(cls.id).map(e => ({ type: e.type, id: e.id, item: e.item }));
  if (cls.type === 'storage') return all.filter(e => (e.item.storageLocationId || '') === cls.id);
  const cats = cls.type === 'products' ? LIVE.cache.productCategories || {} : LIVE.cache.materialCategories || {};
  const ok = new Set([cls.id]), queue = [cls.id];
  while (queue.length) { const cur = queue.shift(); Object.entries(cats).forEach(([cid, c]) => { if ((c && c.parentId) === cur && !ok.has(cid)) { ok.add(cid); queue.push(cid); } }); }
  return all.filter(e => e.type === (cls.type === 'products' ? 'product' : 'material') && ok.has(e.item.categoryId));
}

/* Opening a movement's document without leaving the page: the document's page runs unseen in a
   detached box and shows only its details drawer (edit and print work as on that page). The
   unseen page stops once the drawer is closed. */
let DOC_OPEN = null, DOC_HOST = null;
function openDocHere(route, id) {
  closeDocHost();
  if (!PAGES[route]) return;
  DOC_OPEN = { route, id };
  const stop = PAGES[route](document.createElement('div'));
  const dw = $('#drawer'); let timer = 0;
  const mo = new MutationObserver(() => {
    clearTimeout(timer);
    if (!dw.classList.contains('open')) timer = setTimeout(() => { if (!dw.classList.contains('open')) closeDocHost(); }, 600);
  });
  mo.observe(dw, { attributes: true, attributeFilter: ['class'] });
  DOC_HOST = { stop, mo };
}
function closeDocHost() {
  if (!DOC_HOST) return;
  const h = DOC_HOST; DOC_HOST = null; h.mo.disconnect();
  if (typeof h.stop === 'function') h.stop();
}
function takeDoc(route, paths, fn) {
  if (!DOC_OPEN || DOC_OPEN.route !== route) return;
  const { id } = DOC_OPEN; DOC_OPEN = null;
  LIVE.whenLoaded(paths).then(() => fn(id));
}

const icRange = preset => {
  const d = new Date(), ymd = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const start = new Date(d); let end = new Date(d);
  if (preset === 'week') start.setDate(d.getDate() - 6);
  else if (preset === 'month') start.setDate(1);
  else if (preset === 'lastMonth') { start.setMonth(d.getMonth() - 1, 1); end = new Date(d.getFullYear(), d.getMonth(), 0); }
  else if (preset === 'all') start.setFullYear(2020, 0, 1);
  return { from: ymd(start), to: ymd(end) };
};

PAGES['item-card'] = view => {
  const st = (S.ic ||= { item: null, cls: null, branch: '', ...icRange('month'), types: [...IC_TYPES], ran: false });
  let first = true;
  view.innerHTML = `
    ${pageHeader('item-card', `<button class="btn btn-ghost" data-ic="export">${icon('download')}<span>${t('iv.excel')}</span></button>
      <button class="btn btn-ghost" data-ic="print">${icon('printer')}<span>${t('iv.printReport')}</span></button>`, t('ic.sub'))}
    <section class="card ic-filters" data-anim>
      <div class="ic-grid">
        <div class="field ic-span2"><label for="icItem">${t('ic.item')}</label>
          <div class="ic-pick"><button type="button" class="ic-pick-btn" id="icItem" data-ic="item"></button><button type="button" class="btn-icon sm" data-ic="clearItem" aria-label="${t('ic.clear')}" data-tip="${t('ic.clear')}">${icon('x')}</button></div></div>
        <div class="field ic-span2"><label for="icCls">${t('ic.cls')}</label>
          <div class="ic-pick"><button type="button" class="ic-pick-btn" id="icCls" data-ic="cls"></button><button type="button" class="btn-icon sm" data-ic="clearCls" aria-label="${t('ic.clear')}" data-tip="${t('ic.clear')}">${icon('x')}</button></div></div>
        <div class="field"><label for="icFrom">${t('c.from')} <em>*</em></label><input type="date" id="icFrom"></div>
        <div class="field"><label for="icTo">${t('c.to')} <em>*</em></label><input type="date" id="icTo"></div>
        <div class="field"><label for="icTypes">${t('ic.types')}</label><div class="ms" id="icMs"><button type="button" class="ms-btn" id="icTypes" aria-haspopup="listbox" aria-expanded="false"><span></span>${icon('chevDown')}</button>
          <div class="ms-pop" hidden><label class="search-field">${icon('search')}<input type="search" id="icTypeQ" placeholder="${t('search')}" autocomplete="off"></label><div class="ms-list" id="icTypeList"></div></div></div></div>
      </div>
      <div class="ic-branches"><span class="ic-lbl">${t('c.branch')}</span><div class="chips" id="icBr" role="group" aria-label="${t('c.branch')}"></div></div>
      <div class="ic-bar">
        <div class="chips" id="icPresets">${['today', 'week', 'month', 'lastMonth', 'all'].map(p => `<button type="button" class="chip" data-preset="${p}">${t(`ic.p.${p}`)}</button>`).join('')}</div>
        <span class="tb-spacer"></span>
        <button class="btn btn-primary" data-ic="run">${icon('list')}<span>${t('ic.run')}</span></button>
      </div>
      <p class="err ic-err" id="icErr" role="alert"></p>
    </section>
    <section class="kpis ic-stats" id="icStats" hidden></section>
    <div class="ic-cards" id="icCards" data-anim></div>`;

  const brArg = () => (st.branch === '*' ? '' : st.branch);
  const entryOf = () => (st.item && itemData(st.item.type, st.item.id) ? { ...st.item, item: itemData(st.item.type, st.item.id) } : null);
  const targets = () => { const e = entryOf(); return e ? [e] : icClassItems(st.cls); };
  const typeSet = () => new Set(st.types);
  const onlyProduction = () => st.types.length === 1 && st.types[0] === 'production';
  const cols = () => [t('ic.date'), t('ic.code'), t('c.name'), t('ic.type'), t('ic.doc'), t('ic.qty'),
    ...(onlyProduction() ? [t('pm.storekeeper'), t('iv.staffOne')] : [t('ic.invNo'), t('ic.invValue')]), t('ic.price'), t('ic.balance')];
  const unitTxt = m => unitName(m.unitId) || '';
  const qtyTxt = m => (m.qty == null ? '-' : `${m.qty > 0 ? '+' : ''}${qtyFmt(m.qty)}${unitTxt(m) ? ` ${unitTxt(m)}` : ''}`);
  const money = v => (v == null || v === '' ? '-' : moneyPlain(Number(v)));
  let moves = [];
  const openCards = new Set(); // classification cards the user opened
  const shown = () => { const set = typeSet(); return moves.filter(m => m.opening || set.has(m.doc)); };

  function validate() {
    const err = $('#icErr', view); err.textContent = '';
    if (!targets().length) { err.textContent = st.cls ? t('ic.clsEmpty') : t('ic.pickItem'); return false; }
    if (!st.from || !st.to) { err.textContent = t('ic.pickPeriod'); return false; }
    if (st.from > st.to) { err.textContent = t('ic.badPeriod'); return false; }
    return true;
  }
  function compute() { moves = targets().flatMap(e => icMoves(e, brArg(), st.from, st.to)); }

  function drawFilters() {
    const e = entryOf();
    $('#icItem', view).innerHTML = e ? `<b>${esc(nameOf(e.item) || '-')}</b><small>${esc(e.item.code || '')} · ${typeLabel(e.type)}</small>` : `<span class="muted">${t('ic.pickItemPh')}</span>`;
    $('#icCls', view).innerHTML = st.cls ? `<b>${esc(icClsLabel(st.cls))}</b><small>${icClassItems(st.cls).length} ${t('pu.itemsWord')}</small>` : `<span class="muted">${t('ic.pickClsPh')}</span>`;
    $$('[data-ic="clearItem"]', view)[0].hidden = !e; $$('[data-ic="clearCls"]', view)[0].hidden = !st.cls;
    if (st.branch !== '*' && !(LIVE.cache.branches || {})[st.branch]) st.branch = mainBranch() || '*';
    setHtml($('#icBr', view), [['*', t('ic.allBranches')], ...Object.entries(LIVE.cache.branches || {}).sort((a, b) => (b[1].isMain ? 1 : 0) - (a[1].isMain ? 1 : 0)).map(([id, b]) => [id, nameOf(b) || id])]
      .map(([id, label]) => `<button type="button" class="chip${st.branch === id ? ' on' : ''}" data-br="${esc(id)}" aria-pressed="${st.branch === id}">${esc(label)}</button>`).join(''));
    $('#icFrom', view).value = st.from; $('#icTo', view).value = st.to;
    $$('#icPresets [data-preset]', view).forEach(c => { const r = icRange(c.dataset.preset); c.classList.toggle('on', r.from === st.from && r.to === st.to); });
    const all = st.types.length === IC_TYPES.length;
    $('#icTypes span', view).textContent = all ? t('ic.allTypes') : !st.types.length ? t('ic.noTypes')
      : st.types.slice(0, 2).map(icTypeName).join('، ') + (st.types.length > 2 ? ` (+${st.types.length - 2})` : '');
    drawTypeList();
  }
  function drawTypeList() {
    const q = normQ(($('#icTypeQ', view) || {}).value || ''), set = typeSet();
    const list = IC_TYPES.filter(k => !q || normQ(icTypeName(k)).includes(q));
    $('#icTypeList', view).innerHTML = `<label class="ms-opt ms-all"><input type="checkbox" value="__all" ${set.size === IC_TYPES.length ? 'checked' : ''}><span>${t('ic.all')}</span></label>`
      + (list.length ? list.map(k => `<label class="ms-opt"><input type="checkbox" value="${k}" ${set.has(k) ? 'checked' : ''}><span>${esc(icTypeName(k))}</span></label>`).join('') : `<p class="muted ms-empty">${t('noResults')}</p>`);
  }

  // Totals of one item's rows (the opening row first)
  const totalsOf = list => {
    const real = list.filter(m => !m.opening && m.counts);
    return {
      opening: (list.find(m => m.opening) || {}).balance || 0,
      qIn: real.reduce((s, m) => s + Math.max(0, m.qty), 0),
      qOut: Math.abs(real.reduce((s, m) => s + Math.min(0, m.qty), 0)),
      closing: ([...list].reverse().find(m => m.balance != null) || {}).balance || 0,
      count: list.filter(m => !m.opening).length,
      inv: list.reduce((s, m) => s + Number(m.invValue || 0), 0)
    };
  };
  const rowHtml = m => `<tr data-i="${moves.indexOf(m)}" class="${m.opening ? 'ic-open' : 'ic-row'}${m.counts || m.opening ? '' : ' ic-off'}${m.child ? ' ic-child' : ''}${m.parent ? ' ic-parent' : ''}${m.more ? ' ic-more' : ''}" ${m.opening ? '' : 'tabindex="0"'}>
      <td data-label="${t('ic.date')}"><span class="date">${m.ts ? fmtDateTime(m.ts) : '-'}</span></td>
      <td data-label="${t('ic.code')}"><span class="mono">${esc(m.code)}</span></td>
      <td data-label="${t('c.name')}"><b>${esc(m.name)}</b></td>
      <td data-label="${t('ic.type')}"><span class="cell-2"><b>${esc(m.label)}</b>${m.note ? `<small>${esc(m.note)}</small>` : ''}</span></td>
      <td data-label="${t('ic.doc')}">${m.opening || m.num === '-' ? '-' : `<button class="badge tone-info badge-btn" data-doc>#${esc(m.num)}</button>`}</td>
      <td data-label="${t('ic.qty')}" class="end"><span class="cell-2"><b class="num ${m.qty > 0 ? 'pos' : m.qty < 0 ? 'neg' : ''}">${esc(qtyTxt(m))}</b>${m.batch ? `<small>${esc(m.batch)}</small>` : ''}</span></td>
      ${onlyProduction() ? `<td data-label="${t('pm.storekeeper')}">${esc(m.keeper)}</td><td data-label="${t('iv.staffOne')}">${esc(m.staff)}</td>`
        : `<td data-label="${t('ic.invNo')}" class="end">${esc(m.invNo)}</td><td data-label="${t('ic.invValue')}" class="end num">${esc(money(m.invValue))}</td>`}
      <td data-label="${t('ic.price')}" class="end num">${esc(money(m.price))}</td>
      <td data-label="${t('ic.balance')}" class="end num"><b>${m.balance == null ? '-' : qtyFmt(m.balance)}</b></td></tr>`;
  const head = () => `<tr>${cols().map((c, i) => `<th class="${i >= 5 ? 'end' : ''}">${esc(c)}</th>`).join('')}</tr>`;
  const invTxt = list => (onlyProduction() ? '' : `${t('ic.invValue')}: ${moneyPlain(totalsOf(list).inv)}`);
  // One card: the table of one item, or the start / empty message
  const card = (title, side, body, fold) => `<section class="card table-card ic-card${fold ? ` ic-fold${fold.open ? ' is-open' : ''}` : ''}"${fold ? ` data-k="${esc(fold.k)}"` : ''}>
      <header class="card-head"${fold ? ` role="button" tabindex="0" aria-expanded="${fold.open}" data-fold` : ''}>${title}${fold ? `<span class="ic-chev">${icon('chevDown')}</span>` : `<span class="muted ic-side">${side}</span>`}</header>
      <div class="table-wrap"${fold && !fold.open ? ' hidden' : ''}><table class="dt iv-table ic-table"><thead>${head()}</thead><tbody>${body}</tbody></table></div></section>`;
  const plainTitle = `<h2>${icon('idcard')}${t('item-card')}</h2>`;

  function drawTable() {
    // Shown results follow every filter change, so the button is only needed before the first run
    $('[data-ic="run"]', view).disabled = st.ran;
    const box = $('#icCards', view), list = shown(), n = cols().length;
    const single = !!entryOf();
    // Totals for one item (in classification mode each item's card carries its own)
    const statsEl = $('#icStats', view);
    if (single && st.ran && list.length) {
      const x = totalsOf(list);
      statsEl.hidden = false;
      setKpis(statsEl, [
        kpiCard({ label: t('ic.opening'), value: x.opening, ic: 'layers', tone: 'c3' }),
        kpiCard({ label: t('ic.qIn'), value: x.qIn, ic: 'in', tone: 'c1' }),
        kpiCard({ label: t('ic.qOut'), value: x.qOut, ic: 'out', tone: 'c4' }),
        kpiCard({ label: t('ic.closing'), value: x.closing, ic: 'box', tone: 'c2' }),
        kpiCard({ label: t('ic.count'), value: x.count, ic: 'list', tone: 'c3' })
      ].join(''), first);
    } else { statsEl.hidden = true; statsEl.innerHTML = ''; }
    if (!st.ran) { setHtml(box, card(plainTitle, '', ivEmpty(n, false, 'idcard', t('ic.start'), t('ic.startSub')))); return; }
    if (!list.length) { setHtml(box, card(plainTitle, '', ivEmpty(n, true, 'idcard', t('ic.none'), t('ic.noneSub')))); return; }
    if (single) { setHtml(box, card(plainTitle, invTxt(list), list.map(rowHtml).join(''))); return; }
    // Classification: a card per item, in the order the items were listed
    const groups = new Map();
    list.forEach(m => { const k = `${m.item.type}|${m.item.id}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); });
    setHtml(box, [...groups.values()].map(g => {
      const m0 = g[0], x = totalsOf(g), k = `${m0.item.type}|${m0.item.id}`;
      const title = `<div class="ic-card-title"><h2>${icon(m0.item.type === 'product' ? 'box' : 'layers')}${esc(m0.name)}</h2>
        <span class="ic-totals"><span>${t('ic.opening')} <b>${qtyFmt(x.opening)}</b></span>
          <span>${t('ic.closing')} <b>${qtyFmt(x.closing)}</b></span><span>${t('ic.count')} <b>${x.count}</b></span></span></div>`;
      return card(title, invTxt(g), g.map(rowHtml).join(''), { k, open: openCards.has(k) });
    }).join(''));
  }

  /* The movements' collections, with sale invoices from the period's month on. A later start keeps
     the range already open; an earlier one opens a wider range and closes the old one. */
  let movesSub = null, movesFrom = Infinity, movesPaths = [];
  function needMoves() {
    const from = icOrdersFrom(st.from || '2020-01-01');
    if (movesSub && from >= movesFrom) return;
    const paths = [...IC_MOVES, `orders@timestamp>=${from}`], old = movesSub;
    movesSub = LIVE.watch(paths, draw); movesFrom = from; movesPaths = paths; icOrdersPath = paths.at(-1);
    if (old) old();
  }
  const movesReady = () => !!movesSub && LIVE.complete(movesPaths);
  const loadingCard = () => setHtml($('#icCards', view), card(plainTitle, '', skeletonRows(6, cols().length)));

  function draw() {
    if (!LIVE.loaded(IC_BASE)) { if (first) loadingCard(); return; }
    drawFilters();
    first = false;
    if (st.ran && !(targets().length && st.from && st.to)) { st.ran = false; moves = []; }
    if (st.ran) {
      needMoves();
      icOrdersPath = movesPaths.at(-1);
      if (!movesReady()) { $('[data-ic="run"]', view).disabled = true; $('#icStats', view).hidden = true; loadingCard(); return; }
      compute();
    }
    drawTable();
  }
  function run() { if (!validate()) return; st.ran = true; draw(); }

  /* ---------- pickers ---------- */
  function pickItem() {
    const all = [['product', LIVE.cache.products], ['material', LIVE.cache.stockMaterials]].flatMap(([type, list]) => Object.entries(list || {}).map(([id, item]) => ({ type, id, item })));
    const dr = freshDrawer(true);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('idcard')}</span><div><h2 id="drawerTitle">${t('ic.pickItemT')}</h2><p>${t('ic.pickItemSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body"><label class="search-field ic-q">${icon('search')}<input type="search" id="icQ" placeholder="${t('ic.searchPh')}" autocomplete="off"></label>
        <div class="ic-results" id="icRes" role="listbox"></div></div>`;
    openLayer('#drawer');
    const choose = e => { st.item = { type: e.type, id: e.id }; st.cls = null; closeLayers(); drawFilters(); if (st.ran) run(); else drawTable(); };
    const find = q => { const k = normQ(q); return k ? all.filter(e => normQ([e.item.nameAr, e.item.nameEn, e.item.name, e.item.code, e.item.barcode].filter(Boolean).join(' ')).includes(k)) : all; };
    const exact = raw => {
      const k = normQ(raw); if (!k) return null;
      const hit = all.filter(e => [e.item.code, e.item.barcode].some(c => c && normQ(c) === k));
      if (hit.length === 1) return hit[0];
      const b = parseBatchCode(raw); // a batch label finds its product
      return b ? all.find(e => e.type === 'product' && String(e.id) === String(b.pid)) || null : null;
    };
    const render = () => {
      const list = find($('#icQ', dr).value).slice(0, 60);
      $('#icRes', dr).innerHTML = list.length ? list.map((e, i) => `<button type="button" class="ic-res" data-k="${i}" role="option">
        <span class="cell-2"><b>${esc(nameOf(e.item) || '-')}</b><small class="mono">${esc(e.item.code || '-')}${e.item.barcode ? ` · ${esc(e.item.barcode)}` : ''}</small></span>
        <span class="badge tone-${e.type === 'product' ? 'info' : 'accent'}"><i></i>${typeLabel(e.type)}</span></button>`).join('') : `<p class="muted">${t('noResults')}</p>`;
      $('#icRes', dr)._list = list;
    };
    render();
    $('#icQ', dr).addEventListener('input', render);
    $('#icQ', dr).addEventListener('keydown', e => {
      if (e.key !== 'Enter') return; e.preventDefault();
      const hit = exact(e.target.value) || ((($('#icRes', dr)._list) || []).length === 1 ? $('#icRes', dr)._list[0] : null);
      if (hit) choose(hit); else toast(t('ic.noExact'), { tone: 'info', ic: 'info' });
    });
    $('#icRes', dr).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) choose($('#icRes', dr)._list[+b.dataset.k]); });
    setTimeout(() => $('#icQ', dr).focus(), 300);
  }
  function icClsLabel(c) {
    if (c.type === 'suppliers') { const s = (LIVE.cache.suppliers || {})[c.id] || {}; return `${t('ic.c.suppliers')}: ${nameOf(s) || '-'}${s.phone ? ` (${s.phone})` : ''}`; }
    if (c.type === 'storage') return `${t('ic.c.storage')}: ${nameOf((LIVE.cache.storageLocations || {})[c.id]) || '-'}`;
    const cats = c.type === 'products' ? LIVE.cache.productCategories || {} : LIVE.cache.materialCategories || {};
    return `${t(`ic.c.${c.type}`)}: ${nameOf(cats[c.id]) || '-'}`;
  }
  function pickCls() {
    const d = { type: (st.cls && st.cls.type) || 'products', path: ['', '', ''], target: '' };
    if (st.cls) {
      if (st.cls.type === 'products' || st.cls.type === 'materials') {
        const cats = st.cls.type === 'products' ? LIVE.cache.productCategories || {} : LIVE.cache.materialCategories || {};
        const p = []; let cur = st.cls.id; while (cur && cats[cur] && p.length < 5) { p.unshift(cur); cur = cats[cur].parentId || ''; }
        d.path = [p[0] || '', p[1] || '', p[2] || ''];
      } else d.target = st.cls.id;
    }
    const dr = freshDrawer(true);
    const kids = (cats, parent) => Object.entries(cats).filter(([, c]) => c && (c.parentId || '') === (parent || '')).sort((a, b) => (nameOf(a[1]) || '').localeCompare(nameOf(b[1]) || ''));
    const body = () => {
      const isCat = d.type === 'products' || d.type === 'materials';
      if (isCat) {
        const cats = d.type === 'products' ? LIVE.cache.productCategories || {} : LIVE.cache.materialCategories || {};
        const lvl = (i, parent) => `<div class="field"><label for="icL${i}">${t(`ic.lvl${i}`)}</label><div class="select"><select id="icL${i}" data-l="${i}" ${i && !parent ? 'disabled' : ''}><option value="">${t('iv.choose')}</option>${(i && !parent ? [] : kids(cats, parent)).map(([id, c]) => `<option value="${esc(id)}" ${d.path[i] === id ? 'selected' : ''}>${esc(nameOf(c) || id)}</option>`).join('')}</select>${icon('chevDown')}</div></div>`;
        return lvl(0, '') + lvl(1, d.path[0]) + lvl(2, d.path[1]);
      }
      const list = d.type === 'suppliers' ? Object.entries(LIVE.cache.suppliers || {}).map(([id, s]) => [id, `${nameOf(s) || id}${s.phone ? ` (${s.phone})` : ''}`])
        : Object.entries(LIVE.cache.storageLocations || {}).map(([id, l]) => [id, nameOf(l) || id]);
      return `<div class="field"><label for="icTarget">${t(d.type === 'suppliers' ? 'ic.c.suppliers' : 'ic.c.storage')}</label><div class="select"><select id="icTarget"><option value="">${t('iv.choose')}</option>${list.sort((a, b) => a[1].localeCompare(b[1])).map(([id, l]) => `<option value="${esc(id)}" ${d.target === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('chevDown')}</div></div>`;
    };
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('layers')}</span><div><h2 id="drawerTitle">${t('ic.pickClsT')}</h2><p>${t('ic.pickClsSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body"><div class="field"><label for="icCt">${t('c.type')}</label><div class="select"><select id="icCt">${['products', 'materials', 'suppliers', 'storage'].map(x => `<option value="${x}" ${d.type === x ? 'selected' : ''}>${t(`ic.c.${x}`)}</option>`).join('')}</select>${icon('chevDown')}</div></div>
        <div class="ic-cls" id="icClsBody">${body()}</div><small class="err" id="icClsErr"></small></div>
      <footer class="dr-foot iv-foot"><span class="tb-spacer"></span><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="icClsOk">${icon('check')}<span>${t('ic.apply')}</span></button></footer>`;
    openLayer('#drawer');
    const redraw = () => { $('#icClsBody', dr).innerHTML = body(); };
    dr.addEventListener('change', e => {
      if (e.target.id === 'icCt') { d.type = e.target.value; d.path = ['', '', '']; d.target = ''; redraw(); }
      else if (e.target.dataset.l) { const i = +e.target.dataset.l; d.path[i] = e.target.value; for (let j = i + 1; j < 3; j++) d.path[j] = ''; redraw(); }
      else if (e.target.id === 'icTarget') d.target = e.target.value;
    });
    $('#icClsOk', dr).addEventListener('click', () => {
      const isCat = d.type === 'products' || d.type === 'materials';
      const id = isCat ? d.path[2] || d.path[1] || d.path[0] : d.target;
      if (!id) { $('#icClsErr', dr).textContent = t(isCat ? 'ic.pickCat' : d.type === 'suppliers' ? 'ic.pickSupplier' : 'ic.pickStorage'); return; }
      st.cls = { type: d.type, id }; st.item = null; closeLayers(); drawFilters(); if (st.ran) run(); else drawTable();
    });
  }

  /* ---------- document, export, print ---------- */
  function openDoc(m) {
    const r = m.rec; if (!r) return;
    const go = {
      issue: () => issueDetails(r), order: () => invoiceDetails(r), production: () => openDocHere('production', r.id),
      transfer: () => openDocHere('transfers', r.id), stockReturn: () => openDocHere('return-warehouse', r.id), scrapReturn: () => openDocHere('damaged-returns', r.id),
      inventory: () => openDocHere('stocktake', r.id), supplierReturn: () => openDocHere('supplier-returns', r.id), purchaseReceipt: () => (r.purchaseId ? openDocHere('purchases', r.purchaseId) : null),
      cashierRequest: () => openDocHere('cashier-requests', r.id)
    }[m.doc];
    if (go) go(); else toast(t('ic.noDoc'), { tone: 'info', ic: 'info' });
  }
  const rowsOut = list => list.map(m => [m.ts ? fmtDateTime(m.ts) : '-', m.code, m.name, `${m.label}${m.note ? ` (${m.note})` : ''}`, m.num, `${qtyTxt(m)}${m.batch ? ` — ${m.batch}` : ''}`,
    ...(onlyProduction() ? [m.keeper, m.staff] : [m.invNo, money(m.invValue)]), money(m.price), m.balance == null ? '-' : qtyFmt(m.balance)]);
  const ctx = () => { const e = entryOf(); return e ? `${nameOf(e.item) || '-'} (${typeLabel(e.type)})` : st.cls ? icClsLabel(st.cls) : '-'; };
  function ready() {
    if (!validate()) return null;
    if (!st.ran) run();
    if (!movesReady()) { toast(t('ic.wait'), { tone: 'info', ic: 'info' }); return null; }
    const list = shown(); if (!list.length) { $('#icErr', view).textContent = t('ic.none'); return null; } return list; }
  function exportExcel() {
    const list = ready(); if (!list) return;
    const c = cols();
    excelOut(rowsOut(list).map(r => Object.fromEntries(c.map((h, i) => [h, r[i]]))), 'item-card-report.xlsx');
  }
  function print() {
    const list = ready(); if (!list) return;
    const real = list.filter(m => !m.opening && m.counts);
    const foot = entryOf() ? [[t('ic.qIn'), qtyFmt(real.reduce((s, m) => s + Math.max(0, m.qty), 0))], [t('ic.qOut'), qtyFmt(Math.abs(real.reduce((s, m) => s + Math.min(0, m.qty), 0)))],
      [t('ic.closing'), qtyFmt(([...list].reverse().find(m => m.balance != null) || {}).balance || 0)]] : null;
    printDoc(t('item-card'), [[t('ic.item'), ctx()], [t('c.branch'), st.branch === '*' ? t('ic.allBranches') : branchLabel(st.branch)], [t('ic.period'), `${st.from} → ${st.to}`]], cols(), rowsOut(list), foot);
  }

  /* ---------- events ---------- */
  const ms = $('#icMs', view);
  const msOpen = on => { $('.ms-pop', ms).hidden = !on; $('#icTypes', view).setAttribute('aria-expanded', on); if (on) { drawTypeList(); $('#icTypeQ', view).focus(); } };
  const outside = e => { if (!ms.contains(e.target)) msOpen(false); };
  document.addEventListener('mousedown', outside, true);
  $('#icTypes', view).addEventListener('click', () => msOpen($('.ms-pop', ms).hidden));
  ms.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); msOpen(false); $('#icTypes', view).focus(); } });
  $('#icTypeQ', view).addEventListener('input', drawTypeList);
  $('#icTypeList', view).addEventListener('change', e => {
    const v = e.target.value;
    if (v === '__all') st.types = e.target.checked ? [...IC_TYPES] : [];
    else { const s = typeSet(); e.target.checked ? s.add(v) : s.delete(v); st.types = IC_TYPES.filter(k => s.has(k)); }
    drawFilters(); drawTable();
  });
  $('#icBr', view).addEventListener('click', e => { const c = e.target.closest('[data-br]'); if (!c || c.dataset.br === st.branch) return; st.branch = c.dataset.br; drawFilters(); if (st.ran) run(); });
  $('#icFrom', view).addEventListener('change', e => { st.from = e.target.value; drawFilters(); if (st.ran) run(); });
  $('#icTo', view).addEventListener('change', e => { st.to = e.target.value; drawFilters(); if (st.ran) run(); });
  $('#icPresets', view).addEventListener('click', e => {
    const c = e.target.closest('[data-preset]'); if (!c) return;
    Object.assign(st, icRange(c.dataset.preset)); drawFilters();
    if (targets().length) run();
  });
  view.addEventListener('click', e => {
    const b = e.target.closest('[data-ic]');
    if (b) {
      const a = b.dataset.ic;
      if (a === 'item') pickItem(); else if (a === 'cls') pickCls(); else if (a === 'run') run();
      else if (a === 'export') exportExcel(); else if (a === 'print') print();
      else if (a === 'clearItem') { st.item = null; st.ran = false; draw(); } else if (a === 'clearCls') { st.cls = null; st.ran = false; draw(); }
      return;
    }
    const fh = e.target.closest('[data-fold]'); if (fh) { toggleCard(fh); return; }
    const tr = e.target.closest('tr.ic-row'); if (tr) openDoc(moves[+tr.dataset.i]);
  });
  // Open / close one item's movements (classification mode)
  function toggleCard(fh) {
    const c = fh.closest('.ic-fold'), k = c.dataset.k, open = !openCards.has(k);
    open ? openCards.add(k) : openCards.delete(k);
    c.classList.toggle('is-open', open); fh.setAttribute('aria-expanded', open); $('.table-wrap', c).hidden = !open;
  }
  view.addEventListener('keydown', e => { const fh = e.target.closest && e.target.closest('[data-fold]'); if (fh && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleCard(fh); } });
  view.addEventListener('keydown', e => { const tr = e.target.closest && e.target.closest('tr.ic-row'); if (tr && e.key === 'Enter') openDoc(moves[+tr.dataset.i]); });

  const unsub = LIVE.watch(IC_BASE, draw);
  draw();
  icSaleFound = () => { if (st.ran) draw(); };
  return () => { unsub(); icSaleFound = null; if (movesSub) movesSub(); closeDocHost(); document.removeEventListener('mousedown', outside, true); freshDrawer(false); };
};
