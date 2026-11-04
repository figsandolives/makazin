/* صانع الستيكرات — same workflow as the old page: pick a product or stock material,
   check the 57×38 mm label, double-click production/expiry/ingredients to change them
   (ingredients are saved to productInfos / the material), then print N copies.
   The label HTML and the desktop-app ZPL bitmap are the old ones unchanged. */

LIVE_ROUTES.add('sticker-maker');

const LABEL = { widthMm: 57, heightMm: 38, paddingXmm: 1.4, paddingYmm: 1, barcodeHeight: 24, barcodeWidth: 1 };
const ZEBRA_DPI = 203;
const mmToDots = mm => Math.round((Number(mm) || 0) * ZEBRA_DPI / 25.4);
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function productInfoOf(productId) {
  if (!productId) return null;
  const infos = LIVE.cache.productInfos || {};
  return infos[productId] || Object.values(infos).find(i => i && (i.productId || i.id) === productId) || null;
}
function productInfoKey(productId, info) {
  const infos = LIVE.cache.productInfos || {};
  if (infos[productId]) return productId;
  const found = Object.entries(infos).find(([, i]) => i && ((i.productId || i.id) === productId || i === info));
  return (found && found[0]) || productId;
}

/* What goes on the label (same fallbacks as the old page) */
function labelInfo(rec) {
  const product = rec.itemType === 'product' ? (LIVE.cache.products || {})[rec.itemId] : null;
  const material = rec.itemType !== 'product' ? (LIVE.cache.stockMaterials || {})[rec.itemId] : null;
  const info = rec.itemType === 'product' ? productInfoOf(rec.itemId) : null;
  const originFromSelect = product && product.countryOriginId ? nameOf((LIVE.cache.countryOrigins || {})[product.countryOriginId]) : '';
  return {
    nameAr: rec.itemNameAr || rec.itemName || '', nameEn: rec.itemNameEn || rec.itemName || '',
    ingredients: rec.labelIngredients ?? (info && info.ingredients) ?? (material && material.ingredients) ?? '',
    origin: rec.labelOrigin ?? (info && info.origin) ?? (material && material.origin) ?? originFromSelect ?? '',
    barcode: rec.barcode
  };
}
function labelRecord(id, item, type) {
  const info = type === 'product' ? productInfoOf(id) : null;
  return {
    itemId: id, itemType: type === 'product' ? 'product' : 'stockMaterial',
    itemName: item.nameAr || item.name || item.nameEn || '', itemNameAr: item.nameAr || item.name || '', itemNameEn: item.nameEn || item.name || '',
    // Fixed once, so the preview and the printed copies carry the same barcode
    barcode: (info && info.barcode) || item.barcode || item.code || newBarcode(),
    productionDate: item.fixedProductionDate || localDay(), expiryDate: item.fixedExpiryDate || '',
    labelIngredients: (info && info.ingredients) || item.ingredients || '', labelOrigin: (info && info.origin) || item.origin || null
  };
}

function barcodeSvg(value) {
  if (!value || !window.JsBarcode) return '<svg></svg>';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try { JsBarcode(svg, value, { format: 'CODE128', displayValue: false, height: LABEL.barcodeHeight, width: LABEL.barcodeWidth, margin: 0 }); } catch (e) { return '<svg></svg>'; }
  // JsBarcode writes an inline transform that cancels the label's rotate(-90deg),
  // which pushed the barcode out of its box on the old page
  svg.removeAttribute('style');
  svg.setAttribute('preserveAspectRatio', 'none');
  return svg.outerHTML;
}

