/* Raseed — app shell, router, generic data pages, interactions. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
/* On wide screens the content area (.main) scrolls by itself, so its scrollbar
   sits on the left side of the content (Arabic) instead of the window's right
   edge next to the sidebar. Every scrollTo() in the app goes to it. */
const pageScroller = () => { const m = document.querySelector('.main'); return m && getComputedStyle(m).overflowY === 'auto' ? m : document.scrollingElement; };
const winScrollTo = window.scrollTo.bind(window);
window.scrollTo = (...a) => { const el = pageScroller(); if (el === document.scrollingElement) winScrollTo(...a); else el.scrollTo(...a); };

const S = {
  lang: html.lang === 'en' ? 'en' : 'ar',
  theme: html.dataset.theme || 'light',
  collapsed: html.classList.contains('sb-collapsed'),
  route: 'reports',
  openGroups: {},
  table: {},
  cleanup: null
};

/* ---------- i18n & formatting ---------- */
// var, not const: some browser extensions add a global `var t` (and `B`), and a const of the same name stops the whole script
var t = k => (I18N[S.lang][k] ?? I18N.ar[k] ?? k);
const L = v => (v && typeof v === 'object' && 'ar' in v ? v[S.lang] : v);
const loc = () => (S.lang === 'ar' ? 'ar-u-nu-latn' : 'en-US');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n, d = 0, min = 0) => new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: min }).format(n);
// Kuwaiti dinar: always 3 decimals (fils)
const fmtMoney = n => `${fmtNum(n, 3, 3)} <small class="cur">${t('currency')}</small>`;
const fmtCompact = n => new Intl.NumberFormat(loc(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtDate = iso => new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const initials = p => { const n = L(p) || ''; const w = n.split(/\s+/); return S.lang === 'ar' ? w[0][0] : (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase(); };
const groupOf = route => NAV.find(g => g.items.includes(route));
const me = () => LIVE.user || { name: '-', role: '' };
const meInitial = () => { const n = (me().name || '-').trim(); return S.lang === 'ar' || /[\u0600-\u06FF]/.test(n) ? n[0] : n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); };
const roleLabel = () => (me().role ? t('role_' + me().role) : '');
/* Same rules as the old page: cashiers don't see inventory/suppliers, storekeepers don't see administration */
const HIDDEN_BY_ROLE = { cashier: ['grp.inventory', 'grp.suppliers'], storekeeper: ['grp.admin'] };
const visibleNav = () => NAV.filter(g => !(g.group && (HIDDEN_BY_ROLE[me().role] || []).includes(g.group)));
const canSee = route => visibleNav().some(g => g.items.includes(route));

function savePrefs() {
  try { localStorage.setItem('raseed.prefs.v2', JSON.stringify({ lang: S.lang, theme: S.theme, collapsed: S.collapsed })); } catch (e) {}
}
function applyPrefs() {
  html.lang = S.lang; html.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  html.dataset.theme = S.theme;
  html.classList.toggle('sb-collapsed', S.collapsed);
  $('meta[name="theme-color"]').content = S.theme === 'dark' ? '#0B1120' : '#F4F7FB';
  savePrefs();
}

/* Circular reveal transition used for language & theme switches */
function reveal(fn, origin) {
  if (!document.startViewTransition || reduced.matches) { fn(); return; }
  const x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : 0;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(fn);
  vt.ready.then(() => html.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
    { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
  )).catch(() => {});
}
const originOf = (ev, el) => {
  if (ev && ev.clientX) return { x: ev.clientX, y: ev.clientY };
  const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
};

function setLang(lang, ev, el) {
  if (lang === S.lang) return;
  const o = originOf(ev, el);
  $$('.lang-seg').forEach(seg => { $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.lang === lang)); placeThumb(seg); });
  setTimeout(() => reveal(() => { S.lang = lang; applyPrefs(); renderAll(); }, o), 200);
}
function toggleTheme(ev, el) {
  const o = originOf(ev, el);
  reveal(() => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); }, o);
}
function toggleCollapse() {
  S.collapsed = !S.collapsed; applyPrefs(); hideTip();
  setTimeout(() => $$('.seg').forEach(placeThumb), 320);
}

/* ---------- Segmented control thumb ---------- */
function placeThumb(seg) {
  const on = $('button.on', seg), th = $('.thumb', seg);
  if (!on || !th) return;
  th.style.width = on.offsetWidth + 'px';
  th.style.transform = `translateX(${on.offsetLeft}px)`;
}

/* ---------- Sidebar ---------- */
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34D399"/><stop offset=".55" stop-color="#14B8A6"/><stop offset="1" stop-color="#6366F1"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><path d="M9 21.5h14M9 16h14M9 10.5h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="22.5" cy="10.5" r="2.2" fill="#fff"/></svg>`;

function navLink(route, i = 0) {
  const b = NAV_BADGE[route];
  return `<a class="nav-link${S.route === route ? ' active' : ''}" style="--d:${i * 28}" href="#/${route}" data-route="${route}" data-tip="${esc(t(route))}">
    <span class="nl-ic">${icon(ROUTE_ICON[route])}</span><span class="nl-txt">${t(route)}</span>${b ? `<span class="nl-badge${route === 'online-orders' ? ' pulse' : ''}">${b}</span>` : ''}</a>`;
}

function renderSidebar() {
  const g0 = groupOf(S.route);
  if (g0 && g0.group) S.openGroups[g0.group] = true;
  $('#sidebar').innerHTML = `
    <div class="sb-head">
      <a class="brand" href="#/reports" aria-label="${t('brand')}"><span class="logo">${LOGO}</span>
        <span class="brand-txt"><b>${t('brand')}</b><small>${t('brandSub')}</small></span></a>
      <button class="btn-icon sb-close only-mobile" data-act="menu" aria-label="${t('close')}">${icon('x')}</button>
    </div>
    <button class="sb-search" data-act="cmdk" data-tip="${t('search')}">${icon('search')}<span>${t('quickSearch')}</span><kbd>⌘K</kbd></button>
    <nav class="sb-nav">
      ${visibleNav().map(g => g.section
        ? `<div class="sb-sec"><div class="sb-label">${t(g.section)}</div>${g.items.map(navLink).join('')}</div>`
        : `<div class="sb-group${S.openGroups[g.group] ? ' open' : ''}${g.items.includes(S.route) ? ' has-active' : ''}" data-group="${g.group}">
            <button class="sb-group-btn" aria-expanded="${!!S.openGroups[g.group]}" data-tip="${esc(t(g.group))}">
              <span class="nl-ic">${icon(g.icon)}</span><span class="nl-txt">${t(g.group)}</span>
              <span class="grp-count">${g.items.length}</span>${icon('chevDown', 'chev')}
            </button>
            <div class="sb-sub"><div class="sb-sub-inner">${g.items.map(navLink).join('')}</div></div>
          </div>`).join('')}
    </nav>
    <div class="sb-foot">
      <div class="me"><span class="av" style="--h:${hue(me().name)}">${esc(meInitial())}</span>
        <span class="me-txt"><b>${esc(me().name)}</b><small>${roleLabel()}</small></span></div>
      <button class="btn-icon collapse-btn only-desk" data-act="collapse" aria-label="${t(S.collapsed ? 'expand' : 'collapse')}" data-tip="${t(S.collapsed ? 'expand' : 'collapse')}">${icon('chevRight', 'flip')}</button>
    </div>`;
  STOCK_ALARM.paint();
}

function updateActive() {
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === S.route));
  $$('.sb-group').forEach(g => {
    const has = !!$(`.nav-link[data-route="${S.route}"]`, g);
    g.classList.toggle('has-active', has);
    if (has && !g.classList.contains('open')) toggleGroup(g, true);
  });
  const a = $('.nav-link.active');
  if (a) a.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
}

function toggleGroup(g, force) {
  const open = force ?? !g.classList.contains('open');
  g.classList.toggle('open', open);
  $('.sb-group-btn', g).setAttribute('aria-expanded', open);
  S.openGroups[g.dataset.group] = open;
}

/* After a group opens, glide the sidebar down so its items come into view
   (the header stays visible when the whole group can't fit). */
