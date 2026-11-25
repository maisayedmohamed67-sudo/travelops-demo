const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../lib/app');
const memoryStore = require('../lib/store-memory');
const data = require('../lib/data');

const FIN = { accountant: { view: true, custAcc: true, regPay: true, verifyPay: true, rejectPay: true, recSupPay: true, approveOut: true, execOut: true, recExp: true } };
const emp = (id, o) => ({ id, name: id, active: true, dept: 'Operations', roles: { ops: 'consultant', price: 'none', fin: 'none' }, fin: {}, finLimits: {}, see: 'own', ...o });
const EMPLOYEES = [
  emp('e1', { isAdmin: true }),
  emp('e2', { fin: { regPay: true } }),
  emp('e3', { see: 'all' }),
  emp('e5', { dept: 'Finance', see: 'none', roles: { ops: 'none', price: 'none', fin: 'accountant' }, fin: FIN.accountant, finLimits: { supplier: { USD: 2000 } } }),
  emp('e6', { dept: 'Pricing', see: 'none', roles: { ops: 'none', price: 'pricer', fin: 'none' } }),
  emp('e8', { dept: 'HR', see: 'none', hr: true }),
  emp('d1', { dept: 'Drivers', isDriver: true, see: 'none' })
];
const svc = (id, o) => ({ id, type: 'vip', title: id, status: 'Pending', cost: 90, sell: 0, currency: 'USD', pricing: { state: 'Pending', rounds: [{ id: 'r1', cost: 90 }] }, ...o });
const REQ = {
  id: 'RQ-1', assignee: 'e2', stage: 'Deposit', status: 'Open', customer: { agency: 'Nile', email: 'x@nile.example', phone: '1' }, activity: [{ id: 'a1' }], notes: [], thread: [], quotations: [],
  services: [svc('s1'), svc('s2', { sell: 100, approvedCost: 80, pricing: { state: 'Approved', approvedAt: 5, approvedBy: 'e6', rounds: [] } }),
    { id: 's3', type: 'transport', title: 'car', status: 'Booked', cost: 50, sell: 70, currency: 'USD', bk: { pickup: 'Cairo' }, booking: { drivers: ['d1'], plates: ['A 1'] }, pricing: { state: 'Approved', approvedAt: 1, approvedBy: 'e1', rounds: [] } }],
  payments: [{ id: 'p1', amount: 100, receipts: [{ id: 'x1', amount: 100, acct: 'Pending', txId: 'FT-1' }] }]
};
const TX = { id: 'FT-1', kind: 'cust_in', dir: 'in', amount: 100, currency: 'USD', rid: 'RQ-1', accountId: 'acc1', status: 'Pending Verification', createdBy: 'e2', createdAt: 1, history: [] };
const SUP = { id: 'FT-2', kind: 'sup_out', dir: 'out', amount: 5000, currency: 'USD', status: undefined, approval: 'Pending Approval', pay: 'Unpaid', createdBy: 'e1', createdAt: 1, history: [] };
const SEED = [
  ...EMPLOYEES.map(e => ['employees', e.id, e]),
  ['single', 'settings', { pricingByCat: { vip: ['e6'] }, fx: {} }], ['single', 'fin.policy', { supplier: { mode: 'over', threshold: { USD: 1000 } }, expense: { mode: 'always' } }],
  ['single', 'destinations', ['Cairo']], ['single', 'fin.seq', { ft: 1002 }],
  ['requests', 'RQ-1', REQ], ['requests', 'RQ-2', { ...REQ, id: 'RQ-2', assignee: 'e3', services: [], payments: [] }],
  ['fin.accounts', 'acc1', { id: 'acc1', name: 'Bank', type: 'bank', currency: 'USD', opening: 9999, stmtBalance: 5, active: true }], ['fin.txns', 'FT-1', TX], ['fin.txns', 'FT-2', SUP],
  ['hr.cands', 'c1', { id: 'c1', name: 'Candidate' }], ['hr.cands', 'c2', { id: 'c2', name: 'Other' }], ['hr.interviews', 'i1', { id: 'i1', candId: 'c1', interviewer: 'e3' }],
  ['notifications', 'n1', { id: 'n1', to: 'e2', text: 'hi', read: false }], ['drafts', 'DRAFT-1', { id: 'DRAFT-1', by: 'e2' }], ['adminLog', '1-e1-1', { at: 1, by: 'e1', what: 'x' }],
  ['trips', 't1', { id: 't1', driver: 'd1' }], ['trips', 't2', { id: 't2', driver: 'd9' }], ['suppliers', 'sup1', { id: 'sup1', name: 'S' }]
].map(([c, id, body]) => ({ c, id, v: 0, body: JSON.parse(JSON.stringify(body)) }));

