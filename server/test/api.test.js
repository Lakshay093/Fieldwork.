import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/db.js';
import { User } from '../src/models/User.js';
import { LeaveRequest } from '../src/models/LeaveRequest.js';
import { seedDemo } from '../src/services/seed.js';

const secret = 'test-secret-with-at-least-thirty-two-characters';
const now = () => new Date('2026-09-01T12:00:00Z');
const app = createApp({ jwtSecret: secret, now, loginLimit: 100 });
let database,
  manager,
  employee,
  colleague,
  outsider,
  otherManager,
  passwordHash;
const token = (user) =>
  jwt.sign({}, secret, {
    subject: String(user._id),
    issuer: 'fieldwork',
    audience: 'fieldwork-web',
    expiresIn: '1h',
  });
const auth = (user) => ({ Authorization: `Bearer ${token(user)}` });
const payload = (extra = {}) => ({
  type: 'casual',
  startDate: '2026-09-07',
  endDate: '2026-09-09',
  reason: 'Visiting family for a celebration.',
  ...extra,
});
const apply = (extra = {}, user = employee) =>
  request(app).post('/api/leaves').set(auth(user)).send(payload(extra));
const decision = (id, action = 'approve', user = manager, body = {}) =>
  request(app).patch(`/api/leaves/${id}/${action}`).set(auth(user)).send(body);
const cancel = (id, user = employee) =>
  request(app).patch(`/api/leaves/${id}/cancel`).set(auth(user)).send({});
const balance = async (type = 'casual') =>
  (await User.findById(employee._id)).balances[type];
const stored = async (extra = {}) =>
  LeaveRequest.create({
    employeeId: employee._id,
    type: 'casual',
    startDate: '2026-09-07',
    endDate: '2026-09-09',
    workingDays: 3,
    reason: 'An existing request.',
    ...extra,
  });

beforeAll(async () => {
  database = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await connectDatabase(database.getUri());
  passwordHash = await bcrypt.hash('FieldworkDemo!26', 4);
});

beforeEach(async () => {
  await LeaveRequest.deleteMany({});
  await User.deleteMany({});
  manager = await User.create({
    name: 'Meera Kapoor',
    email: 'meera@example.com',
    role: 'manager',
    passwordHash,
  });
  otherManager = await User.create({
    name: 'Daniel Reyes',
    email: 'daniel@example.com',
    role: 'manager',
    passwordHash,
  });
  employee = await User.create({
    name: 'Aisha Khan',
    email: 'aisha@example.com',
    role: 'employee',
    managerId: manager._id,
    passwordHash,
    balances: { casual: 12, sick: 10 },
  });
  colleague = await User.create({
    name: 'Rohan Mehta',
    email: 'rohan@example.com',
    role: 'employee',
    managerId: manager._id,
    passwordHash,
  });
  outsider = await User.create({
    name: 'Nina Patel',
    email: 'nina@example.com',
    role: 'employee',
    managerId: otherManager._id,
    passwordHash,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

describe('demo seed', () => {
  it('creates one manager and four reports, with valid login and repeatable balances', async () => {
    const first = await seedDemo('FieldworkDemo!26', now());
    expect(first.users.filter((user) => user.role === 'manager')).toHaveLength(
      1,
    );
    expect(first.users.filter((user) => user.role === 'employee')).toHaveLength(
      4,
    );
    expect(first.requests).toBe(5);
    const seededEmployee = await User.findOne({
      email: 'aisha.khan@fieldwork.example',
    });
    expect(seededEmployee.balances.casual).toBe(10);
    expect(await User.countDocuments({ managerId: first.users[0].id })).toBe(4);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: seededEmployee.email, password: 'FieldworkDemo!26' });
    expect(login.status).toBe(200);
    const second = await seedDemo('AnotherPassword!26', now());
    expect(second.requests).toBe(5);
    expect(second.users).toEqual(first.users);
    expect((await User.findById(seededEmployee._id)).balances.casual).toBe(10);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: seededEmployee.email, password: 'FieldworkDemo!26' })
      ).status,
    ).toBe(200);
  });
  it('still creates all accounts safely near year end', async () => {
    const result = await seedDemo(
      'FieldworkDemo!26',
      new Date('2026-12-31T12:00:00Z'),
    );
    expect(result.users).toHaveLength(5);
    expect(result.requests).toBe(0);
  });
});

