// A request from the website becomes a New, unassigned request in the system, with a notification for Operations.
const crypto = require('crypto');
const fail = (status, code, why) => Object.assign(new Error(code), { status, code, why });
const uid = p => p + crypto.randomBytes(5).toString('hex');
// Plain text only: no control characters or line separators.
const line = (v, max) => (typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim().slice(0, max) : '');
const block = (v, max) => (typeof v === 'string' ? v.split(/\r\n?|\n/).map(x => line(x, max)).join('\n').trim().slice(0, max) : '');
const count = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v)) || min));

function read(b, tours) {
  const x = { name: line(b.name, 100), email: line(b.email, 150).toLowerCase(), phone: line(b.phone, 40), country: line(b.country, 60), msg: block(b.msg, 3000), date: line(b.date, 10),
    adults: count(b.adults, 1, 200), children: count(b.children, 0, 100), lang: b.lang === 'ar' ? 'ar' : 'en', tour: tours.find(t => t.id === b.tour) || null };
  if (x.name.length < 2) throw fail(400, 'bad_request', 'name');
  if (!/^[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+\.[a-z0-9-]{2,}$/i.test(x.email)) throw fail(400, 'bad_request', 'email');
  if (x.phone && !/^[+\d][\d\s().-]{4,}$/.test(x.phone)) x.phone = '';
  if (x.date) {
    const d = new Date(x.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date) || isNaN(d) || d.toISOString().slice(0, 10) !== x.date || d < Date.now() - 2 * 86400000 || d > Date.now() + 3 * 366 * 86400000) throw fail(400, 'bad_request', 'date');
  }
  if (!x.msg && !x.tour) throw fail(400, 'bad_request', 'msg');
  if (b.ok !== true) throw fail(400, 'bad_request', 'ok');
  return x;
}

async function create(store, b, tours) {
  const x = read(b, tours);
  // Hidden field: people leave it empty.
  if (line(b.website, 50)) return { ref: 'RQ' };
  let ref;
  await store.changeDocs(docs => {
    if (!docs.length) throw fail(503, 'not_ready');
    const now = Date.now(), year = new Date(now).getFullYear(), taken = new Set(docs.filter(d => d.c === 'requests').map(d => d.id));
    let n = Math.max(1000, ...[...taken].map(id => { const m = id.match(/^RQ-(\d{4})-(\d+)$/); return m && +m[1] === year ? +m[2] : 0; })) + 1;
    while (taken.has(`RQ-${year}-${String(n).padStart(4, '0')}`)) n++;
    ref = `RQ-${year}-${String(n).padStart(4, '0')}`;
    const people = x.adults + x.children, title = x.tour ? x.tour.title[0] : 'Trip request';
    const known = docs.some(d => !d.gone && ((d.c === 'individuals' && String(d.body.email || '').toLowerCase() === x.email) || (d.c === 'agencies' && (d.body.agents || []).some(a => String(a.email || '').toLowerCase() === x.email))));
    const body = [x.msg, '', x.tour && `Tour: ${title} (from $${x.tour.price})`, x.date && `Arrival: ${x.date}`, `Adults: ${x.adults} · Children: ${x.children}`, x.country && `Country: ${x.country}`, x.phone && `Phone: ${x.phone}`, `Language: ${x.lang === 'ar' ? 'Arabic' : 'English'}`].filter(v => v !== false && v !== null && v !== undefined).join('\n').trim();
    const r = { id: ref, subject: `${title} – ${x.name} (${people} pax)`, priority: 'Normal',
      customer: { type: 'unidentified', agency: x.name, agent: x.name, email: x.email, phone: x.phone, country: x.country }, contactMethod: 'Email', source: 'website', outlook: { subject: title, conversationId: '', messageId: '', fromAddress: x.email, fromName: x.name },
      outlookRef: title, contactRef: '', receivedAt: now, assignee: null, assignedAt: null, stage: 'New', currency: 'USD', pax: people, travelStart: x.date, travelEnd: '', deadline: null, deadlineLabel: 'Quote due to customer',
      services: [], payments: [], scheduleStatus: 'none', scheduleHistory: [], quotations: [], timeCorrections: [], notes: [], thread: [{ id: uid('t'), dir: 'in', at: now, from: x.email, subject: title, body, summary: body.slice(0, 300), auto: true }],
      activity: [{ id: uid('a'), at: now, by: 'system', role: 'System', type: 'Request', stage: 'New', text: `Request received from the website. ${known ? 'This email belongs to a saved customer: check before linking.' : 'Customer to be identified.'} Placed in the Unassigned queue.` }], createdAt: now, flags: {} };
    const writes = [{ c: 'requests', id: ref, v: 1, o: -now, json: JSON.stringify(r) }];
    for (const d of docs) {
      const e = d.c === 'employees' && !d.gone && d.body;
      if (!e || e.active === false || e.isDriver || e.dept !== 'Operations') continue;
      const id = uid('nt');
      writes.push({ c: 'notifications', id, v: 1, o: now, json: JSON.stringify({ id, to: e.id, at: now, text: `New website request ${ref} from ${x.name}: ${title}`, link: ref, read: false, by: 'system', cat: 'request' }) });
    }
    return writes;
  });
  return { ref };
}
module.exports = { create };