let revealRaf = 0;
function revealGroup(g) {
  const nav = g.closest('.sb-nav');
  if (!nav) return;
  const pad = 12;
  const navTop = nav.getBoundingClientRect().top;
  const top = g.getBoundingClientRect().top - navTop + nav.scrollTop;
  const full = $('.sb-group-btn', g).offsetHeight + $('.sb-sub-inner', g).scrollHeight;
  const from = nav.scrollTop;
  const to = Math.max(from, Math.min(top - pad, top + full + pad - nav.clientHeight));
  if (to - from < 2) return;
  cancelAnimationFrame(revealRaf);
  if (reduced.matches) { setTimeout(() => { nav.scrollTop = to; }, 300); return; }
  const dur = 560, t0 = performance.now();
  const ease = p => 1 - Math.pow(1 - p, 4);
  // Wait one frame so the opening grows the list; the scroll then rides along with it.
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    nav.scrollTop = from + (to - from) * ease(p);
    if (p < 1) revealRaf = requestAnimationFrame(step);
  };
  revealRaf = requestAnimationFrame(step);
  nav.addEventListener('wheel', () => cancelAnimationFrame(revealRaf), { once: true, passive: true });
}

/* ---------- Topbar ---------- */
const NOTIFS = [
  { ic: 'bag', tone: 'success', ar: 'طلب أونلاين جديد #10481', en: 'New online order #10481', m: 2 },
  { ic: 'alert', tone: 'warning', ar: 'حليب كامل الدسم أقل من حد الطلب', en: 'Full-fat Milk below reorder level', m: 14 },
  { ic: 'swap', tone: 'info', ar: 'تحويل TR-6400 بانتظار الاستلام', en: 'Transfer TR-6400 awaiting receipt', m: 38 },
  { ic: 'clock', tone: 'danger', ar: '3 حركات مخزون معلقة تحتاج اعتماد', en: '3 pending stock movements need approval', m: 65 }
];

function renderTopbar() {
  const g = groupOf(S.route);
  $('#topbar').innerHTML = `
    <button class="btn-icon only-mobile" data-act="menu" aria-label="Menu">${icon('menu')}</button>
    <button class="btn-icon only-desk" data-act="collapse" aria-label="${t('collapse')}">${icon('panel')}</button>
    <nav class="crumbs" aria-label="breadcrumb"><a href="#/reports">${t('home')}</a>${icon('chevRight', 'flip')}
      ${g && g.group ? `<span>${t(g.group)}</span>${icon('chevRight', 'flip')}` : ''}<b id="crumbPage">${t(S.route)}</b></nav>
    <div class="tb-spacer"></div>
    <button class="tb-search" data-act="cmdk">${icon('search')}<span>${t('quickSearch')}</span><kbd>⌘K</kbd></button>
    <div class="seg lang-seg" role="group" aria-label="Language">
      <i class="thumb"></i>
      <button class="${S.lang === 'ar' ? 'on' : ''}" data-lang="ar" aria-pressed="${S.lang === 'ar'}">ع</button>
      <button class="${S.lang === 'en' ? 'on' : ''}" data-lang="en" aria-pressed="${S.lang === 'en'}">EN</button>
    </div>
    <button class="btn-icon theme-btn" data-act="theme" aria-label="${t('toggleTheme')}">${icon('sun', 'i-sun')}${icon('moon', 'i-moon')}</button>
    <div class="dd" id="ddNotif">
      <button class="btn-icon bell" data-act="dd" aria-label="${t('notifications')}">${icon('bell')}<span class="ping"></span></button>
      <div class="dd-menu notif">
        <div class="dd-head"><b>${t('notifications')}</b><button class="link" data-act="markread">${t('markRead')}</button></div>
        ${NOTIFS.map((n, i) => `<div class="notif-item" style="--i:${i}"><span class="ni-ic tone-${n.tone}">${icon(n.ic)}</span><div><p>${n[S.lang]}</p><small>${n.m} ${t('minsAgo')}</small></div><i class="unread"></i></div>`).join('')}
      </div>
    </div>
    <div class="dd" id="ddUser">
      <button class="avatar-btn" data-act="dd" aria-label="${t('profile')}"><span class="av" style="--h:${hue(me().name)}">${esc(meInitial())}</span></button>
      <div class="dd-menu">
        <div class="dd-user"><span class="av lg" style="--h:${hue(me().name)}">${esc(meInitial())}</span><div><b>${esc(me().name)}</b><small>${roleLabel()}</small></div></div>
        <button class="dd-item">${icon('user')}${t('profile')}</button>
        <button class="dd-item">${icon('sliders')}${t('settings')}</button>
        <button class="dd-item danger" data-act="logout">${icon('out', 'flip')}${t('logout')}</button>
      </div>
    </div>`;
  requestAnimationFrame(() => $$('.seg', $('#topbar')).forEach(placeThumb));
}

/* ---------- Shared page pieces ---------- */
function pageHeader(route, actions = '', sub = '') {
  const g = groupOf(route);
  return `<header class="ph" data-anim>
    <div class="ph-ic">${icon(ROUTE_ICON[route])}</div>
    <div class="ph-txt"><h1>${t(route)}</h1><p>${sub || (g && g.group ? t(g.group) : t('sec.main'))} · ${LIVE_ROUTES.has(route) ? `<span class="demo-tag live-tag${LIVE.mock ? ' mock' : ''}" data-old="${esc(t('loadingOld'))}">${t(LIVE.mock ? 'mockMode' : 'liveData')}</span>` : `<span class="demo-tag">${t('demo')}</span>`}</p></div>
    <div class="ph-actions">${actions}</div>
  </header>`;
}

/* drill: a key the page handles — the card becomes a button that opens what's behind the number
   (cards that only repeat the list already on the page get no drill). */
function kpiCard({ label, value, kind = 'num', ic = 'chart', delta, spark, tone = 'c1', drill }) {
  return `<article class="kpi card${drill ? ' kpi-link' : ''}" data-anim${drill ? ` data-drill="${esc(drill)}" role="button" tabindex="0" aria-label="${esc(label)} — ${esc(t('kd.open'))}"` : ''}>
    ${drill ? `<span class="kpi-go" aria-hidden="true">${icon('chevLeft')}</span>` : ''}
    <div class="kpi-top"><span class="kpi-ic ${tone}">${icon(ic)}</span>
      ${delta != null ? `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${icon(delta >= 0 ? 'up' : 'down')}${Math.abs(delta).toFixed(1)}%</span>` : ''}</div>
    <p class="kpi-label">${label}</p>
    <p class="kpi-val" data-count="${value}" data-kind="${kind}">${kind === 'money' ? fmtMoney(0) : 0}</p>
    ${spark ? `<div class="kpi-spark">${sparkline(spark, tone)}</div>` : ''}
  </article>`;
}