const user = id => ({ empId: id, isAdmin: id === 'e1' });
async function boot() {
  const store = memoryStore();
  await data.bootstrap(store, user('e1'), SEED);
  const see = async id => (await data.pull(store, user(id))).docs;
  const get = async (id, c, k) => (await see(id)).find(d => d.c === c && d.id === k);
  const put = async (who, c, id, fn) => {
    const all = (await store.loadDocs()).docs.find(d => d.c === c && d.id === id);
    const body = fn(all ? JSON.parse(JSON.stringify(all.body)) : null);
    return data.save(store, user(who), [{ c, id, v: all ? all.v : 0, body }]);
  };
  const no = (p, code = 'refused') => assert.rejects(p, e => { assert.equal(e.code, code, e.why || e.message); return true; });
  return { store, see, get, put, no };
}

test('each role reads only its own part', async () => {
  const { see, get } = await boot();
  const ids = async (who, c) => (await see(who)).filter(d => d.c === c).map(d => d.id).sort();
  assert.deepEqual(await ids('e1', 'requests'), ['RQ-1', 'RQ-2']);
  assert.deepEqual(await ids('e2', 'requests'), ['RQ-1']);
  assert.deepEqual(await ids('e3', 'requests'), ['RQ-1', 'RQ-2']);
  assert.deepEqual(await ids('e6', 'requests'), ['RQ-1']);
  assert.deepEqual(await ids('e8', 'requests'), []);
  assert.deepEqual(await ids('e2', 'fin.txns'), ['FT-1']);
  assert.deepEqual(await ids('e3', 'fin.txns'), []);
  assert.deepEqual(await ids('e5', 'fin.txns'), ['FT-1', 'FT-2']);
  assert.equal((await get('e2', 'fin.accounts', 'acc1')).body.stmtBalance, undefined);
  assert.equal((await get('e2', 'fin.accounts', 'acc1')).body.opening, 0);
  assert.equal((await get('e5', 'fin.accounts', 'acc1')).body.opening, 9999);
  assert.deepEqual(await ids('e8', 'hr.cands'), ['c1', 'c2']);
  assert.deepEqual(await ids('e3', 'hr.cands'), ['c1']);
  assert.deepEqual(await ids('e2', 'hr.cands'), []);
  for (const who of ['e2', 'e3', 'e5', 'e6', 'e8', 'd1']) assert.deepEqual(await ids(who, 'adminLog'), [], who);
  assert.deepEqual(await ids('e3', 'drafts'), []);
  assert.deepEqual(await ids('e3', 'notifications'), []);
});

test('a driver sees only their trips, without prices or contacts', async () => {
  const { see, get } = await boot();
  const r = (await get('d1', 'requests', 'RQ-1')).body, text = JSON.stringify(await see('d1'));
  assert.deepEqual(r.services.map(s => s.id), ['s3']);
  for (const k of ['cost', 'sell', 'pricing']) assert.equal(r.services[0][k], undefined);
  assert.ok(!text.includes('x@nile.example') && !text.includes('"opening"') && !text.includes('sup1'));
  assert.deepEqual((await see('d1')).filter(d => d.c === 'trips').map(d => d.id), ['t1']);
});

test('unknown or inactive people get nothing', async () => {
  const { store, put, no } = await boot();
  assert.deepEqual((await data.pull(store, user('zz'))).docs, []);
  await no(put('zz', 'notifications', 'n9', () => ({ id: 'n9', to: 'e1' })));
  await put('e1', 'employees', 'e3', e => ({ ...e, active: false }));
  assert.deepEqual((await data.pull(store, user('e3'))).docs, []);
});

