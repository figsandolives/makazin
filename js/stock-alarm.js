/* Stock alarm — products and stock materials at or near their reorder point.
   The storekeeper hears a repeating alert and sees those pages red in the sidebar (with a speaker)
   on every page, until they open the blinking card on that page. What they opened is remembered per
   user on this device; an item that newly reaches the point rings again. */
const STOCK_ALARM = (() => {
  const SRC = { products: 'products', 'stock-materials': 'stockMaterials' };
  const KINDS = ['critical', 'warning'];
  // Only the storekeeper, and only in the tab of the account last signed in on this device (another
  // tab still open on an older storekeeper session stays quiet, and reloads into the new account)
  const current = () => { try { const id = localStorage.getItem('raseed.user'); return !id || id === LIVE.user.id; } catch (e) { return true; } };
  const keeper = () => !!LIVE.user && LIVE.user.role === 'storekeeper' && current();
  let acked = null, ackedFor = null, started = false, unwatch = null, ctx = null, hinted = false;

  function seen() {
    const id = (LIVE.user || {}).id || '';
    if (ackedFor !== id) { ackedFor = id; try { acked = JSON.parse(localStorage.getItem(`raseed.alarmAck.${id}`) || '{}') || {}; } catch (e) { acked = {}; } }
    return acked;
  }
  // {critical: [ids], warning: [ids]} over all branches
  function alerts(route) {
    const out = { critical: [], warning: [] };
    Object.entries(LIVE.cache[SRC[route]] || {}).forEach(([id, it]) => {
      if (!it || typeof it !== 'object') return;
      const tone = reorderTone(itemStock(it, 'all'), Number(it.reorderPoint || 0));
      if (tone) out[tone].push(id);
    });
    return out;
  }
  const ringing = route => {
    if (!(SRC[route] in LIVE.cache)) return false;
    const a = alerts(route), s = seen()[route] || {};
    return KINDS.some(k => { const old = new Set(s[k] || []); return a[k].some(id => !old.has(id)); });
  };
  let ring = new Set();
  /* A card that still has items the storekeeper hasn't opened (it shows a speaker) */
  const unseen = (route, kind) => {
    if (!keeper() || !SRC[route] || !(SRC[route] in LIVE.cache)) return false;
    const old = new Set((seen()[route] || {})[kind] || []);
    return alerts(route)[kind].some(id => !old.has(id));
  };

  /* Opening a card: what it shows now counts as seen */
  function ack(route, kind) {
    if (!SRC[route]) return;
    const s = seen();
    (s[route] ||= {})[kind] = alerts(route)[kind];
    try { localStorage.setItem(`raseed.alarmAck.${ackedFor}`, JSON.stringify(s)); } catch (e) {}
    paint();
  }

  function paint() {
    ring = new Set(keeper() ? Object.keys(SRC).filter(ringing) : []);
    $$('.nav-link[data-route]').forEach(a => {
      const on = ring.has(a.dataset.route);
      a.classList.toggle('nl-alarm', on);
      let ic = $('.nl-alarm-ic', a);
      if (on && !ic) { ic = document.createElement('span'); ic.className = 'nl-alarm-ic'; ic.innerHTML = icon('volume'); a.appendChild(ic); }
      if (!on && ic) ic.remove();
      if (on) a.setAttribute('data-tip', `${t(a.dataset.route)} · ${t('alarmTip')}`); else a.setAttribute('data-tip', t(a.dataset.route));
    });
    $$('.sb-group').forEach(g => g.classList.toggle('has-alarm', !!$('.nl-alarm', g)));
  }

  // A quick run of short tones, repeated every second; browsers only let a page play sound after the user has clicked or typed on it
  function beep() {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        if (ctx.state === 'suspended') { if (!hinted) { hinted = true; toast(t('alarmClick'), { tone: 'danger', ic: 'volume' }); } return; }
      }
      [[988, 0], [784, .14], [988, .28], [784, .42]].forEach(([f, at]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + at;
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.12, t0 + .02); g.gain.linearRampToValueAtTime(0, t0 + .11);
        o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + .12);
      });
    } catch (e) {}
  }
  const unlock = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };

  // Called after every login (logging out drops the data listeners)
  function start() {
    if (unwatch) unwatch();
    unwatch = LIVE.watch(['products', 'stockMaterials'], paint);
    paint();
    if (started) return;
    started = true;
    addEventListener('pointerdown', unlock, true);
    addEventListener('keydown', unlock, true);
    addEventListener('storage', e => { if (e.key === 'raseed.user' && LIVE.user && e.newValue !== LIVE.user.id) location.reload(); });
    setInterval(() => { if (ring.size && keeper()) beep(); }, 1000);
  }

  return { start, paint, ack, unseen };
})();

// A card that opens a list of its items; it blinks red while it has any, with a speaker while it
// is a source of the alarm the storekeeper hasn't opened yet
const alertKpi = (kind, label, value, ic, loud) => kpiCard({ label, value, ic, tone: 'c4' })
  .replace('<article class="kpi card"', `<article class="kpi card kpi-alert${value ? ' on' : ''}" data-alert="${kind}" role="button" tabindex="0" aria-label="${esc(label)}: ${value}"`)
  .replace('<div class="kpi-top">', `${loud ? `<span class="kpi-loud" title="${esc(t('alarmTip'))}">${icon('volume')}</span>` : ''}<div class="kpi-top">`);
