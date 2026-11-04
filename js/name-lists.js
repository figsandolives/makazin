/* =====================================================================
   Simple name lists — {path}/{id} {nameAr, nameEn}: أنواع الطلب (orderTypes) and طرق الدفع
   (paymentMethods), which have the same shape on the old pages.
   Same as the old pages (both names required, edit, delete), plus fixes: each missing name is shown
   under its field (the old page said only «خطأ»), a name can't be added twice, both names have
   their own column (the English view showed the English name twice), and editing keeps the
   record's other fields.
   ===================================================================== */
function namesPage(cfg) {
  const { route, path, p, ic } = cfg;
  LIVE_ROUTES.add(route);
  PAGES[route] = view => {
    const st = (S[p] ||= { per: 10, page: 1 });
    const PATHS = [path];
    let first = true, saving = false;
    view.innerHTML = `
      ${pageHeader(route, `<button class="btn btn-primary" data-nl="new">${icon('plus')}<span>${t(p + '.add')}</span></button>`, t(p + '.sub'))}
      <section class="card table-card" data-anim>
        <div class="toolbar it-tools"><span class="tb-spacer"></span>${perHtml(st)}</div>
        <div class="table-wrap"><table class="dt it-table">
          <thead><tr><th>${t('nl.nameAr')}</th><th>${t('nl.nameEn')}</th><th class="act-col"></th></tr></thead>
          <tbody id="nlBody"></tbody></table></div>
        <footer class="pager" id="nlPager"></footer>
      </section>`;

    const all = () => LIVE.cache[path] || {};
    const key = v => normQ(String(v ?? '').trim());
    const taken = (k, v, except) => !!key(v) && Object.entries(all()).some(([id, x]) => id !== except && x && key(x[k]) === key(v));

    function draw() {
      const body = $('#nlBody', view); if (!body) return;
      if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(3, 3)); return; }
      const list = Object.entries(all()).filter(([, x]) => x && typeof x === 'object').sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
      setHtml($('#nlPager', view), pagerHtml(st, list.length));
      const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
      setHtml(body, slice.length ? slice.map(([id, x], i) => `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
          <td data-label="${t('nl.nameAr')}"><span class="us-name"><span class="ph-ic sm nl-ic">${icon(ic)}</span><b dir="rtl">${esc(x.nameAr || '-')}</b></span></td>
          <td data-label="${t('nl.nameEn')}"><span dir="ltr">${x.nameEn ? esc(x.nameEn) : '<span class="muted">-</span>'}</span></td>
          <td class="act-col"><div class="row-acts">${rowMenuBtn()}
            <button class="btn-icon sm" data-nl="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
            <button class="btn-icon sm danger" data-nl="delete" aria-label="${t('delete')}">${icon('trash')}</button></div></td></tr>`).join('')
        : `<tr class="empty"><td colspan="3"><div class="empty-state">${icon(ic)}<b>${t(p + '.none')}</b><small>${t(p + '.noneSub')}</small></div></td></tr>`);
      first = false;
    }

    function openForm(id) {
      const x = id ? all()[id] : null;
      const dr = freshDrawer(false);
      dr.innerHTML = `
        <header class="dr-head"><span class="ph-ic sm">${icon(x ? 'pencil' : ic)}</span><div><h2 id="drawerTitle">${t(p + (x ? '.edit' : '.add'))}</h2><p>${t('nl.formSub')}</p></div>
          <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
        <form class="dr-body" novalidate id="nlForm">
          <div class="field"><label for="nlAr">${t('nl.nameAr')} *</label><input id="nlAr" dir="rtl" value="${esc(x ? x.nameAr || '' : '')}" autocomplete="off"><small class="err" id="nlArErr"></small></div>
          <div class="field"><label for="nlEn">${t('nl.nameEn')} *</label><input id="nlEn" dir="ltr" value="${esc(x ? x.nameEn || '' : '')}" autocomplete="off"><small class="err" id="nlEnErr"></small></div>
        </form>
        <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="nlSave">${icon('check')}<span>${t(x ? 'save' : 'add')}</span></button></footer>`;
      openLayer('#drawer');
      const arIn = $('#nlAr', dr), enIn = $('#nlEn', dr);
      arIn.addEventListener('input', () => { $('#nlArErr', dr).textContent = ''; });
      enIn.addEventListener('input', () => { $('#nlEnErr', dr).textContent = ''; });
      const save = async e => {
        e && e.preventDefault(); if (saving) return;
        const nameAr = arIn.value.trim(), nameEn = enIn.value.trim();
        const errs = { nlAr: !nameAr ? 'required' : taken('nameAr', nameAr, id) ? 'nl.taken' : '', nlEn: !nameEn ? 'required' : taken('nameEn', nameEn, id) ? 'nl.taken' : '' };
        Object.entries(errs).forEach(([k, v]) => { $(`#${k}Err`, dr).textContent = v ? t(v) : ''; });
        const bad = Object.keys(errs).find(k => errs[k]);
        if (bad) { $('#' + bad, dr).focus(); return; }
        const btn = $('#nlSave', dr); saving = true; btn.classList.add('loading');
        try {
          if (id) await LIVE.update({ [`${path}/${id}/nameAr`]: nameAr, [`${path}/${id}/nameEn`]: nameEn });
          else await LIVE.update({ [`${path}/${LIVE.newKey(path)}`]: { nameAr, nameEn } });
          toast(t(id ? 'saved' : 'added')); closeLayers();
        } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
        finally { saving = false; btn.classList.remove('loading'); }
      };
      $('#nlForm', dr).addEventListener('submit', save);
      $('#nlSave', dr).addEventListener('click', save);
      setTimeout(() => arIn.focus(), 320);
    }

    async function remove(id) {
      const x = all()[id]; if (!x) return;
      const ok = await confirmDialog({ title: t(p + '.deleteQ'), body: `<div class="cf-sum"><div><small>${t('nl.nameAr')}</small><b>${esc(x.nameAr || '-')}</b></div><div><small>${t('nl.nameEn')}</small><b>${esc(x.nameEn || '-')}</b></div></div><p class="cf-note">${t(p + '.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
      if (!ok) return;
      try { await LIVE.update({ [`${path}/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
      catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    }

    $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
    view.addEventListener('click', e => {
      const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
      const b = e.target.closest('[data-nl]'); if (!b || b.disabled) return;
      if (b.dataset.nl === 'new') return openForm(null);
      const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
      ({ edit: openForm, delete: remove })[b.dataset.nl](id);
    });
    const unsub = LIVE.watch(PATHS, draw);
    draw();
    return () => { unsub(); freshDrawer(false); };
  };
}

namesPage({ route: 'order-types', path: 'orderTypes', p: 'ot', ic: 'list' });
namesPage({ route: 'payment-methods', path: 'paymentMethods', p: 'pmt', ic: 'card' });
