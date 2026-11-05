/* Searchable choice fields. Every `.select > select` (except the small `.mini` ones) gets a text box:
   typing filters the options in a list under it, and picking one sets the real <select> and fires
   `change`, so page code keeps reading and listening to the <select> as before. */
(() => {
  const norm = v => String(v ?? '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const indexDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let open = null; // { sel, input, list, items, idx }
  let uid = 0;

  const skip = sel => sel.multiple || sel.dataset.native != null || sel.dataset.per != null || sel.closest('.select.mini') || !sel.parentElement.classList.contains('select');

  function enhance(sel) {
    if (sel.__cb || skip(sel)) return;
    const wrap = sel.parentElement;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'cb-input'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    const listId = `cbl${++uid}`; input.setAttribute('aria-controls', listId);
    if (sel.id) { input.id = sel.id + '__cb'; $$(`label[for="${CSS.escape(sel.id)}"]`).forEach(l => l.setAttribute('for', input.id)); }
    if (sel.getAttribute('aria-label')) input.setAttribute('aria-label', sel.getAttribute('aria-label'));
    sel.classList.add('cb-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    wrap.classList.add('cb'); wrap.insertBefore(input, sel);
    const cb = sel.__cb = { sel, input, listId };
    caption(cb);
    // Code that sets .value / .selectedIndex directly keeps the text box in step
    Object.defineProperty(sel, 'value', { configurable: true, get() { return valueDesc.get.call(this); }, set(v) { valueDesc.set.call(this, v); sync(cb); } });
    Object.defineProperty(sel, 'selectedIndex', { configurable: true, get() { return indexDesc.get.call(this); }, set(v) { indexDesc.set.call(this, v); sync(cb); } });
    sel.focus = o => input.focus(o);
    new MutationObserver(() => { sync(cb); if (open && open.sel === sel) draw(input.value === labelOf(sel) ? '' : input.value); })
      .observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
    sel.addEventListener('change', () => sync(cb));
    // Focus only selects the text (forms focus fields on open); a click or typing shows the list
    input.addEventListener('focus', () => input.select());
    input.addEventListener('click', () => { if (!(open && open.sel === sel)) { openList(cb); input.select(); } });
    input.addEventListener('input', () => { if (!open) openList(cb); draw(input.value); });
    input.addEventListener('keydown', e => keys(cb, e));
    input.addEventListener('blur', () => setTimeout(() => { if (open && open.sel === sel && document.activeElement !== input) closeList(); }, 120));
    sync(cb);
  }

  /* A filter with no visible label (a toolbar choice such as branch or cashier
     showing just «الكل») writes its name inside the field, before the value. */
  const capRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => fitCap(e.target))) : null;
  function fitCap(cap) { const input = cap.__input; if (input && cap.offsetWidth) input.style.paddingInlineStart = `${cap.offsetWidth + 22}px`; }
  function caption(cb) {
    const { sel, input } = cb, wrap = sel.parentElement, name = (sel.getAttribute('aria-label') || '').trim();
    const labelled = wrap.closest('.field, label') || (sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"], label[for="${CSS.escape(input.id)}"]`));
    if (!name || labelled || wrap.querySelector('.cb-cap')) return;
    const cap = document.createElement('span');
    cap.className = 'cb-cap'; cap.textContent = name; cap.setAttribute('aria-hidden', 'true'); cap.__input = input;
    wrap.classList.add('cb-has-cap'); wrap.insertBefore(cap, input);
    if (capRO) capRO.observe(cap); else requestAnimationFrame(() => fitCap(cap));
    // The page may change the field's name later (language switch)
    new MutationObserver(() => { cap.textContent = (sel.getAttribute('aria-label') || '').trim(); }).observe(sel, { attributes: true, attributeFilter: ['aria-label'] });
  }
  const optionsOf = sel => [...sel.options];
  const labelOf = sel => { const o = sel.options[sel.selectedIndex]; return o && o.value !== '' ? o.textContent.trim() : ''; };
  function sync(cb) {
    const { sel, input } = cb;
    const first = sel.options[0];
    input.placeholder = first && first.value === '' ? first.textContent.trim() : '';
    if (!(open && open.sel === sel)) input.value = labelOf(sel);
    input.disabled = sel.disabled;
  }

  function openList(cb) {
    if (cb.sel.disabled) return;
    if (open && open.sel !== cb.sel) closeList();
    if (!open) {
      const list = document.createElement('div');
      list.className = 'cb-list'; list.id = cb.listId; list.setAttribute('role', 'listbox');
      document.body.appendChild(list);
      open = { ...cb, list, items: [], idx: -1 };
      list.addEventListener('mousedown', e => e.preventDefault());
      list.addEventListener('click', e => { const it = e.target.closest('.cb-opt'); if (it && !it.classList.contains('off')) pick(+it.dataset.i); });
      cb.input.setAttribute('aria-expanded', 'true');
      cb.sel.parentElement.classList.add('cb-open');
    }
    draw('');
  }
  function draw(q) {
    if (!open) return;
    const { sel, list } = open, nq = norm(q);
    const cur = sel.selectedIndex;
    open.items = optionsOf(sel).map((o, i) => ({ o, i })).filter(({ o }) => !(o.value === '' && nq) && !o.hidden && (!nq || norm(o.textContent).includes(nq)));
    open.idx = Math.max(0, open.items.findIndex(x => x.i === cur && !nq));
    if (nq) open.idx = open.items.findIndex(x => !x.o.disabled);
    list.innerHTML = open.items.length ? open.items.map(({ o, i }, k) => `<div class="cb-opt${o.disabled ? ' off' : ''}${i === cur ? ' sel' : ''}${k === open.idx ? ' hl' : ''}${o.value === '' ? ' cb-ph' : ''}" role="option" id="${open.listId}o${k}" data-i="${i}" aria-selected="${i === cur}">
        <span>${esc(o.textContent.trim())}</span>${i === cur && o.value !== '' ? icon('check') : ''}</div>`).join('')
      : `<div class="cb-none">${esc(t('noResults'))}</div>`;
    place(); mark();
  }
  function mark() {
    if (!open) return;
    $$('.cb-opt', open.list).forEach((el, k) => el.classList.toggle('hl', k === open.idx));
    const el = $$('.cb-opt', open.list)[open.idx];
    if (el) { open.input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
    else open.input.removeAttribute('aria-activedescendant');
  }
  function place() {
    const { input, list } = open, r = input.getBoundingClientRect();
    const below = innerHeight - r.bottom - 12, above = r.top - 12;
    const up = below < 220 && above > below;
    list.style.width = `${Math.max(r.width, 200)}px`;
    list.style.maxHeight = `${Math.min(300, Math.max(140, up ? above : below))}px`;
    const left = Math.min(Math.max(8, document.dir === 'rtl' ? r.right - Math.max(r.width, 200) : r.left), innerWidth - Math.max(r.width, 200) - 8);
    list.style.left = `${left}px`;
    list.style.top = up ? '' : `${r.bottom + 6}px`;
    list.style.bottom = up ? `${innerHeight - r.top + 6}px` : '';
    list.classList.toggle('up', up);
  }
  function pick(i) {
    const { sel, input } = open;
    const changed = sel.selectedIndex !== i;
    indexDesc.set.call(sel, i);
    closeList();
    input.value = labelOf(sel);
    if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function closeList() {
    if (!open) return;
    const { sel, input, list } = open;
    open = null;
    list.remove();
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
    sel.parentElement.classList.remove('cb-open');
    input.value = labelOf(sel);
  }
  function keys(cb, e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { openList(cb); return; }
      const n = open.items.length; if (!n) return;
      let k = open.idx;
      for (let s = 0; s < n; s++) { k = (k + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; if (!open.items[k].o.disabled) break; }
      open.idx = k; mark();
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      const it = open.items[open.idx]; if (it && !it.o.disabled) pick(it.i);
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); closeList(); }
    } else if (e.key === 'Tab') closeList();
  }

  document.addEventListener('mousedown', e => { if (open && !open.list.contains(e.target) && e.target !== open.input) closeList(); }, true);
  addEventListener('scroll', e => { if (open && !open.list.contains(e.target)) place(); }, true);
  addEventListener('resize', () => { if (open) place(); });
  addEventListener('hashchange', closeList);

  const scan = root => { if (root.nodeType !== 1) return; if (root.matches('select')) enhance(root); else root.querySelectorAll('.select > select').forEach(enhance); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => scan(document.body));
})();
