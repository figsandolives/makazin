/* Chart image download: draws a chart's card as a PNG with a title on top
   («رسم بياني لساعات الذروة لشهر أكتوبر 2026 لكل الأفرع»). Uses html-to-image, loaded on first use. */
const CHART_IMG_LIB = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
let chartImgLib = null;
function loadChartImgLib() {
  if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
  if (!chartImgLib) chartImgLib = new Promise((resolve, reject) => {
    // Some browser extensions add a global `define`; the library would then register with it
    // instead of setting window.htmlToImage, so hide it while the script runs.
    const amd = window.define;
    try { window.define = undefined; } catch (e) {}
    const s = document.createElement('script');
    s.src = CHART_IMG_LIB; s.async = true;
    const restore = () => { try { window.define = amd; } catch (e) {} };
    s.onload = () => { restore(); window.htmlToImage ? resolve(window.htmlToImage) : reject(new Error('lib')); };
    s.onerror = () => { restore(); chartImgLib = null; reject(new Error('lib')); };
    document.head.appendChild(s);
  });
  return chartImgLib;
}

/* The page font, as CSS with the font files inside: the library cannot read the Google Fonts sheet
   (another site), so the image would fall back to another font and its lines would no longer fit.
   Only the Arabic and Latin parts in the weights the page uses. */
let chartImgFonts = null;
function chartFontCSS() {
  if (!chartImgFonts) chartImgFonts = (async () => {
    const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    if (!link) return '';
    const css = await fetch(link.href).then(r => r.text());
    const faces = (css.match(/@font-face\s*{[^}]*}/g) || []).filter(f => /font-weight:\s*(400|500|600|700)/.test(f) && /unicode-range:[^;]*(U\+0600|U\+0000)/i.test(f));
    const toData = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }));
    const out = await Promise.all(faces.map(async f => { const m = /url\(([^)]+)\)/.exec(f); return m ? f.replace(m[1], await toData(m[1].replace(/["']/g, ''))) : f; }));
    return out.join('\n');
  })().catch(e => { chartImgFonts = null; throw e; });
  return chartImgFonts;
}

/* «رسم بياني ل» + the chart's name («ساعات الذروة» → «لساعات الذروة», «المبيعات» → «للمبيعات») */
function chartTitle(name) {
  if (S.lang !== 'ar') return `${name} chart`;
  const n = String(name || '').trim();
  return `رسم بياني ${n.startsWith('ال') ? 'لل' + n.slice(2) : 'ل' + n}`;
}

async function downloadChartImage(card, { title, caption = '', file = 'chart' }) {
  const lib = await loadChartImgLib();
  const box = document.createElement('div');
  box.className = 'ci-box';
  box.dir = document.documentElement.dir || 'rtl';
  box.style.width = `${Math.max(card.offsetWidth, 520) + 56}px`;
  box.innerHTML = `<header class="ci-head"><div><h2></h2><p></p></div><span class="ci-brand"><span class="logo">${LOGO}</span><b>${esc(t('brand'))}</b></span></header>`;
  $('h2', box).textContent = title;
  $('p', box).textContent = caption;
  const clone = card.cloneNode(true);
  clone.querySelectorAll('button, .chart-tip, .rp-cardacts').forEach(el => el.remove());
  box.appendChild(clone);
  const foot = document.createElement('footer');
  foot.className = 'ci-foot';
  foot.textContent = `${t('ci.made')} ${new Date().toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' })}`;
  box.appendChild(foot);
  document.body.appendChild(box);
  try {
    await document.fonts.ready;
    // The box waits off screen; in the image it starts at the top left corner
    const opts = { pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor, width: box.offsetWidth, height: box.offsetHeight,
      style: { position: 'static', left: 'auto', top: 'auto', zIndex: 'auto' } };
    try { opts.fontEmbedCSS = await chartFontCSS(); } catch (e) { /* offline: the image uses a system font */ }
    let png;
    try { png = await lib.toPng(box, opts); }
    catch (e) { png = await lib.toPng(box, { ...opts, skipFonts: true }); }
    const a = document.createElement('a');
    a.href = png; a.download = `${file}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  } finally { box.remove(); }
}