/* The old label document — one .sheet per copy */
function labelHtml(rec, copies = 1, extraCss = '') {
  const L = labelInfo(rec), { widthMm: w, heightMm: h } = LABEL;
  const sheet = `<div class="sheet"><div class="label"><div class="label-content">
      <div class="title">${esc(L.nameAr)}</div><div class="title en">${esc(L.nameEn)}</div>
      <div class="ingredients">المكونات: ${esc(L.ingredients || '-')}</div>
      <div class="meta-row">
        <div class="meta-card production"><span class="meta-label">إنتاج</span><span class="meta-value">${esc(rec.productionDate || '-')}</span></div>
        <div class="meta-card expiry"><span class="meta-label">انتهاء</span><span class="meta-value">${esc(rec.expiryDate || '-')}</span></div>
        <div class="meta-card origin"><span class="meta-label">بلد المنشأ</span><span class="meta-value">${esc(L.origin || '-')}</span></div>
      </div>
      <div class="barcode">${barcodeSvg(L.barcode)}</div></div></div></div>`;
  return `<!doctype html><html><head><meta charset="UTF-8"><title>${esc(L.nameAr || L.nameEn)}</title><style>
    @page { size: ${w}mm ${h}mm; margin: 0; }
    html, body { width: ${w}mm; height: ${h}mm; margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Tahoma, sans-serif; overflow: hidden; }
    .sheet { width: ${w}mm; height: ${h}mm; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .label { width: ${w}mm; height: ${h}mm; padding: ${LABEL.paddingYmm}mm ${LABEL.paddingXmm}mm; box-sizing: border-box; position: relative; }
    .label-content { position: relative; height: 100%; width: 100%; box-sizing: border-box; border: .35mm solid #000; border-radius: 1mm; overflow: hidden; }
    .title { position: absolute; left: 13mm; right: 1mm; top: 1.2mm; font-size: 12px; font-weight: 900; text-align: center; line-height: 1.02; white-space: nowrap; overflow: hidden; }
    .title.en { top: 6.2mm; font-size: 9.6px; direction: ltr; }
    .ingredients { position: absolute; top: 11.4mm; right: 1mm; left: 13mm; height: 12mm; font-size: 8px; font-weight: 900; text-align: right; direction: rtl; line-height: 1.12; overflow: hidden; overflow-wrap: anywhere; }
    .meta-row { position: absolute; top: 27.2mm; right: 1mm; left: 13mm; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1mm; direction: rtl; }
    .meta-card { min-width: 0; text-align: center; overflow: hidden; }
    .meta-label { display: block; font-size: 7.2px; font-weight: 900; line-height: 1; white-space: nowrap; }
    .meta-value { display: block; margin-top: 1mm; font-size: 8px; font-weight: 900; line-height: 1; direction: ltr; white-space: nowrap; overflow: hidden; }
    .meta-card.origin .meta-value { direction: rtl; }
    .barcode { position: absolute; left: 1.2mm; top: 4mm; width: 10mm; height: 30mm; overflow: hidden; line-height: 0; }
    .barcode svg { position: absolute; width: 30mm; height: 10mm; left: 0; top: 30mm; transform: rotate(-90deg); transform-origin: top left; }
    ${extraCss}</style></head><body>${Array.from({ length: Math.max(1, Math.floor(copies)) }, () => sheet).join('')}</body></html>`;
}