test('only pricing managers approve and change prices', async () => {
  const { put, no } = await boot();
  const approve = by => r => { Object.assign(r.services[0], { sell: 120 }); Object.assign(r.services[0].pricing, { state: 'Approved', approvedAt: 9, approvedBy: by }); return r; };
  await no(put('e2', 'requests', 'RQ-1', approve('e2')));
  await no(put('e2', 'requests', 'RQ-1', r => { r.services[0].sell = 120; return r; }));
  await no(put('e2', 'requests', 'RQ-1', r => { r.services[1].sell = 999; return r; }));
  await no(put('e6', 'requests', 'RQ-1', approve('e1')));
  await no(put('e6', 'requests', 'RQ-1', r => { r.services[2].sell = 1; return r; }));
  await no(put('e6', 'requests', 'RQ-1', r => { r.customer.agency = 'Changed'; return r; }));
  await put('e6', 'requests', 'RQ-1', approve('e6'));
  await put('e2', 'requests', 'RQ-1', r => { r.services[0].cost = 95; r.services[0].pricing.state = 'Reapproval required'; r.notes.push({ id: 'n' }); return r; });
});

test('requests outside a person’s view can’t be changed, and history can’t be removed', async () => {
  const { put, no } = await boot();
  await no(put('e2', 'requests', 'RQ-2', r => { r.subject = 'x'; return r; }));
  await no(put('e8', 'requests', 'RQ-1', r => { r.subject = 'x'; return r; }));
  await no(put('e2', 'requests', 'RQ-1', r => { r.activity = []; return r; }));
  await no(put('e2', 'requests', 'RQ-1', () => null));
  await no(put('e5', 'requests', 'RQ-1', r => { r.subject = 'x'; return r; }));
  await no(put('e5', 'requests', 'RQ-9', () => ({ ...REQ, id: 'RQ-9' })));
  await no(put('d1', 'requests', 'RQ-1', r => { r.subject = 'x'; return r; }));
});

test('payments are verified by Accounting only, in their own name', async () => {
  const { put, no } = await boot();
  const verify = by => t => ({ ...t, status: 'Verified', verifiedBy: by });
  await no(put('e2', 'fin.txns', 'FT-1', verify('e2')));
  await no(put('e2', 'requests', 'RQ-1', r => { r.payments[0].receipts[0].acct = 'Verified'; return r; }));
  await no(put('e5', 'fin.txns', 'FT-1', verify('e1')));
  await no(put('e3', 'fin.txns', 'FT-1', verify('e3')));
  await put('e5', 'fin.txns', 'FT-1', verify('e5'));
  await put('e5', 'requests', 'RQ-1', r => { r.payments[0].receipts[0].acct = 'Verified'; return r; });
  await no(put('e5', 'fin.txns', 'FT-1', t => ({ ...t, amount: 1 })));
  await no(put('e5', 'fin.txns', 'FT-1', t => ({ ...t, status: 'Reversed' })));
  await no(put('e2', 'requests', 'RQ-1', r => { r.payments[0].receipts = []; return r; }));
  await no(put('e2', 'fin.txns', 'FT-9', () => ({ ...TX, id: 'FT-9', createdBy: 'e5' })));
  await no(put('e2', 'fin.txns', 'FT-9', () => ({ ...TX, id: 'FT-9', status: 'Verified' })));
  await no(put('e3', 'fin.txns', 'FT-9', () => ({ ...TX, id: 'FT-9', createdBy: 'e3' })));
  await put('e2', 'fin.txns', 'FT-9', () => ({ ...TX, id: 'FT-9' }));
});

test('supplier payments follow the approval rules and limits', async () => {
  const { put, no } = await boot();
  const mk = o => () => ({ ...SUP, id: 'FT-7', createdBy: 'e5', ...o });
  await no(put('e5', 'fin.txns', 'FT-7', mk({ approval: 'Approved' })));
  await no(put('e5', 'fin.txns', 'FT-7', mk({ pay: 'Paid' })));
  await no(put('e5', 'fin.txns', 'FT-7', mk({ amount: -5 })));
  await put('e5', 'fin.txns', 'FT-7', mk({ amount: 1500 }));
  await no(put('e5', 'fin.txns', 'FT-7', t => ({ ...t, approval: 'Approved' })));
  await no(put('e5', 'fin.txns', 'FT-2', t => ({ ...t, approval: 'Approved' })));
  await no(put('e5', 'fin.txns', 'FT-7', t => ({ ...t, pay: 'Paid' })));
  await put('e1', 'fin.txns', 'FT-7', t => ({ ...t, approval: 'Approved' }));
  await no(put('e5', 'fin.txns', 'FT-7', t => ({ ...t, amount: 1 })));
  await put('e5', 'fin.txns', 'FT-7', t => ({ ...t, pay: 'Paid' }));
});

