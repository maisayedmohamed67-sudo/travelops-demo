// Who may read and change what. Mirrors the rules in index.html, but enforced on the server.
// The system's state is stored as documents: (collection, id). "single" holds the parts that are not lists.
const { problem: tourProblem } = require('./site-tours');
const refuse = why => { throw Object.assign(new Error(why), { status: 403, code: 'refused', why }); };
const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
const list = v => (Array.isArray(v) ? v : []);

const LISTS = ['employees', 'requests', 'agencies', 'individuals', 'hotels', 'airlines', 'suppliers', 'supplierRequests', 'notifications', 'drafts',
  'templates', 'inbox', 'vehicleCategories', 'customTypes', 'adminLog', 'trips', 'fin.accounts', 'fin.txns', 'fin.payables', 'fin.statements',
  'fin.advances', 'fin.audit', 'hr.cands', 'hr.interviews', 'hr.reqs', 'webTours'];
const SINGLES = ['settings', 'company', 'destinations', 'otherTypes', 'draftSeq', 'schema', 'fin.schema', 'fin.seq', 'fin.methods', 'fin.expCats', 'fin.expCatOff',
  'fin.policy', 'fin.demoNote', 'hr.seq'];
// Counters only go up, and never cause a conflict.
const COUNTERS = new Set(['draftSeq', 'fin.seq', 'hr.seq']);
const NEVER_DELETED = new Set(['notifications', 'adminLog', 'fin.audit']);

function makeCtx(user, employees, settings) {
  const emp = employees.find(e => e.id === user.empId) || null;
  const admin = user.isAdmin;
  const on = !!emp && emp.active !== false;
  const roles = (emp && emp.roles) || {}, fin = (emp && emp.fin) || {};
  const driver = !!(emp && emp.isDriver);
  const fp = k => admin || (on && !!fin[k]);
  const canPrice = cat => admin || (on && list((settings && settings.pricingByCat || {})[cat]).includes(emp.id));
  const finMore = admin || Object.keys(fin).some(k => fin[k] && k !== 'regPay' && k !== 'selfApprove' && fp(k));
  const ops = admin || (on && !driver && emp.dept === 'Operations');
  const pricer = admin || (on && (['pricer', 'senior'].includes(roles.price) || Object.keys((settings || {}).pricingByCat || {}).some(canPrice)));
  return {
    id: user.empId, emp, on, admin, driver, ops, pricer, roles, fp, canPrice, finMore,
    staff: on && !driver, hr: admin || (on && !driver && emp.hr === true),
    cars: admin || ops || fp('view'),
    team: new Set(employees.filter(e => e.leader === user.empId).map(e => e.id)), settings: settings || {}
  };
}

function canSee(c, r) {
  if (c.admin) return true;
  if (!c.staff) return false;
  if (c.roles.price === 'senior' || ['accountant', 'approver', 'manager'].includes(c.roles.fin)) return true;
  const see = c.emp.see || 'own', S = list(r.services);
  if (see === 'all') return true;
  if (see !== 'none') {
    if (!r.assignee || r.assignee === c.id || S.some(s => s.comm && s.comm.responsible === c.id)) return true;
    if (see === 'team' && c.team.has(r.assignee)) return true;
  }
  return S.some(s => s.pricing && list(s.pricing.rounds).length && c.canPrice(s.type));
}

// A driver gets only their own transport lines, without prices or customer contacts.
function driverRequest(c, r) {
  const services = list(r.services).filter(s => s.type === 'transport' && list(s.booking && s.booking.drivers).includes(c.id))
    .map(s => ({ id: s.id, type: s.type, title: s.title, status: s.status, notes: s.notes, bk: s.bk, booking: { drivers: s.booking.drivers, plates: s.booking.plates } }));
  if (!services.length) return null;
  const k = r.customer || {};
  return { id: r.id, subject: r.subject, status: r.status, stage: r.stage, assignee: r.assignee, currency: r.currency, receivedAt: r.receivedAt, pax: r.pax,
    customer: { agency: k.agency, type: k.type }, services, payments: [], notes: [], thread: [], activity: [], quotations: [] };
}