describe('authentication and API boundaries', () => {
  it('logs in with normalized email and never returns a password hash', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: ' AISHA@EXAMPLE.COM ', password: 'FieldworkDemo!26' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('employee');
    expect(login.body.user.passwordHash).toBeUndefined();
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.body.user.name).toBe('Aisha Khan');
    expect(await User.findById(employee._id)).not.toHaveProperty(
      'passwordHash',
      expect.any(String),
    );
  });
  it('returns a generic error for unknown accounts and wrong passwords', async () => {
    for (const email of ['aisha@example.com', 'unknown@example.com']) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'incorrect' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }
  });
  it('rejects missing, invalid, expired, and deleted-user tokens', async () => {
    const expired = jwt.sign({}, secret, {
      subject: String(employee._id),
      issuer: 'fieldwork',
      audience: 'fieldwork-web',
      expiresIn: -1,
    });
    for (const value of ['', 'Bearer invalid', `Bearer ${expired}`]) {
      expect(
        (await request(app).get('/api/auth/me').set('Authorization', value))
          .status,
      ).toBe(401);
    }
    const deletedToken = token(employee);
    await User.deleteOne({ _id: employee._id });
    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${deletedToken}`)
      ).status,
    ).toBe(401);
  });
  it('rate limits login with the consistent error shape', async () => {
    const limited = createApp({ jwtSecret: secret, loginLimit: 1 });
    await request(limited).post('/api/auth/login').send({});
    const res = await request(limited).post('/api/auth/login').send({});
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
  it('restricts CORS, sends security headers, and exposes health', async () => {
    const ok = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(ok.status).toBe(200);
    expect(ok.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    const blocked = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
  it('handles malformed JSON, unknown endpoints, and invalid IDs', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_JSON');
    expect((await request(app).get('/missing')).body.error.code).toBe(
      'NOT_FOUND',
    );
    expect((await cancel('bad-id')).status).toBe(400);
    expect((await cancel(new mongoose.Types.ObjectId())).status).toBe(404);
  });
  it('enforces role guards', async () => {
    expect((await apply({}, manager)).status).toBe(403);
    expect(
      (await request(app).get('/api/leaves/pending').set(auth(employee)))
        .status,
    ).toBe(403);
    expect(
      (await decision(new mongoose.Types.ObjectId(), 'approve', employee))
        .status,
    ).toBe(403);
  });
});

describe('applications and preview', () => {
  it('computes working days, trims the reason, ignores client-controlled fields, and reserves without deduction', async () => {
    const res = await apply({
      workingDays: 99,
      status: 'approved',
      employeeId: outsider._id,
      reason: '  Family celebration  ',
    });
    expect(res.status).toBe(201);
    expect(res.body.leave).toMatchObject({
      workingDays: 3,
      status: 'pending',
      employeeId: String(employee._id),
      reason: 'Family celebration',
      startDate: '2026-09-07',
    });
    expect(await balance()).toBe(12);
    const mine = await request(app).get('/api/leaves/mine').set(auth(employee));
    expect(mine.body.balances.casual).toMatchObject({
      total: 12,
      used: 0,
      pending: 3,
      available: 9,
    });
  });
  it.each([
    [{ endDate: '2026-09-06' }, 'INVALID_RANGE'],
    [{ startDate: '2026-08-31' }, 'PAST_DATE'],
    [{ startDate: '2026-12-31', endDate: '2027-01-04' }, 'CROSS_YEAR'],
    [{ startDate: '2026-09-12', endDate: '2026-09-13' }, 'NO_WORKING_DAYS'],
    [{ startDate: '2026-10-02', endDate: '2026-10-02' }, 'NO_WORKING_DAYS'],
  ])('rejects invalid business ranges %j', async (extra, code) => {
    const res = await apply(extra);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });
  it.each([
    [{ type: 'vacation' }, 'type'],
    [{ startDate: '2026-02-30' }, 'startDate'],
    [{ endDate: '09/09/2026' }, 'endDate'],
    [{ startDate: '2026-09-07T00:00:00Z' }, 'startDate'],
    [{ reason: '    tiny  ' }, 'reason'],
    [{ reason: 'x'.repeat(501) }, 'reason'],
  ])('returns field errors for %j', async (extra, field) => {
    const res = await apply(extra);
    expect(res.status).toBe(400);
    expect(res.body.error.fields[field]).toBeDefined();
  });
  it('allows today and weekend endpoints, excluding holidays', async () => {
    expect(
      (await apply({ startDate: '2026-09-01', endDate: '2026-09-01' })).status,
    ).toBe(201);
    const res = await apply({ startDate: '2026-09-26', endDate: '2026-10-04' });
    expect(res.status).toBe(201);
    expect(res.body.leave.workingDays).toBe(4);
  });
  it.each(['pending', 'approved'])(
    'rejects inclusive cross-type overlap with %s requests',
    async (status) => {
      await stored({ status });
      const res = await apply({
        type: 'sick',
        startDate: '2026-09-09',
        endDate: '2026-09-10',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('2026-09-07 to 2026-09-09');
    },
  );
  it('allows adjacent requests, other employees, and closed ranges', async () => {
    await stored({ status: 'cancelled' });
    await stored({ status: 'rejected' });
    await stored({ employeeId: outsider._id });
    expect((await apply()).status).toBe(201);
    expect(
      (await apply({ startDate: '2026-09-10', endDate: '2026-09-11' })).status,
    ).toBe(201);
  });
  it('subtracts same-type pending reservations and shows requested versus available', async () => {
    await User.updateOne(
      { _id: employee._id },
      { $set: { 'balances.casual': 4 } },
    );
    await apply();
    const res = await apply({ startDate: '2026-09-10', endDate: '2026-09-11' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('Requested 2');
    expect(res.body.error.message).toContain('available balance is 1');
    expect(
      (
        await apply({
          type: 'sick',
          startDate: '2026-09-10',
          endDate: '2026-09-11',
        })
      ).status,
    ).toBe(201);
  });
  it('previews working days, weekends, holidays, balance, and conflicts without writing', async () => {
    const clean = await request(app)
      .get('/api/leaves/preview?type=casual&start=2026-09-26&end=2026-10-04')
      .set(auth(employee));
    expect(clean.body).toMatchObject({
      workingDays: 4,
      weekendDaysSkipped: 4,
      holidaysSkipped: 1,
      availableBalance: 12,
      balanceAfter: 8,
      conflict: null,
      blockingError: null,
    });
    expect(await LeaveRequest.countDocuments()).toBe(0);
    await apply();
    const conflict = await request(app)
      .get('/api/leaves/preview?type=sick&start=2026-09-07&end=2026-09-08')
      .set(auth(employee));
    expect(conflict.body.conflict.startDate).toBe('2026-09-07');
    expect(conflict.body.blockingError.code).toBe('OVERLAP');
    const insufficient = await request(app)
      .get('/api/leaves/preview?type=casual&start=2026-09-10&end=2026-09-30')
      .set(auth(employee));
    expect(insufficient.body.blockingError.code).toBe('INSUFFICIENT_BALANCE');
    expect(
      (
        await request(app)
          .get('/api/leaves/preview?type=bad&start=bad&end=bad')
          .set(auth(employee))
      ).status,
    ).toBe(400);
  });
  it('isolates employee histories', async () => {
    await apply();
    const res = await request(app).get('/api/leaves/mine').set(auth(colleague));
    expect(res.body.leaves).toEqual([]);
  });
});

describe('manager decisions', () => {
  it('shows only direct reports with current balances and records recent decisions', async () => {
    const own = await apply();
    await apply({}, outsider);
    const pending = await request(app)
      .get('/api/leaves/pending')
      .set(auth(manager));
    expect(pending.body.leaves).toHaveLength(1);
    expect(pending.body.leaves[0].employee.balances.casual).toBe(12);
    const approved = await decision(own.body.leave.id, 'approve', manager, {
      comment: 'Enjoy your time with family.',
    });
    expect(approved.status).toBe(200);
    expect(approved.body.leave).toMatchObject({
      status: 'approved',
      decidedBy: String(manager._id),
      managerComment: 'Enjoy your time with family.',
    });
    expect(await balance()).toBe(9);
    const mine = await request(app).get('/api/leaves/mine').set(auth(employee));
    expect(mine.body.balances.casual).toMatchObject({
      total: 12,
      used: 3,
      pending: 0,
      available: 9,
    });
    const recent = await request(app)
      .get('/api/leaves/decisions')
      .set(auth(manager));
    expect(recent.body.leaves).toHaveLength(1);
  });
  it.each(['approve', 'reject'])(
    'forbids %s on a non-report or own request',
    async (action) => {
      const own = await stored({ employeeId: manager._id });
      const foreign = await apply({}, outsider);
      for (const id of [own._id, foreign.body.leave.id]) {
        expect(
          (
            await decision(id, action, manager, {
              comment: 'Schedule needs adjusting.',
            })
          ).status,
        ).toBe(403);
      }
    },
  );
  it('requires a nonblank rejection comment and releases reservations', async () => {
    const created = await apply();
    for (const body of [{}, { comment: '  ' }])
      expect(
        (await decision(created.body.leave.id, 'reject', manager, body)).status,
      ).toBe(400);
    const res = await decision(created.body.leave.id, 'reject', manager, {
      comment: '  Please arrange cover first.  ',
    });
    expect(res.body.leave.managerComment).toBe('Please arrange cover first.');
    expect(await balance()).toBe(12);
    expect((await apply()).status).toBe(201);
  });
  it.each(['approved', 'rejected', 'cancelled'])(
    'rejects decisions on a %s request',
    async (status) => {
      const leave = await stored({ status });
      expect((await decision(leave._id)).status).toBe(409);
      expect(
        (
          await decision(leave._id, 'reject', manager, {
            comment: 'Not possible.',
          })
        ).status,
      ).toBe(409);
      expect(await balance()).toBe(12);
    },
  );
  it('rechecks overlap at approval and leaves the request pending', async () => {
    const created = await apply();
    await stored({ type: 'sick', status: 'approved' });
    expect((await decision(created.body.leave.id)).body.error.code).toBe(
      'OVERLAP',
    );
    expect((await LeaveRequest.findById(created.body.leave.id)).status).toBe(
      'pending',
    );
    expect(await balance()).toBe(12);
  });
  it('rechecks balance and other reservations at approval', async () => {
    const created = await apply();
    await stored({ startDate: '2026-09-14', endDate: '2026-09-16' });
    await User.updateOne(
      { _id: employee._id },
      { $set: { 'balances.casual': 5 } },
    );
    const res = await decision(created.body.leave.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect((await LeaveRequest.findById(created.body.leave.id)).status).toBe(
      'pending',
    );
    expect(await balance()).toBe(5);
  });
  it('rolls back when the guarded deduction cannot be made', async () => {
    const created = await apply();
    const original = User.findOneAndUpdate.bind(User);
    const spy = vi
      .spyOn(User, 'findOneAndUpdate')
      .mockImplementation((filter, ...args) =>
        filter['balances.casual']
          ? Promise.resolve(null)
          : original(filter, ...args),
      );
    try {
      const res = await decision(created.body.leave.id);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BALANCE_CHANGED');
      expect(res.body.error.message).toContain('still pending');
    } finally {
      spy.mockRestore();
    }
    expect((await LeaveRequest.findById(created.body.leave.id)).status).toBe(
      'pending',
    );
    expect(await balance()).toBe(12);
  });
});

describe('cancellation and concurrent mutations', () => {
  it('cancels a pending request without a refund and forbids another owner', async () => {
    const created = await apply();
    expect((await cancel(created.body.leave.id, colleague)).status).toBe(403);
    expect((await cancel(created.body.leave.id)).body.leave.status).toBe(
      'cancelled',
    );
    expect(await balance()).toBe(12);
    expect((await apply()).status).toBe(201);
  });
  it('refunds future approved leave exactly once', async () => {
    const created = await apply();
    await decision(created.body.leave.id);
    expect(await balance()).toBe(9);
    const results = await Promise.all([
      cancel(created.body.leave.id),
      cancel(created.body.leave.id),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await balance()).toBe(12);
  });
  it.each(['2026-08-31', '2026-09-01'])(
    'does not refund approved leave starting %s',
    async (startDate) => {
      const leave = await stored({
        startDate,
        endDate: startDate,
        workingDays: 1,
        status: 'approved',
      });
      expect((await cancel(leave._id)).status).toBe(409);
      expect(await balance()).toBe(12);
    },
  );
  it.each(['cancelled', 'rejected'])(
    'does not cancel a %s request',
    async (status) => {
      const leave = await stored({ status });
      expect((await cancel(leave._id)).status).toBe(409);
    },
  );
  it('allows pending cancellation even when its start date has passed', async () => {
    const leave = await stored({
      startDate: '2026-08-20',
      endDate: '2026-08-21',
      workingDays: 2,
    });
    expect((await cancel(leave._id)).status).toBe(200);
  });
  it('safely rejects simultaneous duplicate submissions', async () => {
    const results = await Promise.all([apply(), apply()]);
    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await LeaveRequest.countDocuments()).toBe(1);
  });
  it('prevents simultaneous non-overlapping applications from over-reserving', async () => {
    await User.updateOne(
      { _id: employee._id },
      { $set: { 'balances.casual': 3 } },
    );
    const results = await Promise.all([
      apply(),
      apply({ startDate: '2026-09-14', endDate: '2026-09-16' }),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
  });
  it('deducts once when two approval clicks race', async () => {
    const created = await apply();
    const results = await Promise.all([
      decision(created.body.leave.id),
      decision(created.body.leave.id),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(await balance()).toBe(9);
  });
  it('keeps balances nonnegative during two approvals with reduced allowance', async () => {
    const first = await apply();
    const second = await apply({
      startDate: '2026-09-14',
      endDate: '2026-09-16',
    });
    await User.updateOne(
      { _id: employee._id },
      { $set: { 'balances.casual': 3 } },
    );
    const results = await Promise.all([
      decision(first.body.leave.id),
      decision(second.body.leave.id),
    ]);
    expect(results.every((res) => res.status === 409)).toBe(true);
    expect(await balance()).toBe(3);
    expect(await LeaveRequest.countDocuments({ status: 'pending' })).toBe(2);
  });
  it('approves two affordable requests concurrently without losing a deduction', async () => {
    const first = await apply();
    const second = await apply({
      startDate: '2026-09-14',
      endDate: '2026-09-16',
    });
    const results = await Promise.all([
      decision(first.body.leave.id),
      decision(second.body.leave.id),
    ]);
    expect(results.every((res) => res.status === 200)).toBe(true);
    expect(await balance()).toBe(6);
  });
  it('settles competing approve/reject actions to one final decision', async () => {
    const created = await apply();
    const results = await Promise.all([
      decision(created.body.leave.id),
      decision(created.body.leave.id, 'reject', manager, {
        comment: 'Cover unavailable.',
      }),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    const final = await LeaveRequest.findById(created.body.leave.id);
    expect(await balance()).toBe(final.status === 'approved' ? 9 : 12);
  });
  it('settles an approval/cancellation race without leaking balance', async () => {
    const created = await apply();
    const results = await Promise.all([
      decision(created.body.leave.id),
      cancel(created.body.leave.id),
    ]);
    expect(results[1].status).toBe(200);
    expect([200, 409]).toContain(results[0].status);
    expect((await LeaveRequest.findById(created.body.leave.id)).status).toBe(
      'cancelled',
    );
    expect(await balance()).toBe(12);
  });
});