test('nobody raises their own access', async () => {
  const { put, no, get } = await boot();
  for (const who of ['e2', 'e3', 'e5', 'e6', 'e8', 'd1']) {
    await no(put(who, 'employees', who, e => ({ ...e, isAdmin: true })));
    await no(put(who, 'employees', who, e => ({ ...e, fin: { view: true } })));
    await no(put(who, 'employees', who, e => ({ ...e, see: 'all', isDriver: false })));
    await no(put(who, 'single', 'settings', s => ({ ...s, pricingByCat: { vip: [who] } })));
    await no(put(who, 'single', 'fin.policy', () => ({})));
    await put(who, 'adminLog', '1-e1-1', () => null).catch(() => {});
    assert.ok(await get('e1', 'adminLog', '1-e1-1'), 'the log stays');
  }
  await put('e2', 'employees', 'e2', e => ({ ...e, signature: { on: true, name: 'E2' } }));
  await no(put('e2', 'employees', 'e3', e => ({ ...e, signature: { on: true } })));
});

test('other records', async () => {
  const { put, no, store } = await boot();
  await no(put('e3', 'notifications', 'n1', n => ({ ...n, read: true })));
  await put('e2', 'notifications', 'n1', n => ({ ...n, read: true }));
  await no(put('e3', 'drafts', 'DRAFT-1', () => null));
  await put('e2', 'drafts', 'DRAFT-1', () => null);
  await no(put('e2', 'suppliers', 'sup1', s => ({ ...s, name: 'X' })));
  await no(put('e2', 'fin.accounts', 'acc1', a => ({ ...a, opening: 0 })));
  await no(put('e2', 'hr.cands', 'c1', c => ({ ...c, name: 'X' })));
  await no(put('d1', 'trips', 't2', t => ({ ...t, driver: 'd1' })));
  await put('d1', 'trips', 't1', t => ({ ...t, end: { km: 5 } }));
  await put('e2', 'single', 'destinations', d => [...d, 'Luxor']);
  await no(put('e2', 'single', 'destinations', () => []));
  await put('e2', 'single', 'fin.seq', () => ({ ft: 5 }));
  assert.equal((await store.loadDocs()).docs.find(d => d.id === 'fin.seq').body.ft, 1002, 'counters never go down');
});

test('conflicts store nothing, batches are all-or-nothing', async () => {
  const { store, put, no, get } = await boot();
  const old = await get('e2', 'requests', 'RQ-1');
  await put('e1', 'requests', 'RQ-1', r => { r.subject = 'first'; return r; });
  await no(data.save(store, user('e2'), [{ c: 'requests', id: 'RQ-1', v: old.v, body: { ...old.body, subject: 'second' } }]), 'conflict');
  await no(data.save(store, user('e2'), [{ c: 'notifications', id: 'n5', v: 0, body: { id: 'n5', to: 'e1' } }, { c: 'suppliers', id: 'sup1', v: 1, body: { id: 'sup1', name: 'X' } }]));
  assert.equal((await store.loadDocs()).docs.some(d => d.id === 'n5'), false);
  assert.equal((await get('e1', 'requests', 'RQ-1')).body.subject, 'first');
  await no(data.save(store, user('e1'), [{ c: 'requests', id: 'RQ-1', v: 0, body: { ...REQ } }]), 'conflict');
});

test('a person who loses access is told the record is gone', async () => {
  const { store, put } = await boot();
  const { rev } = await data.pull(store, user('e2'));
  await put('e1', 'requests', 'RQ-1', r => ({ ...r, assignee: 'e3' }));
  const d = (await data.pull(store, user('e2'), rev)).docs.find(x => x.id === 'RQ-1');
  assert.equal(d.gone, true);
  assert.equal(d.body, undefined);
});