// Returns what this person may see of a document, or null.
// `find` looks up another document: find(collection, id).
function read(c, coll, id, d, find) {
  if (!c.on && !c.admin) return null;
  if (coll === 'single') return d;
  if (c.admin) return d;
  switch (coll) {
    case 'employees':
      if (!c.driver) return d;
      return { id: d.id, name: d.name, role: d.role, dept: d.dept, active: d.active, isDriver: d.isDriver, isAdmin: d.isAdmin, phone: d.id === c.id ? d.phone : undefined,
        visible: [], roles: d.roles, fin: {}, finLimits: { supplier: {}, expense: {} }, xtra: { ops: [], fin: [] }, see: d.see, scope: d.scope, hours: d.hours, leave: [], email: d.email };
    case 'requests': return c.driver ? driverRequest(c, d) : canSee(c, d) ? d : null;
    case 'notifications': return d.to === c.id ? d : null;
    case 'drafts': return d.by === c.id ? d : null;
    case 'adminLog': return null;
    case 'trips': return d.driver === c.id || c.cars ? d : null;
    case 'inbox': return c.ops ? d : null;
    case 'fin.accounts':
      if (c.finMore) return d;
      return c.fp('regPay') ? { id: d.id, name: d.name, type: d.type, currency: d.currency, active: d.active, users: list(d.users), opening: 0 } : null;
    case 'fin.txns': {
      if (c.finMore) return d;
      if (!c.fp('regPay') || d.kind !== 'cust_in') return null;
      const r = d.rid && find('requests', d.rid);
      return d.createdBy === c.id || (r && canSee(c, r)) ? d : null;
    }
    case 'fin.payables': case 'fin.statements': case 'fin.advances': case 'fin.audit': return c.finMore ? d : null;
    case 'hr.cands': {
      if (c.hr) return d;
      return find('hr.interviews', null, i => i.candId === id && i.interviewer === c.id) ? d : null;
    }
    case 'hr.interviews': return c.hr || d.interviewer === c.id ? d : null;
    case 'hr.reqs': return c.hr || d.by === c.id ? d : null;
    case 'vehicleCategories': case 'customTypes': return d;
    default: return c.staff ? d : null;
  }
}

/* ---------- writing ---------- */
const onlyKeys = (before, after, keys) => {
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) if (!keys.has(k) && !same(before[k], after[k])) return k;
  return null;
};

function writeRequest(c, before, after) {
  if (!before) {
    if (!c.ops) refuse('Only Operations can create requests');
  } else {
    if (!canSee(c, before)) refuse('No access to this request');
    if (!c.ops) {
      const keys = new Set(['activity', 'slaNotified']);
      if (c.pricer) ['services', 'notes'].forEach(k => keys.add(k));
      if (c.fp('verifyPay') || c.fp('rejectPay') || c.fp('regPay') || c.fp('correct')) keys.add('payments');
      if (c.fp('verifyPay') && before.stage === 'Deposit' && after.stage === 'Booking') keys.add('stage');
      const bad = onlyKeys(before, after, keys);
      if (bad) refuse('Not allowed to change ' + bad);
    }
    if (list(after.activity).length < list(before.activity).length) refuse('History can’t be removed');
  }
  if (c.admin) return after;
  const old = new Map(list(before && before.services).map(s => [s.id, s]));
  for (const s of list(after.services)) {
    const b = old.get(s.id) || {}, p = s.pricing || {}, bp = b.pricing || {};
    if (c.canPrice(s.type)) {
      if (p.state === 'Approved' && !same(p.approvedAt, bp.approvedAt) && p.approvedBy !== c.id) refuse('The approval must be in your name');
      continue;
    }
    if (!c.ops && !same(b, s)) refuse('You don’t price this service');
    if (p.state === 'Approved') {
      if (!bp.approvedAt && !bp.legacy) refuse('Only a pricing manager approves prices');
      if (!same(p.approvedAt, bp.approvedAt) || !same(p.approvedBy, bp.approvedBy)) refuse('Only a pricing manager approves prices');
      for (const k of ['sell', 'sellNet', 'taxAmt', 'approvedCost']) if (!same(s[k], b[k])) refuse('Only a pricing manager changes an approved price');
    } else if (s.sell && !same(s.sell, b.sell)) refuse('Only a pricing manager sets the selling price');
  }
  if (!c.ops && before) for (const b of old.keys()) if (!list(after.services).some(s => s.id === b)) refuse('You can’t remove a service');
  const receipts = r => new Map(list(r && r.payments).flatMap(p => list(p.receipts)).map(x => [x.id, x]));
  const was = receipts(before), now = receipts(after);
  for (const [k, x] of now) {
    const b = was.get(k);
    if (x.acct === 'Verified' && !(b && b.acct === 'Verified') && !c.fp('verifyPay')) refuse('Only Accounting verifies payments');
    if (b && b.acct === 'Verified' && !c.fp('correct') && (!same(b.amount, x.amount) || x.acct !== 'Verified')) refuse('Verified payments can’t be changed');
  }
  for (const [k, b] of was) if (b.acct === 'Verified' && !now.has(k) && !c.fp('correct')) refuse('Verified payments can’t be removed');
  return after;
}

