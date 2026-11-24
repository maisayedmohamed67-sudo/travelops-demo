// MySQL store. Every value goes through a prepared statement. Times are milliseconds.
const mysql = require('mysql2/promise');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(40) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    is_admin TINYINT NOT NULL DEFAULT 0,
    active TINYINT NOT NULL DEFAULT 1,
    pass_hash VARCHAR(200) NULL,
    failed INT NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS invites (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX (user_id), INDEX (expires_at)
  )`,
  `CREATE TABLE IF NOT EXISTS docs (
    coll VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id VARCHAR(130) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    body MEDIUMTEXT NULL,
    ver INT UNSIGNED NOT NULL,
    ord DOUBLE NOT NULL,
    rev BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (coll, id), INDEX (rev)
  ) CHARACTER SET utf8mb4`,
  `CREATE TABLE IF NOT EXISTS docs_rev (one TINYINT PRIMARY KEY, rev BIGINT UNSIGNED NOT NULL)`,
  `INSERT IGNORE INTO docs_rev (one, rev) VALUES (1, 0)`
];
const toDoc = r => ({ c: r.coll, id: r.id, v: r.ver, o: r.ord, rev: Number(r.rev), gone: r.body === null, body: r.body === null ? null : JSON.parse(r.body) });
const ALL_DOCS = 'SELECT coll, id, body, ver, ord, rev FROM docs ORDER BY ord, rev';

const toUser = r => r && ({
  id: r.id, empId: r.emp_id, email: r.email, name: r.name, isAdmin: !!r.is_admin, active: !!r.active,
  passHash: r.pass_hash, failed: r.failed, lockedUntil: Number(r.locked_until)
});

module.exports = function mysqlStore(cfg) {
  const pool = mysql.createPool({ ...cfg, charset: 'utf8mb4', connectionLimit: 5, enableKeepAlive: true });
  const run = async (sql, args = []) => (await pool.execute(sql, args))[0];
  const one = async (sql, args) => toUser((await run(sql, args))[0]) || null;
  return {
    async init() { for (const t of TABLES) await run(t); },
    async loadDocs() {
      // One snapshot, so `rev` always matches the documents.
      const con = await pool.getConnection();
      try {
        await con.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
        const [[r]] = await con.query('SELECT rev FROM docs_rev WHERE one = 1');
        const [rows] = await con.query(ALL_DOCS);
        await con.commit();
        return { rev: Number(r.rev), docs: rows.map(toDoc) };
      } catch (e) { await con.rollback().catch(() => {}); throw e; } finally { con.release(); }
    },
    // `plan` gets the current documents and returns the writes; nothing is stored if it throws.
    async changeDocs(plan) {
      const con = await pool.getConnection();
      try {
        await con.beginTransaction();
        const [[r]] = await con.query('SELECT rev FROM docs_rev WHERE one = 1 FOR UPDATE');
        const [rows] = await con.query(ALL_DOCS + ' FOR UPDATE');
        const writes = plan(rows.map(toDoc));
        const rev = Number(r.rev) + (writes.length ? 1 : 0);
        for (const w of writes) {
          await con.execute('INSERT INTO docs (coll, id, body, ver, ord, rev) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE body = VALUES(body), ver = VALUES(ver), ord = VALUES(ord), rev = VALUES(rev)',
            [w.c, w.id, w.json, w.v, w.o, rev]);
        }
        if (writes.length) await con.execute('UPDATE docs_rev SET rev = ? WHERE one = 1', [rev]);
        await con.commit();
        return { rev, saved: writes.map(w => ({ c: w.c, id: w.id, v: w.v })) };
      } catch (e) { await con.rollback().catch(() => {}); throw e; } finally { con.release(); }
    },
    async listUsers() { return (await run('SELECT * FROM users ORDER BY id')).map(toUser); },
    getUserByEmail: email => one('SELECT * FROM users WHERE email = ?', [email]),
    getUserById: id => one('SELECT * FROM users WHERE id = ?', [id]),
    async createUser(u) {
      try {
        const r = await run('INSERT INTO users (emp_id, email, name, is_admin) VALUES (?, ?, ?, ?)', [u.empId, u.email, u.name, u.isAdmin ? 1 : 0]);
        return this.getUserById(r.insertId);
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('duplicate'), { status: 409, code: 'duplicate' });
        throw e;
      }
    },
    setPassword: (id, h) => run('UPDATE users SET pass_hash = ?, failed = 0, locked_until = 0 WHERE id = ?', [h, id]),
    setActive: (id, on) => run('UPDATE users SET active = ? WHERE id = ?', [on ? 1 : 0, id]),
    // MySQL assigns left to right, so locked_until is decided before failed is changed.
    recordFailure: (id, max, lockMs, now) => run(
      'UPDATE users SET locked_until = IF(failed + 1 >= ?, ?, locked_until), failed = IF(failed + 1 >= ?, 0, failed + 1) WHERE id = ?',
      [max, now + lockMs, max, id]),
    clearFailures: id => run('UPDATE users SET failed = 0, locked_until = 0 WHERE id = ?', [id]),
    async createInvite(hash, userId, expiresAt) {
      await run('DELETE FROM invites WHERE user_id = ?', [userId]);
      await run('INSERT INTO invites (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [hash, userId, expiresAt]);
    },
    async takeInvite(hash, now) {
      const row = (await run('SELECT user_id FROM invites WHERE token_hash = ? AND expires_at > ?', [hash, now]))[0];
      const gone = await run('DELETE FROM invites WHERE token_hash = ?', [hash]);
      return row && gone.affectedRows === 1 ? row.user_id : null;
    },
    createSession: (hash, userId, expiresAt) => run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [hash, userId, expiresAt]),
    getSessionUser: (hash, now) => one(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1', [hash, now]),
    deleteSession: hash => run('DELETE FROM sessions WHERE token_hash = ?', [hash]),
    deleteUserSessions: id => run('DELETE FROM sessions WHERE user_id = ?', [id]),
    async purge(now) {
      await run('DELETE FROM sessions WHERE expires_at <= ?', [now]);
      await run('DELETE FROM invites WHERE expires_at <= ?', [now]);
    }
  };
};
