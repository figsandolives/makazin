/* =====================================================================
   أسعار التوصيل — deliveryPrices/{group}/{area} {area, price, groupKey, groupLabel, updatedAt}; the
   cashier picks the group by its branch (أبو الحصانية, or the main branch and Yarmouk) and the area
   from the customer's address, and saves a price from an invoice the same way.
   Same as the old page (the two groups, the area list, prices from past invoices, one save), plus
   fixes: saving writes only the areas that changed (the old page replaced the whole group, deleting
   every price the cashier saved for an area outside the fixed list), those cashier areas are listed,
   a price from past invoices is the latest one of that group's delivery invoices (the old page mixed
   the branches and took any invoice), a wrong number is shown instead of being dropped (which
   deleted the price), and typed prices survive live updates and ask before being thrown away.
   ===================================================================== */
LIVE_ROUTES.add('delivery-fees');

PAGES['delivery-fees'] = view => {
  const st = (S.dp ||= { group: 'mainYarmouk', q: '' });
  const PATHS = ['deliveryPrices', 'deliveryZones', 'orders', 'branches'];
  const GROUPS = ['mainYarmouk', 'abuHasaniya'];
  const LABEL = { mainYarmouk: 'الفرع الرئيسي واليرموك', abuHasaniya: 'فرع أبو الحصانية' };
  const AREAS = CASHIER_AREAS;
  const ABU = normQ('أبو الحصانية');
  const edits = new Map(); // area -> typed text (this group only)
  let first = true, saving = false;

  view.innerHTML = `
    ${pageHeader('delivery-fees', `<button class="btn btn-primary" data-dp="save">${icon('check')}<span>${t('dp.save')}</span></button>`, t('dp.sub'))}
    <div class="dp-groups"><div class="seg" id="dpSeg" role="tablist"><i class="thumb"></i>${GROUPS.map(g => `<button role="tab" class="${st.group === g ? 'on' : ''}" data-group="${g}">${icon('building')}<span>${t('dp.g_' + g)}</span></button>`).join('')}</div></div>
    <section class="kpis" id="dpK"></section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="dpQ" placeholder="${t('dp.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <span class="tb-spacer"></span><span class="muted dp-dirty-n" id="dpDirty"></span></div>
      <div class="table-wrap"><table class="dt it-table dp-table">
        <thead><tr><th>${t('dp.area')}</th><th>${t('dp.price')}</th><th>${t('dp.source')}</th></tr></thead>
        <tbody id="dpBody"></tbody></table></div>
      <footer class="dp-foot"><button class="btn btn-primary" data-dp="save">${icon('check')}<span>${t('dp.save')}</span></button></footer>
    </section>`;

  /* ---------- data ---------- */
  const prices = () => LIVE.cache.deliveryPrices || {};
  const num = v => { if (v === undefined || v === null || v === '') return null; const n = Number(typeof v === 'object' ? v.price : v); return Number.isFinite(n) ? n : null; };
  // Saved price as the cashier reads it: the group, the old per-area record, then a zone price row
  function saved(area, g) {
    const p = prices(), direct = num((p[g] || {})[area]);
    if (direct !== null) return direct;
    if (!GROUPS.includes(area)) { const legacy = num(p[area]); if (legacy !== null) return legacy; }
    const key = normQ(area);
    const ids = new Set(Object.entries(LIVE.cache.deliveryZones || {}).filter(([, z]) => z && normQ(z.nameAr || z.name || z.nameEn || '') === key).map(([id]) => String(id)));
    if (!ids.size) return null;
    for (const row of Object.values(p)) {
      if (!row || typeof row !== 'object' || (row.groupKey && row.groupKey !== g)) continue;
      const zs = Array.isArray(row.zoneIds) ? row.zoneIds : row.zoneIds && typeof row.zoneIds === 'object' ? Object.values(row.zoneIds) : [];
      if (zs.some(id => ids.has(String(id)))) { const v = num(row); if (v !== null) return v; }
    }
    return null;
  }
  const orderBranch = o => o.branch || o.branchName || ((LIVE.cache.branches || {})[o.branchId] || {}).nameAr || '';
  const groupOf = o => (normQ(orderBranch(o)) === ABU ? 'abuHasaniya' : 'mainYarmouk');
  const orderArea = o => String(o.deliveryArea || o.area || o.areaName || o.deliveryZoneName || o.zoneName
    || ((LIVE.cache.deliveryZones || {})[o.deliveryZoneId] || {}).nameAr || String(o.address || '').split(' - ')[0] || '').trim();
  // The latest delivery price of each area on this group's invoices
  function inferred(g) {
    const out = new Map();
    Object.values(LIVE.cache.orders || {}).filter(o => o && typeof o === 'object' && !oCancelled(o) && oFee(o) > 0 && groupOf(o) === g)
      .sort((a, b) => oTime(b) - oTime(a))
      .forEach(o => { const k = normQ(orderArea(o)); if (k && !out.has(k)) out.set(k, oFee(o)); });
    return out;
  }
  function rows() {
    const g = st.group, inf = inferred(g);
    const extra = Object.keys(prices()[g] || {}).filter(a => !AREAS.includes(a)).sort((a, b) => a.localeCompare(b, 'ar'));
    return [...AREAS, ...extra].map(area => {
      const s = saved(area, g), i = inf.get(normQ(area));
      const value = s !== null ? s : i !== undefined ? i : null;
      return { area, value, source: s !== null ? 'saved' : i !== undefined ? 'invoices' : 'unknown', extra: !AREAS.includes(area) };
    });
  }
  const fmt = v => (v === null ? '' : Number(v).toFixed(3));
  const parse = s => { const v = toLatin(String(s || '')).replace(/[٫,]/g, '.').trim(); return v === '' ? '' : /^\d*\.?\d+$|^\d+\.$/.test(v) ? Number(v) : NaN; };

  /* ---------- view ---------- */
  function draw() {
    const body = $('#dpBody', view); if (!body) return;
    placeThumb($('#dpSeg', view));
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(8, 3)); if (first) setKpis($('#dpK', view), skeletonKpis(3), true); return; }
    const list = rows(), known = list.filter(r => r.value !== null).length;
    setKpis($('#dpK', view), [
      kpiCard({ label: t('dp.kAreas'), value: list.length, ic: 'pin', tone: 'c1' }),
      kpiCard({ label: t('dp.kKnown'), value: known, ic: 'check', tone: 'c2', drill: 'known' }),
      kpiCard({ label: t('dp.kMissing'), value: list.length - known, ic: 'alert', tone: 'c4', drill: 'missing' })
    ].join(''), first);
    // Keep what is being typed: rebuild the rows only while nothing is edited
    if (edits.size && !first && $$('tr[data-area]', body).length) { marks(); return; }
    const q = normQ(st.q);
    const shown = list.filter(r => !q || normQ(r.area).includes(q));
    setHtml(body, shown.length ? shown.map((r, i) => `<tr data-area="${esc(r.area)}" class="${first ? 'row-in' : ''}" style="--r:${Math.min(i, 20)}">
        <td data-label="${t('dp.area')}"><b>${esc(r.area)}</b>${r.extra ? ` <span class="pk-type">${t('dp.fromCashier')}</span>` : ''}</td>
        <td data-label="${t('dp.price')}"><div class="dp-in"><input class="mono" dir="ltr" inputmode="decimal" autocomplete="off" value="${esc(edits.has(r.area) ? edits.get(r.area) : fmt(r.value))}" placeholder="${t('dp.pricePh')}" aria-label="${esc(r.area)}"><span>${t('currency')}</span></div></td>
        <td data-label="${t('dp.source')}"><span class="badge tone-${{ saved: 'success', invoices: 'info', unknown: 'neutral' }[r.source]}"><i></i>${t('dp.s_' + r.source)}</span></td></tr>`).join('')
      : `<tr class="empty"><td colspan="3"><div class="empty-state">${icon('search')}<b>${t('emptyTitle')}</b><small>${t('emptySub')}</small></div></td></tr>`);
    first = false;
    marks();
  }
  // Changed and wrong prices are marked, and the save buttons say how many changed
  function marks() {
    const base = new Map(rows().map(r => [r.area, fmt(r.value)]));
    $$('tr[data-area]', view).forEach(tr => {
      const a = tr.dataset.area, inp = $('input', tr);
      const v = edits.has(a) ? edits.get(a) : inp.value;
      tr.classList.toggle('dp-changed', edits.has(a) && v.trim() !== (base.get(a) || ''));
      tr.classList.toggle('dp-bad', Number.isNaN(parse(v)));
    });
    const n = changes().length;
    setHtml($('#dpDirty', view), n ? t('dp.changed').replace('{n}', n) : '');
  }
  const changes = () => {
    const base = new Map(rows().map(r => [r.area, fmt(r.value)]));
    return [...edits].filter(([a, v]) => v.trim() !== (base.get(a) || ''));
  };

  async function save() {
    if (saving || !LIVE.loaded(PATHS)) return;
    const bad = [...edits].find(([, v]) => Number.isNaN(parse(v)));
    if (bad) {
      toast(t('dp.badPrice').replace('{a}', bad[0]), { tone: 'danger', ic: 'alert' });
      const tr = $(`tr[data-area="${CSS.escape(bad[0])}"]`, view); tr && $('input', tr).focus();
      return;
    }
    const g = st.group, cur = prices()[g] || {}, at = Date.now(), up = {};
    // Every listed area with a price (as on the old page, so prices from past invoices become saved),
    // written one by one — areas not touched here keep their record as it is
    rows().forEach(r => {
      const typed = edits.has(r.area) ? parse(edits.get(r.area)) : r.value;
      const path = `deliveryPrices/${g}/${r.area}`;
      if (typed === '' || typed === null) { if (cur[r.area] !== undefined) up[path] = null; return; }
      const price = Number(Number(typed).toFixed(3));
      const old = cur[r.area];
      if (old && typeof old === 'object' && num(old) === price) return;
      if (old && typeof old === 'object') Object.assign(up, { [`${path}/price`]: price, [`${path}/updatedAt`]: at });
      else up[path] = { area: r.area, price, groupKey: g, groupLabel: LABEL[g], updatedAt: at };
    });
    if (!Object.keys(up).length) { edits.clear(); draw(); toast(t('dp.nothing')); return; }
    const btns = $$('[data-dp="save"]', view); saving = true; btns.forEach(b => b.classList.add('loading'));
    try { await LIVE.update(up); edits.clear(); toast(t('dp.saved')); first = true; draw(); }
    catch (e) { toast(t('dp.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    finally { saving = false; btns.forEach(b => b.classList.remove('loading')); }
  }

  async function switchGroup(g) {
    if (g === st.group) return;
    if (changes().length && !(await confirmDialog({ title: t('dp.discardQ'), body: `<p class="cf-note">${t('dp.discardNote')}</p>`, ok: t('dp.discard'), tone: 'danger', icon: 'alert' }))) return;
    edits.clear(); st.group = g;
    $$('#dpSeg [data-group]', view).forEach(b => b.classList.toggle('on', b.dataset.group === g));
    first = true; draw();
  }

  view.addEventListener('input', e => {
    if (e.target.id === 'dpQ') { st.q = e.target.value; const keep = new Map(edits); draw(); edits.clear(); keep.forEach((v, k) => edits.set(k, v)); return; }
    const tr = e.target.closest('tr[data-area]'); if (!tr) return;
    e.target.value = toLatin(e.target.value).replace(/[٫,]/g, '.').replace(/[^0-9.]/g, '');
    edits.set(tr.dataset.area, e.target.value); marks();
  });
  view.addEventListener('focusout', e => {
    const tr = e.target.closest && e.target.closest('tr[data-area]'); if (!tr) return;
    const v = parse(e.target.value);
    if (typeof v === 'number' && !Number.isNaN(v)) { e.target.value = v.toFixed(3); edits.set(tr.dataset.area, e.target.value); marks(); }
  });
  view.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.closest('tr[data-area]')) return;
    e.preventDefault();
    const ins = $$('tr[data-area] input', view), i = ins.indexOf(e.target);
    (ins[i + 1] || e.target).focus(); ins[i + 1] && ins[i + 1].select();
  });
  view.addEventListener('click', e => {
    const g = e.target.closest('[data-group]'); if (g) return switchGroup(g.dataset.group);
    if (e.target.closest('[data-dp="save"]')) save();
  });
  // Card pages: areas with a price / without one; a row jumps to that area's price box
  const closeDrill = kpiDrills(view, { paths: PATHS, ready: () => LIVE.loaded(PATHS), build: kind => {
    if (kind !== 'known' && kind !== 'missing') return null;
    const all = rows(), list = all.filter(r => (kind === 'known') === (r.value !== null));
    const src = r => `<span class="badge tone-${{ saved: 'success', invoices: 'info', unknown: 'neutral' }[r.source]}"><i></i>${t('dp.s_' + r.source)}</span>`;
    const vals = list.map(r => r.value).filter(v => v !== null);
    return { title: t(kind === 'known' ? 'dp.kKnown' : 'dp.kMissing'), sub: `${esc(LABEL[st.group] || '')} · ${t('kd.dpSub')}`, ic: kind === 'known' ? 'check' : 'alert', file: `delivery-${kind}-${st.group}.xlsx`,
      onRow: area => { closeDrill(); st.q = ''; const q = view.querySelector('input[type=search]'); if (q) q.value = ''; draw(); requestAnimationFrame(() => { const tr = [...view.querySelectorAll('tr[data-area]')].find(x => x.dataset.area === area); if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = tr.querySelector('input'); if (i) i.focus({ preventScroll: true }); } }); },
      chips: kind === 'known' ? [[t('kd.area'), fmtNum(list.length)], [t('kd.minPrice'), vals.length ? fmtMoney(Math.min(...vals)) : '—'], [t('kd.maxPrice'), vals.length ? fmtMoney(Math.max(...vals)) : '—'], [t('dp.s_saved'), fmtNum(list.filter(r => r.source === 'saved').length), 'success'], [t('dp.s_invoices'), fmtNum(list.filter(r => r.source === 'invoices').length), 'info']]
        : [[t('kd.area'), fmtNum(list.length), 'danger'], [t('dp.kAreas'), fmtNum(all.length)]],
      cols: kind === 'known' ? [{ h: t('dp.area') }, { h: t('dp.price'), end: 1 }, { h: t('dp.source') }] : [{ h: '#' }, { h: t('dp.area') }, { h: t('dp.source') }],
      rows: list.map((r, i) => ({ id: r.area, text: r.area,
        cells: kind === 'known' ? [`<b>${esc(r.area)}</b>`, fmtMoney(r.value), src(r)] : [`<span class="muted">${i + 1}</span>`, `<b>${esc(r.area)}</b>`, src(r)],
        x: { [t('dp.area')]: r.area, ...(kind === 'known' ? { [t('dp.price')]: r.value } : {}), [t('dp.source')]: t('dp.s_' + r.source) } })) };
  } });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); closeDrill(); };
};
