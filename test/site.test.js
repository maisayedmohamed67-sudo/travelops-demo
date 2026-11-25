const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib/app');
const memoryStore = require('../lib/store-memory');
const data = require('../lib/data');
const { places, tours, dest } = require('../site/content');
const pages = require('../site/pages');

const SEED = [['employees', 'e1', { id: 'e1', name: 'A', dept: 'Operations', active: true, isAdmin: true }], ['employees', 'e5', { id: 'e5', name: 'F', dept: 'Finance', active: true }], ['single', 'settings', {}],
  ['requests', 'RQ-2020-1000', { id: 'RQ-2020-1000' }]].map(([c, id, body]) => ({ c, id, v: 0, body }));
async function boot(t, opts = {}) {
  const store = memoryStore();
  if (!opts.empty) await data.bootstrap(store, { isAdmin: true, empId: 'e1' }, SEED);
  const server = http.createServer(createApp({ store, secure: false, publicOrigin: opts.origin || '' }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const get = u => fetch(base + u, { redirect: 'manual' });
  const post = (b, h = {}) => fetch(base + '/api/site/request', { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json', origin: base, ...h } });
  return { store, get, post };
}
const GOOD = { name: 'Mona', email: 'Mona@Example.com', msg: 'Two weeks', adults: '2', children: '1', tour: 'egypt-5-days', ok: true };

test('content is complete in both languages', () => {
  assert.equal(new Set(tours.map(x => x.id)).size, tours.length);
  for (const x of tours) {
    assert.ok(x.title[0] && x.title[1] && x.price > 0, x.id);
    if (x.kind === 'package') assert.equal(x.plan.length, x.days, x.id);
    for (const k of x.plan.flat()) assert.equal((places[k] || []).length, 4, x.id + ' ' + k);
    for (const d of x.dests) assert.ok(dest[d], d);
  }
});

test('every page and link works, in both languages', async t => {
  const { get } = await boot(t);
  const seen = new Set(), queue = ['/', '/ar'];
  while (queue.length) {
    const u = queue.pop();
    if (seen.has(u)) continue;
    seen.add(u);
    const r = await get(u), html = await r.text();
    assert.equal(r.status, 200, u);
    assert.ok(!/undefined|\[object|NaN/.test(html.replace(/<script>[\s\S]*?<\/script>/g, '')), u);
    assert.match(html, u.startsWith('/ar') ? /lang="ar" dir="rtl"/ : /lang="en" dir="ltr"/);
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) { const v = m[1].replace(/&amp;/g, '&'); if (!v.startsWith('/login')) queue.push(v); }
  }
  assert.ok(seen.size > 2 * tours.length);
  for (const u of ['/nope', '/tours/nope', '/ar/nope', '/tours/__proto__', '/constructor']) assert.equal((await get(u)).status, 404, u);
});

test('the system stays behind the login, and the test site stays out of search engines', async t => {
  const { get } = await boot(t);
  assert.equal((await get('/app')).headers.get('location'), '/login');
  assert.equal((await get('/')).headers.get('x-robots-tag'), 'noindex');
  assert.match(await (await get('/robots.txt')).text(), /Disallow: \/\n/);
  const live = await boot(t, { origin: 'https://example.com' });
  assert.equal((await live.get('/')).headers.get('x-robots-tag'), null);
  assert.match(await (await live.get('/robots.txt')).text(), /Disallow: \/app\n/);
  assert.match(await (await live.get('/sitemap.xml')).text(), /https:\/\/example\.com\/ar\/tours/);
  for (const u of ['/site/pages.js', '/lib/app.js', '/package.json', '/.git/config']) assert.equal((await get(u)).status, 404, u);
});

test('a website request becomes a new unassigned request and tells Operations', async t => {
  const { store, post } = await boot(t);
  const r = await post(GOOD), { ref } = await r.json();
  assert.equal(r.status, 200);
  assert.match(ref, /^RQ-\d{4}-1001$/);
  const docs = (await store.loadDocs()).docs, d = docs.find(x => x.id === ref).body;
  assert.equal(d.assignee, null);
  assert.equal(d.stage, 'New');
  assert.equal(d.customer.email, 'mona@example.com');
  assert.equal(d.pax, 3);
  assert.match(d.thread[0].body, /Cairo & Luxor in 5 days/);
  assert.deepEqual(docs.filter(x => x.c === 'notifications').map(x => x.body.to), ['e1']);
  assert.notEqual((await (await post(GOOD)).json()).ref, ref);
});

test('bad, hidden-field and cross-site requests store nothing', async t => {
  const { store, post } = await boot(t);
  const why = async b => { const r = await post(b); return [r.status, (await r.json()).why]; };
  assert.deepEqual(await why({ ...GOOD, name: '' }), [400, 'name']);
  assert.deepEqual(await why({ ...GOOD, email: 'x' }), [400, 'email']);
  assert.deepEqual(await why({ ...GOOD, ok: 'true' }), [400, 'ok']);
  assert.deepEqual(await why({ ...GOOD, date: '2020-01-01' }), [400, 'date']);
  assert.deepEqual(await why({ ...GOOD, date: '2027-02-31' }), [400, 'date']);
  assert.equal((await post({ ...GOOD, website: 'spam' })).status, 200);
  assert.equal((await post(GOOD, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await store.loadDocs()).docs.filter(x => x.c === 'requests').length, 1);
});

test('requests are limited, and wait until the system has data', async t => {
  const { post } = await boot(t);
  let last = 200;
  for (let i = 0; i < 25; i++) last = (await post(GOOD)).status;
  assert.equal(last, 429);
  const empty = await boot(t, { empty: true });
  assert.equal((await empty.post(GOOD)).status, 503);
});

test('text from visitors is cleaned', async t => {
  const { store, post } = await boot(t);
  const { ref } = await (await post({ ...GOOD, name: 'A\u0000\nB <b>', phone: 'javascript:1', msg: 'x'.repeat(9000) })).json();
  const d = (await store.loadDocs()).docs.find(x => x.id === ref).body;
  assert.equal(d.customer.agency, 'A B <b>');
  assert.equal(d.customer.phone, '');
  assert.ok(d.thread[0].body.length < 3400);
});

test('every illustration is used and drawn', () => {
  for (const x of tours) assert.match(pages.route('/tours/' + x.id, new URLSearchParams(), 'https://x').html, /<svg viewBox="0 0 400 300"/);
});

const TOUR = { id: 'new-tour', kind: 'day', days: 1, price: 99, scene: 'pyramids', dests: ['cairo'], title: ['New tour', 'رحلة جديدة'], plan: [['giza']] };
const admin = { empId: 'e1', isAdmin: true };
const put = (store, who, body, v = 0) => data.save(store, who, [{ c: 'webTours', id: body.id, v, body }]);

test('tours changed in the system show on the website', async () => {
  const { liveTours } = require('../lib/site-tours');
  const store = memoryStore();
  await data.bootstrap(store, admin, SEED);
  const list = liveTours(store, 0), n = (await list()).length;
  await put(store, admin, TOUR);
  await put(store, admin, { ...tours[0], price: 777 });
  let now = await list();
  assert.equal(now.length, n + 1);
  assert.equal(now.find(x => x.id === tours[0].id).price, 777);
  assert.match(pages.route('/tours/new-tour', new URLSearchParams(), 'https://x', now).html, /\$99/);
  await put(store, admin, { ...tours[0], price: 777, hidden: true }, 1);
  now = await list();
  assert.equal(now.some(x => x.id === tours[0].id), false);
  assert.equal(pages.route('/tours/' + tours[0].id, new URLSearchParams(), 'https://x', now).status, 404);
  store.loadList = async () => { throw new Error('down'); };
  assert.equal((await list()).length, n, 'the last good list stays');
});

test('only allowed people save tours, and only valid ones', async () => {
  const store = memoryStore();
  await data.bootstrap(store, admin, [...SEED, { c: 'employees', id: 'e4', v: 0, body: { id: 'e4', dept: 'Operations', active: true, canManageCatalog: true } }]);
  const no = (who, body) => assert.rejects(put(store, who, body), e => ['refused', 'bad_change'].includes(e.code));
  await no({ empId: 'e5', isAdmin: false }, TOUR);
  for (const bad of [{ price: 0 }, { price: 1.5 }, { price: '99' }, { days: 2 }, { kind: 'x' }, { kind: 'constructor' }, { scene: 'x' }, { dests: [] }, { dests: ['__proto__'] }, { plan: [] }, { plan: [['nowhere']] }, { plan: [[]] },
    { title: ['x', 'y'] }, { title: ['Only English'] }, { id: 'Bad Id' }, { extra: 1 }, { hidden: 'yes' }]) await no(admin, { ...TOUR, ...bad });
  await put(store, { empId: 'e4', isAdmin: false }, TOUR);
  assert.equal((await store.loadList('webTours'))[0].updatedBy, 'e4');
});

test('titles written in the system are shown as text', () => {
  const html = pages.route('/tours/new-tour', new URLSearchParams(), 'https://x', [{ ...TOUR, title: ['<img src=x onerror=1>"\'', 'رحلة'] }]).html;
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!/<\/script><img/.test(html));
});