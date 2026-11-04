/* =====================================================================
   الفروع — branches/{id} {nameAr, nameEn, address, isMain}. Same fields and table as the old page, plus
   fixes: errors show under each field, the main branch moves in one write (the old page cleared the
   others first, so a failed save left no main branch), the main branch can't be unmarked or deleted
   (stock, locations and products read it), names can't repeat, and deleting says what still uses it.
   ===================================================================== */
LIVE_ROUTES.add('branches');

PAGES.branches = view => {
  const st = (S.br ||= { per: 10, page: 1 });
  const PATHS = ['branches'];
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('branches', `<button class="btn btn-primary" data-br="new">${icon('plus')}<span>${t('br.add')}</span></button>`, t('br.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools"><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('br.name')}</th><th>${t('br.address')}</th><th>${t('br.main')}</th><th class="act-col"></th></tr></thead>
        <tbody id="brBody"></tbody></table></div>
      <footer class="pager" id="brPager"></footer>
    </section>`;

  const branches = () => LIVE.cache.branches || {};
  const valid = ([, b]) => b && typeof b === 'object';
  const mainId = () => (Object.entries(branches()).find(([, b]) => b && b.isMain) || [])[0] || null;
  const nameKey = v => normQ(String(v ?? '').trim());
  const nameTaken = (k, v, except) => !!nameKey(v) && Object.entries(branches()).some(([id, b]) => id !== except && b && nameKey(b[k]) === nameKey(v));
  const other = b => (S.lang === 'en' ? b.nameAr : b.nameEn) || '';

  function draw() {
    const body = $('#brBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 4)); return; }
    const main = mainId();
    const list = Object.entries(branches()).filter(valid)
      .sort((a, b) => (b[0] === main) - (a[0] === main) || nameOf(a[1]).localeCompare(nameOf(b[1])));
    setHtml($('#brPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, b], i) => `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('br.name')}"><span class="us-name"><span class="ph-ic sm br-ic${id === main ? ' on' : ''}">${icon('building')}</span>
          <span class="cell-2"><b>${esc(nameOf(b) || '-')}</b>${other(b) && other(b) !== nameOf(b) ? `<small>${esc(other(b))}</small>` : ''}</span></span></td>
        <td data-label="${t('br.address')}">${b.address ? esc(b.address) : '<span class="muted">-</span>'}</td>
        <td data-label="${t('br.main')}">${id === main ? `<span class="badge tone-info">${icon('star')}${t('br.isMain')}</span>` : `<span class="muted">${t('br.no')}</span>`}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-br="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-br="delete" aria-label="${t('delete')}" ${id === main ? `disabled data-tip="${esc(t('br.mainLocked'))}"` : ''}>${icon('trash')}</button></div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="4"><div class="empty-state">${icon('building')}<b>${t('br.none')}</b><small>${t('br.noneSub')}</small></div></td></tr>`);
    first = false;
  }

  function openForm(id) {
    const b = id ? branches()[id] : null;
    const main = mainId();
    const wasMain = !!id && id === main;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(b ? 'pencil' : 'building')}</span><div><h2 id="drawerTitle">${t(b ? 'br.edit' : 'br.add')}</h2><p>${t('br.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="brForm">
        <div class="field"><label for="brAr">${t('br.nameAr')} *</label><input id="brAr" dir="rtl" value="${esc(b ? b.nameAr || '' : '')}" autocomplete="off"><small class="err" id="brArErr"></small></div>
        <div class="field"><label for="brEn">${t('br.nameEn')} *</label><input id="brEn" dir="ltr" value="${esc(b ? b.nameEn || '' : '')}" autocomplete="off"><small class="err" id="brEnErr"></small></div>
        <div class="field"><label for="brAddr">${t('br.address')}</label><input id="brAddr" value="${esc(b ? b.address || '' : '')}" autocomplete="off"></div>
        <div class="field inline"><label for="brMain">${t('br.main')}</label><button type="button" class="switch" role="switch" id="brMain" aria-checked="${wasMain || !main}" ${wasMain ? 'disabled' : ''}><i></i></button></div>
        <small class="muted" id="brMainNote">${t(wasMain ? 'br.mainKeep' : main ? 'br.mainMove' : 'br.mainNone')}</small>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="brSave">${icon('check')}<span>${t(b ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const arIn = $('#brAr', dr), enIn = $('#brEn', dr), sw = $('#brMain', dr);
    arIn.addEventListener('input', () => { $('#brArErr', dr).textContent = ''; });
    enIn.addEventListener('input', () => { $('#brEnErr', dr).textContent = ''; });
    sw.addEventListener('click', () => { if (!sw.disabled) sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') !== 'true'); });
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const nameAr = arIn.value.trim(), nameEn = enIn.value.trim(), address = $('#brAddr', dr).value.trim();
      const errs = { brAr: !nameAr ? 'required' : nameTaken('nameAr', nameAr, id) ? 'br.nameTaken' : '', brEn: !nameEn ? 'required' : nameTaken('nameEn', nameEn, id) ? 'br.nameTaken' : '' };
      Object.entries(errs).forEach(([k, v]) => { $(`#${k}Err`, dr).textContent = v ? t(v) : ''; });
      const bad = Object.keys(errs).find(k => errs[k]);
      if (bad) { $('#' + bad, dr).focus(); return; }
      const isMain = wasMain || sw.getAttribute('aria-checked') === 'true';
      const key = id || LIVE.newKey('branches');
      // One write: the new main branch and every other branch unmarked together
      const up = {};
      if (isMain) Object.entries(branches()).forEach(([o, x]) => { if (o !== key && x && x.isMain) up[`branches/${o}/isMain`] = false; });
      if (id) Object.assign(up, { [`branches/${id}/nameAr`]: nameAr, [`branches/${id}/nameEn`]: nameEn, [`branches/${id}/address`]: address, [`branches/${id}/isMain`]: isMain });
      else up[`branches/${key}`] = { nameAr, nameEn, address, isMain };
      const btn = $('#brSave', dr); saving = true; btn.classList.add('loading');
      try { await LIVE.update(up); toast(t(id ? 'saved' : 'added')); closeLayers(); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#brForm', dr).addEventListener('submit', save);
    $('#brSave', dr).addEventListener('click', save);
    setTimeout(() => arIn.focus(), 320);
  }

  // What still points at the branch (from what is already loaded)
  function usage(id) {
    const c = LIVE.cache, out = [];
    const devs = Object.values(c.devices || {}).filter(d => d && d.branchId === id).length;
    const tbls = Object.values(c.tables || {}).filter(x => x && x.branchId === id).length;
    const stock = Object.values(c.products || {}).filter(p => p && Number((p.stockByBranch || {})[id] || 0) !== 0).length
      + Object.values(c.stockMaterials || {}).filter(p => p && Number((p.stockByBranch || {})[id] || 0) !== 0).length;
    if (devs) out.push([t('br.uDevices'), devs]);
    if (tbls) out.push([t('br.uTables'), tbls]);
    if (stock) out.push([t('br.uStock'), stock]);
    return out;
  }

  async function remove(id) {
    const b = branches()[id]; if (!b) return;
    if (id === mainId()) { toast(t('br.mainLocked'), { tone: 'danger', ic: 'alert' }); return; }
    // Load what may still use it (watched only for this check)
    const USE = ['devices', 'tables', 'products', 'stockMaterials'];
    const btn = $(`tr[data-id="${CSS.escape(id)}"] [data-br="delete"]`, view);
    const stop = LIVE.watch(USE, () => {});
    btn && btn.classList.add('loading');
    let used;
    try { await LIVE.whenLoaded(USE); used = usage(id); } finally { stop(); btn && btn.classList.remove('loading'); }
    const ok = await confirmDialog({
      title: t('br.deleteQ'),
      body: `<div class="cf-sum"><div><small>${t('br.name')}</small><b>${esc(nameOf(b) || '-')}</b></div>${used.map(([l, n]) => `<div><small>${l}</small><b>${n}</b></div>`).join('')}</div>
        <p class="cf-note">${t(used.length ? 'br.deleteUsed' : 'br.deleteNote')}</p>`,
      ok: t('delete'), tone: 'danger', icon: 'trash'
    });
    if (!ok) return;
    try { await LIVE.update({ [`branches/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-br]'); if (!b || b.disabled) return;
    if (b.dataset.br === 'new') return openForm(null);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ edit: openForm, delete: remove })[b.dataset.br](id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