test('unsafe or malformed data is refused', async () => {
  const { store, no } = await boot();
  const tryIt = (c, id, body) => data.save(store, user('e1'), [{ c, id, v: 0, body }]);
  await no(tryIt('requests', "x');alert(1)//", { id: "x');alert(1)//" }), 'bad_change');
  await no(tryIt('requests', 'RQ-5', { id: 'RQ-6' }), 'bad_change');
  await no(tryIt('users', 'u1', { id: 'u1' }), 'bad_change');
  await no(tryIt('single', 'other', {}), 'bad_change');
  await no(tryIt('requests', 'RQ-5', { id: 'RQ-5', services: [{ id: "a');x('" }] }));
  await no(tryIt('fin.txns', 'FT-5', { ...TX, id: 'FT-5', createdBy: 'e1', docs: [{ name: 'a', data: 'javascript:alert(1)' }] }));
  await no(tryIt('fin.txns', 'FT-5', { ...TX, id: 'FT-5', createdBy: 'e1', docs: [{ name: 'a', data: 'data:text/html;base64,PHNjcmlwdD4=' }] }));
  await no(tryIt('fin.txns', 'FT-5', { ...TX, id: 'FT-5', createdBy: 'e1', docs: [{ name: 'a', data: 'data:image/png;base64,AAAA" onerror="x' }] }));
  await tryIt('fin.txns', 'FT-5', { ...TX, id: 'FT-5', createdBy: 'e1', docs: [{ name: 'a', data: 'data:image/png;base64,AAAA' }] });
});

test('many records can’t be deleted at once', async () => {
  const { store, no } = await boot();
  const docs = (await store.loadDocs()).docs.filter(d => d.c === 'employees').slice(0, 4);
  await no(data.save(store, user('e1'), docs.map(d => ({ c: d.c, id: d.id, v: d.v, body: null }))), 'bad_change');
  assert.equal((await store.loadDocs()).docs.filter(d => d.c === 'employees' && d.gone).length, 0);
});

test('the first data can be loaded once, by an Admin', async () => {
  const store = memoryStore();
  await assert.rejects(data.bootstrap(store, user('e2'), SEED), e => e.code === 'not_allowed');
  await data.bootstrap(store, user('e1'), SEED);
  await assert.rejects(data.bootstrap(store, user('e1'), SEED), e => e.code === 'already_started');
});

