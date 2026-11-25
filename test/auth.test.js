const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib/app');
const memoryStore = require('../lib/store-memory');

const CODE = 'setup-code-for-tests-1234';
const PW = 'correct horse battery';

async function boot(t) {
  const store = memoryStore();
  await store.createUser({ empId: 'e1', email: 'admin@company.example', name: 'Admin </script><b>', isAdmin: true });
  const server = http.createServer(createApp({ store, setupCode: CODE, secure: false }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (url, body, cookie = '', headers = {}) => fetch(base + url, {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', origin: base, cookie, ...headers }
  });
  const get = (url, cookie = '') => fetch(base + url, { redirect: 'manual', headers: { cookie } });
  const sid = r => (r.headers.get('set-cookie') || '').split(';')[0];
  const setup = async () => sid(await post('/api/setup', { code: CODE, password: PW }));
  return { store, post, get, sid, setup };
}

test('nothing is served without signing in', async t => {
  const { get } = await boot(t);
  for (const u of ['/app', '/accounts']) {
    const r = await get(u);
    assert.equal(r.status, 302, u);
    assert.equal(r.headers.get('location'), '/login');
  }
  assert.equal((await get('/api/users')).status, 401);
  for (const u of ['/HANDOFF.md', '/server.js', '/lib/app.js', '/package.json', '/web/login.html', '/../server.js', '/.git/config']) assert.equal((await get(u)).status, 404, u);
  assert.equal((await get('/login')).status, 200);
});

test('setup works once and needs the code', async t => {
  const { post, setup } = await boot(t);
  assert.equal((await post('/api/setup', { code: 'wrong', password: PW })).status, 403);
  assert.equal((await post('/api/setup', { code: CODE, password: 'short' })).status, 400);
  assert.ok(await setup());
  assert.equal((await post('/api/setup', { code: CODE, password: 'another password' })).status, 403, 'no email');
});

test('a lost Admin password is replaced with the setup code and the Admin email', async t => {
  const { post, get, setup, store } = await boot(t);
  assert.equal((await (await get('/api/status')).json()).setup, true);
  const old = await setup();
  assert.equal((await (await get('/api/status')).json()).setup, false);
  await store.createUser({ empId: 'e2', email: 'omar@company.example', name: 'Omar', isAdmin: false });
  for (let i = 0; i < 8; i++) await post('/api/login', { email: 'admin@company.example', password: 'wrong wrong wrong' });
  const NEW = 'a brand new password';
  assert.equal((await post('/api/setup', { code: 'wrong', email: 'admin@company.example', password: NEW })).status, 403);
  assert.equal((await post('/api/setup', { code: CODE, email: 'omar@company.example', password: NEW })).status, 403, 'Admins only');
  assert.equal((await post('/api/setup', { code: CODE, email: 'nobody@company.example', password: NEW })).status, 403);
  assert.equal((await post('/api/setup', { code: CODE, email: ' Admin@company.example ', password: NEW })).status, 200);
  assert.equal((await get('/app', old)).status, 302, 'old sessions end');
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: PW })).status, 401);
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: NEW })).status, 200, 'the lock is cleared');
});

test('an empty setup code never works', async t => {
  const store = memoryStore();
  await store.createUser({ empId: 'e1', email: 'a@company.example', name: 'A', isAdmin: true });
  const server = http.createServer(createApp({ store, setupCode: '', secure: false }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const r = await fetch(base + '/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: base }, body: JSON.stringify({ code: '', password: PW }) });
  assert.equal(r.status, 403);
});

test('sign in, page, sign out', async t => {
  const { post, get, sid, setup } = await boot(t);
  await setup();
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: 'wrong wrong wrong' })).status, 401);
  assert.equal((await post('/api/login', { email: 'nobody@company.example', password: PW })).status, 401);
  const r = await post('/api/login', { email: ' ADMIN@company.example ', password: PW });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  const c = sid(r), page = await get('/app', c), html = await page.text();
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(html, /window\.TRAVELOPS_USER=\{"empId":"e1"/);
  assert.ok(!html.includes('Admin </script><b>'), 'the name is escaped');
  await post('/api/logout', {}, c);
  assert.equal((await get('/app', c)).status, 302);
});

