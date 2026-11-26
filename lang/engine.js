/* A dictionary text ending in ~ matches any ending, which is kept (or translated if known).
   Arabic interface: texts are translated when they appear on screen. The data, the code and what is saved stay as they are.
   DICT comes from lang/ar.txt. Only whole texts (or their " · " parts) are translated, never words inside someone's text. */
(function () {
  // Arabic unless the person chose English (same default as the sign-in page).
  var KEY = 'travelops-lang', lang = 'ar';
  try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch (e) { /* private window */ }
  window.UI_LANG = lang;
  window.setUiLang = function (l) { try { localStorage.setItem(KEY, l); } catch (e) { /* private window */ } location.reload(); };
  if (lang !== 'ar') return;
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  var DAYS = { Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت', Sun: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت', Sunday: 'الأحد' };
  var MONTHS = { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Sept: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر', January: 'يناير', February: 'فبراير', March: 'مارس', April: 'أبريل', June: 'يونيو', July: 'يوليو', August: 'أغسطس', September: 'سبتمبر', October: 'أكتوبر', November: 'نوفمبر', December: 'ديسمبر' };
  var WORD = Object.keys(DAYS).concat(Object.keys(MONTHS)).join('|');
  // Only dates: day and month names with numbers and separators.
  var DATE = new RegExp('^(?=.*\\b(' + WORD + ')\\b)(?:' + WORD + '|[\\d\\s:,–→?-])+$');
  var WORDS = new RegExp('\\b(' + WORD + ')\\b', 'g');
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var cache = new Map();
  // A date ("Wed 2 Dec, 09:00", "26 Nov 2026"), an amount ("€1,939", "−EGP 0") or a number stands for "#".
  var CUR = '(?:USD|EUR|EGP|GBP|AED|SAR)\\s?|[€$£]';
  var TOKEN = new RegExp('(?:(?:' + Object.keys(DAYS).join('|') + '),?\\s)?\\d{1,2}\\s(?:' + Object.keys(MONTHS).join('|') + ')\\b(?:,?\\s\\d{4})?(?:,?\\s\\d{1,2}:\\d{2})?'
    + '|[+−-]?(?:' + CUR + ')\\d[\\d,.]*|\\d+[dhm](?:\\s\\d+[hm])?\\b|\\d[\\d,.]*\\d|\\d', 'g');
  // A duration ("1h 58m", "3d") is shown with Arabic units.
  var UNIT = { d: ' يوم', h: ' س', m: ' د' };
  function token(n) { return /^\d+[dhm](\s\d+[hm])?$/.test(n) ? n.replace(/(\d+)([dhm])/g, function (x, v, u) { return v + UNIT[u]; }) : n.replace(WORDS, function (w) { return DAYS[w] || MONTHS[w]; }); }

  function withTokens(s) {
    var toks = s.match(TOKEN);
    if (!toks) return null;
    var k = s.replace(TOKEN, '#');
    if (!has(DICT, k)) return null;
    var i = 0;
    return DICT[k].replace(/#/g, function () { var n = toks[i++]; return n === undefined ? '' : token(n); });
  }
  function lookup(s) {
    if (has(DICT, s)) return DICT[s];
    var t = withTokens(s);
    if (t !== null) return t;
    var nums = s.match(/\d[\d,.]*\d|\d/g);
    if (nums) {
      var k = s.replace(/\d[\d,.]*\d|\d/g, '#');
      if (has(DICT, k)) { var i = 0; return DICT[k].replace(/#/g, function () { var n = nums[i++]; return n === undefined ? '' : n; }); }
    }
    if (DATE.test(s)) return s.replace(WORDS, function (w) { return DAYS[w] || MONTHS[w]; });
    return null;
  }
  // A leading icon or a trailing mark may surround a known text.
  function one(s) {
    var r = lookup(s);
    if (r !== null) return r;
    var m = s.match(/^([^\p{L}\p{N}#(]*)([\s\S]*?)([\s:…→*✕✓.]*)$/u);
    if (m && m[2] && (m[1] || m[3])) { r = lookup(m[2]); if (r === null && m[2].length < s.length) r = translate(m[2]); if (r !== null) return m[1] + r + m[3].replace('→', '←'); }
    return null;
  }
  function translate(raw) {
    var t = raw.replace(/\s+/g, ' ').trim();
    if (!t || t.length > 400 || !/[A-Za-z]/.test(t)) return null;
    if (cache.has(t)) return cache.get(t);
    var out = one(t);
    [' · ', ' — '].forEach(function (sep) {
      if (out !== null || t.indexOf(sep) < 0) return;
      var any = false, parts = t.split(sep).map(function (p) { var r = one(p); if (r === null) r = translate(p); if (r !== null) any = true; return r === null ? p : r; });
      if (any) out = parts.join(sep === ' · ' ? ' · ' : ' — ');
    });
    if (out === null && t.indexOf(': ') > 0) {
      var i = t.indexOf(': '), a = lookup(t.slice(0, i + 1)) || lookup(t.slice(0, i)), b = translate(t.slice(i + 2));
      if (a !== null) out = a.replace(/:$/, '') + ': ' + (b === null ? t.slice(i + 2) : b);
    }
    // Lists ("Hotel + Other", "Rental end, Pickup location") are translated only when every item is known.
    [[', ', '، '], [' + ', ' + ']].forEach(function (s) {
      if (out !== null || t.indexOf(s[0]) <= 0) return;
      var all = t.split(s[0]).map(lookup);
      if (all.every(function (x) { return x !== null; })) out = all.join(s[1]);
    });
    if (out === null) for (var p in DICT) if (p.slice(-1) === '~' && t.indexOf(p.slice(0, -1)) === 0 && t.length > p.length - 1) {
      var rest = t.slice(p.length - 1), q = one(rest);
      out = DICT[p].replace('~', function () { return q === null ? rest : q; });
      break;
    }
    if (cache.size > 5000) cache.clear();
    cache.set(t, out);
    return out;
  }

  // Customer documents, messages and anything typed by people stay untouched.
  var SKIP = 'script,style,textarea,[contenteditable],[class^="qd"],[class*=" qd"],.ml-body,[data-no-tr]';
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function text(n) {
    var p = n.parentElement;
    if (!p || p.closest(SKIP)) return;
    var r = translate(n.nodeValue);
    if (r === null) return;
    // An option without a value uses its text as the value: keep the original.
    if (p.tagName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent.replace(/\s+/g, ' ').trim());
    var lead = n.nodeValue.match(/^\s*/)[0], tail = n.nodeValue.match(/\s*$/)[0], next = lead + r + tail;
    if (n.nodeValue !== next) n.nodeValue = next;
  }
  function attrs(e) {
    if (e.closest('script,style')) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = e.getAttribute && e.getAttribute(ATTRS[i]), r = v && translate(v);
      if (r && r !== v) e.setAttribute(ATTRS[i], r);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1) return;
    attrs(root);
    var w = document.createTreeWalker(root, 5), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (x) { if (x.nodeType === 3) text(x); else attrs(x); });
  }
  var obs = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') text(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else m.addedNodes.forEach(walk);
    });
    obs.takeRecords();
  });
  function start() { walk(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.__tr = translate;
})();
