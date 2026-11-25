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