function countUp(root = document) {
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, kind = el.dataset.kind;
    const out = v => (el.innerHTML = kind === 'money' ? fmtMoney(v) : kind === 'pct' ? fmtNum(v, 1) + '%' : fmtNum(Math.round(v)));
    if (reduced.matches) { out(to); return; }
    const t0 = performance.now(), dur = 1100;
    // A newer value arrived mid-animation (it was painted directly): stop here so it isn't overwritten
    const step = now => { if (+el.dataset.count !== to) return; const p = Math.min(1, (now - t0) / dur); out(p < 1 ? to * (1 - Math.pow(1 - p, 4)) : to); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* Replace an element's markup only when it actually changed, so filters and
   typing don't rebuild (and re-animate) parts of the page that stay the same. */
function setHtml(el, html) {
  if (el && el._html !== html) { el.innerHTML = html; el._html = html; }
}

/* Same, but keeps the existing child elements (chips) and only swaps the
   class and contents that changed — so the active-chip colour glides and
   the click ripple isn't cut off. */
function patchChildren(el, html) {
  if (!el || el._html === html) return;
  const fresh = document.createElement('div');
  fresh.innerHTML = html;
  const next = [...fresh.children], cur = [...el.children];
  if (next.length !== cur.length || next.some((n, i) => n.tagName !== cur[i].tagName)) {
    el.innerHTML = html; el._html = html;
    [...el.children].forEach((c, i) => { c._inner = next[i].innerHTML; });
    return;
  }
  next.forEach((n, i) => {
    const c = cur[i];
    [...n.attributes].forEach(at => { if (c.getAttribute(at.name) !== at.value) c.setAttribute(at.name, at.value); });
    if (c._inner !== n.innerHTML) { c.innerHTML = n.innerHTML; c._inner = n.innerHTML; }
  });
  el._html = html;
}

/* KPI cards: animate in once; later updates only change the numbers in place. */
function setKpis(el, html, first) {
  const fresh = document.createElement('div');
  fresh.innerHTML = html;
  const next = $$('.kpi', fresh), cur = $$('.kpi', el);
  if (first || next.length !== cur.length || cur.some((k, i) => !$('[data-count]', k) || (k.dataset.drill || '') !== (next[i].dataset.drill || ''))) {
    el.innerHTML = html;
    if (first) { stagger(el); countUp(el); }
    else { $$('[data-anim]', el).forEach(k => k.removeAttribute('data-anim')); paintCounts(el); }
    return;
  }
  next.forEach((k, i) => {
    const a = $('[data-count]', cur[i]), b = $('[data-count]', k);
    const lab = $('.kpi-label', cur[i]), nl = $('.kpi-label', k);
    if (lab && nl && lab.textContent !== nl.textContent) lab.textContent = nl.textContent;
    // Alert cards: blinking and the alarm speaker follow the new state
    if (k.classList.contains('kpi-alert')) {
      cur[i].classList.toggle('on', k.classList.contains('on'));
      const ol = $('.kpi-loud', cur[i]), nw = $('.kpi-loud', k);
      if (ol && !nw) ol.remove(); else if (nw && !ol) cur[i].prepend(nw);
    }
    if (a.dataset.count !== b.dataset.count) { a.dataset.count = b.dataset.count; a.dataset.kind = b.dataset.kind; paintCounts(cur[i]); }
  });
}
/* ---------- Row actions menu (⋯) ----------
   Each table row keeps its action buttons (hidden); the ⋯ button lists them
   in a floating menu and a choice clicks the original button, so every
   page's own handlers keep working unchanged. */
const rowMenuBtn = () => `<button type="button" class="btn-icon sm rm-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${t('actions')}">${icon('more')}</button>`;
let rowMenu = null;
function closeRowMenu(focusBack) {
  if (!rowMenu) return;
  const { el, btn } = rowMenu;
  rowMenu = null;
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('on');
  btn.closest('tr')?.classList.remove('menu-open');
  el.classList.remove('open');
  setTimeout(() => el.remove(), 160);
  if (focusBack && btn.isConnected) btn.focus({ preventScroll: true });
}
function openRowMenu(btn) {
  const same = rowMenu && rowMenu.btn === btn;
  closeRowMenu();
  if (same) return;
  const srcs = [...btn.parentElement.children].filter(b => b !== btn && b.matches('button'));
  if (!srcs.length) return;
  const el = document.createElement('div');
  el.className = 'rmenu'; el.setAttribute('role', 'menu');
  let sep = false;
  el.innerHTML = srcs.map((b, i) => {
    const danger = b.classList.contains('danger') || b.classList.contains('btn-reject');
    const tone = danger ? ' danger' : b.classList.contains('btn-approve') ? ' approve' : '';
    const line = danger && i > 0 && !sep ? (sep = true, '<hr>') : '';
    const ic = b.querySelector('svg');
    return `${line}<button type="button" role="menuitem" class="rm-item${tone}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${ic ? ic.outerHTML : ''}<span>${esc(b.getAttribute('aria-label') || b.textContent.trim())}</span></button>`;
  }).join('');
  document.body.appendChild(el);
  const r = btn.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, pad = 8;
  const rtl = document.documentElement.dir === 'rtl';
  let left = rtl ? r.left : r.right - w;
  left = Math.max(pad, Math.min(left, innerWidth - w - pad));
  let top = r.bottom + 6, up = false;
  if (top + h > innerHeight - pad && r.top - h - 6 > pad) { top = r.top - h - 6; up = true; }
  el.style.left = `${left}px`; el.style.top = `${top}px`;
  el.style.transformOrigin = `${rtl ? 'left' : 'right'} ${up ? 'bottom' : 'top'}`;
  rowMenu = { el, btn, srcs };
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('on');
  btn.closest('tr')?.classList.add('menu-open');
  void el.offsetWidth; // start the opening transition from the closed state
  el.classList.add('open');
  el.addEventListener('click', e => {
    const it = e.target.closest('.rm-item'); if (!it || it.disabled) return;
    const src = srcs[+it.dataset.i];
    closeRowMenu();
    if (src && src.isConnected) src.click();
  });
  const first = el.querySelector('.rm-item:not([disabled])');
  first && first.focus({ preventScroll: true });
}
document.addEventListener('click', e => {
  const b = e.target.closest('.rm-btn');
  if (b) { e.stopPropagation(); openRowMenu(b); return; }
  if (rowMenu && !e.target.closest('.rmenu')) closeRowMenu();
}, true);
document.addEventListener('keydown', e => {
  if (!rowMenu) return;
  const items = [...rowMenu.el.querySelectorAll('.rm-item:not([disabled])')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRowMenu(true); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
  else if (e.key === 'Tab') closeRowMenu();
}, true);
addEventListener('scroll', e => { if (rowMenu && !rowMenu.el.contains(e.target)) closeRowMenu(); }, true);
addEventListener('resize', () => closeRowMenu());
addEventListener('hashchange', () => closeRowMenu());

function paintCounts(root) {
  $$('[data-count]', root).forEach(x => { const v = +x.dataset.count; x.innerHTML = x.dataset.kind === 'money' ? fmtMoney(v) : x.dataset.kind === 'pct' ? fmtNum(v, 1) + '%' : fmtNum(v); });
}

function stagger(root) {
  $$('[data-anim]', root).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
}

/* ---------- Generic data page ---------- */
function cell(type, v, row) {
  switch (type) {
    case 'id': return `<span class="mono id">${typeof v === 'number' ? '#' + v : esc(v)}</span>`;
    case 'person': return `<span class="person"><span class="av" style="--h:${hue(v && v.en)}">${esc(initials(v))}</span><span>${esc(L(v))}</span></span>`;
    case 'product': return `<span class="person"><span class="pr-ic" style="--h:${hue(v && v.en)}">${icon('package')}</span><span>${esc(L(v))}</span></span>`;
    case 'code': return `<span class="mono">${esc(L(v))}</span>`;
    case 'num': return `<span class="num">${fmtNum(v, 3)}</span>`;
    case 'money': return `<span class="num">${fmtMoney(v)}</span>`;
    case 'pct': return `<span class="num">${fmtNum(v, 1)}%</span>`;
    case 'date': return `<span class="date">${fmtDate(v)}</span>`;
    case 'status': return `<span class="badge tone-${TONE[v] || 'neutral'}"><i></i>${t('st.' + v)}</span>`;
    case 'toggle': return `<button class="switch" role="switch" aria-checked="${!!v}" data-toggle aria-label="${t('c.active')}"><i></i></button>`;
    case 'delta': return `<span class="num ${v < 0 ? 'neg' : 'pos'}">${v > 0 ? '+' : ''}${fmtMoney(v)}</span>`;
    case 'progress': {
      const tone = v >= 90 ? 'danger' : v >= 70 ? 'warning' : 'success';
      return `<span class="prog"><span class="prog-bar"><i class="tone-${tone}" style="--w:${v}%"></i></span><b>${v}%</b></span>`;
    }
    case 'stock': {
      const low = v < row.minQty, pct = Math.min(100, (v / (row.minQty * 3)) * 100);
      return `<span class="prog"><span class="prog-bar"><i class="tone-${low ? 'danger' : 'success'}" style="--w:${pct}%"></i></span><b class="${low ? 'neg' : ''}">${fmtNum(v)}</b></span>`;
    }
    default: return esc(L(v));
  }
}
const plain = (type, v) => {
  if (v == null) return '';
  if (type === 'status') return t('st.' + v);
  if (type === 'toggle') return v ? '✓' : '✗';
  if (type === 'date') return fmtDate(v);
  return L(v);
};

function tstate(route) {
  return (S.table[route] ||= { q: '', status: 'all', sort: null, dir: 1, page: 1 });
}

function pageGeneric(view, route) {
  const cfg = CONFIG[route], rows = getRows(route);
  const statusCol = cfg.cols.find(c => c[1] === 'status');
  const statuses = statusCol ? [...new Set(rows.map(r => r[statusCol[0]]))] : [];
  const st = tstate(route);
  view.innerHTML = `
    ${pageHeader(route, `
      <button class="btn btn-ghost" data-act="export">${icon('download')}<span>${t('export')}</span></button>
      <button class="btn btn-primary" data-act="add">${icon('plus')}<span>${t('addNew')}</span></button>`)}
    ${cfg.kpis ? `<section class="kpis">${cfg.kpis.map(([l, kind, fn, ic], i) => kpiCard({ label: t(l), value: fn(rows), kind, ic, tone: 'c' + (i + 1) })).join('')}</section>` : ''}
    <section class="card table-card" data-anim>
      <div class="toolbar">
        <label class="search-field">${icon('search')}<input type="search" id="tq" placeholder="${t('searchTable')}" value="${esc(st.q)}" autocomplete="off"></label>
        ${statuses.length > 1 ? `<div class="chips" role="tablist">
          <button class="chip${st.status === 'all' ? ' on' : ''}" data-status="all">${t('all')}<em>${rows.length}</em></button>
          ${statuses.map(s => `<button class="chip${st.status === s ? ' on' : ''}" data-status="${s}"><i class="dot tone-${TONE[s]}"></i>${t('st.' + s)}<em>${rows.filter(r => r[statusCol[0]] === s).length}</em></button>`).join('')}
        </div>` : ''}
      </div>
      <div class="table-wrap"><table class="dt">
        <thead><tr>${cfg.cols.map(([k, ty]) => `<th data-sort="${k}" class="${['num', 'money', 'pct'].includes(ty) ? 'end' : ''}${st.sort === k ? ' sorted' + (st.dir < 0 ? ' desc' : '') : ''}"><button>${t('c.' + k)}${icon('chevDown', 'sort-ic')}</button></th>`).join('')}<th class="act-col"></th></tr></thead>
        <tbody id="tb"></tbody>
      </table></div>
      <footer class="pager" id="pager"></footer>
    </section>`;
  renderRows(route, true);

  const q = $('#tq', view);
  let deb;
  q.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { st.q = q.value.trim(); st.page = 1; renderRows(route); }, 120); });
  view.addEventListener('click', e => {
    const chip = e.target.closest('.chip[data-status]');
    if (chip) { st.status = chip.dataset.status; st.page = 1; $$('.chip', view).forEach(c => c.classList.toggle('on', c === chip)); renderRows(route); return; }
    const th = e.target.closest('th[data-sort]');
    if (th) {
      const k = th.dataset.sort; st.dir = st.sort === k ? -st.dir : 1; st.sort = k;
      $$('th', view).forEach(x => x.classList.remove('sorted', 'desc'));
      th.classList.add('sorted'); th.classList.toggle('desc', st.dir < 0);
      renderRows(route); return;
    }
    const pg = e.target.closest('[data-page]');
    if (pg && !pg.disabled) { st.page = +pg.dataset.page; renderRows(route); $('.table-card', view).scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const tr = e.target.closest('tr[data-k]');
    if (!tr) return;
    const row = rows.find(r => r._k === tr.dataset.k);
    if (e.target.closest('[data-toggle]')) {
      const col = cfg.cols.find(c => c[1] === 'toggle')[0];
      row[col] = !row[col];
      e.target.closest('[data-toggle]').setAttribute('aria-checked', row[col]);
      toast(t('toggled'));
    } else if (e.target.closest('[data-edit]')) openForm(route, row);
    else if (e.target.closest('[data-del]')) deleteRow(route, row, tr);
  });
}

function filtered(route) {
  const cfg = CONFIG[route], st = tstate(route);
  let rows = getRows(route).slice();
  const statusCol = cfg.cols.find(c => c[1] === 'status');
  if (st.status !== 'all' && statusCol) rows = rows.filter(r => r[statusCol[0]] === st.status);
  if (st.q) {
    const q = st.q.toLowerCase();
    rows = rows.filter(r => cfg.cols.some(([k]) => {
      const v = r[k];
      if (v && typeof v === 'object') return (v.ar + ' ' + v.en).toLowerCase().includes(q);
      return String(v ?? '').toLowerCase().includes(q);
    }));
  }
  if (st.sort) {
    const k = st.sort;
    rows.sort((a, b) => {
      let x = a[k], y = b[k];
      if (x && typeof x === 'object') { x = L(x); y = L(y); }
      return (x > y ? 1 : x < y ? -1 : 0) * st.dir;
    });
  }
  return rows;
}

const PER = 10;
function renderRows(route, animate) {
  const cfg = CONFIG[route], st = tstate(route), rows = filtered(route);
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  st.page = Math.min(st.page, pages);
  const slice = rows.slice((st.page - 1) * PER, st.page * PER);
  const tb = $('#tb');
  if (!tb) return;
  setHtml(tb, slice.length ? slice.map((r, i) => `
    <tr data-k="${r._k}" class="${animate ? 'row-in' : ''}${r._new ? ' row-new' : ''}" style="--r:${i}">
      ${cfg.cols.map(([k, ty]) => `<td data-label="${esc(t('c.' + k))}" class="${['num', 'money', 'pct'].includes(ty) ? 'end' : ''}">${cell(ty, r[k], r)}</td>`).join('')}
      <td class="act-col"><div class="row-acts">${rowMenuBtn()}
        <button class="btn-icon sm" data-edit aria-label="${t('edit')}" data-tip="${t('edit')}" data-tip-always>${icon('pencil')}</button>
        <button class="btn-icon sm danger" data-del aria-label="${t('delete')}" data-tip="${t('delete')}" data-tip-always>${icon('trash')}</button>
      </div></td>
    </tr>`).join('')
    : `<tr class="empty"><td colspan="${cfg.cols.length + 1}"><div class="empty-state">${icon('search')}<b>${t('emptyTitle')}</b><small>${t('emptySub')}</small></div></td></tr>`);
  rows.forEach(r => delete r._new);

  const from = rows.length ? (st.page - 1) * PER + 1 : 0, to = Math.min(st.page * PER, rows.length);
  const nums = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
  setHtml($('#pager'), `
    <span class="pager-info">${t('showing')} <b>${from}–${to}</b> ${t('of')} <b>${rows.length}</b></span>
    <div class="pager-btns">
      <button class="btn-icon sm" data-page="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="${t('prev')}">${icon('chevLeft', 'flip')}</button>
      ${nums.map(p => p === '…' ? '<span class="dots">…</span>' : `<button class="pg${p === st.page ? ' on' : ''}" data-page="${p}">${p}</button>`).join('')}
      <button class="btn-icon sm" data-page="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="${t('next')}">${icon('chevRight', 'flip')}</button>
    </div>`);
}

function deleteRow(route, row, tr) {
  const rows = getRows(route), idx = rows.indexOf(row);
  tr.classList.add('row-out');
  setTimeout(() => {
    rows.splice(idx, 1); renderRows(route);
    toast(t('deleted'), { tone: 'danger', action: { label: t('undo'), fn: () => { rows.splice(idx, 0, row); row._new = true; renderRows(route); } } });
  }, reduced.matches ? 0 : 260);
}

function exportCSV(route) {
  const cfg = CONFIG[route], rows = filtered(route);
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [cfg.cols.map(([k]) => q(t('c.' + k))).join(','), ...rows.map(r => cfg.cols.map(([k, ty]) => q(plain(ty, r[k]))).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${route}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('exported'));
}

/* ---------- Drawer form ---------- */
function openForm(route, row) {
  const cfg = CONFIG[route], rows = getRows(route);
  const fields = cfg.cols.filter(([, ty]) => ty !== 'id');
  const field = ([k, ty], i) => {
    const v = row ? row[k] : undefined;
    const id = 'f-' + k;
    const lbl = `<label for="${id}">${t('c.' + k)}${i === 0 ? ' <em>*</em>' : ''}</label>`;
    if (ty === 'toggle') return `<div class="field inline">${lbl}<button type="button" class="switch" role="switch" id="${id}" aria-checked="${row ? !!v : true}" data-k="${k}"><i></i></button></div>`;
    if (ty === 'status') {
      const opts = [...new Set(rows.map(r => r[k]))];
      return `<div class="field">${lbl}<div class="select"><select id="${id}" data-k="${k}">${opts.map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${t('st.' + o)}</option>`).join('')}</select>${icon('chevDown')}</div></div>`;
    }
    const uniq = ty === 'text' ? [...new Map(rows.filter(r => r[k] && typeof r[k] === 'object').map(r => [r[k].en, r[k]])).values()] : [];
    if (uniq.length > 1 && uniq.length <= 8) {
      return `<div class="field">${lbl}<div class="select"><select id="${id}" data-k="${k}" data-bi>${uniq.map(o => `<option value="${esc(o.en)}" ${v && v.en === o.en ? 'selected' : ''}>${esc(L(o))}</option>`).join('')}</select>${icon('chevDown')}</div></div>`;
    }
    const num = ['num', 'money', 'pct', 'progress', 'delta', 'stock'].includes(ty);
    const val = v == null ? '' : ty === 'date' ? String(v).slice(0, 10) : L(v);
    return `<div class="field">${lbl}<input id="${id}" data-k="${k}" type="${num ? 'number' : ty === 'date' ? 'date' : 'text'}" ${num ? 'step="any" inputmode="decimal"' : ''} value="${esc(val)}" ${i === 0 ? 'required aria-required="true"' : ''}><small class="err" role="alert"></small></div>`;
  };
  const d = $('#drawer .drawer');
  d.onclick = null; d.oninput = null; d.classList.remove('wide');
  d.innerHTML = `
    <header class="dr-head"><span class="ph-ic sm">${icon(row ? 'pencil' : 'plus')}</span><div><h2 id="drawerTitle">${t(row ? 'editItem' : 'newItem')}</h2><p>${t(route)} · ${t('fillForm')}</p></div>
      <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
    <form class="dr-body" novalidate>${fields.map(field).join('')}</form>
    <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" data-act="save">${icon('check')}<span>${t('save')}</span></button></footer>`;
  openLayer('#drawer');
  setTimeout(() => { const f = $('input,select', d); f && f.focus(); }, 320);

  $$('.switch', d).forEach(s => s.addEventListener('click', () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
  const save = e => {
    e.preventDefault();
    const first = $('[required]', d);
    if (first && !first.value.trim()) {
      first.closest('.field').classList.add('invalid'); $('.err', first.closest('.field')).textContent = t('required');
      first.focus(); first.closest('.field').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 280 });
      return;
    }
    const out = row || { _k: route + Date.now() };
    cfg.cols.forEach(([k, ty]) => {
      const el = $(`[data-k="${k}"]`, d);
      if (ty === 'id') { if (!row) { const ids = rows.map(r => r[k]); out[k] = typeof ids[0] === 'number' ? Math.max(...ids) + 1 : String(ids[0]).replace(/\d+$/, n => +n + rows.length); } return; }
      if (!el) return;
      if (ty === 'toggle') out[k] = el.getAttribute('aria-checked') === 'true';
      else if (el.hasAttribute('data-bi')) out[k] = rows.map(r => r[k]).find(o => o && o.en === el.value);
      else if (ty === 'status') out[k] = el.value;
      else if (el.type === 'number') out[k] = +el.value || 0;
      else if (ty === 'date') out[k] = el.value ? new Date(el.value).toISOString() : new Date().toISOString();
      else out[k] = el.value ? { ar: el.value, en: el.value } : (row ? row[k] : '');
    });
    if (cfg.cols.some(c => c[1] === 'stock') && out.minQty == null) out.minQty = 10;
    out._new = true;
    if (!row) { rows.unshift(out); tstate(route).page = 1; }
    closeLayers(); renderRows(route);
    toast(t(row ? 'saved' : 'added'));
  };
  $('form', d).addEventListener('submit', save);
  $('[data-act="save"]', d).addEventListener('click', save);
  $$('input', d).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
}

/* ---------- Layers: drawer / command palette ---------- */
let lastFocus = null;
function openLayer(sel) {
  lastFocus = document.activeElement;
  const el = $(sel); el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
}
function closeLayers() {
  $$('.drawer-wrap.open, .cmdk-wrap.open').forEach(el => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); });
  document.body.classList.remove('locked');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

/* Command palette */
const CMD = { idx: 0, items: [] };
function openCmdk() {
  const box = $('#cmdk .cmdk');
  box.innerHTML = `<label class="cmdk-in">${icon('search')}<input id="cmdq" placeholder="${t('searchPh')}" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></label><div class="cmdk-list" id="cmdl" role="listbox"></div>
    <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd></span><span><kbd>↵</kbd> ${t('view')}</span></div>`;
  openLayer('#cmdk');
  const q = $('#cmdq');
  q.addEventListener('input', () => { CMD.idx = 0; drawCmd(q.value); });
  drawCmd('');
  setTimeout(() => q.focus(), 30);
}
function drawCmd(q) {
  q = q.trim().toLowerCase();
  const routes = NAV.flatMap(g => g.items.map(r => ({ type: 'route', id: r, label: t(r), alt: I18N[S.lang === 'ar' ? 'en' : 'ar'][r], sub: t(g.group || g.section), ic: ROUTE_ICON[r] })));
  const acts = [
    { type: 'act', id: 'lang', label: t('toggleLang'), ic: 'languages' },
    { type: 'act', id: 'theme', label: t('toggleTheme'), ic: S.theme === 'dark' ? 'sun' : 'moon' },
    { type: 'act', id: 'collapse', label: t(S.collapsed ? 'expand' : 'collapse'), ic: 'panel' }
  ];
  const m = x => !q || (x.label + ' ' + (x.alt || '') + ' ' + (x.sub || '')).toLowerCase().includes(q);
  const r = routes.filter(m), a = acts.filter(m);
  CMD.items = [...r, ...a];
  CMD.idx = Math.min(CMD.idx, Math.max(0, CMD.items.length - 1));
  let n = 0;
  const row = x => `<button class="cmdk-item${n === CMD.idx ? ' on' : ''}" data-i="${n++}" role="option"><span class="ci-ic">${icon(x.ic)}</span><span>${esc(x.label)}</span>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}${icon('arrow', 'go flip')}</button>`;
  $('#cmdl').innerHTML = CMD.items.length
    ? (r.length ? `<p class="cmdk-grp">${t('pages')}</p>${r.map(row).join('')}` : '') + (a.length ? `<p class="cmdk-grp">${t('actions')}</p>${a.map(row).join('')}` : '')
    : `<div class="empty-state sm">${icon('search')}<b>${t('noResults')}</b></div>`;
}
function runCmd(i) {
  const x = CMD.items[i]; if (!x) return;
  closeLayers();
  if (x.type === 'route') location.hash = '#/' + x.id;
  else if (x.id === 'lang') setLang(S.lang === 'ar' ? 'en' : 'ar');
  else if (x.id === 'theme') toggleTheme();
  else toggleCollapse();
}

/* ---------- Toasts ---------- */
function toast(msg, { tone = 'success', action, ic } = {}) {
  const el = document.createElement('div');
  el.className = `toast tone-${tone}`;
  el.innerHTML = `<span class="t-ic">${icon(ic || (tone === 'danger' ? 'trash' : tone === 'info' ? 'bell' : 'check'))}</span><p>${msg}</p>${action ? `<button class="t-act">${action.label}</button>` : ''}<button class="t-x" aria-label="${t('close')}">${icon('x')}</button><i class="t-bar"></i>`;
  $('#toasts').prepend(el);
  const kill = () => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  if (action) $('.t-act', el).onclick = () => { action.fn(); kill(); };
  $('.t-x', el).onclick = kill;
  let timer = setTimeout(kill, 4200);
  el.addEventListener('pointerenter', () => { clearTimeout(timer); el.classList.add('paused'); });
  el.addEventListener('pointerleave', () => { timer = setTimeout(kill, 1800); el.classList.remove('paused'); });
  $$('.toast', $('#toasts')).slice(4).forEach(x => x.remove());
}

/* ---------- Tooltip (collapsed sidebar + icon buttons) ---------- */
const tipEl = () => $('#tip');
function showTip(el) {
  const inSidebar = el.closest('.sidebar');
  if (inSidebar && !S.collapsed) return;
  if (!inSidebar && !el.hasAttribute('data-tip-always')) return;
  if (matchMedia('(hover: none)').matches) return;
  const tip = tipEl(); tip.textContent = el.dataset.tip;
  const b = el.getBoundingClientRect(), rtl = S.lang === 'ar';
  tip.classList.add('show');
  if (inSidebar) {
    tip.style.top = b.top + b.height / 2 - tip.offsetHeight / 2 + 'px';
    tip.style.left = (rtl ? b.left - tip.offsetWidth - 10 : b.right + 10) + 'px';
    tip.dataset.side = rtl ? 'left' : 'right';
  } else {
    tip.style.top = b.top - tip.offsetHeight - 8 + 'px';
    tip.style.left = b.left + b.width / 2 - tip.offsetWidth / 2 + 'px';
    tip.dataset.side = 'top';
  }
}
function hideTip() { tipEl().classList.remove('show'); }

/* ---------- Ripple ---------- */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.btn, .btn-icon, .nav-link, .sb-group-btn, .chip, .pg, .cmdk-item, .dd-item, .tile, .seg button, .sb-search, .tb-search');
  if (!el || reduced.matches || el.disabled) return;
  const b = el.getBoundingClientRect(), s = Math.max(b.width, b.height) * 2.2;
  const r = document.createElement('span');
  r.className = 'ripple';
  r.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - b.left - s / 2}px;top:${e.clientY - b.top - s / 2}px`;
  el.appendChild(r);
  setTimeout(() => r.remove(), 650);
}, { passive: true });

/* ---------- Router ---------- */
function renderPage() {
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  const view = $('#view');
  const fresh = view.cloneNode(false);   // drop old listeners
  view.replaceWith(fresh);
  fresh.className = 'view page-enter';
  const custom = PAGES[S.route];
  S.cleanup = custom ? custom(fresh) || null : (pageGeneric(fresh, S.route), null);
  stagger(fresh);
  countUp(fresh);
  document.title = `${t(S.route)} | ${t('brand')}`;
  const cp = $('#crumbPage'); if (cp) cp.textContent = t(S.route);
  requestAnimationFrame(() => $$('.seg', fresh).forEach(placeThumb));
}

function go() {
  const r = location.hash.replace(/^#\/?/, '') || 'reports';
  const next = ROUTE_ICON[r] && canSee(r) ? r : 'reports';
  const changed = next !== S.route;
  S.route = next;
  html.classList.remove('sb-open');
  renderTopbar();
  renderPage();
  updateActive();
  if (changed) window.scrollTo({ top: 0 });
}

function renderAll() {
  if (html.classList.contains('logged-out')) { showLogin(); return; }
  renderSidebar(); renderTopbar(); renderPage(); updateActive();
}

/* ---------- Global events ---------- */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  const langBtn = e.target.closest('[data-lang]');
  if (langBtn) { setLang(langBtn.dataset.lang, e, langBtn); return; }
  if (e.target.closest('[data-close]')) { closeLayers(); return; }
  const grp = e.target.closest('.sb-group-btn');
  if (grp) {
    const g = grp.parentElement;
    if (S.collapsed && !html.classList.contains('sb-open') && innerWidth >= 1024) { S.collapsed = false; applyPrefs(); toggleGroup(g, true); setTimeout(() => { $$('.seg').forEach(placeThumb); revealGroup(g); }, 320); }
    else { toggleGroup(g); if (g.classList.contains('open')) revealGroup(g); }
    return;
  }
  const ci = e.target.closest('.cmdk-item'); if (ci) { runCmd(+ci.dataset.i); return; }
  if (!e.target.closest('.dd')) $$('.dd.open').forEach(d => d.classList.remove('open'));
  if (!act) return;
  switch (act.dataset.act) {
    case 'menu': html.classList.toggle('sb-open'); break;
    case 'collapse': toggleCollapse(); break;
    case 'theme': toggleTheme(e, act); break;
    case 'cmdk': html.classList.remove('sb-open'); openCmdk(); break;
    case 'dd': { const d = act.closest('.dd'); const was = d.classList.contains('open'); $$('.dd.open').forEach(x => x.classList.remove('open')); d.classList.toggle('open', !was); break; }
    case 'markread': $$('.notif-item .unread').forEach(u => u.remove()); $('.bell .ping') && $('.bell .ping').remove(); break;
    case 'add': openForm(S.route); break;
    case 'export': exportCSV(S.route); break;
    case 'logout': $$('.dd.open').forEach(d => d.classList.remove('open')); askLogout(); break;
  }
});
$('#sbBackdrop').addEventListener('click', () => html.classList.remove('sb-open'));

document.addEventListener('keydown', e => {
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#cmdk').classList.contains('open') ? closeLayers() : openCmdk(); return; }
  if (e.key === '/' && !inField) { e.preventDefault(); openCmdk(); return; }
  if (e.key === 'Escape') { closeLayers(); $$('.dd.open').forEach(d => d.classList.remove('open')); html.classList.remove('sb-open'); return; }
  if ($('#cmdk').classList.contains('open')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      CMD.idx = (CMD.idx + (e.key === 'ArrowDown' ? 1 : -1) + CMD.items.length) % CMD.items.length;
      $$('.cmdk-item').forEach(b => b.classList.toggle('on', +b.dataset.i === CMD.idx));
      const on = $('.cmdk-item.on'); on && on.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); runCmd(CMD.idx); }
  }
});

document.addEventListener('pointermove', e => {
  const k = e.target.closest && e.target.closest('.kpi');
  if (!k) return;
  const b = k.getBoundingClientRect();
  k.style.setProperty('--mx', e.clientX - b.left + 'px'); k.style.setProperty('--my', e.clientY - b.top + 'px');
}, { passive: true });
document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) hideTip(); });
document.addEventListener('scroll', hideTip, { passive: true, capture: true });

/* Back to top: appears after scrolling down; its ring shows how far down the page is */
(() => {
  const R = 27, LEN = 2 * Math.PI * R;
  const btn = document.createElement('button');
  btn.className = 'to-top'; btn.type = 'button';
  btn.innerHTML = `<svg class="ring" viewBox="0 0 60 60" aria-hidden="true"><circle class="bg" cx="30" cy="30" r="${R}"/><circle class="fg" cx="30" cy="30" r="${R}" stroke-dasharray="${LEN}" stroke-dashoffset="${LEN}"/></svg>${icon('arrowUp')}`;
  document.body.appendChild(btn);
  const fg = btn.querySelector('.fg');
  let raf = 0;
  const update = () => {
    raf = 0;
    const el = pageScroller(), max = el.scrollHeight - el.clientHeight, y = el.scrollTop;
    btn.classList.toggle('show', y > 360);
    // In the middle of the content area, not in a corner
    const m = document.querySelector('.main'), r = m ? m.getBoundingClientRect() : { left: 0, width: innerWidth };
    btn.style.left = `${Math.round(r.left + r.width / 2 - 26)}px`;
    if (btn.dataset.lang !== S.lang) { btn.dataset.lang = S.lang; btn.setAttribute('aria-label', t('toTop')); btn.title = t('toTop'); }
    fg.style.strokeDashoffset = max > 0 ? LEN * (1 - Math.min(1, y / max)) : LEN;
  };
  addEventListener('scroll', e => { if (!raf && (e.target === document || e.target === pageScroller())) raf = requestAnimationFrame(update); }, { passive: true, capture: true });
  addEventListener('hashchange', () => setTimeout(update, 50));
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  // The sidebar folding open or closed moves the middle
  new MutationObserver(() => setTimeout(update, 320)).observe(html, { attributes: true, attributeFilter: ['class'] });
  btn.addEventListener('click', () => { scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); btn.blur(); });
  update();
})();

let rz;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { $$('.seg').forEach(placeThumb); if (innerWidth >= 1024) html.classList.remove('sb-open'); }, 100); });
addEventListener('hashchange', go);

/* ---------- Login ---------- */
let loginWaiters = [];
function showLogin(message = '') {
  const el = $('#login');
  el.innerHTML = `
    <div class="lg-card" role="dialog" aria-modal="true" aria-labelledby="lgT">
      <div class="lg-top"><span class="logo lg-logo">${LOGO}</span>
        <div class="seg lang-seg"><i class="thumb"></i><button class="${S.lang === 'ar' ? 'on' : ''}" data-lang="ar">ع</button><button class="${S.lang === 'en' ? 'on' : ''}" data-lang="en">EN</button></div></div>
      <h1 id="lgT">${t('loginTitle')}</h1><p class="lg-sub">${message || t('loginSub')}</p>
      <form id="lgForm" novalidate>
        <label class="field"><span class="sr">${t('loginCode')}</span>
          <span class="lg-input">${icon('shield')}<input id="lgCode" type="password" inputmode="numeric" autocomplete="off" placeholder="${t('loginCode')}" aria-label="${t('loginCode')}" required></span></label>
        <small class="err lg-err" id="lgErr" role="alert"></small>
        <button class="btn btn-primary lg-btn" id="lgBtn" type="submit"><span>${t('loginBtn')}</span>${icon('arrow', 'flip')}</button>
      </form>
      ${LIVE.mock ? `<p class="lg-mock">${icon('info')}${t('mockMode')} · <b>${t('mockHint')}</b></p>` : ''}
    </div>`;
  html.classList.add('logged-out');
  el.classList.add('open');
  requestAnimationFrame(() => { $$('.seg', el).forEach(placeThumb); $('#lgCode')?.focus(); });
  $('#lgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const input = $('#lgCode'), btn = $('#lgBtn'), err = $('#lgErr');
    if (!input.value.trim()) { input.focus(); return; }
    btn.disabled = true; btn.classList.add('loading'); err.textContent = '';
    const code = input.value;
    try {
      await LIVE.login(code);
      el.classList.add('leaving');
      setTimeout(() => { el.classList.remove('open', 'leaving'); el.innerHTML = ''; html.classList.remove('logged-out'); }, 450);
      const waiters = loginWaiters; loginWaiters = [];
      if (waiters.length) waiters.forEach(w => w(code));
      else enterApp();
    } catch (ex) {
      err.textContent = t(ex.kind === 'network' ? 'loginNetwork' : ex.kind === 'nouser' ? 'loginNoUser' : 'loginInvalid');
      input.value = ''; input.focus();
      $('.lg-card').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 });
    } finally { btn.disabled = false; btn.classList.remove('loading'); }
  });
}
// The server refused the saved session mid-use: ask again, then retry the request.
LIVE.setLoginPrompt(() => new Promise(resolve => { loginWaiters.push(resolve); if (!$('#login').classList.contains('open')) showLogin(t('sessionExpired')); }));

async function askLogout() {
  const ok = await confirmDialog({ title: t('logoutQ'), body: `<p class="cf-note">${t('logoutSub')}</p>`, ok: t('logout'), tone: 'danger', icon: 'out' });
  if (!ok) return;
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  LIVE.logout();
  showLogin();
}

/* Live badge on the sidebar for pending stock moves */
function watchBadges() {
  // While older invoices are still arriving, the header's live tag says so
  LIVE.listen(() => document.documentElement.classList.toggle('loading-old', LIVE.partial()));
  LIVE.watch(['pendingStockMoves'], () => {
    const n = Object.values(LIVE.cache.pendingStockMoves || {}).filter(m => (m.status || 'pending') === 'pending').length;
    NAV_BADGE['pending-movements'] = n;
    $$('.nav-link[data-route="pending-movements"]').forEach(a => {
      let b = $('.nl-badge', a);
      if (!n) { b && b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'nl-badge'; a.appendChild(b); }
      if (b.textContent !== String(n)) { b.textContent = n; b.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
    });
  });
}

/* ---------- System data download (local-copy.js) ---------- */
// The copy saved on this device opens at once; without one, the user downloads it first.
async function enterApp() {
  if (LIVE.copySupported && !LIVE.copyReady()) {
    const opened = await LIVE.openCopy().catch(() => false);
    if (!opened) await showPreload();
  }
  startApp();
}

const fmtSize = b => (b >= 1048576 ? `${fmtNum(b / 1048576, 1, 1)} ${t('pl.mb')}` : `${fmtNum(Math.max(b, 0) / 1024, 0, 0)} ${t('pl.kb')}`);
function fmtLeft(s) {
  if (!isFinite(s)) return '…';
  if (s < 1) return t('pl.lessSec');
  s = Math.ceil(s);
  return s < 60 ? `${s} ${t('pl.sec')}` : `${Math.floor(s / 60)} ${t('pl.min')} ${s % 60 ? `${s % 60} ${t('pl.sec')}` : ''}`.trim();
}

function showPreload() {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'pl-wrap'; el.id = 'preload';
    el.innerHTML = `
      <div class="pl-box" role="dialog" aria-modal="true" aria-labelledby="plT">
        <span class="logo pl-logo">${LOGO}</span>
        <h1 id="plT">${t('pl.title')}</h1>
        <p class="pl-sub">${t('pl.sub')}</p>
        <div class="pl-stage" id="plStage">
          <button class="btn btn-primary pl-btn" id="plBtn">${icon('download')}<span>${t('pl.btn')}</span></button>
        </div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => $('#plBtn', el).focus());
    const stage = $('#plStage', el);

    // «انتظر قليلاً» and «جارٍ تحميل بياناتك...» take turns: in, 2 s, out, the other one in
    let msgTimer = 0;
    function rotate(box) {
      const lines = [t('pl.wait'), t('pl.loading')];
      let i = 0;
      const show = () => {
        if (!box.isConnected) return;
        box.textContent = lines[i];
        const a = box.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
        msgTimer = setTimeout(() => {
          box.animate([{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(-10px)', filter: 'blur(4px)' }], { duration: 380, easing: 'ease-in', fill: 'both' })
            .onfinish = () => { i = (i + 1) % lines.length; show(); };
        }, 2000 + 450);
        return a;
      };
      show();
    }

    async function start() {
      const btn = $('#plBtn', el);
      await btn.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 220, easing: 'ease-in', fill: 'both' }).finished;
      stage.innerHTML = `
        <div class="pl-progress">
          <div class="pl-head"><b id="plPct">0%</b><span id="plLoaded"></span></div>
          <div class="pl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="plBar"><i id="plFill"></i></div>
          <div class="pl-line"><span>${t('pl.remaining')} <b id="plRemain">…</b></span><span>${t('pl.timeLeft')} <b id="plTime">…</b></span></div>
          <p class="pl-msg" id="plMsg" aria-live="polite"></p>
        </div>`;
      stage.firstElementChild.animate([{ opacity: 0, transform: 'translateY(8px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      rotate($('#plMsg', el));
      const t0 = performance.now();
      let rate = 0, lastDraw = 0;
      const draw = p => {
        const now = performance.now();
        if (now - lastDraw < 120 && p.done < p.count) return;
        lastDraw = now;
        const pct = p.total ? Math.min(100, Math.floor(p.loaded / p.total * 100)) : 0;
        $('#plFill', el).style.width = `${pct}%`;
        $('#plBar', el).setAttribute('aria-valuenow', pct);
        $('#plPct', el).textContent = `${pct}%`;
        const secs = (now - t0) / 1000, speed = secs > .4 ? p.loaded / secs : 0;
        rate = rate ? rate * .7 + speed * .3 : speed;
        $('#plLoaded', el).innerHTML = `<b>${fmtSize(p.loaded)}</b> ${t('pl.of')} ${fmtSize(p.total)}`;
        $('#plRemain', el).textContent = fmtSize(p.total - p.loaded);
        $('#plTime', el).textContent = p.done === p.count ? t('pl.lessSec') : rate ? fmtLeft((p.total - p.loaded) / rate) : '…';
      };
      try {
        await LIVE.downloadCopy(draw);
        clearTimeout(msgTimer);
        $('#plFill', el).style.width = '100%';
        $('#plPct', el).textContent = '100%';
        $('#plRemain', el).textContent = fmtSize(0);
        $('#plTime', el).textContent = '-';
        const msg = $('#plMsg', el);
        msg.getAnimations().forEach(a => a.cancel());
        msg.innerHTML = `${icon('check')}${t('pl.done')}`;
        msg.classList.add('ok');
        msg.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        setTimeout(() => {
          el.classList.add('leaving');
          setTimeout(() => el.remove(), 450);
          resolve();
        }, 700);
      } catch (e) {
        clearTimeout(msgTimer);
        stage.innerHTML = `<p class="pl-err" role="alert">${icon('alert')}${t(e.kind === 'network' ? 'pl.netFailed' : 'pl.failed')}</p>
          <button class="btn btn-primary pl-btn" id="plBtn">${icon('refresh')}<span>${t('pl.retry')}</span></button>`;
        $('#plBtn', el).addEventListener('click', start, { once: true });
      }
    }
    $('#plBtn', el).addEventListener('click', start, { once: true });
  });
}

function startApp() {
  renderSidebar();
  go();
  watchBadges();
  STOCK_ALARM.start();
  LIVE.presence('accounting');
}

/* Boot */
delete NAV_BADGE['pending-movements'];
LIVE.restore().then(user => (user ? enterApp() : showLogin()));
requestAnimationFrame(() => html.classList.add('ready'));


/* Enter / Space on a clickable card acts like a click */
document.addEventListener('keydown', e => {
  const k = (e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.kpi-link');
  if (k) { e.preventDefault(); k.click(); }
});

/* Shared «what's behind this card» full page (inside the current page, with a back button).
   The page keeps a state flag (e.g. st.drill) and calls kpiPage(box, cfg) from its draw(), so live
   updates refresh it; search text and «show more» survive those redraws.
   cfg: { title, sub, ic, chips: [[label, value, tone]], cols: [{ h, end }], rows: [{ id, cells, text, x }],
          onRow(id), onBack(), file (Excel name), empty } */
function kpiPage(box, cfg) {
  const PAGE = 100;
  if (!box._kd) {
    box._kd = { q: '', shown: PAGE };
    box.innerHTML = `
      <div class="back-bar"><button class="btn btn-ghost btn-sm" data-kd="back">${icon('chevLeft', 'flip')}<span>${t('kd.back')}</span></button></div>
      <header class="ph kd-head" data-anim><div class="ph-ic" data-kd-ic></div><div class="ph-txt"><h1 data-kd-title></h1><p data-kd-sub></p></div>
        <div class="ph-actions"><button class="btn btn-primary" data-kd="export">${icon('download')}<span>${t('o.download')}</span></button></div></header>
      <section class="kd-chips" data-kd-chips data-anim></section>
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools"><label class="search-field">${icon('search')}<input type="search" data-kd-q placeholder="${t('kd.search')}" autocomplete="off"></label><span class="tb-spacer"></span><span class="kd-n" data-kd-n></span></div>
        <div class="table-wrap"><table class="dt it-table kd-table"><thead data-kd-th></thead><tbody data-kd-b></tbody></table></div>
        <footer class="kd-more" data-kd-more></footer>
      </section>`;
    stagger(box);
    let deb;
    $('[data-kd-q]', box).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { box._kd.q = e.target.value.trim(); box._kd.shown = PAGE; paint(); }, 150); });
    box.addEventListener('click', e => {
      const c = box._kd.cfg;
      const a = e.target.closest('[data-kd]');
      if (a && a.dataset.kd === 'back') { c.onBack && c.onBack(); return; }
      if (a && a.dataset.kd === 'export') { excelOut(list().map(r => r.x), c.file || 'report.xlsx'); return; }
      if (a && a.dataset.kd === 'more') { box._kd.shown += PAGE; paint(); return; }
      const row = !e.target.closest('a, button, input') && e.target.closest('.kd-row');
      if (row && c.onRow) c.onRow(row.dataset.kid);
    });
    box.addEventListener('keydown', e => { const row = e.key === 'Enter' && e.target.closest('.kd-row'); if (row && box._kd.cfg.onRow) box._kd.cfg.onRow(row.dataset.kid); });
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  box._kd.cfg = cfg;
  const list = () => { const c = box._kd.cfg, k = normQ(box._kd.q); return k ? c.rows.filter(r => normQ(r.text || '').includes(k)) : c.rows; };
  function paint() {
    const c = box._kd.cfg, l = list(), shown = box._kd.shown;
    $('[data-kd-ic]', box).innerHTML = icon(c.ic || 'chart');
    $('[data-kd-title]', box).textContent = c.title;
    setHtml($('[data-kd-sub]', box), c.sub || '');
    setHtml($('[data-kd-chips]', box), (c.chips || []).map(([lb, v, tone]) => `<div class="kd-chip card${tone ? ' tone-' + tone : ''}"><small>${esc(lb)}</small><b>${v}</b></div>`).join(''));
    $('[data-kd-chips]', box).hidden = !(c.chips || []).length;
    $('[data-kd="export"]', box).hidden = !c.file;
    setHtml($('[data-kd-th]', box), `<tr>${c.cols.map(h => `<th class="${h.end ? 'end' : ''}">${h.h}</th>`).join('')}</tr>`);
    $('[data-kd-n]', box).textContent = `${fmtNum(l.length)} ${t('kd.rows')}`;
    setHtml($('[data-kd-b]', box), l.length ? l.slice(0, shown).map(r => `<tr${c.onRow && r.id != null ? ` class="kd-row" data-kid="${esc(r.id)}" tabindex="0"` : ''}>${r.cells.map((x, i) => `<td data-label="${esc(String(c.cols[i].h).replace(/<[^>]+>/g, ''))}" class="${c.cols[i].end ? 'end num' : ''}">${x}</td>`).join('')}</tr>`).join('')
      : `<tr class="empty"><td colspan="${c.cols.length}"><div class="empty-state">${icon(box._kd.q ? 'search' : (c.ic || 'chart'))}<b>${box._kd.q ? t('emptyTitle') : (c.empty || t('kd.none'))}</b></div></td></tr>`);
    setHtml($('[data-kd-more]', box), l.length > shown ? `<button class="btn btn-soft btn-sm" data-kd="more">${t('kd.more').replace('{n}', fmtNum(Math.min(PAGE, l.length - shown)))}</button>` : '');
  }
  paint();
}

