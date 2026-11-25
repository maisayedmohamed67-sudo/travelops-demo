// CV files. Only HR adds them; HR, and the interviewer of that candidate, can open them.
const R = require('./rules');
const { context } = require('./data');
const MAX = 5 * 1024 * 1024;
const TYPES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
const fail = (status, code, why) => Object.assign(new Error(code), { status, code, why });

async function view(store, user) {
  const { docs } = await store.loadDocs();
  return context(user, docs);
}
async function add(store, user, b) {
  const { ctx } = await view(store, user);
  if (!ctx.hr) throw fail(403, 'refused', 'HR only');
  const name = typeof b.name === 'string' ? b.name.replace(/[\p{Cc}"\\/]+/gu, ' ').trim().slice(0, 150) : '';
  const type = TYPES[(name.match(/\.([a-z]+)$/i) || ['', ''])[1].toLowerCase()];
  if (!type) throw fail(400, 'refused', 'Use a PDF, Word or image file');
  if (typeof b.id !== 'string' || !R.SAFE_ID.test(b.id) || b.id.length > 60) throw fail(400, 'bad_change');
  if (typeof b.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.data)) throw fail(400, 'bad_change');
  const body = Buffer.from(b.data, 'base64');
  if (!body.length || body.length > MAX) throw fail(413, 'refused', 'The file must be smaller than 5 MB');
  await store.addFile({ id: b.id, name, type, by: ctx.id, at: Date.now(), body });
  return { ok: true };
}
async function get(store, user, id) {
  if (!R.SAFE_ID.test(id)) throw fail(404, 'not_found');
  const { ctx, find } = await view(store, user);
  const cand = find('hr.cands', null, c => c.cv && c.cv.id === id);
  if (!cand || !R.read(ctx, 'hr.cands', cand.id, cand, find)) throw fail(404, 'not_found');
  const f = await store.getFile(id);
  if (!f) throw fail(404, 'not_found');
  return f;
}
module.exports = { add, get };
