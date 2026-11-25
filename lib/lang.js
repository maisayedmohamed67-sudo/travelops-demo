// Builds the interface language script from lang/ar.txt and lang/engine.js.
const fs = require('fs');
const path = require('path');

function parse(txt) {
  const dict = {};
  txt.split(/\r?\n/).forEach((l, i) => {
    if (!l.trim() || l.startsWith('##')) return;
    const k = l.indexOf(' = ');
    if (k < 1) throw new Error('lang/ar.txt line ' + (i + 1) + ': missing " = "');
    const en = l.slice(0, k).trim(), ar = l.slice(k + 3).trim();
    if (!ar) throw new Error('lang/ar.txt line ' + (i + 1) + ': no translation');
    if (Object.prototype.hasOwnProperty.call(dict, en) && dict[en] !== ar) throw new Error('lang/ar.txt line ' + (i + 1) + ': two translations for "' + en + '"');
    dict[en] = ar;
  });
  return dict;
}
function script(root) {
  const dict = parse(fs.readFileSync(path.join(root, 'lang/ar.txt'), 'utf8'));
  return 'var DICT=' + JSON.stringify(dict) + ';\n' + fs.readFileSync(path.join(root, 'lang/engine.js'), 'utf8');
}
module.exports = { parse, script };
