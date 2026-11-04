/* Custom (non-table) pages. Each returns an optional cleanup function. */

const PAGES = {};

/* ================= Online orders (kanban) ================= */
const PLATFORMS = [B('التطبيق', 'App'), B('الموقع', 'Website'), B('واتساب', 'WhatsApp')];
const COLS = ['new', 'preparing', 'ready', 'delivering'];
function makeOnlineOrder(r, id, col) {
  const items = Array.from({ length: rint(r, 1, 3) }, () => ({ p: pick(r, POOL.products), q: rint(r, 1, 3) }));
  return { id, col, customer: pick(r, POOL.people), platform: pick(r, PLATFORMS), items, total: items.reduce((a, x) => a + x.q * rint(r, 12, 32), 0), mins: rint(r, 1, 28), type: r() > .5 ? 'delivery' : 'pickup' };
}
PAGES['online-orders'] = view => {
  if (!S.kanban) { const r = rng(42); S.kanban = Array.from({ length: 11 }, (_, i) => makeOnlineOrder(r, 10481 + i, COLS[[0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3][i]])); }
  const card = o => `
    <article class="ko card" data-id="${o.id}">
      <header><span class="mono id">#${o.id}</span><span class="plat">${L(o.platform)}</span><span class="mins">${icon('clock')}${o.mins} ${t('minsAgo')}</span></header>
      <div class="ko-cust">${cell('person', o.customer)}<span class="badge tone-${o.type === 'delivery' ? 'info' : 'accent'}"><i></i>${o.type === 'delivery' ? L(POOL.orderTypes[2]) : L(POOL.orderTypes[1])}</span></div>
      <ul class="ko-items">${o.items.map(x => `<li><b>${x.q}×</b> ${L(x.p)}</li>`).join('')}</ul>
      <footer><b class="num">${fmtMoney(o.total)}</b><button class="btn btn-sm ${o.col === 'delivering' ? 'btn-primary' : 'btn-soft'}" data-next>${t(o.col === 'delivering' ? 'complete' : 'nextStage')}${icon(o.col === 'delivering' ? 'check' : 'arrow', o.col === 'delivering' ? '' : 'flip')}</button></footer>
    </article>`;
  view.innerHTML = `
    ${pageHeader('online-orders', `<span class="live-dot">${t('live')}</span><button class="btn btn-ghost" data-act="sim">${icon('zap')}<span>${t('newOrderArrived')}</span></button>`)}
    <section class="kanban" data-anim>
      ${COLS.map((c, i) => `<div class="kcol k-${c}" data-col="${c}"><header><i class="dot c${i + 1}"></i><b>${t('k.' + c)}</b><span class="kcount">${S.kanban.filter(o => o.col === c).length}</span></header>
        <div class="klist">${S.kanban.filter(o => o.col === c).map(card).join('')}</div></div>`).join('')}
    </section>`;

  const counts = () => COLS.forEach(c => { $(`.kcol[data-col="${c}"] .kcount`, view).textContent = S.kanban.filter(o => o.col === c).length; });
  const flip = mutate => {
    const cards = $$('.ko', view), first = new Map(cards.map(c => [c, c.getBoundingClientRect()]));
    mutate();
    if (reduced.matches) return;
    cards.forEach(c => {
      if (!c.isConnected) return;
      const a = first.get(c), b = c.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  };
  const add = () => {
    const o = makeOnlineOrder(rng(Date.now() & 0xffff), Math.max(...S.kanban.map(x => x.id), 10480) + 1, 'new');
    o.mins = 0; S.kanban.push(o);
    flip(() => { $('.kcol[data-col="new"] .klist', view).insertAdjacentHTML('afterbegin', card(o)); });
    $(`.ko[data-id="${o.id}"]`, view).classList.add('pop');
    counts(); toast(`${t('newOrderArrived')} #${o.id}`, { tone: 'info', ic: 'bag' });
  };
  view.addEventListener('click', e => {
    if (e.target.closest('[data-act="sim"]')) { add(); return; }
    const btn = e.target.closest('[data-next]'); if (!btn) return;
    const el = btn.closest('.ko'), o = S.kanban.find(x => x.id === +el.dataset.id);
    const ci = COLS.indexOf(o.col);
    if (ci === COLS.length - 1) {
      el.classList.add('done');
      setTimeout(() => flip(() => { el.remove(); S.kanban = S.kanban.filter(x => x !== o); counts(); }), 320);
      toast(`#${o.id} — ${t('st.completed')}`);
      return;
    }
    o.col = COLS[ci + 1];
    flip(() => {
      const fresh = document.createElement('div'); fresh.innerHTML = card(o).trim();
      el.replaceWith(fresh.firstChild);
      const nu = $(`.ko[data-id="${o.id}"]`, view);
      $(`.kcol[data-col="${o.col}"] .klist`, view).prepend(nu);
    });
    counts();
  });
  const iv = setInterval(add, 20000);
  return () => clearInterval(iv);
};

/* Sticker maker: live page in js/sticker.js */
