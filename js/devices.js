/* =====================================================================
   الأجهزة والكاشير — devices/{id} (label, page, branch), status/{id} (online), registeredDevices/{id}
   (what the cashier reads to know its branch) and cashiers/{id} {name, code, active}.
   Same as the old page, plus fixes: a renamed device keeps its name (the old page reset it on every
   open) and the cashier sees the new name, deleting a device also unregisters it, and cashier codes
   are unique (the cashier signs in with them).
   ===================================================================== */
LIVE_ROUTES.add('devices');

PAGES.devices = view => {
  const st = (S.dv ||= { per: 10, page: 1, cPer: 10, cPage: 1 });
  const PATHS = ['devices', 'status', 'branches', 'cashiers'];
  let first = true, saving = false, held = false;
  const me = LIVE.deviceId();
  view.innerHTML = `
    ${pageHeader('devices', '', t('dv.sub'))}
    <section class="card dv-cur" id="dvCur" data-anim></section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools"><h2 class="card-t">${icon('monitor')}<span>${t('dv.open')}</span></h2><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table dv-table">
        <thead><tr><th>${t('dv.id')}</th><th>${t('dv.label')}</th><th>${t('c.type')}</th><th>${t('c.status')}</th><th>${t('c.branch')}</th><th class="act-col"></th></tr></thead>
        <tbody id="dvBody"></tbody></table></div>
      <footer class="pager" id="dvPager"></footer>
    </section>
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools"><h2 class="card-t">${icon('users')}<span>${t('dv.cashiers')}</span></h2><span class="tb-spacer"></span>
        <button class="btn btn-ghost btn-sm" data-dv="import">${icon('upload')}<span>${t('dv.import')}</span></button>
        <button class="btn btn-primary btn-sm" data-dv="newCashier">${icon('plus')}<span>${t('dv.addCashier')}</span></button>
        ${perHtml({ per: st.cPer }).replace('data-per', 'data-cper')}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('dv.cashierName')}</th><th>${t('dv.cashierCode')}</th><th class="act-col"></th></tr></thead>
        <tbody id="dvCash"></tbody></table></div>
      <footer class="pager" id="dvCashPager"></footer>
    </section>`;

  const devices = () => LIVE.cache.devices || {}, statuses = () => LIVE.cache.status || {};
  const branches = () => LIVE.cache.branches || {}, cashiers = () => LIVE.cache.cashiers || {};
  const pageName = p => (p === 'cashier' ? t('dv.pCashier') : p === 'accounting' ? t('dv.pAccounting') : '-');
  const online = id => !!(statuses()[id] || {}).online;
  const stateBadge = id => `<span class="badge tone-${online(id) ? 'success' : 'neutral'}"><i></i>${t(online(id) ? 'online' : 'offline')}</span>`;
  const branchOpts = sel => `<option value="">${t('dv.unlinked')}</option>${Object.entries(branches()).filter(([, b]) => b).map(([id, b]) => `<option value="${esc(id)}" ${id === sel ? 'selected' : ''}>${esc(nameOf(b) || id)}</option>`).join('')}`;
  const devBranch = d => (d && (d.branchId && branches()[d.branchId] ? nameOf(branches()[d.branchId]) : S.lang === 'en' ? d.branchNameEn || d.branchNameAr || d.branchName : d.branchNameAr || d.branchName)) || '';

  /* Linking writes the device and its registration together (the cashier reads registeredDevices) */
  function linkUp(id, branchId, label) {
    const b = branchId ? branches()[branchId] : null;
    const nameAr = b ? b.nameAr || b.name || '' : null, nameEn = b ? b.nameEn || b.name || '' : null;
    const up = { [`devices/${id}/branchId`]: branchId || null, [`devices/${id}/branchNameAr`]: nameAr, [`devices/${id}/branchNameEn`]: nameEn, [`devices/${id}/branchName`]: nameAr };
    if (branchId) up[`registeredDevices/${id}`] = { id, label: label || '', branch: nameAr, branchId, branchNameAr: nameAr, branchNameEn: nameEn, updatedAt: LIVE.now() };
    else up[`registeredDevices/${id}`] = null;
    return { up, nameAr };
  }
  // This browser remembers its branch too (the cashier page reads it on the same device)
  function syncLocal(id, branchId, name) {
    if (id !== me) return;
    try {
      if (branchId && name) { localStorage.setItem('deviceBranchId', branchId); localStorage.setItem('deviceBranch', name); }
      else { localStorage.removeItem('deviceBranchId'); localStorage.removeItem('deviceBranch'); }
    } catch (e) {}
  }
  async function setBranch(id, branchId) {
    const d = devices()[id] || {};
    const { up, nameAr } = linkUp(id, branchId, d.label);
    try { await LIVE.update(up); syncLocal(id, branchId, nameAr); toast(t(branchId ? 'dv.linked' : 'dv.unlinkedOk'), branchId ? {} : { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); draw(); }
  }

  /* ---------- this device ---------- */
  function drawCurrent() {
    const box = $('#dvCur', view), d = devices()[me] || {};
    let localBranch = '';
    try { localBranch = localStorage.getItem('deviceBranchId') || ''; } catch (e) {}
    const name = devBranch(d), linked = !!(d.branchId || name);
    const keep = $('#dvCurBr', box) && $('#dvCurBr', box).value;
    setHtml(box, `
      <div class="dv-cur-head"><span class="ph-ic sm">${icon('monitor')}</span><div><h2 class="card-t">${t('dv.current')}</h2><p class="muted">${t('dv.currentSub')}</p></div>
        <span class="tb-spacer"></span><span class="badge tone-${linked ? 'success' : 'warning'}"><i></i>${t(linked ? 'dv.isLinked' : 'dv.unlinked')}</span></div>
      <div class="dv-cur-grid">
        <div class="dv-fact"><small>${t('dv.id')}</small><b class="mono">${esc(me)}</b></div>
        <div class="dv-fact"><small>${t('c.status')}</small><b>${stateBadge(me)} <span class="muted">${pageName(d.page)}</span></b></div>
        <div class="dv-fact"><small>${t('dv.curBranch')}</small><b>${esc(name || t('dv.unlinked'))}</b></div>
        <div class="field"><label for="dvCurBr">${t('dv.linkTo')}</label><div class="select">${icon('chevDown')}<select id="dvCurBr">${branchOpts(keep || d.branchId || localBranch)}</select></div><small class="err" id="dvCurErr"></small></div>
      </div>
      <div class="dv-cur-foot"><button class="btn btn-primary" data-dv="curSave">${icon('check')}<span>${t('dv.curSave')}</span></button>
        <button class="btn btn-ghost danger" data-dv="curClear" ${linked ? '' : 'disabled'}>${icon('x')}<span>${t('dv.curClear')}</span></button></div>`);
  }
  async function saveCurrent(btn) {
    const branchId = $('#dvCurBr', view).value;
    if (!branchId) { $('#dvCurErr', view).textContent = t('dv.pickBranch'); return; }
    const d = devices()[me] || {};
    let label = d.label;
    try { label ||= localStorage.getItem('deviceLabel'); } catch (e) {}
    label ||= `ADM-${me.slice(-4)}`;
    const { up, nameAr } = linkUp(me, branchId, label);
    Object.assign(up, { [`devices/${me}/label`]: label, [`devices/${me}/deviceId`]: me, [`devices/${me}/page`]: 'accounting', [`devices/${me}/lastSeen`]: LIVE.now() });
    btn.classList.add('loading');
    try { await LIVE.update(up); syncLocal(me, branchId, nameAr); toast(t('dv.linked')); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    finally { btn.classList.remove('loading'); }
  }

  /* ---------- open devices: online now, or linked to a branch ---------- */
  function draw() {
    const body = $('#dvBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(4, 6)); setHtml($('#dvCash', view), skeletonRows(3, 3)); return; }
    // Typing a device name: wait until the field is left, so the row isn't redrawn under the cursor
    if (view.contains(document.activeElement) && document.activeElement.matches('.dv-table input')) { held = true; return; }
    held = false;
    drawCurrent();
    const list = Object.entries(devices()).filter(([id, d]) => d && typeof d === 'object' && (online(id) || d.branchId))
      .sort((a, b) => online(b[0]) - online(a[0]) || Number(b[1].lastSeen || 0) - Number(a[1].lastSeen || 0));
    const pages = Math.max(1, Math.ceil(list.length / st.per)); if (st.page > pages) st.page = pages;
    setHtml($('#dvPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, d], i) => `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}${id === me ? ' dv-me' : ''}" style="--r:${i}">
        <td data-label="${t('dv.id')}"><span class="cell-2"><b class="mono">${esc(id.slice(-6))}</b><small class="mono">${esc(id)}</small>${id === me ? `<span class="pk-type in">${t('dv.thisOne')}</span>` : ''}</span></td>
        <td data-label="${t('dv.label')}"><input class="dv-label" data-f="label" value="${esc(d.label || '')}" aria-label="${t('dv.label')}" autocomplete="off"></td>
        <td data-label="${t('c.type')}">${pageName(d.page)}</td>
        <td data-label="${t('c.status')}">${stateBadge(id)}</td>
        <td data-label="${t('c.branch')}"><div class="select dv-br">${icon('chevDown')}<select data-f="branch" aria-label="${t('c.branch')}">${branchOpts(d.branchId || '')}</select></div></td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-dv="unassign" aria-label="${t('dv.unassign')}" data-tip="${t('dv.unassign')}" ${d.branchId ? '' : 'disabled'}>${icon('x')}</button>
          <button class="btn-icon sm danger" data-dv="delete" aria-label="${t('delete')}" data-tip="${t('delete')}">${icon('trash')}</button></div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="6"><div class="empty-state">${icon('monitor')}<b>${t('dv.none')}</b><small>${t('dv.noneSub')}</small></div></td></tr>`);
    drawCashiers();
    first = false;
  }

  async function saveLabel(input) {
    const id = input.closest('tr').dataset.id, d = devices()[id]; if (!d) return;
    const label = input.value.trim();
    if (label === (d.label || '')) return;
    const up = { [`devices/${id}/label`]: label };
    if (d.branchId) up[`registeredDevices/${id}/label`] = label;
    try { await LIVE.update(up); if (id === me) try { localStorage.setItem('deviceLabel', label); } catch (e) {} toast(t('saved')); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); input.value = d.label || ''; }
  }
  async function removeDevice(id) {
    const d = devices()[id]; if (!d) return;
    const ok = await confirmDialog({ title: t('dv.deleteQ'), body: `<div class="cf-sum"><div><small>${t('dv.label')}</small><b>${esc(d.label || '-')}</b></div><div><small>${t('c.branch')}</small><b>${esc(devBranch(d) || t('dv.unlinked'))}</b></div></div><p class="cf-note">${t('dv.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`devices/${id}`]: null, [`status/${id}`]: null, [`registeredDevices/${id}`]: null }); syncLocal(id, '', ''); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- cashiers ---------- */
  const codeKey = v => normQ(toLatin(String(v ?? '').trim()));
  const codeTaken = (code, except) => Object.entries(cashiers()).some(([id, c]) => id !== except && c && codeKey(c.code) === codeKey(code));
  function drawCashiers() {
    const list = Object.entries(cashiers()).filter(([, c]) => c && typeof c === 'object');
    const cs = { per: st.cPer, page: st.cPage };
    const pages = Math.max(1, Math.ceil(list.length / cs.per)); if (cs.page > pages) st.cPage = cs.page = pages;
    setHtml($('#dvCashPager', view), pagerHtml(cs, list.length).replace(/data-page=/g, 'data-cpage='));
    const slice = list.slice((cs.page - 1) * cs.per, cs.page * cs.per);
    setHtml($('#dvCash', view), slice.length ? slice.map(([id, c], i) => `<tr data-cid="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('dv.cashierName')}"><b>${esc(c.name || '-')}</b></td>
        <td data-label="${t('dv.cashierCode')}"><span class="mono">${esc(c.code || '-')}</span></td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-dv="editCashier" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-dv="deleteCashier" aria-label="${t('delete')}">${icon('trash')}</button></div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="3"><div class="empty-state">${icon('users')}<b>${t('dv.noCashiers')}</b><small>${t('dv.noCashiersSub')}</small></div></td></tr>`);
  }
  const newCode = () => { for (let i = 0; i < 200; i++) { const c = String(Math.floor(1000 + Math.random() * 9000)); if (!codeTaken(c)) return c; } return String(Date.now()).slice(-6); };

  function openCashier(id) {
    const c = id ? cashiers()[id] : null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(c ? 'pencil' : 'users')}</span><div><h2 id="drawerTitle">${t(c ? 'dv.editCashier' : 'dv.addCashier')}</h2><p>${t('dv.cashierSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="caForm">
        <div class="field"><label for="caName">${t('dv.cashierName')} *</label><input id="caName" value="${esc(c ? c.name || '' : '')}" autocomplete="off"><small class="err" id="caNameErr"></small></div>
        <div class="field"><label for="caCode">${t('dv.cashierCode')} *</label>
          <div class="dv-code"><input id="caCode" class="mono" dir="ltr" inputmode="numeric" value="${esc(c ? c.code || '' : '')}" autocomplete="off">
            <button type="button" class="btn btn-ghost" id="caGen">${icon('refresh')}<span>${t('dv.genCode')}</span></button></div>
          <small class="err" id="caCodeErr"></small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="caSave">${icon('check')}<span>${t(c ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const nameIn = $('#caName', dr), codeIn = $('#caCode', dr);
    nameIn.addEventListener('input', () => { $('#caNameErr', dr).textContent = ''; });
    codeIn.addEventListener('input', () => { $('#caCodeErr', dr).textContent = ''; });
    $('#caGen', dr).addEventListener('click', () => { codeIn.value = newCode(); $('#caCodeErr', dr).textContent = ''; codeIn.focus(); });
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const name = nameIn.value.trim(), code = toLatin(codeIn.value.trim());
      let bad = false;
      if (!name) { $('#caNameErr', dr).textContent = t('required'); bad = true; }
      if (!code) { $('#caCodeErr', dr).textContent = t('required'); bad = true; }
      else if (codeTaken(code, id)) { $('#caCodeErr', dr).textContent = t('dv.codeTaken'); bad = true; }
      if (bad) { (name ? codeIn : nameIn).focus(); return; }
      const btn = $('#caSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`cashiers/${id}/name`]: name, [`cashiers/${id}/code`]: code });
        else await LIVE.update({ [`cashiers/${LIVE.newKey('cashiers')}`]: { name, code, active: true } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#caForm', dr).addEventListener('submit', save);
    $('#caSave', dr).addEventListener('click', save);
    setTimeout(() => nameIn.focus(), 320);
  }
  async function removeCashier(id) {
    const c = cashiers()[id]; if (!c) return;
    const ok = await confirmDialog({ title: t('dv.deleteCashierQ'), body: `<div class="cf-sum"><div><small>${t('dv.cashierName')}</small><b>${esc(c.name || '-')}</b></div><div><small>${t('dv.cashierCode')}</small><b class="mono">${esc(c.code || '-')}</b></div></div>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`cashiers/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- Excel import (old template: الاسم، الكود) ---------- */
  const IMPORT_COLS = { 'الاسم': 'name', 'اسم الكاشير': 'name', 'الكود': 'code', 'رمز الكاشير': 'code', name: 'name', code: 'code' };
  function prepareImport(rows) {
    const inFile = new Set(), out = { rows: [], dup: 0, existing: 0, invalid: 0 };
    rows.forEach(raw => {
      const r = mapImportRow(raw, IMPORT_COLS);
      const name = String(r.name ?? '').trim(), code = toLatin(String(r.code ?? '').trim()), k = codeKey(code);
      if (!name || !k) { out.invalid++; return; }
      if (inFile.has(k)) { out.dup++; return; }
      if (codeTaken(code)) { out.existing++; return; }
      inFile.add(k); out.rows.push({ name, code, active: true });
    });
    return out;
  }
  function openImport() {
    let imp = null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('upload')}</span><div><h2 id="drawerTitle">${t('dv.import')}</h2><p>${t('imp.sub')}</p></div><button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body imp">
        <div class="imp-step"><span class="imp-n">1</span><div><b>${t('imp.step1')}</b><small>${t('dv.impStep1Sub')}</small></div><button type="button" class="btn btn-ghost btn-sm" id="impTpl">${icon('download')}<span>${t('imp.template')}</span></button></div>
        <div class="imp-step"><span class="imp-n">2</span><div><b>${t('imp.step2')}</b><small>${t('dv.impStep2Sub')}</small></div></div>
        <label class="imp-drop" id="impDrop">${icon('upload')}<b id="impFile">${t('imp.choose')}</b><small>xlsx · xls</small><input type="file" id="impIn" accept=".xlsx,.xls" hidden></label>
        <div class="imp-status" id="impStatus" aria-live="polite"></div>
      </div>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('close')}</button><span class="tb-spacer"></span><button class="btn btn-primary" id="impGo" disabled>${icon('plus')}<span id="impGoTxt">${t('imp.go').replace('{n}', '')}</span></button></footer>`;
    openLayer('#drawer');
    const status = () => {
      const s = imp;
      $('#impStatus', dr).innerHTML = !s ? '' : [s.name ? `<span>${icon('check')}${t('imp.ready').replace('{n}', s.rows.length)}</span>` : '', s.dup ? `<span class="warn">${icon('alert')}${t('imp.dupFile').replace('{n}', s.dup)}</span>` : '',
        s.existing ? `<span class="warn">${icon('alert')}${t('dv.impExisting').replace('{n}', s.existing)}</span>` : '', s.invalid ? `<span class="warn">${icon('alert')}${t('dv.impInvalid').replace('{n}', s.invalid)}</span>` : '',
        s.msg ? `<span class="${s.tone || ''}">${icon(s.tone === 'danger' ? 'alert' : 'check')}${s.msg}</span>` : ''].join('');
      $('#impGo', dr).disabled = !(s && s.rows.length);
      $('#impGoTxt', dr).textContent = t('imp.go').replace('{n}', s && s.rows.length ? s.rows.length : '');
      $('#impFile', dr).textContent = s && s.name ? s.name : t('imp.choose');
    };
    $('#impTpl', dr).addEventListener('click', async () => {
      try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
      const ar = S.lang === 'ar', wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ [ar ? 'الاسم' : 'name']: '', [ar ? 'الكود' : 'code']: '' }]), 'Cashiers');
      XLSX.writeFile(wb, 'cashiers-template.xlsx');
    });
    const load = async file => {
      if (!file) return;
      try { await needLib('XLSX'); } catch (e) { libFailed(); return; }
      try {
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
        const p = prepareImport(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).filter(r => !rowEmpty(r)));
        imp = { name: file.name, ...p, msg: p.rows.length ? '' : t('imp.nothing'), tone: p.rows.length ? '' : 'danger' };
      } catch (e) { imp = { name: file.name, rows: [], msg: t('imp.badFile'), tone: 'danger' }; }
      status();
    };
    $('#impIn', dr).addEventListener('change', e => { load(e.target.files[0]); e.target.value = ''; });
    const drop = $('#impDrop', dr);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); load(e.dataTransfer.files[0]); });
    $('#impGo', dr).addEventListener('click', async () => {
      const s = imp; if (!s || !s.rows.length || saving) return;
      const btn = $('#impGo', dr); saving = true; btn.classList.add('loading');
      try {
        await LIVE.update(Object.fromEntries(s.rows.map(r => [`cashiers/${LIVE.newKey('cashiers')}`, r])));
        imp = { rows: [], msg: t('imp.done').replace('{n}', s.rows.length), tone: 'success' };
        toast(imp.msg);
      } catch (e) { imp = { ...s, msg: t('pm.saveFailed'), tone: 'danger' }; }
      finally { saving = false; btn.classList.remove('loading'); status(); }
    });
  }

  /* ---------- events ---------- */
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  $('[data-cper]', view).addEventListener('change', e => { st.cPer = +e.target.value; st.cPage = 1; drawCashiers(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const cp = e.target.closest('[data-cpage]'); if (cp && !cp.disabled) { st.cPage = +cp.dataset.cpage; drawCashiers(); return; }
    const b = e.target.closest('[data-dv]'); if (!b || b.disabled) return;
    const a = b.dataset.dv;
    if (a === 'curSave') return saveCurrent(b);
    if (a === 'curClear') return setBranch(me, '');
    if (a === 'newCashier') return openCashier(null);
    if (a === 'import') return openImport();
    const cid = b.closest('tr') && b.closest('tr').dataset.cid;
    if (a === 'editCashier') return openCashier(cid);
    if (a === 'deleteCashier') return removeCashier(cid);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    if (a === 'unassign') return setBranch(id, '');
    if (a === 'delete') return removeDevice(id);
  });
  view.addEventListener('change', e => {
    if (e.target.id === 'dvCurBr') { $('#dvCurErr', view).textContent = ''; return; }
    const tr = e.target.closest('.dv-table tr[data-id]'); if (!tr) return;
    if (e.target.dataset.f === 'branch') setBranch(tr.dataset.id, e.target.value);
    if (e.target.dataset.f === 'label') saveLabel(e.target);
  });
  view.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.dv-label')) e.target.blur(); });
  view.addEventListener('focusout', () => setTimeout(() => { if (held) draw(); }, 0));

  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};
