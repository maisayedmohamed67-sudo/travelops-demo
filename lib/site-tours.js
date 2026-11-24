// The website's tours: the list in site/content.js, with the changes made in the system (collection "webTours") on top.
const { tours: BASE, places, dest, ui } = require('../site/content');
const { KINDS } = require('../site/scenes');

// Returns why a tour can't be saved, or null. Unknown fields are not allowed.
function problem(t) {
  const FIELDS = new Set(['id', 'kind', 'days', 'price', 'scene', 'dests', 'title', 'plan', 'hidden', 'updatedAt', 'updatedBy']);
  for (const k of Object.keys(t)) if (!FIELDS.has(k)) return 'Unknown field: ' + k;
  const whole = (v, a, b) => Number.isInteger(v) && v >= a && v <= b, own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id) || t.id.length < 3 || t.id.length > 70) return 'The web address is not valid';
  if (!own(ui.kinds, t.kind)) return 'Choose the type';
  if (!Array.isArray(t.title) || t.title.length !== 2 || t.title.some(x => typeof x !== 'string' || x.trim().length < 3 || x.length > 120)) return 'Write the title in English and Arabic';
  if (!whole(t.price, 1, 100000)) return 'The price must be a whole number';
  if (!whole(t.days, 1, 30) || (t.kind === 'package') !== (t.days > 1)) return 'The number of days does not match the type';
  if (!KINDS.includes(t.scene)) return 'Choose a picture';
  if (!Array.isArray(t.dests) || !t.dests.length || t.dests.length > 6 || new Set(t.dests).size !== t.dests.length || !t.dests.every(d => own(dest, d))) return 'Choose the destinations';
  if (!Array.isArray(t.plan) || t.plan.length !== t.days) return 'The route must have one entry for each day';
  if (!t.plan.every(d => Array.isArray(d) && d.length >= 1 && d.length <= 10 && new Set(d).size === d.length && d.every(k => own(places, k)))) return 'Every day needs at least one stop';
  if (t.hidden !== undefined && typeof t.hidden !== 'boolean') return 'The status is not valid';
  return null;
}

function merge(docs) {
  const mine = new Map(docs.filter(d => !problem(d)).map(d => [d.id, d]));
  const all = BASE.map(t => mine.get(t.id) || t);
  for (const d of mine.values()) if (!BASE.some(t => t.id === d.id)) all.push(d);
  const rank = { half: 0, day: 1, package: 2 };
  return all.filter(t => !t.hidden).map((t, i) => [t, i]).sort((a, b) => rank[a[0].kind] - rank[b[0].kind] || a[0].days - b[0].days || a[1] - b[1]).map(x => x[0]);
}

// Read from the database at most every few seconds; the last good list is kept if the database is unreachable.
function liveTours(store, ms = 5000) {
  let list = merge([]), until = 0, running = null;
  const refresh = () => running || (running = store.loadList('webTours').then(d => { list = merge(d); until = Date.now() + ms; }, e => { until = Date.now() + ms; console.error('tours not refreshed:', e.code || e.message); }).finally(() => { running = null; }));
  return async () => { if (Date.now() >= until) await refresh(); return list; };
}

// What the system's editing page needs.
const editorData = { base: BASE, places, dest, kinds: ui.kinds, scenes: KINDS };
module.exports = { problem, merge, liveTours, editorData };