const CREATE_TX = { cust_in: ['regPay'], sup_out: ['recSupPay'], exp_out: ['recExp'], adv_out: ['advances'], adv_return_in: ['advances'], transfer: ['manageBank'],
  other_in: ['verifyPay', 'reconcile'], other_out: ['execOut', 'reconcile'], sup_refund_in: ['verifyPay'], cust_refund_out: ['execOut'] };

function approvalOk(c, t) {
  const kind = t.kind === 'sup_out' ? 'supplier' : 'expense';
  if (!c.fp(kind === 'supplier' ? 'approveOut' : 'approveExp')) return 'No approval permission';
  if (t.createdBy === c.id && !c.fp('selfApprove')) return 'Cannot approve own submission';
  const lim = c.emp && ((c.emp.finLimits || {})[kind] || {})[t.currency];
  if (lim !== undefined && lim !== null && lim !== '' && t.amount > +lim) return 'Above your limit';
  return null;
}
function needsApproval(policy, t) {
  const p = (policy || {})[t.kind === 'sup_out' ? 'supplier' : 'expense'];
  if (!p || p.mode === 'none') return false;
  if (p.mode === 'always') return true;
  const th = (p.threshold || {})[t.currency];
  return th !== undefined && th !== null && th !== '' && t.amount > +th;
}

