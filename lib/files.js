// Attached files (receipts, invoices, vouchers, statements, email attachments, CVs), stored in the database.
// Large files arrive in parts of up to 2 MB, so no single request is big. A file can be opened once all its parts are in.
// Anyone who can see a record can open the files it refers to; the person who uploaded a file can always open it.
const R = require('./rules');
const { context } = require('./data');
const MAX = 50 * 1024 * 1024, PART = 2 * 1024 * 1024;
const TYPES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', txt: 'text/plain'
};
const fail = (status, code, why) => Object.assign(new Error(code), { status, code, why });

async function view(store, user) {
  const { docs } = await store.loadDocs();
  return { docs, ...context(user, docs) };
}
async function add(store, user, b) {
  if (typeof b.id !== 'string' || !R.SAFE_ID.test(b.id) || b.id.length > 60) throw fail(400, 'bad_change');
  if (typeof b.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.data)) throw fail(400, 'bad_change');
  const part = Number.isInteger(b.part) ? b.part : 0, parts = Number.isInteger(b.parts) ? b.parts : 1;
  const body = Buffer.from(b.data, 'base64');
  if (!body.length || body.length > PART || parts < 1 || parts > MAX / PART || part < 0 || part >= parts) throw fail(400, 'bad_change');
  if (part === 0) {
    const { ctx } = await view(store, user);
    if (b.kind === 'cv' ? !ctx.hr : !ctx.staff && !ctx.admin) throw fail(403, 'refused', b.kind === 'cv' ? 'HR only' : 'Not allowed to upload files');
    const name = typeof b.name === 'string' ? b.name.replace(/[\p{Cc}"\\/]+/gu, ' ').trim().slice(0, 150) : '';
    const type = TYPES[(name.match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toLowerCase()];
    if (!type) throw fail(400, 'refused', 'This type of file is not allowed. Use PDF, Word, Excel, CSV or an image.');
    await store.addFile({ id: b.id, name, type, by: ctx.id, at: Date.now(), parts });
  } else {
    const f = await store.fileInfo(b.id);
    if (!f || f.by !== user.empId || f.parts !== parts) throw fail(400, 'bad_change');
  }
  await store.addPart(b.id, part, body);
  return { ok: true };
}
async function get(store, user, id) {
  if (!R.SAFE_ID.test(id)) throw fail(404, 'not_found');
  const f = await store.getFile(id);
  if (!f) throw fail(404, 'not_found');
  if (f.by !== user.empId) {
    const { docs, ctx, find } = await view(store, user);
    const quoted = '"' + id + '"';
    const visible = docs.some(d => !d.gone && JSON.stringify(d.body).includes(quoted) && JSON.stringify(R.read(ctx, d.c, d.id, d.body, find) || null).includes(quoted));
    if (!visible) throw fail(404, 'not_found');
  }
  return f;
}
module.exports = { add, get, MAX, PART };