/* ---------- desktop app: the old 203-dpi bitmap sent to the Zebra printer as ZPL ---------- */
function fitSize(ctx, text, maxW, maxS, minS, weight, family) {
  for (let s = maxS; s >= minS; s--) { ctx.font = `${weight} ${s}px ${family}`; if (!text || ctx.measureText(text).width <= maxW) return s; }
  return minS;
}
function fittedLine(ctx, text, x, y, maxW, { maxSize = 24, minSize = 12, weight = 'bold', family = 'Arial, Tahoma, sans-serif', align = 'center', direction = 'rtl' } = {}) {
  const v = String(text || '').trim(); if (!v) return;
  const s = fitSize(ctx, v, maxW, maxSize, minSize, weight, family);
  ctx.save(); ctx.font = `${weight} ${s}px ${family}`; ctx.fillStyle = '#000'; ctx.textAlign = align; ctx.direction = direction; ctx.textBaseline = 'top';
  const m = ctx.measureText(v).width, k = m > maxW ? Math.max(0.76, maxW / m) : 1;
  if (k < 1) { ctx.translate(x, y); ctx.scale(k, 1); ctx.fillText(v, 0, 0); } else ctx.fillText(v, x, y);
  ctx.restore();
}
function wrapLines(ctx, text, maxW) {
  const lines = []; let line = '';
  String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).forEach(w => { const n = line ? `${line} ${w}` : w; if (ctx.measureText(n).width <= maxW || !line) line = n; else { lines.push(line); line = w; } });
  if (line) lines.push(line);
  return lines;
}
function wrappedText(ctx, text, x, y, maxW, maxLines, { maxSize = 18, minSize = 11, weight = 'bold', family = 'Arial, Tahoma, sans-serif', lineGap = 3 } = {}) {
  const v = String(text || '').replace(/\s+/g, ' ').trim(); if (!v) return;
  let size = minSize, lines = [];
  for (let s = maxSize; s >= minSize; s--) { ctx.font = `${weight} ${s}px ${family}`; const l = wrapLines(ctx, v, maxW); if (l.length <= maxLines) { size = s; lines = l; break; } if (s === minSize) lines = l.slice(0, maxLines); }
  ctx.save(); ctx.font = `${weight} ${size}px ${family}`; ctx.fillStyle = '#000'; ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.textBaseline = 'top';
  lines.slice(0, maxLines).forEach((l, i) => {
    const m = ctx.measureText(l).width, k = m > maxW ? Math.max(0.76, maxW / m) : 1;
    if (k < 1) { ctx.save(); ctx.translate(x, y + i * (size + lineGap)); ctx.scale(k, 1); ctx.fillText(l, 0, 0); ctx.restore(); } else ctx.fillText(l, x, y + i * (size + lineGap));
  });
  ctx.restore();
}
function verticalBarcode(ctx, value, x, y, maxW, maxH) {
  if (!value || !window.JsBarcode) return;
  const c = document.createElement('canvas');
  JsBarcode(c, value, { format: 'CODE128', displayValue: false, height: maxW, width: 2, margin: 0 });
  if (c.width > maxH) JsBarcode(c, value, { format: 'CODE128', displayValue: false, height: maxW, width: 1, margin: 0 });
  const dh = Math.min(c.width, maxH), dw = Math.min(c.height, maxW);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(x + Math.max(0, Math.floor((maxW - dw) / 2)), y + Math.max(0, Math.floor((maxH - dh) / 2)) + dh); ctx.rotate(-Math.PI / 2);
  ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, dh, dw); ctx.restore();
}
async function labelZpl(rec, copies) {
  const L = labelInfo(rec), c = document.createElement('canvas');
  c.width = mmToDots(LABEL.widthMm); c.height = mmToDots(LABEL.heightMm);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* draw anyway */ } }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  const bc = { x: 16, y: 28, w: 96, h: c.height - 56 };
  verticalBarcode(ctx, L.barcode, bc.x, bc.y, bc.w, bc.h);
  const left = bc.x + bc.w + 12, right = c.width - 18, width = right - left, mid = left + width / 2;
  fittedLine(ctx, L.nameAr, mid, 22, width, { maxSize: 31, minSize: 17 });
  fittedLine(ctx, L.nameEn, mid, 57, width, { maxSize: 24, minSize: 13, direction: 'ltr', family: 'Arial, sans-serif' });
  wrappedText(ctx, `المكونات: ${L.ingredients || '-'}`, right, 93, width, 3);
  [{ label: 'إنتاج', value: rec.productionDate || '-', x: right - 48, w: 96, dir: 'ltr' }, { label: 'انتهاء', value: rec.expiryDate || '-', x: right - 150, w: 96, dir: 'ltr' },
    { label: 'بلد المنشأ', value: L.origin || '-', x: left + 42, w: 100, dir: 'rtl' }].forEach(m => {
    fittedLine(ctx, m.label, m.x, 212, m.w, { maxSize: 20, minSize: 14 });
    fittedLine(ctx, m.value, m.x, 242, m.w, { maxSize: 21, minSize: 13, direction: m.dir });
  });
  const img = ctx.getImageData(0, 0, c.width, c.height).data, rowBytes = Math.ceil(c.width / 8);
  let hex = '';
  for (let y = 0; y < c.height; y++) for (let bx = 0; bx < rowBytes; bx++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      const x = bx * 8 + bit; if (x >= c.width) continue;
      const i = (y * c.width + x) * 4;
      if (img[i + 3] > 32 && img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114 < 160) byte |= 0x80 >> bit;
    }
    hex += byte.toString(16).padStart(2, '0').toUpperCase();
  }
  const total = rowBytes * c.height;
  return ['^XA', `^PW${c.width}`, `^LL${c.height}`, '^LH0,0', '^PR4', '^MD24', `^FO0,0^GFA,${total},${total},${rowBytes},${hex}^FS`, `^PQ${Math.max(1, Math.floor(copies))}`, '^XZ'].join('\n');
}
async function printLabel(rec, copies) {
  await needLib('JsBarcode');
  if (window.figsDesktop && window.figsDesktop.isDesktopApp) { await window.figsDesktop.printZpl({ zpl: await labelZpl(rec, copies) }); return; }
  printHtml(labelHtml(rec, copies));
}