function writeTx(c, before, t, find) {
  const out = t.kind === 'sup_out' || t.kind === 'exp_out';
  if (!(typeof t.amount === 'number' && t.amount > 0 && isFinite(t.amount))) refuse('The amount is not valid');
  if (!before) {
    if (!(CREATE_TX[t.kind] || []).some(c.fp)) refuse('Not allowed to record this transaction');
    if (t.createdBy !== c.id) refuse('A transaction must be in your name');
    if (t.status === 'Verified') refuse('A new payment can’t start as verified');
    if (t.pay === 'Paid') refuse('Record the payment after approval');
    if (out && needsApproval(find('single', 'fin.policy'), t) && t.approval !== 'Pending Approval') {
      const why = approvalOk(c, t);
      if (t.approval !== 'Approved' || why) refuse(why || 'This needs approval');
    }
    return t;
  }
  if (!c.finMore && before.createdBy !== c.id) refuse('Not your transaction');
  for (const k of ['kind', 'createdBy', 'createdAt', 'dir']) if (!same(before[k], t[k])) refuse('This can’t be changed: ' + k);
  if (list(t.history).length < list(before.history).length) refuse('History can’t be removed');
  const locked = before.status === 'Verified' || before.pay === 'Paid' || before.approval === 'Approved' || before.status === 'Completed';
  for (const k of ['amount', 'currency']) if (!same(before[k], t[k]) && (locked || !(c.fp('correct') || before.createdBy === c.id))) refuse('The amount can’t be changed now');
  if (before.status !== t.status) {
    if (before.status === 'Verified' && !c.fp('correct')) refuse('Verified payments can only be reversed with the Correct permission');
    if (t.status === 'Verified') {
      if (!c.fp('verifyPay')) refuse('Only Accounting verifies payments');
      if (before.createdBy === c.id && !c.fp('selfApprove')) refuse('Another person must verify it');
      if (t.verifiedBy !== c.id) refuse('The verification must be in your name');
    }
    if (t.status === 'Rejected' && !c.fp('rejectPay')) refuse('Not allowed to reject payments');
    if (t.status === 'Needs Clarification' && !c.fp('verifyPay') && !c.fp('rejectPay')) refuse('Not allowed');
    if (t.status === 'Reversed' && !c.fp('correct')) refuse('Not allowed to reverse');
  }
  if (out && before.approval !== t.approval) {
    if (t.approval === 'Approved' || t.approval === 'Rejected') {
      const why = approvalOk(c, before);
      if (why) refuse(why);
    } else if (!c.fp('correct')) refuse('Not allowed to change the approval');
  }
  if (out && before.pay !== t.pay && t.pay === 'Paid' && (!c.fp('execOut') || before.approval !== 'Approved')) refuse('Approval is required first');
  return t;
}

function writeEmployee(c, before, after) {
  if (c.admin) return after;
  if (before && before.id === c.id) {
    const bad = onlyKeys(before, after, new Set(['signature', 'sigHistory']));
    if (!bad) return after;
  }
  const managesDrivers = c.staff && c.emp.canReassign;
  if (managesDrivers && after.isDriver === true && (!before || before.isDriver === true)) {
    if (after.isAdmin || after.hr || Object.values(after.fin || {}).some(Boolean) || after.see !== 'none') refuse('A driver can’t have other access');
    if (before && onlyKeys(before, after, new Set(['name', 'phone', 'active']))) refuse('Only name, phone and status can be changed');
    return after;
  }
  return refuse('Admin permission required');
}

