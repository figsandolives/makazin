/* =====================================================================
   المستخدمون — users/{id} {name, code, role: manager|cashier|storekeeper, active}; the code signs in.
   Same as the old page (the built-in manager «manager» can't be deleted and stays a manager), plus
   fixes: codes are unique and stored with Latin digits (sign-in converts Arabic digits, so a code
   saved as ١٢٣٤ could never sign in), and the system can't be left without a manager — no deleting
   or demoting yourself or the last manager. Editing keeps the user's other fields.
   ===================================================================== */
LIVE_ROUTES.add('users');

PAGES.users = view => {
  const st = (S.us ||= { per: 10, page: 1, q: '', role: 'all' });
  const PATHS = ['users'];
  const BUILTIN = 'manager';
  const ROLES = ['manager', 'cashier', 'storekeeper'];
  const ROLE_TONE = { manager: 'info', cashier: 'success', storekeeper: 'warning' };
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('users', `<button class="btn btn-primary" data-us="new">${icon('plus')}<span>${t('us.add')}</span></button>`, t('us.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="usQ" placeholder="${t('us.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <div class="select us-role-f">${icon('chevDown')}<select id="usRole" aria-label="${t('c.role')}"><option value="all">${t('us.allRoles')}</option>${ROLES.map(r => `<option value="${r}" ${st.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div>
        <span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('us.name')}</th><th>${t('c.role')}</th><th>${t('us.code')}</th><th class="act-col"></th></tr></thead>
        <tbody id="usBody"></tbody></table></div>
      <footer class="pager" id="usPager"></footer>
    </section>`;

  const users = () => LIVE.cache.users || {};
  const roleOf = (id, u) => (id === BUILTIN ? 'manager' : ROLES.includes(u.role) ? u.role : 'storekeeper');
  const codeKey = v => normQ(toLatin(String(v ?? '').trim()));
  const codeTaken = (code, except) => Object.entries(users()).some(([id, u]) => id !== except && u && codeKey(u.code) === codeKey(code));
  const managers = () => Object.entries(users()).filter(([id, u]) => u && typeof u === 'object' && roleOf(id, u) === 'manager');
  const isMe = id => !!LIVE.user && LIVE.user.id === id;
  // Why a user can't be deleted (or lose the manager role), or ''
  const lockReason = (id, u) => (id === BUILTIN ? t('us.builtinNote') : isMe(id) ? t('us.selfNote')
    : roleOf(id, u) === 'manager' && managers().length <= 1 ? t('us.lastManager') : '');

  function draw() {
    const body = $('#usBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 4)); return; }
    const q = normQ(st.q);
    const list = Object.entries(users()).filter(([id, u]) => u && typeof u === 'object' && (st.role === 'all' || roleOf(id, u) === st.role)
      && (!q || normQ(`${u.name || ''} ${u.code || ''}`).includes(q)))
      .sort((a, b) => (b[0] === BUILTIN) - (a[0] === BUILTIN) || ROLES.indexOf(roleOf(...a)) - ROLES.indexOf(roleOf(...b)) || String(a[1].name || '').localeCompare(String(b[1].name || '')));
    setHtml($('#usPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, u], i) => {
      const role = roleOf(id, u), lock = lockReason(id, u);
      return `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('us.name')}"><span class="us-name"><span class="av" style="--h:${hue(u.name || id)}">${esc(String(u.name || '?').trim().charAt(0) || '?')}</span>
          <span class="cell-2"><b>${esc(u.name || '-')}</b>${id === BUILTIN ? `<small>${t('us.builtin')}</small>` : isMe(id) ? `<small>${t('us.you')}</small>` : ''}</span></span></td>
        <td data-label="${t('c.role')}"><span class="badge tone-${ROLE_TONE[role]}"><i></i>${t('role_' + role)}</span></td>
        <td data-label="${t('us.code')}"><span class="mono">${esc(u.code || '-')}</span></td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-us="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-us="delete" aria-label="${t('delete')}" ${lock ? `disabled data-tip="${esc(lock)}"` : ''}>${icon('trash')}</button></div></td></tr>`;
    }).join('')
      : `<tr class="empty"><td colspan="4"><div class="empty-state">${icon(q || st.role !== 'all' ? 'search' : 'usercog')}<b>${t(q || st.role !== 'all' ? 'emptyTitle' : 'us.none')}</b><small>${t(q || st.role !== 'all' ? 'emptySub' : 'us.noneSub')}</small></div></td></tr>`);
    first = false;
  }

  function openForm(id) {
    const u = id ? users()[id] : null;
    const role = u ? roleOf(id, u) : 'cashier';
    // The built-in manager, yourself and the last manager keep the manager role
    const roleLock = u && role === 'manager' ? lockReason(id, u) : '';
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(u ? 'pencil' : 'usercog')}</span><div><h2 id="drawerTitle">${t(u ? 'us.edit' : 'us.add')}</h2><p>${t('us.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="usForm">
        <div class="field"><label for="usName">${t('us.name')} *</label><input id="usName" value="${esc(u ? u.name || '' : '')}" autocomplete="off"><small class="err" id="usNameErr"></small></div>
        <div class="field"><label for="usCode">${t('us.code')} *</label><input id="usCode" class="mono" dir="ltr" inputmode="numeric" value="${esc(u ? u.code || '' : '')}" autocomplete="off"><small class="err" id="usCodeErr"></small></div>
        <div class="field"><label>${t('c.role')}</label>
          <div class="us-roles" role="radiogroup" aria-label="${t('c.role')}">${ROLES.map(r => `<button type="button" role="radio" class="${r === role ? 'on' : ''}" data-role="${r}" aria-checked="${r === role}" ${roleLock && r !== 'manager' ? 'disabled' : ''}>${icon({ manager: 'shield', cashier: 'receipt', storekeeper: 'warehouse' }[r])}<span>${t('role_' + r)}</span></button>`).join('')}</div>
          <small class="muted" id="usRoleNote">${roleLock ? esc(roleLock) : t('us.roleNote_' + role)}</small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="usSave">${icon('check')}<span>${t(u ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    let pick = role;
    const nameIn = $('#usName', dr), codeIn = $('#usCode', dr);
    nameIn.addEventListener('input', () => { $('#usNameErr', dr).textContent = ''; });
    codeIn.addEventListener('input', () => { $('#usCodeErr', dr).textContent = ''; });
    $('.us-roles', dr).addEventListener('click', e => {
      const b = e.target.closest('[data-role]'); if (!b || b.disabled) return;
      pick = b.dataset.role;
      $$('[data-role]', dr).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      if (!roleLock) $('#usRoleNote', dr).textContent = t('us.roleNote_' + pick);
    });
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const name = nameIn.value.trim(), code = toLatin(codeIn.value.trim());
      let bad = false;
      if (!name) { $('#usNameErr', dr).textContent = t('required'); bad = true; }
      if (!code) { $('#usCodeErr', dr).textContent = t('required'); bad = true; }
      else if (codeTaken(code, id)) { $('#usCodeErr', dr).textContent = t('us.codeTaken'); bad = true; }
      if (bad) { (name ? codeIn : nameIn).focus(); return; }
      const role = roleLock ? 'manager' : pick;
      const btn = $('#usSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`users/${id}/name`]: name, [`users/${id}/code`]: code, [`users/${id}/role`]: role });
        else await LIVE.update({ [`users/${LIVE.newKey('users')}`]: { name, code, role, active: true } });
        if (isMe(id)) { LIVE.user.name = name; renderSidebar(); }
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#usForm', dr).addEventListener('submit', save);
    $('#usSave', dr).addEventListener('click', save);
    setTimeout(() => nameIn.focus(), 320);
  }

  async function remove(id) {
    const u = users()[id]; if (!u) return;
    const lock = lockReason(id, u);
    if (lock) { toast(lock, { tone: 'danger', ic: 'alert' }); return; }
    const ok = await confirmDialog({ title: t('us.deleteQ'), body: `<div class="cf-sum"><div><small>${t('us.name')}</small><b>${esc(u.name || '-')}</b></div><div><small>${t('c.role')}</small><b>${t('role_' + roleOf(id, u))}</b></div></div><p class="cf-note">${t('us.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`users/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  $('#usRole', view).addEventListener('change', e => { st.role = e.target.value; st.page = 1; draw(); });
  $('#usQ', view).addEventListener('input', e => { st.q = e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-us]'); if (!b || b.disabled) return;
    if (b.dataset.us === 'new') return openForm(null);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ edit: openForm, delete: remove })[b.dataset.us](id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
