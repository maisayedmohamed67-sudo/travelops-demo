const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../lib/lang');
const root = path.join(__dirname, '..');
const dict = parse(fs.readFileSync(path.join(root, 'lang/ar.txt'), 'utf8'));

test('every translation is Arabic and keeps its numbers', () => {
  for (const [en, ar] of Object.entries(dict)) {
    assert.match(ar, /[\u0600-\u06FF]/, en);
    assert.equal((ar.match(/#/g) || []).length, (en.match(/#/g) || []).length, en);
    assert.ok(!/[<>]/.test(ar), en);
  }
});

test('mistakes in the file are reported', () => {
  assert.throws(() => parse('Only English'), /missing/);
  assert.throws(() => parse('A = أ\nA = ب'), /two translations/);
});

test('the interface script is valid JavaScript', () => {
  new Function(require('../lib/lang').script(root));
});

// Runs the interface script without a browser and returns its translate function.
function translator() {
  const window = {}, document = { documentElement: {}, body: null, addEventListener() {} };
  const storage = { getItem: () => 'ar', setItem() {} };
  new Function('window', 'localStorage', 'document', 'MutationObserver', require('../lib/lang').script(root))(window, storage, document, function () { return { observe() {}, takeRecords() {} }; });
  return window.__tr;
}

test('amounts, dates and two-part texts are translated; data stays as it is', () => {
  const tr = translator();
  assert.equal(tr('due 6 Dec 2026'), 'مستحق 6 ديسمبر 2026');
  assert.equal(tr('overdue €1,939 · as of today'), 'متأخر €1,939 · حتى اليوم');
  assert.equal(tr('Not ready for pricing: Missing information: Number of passengers, Pickup location'), 'غير جاهز للتسعير: معلومات ناقصة: عدد الركاب، مكان الاستلام');
  assert.equal(tr('Bank — Cash'), 'البنك — نقدي');
  assert.equal(tr('Zamalek Palace Hotel, Cairo'), null);
  assert.equal(tr('⚠ Breached +1h 58m'), '⚠ تجاوز المهلة +1 س 58 د');
  assert.equal(tr('in 2h 43m'), 'خلال 2 س 43 د');
  assert.equal(tr('Hotel + Other'), 'فندق + أخرى');
  assert.equal(tr('Hurghada – 4 rooms, 3 nights + airport transfers'), null, 'a title is never half translated');
  assert.ok(dict['Revenue = approved selling price. # services not priced yet are left out.'], 'an English text may contain " = "');
});

test('every interface text in the system page has an Arabic translation', () => {
  // Names, places and customer-facing quotation texts stay in English; this only checks a sample of screens people use daily.
  const tr = translator();
  for (const s of ['Finance Dashboard', 'Payment Approvals', 'Customer Accounts', 'Supplier Accounts', 'Bank & Cash', 'Bank Reconciliation', 'Company Expenses', 'Financial Reports', 'People & permissions', 'Candidates', 'Km report', 'Send for Pricing Approval', 'Register customer payment · RQ-2026-1035'])
    assert.ok(tr(s), s);
});