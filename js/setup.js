/* معلومات المنتجات · الوحدات · أماكن التخزين — live pages, same workflow as the old page. */

['product-info', 'units', 'storage-locations'].forEach(r => LIVE_ROUTES.add(r));

/* =====================================================================
   معلومات المنتجات — ingredients / origin / barcode printed on the sticker.
   Edited straight in the table and saved when a field changes (as the old page).
   ===================================================================== */
PAGES['product-info'] = view => {
  const st = (S.pi ||= { q: '', per: 20, page: 1 });
  const PATHS = ['productInfos', 'products'];
  let first = true, pending = false;
  view.innerHTML = `
    ${pageHeader('product-info', `<button class="btn btn-primary" data-pi="add">${icon('plus')}<span>${t('pi.add')}</span></button>`, t('pi.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools">
        <label class="search-field">${icon('search')}<input type="search" id="piQ" placeholder="${t('pi.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
        <span class="tb-spacer"></span>
        <label class="per-field"><small>${t('it.perPage')}</small><span class="select mini"><select data-per>${[20, 50, 100].map(n => `<option ${st.per === n ? 'selected' : ''}>${n}</option>`).join('')}</select>${icon('chevDown')}</span></label>
      </div>
      <div class="table-wrap"><table class="dt it-table pi-table">
        <thead><tr><th>${t('pi.product')}</th><th>${t('sm.ingredients')}</th><th>${t('sm.origin')}</th><th>${t('it.barcode')}</th><th class="act-col"></th></tr></thead>
        <tbody id="piBody"></tbody></table></div>
      <footer class="pager" id="piPager"></footer>
    </section>`;

  const infos = () => LIVE.cache.productInfos || {}, products = () => LIVE.cache.products || {};
  function rows() {
    const q = normQ(st.q);
    return Object.entries(infos()).filter(([, i]) => i && typeof i === 'object').map(([id, info]) => {
      const productId = info.productId || id;
      return { id, info, product: products()[productId] || {} };
    }).filter(r => !q || normQ([r.product.nameAr, r.product.nameEn, r.product.name, r.info.productName, r.info.ingredients, r.info.origin, r.info.barcode, r.product.barcode].filter(Boolean).join(' ')).includes(q))
      .sort((a, b) => createdSort(b.id, b.info) - createdSort(a.id, a.info));
  }
  const body = $('#piBody', view);
  function draw() {
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 5)); return; }
    // Someone is typing in the table: redraw after they leave the field
    if (body.contains(document.activeElement) && document.activeElement.matches('[data-f]')) { pending = true; return; }
    pending = false;
    const list = rows();
    setHtml($('#piPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map((r, i) => {
      const name = nameOf(r.product) || r.info.productName || '-';
      const en = S.lang === 'ar' ? r.product.nameEn : r.product.nameAr;
      return `<tr data-id="${esc(r.id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('pi.product')}"><span class="cell-2"><b>${esc(name)}</b>${en && en !== name ? `<small>${esc(en)}</small>` : ''}</span></td>
        <td data-label="${t('sm.ingredients')}"><textarea class="pi-in" data-f="ingredients" rows="2" aria-label="${t('sm.ingredients')}">${esc(r.info.ingredients || '')}</textarea></td>
        <td data-label="${t('sm.origin')}"><input class="pi-in" data-f="origin" value="${esc(r.info.origin || '')}" aria-label="${t('sm.origin')}" autocomplete="off"></td>
        <td data-label="${t('it.barcode')}"><input class="pi-in mono" data-f="barcode" dir="ltr" inputmode="numeric" value="${esc(r.info.barcode || r.product.barcode || '')}" aria-label="${t('it.barcode')}" autocomplete="off"></td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}<button class="btn-icon sm danger" data-pi="delete" aria-label="${t('delete')}">${icon('trash')}</button></div></td></tr>`;
    }).join('') : `<tr class="empty"><td colspan="5"><div class="empty-state">${icon(st.q ? 'search' : 'info')}<b>${t(st.q ? 'emptyTitle' : 'pi.none')}</b><small>${t(st.q ? 'emptySub' : 'pi.noneSub')}</small></div></td></tr>`);
    first = false;
    if (picker) drawPicker();
  }
  body.addEventListener('focusout', () => setTimeout(() => { if (pending && !body.contains(document.activeElement)) draw(); }, 0));
  body.addEventListener('change', async e => {
    const f = e.target.dataset.f; if (!f) return;
    const id = e.target.closest('tr').dataset.id;
    const value = f === 'barcode' ? toLatin(e.target.value).trim() : String(e.target.value || '').trim();
    if (f === 'barcode') e.target.value = value;
    e.target.classList.add('saving');
    try { await LIVE.update({ [`productInfos/${id}/${f}`]: value }); toast(t('saved')); }
    catch (ex) { toast(t('pi.saveFailed'), { tone: 'danger', ic: 'alert' }); }
    finally { e.target.classList.remove('saving'); }
  });

  async function remove(id) {
    const r = infos()[id]; if (!r) return;
    const ok = await confirmDialog({ title: t('pi.deleteQ'), body: `<div class="cf-sum"><div><small>${t('pi.product')}</small><b>${esc(nameOf(products()[r.productId || id]) || r.productName || '-')}</b></div></div><p class="cf-note">${t('pi.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`productInfos/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pi.deleteFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  /* ---------- add products: search first (the list isn't loaded whole), tick, add ---------- */
  let picker = null, pkQ = '', saving = false;
  const picked = new Set();
  function pickable() {
    const q = normQ(pkQ); if (!q) return [];
    const have = new Set(Object.entries(infos()).map(([id, i]) => (i && i.productId) || id));
    return Object.entries(products()).filter(([id, p]) => p && !have.has(id) && normQ([p.nameAr, p.nameEn, p.name, p.barcode, p.code].filter(Boolean).join(' ')).includes(q))
      .sort((a, b) => createdSort(b[0], b[1]) - createdSort(a[0], a[1])).slice(0, 80);
  }
  function drawPicker() {
    const list = pickable();
    $('#pkList', picker).innerHTML = !pkQ.trim() ? `<div class="empty-state">${icon('search')}<b>${t('pi.typeToSearch')}</b><small>${t('pi.typeToSearchSub')}</small></div>`
      : list.length ? list.map(([id, p]) => `<button type="button" class="pk-row${picked.has(id) ? ' on' : ''}" data-k="${esc(id)}" role="checkbox" aria-checked="${picked.has(id)}">
          <span class="pk-check">${icon('check')}</span><span class="pk-txt"><b>${esc(nameOf(p) || '-')}</b><small>${esc([S.lang === 'ar' ? p.nameEn : p.nameAr, p.barcode || p.code || t('pi.noBarcode')].filter(Boolean).join(' · '))}</small></span></button>`).join('')
      : `<div class="empty-state">${icon('search')}<b>${t('pi.noMatch')}</b><small>${t('pi.noMatchSub')}</small></div>`;
    paintFoot();
  }
  function paintFoot() {
    $('#pkCount', picker).textContent = t('pi.selectedN').replace('{n}', picked.size);
    $('#pkAdd', picker).disabled = !picked.size;
  }
  const keys = e => { if (picker && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } };
  function closePicker() {
    if (!picker) return;
    const el = picker; picker = null;
    el.classList.remove('open'); setTimeout(() => el.remove(), 200);
    document.removeEventListener('keydown', keys, true);
  }
  function openPicker() {
    if (picker || !LIVE.loaded(PATHS)) return;
    pkQ = ''; picked.clear();
    picker = document.createElement('div');
    picker.className = 'pk-wrap';
    picker.innerHTML = `<div class="pk-backdrop" data-pk-close></div>
      <div class="pk" role="dialog" aria-modal="true" aria-labelledby="pkTitle">
        <header class="pk-head"><span class="ph-ic sm">${icon('info')}</span><div><h3 id="pkTitle">${t('pi.add')}</h3><p>${t('pi.addSub')}</p></div>
          <button class="btn-icon" data-pk-close aria-label="${t('close')}">${icon('x')}</button></header>
        <label class="search-field pk-search">${icon('search')}<input type="search" id="pkQ" placeholder="${t('pi.searchPh')}" autocomplete="off"></label>
        <div class="pk-list" id="pkList"></div>
        <footer class="pk-foot"><span class="muted" id="pkCount"></span><span class="tb-spacer"></span>
          <button class="btn btn-ghost" data-pk-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="pkAdd" disabled>${icon('plus')}<span>${t('add')}</span></button></footer>
      </div>`;
    document.body.appendChild(picker);
    drawPicker();
    void picker.offsetWidth; picker.classList.add('open');
    document.addEventListener('keydown', keys, true);
    setTimeout(() => { const q = picker && $('#pkQ', picker); q && q.focus(); }, 120);
    $('#pkQ', picker).addEventListener('input', e => { pkQ = e.target.value; drawPicker(); });
    picker.addEventListener('click', async e => {
      if (e.target.closest('[data-pk-close]')) { closePicker(); return; }
      const p = e.target.closest('.pk-row[data-k]');
      if (p) { const k = p.dataset.k, on = !picked.has(k); on ? picked.add(k) : picked.delete(k); p.classList.toggle('on', on); p.setAttribute('aria-checked', on); paintFoot(); return; }
      const go = e.target.closest('#pkAdd'); if (!go || go.disabled || saving) return;
      const up = {};
      picked.forEach(pid => {
        const pr = products()[pid]; if (!pr) return;
        up[`productInfos/${pid}`] = { id: pid, productId: pid, productName: nameOf(pr), ingredients: '', origin: '', barcode: pr.barcode || '', createdAt: Date.now() };
      });
      if (!Object.keys(up).length) return;
      saving = true; go.classList.add('loading');
      try { await LIVE.update(up); toast(t('pi.added')); closePicker(); }
      catch (ex) { toast(t('pi.addFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; go.classList.remove('loading'); }
    });
  }

  let deb;
  $('#piQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; draw(); }, 150); });
  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-pi]'); if (!b) return;
    if (b.dataset.pi === 'add') return openPicker();
    const tr = b.closest('tr'); if (tr && b.dataset.pi === 'delete') remove(tr.dataset.id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); closePicker(); };
};

/* =====================================================================
   الوحدات
   ===================================================================== */
PAGES.units = view => {
  const st = (S.un ||= { per: 10, page: 1 });
  const PATHS = ['units', 'products', 'stockMaterials'];
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('units', `<button class="btn btn-primary" data-un="new">${icon('plus')}<span>${t('un.new')}</span></button>`, t('un.sub'))}
    <section class="card table-card" data-anim>
      <div class="toolbar it-tools"><span class="tb-spacer"></span>${perHtml(st)}</div>
      <div class="table-wrap"><table class="dt it-table">
        <thead><tr><th>${t('it.nameAr')}</th><th>${t('it.nameEn')}</th><th class="end">${t('un.productsN')}</th><th class="act-col"></th></tr></thead>
        <tbody id="unBody"></tbody></table></div>
      <footer class="pager" id="unPager"></footer>
    </section>`;
  const units = () => LIVE.cache.units || {}, products = () => LIVE.cache.products || {};
  const usedBy = (id, path) => Object.entries(LIVE.cache[path] || {}).filter(([, it]) => it && it.unitId === id);
  function draw() {
    const body = $('#unBody', view); if (!body) return;
    if (!LIVE.loaded(PATHS)) { setHtml(body, skeletonRows(5, 4)); return; }
    const list = Object.entries(units()).filter(([, u]) => u && typeof u === 'object');
    setHtml($('#unPager', view), pagerHtml(st, list.length));
    const slice = list.slice((st.page - 1) * st.per, st.page * st.per);
    setHtml(body, slice.length ? slice.map(([id, u], i) => `<tr data-id="${esc(id)}" class="${first ? 'row-in' : ''}" style="--r:${i}">
        <td data-label="${t('it.nameAr')}"><b>${esc(u.nameAr || '-')}</b></td>
        <td data-label="${t('it.nameEn')}" dir="ltr">${esc(u.nameEn || '-')}</td>
        <td data-label="${t('un.productsN')}" class="end num">${usedBy(id, 'products').length}</td>
        <td class="act-col"><div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-un="view" aria-label="${t('view')}">${icon('eye')}</button>
          <button class="btn-icon sm" data-un="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-un="delete" aria-label="${t('delete')}">${icon('trash')}</button></div></td></tr>`).join('')
      : `<tr class="empty"><td colspan="4"><div class="empty-state">${icon('ruler')}<b>${t('un.none')}</b><small>${t('un.noneSub')}</small></div></td></tr>`);
    first = false;
  }

  function viewProducts(id) {
    const u = units()[id]; if (!u) return;
    const list = usedBy(id, 'products').sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('ruler')}</span><div><h2 id="drawerTitle">${esc(nameOf(u) || '-')}</h2><p>${t('un.productsN')}: ${list.length}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <div class="dr-body">${list.length ? `<ul class="un-list">${list.map(([, p]) => `<li><span class="cell-2"><b>${esc(nameOf(p) || '-')}</b>${p.code ? `<small class="mono">${esc(p.code)}</small>` : ''}</span></li>`).join('')}</ul>`
        : `<div class="empty-state">${icon('box')}<b>${t('un.noProducts')}</b></div>`}</div>`;
    openLayer('#drawer');
  }

  function openForm(id) {
    const u = id ? units()[id] : null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(u ? 'pencil' : 'ruler')}</span><div><h2 id="drawerTitle">${t(u ? 'un.edit' : 'un.new')}</h2><p>${t('un.formSub')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="unForm">
        <div class="field"><label for="uAr">${t('it.nameAr')}</label><input id="uAr" dir="rtl" value="${esc(u ? u.nameAr || '' : '')}" autocomplete="off"></div>
        <div class="field"><label for="uEn">${t('it.nameEn')}</label><input id="uEn" dir="ltr" value="${esc(u ? u.nameEn || '' : '')}" autocomplete="off"></div>
        <small class="err form-err" id="uErr"></small>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="uSave">${icon('check')}<span>${t(u ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    $$('input', dr).forEach(i => i.addEventListener('input', () => { $('#uErr', dr).textContent = ''; }));
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const nameAr = $('#uAr', dr).value.trim(), nameEn = $('#uEn', dr).value.trim();
      if (!nameAr && !nameEn) { $('#uErr', dr).textContent = t('un.oneName'); $('#uAr', dr).focus(); return; }
      const btn = $('#uSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`units/${id}/nameAr`]: nameAr || null, [`units/${id}/nameEn`]: nameEn || null });
        else await LIVE.update({ [`units/${LIVE.newKey('units')}`]: { nameAr: nameAr || null, nameEn: nameEn || null, createdAt: LIVE.now() } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { $('#uErr', dr).textContent = t('pm.saveFailed'); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#unForm', dr).addEventListener('submit', save);
    $('#uSave', dr).addEventListener('click', save);
    setTimeout(() => $('#uAr', dr).focus(), 320);
  }

  async function remove(id) {
    const u = units()[id]; if (!u) return;
    const p = usedBy(id, 'products').length, m = usedBy(id, 'stockMaterials').length;
    const ok = await confirmDialog({ title: t('un.deleteQ'), body: `<div class="cf-sum"><div><small>${t('c.name')}</small><b>${esc(nameOf(u) || '-')}</b></div><div><small>${t('un.inUse')}</small><b>${p + m}</b></div></div>${p + m ? `<p class="cf-note">${t('un.inUseNote').replace('{p}', p).replace('{m}', m)}</p>` : ''}`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    try { await LIVE.update({ [`units/${id}`]: null }); toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }

  $('[data-per]', view).addEventListener('change', e => { st.per = +e.target.value; st.page = 1; draw(); });
  view.addEventListener('click', e => {
    const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; draw(); return; }
    const b = e.target.closest('[data-un]'); if (!b) return;
    if (b.dataset.un === 'new') return openForm(null);
    const id = b.closest('tr') && b.closest('tr').dataset.id; if (!id) return;
    ({ view: viewProducts, edit: openForm, delete: remove })[b.dataset.un](id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); freshDrawer(false); };
};

/* =====================================================================
   أماكن التخزين — locations holding products and stock materials
   ===================================================================== */
PAGES['storage-locations'] = view => {
  const st = (S.sl ||= { open: null, q: '' });
  const PATHS = ['storageLocations', 'products', 'stockMaterials', 'branches'];
  let first = true, saving = false;
  view.innerHTML = `
    ${pageHeader('storage-locations', `<button class="btn btn-ghost" data-sl="assign">${icon('plus')}<span>${t('sl.assign')}</span></button>
      <button class="btn btn-primary" data-sl="new">${icon('plus')}<span>${t('sl.new')}</span></button>`, t('sl.sub'))}
    <section class="card pc-card" data-anim>
      <div class="toolbar pc-bar">
        <button class="btn-icon" data-sl="back" aria-label="${t('pc.back')}">${icon('chevLeft', 'flip')}</button>
        <nav class="pc-trail" id="slTrail" aria-label="${t('pc.path')}"></nav>
        <label class="search-field">${icon('search')}<input type="search" id="slQ" placeholder="${t('sl.searchPh')}" value="${esc(st.q)}" autocomplete="off"></label>
      </div>
      <div class="pc-grid" id="slGrid"></div>
      <div class="pc-items-wrap"><div class="pc-items-head"><b id="slItemsTitle"></b></div><div class="pc-items" id="slItems"></div></div>
    </section>`;

  const locs = () => LIVE.cache.storageLocations || {};
  const allItems = () => [...Object.entries(LIVE.cache.products || {}).map(([id, it]) => ({ id, it, type: 'product' })), ...Object.entries(LIVE.cache.stockMaterials || {}).map(([id, it]) => ({ id, it, type: 'material' }))].filter(x => x.it && typeof x.it === 'object');
  // Items in a location (or with main-branch stock in no location), with what they hold there
  const qtyIn = (x, id) => { const v = locView(x.type, x.id); return id === LOC_NONE ? v.none : v.locs[id] || 0; };
  const itemsIn = id => allItems().filter(x => inLocation(x.type, x.id, id));
  const pathOf = x => `${x.type === 'product' ? 'products' : 'stockMaterials'}/${x.id}/storageLocationId`;
  const isDef = (x, id) => x.it.storageLocationId === id;
  /* Taking an item out of a location: only when it holds nothing there; a default moves to another of its locations */
  function unlinkUp(x, id, up) {
    up[locPath(x.type, x.id, id)] = null;
    if (isDef(x, id)) up[pathOf(x)] = locRows(x.type, x.id).map(r => r.loc).find(l => l !== id) || null;
  }
  const keyOf = x => `${x.type}:${x.id}`;
  const typeTag = type => `<span class="pk-type">${t(type === 'product' ? 'sm.product' : 'sm.material')}</span>`;

  function draw() {
    const grid = $('#slGrid', view); if (!grid) return;
    if (!LIVE.loaded(PATHS)) { setHtml(grid, Array.from({ length: 6 }, () => '<div class="pc-tile skel-tile"><i class="skel lg"></i><i class="skel"></i></div>').join('')); return; }
    if (st.open && !locs()[st.open] && st.open !== LOC_NONE) st.open = null;
    const cur = st.open;
    $('[data-sl="back"]', view).disabled = !cur;
    $('[data-sl="assign"]', view).disabled = !cur || cur === LOC_NONE;
    setHtml($('#slTrail', view), `<button type="button" class="pc-crumb${cur ? '' : ' on'}" data-sl="home">${icon('pin')}<span>${t('pc.home')}</span></button>`
      + (cur ? `${icon('chevRight', 'flip')}<span class="pc-crumb on">${esc(locName(cur) || '-')}</span>` : ''));
    const q = normQ(st.q);
    const list = Object.entries(locs()).filter(([, l]) => l && (!q || normQ(`${l.nameAr || ''} ${l.nameEn || ''} ${l.name || ''}`).includes(q)));
    const loose = itemsIn(LOC_NONE).length;
    const noneTile = loose && !q ? `<div class="pc-tile sl-none${cur === LOC_NONE ? ' on' : ''}" data-id="${LOC_NONE}">
        <button type="button" class="pc-open" data-sl="open" aria-label="${t('pc.open')}: ${t('sl.noLocation')}">
          <span class="pc-ic">${icon('alert')}</span>
          <span class="pc-txt"><b>${t('sl.noLocation')}</b><small>${t('sl.noneSub')}</small><em>${t('sl.itemsN').replace('{n}', loose)}</em></span></button></div>` : '';
    setHtml(grid, list.length || noneTile ? noneTile + list.map(([id, l], i) => {
      const alt = S.lang === 'ar' ? l.nameEn : l.nameAr;
      return `<div class="pc-tile${first ? ' row-in' : ''}${id === cur ? ' on' : ''}" data-id="${esc(id)}" style="--r:${i}">
        <button type="button" class="pc-open" data-sl="open" aria-label="${t('pc.open')}: ${esc(nameOf(l))}">
          <span class="pc-ic">${icon('pin')}</span>
          <span class="pc-txt"><b>${esc(nameOf(l) || '-')}</b>${alt && alt !== nameOf(l) ? `<small>${esc(alt)}</small>` : ''}<em>${t('sl.itemsN').replace('{n}', itemsIn(id).length)}</em></span></button>
        <div class="row-acts">${rowMenuBtn()}
          <button class="btn-icon sm" data-sl="open" aria-label="${t('pc.open')}">${icon('eye')}</button>
          <button class="btn-icon sm" data-sl="edit" aria-label="${t('edit')}">${icon('pencil')}</button>
          <button class="btn-icon sm danger" data-sl="delete" aria-label="${t('delete')}">${icon('trash')}</button></div></div>`;
    }).join('') : `<div class="empty-state pc-empty">${icon(q ? 'search' : 'pin')}<b>${t(q ? 'emptyTitle' : 'sl.none')}</b><small>${t(q ? 'emptySub' : 'sl.noneSub')}</small></div>`);
    const its = cur ? itemsIn(cur).sort((a, b) => nameOf(a.it).localeCompare(nameOf(b.it))) : [];
    $('#slItemsTitle', view).innerHTML = cur ? `${t('sl.itemsTitle')} <em>${its.length}</em>` : t('sl.itemsTitle');
    setHtml($('#slItems', view), !cur ? `<p class="muted pc-hint">${icon('info')}${t('sl.pick')}</p>`
      : its.length ? its.map(x => `<span class="item-chip pc-item sl-item" data-item="${esc(keyOf(x))}"><span class="cell-2"><b>${esc(nameOf(x.it) || '-')}${cur !== LOC_NONE && isDef(x, cur) ? ` <span class="pk-type in">${t('sl.default')}</span>` : ''}</b><small>${t(x.type === 'product' ? 'sm.product' : 'sm.material')}${x.it.code ? ` · <span class="mono">${esc(x.it.code)}</span>` : ''}</small></span>
          <b class="num sl-qty">${qtyFmt(qtyIn(x, cur))} <small>${esc(unitName(x.it.unitId) || '')}</small></b>
          <button type="button" class="btn-icon sm" data-sl="move" aria-label="${t('sl.move')}" data-tip="${t('sl.move')}">${icon('swap')}</button>
          ${cur !== LOC_NONE ? `${isDef(x, cur) ? '' : `<button type="button" class="btn-icon sm" data-sl="default" aria-label="${t('sl.makeDefault')}" data-tip="${t('sl.makeDefault')}">${icon('pin')}</button>`}
          <button type="button" class="chip-x" data-sl="unlink" aria-label="${t('sl.removeItem')}" title="${t('sl.removeItem')}">${icon('x')}</button>` : ''}</span>`).join('')
      : `<p class="muted pc-hint">${icon('info')}${t('sl.noItems')}</p>`);
    first = false;
    if (picker) drawPicker();
  }

  function openForm(id) {
    const l = id ? locs()[id] : null;
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon(l ? 'pencil' : 'pin')}</span><div><h2 id="drawerTitle">${t(l ? 'sl.edit' : 'sl.new')}</h2><p>${t('fillForm')}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="slForm">
        <div class="field"><label for="lAr">${t('it.nameAr')} <em>*</em></label><input id="lAr" dir="rtl" value="${esc(l ? l.nameAr || l.name || '' : '')}" autocomplete="off"><small class="err"></small></div>
        <div class="field"><label for="lEn">${t('it.nameEn')} <em>*</em></label><input id="lEn" dir="ltr" value="${esc(l ? l.nameEn || '' : '')}" autocomplete="off"><small class="err"></small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="lSave">${icon('check')}<span>${t(l ? 'save' : 'add')}</span></button></footer>`;
    openLayer('#drawer');
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    $$('input', dr).forEach(i => i.addEventListener('input', () => err('#' + i.id, '')));
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const nameAr = $('#lAr', dr).value.trim(), nameEn = $('#lEn', dr).value.trim();
      let bad = false;
      if (!nameAr) { err('#lAr', t('required')); bad = true; }
      if (!nameEn) { err('#lEn', t('required')); bad = true; }
      if (bad) return;
      const btn = $('#lSave', dr); saving = true; btn.classList.add('loading');
      try {
        if (id) await LIVE.update({ [`storageLocations/${id}/nameAr`]: nameAr, [`storageLocations/${id}/nameEn`]: nameEn });
        else await LIVE.update({ [`storageLocations/${LIVE.newKey('storageLocations')}`]: { nameAr, nameEn } });
        toast(t(id ? 'saved' : 'added')); closeLayers();
      } catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#slForm', dr).addEventListener('submit', save);
    $('#lSave', dr).addEventListener('click', save);
    setTimeout(() => $('#lAr', dr).focus(), 320);
  }

  /* Deleting a location leaves its items without a location (as the old page) */
  async function remove(id) {
    const l = locs()[id]; if (!l) return;
    const its = itemsIn(id);
    const ok = await confirmDialog({ title: t('sl.deleteQ'), body: `<div class="cf-sum"><div><small>${t('sl.location')}</small><b>${esc(nameOf(l) || '-')}</b></div><div><small>${t('sl.itemsWord')}</small><b>${its.length}</b></div></div><p class="cf-note">${t('sl.deleteNote')}</p>`, ok: t('delete'), tone: 'danger', icon: 'trash' });
    if (!ok) return;
    const up = { [`storageLocations/${id}`]: null };
    its.forEach(x => unlinkUp(x, id, up));
    try { await LIVE.update(up); if (st.open === id) st.open = null; toast(t('deleted'), { tone: 'danger' }); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  async function unlink(key) {
    const x = allItems().find(y => keyOf(y) === key); if (!x) return;
    if (qtyIn(x, st.open) > 1e-9) { toast(t('sl.hasQty'), { tone: 'info', ic: 'info' }); return; }
    const up = {}; unlinkUp(x, st.open, up);
    try { await LIVE.update(up); toast(`«${nameOf(x.it)}» ${t('sl.removed')}`); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  /* The default location gets what arrives with no location; what the item holds stays where it is */
  async function makeDefault(key) {
    const x = allItems().find(y => keyOf(y) === key); if (!x) return;
    const up = { [pathOf(x)]: st.open };
    Object.entries(locView(x.type, x.id).locs).forEach(([loc, q]) => { up[locPath(x.type, x.id, loc)] = q; });
    try { await LIVE.update(up); toast(t('sl.defaultSet')); }
    catch (e) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
  }
  /* Move a quantity of one item from the open location (or "no location") to another */
  function openMove(key) {
    const x = allItems().find(y => keyOf(y) === key); if (!x) return;
    const from = st.open, max = qtyIn(x, from);
    const targets = Object.entries(locs()).filter(([id]) => id !== from).sort((a, b) => inLocation(x.type, x.id, b[0]) - inLocation(x.type, x.id, a[0]) || nameOf(a[1]).localeCompare(nameOf(b[1])));
    const dr = freshDrawer(false);
    dr.innerHTML = `
      <header class="dr-head"><span class="ph-ic sm">${icon('swap')}</span><div><h2 id="drawerTitle">${t('sl.move')}</h2><p>${esc(nameOf(x.it))} · ${t('sl.moveSub').replace('{from}', esc(locName(from)))}</p></div>
        <button class="btn-icon" data-close aria-label="${t('close')}">${icon('x')}</button></header>
      <form class="dr-body" novalidate id="mvForm">
        <div class="field"><label for="mvTo">${t('sl.moveTo')} <em>*</em></label><div class="select"><select id="mvTo"><option value="">${t('iv.choose')}</option>${targets.map(([id, l]) => `<option value="${esc(id)}">${esc(nameOf(l) || id)}${inLocation(x.type, x.id, id) ? ` · ${qtyFmt(qtyIn(x, id))} ${t('sl.qtyHere')}` : ''}</option>`).join('')}</select>${icon('chevDown')}</div><small class="err"></small></div>
        <div class="field"><label for="mvQty">${t('sl.moveQty')} <em>*</em></label><input id="mvQty" type="number" min="0" step="any" inputmode="decimal" value="${max}" dir="ltr"><small class="hint">${t('sl.moveMax').replace('{n}', qtyFmt(max))}</small><small class="err"></small></div>
      </form>
      <footer class="dr-foot"><button class="btn btn-ghost" data-close>${t('cancel')}</button><button class="btn btn-primary" id="mvSave">${icon('check')}<span>${t('save')}</span></button></footer>`;
    openLayer('#drawer');
    const err = (sel, msg) => { const f = $(sel, dr).closest('.field'); f.classList.toggle('invalid', !!msg); $('.err', f).textContent = msg || ''; };
    const save = async e => {
      e && e.preventDefault(); if (saving) return;
      const to = $('#mvTo', dr).value, q = Number($('#mvQty', dr).value);
      let bad = false;
      if (!to) { err('#mvTo', t('required')); bad = true; } else err('#mvTo', '');
      if (!(q > 0) || q > qtyIn(x, from) + 1e-9) { err('#mvQty', t('sl.moveMax').replace('{n}', qtyFmt(qtyIn(x, from)))); bad = true; } else err('#mvQty', '');
      if (bad) return;
      const up = { [locPath(x.type, x.id, to)]: LIVE.increment(q) };
      if (from !== LOC_NONE) up[locPath(x.type, x.id, from)] = LIVE.increment(-q);
      if (!locs()[x.it.storageLocationId]) up[pathOf(x)] = to;
      const btn = $('#mvSave', dr); saving = true; btn.classList.add('loading');
      try { await LIVE.update(up); toast(t('sl.moved')); closeLayers(); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; btn.classList.remove('loading'); }
    };
    $('#mvForm', dr).addEventListener('submit', save);
    $('#mvSave', dr).addEventListener('click', save);
    setTimeout(() => $('#mvTo', dr).focus(), 320);
  }

  /* ---------- put items in the open location ----------
     Lists items with no location or already in this one; ticked when they are in it,
     unticking takes an item out (same as the categories pages). */
  let picker = null, pkQ = '', pkShown = 60, pickFor = null;
  const picked = new Set();
  const pickable = () => {
    const q = normQ(pkQ);
    return allItems()
      .filter(x => !q || normQ(`${x.it.nameAr || ''} ${x.it.nameEn || ''} ${x.it.name || ''} ${x.it.code || ''} ${x.it.barcode || ''}`).includes(q))
      .sort((a, b) => inLocation(b.type, b.id, pickFor) - inLocation(a.type, a.id, pickFor) || nameOf(a.it).localeCompare(nameOf(b.it)));
  };
  const changes = () => {
    const now = new Set(itemsIn(pickFor).map(keyOf));
    let add = 0, out = 0;
    picked.forEach(k => { if (!now.has(k)) add++; });
    now.forEach(k => { if (!picked.has(k)) out++; });
    return { add, out, now };
  };
  function drawPicker() {
    if (!locs()[pickFor]) { closePicker(); return; }
    const list = pickable(), shown = list.slice(0, pkShown);
    $('#pkList', picker).innerHTML = shown.length ? shown.map(x => {
      const k = keyOf(x), on = picked.has(k);
      return `<button type="button" class="pk-row${on ? ' on' : ''}" data-k="${esc(k)}" role="checkbox" aria-checked="${on}">
        <span class="pk-check">${icon('check')}</span><span class="pk-txt"><b>${esc(nameOf(x.it) || '-')}</b><small>${esc([x.it.code, unitName(x.it.unitId)].filter(Boolean).join(' · '))}</small></span>
        ${inLocation(x.type, x.id, pickFor) ? `<span class="pk-type in">${t('sl.inHere')}</span>` : typeTag(x.type)}</button>`;
    }).join('') + (list.length > shown.length ? `<button type="button" class="pk-more" data-pk-more>${t('sp.showMore')} <em>${list.length - shown.length}</em></button>` : '')
      : `<div class="empty-state">${icon(pkQ ? 'search' : 'box')}<b>${pkQ ? t('emptyTitle') : t('sl.noFree')}</b><small>${pkQ ? t('emptySub') : t('sl.noFreeSub')}</small></div>`;
    paintFoot();
  }
  function paintFoot() {
    const { add, out } = changes();
    $('#pkCount', picker).textContent = [add ? t('pc.willAdd').replace('{n}', add) : '', out ? t('pc.willRemove').replace('{n}', out) : ''].filter(Boolean).join(' · ');
    $('#pkAdd', picker).disabled = !(add || out);
  }
  const keys = e => { if (picker && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); } };
  function closePicker() {
    if (!picker) return;
    const el = picker; picker = null;
    el.classList.remove('open'); setTimeout(() => el.remove(), 200);
    document.removeEventListener('keydown', keys, true);
  }
  function openPicker() {
    if (!st.open || picker) return;
    pickFor = st.open; pkQ = ''; pkShown = 60;
    picked.clear(); itemsIn(pickFor).forEach(x => picked.add(keyOf(x)));
    picker = document.createElement('div');
    picker.className = 'pk-wrap';
    picker.innerHTML = `<div class="pk-backdrop" data-pk-close></div>
      <div class="pk" role="dialog" aria-modal="true" aria-labelledby="pkTitle">
        <header class="pk-head"><span class="ph-ic sm">${icon('pin')}</span><div><h3 id="pkTitle">${t('sl.assign')}</h3><p>${esc(nameOf(locs()[pickFor]))} · ${t('sl.assignSub')}</p></div>
          <button class="btn-icon" data-pk-close aria-label="${t('close')}">${icon('x')}</button></header>
        <label class="search-field pk-search">${icon('search')}<input type="search" id="pkQ" placeholder="${t('it.searchPh')}" autocomplete="off"></label>
        <div class="pk-list" id="pkList"></div>
        <footer class="pk-foot"><span class="muted" id="pkCount"></span><span class="tb-spacer"></span>
          <button class="btn btn-ghost" data-pk-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="pkAdd" disabled>${icon('check')}<span>${t('save')}</span></button></footer>
      </div>`;
    document.body.appendChild(picker);
    drawPicker();
    void picker.offsetWidth; picker.classList.add('open');
    document.addEventListener('keydown', keys, true);
    setTimeout(() => { const q = picker && $('#pkQ', picker); q && q.focus(); }, 120);
    $('#pkQ', picker).addEventListener('input', e => { pkQ = e.target.value; pkShown = 60; $('#pkList', picker).scrollTop = 0; drawPicker(); });
    picker.addEventListener('click', async e => {
      if (e.target.closest('[data-pk-close]')) { closePicker(); return; }
      if (e.target.closest('[data-pk-more]')) { pkShown += 60; drawPicker(); return; }
      const p = e.target.closest('.pk-row[data-k]');
      if (p) { const k = p.dataset.k, on = !picked.has(k); on ? picked.add(k) : picked.delete(k); p.classList.toggle('on', on); p.setAttribute('aria-checked', on); paintFoot(); return; }
      const go = e.target.closest('#pkAdd'); if (!go || go.disabled || saving) return;
      const { now } = changes(), all = allItems(), up = {};
      // Added: the item is now also in this location (nothing in it yet); the first location is its default
      picked.forEach(k => { const x = all.find(y => keyOf(y) === k); if (!x || now.has(k)) return; up[locPath(x.type, x.id, pickFor)] = locRows(x.type, x.id).length ? 0 : locView(x.type, x.id).none; if (!locs()[x.it.storageLocationId]) up[pathOf(x)] = pickFor; });
      let kept = 0;
      now.forEach(k => { const x = all.find(y => keyOf(y) === k); if (!x || picked.has(k)) return; if (qtyIn(x, pickFor) > 1e-9) { kept++; return; } unlinkUp(x, pickFor, up); });
      if (kept) toast(t('sl.hasQtyN').replace('{n}', kept), { tone: 'info', ic: 'info' });
      if (!Object.keys(up).length) { closePicker(); return; }
      saving = true; go.classList.add('loading');
      try { await LIVE.update(up); toast(t('sl.assigned')); closePicker(); }
      catch (ex) { toast(t('pm.saveFailed'), { tone: 'danger', ic: 'alert' }); }
      finally { saving = false; go.classList.remove('loading'); }
    });
  }

  let deb;
  $('#slQ', view).addEventListener('input', e => { clearTimeout(deb); deb = setTimeout(() => { st.q = e.target.value.trim(); draw(); }, 120); });
  view.addEventListener('click', e => {
    const b = e.target.closest('[data-sl]'); if (!b || b.disabled) return;
    const a = b.dataset.sl;
    if (a === 'new') return openForm(null);
    if (a === 'assign') return openPicker();
    if (a === 'back' || a === 'home') { st.open = null; first = true; draw(); return; }
    if (a === 'unlink') return unlink(b.closest('[data-item]').dataset.item);
    if (a === 'move') return openMove(b.closest('[data-item]').dataset.item);
    if (a === 'default') return makeDefault(b.closest('[data-item]').dataset.item);
    const tile = b.closest('[data-id]'); if (!tile) return;
    const id = tile.dataset.id;
    if (a === 'open') { st.open = id; draw(); $('#slItems', view).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if (a === 'edit') return openForm(id);
    if (a === 'delete') return remove(id);
  });
  const unsub = LIVE.watch(PATHS, draw);
  draw();
  return () => { unsub(); closePicker(); freshDrawer(false); };
};