/* A dialog with one field; resolves to the field's value, or null when cancelled */
async function askValue({ title, field, ok, icon: ic = 'pencil', read, valid = () => true, onOpen }) {
  let value = null;
  const grab = e => { if (e.target.closest('#confirm [data-cf="1"]')) value = read(); };
  document.addEventListener('click', grab, true);
  const wait = confirmDialog({ title, body: `<div class="field cf-field">${field}<small class="err"></small></div>`, ok, icon: ic });
  setTimeout(() => {
    const okBtn = $('#confirm [data-cf="1"]'); if (!okBtn) return;
    // Clicks on "OK" with an invalid value show the error and keep the dialog open
    okBtn.addEventListener('click', e => { const msg = valid(read()); if (msg !== true) { e.stopPropagation(); e.preventDefault(); value = null; const f = $('#confirm .cf-field'); f.classList.add('invalid'); $('.err', f).textContent = msg; } }, true);
    $('#confirm .cf-field').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); okBtn.click(); } });
    onOpen && onOpen($('#confirm .cf-field'));
  }, 90);
  const yes = await wait;
  document.removeEventListener('click', grab, true);
  return yes ? value : null;
}

PAGES['sticker-maker'] = view => {
  const st = (S.sm ||= { q: '', rec: null });
  let busy = false;
  view.innerHTML = `
    ${pageHeader('sticker-maker', `<button class="btn btn-primary" id="smPrint">${icon('printer')}<span>${t('print')}</span></button>`, t('sm.sub'))}
    <section class="sm-grid">
      <div class="card sm-side" data-anim>
        <label class="sm-label" for="smQ">${t('sm.searchLabel')}</label>
        <div class="sm-search"><label class="search-field">${icon('search')}<input type="search" id="smQ" placeholder="${t('sm.searchPh')}" value="${esc(st.q)}" autocomplete="off" role="combobox" aria-controls="smRes" aria-expanded="false"></label>
          <div class="sm-results" id="smRes" role="listbox" hidden></div></div>
        <div id="smPicked"></div>
      </div>
      <div class="card sm-stage-card" data-anim>
        <header class="card-head"><h3>${t('preview')}</h3><span class="muted mono">57 × 38 mm</span></header>
        <div class="sm-stage" id="smStage"></div>
      </div>
    </section>`;

  const products = () => LIVE.cache.products || {}, materials = () => LIVE.cache.stockMaterials || {};
  function rows(q) {
    const k = normQ(q);
    const all = [...Object.entries(products()).map(([id, item]) => ({ id, item, type: 'product' })), ...Object.entries(materials()).map(([id, item]) => ({ id, item, type: 'material' }))];
    return all.filter(({ item }) => item && (!k || normQ([item.nameAr, item.nameEn, item.name, item.code, item.barcode].filter(Boolean).join(' ')).includes(k)))
      .sort((a, b) => String(a.item.nameAr || a.item.name || '').localeCompare(String(b.item.nameAr || b.item.name || ''), 'ar')).slice(0, 50);
  }
  const res = $('#smRes', view), q = $('#smQ', view);
  function showResults() {
    st.q = q.value;
    const list = st.q.trim() ? rows(st.q) : [];
    res.hidden = !st.q.trim();
    q.setAttribute('aria-expanded', !res.hidden);
    res.innerHTML = list.length ? list.map(({ id, item, type }) => `<button type="button" class="sm-hit" role="option" data-id="${esc(id)}" data-type="${type}">
        <span class="cell-2"><b>${esc(item.nameAr || item.name || item.nameEn || '-')}</b><small>${esc(item.nameEn || item.name || '-')}</small></span>
        <span class="badge tone-${type === 'product' ? 'info' : 'accent'}">${t(type === 'product' ? 'sm.product' : 'sm.material')}</span></button>`).join('')
      : `<p class="muted pc-hint">${icon('search')}${t('emptyTitle')}</p>`;
  }
  q.addEventListener('input', showResults);
  q.addEventListener('focus', () => { if (q.value.trim()) showResults(); });
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { res.hidden = true; q.setAttribute('aria-expanded', 'false'); } });
  const outside = e => { if (!e.target.closest('.sm-search')) { res.hidden = true; q.setAttribute('aria-expanded', 'false'); } };
  document.addEventListener('click', outside);

  res.addEventListener('click', async e => {
    const b = e.target.closest('.sm-hit'); if (!b) return;
    const item = (b.dataset.type === 'product' ? products() : materials())[b.dataset.id]; if (!item) return;
    const name = item.nameAr || item.name || item.nameEn || '';
    res.hidden = true;
    const ok = await confirmDialog({ title: t('sm.pickQ'), body: `<p class="cf-note">${t('sm.pickBody').replace('{name}', `<b>${esc(name)}</b>`)}</p>`, ok: t('sm.pick'), icon: 'tag' });
    if (!ok) { q.focus(); return; }
    st.rec = labelRecord(b.dataset.id, item, b.dataset.type); st.q = ''; q.value = '';
    draw();
  });

  /* ---------- preview: the real label document, scaled to fit ---------- */
  const PREVIEW_CSS = `html, body { width: 100% !important; height: 100% !important; display: flex; justify-content: center; align-items: center; overflow: hidden !important; background: transparent; }
    .sheet { flex: 0 0 57mm; transform: scale(var(--s, 2.35)); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    .meta-card.production, .meta-card.expiry, .ingredients { cursor: pointer; border-radius: .6mm; transition: background .15s; }
    .meta-card.production:hover, .meta-card.expiry:hover, .ingredients:hover { background: rgba(22, 163, 74, .14); outline: .25mm dashed #16a34a; }`;
  let frame = null, ro = null;
  const fit = () => {
    if (!frame || !frame.contentDocument) return;
    const px = LABEL.widthMm * 96 / 25.4, py = LABEL.heightMm * 96 / 25.4;
    const s = Math.max(0.8, Math.min(2.6, (frame.clientWidth - 24) / px, (frame.clientHeight - 24) / py));
    frame.contentDocument.documentElement.style.setProperty('--s', s.toFixed(3));
  };
  async function paintPreview() {
    const stage = $('#smStage', view);
    if (!st.rec) { frame = null; stage.innerHTML = `<div class="empty-state sm-empty">${icon('tag')}<b>${t('sm.empty')}</b><small>${t('sm.emptySub')}</small></div>`; return; }
    try { await needLib('JsBarcode'); } catch (e) { libFailed(); }
    if (!view.isConnected || !st.rec) return;
    if (!frame) { stage.innerHTML = `<iframe class="sm-frame" title="${t('preview')}"></iframe><p class="sm-tip">${icon('info')}${t('sm.tip')}</p>`; frame = $('iframe', stage); ro && ro.disconnect(); ro = new ResizeObserver(fit); ro.observe(frame); }
    frame.onload = () => {
      fit();
      const doc = frame.contentDocument;
      [['.meta-card.production', 'productionDate'], ['.meta-card.expiry', 'expiryDate'], ['.ingredients', 'ingredients']].forEach(([sel, f]) => {
        const el = doc.querySelector(sel); if (!el) return;
        el.title = t('sm.dbl');
        el.addEventListener('dblclick', () => edit(f));
      });
    };
    frame.srcdoc = labelHtml(st.rec, 1, PREVIEW_CSS);
  }

  function drawPicked() {
    const r = st.rec, box = $('#smPicked', view);
    $('#smPrint', view).disabled = !r;
    if (!r) { box.innerHTML = `<p class="muted pc-hint">${icon('info')}${t('sm.pickHint')}</p>`; return; }
    const L = labelInfo(r);
    box.innerHTML = `<div class="sm-picked">
        <div class="sm-picked-head"><span class="ph-ic sm">${icon(r.itemType === 'product' ? 'box' : 'package')}</span><div class="cell-2"><b>${esc(L.nameAr)}</b><small>${esc(L.nameEn)}</small></div>
          <span class="badge tone-${r.itemType === 'product' ? 'info' : 'accent'}">${t(r.itemType === 'product' ? 'sm.product' : 'sm.material')}</span></div>
        <dl class="sm-facts">
          <div><dt>${t('it.barcode')}</dt><dd class="mono">${esc(L.barcode || '-')}</dd></div>
          <div><dt>${t('sm.origin')}</dt><dd>${esc(L.origin || '-')}</dd></div>
          <div><dt>${t('prodDate')}</dt><dd class="mono">${esc(r.productionDate || '-')}</dd></div>
          <div><dt>${t('expDate')}</dt><dd class="mono">${esc(r.expiryDate || '-')}</dd></div>
          <div class="wide"><dt>${t('sm.ingredients')}</dt><dd>${esc(L.ingredients || '-')}</dd></div>
        </dl></div>`;
  }
  function draw() { drawPicked(); paintPreview(); }

  /* ---------- double-click edits (as the old page) ---------- */
  async function edit(field) {
    const r = st.rec; if (!r) return;
    if (field === 'ingredients') {
      const v = await askValue({ title: t('sm.editIngredients'), ok: t('save'),
        field: `<label for="smIng">${t('sm.ingredients')}</label><textarea id="smIng" rows="5" placeholder="${t('sm.ingredients')}">${esc(r.labelIngredients || '')}</textarea>`,
        read: () => String(($('#smIng') || {}).value || '').trim(), onOpen: f => $('textarea', f).focus() });
      if (v === null || !st.rec) return;
      r.labelIngredients = v; draw();
      // Saved for next time: in the product's info, or on the material itself
      try {
        if (r.itemType === 'product') {
          const info = productInfoOf(r.itemId), key = productInfoKey(r.itemId, info);
          const payload = info ? { ingredients: v } : { id: r.itemId, productId: r.itemId, productName: r.itemNameAr, ingredients: v, origin: '', barcode: r.barcode, createdAt: Date.now() };
          await LIVE.update(Object.fromEntries(Object.entries(payload).map(([k, x]) => [`productInfos/${key}/${k}`, x])));
        } else await LIVE.update({ [`stockMaterials/${r.itemId}/ingredients`]: v });
        toast(t('saved'));
      } catch (e) { toast(t(r.itemType === 'product' ? 'sm.infoSaveFailed' : 'sm.materialSaveFailed'), { tone: 'danger', ic: 'alert' }); }
      return;
    }
    const v = await askValue({ title: t(field === 'productionDate' ? 'sm.editProd' : 'sm.editExp'), ok: t('save'), icon: 'calendar',
      field: `<label for="smDate">${t(field === 'productionDate' ? 'prodDate' : 'expDate')}</label><input type="date" id="smDate" value="${esc(r[field] || '')}">`,
      read: () => ($('#smDate') || {}).value || '', onOpen: f => $('input', f).focus() });
    if (v === null || !st.rec) return;
    r[field] = v; draw();
  }

  /* ---------- print N copies, then start over (as the old page) ---------- */
  async function print() {
    const r = st.rec; if (!r || busy) return;
    const copies = await askValue({ title: t('sm.copies'), ok: t('print'), icon: 'printer',
      field: `<label for="smN">${t('sm.copiesHelp')}</label><div class="stepper-in sm-stepper" dir="ltr"><button type="button" class="btn-icon" data-n="-1" aria-label="${t('sm.less')}">−</button>
        <input id="smN" inputmode="numeric" autocomplete="off" value="1" placeholder="${t('sm.copiesPh')}"><button type="button" class="btn-icon" data-n="1" aria-label="${t('sm.more')}">+</button></div>`,
      read: () => toLatin(($('#smN') || {}).value || '').replace(/[^0-9]/g, ''),
      valid: v => (Number.isInteger(+v) && +v >= 1 ? true : t('sm.badCopies')),
      onOpen: f => {
        const i = $('#smN', f);
        i.addEventListener('input', () => { i.value = toLatin(i.value).replace(/[^0-9]/g, ''); f.classList.remove('invalid'); });
        f.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; i.value = String(Math.max(1, (parseInt(i.value, 10) || 1) + +b.dataset.n)); f.classList.remove('invalid'); i.focus(); });
        i.select();
      } });
    if (copies === null) return;
    busy = true;
    st.rec = null; draw();
    try { await printLabel(r, +copies); }
    catch (e) { toast(t('sm.printFailed').replace('{message}', e && e.message ? e.message : t('it.libFail')), { tone: 'danger', ic: 'alert' }); }
    finally { busy = false; }
  }
  $('#smPrint', view).addEventListener('click', print);

  // Names/ingredients edited elsewhere show up in the panel and preview
  const unsub = LIVE.watch(['products', 'stockMaterials', 'productInfos', 'countryOrigins'], () => { if (st.rec) draw(); else drawPicked(); if (!res.hidden) showResults(); });
  draw();
  return () => { unsub(); document.removeEventListener('click', outside); ro && ro.disconnect(); };
};