test('the routes need a session and the right origin', async t => {
  const store = memoryStore();
  await store.createUser({ empId: 'e1', email: 'a@company.example', name: 'A', isAdmin: true });
  const server = http.createServer(createApp({ store, setupCode: 'setup-code-for-tests-1234', secure: false }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (u, b, h = {}) => fetch(base + u, { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json', origin: base, ...h } });
  assert.equal((await fetch(base + '/api/data')).status, 401);
  assert.equal((await post('/api/data/save', { changes: [] })).status, 401);
  assert.equal((await post('/api/data/start', { docs: SEED })).status, 401);
  const cookie = (await post('/api/setup', { code: 'setup-code-for-tests-1234', password: 'long enough password' })).headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/api/data/start', { docs: SEED }, { cookie, origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/api/data/start', { docs: SEED }, { cookie })).status, 200);
  assert.equal((await post('/api/files', {})).status, 401);
  assert.equal((await fetch(base + '/api/files/cv1')).status, 401);
  assert.equal((await post('/api/files', { id: 'cv1', name: 'cv.pdf', data: 'JVBERi0=' }, { cookie })).status, 200);
  assert.equal((await fetch(base + '/api/files/cv1', { headers: { cookie } })).status, 404);
  await data.save(store, user('e1'), [{ c: 'hr.cands', id: 'c1', v: 1, body: { id: 'c1', cv: { id: 'cv1' } } }]);
  const file = await fetch(base + '/api/files/cv1', { headers: { cookie } });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  assert.match(file.headers.get('content-disposition'), /^attachment; filename\*=UTF-8''cv\.pdf$/);
  const page = await (await fetch(base + '/app', { headers: { cookie } })).text();
  assert.match(page, /window\.TRAVELOPS_DATA=\{"rev":\d/);
});

test('the Admin right follows the system', async () => {
  const { store, put, no } = await boot();
  await put('e1', 'employees', 'e2', e => ({ ...e, isAdmin: true }));
  assert.equal(await data.isAdmin(store, user('e2')), true);
  await put('e2', 'suppliers', 'sup1', s => ({ ...s, name: 'By the new Admin' }));
  await put('e2', 'employees', 'e1', e => ({ ...e, isAdmin: false }));
  assert.equal(await data.isAdmin(store, user('e1')), false, 'the account flag alone is not enough');
  await no(put('e1', 'suppliers', 'sup1', s => ({ ...s, name: 'X' })));
});

test('an interviewer records the result, and nothing else', async () => {
  const { store, put, no } = await boot();
  const at = id => store.loadDocs().then(r => r.docs.find(d => d.id === id));
  const i = await at('i1'), c = await at('c1');
  await data.save(store, user('e3'), [
    { c: 'hr.interviews', id: 'i1', v: i.v, body: { ...i.body, status: 'Done', result: 'Good' } },
    { c: 'hr.cands', id: 'c1', v: c.v, body: { ...c.body, history: [{ at: 1, by: 'e3', text: 'Interview done' }] } }
  ]);
  await no(put('e3', 'hr.cands', 'c1', x => ({ ...x, stage: 'Hired' })));
  await no(put('e3', 'hr.cands', 'c1', x => ({ ...x, history: [...x.history, { by: 'e8', text: 'forged' }] })));
  await no(put('e3', 'hr.cands', 'c1', x => ({ ...x, history: [] })));
});

test('bank reconciliation is approved only by those allowed', async () => {
  const { put, no } = await boot();
  await put('e1', 'single', 'fin.policy', p => ({ ...p, recon: { needsApproval: true } }));
  await put('e1', 'employees', 'e5', e => ({ ...e, fin: { ...e.fin, importStmt: true, reconcile: true } }));
  await put('e1', 'employees', 'e3', e => ({ ...e, fin: { approveRecon: true } }));
  await put('e5', 'fin.statements', 'ST-1', () => ({ id: 'ST-1', lines: [], reconciledAt: null }));
  await no(put('e5', 'fin.statements', 'ST-1', s => ({ ...s, reconciledAt: 5 })));
  await put('e3', 'fin.statements', 'ST-1', s => ({ ...s, reconciledAt: 5 }));
  await put('e3', 'fin.accounts', 'acc1', a => ({ ...a, stmtBalance: 7 }));
  await no(put('e5', 'fin.statements', 'ST-1', s => ({ ...s, lines: [1] })));
});

test('customer messages and the HR request counter are kept', async () => {
  const { store, put, no } = await boot();
  await put('e5', 'fin.custMsgs', 'm1', () => ({ id: 'm1', by: 'e5', ck: 'x' }));
  await no(put('e2', 'fin.custMsgs', 'm2', () => ({ id: 'm2', by: 'e2' })));
  await no(put('e5', 'fin.custMsgs', 'm1', m => ({ ...m, body: 'changed' })));
  await put('e2', 'single', 'hr.rseq', () => 1);
  assert.equal((await store.loadDocs()).docs.find(d => d.id === 'hr.rseq').body, 1);
});

test('CV files: HR adds, HR and the interviewer open', async () => {
  const files = require('../lib/files');
  const { store, put, no } = await boot();
  const data64 = Buffer.from('%PDF-1.4 test').toString('base64'), add = (who, o) => files.add(store, user(who), { id: 'cv1', name: 'A cv.pdf', data: data64, ...o });
  await no(add('e2'));
  await no(add('e8', { name: 'x.html' }));
  await no(add('e8', { name: 'x.svg' }));
  await no(add('e8', { data: '<script>' }), 'bad_change');
  await no(add('e8', { data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') }));
  await add('e8');
  await no(add('e8'), 'duplicate');
  await no(files.get(store, user('e8'), 'cv1'), 'not_found');
  await put('e8', 'hr.cands', 'c1', c => ({ ...c, cv: { id: 'cv1' } }));
  assert.equal((await files.get(store, user('e8'), 'cv1')).type, 'application/pdf');
  assert.equal((await files.get(store, user('e3'), 'cv1')).body.length, 13);
  await no(files.get(store, user('e2'), 'cv1'), 'not_found');
});
test('a new person and the notice to them are saved together', async () => {
  const { store, no } = await boot();
  const d = { id: 'd2', name: 'D', isDriver: true, dept: 'Drivers', active: true, fin: {}, see: 'none' }, n = { id: 'n7', to: 'd2', text: 'hi' };
  await no(data.save(store, user('e2'), [{ c: 'employees', id: 'd2', v: 0, body: d }, { c: 'notifications', id: 'n7', v: 0, body: n }]));
  await data.save(store, user('e1'), [{ c: 'employees', id: 'd2', v: 0, body: d }, { c: 'notifications', id: 'n7', v: 0, body: n }]);
});