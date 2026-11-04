/* أماكن التخزين بالكميات — how much of an item each storage location of the main branch holds.
   products|stockMaterials/{id}/locStock/{locationId} = quantity in that location; the item belongs to
   every location named there. stockByBranch[main] stays the real total (the cashier and the old page
   read it); what the locations don't account for shows as "no location".
   storageLocationId is the item's default location: an item not split yet holds all of its main
   stock there, and stock that arrives without a location goes there.
   Every write passes through withLocations (LIVE's write hook): a change of an item's main-branch
   stock moves its locations too — the location a voucher line named, or else automatically. */

const LOC_NONE = '__none';
const r3 = n => Math.round(Number(n || 0) * 1000) / 1000;
const locList = () => LIVE.cache.storageLocations || {};
const locName = id => (id === LOC_NONE ? t('sl.noLocation') : nameOf(locList()[id]) || '');
const locPath = (type, id, loc) => `${itemPath(type, id)}/locStock/${loc}`;

/* {total, none, locs: {loc: qty}} of one item at the main branch (stored quantities, trimmed to the
   real total when sales or another page took stock without naming a location) */
function locView(type, id, undo = {}) {
  const item = itemData(type, id), main = mainBranch();
  const empty = { total: 0, none: 0, locs: {} };
  if (!item || !main) return empty;
  const total = Math.max(0, r3(stockAt(item, main) - (undo[stockKey(type, id, main)] || 0)));
  const all = locList(), def = all[item.storageLocationId] ? item.storageLocationId : null;
  const stored = item.locStock && typeof item.locStock === 'object' ? item.locStock : null;
  const locs = {};
  if (stored && Object.keys(stored).length) Object.entries(stored).forEach(([loc, q]) => { if (all[loc]) locs[loc] = Math.max(0, r3(Number(q || 0) - (undo[locPath(type, id, loc)] || 0))); });
  else if (def) locs[def] = total;
  if (def && !(def in locs)) locs[def] = 0;
  let over = r3(Object.values(locs).reduce((s, q) => s + q, 0) - total);
  if (over > 0) takeFrom(locs, def, over);
  return { total, none: Math.max(0, r3(total - Object.values(locs).reduce((s, q) => s + q, 0))), locs };
}
/* Take qty out of the locations: the default one first, then the fullest */
function takeFrom(locs, def, qty) {
  const order = Object.keys(locs).sort((a, b) => (b === def) - (a === def) || locs[b] - locs[a]);
  for (const loc of order) { if (qty <= 1e-9) break; const q = Math.min(locs[loc], qty); locs[loc] = r3(locs[loc] - q); qty -= q; }
  return qty;
}
/* The locations an item is in (with what each holds), default first */
function locRows(type, id) {
  const v = locView(type, id), def = (itemData(type, id) || {}).storageLocationId;
  return Object.entries(v.locs).map(([loc, qty]) => ({ loc, qty, def: loc === def })).sort((a, b) => b.def - a.def || b.qty - a.qty);
}
const inLocation = (type, id, loc) => (loc === LOC_NONE ? locView(type, id).none > 1e-9 : loc in locView(type, id).locs);

