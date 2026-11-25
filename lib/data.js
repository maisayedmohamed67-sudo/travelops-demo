// The shared data: reading what a person may see, and saving changes all-or-nothing.
const R = require('./rules');
const MAX_CHANGES = 400, MAX_DOC = 4 * 1024 * 1024;
const fail = (status, code, why) => Object.assign(new Error(code), { status, code, why });

function context(user, docs) {
  const by = new Map(docs.map(d => [d.c + '\n' + d.id, d]));
  const body = (c, id) => { const d = by.get(c + '\n' + id); return d && !d.gone ? d.body : null; };
  const find = (c, id, test) => {
    if (!test) return body(c, id);
    for (const d of by.values()) if (d.c === c && !d.gone && test(d.body)) return d.body;
    return null;
  };
  const employees = docs.filter(d => d.c === 'employees' && !d.gone).map(d => d.body);
  return { ctx: R.makeCtx(user, employees, body('single', 'settings')), find, by };
}

// Documents changed after `since`, as this person may see them. `gone` means removed or no longer visible.
async function pull(store, user, since = 0) {
  if (since > 0 && since === await store.getRev()) return { rev: since, docs: [] };
  const { rev, docs } = await store.loadDocs();
  const { ctx, find } = context(user, docs);
  // Changes to people, settings or interviews can change what is visible, so send everything again.
  const full = since > 0 && docs.some(d => d.rev > since && (d.c === 'employees' || d.c === 'hr.interviews' || (d.c === 'single' && d.id === 'settings')));
  const out = [];
  for (const d of docs) {
    if (!full && d.rev <= since) continue;
    const seen = d.gone ? null : R.read(ctx, d.c, d.id, d.body, find);
    if (seen !== null) out.push({ c: d.c, id: d.id, v: d.v, o: d.o, body: seen });
    else if (since > 0) out.push({ c: d.c, id: d.id, v: d.v, gone: true });
  }
  return { rev, docs: out };
}

function checkChange(x) {
  if (!x || typeof x !== 'object' || typeof x.c !== 'string' || typeof x.id !== 'string') throw fail(400, 'bad_change');
  if (x.c === 'single' ? !R.SINGLES.includes(x.id) : !R.LISTS.includes(x.c)) throw fail(400, 'bad_change');
  if (x.c !== 'single' && !R.SAFE_ID.test(x.id)) throw fail(400, 'bad_change');
  if (!Number.isInteger(x.v) || x.v < 0) throw fail(400, 'bad_change');
  if (x.body === undefined) throw fail(400, 'bad_change');
  if (x.body !== null && x.c !== 'single') {
    if (typeof x.body !== 'object' || Array.isArray(x.body)) throw fail(400, 'bad_change');
    const key = x.c === 'customTypes' ? x.body.key : x.c === 'adminLog' ? x.id : x.body.id;
    if (key !== x.id) throw fail(400, 'bad_change');
  }
  if (x.body !== null) R.checkShape(x.body, '');
}

async function save(store, user, changes) {
  if (!Array.isArray(changes) || !changes.length || changes.length > MAX_CHANGES) throw fail(400, 'bad_change');
  changes.forEach(checkChange);
  // The page never removes many records at once; a page holding old data might try to.
  if (changes.filter(x => x.body === null && x.c !== 'drafts').length > 3) throw fail(400, 'bad_change', 'Too many records would be deleted');
  const keys = new Set(changes.map(x => x.c + '\n' + x.id));
  if (keys.size !== changes.length) throw fail(400, 'bad_change');
  return store.changeDocs(docs => {
    if (!docs.length) throw fail(409, 'not_ready');
    const { ctx, find, by } = context(user, docs);
    const writes = [];
    for (const x of changes) {
      const cur = by.get(x.c + '\n' + x.id), before = cur && !cur.gone ? cur.body : null;
      const counter = x.c === 'single' && R.COUNTERS.has(x.id);
      if (x.body === null && (!before || R.NEVER_DELETED.has(x.c))) continue;
      if (!counter && (cur ? cur.v : 0) !== x.v) throw fail(409, 'conflict', x.c === 'single' ? x.id : x.c + ' ' + x.id);
      const after = R.write(ctx, x.c, x.id, before, x.body, find);
      const json = after === null ? null : JSON.stringify(after);
      if (json && Buffer.byteLength(json) > MAX_DOC) throw fail(413, 'too_large');
      if (counter && json === JSON.stringify(before)) continue;
      // Later changes in the same save can refer to this one (a new person and the notice sent to them).
      by.set(x.c + '\n' + x.id, { c: x.c, id: x.id, body: after, gone: after === null });
      writes.push({ c: x.c, id: x.id, v: (cur ? cur.v : 0) + 1, o: cur ? cur.o : Number.isFinite(x.o) ? x.o : Date.now(), json });
    }
    return writes;
  });
}

// First data: one Admin, once, while the database is empty.
async function bootstrap(store, user, docs) {
  if (!user.isAdmin) throw fail(403, 'not_allowed');
  if (!Array.isArray(docs) || !docs.length || docs.length > 20000) throw fail(400, 'bad_change');
  docs.forEach(checkChange);
  return store.changeDocs(cur => {
    if (cur.length) throw fail(409, 'already_started');
    return docs.map((d, i) => ({ c: d.c, id: d.id, v: 1, o: i, json: JSON.stringify(d.body) }));
  });
}

// The Admin right as the system has it now.
async function isAdmin(store, user) {
  return R.makeCtx(user, await store.loadList('employees'), null).admin;
}

module.exports = { pull, save, bootstrap, context, isAdmin };