test('an account locks after repeated failures', async t => {
  const { post, store, setup } = await boot(t);
  await setup();
  for (let i = 0; i < 8; i++) await post('/api/login', { email: 'admin@company.example', password: 'wrong wrong wrong' });
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: PW })).status, 401);
  await store.clearFailures(1);
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: PW })).status, 200);
});

test('requests from other sites are refused', async t => {
  const { post, setup } = await boot(t);
  const c = await setup();
  assert.equal((await post('/api/users/active', { id: 1, active: false }, c, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/api/logout', {}, c, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await post('/api/logout', {}, c, { 'Content-Type': 'text/plain' })).status, 415);
});

test('only an Admin manages accounts; links work once; stopping signs out', async t => {
  const { post, get, sid, setup } = await boot(t);
  const admin = await setup();
  const made = await (await post('/api/users', { empId: 'e2', email: 'omar@company.example', name: 'Omar' }, admin)).json();
  const token = made.link.split('=')[1];
  assert.equal((await post('/api/users', { empId: 'e2', email: 'x@company.example', name: 'X' }, admin)).status, 409);
  assert.equal((await post('/api/login', { email: 'omar@company.example', password: '' })).status, 401, 'no password yet');
  const r = await post('/api/activate', { token, password: PW });
  assert.equal(r.status, 200);
  const omar = sid(r);
  assert.equal((await post('/api/activate', { token, password: 'stolen password' })).status, 400);
  assert.equal((await get('/api/users', omar)).status, 403);
  assert.equal((await post('/api/users', { empId: 'e9', email: 'e9@company.example', name: 'N', isAdmin: true }, omar)).status, 403);
  assert.equal((await post('/api/users/invite', { id: 1 }, omar)).status, 403);
  assert.equal((await get('/accounts', omar)).status, 302);
  const list = await (await get('/api/users', admin)).json();
  assert.ok(!JSON.stringify(list).includes('s1$'), 'hashes are never sent');
  assert.equal((await post('/api/users/active', { id: 1, active: false }, admin)).status, 400);
  await post('/api/users/active', { id: 2, active: false }, admin);
  assert.equal((await get('/app', omar)).status, 302);
  assert.equal((await post('/api/login', { email: 'omar@company.example', password: PW })).status, 401);
});

test('a new link resets the password and ends old sessions', async t => {
  const { post, get, setup } = await boot(t);
  const old = await setup();
  const { link } = await (await post('/api/users/invite', { id: 1 }, old)).json();
  assert.equal((await post('/api/activate', { token: link.split('=')[1], password: 'brand new password' })).status, 200);
  assert.equal((await get('/app', old)).status, 302);
  assert.equal((await post('/api/login', { email: 'admin@company.example', password: PW })).status, 401);
});

test('expired sessions and oversized bodies are refused', async t => {
  const { post, get, store } = await boot(t);
  const { hashToken } = require('../lib/auth');
  await store.createSession(hashToken('old'), 1, Date.now() - 1);
  assert.equal((await get('/app', 'sid=old')).status, 302);
  const r = await post('/api/login', { email: 'a'.repeat(20000), password: PW }).catch(() => ({ status: 413 }));
  assert.equal(r.status, 413);
});

test('the sign-in and accounts pages use only elements and texts they have', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const f of ['login', 'accounts']) {
    const html = fs.readFileSync(path.join(__dirname, '../web/' + f + '.html'), 'utf8');
    for (const m of html.matchAll(/\$\('([\w-]+)'\)/g)) assert.ok(html.includes('id="' + m[1] + '"'), f + ': ' + m[1]);
    const T = new Function(html.match(/const T=(\{[\s\S]*?\}\});/)[0] + 'return T')();
    const keys = o => Object.keys(o).flatMap(k => (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? keys(o[k]).map(x => k + '.' + x) : [k])).sort();
    assert.deepEqual(keys(T.ar), keys(T.en), f);
    for (const m of html.matchAll(/\bt\.([a-zA-Z]\w*)/g)) assert.ok(m[1] in T.ar, f + ': ' + m[1]);
  }
});