// Validates one change and returns the document to store (null = delete).
function write(c, coll, id, before, after, find) {
  if (!c.on && !c.admin) refuse('Your account is not linked to an active employee');
  if (coll === 'single') return writeSingle(c, id, before, after);
  if (before && after && !read(c, coll, id, before, find)) refuse('No access to this record');
  if (!after) {
    if (c.admin || (coll === 'drafts' && before.by === c.id)) return null;
    return refuse('Not allowed to delete this');
  }
  switch (coll) {
    case 'requests': return writeRequest(c, before, after);
    case 'employees': return writeEmployee(c, before, after);
    case 'fin.txns': return writeTx(c, before, after, find);
    case 'notifications':
      if (!before) return find('employees', after.to) ? after : refuse('Unknown person');
      if (before.to !== c.id || onlyKeys(before, after, new Set(['read', 'readAt', 'done', 'doneAt']))) refuse('Not your notification');
      return after;
    case 'drafts': return after.by === c.id ? after : refuse('Not your draft');
    case 'adminLog': return !before && after.by === c.id ? after : refuse('The log can’t be changed');
    case 'fin.audit': return !before && (after.by === c.id || after.by === 'system') ? after : refuse('The log can’t be changed');
    case 'trips':
      if (c.driver) return after.driver === c.id && (!before || before.driver === c.id) ? after : refuse('Not your trip');
      return c.admin || c.ops ? after : refuse('Not allowed to change trips');
  }
  if (coll === 'webTours') {
    if (!c.admin && !(c.staff && c.emp.canManageCatalog)) refuse('Only the Admin or the catalogue manager changes website tours');
    const why = tourProblem(after);
    if (why) refuse(why);
    return { ...after, updatedAt: Date.now(), updatedBy: c.id };
  }
  if (c.admin) return after;
  if (!c.staff) return refuse('Not allowed');
  switch (coll) {
    case 'agencies': case 'individuals': case 'inbox': return c.ops ? after : refuse('Operations only');
    case 'supplierRequests':
      if (!before) return c.ops && after.requestedBy === c.id && after.status === 'Pending' ? after : refuse('Operations only');
      return before.requestedBy === c.id && before.status === 'Pending' && after.status === 'Pending' ? after : refuse('Admin permission required');
    case 'hotels': case 'airlines':
      if (c.emp.canManageCatalog) return after;
      return !before && c.ops && /pending/i.test(after.status || '') ? after : refuse('Only the catalogue manager can do this');
    case 'suppliers': case 'vehicleCategories': return c.emp.canManageCatalog ? after : refuse('Admin permission required');
    case 'fin.accounts': return ['manageBank', 'importStmt', 'reconcile'].some(c.fp) && (before || c.fp('manageBank')) ? after : refuse('Not allowed to change bank accounts');
    case 'fin.payables': return ['recSupPay', 'correct'].some(c.fp) ? after : refuse('Not allowed to change payables');
    case 'fin.statements': return ['importStmt', 'reconcile', 'approveRecon'].some(c.fp) ? after : refuse('Not allowed to change statements');
    case 'fin.advances': return c.fp('advances') ? after : refuse('Not allowed to change advances');
    case 'hr.cands': return c.hr ? after : refuse('HR only');
    case 'hr.interviews': return c.hr || (before && before.interviewer === c.id && after.interviewer === c.id) ? after : refuse('HR only');
    case 'hr.reqs': return c.hr || (after.by === c.id && (!before || before.by === c.id)) ? after : refuse('HR only');
    default: return refuse('Admin permission required');
  }
}

function writeSingle(c, id, before, after) {
  if (COUNTERS.has(id)) {
    if (id !== 'fin.seq') return Math.max(Number(before) || 0, Number(after) || 0);
    const o = { ...(before || {}) };
    for (const [k, v] of Object.entries(after || {})) o[k] = Math.max(Number(o[k]) || 0, Number(v) || 0);
    return o;
  }
  if (c.admin) return after;
  if (id === 'destinations' && c.ops && Array.isArray(after) && list(before).every(x => after.includes(x)) && after.every(x => typeof x === 'string' && x.length < 80)) return after;
  return refuse('Admin permission required');
}

/* ---------- shape: nothing that could become code in a page ---------- */
const SAFE_ID = /^[\w.:|~-]{1,120}$/;
const SAFE_DATA = /^data:(image\/(png|jpe?g|gif|webp)|application\/pdf|text\/(plain|csv)|application\/(msword|vnd\.[\w.+-]+|octet-stream|zip)|);base64,[A-Za-z0-9+/=]*$/;
function checkShape(v, key, depth = 0) {
  if (depth > 14) refuse('The data is nested too deeply');
  if (typeof v === 'string') {
    if (/(^|[a-z])(id|Id)$/.test(key) && /^(id|sid|rid|txId|candId|supplierId|managerId|accountId|agencyId|individualId)$/.test(key) && v && !SAFE_ID.test(v) && !/^[\p{L}\p{N}:._|~-]{1,160}$/u.test(v)) refuse('A record code is not valid');
    if (/^\s*(javascript|vbscript|data):/i.test(v) && !SAFE_DATA.test(v)) refuse('This type of file is not allowed');
    if (/^(type|kind|status|stage|state|currency)$/.test(key) && /[<>"'`]/.test(v)) refuse('A value is not valid');
  } else if (Array.isArray(v)) v.forEach(x => checkShape(x, key, depth + 1));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') refuse('A field name is not valid');
    checkShape(x, k, depth + 1);
  }
}

module.exports = { LISTS, SINGLES, COUNTERS, NEVER_DELETED, SAFE_ID, makeCtx, canSee, read, write, checkShape, refuse };