/* The write hook: keep each touched item's locations in step with its main-branch stock */
const LOC_RX = /^(products|stockMaterials)\/([^/]+)\/(stockByBranch\/([^/]+)|locStock\/([^/]+))$/;
function withLocations(up) {
  const main = mainBranch(); if (!main || !up) return up;
  const touched = new Map();
  Object.keys(up).forEach(path => {
    const m = LOC_RX.exec(path); if (!m || (m[4] && m[4] !== main)) return;
    const type = m[1] === 'products' ? 'product' : 'material', k = `${type}:${m[2]}`;
    if (!touched.has(k)) touched.set(k, { type, id: m[2], stock: null, locs: [] });
    if (m[4]) touched.get(k).stock = path; else touched.get(k).locs.push([m[5], path]);
  });
  const inc = v => (v && v['.sv'] && v['.sv'].increment != null ? Number(v['.sv'].increment) : null);
  touched.forEach(({ type, id, stock, locs: named }) => {
    const item = itemData(type, id); if (!item) return;
    const view = locView(type, id), next = { ...view.locs }, gone = new Set();
    let none = view.none, change = 0;
    if (stock) {
      const v = up[stock], i = inc(v);
      // An absolute balance (a branch count) is stored with the sales still to come off it
      change = i != null ? i : typeof v === 'number' ? v - (type === 'product' ? soldQty(id, main) : 0) - stockAt(item, main) : 0;
    }
    named.forEach(([loc, path]) => {
      const v = up[path], i = inc(v);
      if (v === null) { none += next[loc] || 0; delete next[loc]; gone.add(loc); return; }
      const now = i != null ? (next[loc] || 0) + i : Number(v);
      change -= now - (next[loc] || 0);
      next[loc] = now;
    });
    // What the named locations don't cover: in to the default location, out of "no location" first
    const def = locList()[item.storageLocationId] ? item.storageLocationId : null;
    if (change > 1e-9) { if (def) next[def] = (next[def] || 0) + change; }
    else if (change < -1e-9) {
      let out = -change; const fromNone = Math.min(none, out); out -= fromNone;
      if (out > 1e-9) takeFrom(next, def, out);
    }
    if (!Object.keys(next).length && !gone.size) return;
    Object.entries(next).forEach(([loc, q]) => { up[locPath(type, id, loc)] = Math.max(0, r3(q)); });
    gone.forEach(loc => { up[locPath(type, id, loc)] = null; });
  });
  return up;
}
LIVE.setWriteHook(withLocations);

/* Location moves of one voucher line at the main branch (the location it named) */
function lineLocMoves(it, branch, sign) {
  if (!it.locId || it.locId === LOC_NONE || branch !== mainBranch() || !locList()[it.locId]) return [];
  return [[locPath(ivType(it), it.itemId, it.locId), sign * Number(it.qty || 0)]];
}

/* An item kept in more than one place of the main branch: every move there must name its place */
const multiLoc = (type, id, branch) => !!branch && branch === mainBranch() && locRows(type, id).length > 1;
/* The place select of one line. 'out': the item's places with what each holds; 'in': its places
   first, then the other locations. `undo` = moves this voucher already made (when editing). */
function locPick(type, id, mode, val, undo = {}) {
  const v = locView(type, id, undo), mine = Object.keys(v.locs).sort((a, b) => v.locs[b] - v.locs[a]);
  const opts = mode === 'out' ? mine.map(loc => [loc, `${locName(loc)} · ${t('sr.available')} ${qtyFmt(v.locs[loc])}`])
    : [...mine.map(loc => [loc, `${locName(loc)} · ${qtyFmt(v.locs[loc])}`]), ...Object.keys(locList()).filter(l => !(l in v.locs)).map(l => [l, locName(l)])];
  if (val && !opts.some(([l]) => l === val)) opts.unshift([val, locName(val) || val]);
  return `<div class="select mini bt-sel loc-sel${val ? '' : ' need'}">${icon('chevDown')}<select data-f="loc" aria-label="${t('storage-locations')}"><option value="">${t('sl.pickLoc')}</option>${opts.map(([l, label]) => `<option value="${esc(l)}" ${val === l ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div>`;
}
/* Place moves of saved lines ({itemType, itemId, qty, locId}) at a branch, with a sign */
const locMovesOf = (lines, branch, sign) => sumByPath((lines || []).filter(l => l && l.locId && branch && branch === mainBranch() && locList()[l.locId] && itemData(ivType(l), l.itemId))
  .map(l => [locPath(ivType(l), l.itemId, l.locId), sign * Number(l.qty || 0)]));
/* The first line that still needs a place → its name for the error, or '' */
const needLocName = (lines, branch, nameOfLine) => { const l = (lines || []).find(x => !x.locId && Number(x.qty || 0) > 0 && multiLoc(ivType(x), x.itemId, branch)); return l ? nameOfLine(l) : ''; };
