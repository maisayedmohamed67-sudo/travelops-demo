// In-memory store for tests and local development. Same interface as store-mysql.js.
module.exports = function memoryStore() {
  const users = [], invites = new Map(), sessions = new Map();
  const docs = new Map();
  let rev = 0, queue = Promise.resolve();
  const allDocs = () => [...docs.values()].map(d => ({ ...d, body: d.json === null ? null : JSON.parse(d.json), gone: d.json === null })).sort((a, b) => a.o - b.o);
  const copy = u => (u ? { ...u } : null);
  const find = id => users.find(u => u.id === id);
  return {
    async init() {},
    async loadDocs() { return { rev, docs: allDocs() }; },
    // `plan` gets the current documents and returns the writes; nothing is stored if it throws.
    changeDocs(plan) {
      const run = queue.then(() => {
        const writes = plan(allDocs());
        if (writes.length) rev++;
        for (const w of writes) docs.set(w.c + '\n' + w.id, { ...w, rev });
        return { rev, saved: writes.map(w => ({ c: w.c, id: w.id, v: w.v })) };
      });
      queue = run.catch(() => {});
      return run;
    },
    async listUsers() { return users.map(copy); },
    async getUserByEmail(email) { return copy(users.find(u => u.email === email)); },
    async getUserById(id) { return copy(find(id)); },
    async createUser(u) {
      if (users.some(x => x.email === u.email || x.empId === u.empId)) throw Object.assign(new Error('duplicate'), { status: 409, code: 'duplicate' });
      const row = { id: users.length + 1, passHash: null, active: true, failed: 0, lockedUntil: 0, ...u };
      users.push(row);
      return copy(row);
    },
    async setPassword(id, passHash) { Object.assign(find(id), { passHash, failed: 0, lockedUntil: 0 }); },
    async setActive(id, active) { find(id).active = active; },
    async recordFailure(id, max, lockMs, now) {
      const u = find(id);
      if (++u.failed >= max) { u.failed = 0; u.lockedUntil = now + lockMs; }
    },
    async clearFailures(id) { Object.assign(find(id), { failed: 0, lockedUntil: 0 }); },
    async createInvite(hash, userId, expiresAt) {
      for (const [h, i] of invites) if (i.userId === userId) invites.delete(h);
      invites.set(hash, { userId, expiresAt });
    },
    async takeInvite(hash, now) {
      const i = invites.get(hash);
      invites.delete(hash);
      return i && i.expiresAt > now ? i.userId : null;
    },
    async createSession(hash, userId, expiresAt) { sessions.set(hash, { userId, expiresAt }); },
    async getSessionUser(hash, now) {
      const s = sessions.get(hash);
      const u = s && s.expiresAt > now && find(s.userId);
      return u && u.active ? copy(u) : null;
    },
    async deleteSession(hash) { sessions.delete(hash); },
    async deleteUserSessions(userId) { for (const [h, s] of sessions) if (s.userId === userId) sessions.delete(h); },
    async purge(now) { for (const [h, s] of sessions) if (s.expiresAt <= now) sessions.delete(h); }
  };
};