/* Card pages for any page: a click on a `.kpi-link` hides the page's own content and shows the
   card's full page in its place; «رجوع» brings the page back exactly as it was.
   build(kind) → kpiPage cfg (or null to close); paths = what it reads (refreshes it live).
   Returns close() — call it from the page's cleanup. */
function kpiDrills(view, { paths, build, ready }) {
  let kind = null, label = '', host = null, unsub = null;
  const ok = () => (ready ? ready() : LIVE.complete(paths));
  function refresh() {
    if (!kind) return;
    if (!host || !host.isConnected) { close(); return; }
    if (!ok()) { if (!host._kd) host.innerHTML = `<section class="kpis">${skeletonKpis()}</section>`; return; }
    const cfg = build(kind, label);
    if (!cfg) { close(); return; }
    if (!host._kd) host.innerHTML = '';
    kpiPage(host, { ...cfg, title: cfg.title || label, onBack: close });
  }
  function open(k, lab) {
    close();
    kind = k; label = lab || ''; host = document.createElement('div'); host.className = 'kd-host';
    view.appendChild(host); view.classList.add('kd-on');
    refresh();
    unsub = LIVE.watch(paths, refresh);
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  function close() {
    const was = !!kind;
    kind = null; if (unsub) unsub(); unsub = null;
    if (host) host.remove(); host = null;
    view.classList.remove('kd-on');
    if (was) scrollTo({ top: 0, behavior: 'smooth' });
  }
  view.addEventListener('click', e => {
    const k = e.target.closest('.kpi-link[data-drill]');
    if (!k || (host && host.contains(k))) return;
    const lb = k.querySelector('.kpi-label');
    e.stopPropagation(); open(k.dataset.drill, lb ? lb.textContent.trim() : '');
  }, true);
  close.refresh = refresh; // for data that doesn't come through LIVE (e.g. online orders)
  return close;
}

/* A «breakdown» card page: totals grouped by something (branch, area, payment method…).
   items: [{ key, label, n, v }] — n = how many records, v = amount (money unless kind = 'num'). */
function kdBreakdown({ title, sub, ic, file, groupH, countH, valueH, items, kind = 'money', chips = [] }) {
  const fmt = v => (kind === 'money' ? fmtMoney(v) : fmtNum(v, 3));
  const raw = v => +Number(v || 0).toFixed(3);
  const list = items.filter(x => x.n || x.v).sort((a, b) => b.v - a.v || b.n - a.n);
  const total = list.reduce((s, x) => s + x.v, 0), count = list.reduce((s, x) => s + x.n, 0);
  return {
    title, sub, ic, file,
    chips: [[valueH, fmt(total)], [countH, fmtNum(count)], [groupH, fmtNum(list.length)], ...chips],
    cols: [{ h: '#' }, { h: groupH }, { h: countH, end: 1 }, { h: valueH, end: 1 }, { h: t('kd.share') }],
    rows: list.map((x, i) => {
      const pct = total ? (x.v / total) * 100 : 0;
      return { id: x.key, text: x.label,
        cells: [`<span class="muted">${i + 1}</span>`, `<b>${esc(x.label)}</b>`, fmtNum(x.n), fmt(x.v),
          `<span class="kd-share"><i style="--w:${pct.toFixed(1)}%"></i><bdi dir="ltr">${fmtNum(pct, 1)}%</bdi></span>`],
        x: { [groupH]: x.label, [countH]: x.n, [valueH]: raw(x.v), [t('kd.share')]: +pct.toFixed(1) } };
    })
  };
}
/* Group records into kdBreakdown items */
function kdGroup(list, keyOf, labelOf, valOf) {
  const m = new Map();
  list.forEach(r => { const k = keyOf(r) || '-'; const g = m.get(k) || { key: k, label: labelOf(r) || '-', n: 0, v: 0 }; g.n++; g.v += Number(valOf(r) || 0); m.set(k, g); });
  return [...m.values()];
}
