// TravelOps server. Settings come from environment variables (see README). Only signed-in people get the system page.
const http = require('http');
const createApp = require('./lib/app');

const env = process.env;
const port = env.PORT || 3000;
const dev = env.TRAVELOPS_DEV_MEMORY === '1';
const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(k => !env[k]);

let app = null;
async function start() {
  const store = dev ? require('./lib/store-memory')() : require('./lib/store-mysql')({
    host: env.DB_HOST, port: Number(env.DB_PORT) || 3306, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD
  });
  await store.init();
  if (!(await store.listUsers()).length) {
    await store.createUser({ empId: 'e1', email: 'nadia.farouk@company.example', name: 'Nadia Farouk', isAdmin: true });
  }
  app = createApp({ store, setupCode: env.SETUP_CODE || '', secure: !dev });
  setInterval(() => store.purge(Date.now()).catch(e => console.error('purge failed:', e.code || e.message)), 3600000).unref();
  console.log('TravelOps ready');
}
function startWithRetry() {
  start().catch(e => {
    console.error('start failed:', e.code || e.message);
    setTimeout(startWithRetry, 15000);
  });
}

// Without a database the system stays closed; it never falls back to an open page.
http.createServer((req, res) => {
  if (app) return app(req, res);
  res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('TravelOps is not configured yet.');
}).listen(port, () => console.log('TravelOps listening on ' + port));

if (dev || !missing.length) startWithRetry();
else console.error('Missing settings: ' + missing.join(', '));
