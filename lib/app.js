// HTTP routes: sign-in, account activation, account management, and the system page for signed-in people.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const auth = require('./auth');
const data = require('./data');
const website = require('../site/pages');
const siteRequest = require('./site-request');
const siteTours = require('./site-tours');

const SESSION_MS = 12 * 60 * 60 * 1000;
const INVITE_MS = 48 * 60 * 60 * 1000;
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

const fail = (status, code) => Object.assign(new Error(code), { status, code });

module.exports = function createApp({ store, setupCode = '', secure = true, publicOrigin = '', root = path.join(__dirname, '..') }) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const page = read('index.html');
  const cut = page.indexOf('</head>');
  const files = { '/login': read('web/login.html'), '/accounts': read('web/accounts.html') };
  const tours = siteTours.liveTours(store);
  const editor = JSON.stringify(siteTours.editorData).replace(/</g, '\\u003c');
  const cookie = secure ? '__Host-sid' : 'sid';
  const loginLimit = auth.limiter(30, 60000), setupLimit = auth.limiter(10, 15 * 60000), tokenLimit = auth.limiter(30, 60000), requestLimit = auth.limiter(20, 10 * 60000), allRequests = auth.limiter(200, 60 * 60000);

  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    'Cache-Control': 'no-store',
    ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000' } : {})
  };

  function send(req, res, status, body, type, extra = {}) {
    const headers = { ...baseHeaders, 'Content-Type': type + '; charset=utf-8', Vary: 'Accept-Encoding', ...extra };
    const out = data => {
      headers['Content-Length'] = data.length;
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    };
    const buf = Buffer.from(body);
    if (buf.length > 20000 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      return zlib.gzip(buf, (err, z) => {
        if (err) return out(buf);
        headers['Content-Encoding'] = 'gzip';
        out(z);
      });
    }
    out(buf);
  }
  const json = (req, res, status, data, extra) => send(req, res, status, JSON.stringify(data), 'application/json', extra);
  const redirect = (res, to) => { res.writeHead(302, { ...baseHeaders, Location: to }); res.end(); };

  // The site is open to search engines only once PUBLIC_ORIGIN is set (the real domain).
  const siteOrigin = req => publicOrigin || (secure ? 'https://' : 'http://') + (/^[\w.:-]+$/.test(req.headers.host || '') ? req.headers.host : 'localhost');

  function sessionToken(req) {
    for (const part of (req.headers.cookie || '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === cookie) return part.slice(i + 1).trim();
    }
    return '';
  }
  async function currentUser(req) {
    const t = sessionToken(req);
    return t && t.length < 100 ? store.getSessionUser(auth.hashToken(t), Date.now()) : null;
  }
  const setCookie = (value, seconds) => ({
    'Set-Cookie': `${cookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`
  });
  async function startSession(userId) {
    const t = auth.newToken();
    await store.createSession(auth.hashToken(t), userId, Date.now() + SESSION_MS);
    return setCookie(t, SESSION_MS / 1000);
  }

  // Changes are accepted only from our own pages.
  function checkOrigin(req) {
    const site = req.headers['sec-fetch-site'];
    if (site) { if (site !== 'same-origin') throw fail(403, 'bad_origin'); return; }
    let host = '';
    try { host = new URL(req.headers.origin || '').host; } catch (e) { /* no usable Origin */ }
    if (!host || host !== req.headers.host) throw fail(403, 'bad_origin');
  }
  function readBody(req, max) {
    if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return Promise.reject(fail(415, 'bad_type'));
    return new Promise((resolve, reject) => {
      const parts = [];
      let size = 0;
      req.on('data', c => {
        size += c.length;
        if (size > max) { reject(fail(413, 'too_large')); req.destroy(); } else parts.push(c);
      });
      req.on('error', reject);
      req.on('end', () => {
        try {
          const v = JSON.parse(Buffer.concat(parts).toString('utf8'));
          if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('shape');
          resolve(v);
        } catch (e) { reject(fail(400, 'bad_json')); }
      });
    });
  }
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const client = req => String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress || '';
  const publicUser = u => ({ id: u.id, empId: u.empId, email: u.email, name: u.name, isAdmin: u.isAdmin, active: u.active, activated: !!u.passHash });

  async function newInvite(userId) {
    const t = auth.newToken();
    await store.createInvite(auth.hashToken(t), userId, Date.now() + INVITE_MS);
    return '/login#activate=' + t;
  }
  async function requireAdmin(req) {
    const u = await currentUser(req);
    if (!u) throw fail(401, 'signed_out');
    if (!u.isAdmin) throw fail(403, 'not_allowed');
    return u;
  }

  const post = {
    async '/api/login'(req, res, b) {
      if (!loginLimit(client(req))) throw fail(429, 'too_many');
      const email = str(b.email, 190).toLowerCase(), password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      const u = await store.getUserByEmail(email), now = Date.now();
      const locked = !!u && u.lockedUntil > now;
      const good = await auth.checkPassword(password, u && !locked ? u.passHash : null);
      if (!good || !u.active) {
        if (u && !locked && !good) await store.recordFailure(u.id, MAX_FAILS, LOCK_MS, now);
        throw fail(401, 'bad_login');
      }
      await store.clearFailures(u.id);
      json(req, res, 200, { ok: true }, await startSession(u.id));
    },
    async '/api/logout'(req, res) {
      const t = sessionToken(req);
      if (t) await store.deleteSession(auth.hashToken(t));
      json(req, res, 200, { ok: true }, setCookie('', 0));
    },
    async '/api/activate'(req, res, b) {
      if (!tokenLimit(client(req))) throw fail(429, 'too_many');
      const bad = auth.passwordProblem(b.password);
      if (bad) throw fail(400, bad);
      const hash = await auth.hashPassword(b.password);
      const id = await store.takeInvite(auth.hashToken(str(b.token, 100)), Date.now());
      const u = id && await store.getUserById(id);
      if (!u || !u.active) throw fail(400, 'bad_link');
      await store.setPassword(id, hash);
      await store.deleteUserSessions(id);
      json(req, res, 200, { ok: true }, await startSession(id));
    },
    // First Admin only: works while no Admin has a password, and needs SETUP_CODE from the server settings.
    async '/api/setup'(req, res, b) {
      if (!setupLimit('all')) throw fail(429, 'too_many');
      if (setupCode.length < 16 || !auth.sameText(str(b.code, 200), setupCode)) throw fail(403, 'bad_setup');
      const admins = (await store.listUsers()).filter(u => u.isAdmin);
      if (!admins.length || admins.some(u => u.passHash)) throw fail(403, 'bad_setup');
      const bad = auth.passwordProblem(b.password);
      if (bad) throw fail(400, bad);
      await store.setPassword(admins[0].id, await auth.hashPassword(b.password));
      json(req, res, 200, { ok: true, email: admins[0].email }, await startSession(admins[0].id));
    },
    async '/api/data/save'(req, res, b) {
      const u = await currentUser(req);
      if (!u) throw fail(401, 'signed_out');
      json(req, res, 200, await data.save(store, u, b.changes));
    },
    async '/api/data/start'(req, res, b) {
      const u = await requireAdmin(req);
      json(req, res, 200, await data.bootstrap(store, u, b.docs));
    },
    async '/api/site/request'(req, res, b) {
      if (!requestLimit(client(req)) || !allRequests('all')) throw fail(429, 'too_many');
      json(req, res, 200, await siteRequest.create(store, b, await tours()));
    },
    async '/api/users'(req, res, b) {
      await requireAdmin(req);
      const email = str(b.email, 190).toLowerCase(), name = str(b.name, 120), empId = str(b.empId, 40);
      if (!EMAIL.test(email)) throw fail(400, 'bad_email');
      if (!name || !/^[A-Za-z0-9_-]+$/.test(empId)) throw fail(400, 'bad_input');
      const u = await store.createUser({ email, name, empId, isAdmin: b.isAdmin === true });
      json(req, res, 200, { user: publicUser(u), link: await newInvite(u.id) });
    },
    async '/api/users/invite'(req, res, b) {
      await requireAdmin(req);
      const u = await store.getUserById(Number(b.id) || 0);
      if (!u || !u.active) throw fail(404, 'not_found');
      json(req, res, 200, { link: await newInvite(u.id) });
    },
    async '/api/users/active'(req, res, b) {
      const a = await requireAdmin(req), u = await store.getUserById(Number(b.id) || 0);
      if (!u) throw fail(404, 'not_found');
      if (u.id === a.id) throw fail(400, 'not_yourself');
      await store.setActive(u.id, b.active === true);
      if (b.active !== true) await store.deleteUserSessions(u.id);
      json(req, res, 200, { ok: true });
    }
  };

  async function handle(req, res) {
    const url = (req.url || '/').split('?')[0];
    if (req.method === 'POST') {
      const route = Object.prototype.hasOwnProperty.call(post, url) && post[url];
      if (!route) throw fail(404, 'not_found');
      checkOrigin(req);
      const big = url.startsWith('/api/data/');
      if (big && !(await currentUser(req))) throw fail(401, 'signed_out');
      return route(req, res, await readBody(req, big ? 12 * 1024 * 1024 : 16384));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'bad_method');
    if (url === '/login') return send(req, res, 200, files['/login'], 'text/html');
    if (url === '/api/users') {
      await requireAdmin(req);
      return json(req, res, 200, { users: (await store.listUsers()).map(publicUser) });
    }
    if (url === '/api/data') {
      const u = await currentUser(req);
      if (!u) throw fail(401, 'signed_out');
      const since = Number(new URL(req.url, 'http://x').searchParams.get('since')) || 0;
      return json(req, res, 200, await data.pull(store, u, since));
    }
    if (url !== '/app' && url !== '/accounts') {
      const q = new URL(req.url, 'http://x').searchParams, origin = siteOrigin(req);
      if (url === '/index.html') return redirect(res, '/');
      if (url === '/robots.txt') return send(req, res, 200, 'User-agent: *\nDisallow: ' + (publicOrigin ? '/app\nDisallow: /login\nDisallow: /accounts\nSitemap: ' + origin + '/sitemap.xml' : '/') + '\n', 'text/plain');
      if (url === '/sitemap.xml') return send(req, res, 200, website.sitemap(origin, await tours()), 'application/xml');
      if (url.startsWith('/api/') || url.includes('.')) throw fail(404, 'not_found');
      const out = website.route(url.length > 1 ? url.replace(/\/+$/, '') : url, q, origin, await tours());
      return send(req, res, out.status, out.html, 'text/html', publicOrigin ? {} : { 'X-Robots-Tag': 'noindex' });
    }
    const u = await currentUser(req);
    if (!u) return redirect(res, '/login');
    if (url === '/accounts') return u.isAdmin ? send(req, res, 200, files['/accounts'], 'text/html') : redirect(res, '/app');
    const who = JSON.stringify({ empId: u.empId, name: u.name, email: u.email, isAdmin: u.isAdmin }).replace(/</g, '\\u003c');
    const first = JSON.stringify(await data.pull(store, u)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    send(req, res, 200, page.slice(0, cut) + '<script>window.TRAVELOPS_USER=' + who + ';window.TRAVELOPS_DATA=' + first + ';window.TRAVELOPS_SITE=' + editor + '</script>' + page.slice(cut), 'text/html');
  }

  return (req, res) => {
    handle(req, res).catch(e => {
      if (!e.status) console.error('request failed:', e.code || e.message);
      if (res.headersSent) return res.end();
      json(req, res, e.status || 500, { error: e.status ? e.code : 'server_error', why: e.status ? e.why : undefined });
    });
  };
};
