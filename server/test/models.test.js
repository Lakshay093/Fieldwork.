import { expect, it } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { LeaveRequest } from '../src/models/LeaveRequest.js';

it('normalizes email and rejects negative balances', async () => {
  const user = new User({
    name: 'Aisha Khan',
    email: ' AISHA@EXAMPLE.COM ',
    passwordHash: 'hash',
    role: 'employee',
    balances: { casual: -1, sick: 10 },
  });
  expect(user.email).toBe('aisha@example.com');
  await expect(user.validate()).rejects.toThrow('balances.casual');
});

it('requires date-only UTC values and supports both query indexes', async () => {
  const request = new LeaveRequest({
    employeeId: new mongoose.Types.ObjectId(),
    type: 'casual',
    startDate: '2026-09-10T12:00:00Z',
    endDate: '2026-09-11',
    workingDays: 2,
    reason: 'Family celebration',
  });
  await expect(request.validate()).rejects.toThrow('UTC midnight');
  expect(LeaveRequest.schema.indexes().map(([index]) => index)).toContainEqual({
    employeeId: 1,
    status: 1,
    startDate: 1,
    endDate: 1,
  });
  expect(LeaveRequest.schema.indexes().map(([index]) => index)).toContainEqual({
    status: 1,
    employeeId: 1,
    createdAt: -1,
  });
});
