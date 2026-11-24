// Passwords, tokens and small in-memory limits. No dependencies.
const crypto = require('crypto');

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MAX_PARALLEL = 4;
let running = 0;

function scrypt(password, salt) {
  if (running >= MAX_PARALLEL) return Promise.reject(Object.assign(new Error('busy'), { status: 503, code: 'busy' }));
  running++;
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, SCRYPT, (err, key) => (err ? reject(err) : resolve(key)));
  }).finally(() => { running--; });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return 's1$' + salt.toString('base64') + '$' + key.toString('base64');
}

// Unknown accounts are checked against this, so they take as long as real ones.
const DUMMY = 's1$' + crypto.randomBytes(16).toString('base64') + '$' + crypto.randomBytes(32).toString('base64');

async function checkPassword(password, stored) {
  const [, salt, want] = (stored || DUMMY).split('$');
  const key = await scrypt(password, Buffer.from(salt, 'base64'));
  return crypto.timingSafeEqual(key, Buffer.from(want, 'base64')) && !!stored;
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');

function sameText(a, b) {
  return crypto.timingSafeEqual(Buffer.from(hashToken(a)), Buffer.from(hashToken(b)));
}

// Fixed-window limiter: at most `max` hits per key per `ms`.
function limiter(max, ms) {
  const hits = new Map();
  return key => {
    const now = Date.now();
    if (hits.size > 5000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
    let h = hits.get(key);
    if (!h || h.until < now) hits.set(key, (h = { n: 0, until: now + ms }));
    return ++h.n <= max;
  };
}

function passwordProblem(p) {
  if (typeof p !== 'string' || p.length < 10) return 'password_short';
  if (p.length > 200) return 'password_long';
  if (/^(.)\1+$/.test(p)) return 'password_weak';
  return null;
}

module.exports = { hashPassword, checkPassword, newToken, hashToken, sameText, limiter, passwordProblem };
