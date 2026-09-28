import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { applyLeave, decideLeave } from './leaves.js';
import {
  countWorkingDays,
  dateOnly,
  utcDate,
  todayUtc,
} from '../utils/dates.js';

const people = [
  ['Meera Kapoor', 'meera.kapoor@fieldwork.example', 'manager'],
  ['Aisha Khan', 'aisha.khan@fieldwork.example', 'employee'],
  ['Rohan Mehta', 'rohan.mehta@fieldwork.example', 'employee'],
  ['Sofia Fernandes', 'sofia.fernandes@fieldwork.example', 'employee'],
  ['Arjun Nair', 'arjun.nair@fieldwork.example', 'employee'],
];

function workingDates(now) {
  const start = utcDate(todayUtc(now));
  const year = start.getUTCFullYear();
  const days = [];
  for (let offset = 1; days.length < 24; offset++) {
    const day = new Date(start.valueOf() + offset * 86400000);
    if (day.getUTCFullYear() !== year) break;
    const value = dateOnly(day);
    if (countWorkingDays(value, value).workingDays) days.push(value);
  }
  return days;
}

export async function seedDemo(password, now = new Date()) {
  if (
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    throw new Error(
      'SEED_PASSWORD must be 12–72 bytes and at least 12 characters.',
    );
  const passwordHash = await bcrypt.hash(password, 12);
  const users = [];
  const newEmployees = new Set();
  for (const [name, email, role] of people) {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        role,
        passwordHash,
        managerId: role === 'employee' ? users[0]._id : null,
        balances: { casual: 12, sick: 10 },
      });
      if (role === 'employee') newEmployees.add(String(user._id));
    }
    users.push(user);
  }

  const days = workingDates(now);
  if (days.length >= 16) {
    const samples = [
      {
        index: 1,
        type: 'casual',
        first: 0,
        last: 1,
        reason: 'A long weekend with my family in Jaipur.',
        status: 'approved',
        comment: 'All covered. Enjoy your time away.',
      },
      {
        index: 1,
        type: 'casual',
        first: 8,
        last: 10,
        reason: 'Travelling home for a family wedding.',
      },
      {
        index: 2,
        type: 'sick',
        first: 2,
        last: 3,
        reason: 'Scheduled treatment and recovery time.',
      },
      {
        index: 3,
        type: 'casual',
        first: 5,
        last: 8,
        reason: 'A short break in the hills with family.',
      },
      {
        index: 4,
        type: 'casual',
        first: 12,
        last: 15,
        reason: 'Taking a few days off for a house move.',
        status: 'rejected',
        comment: 'Please move this after the release, once cover is arranged.',
      },
    ];
    for (const sample of samples) {
      const user = users[sample.index];
      if (!newEmployees.has(String(user._id))) continue;
      const leave = await applyLeave(
        user,
        {
          type: sample.type,
          startDate: days[sample.first],
          endDate: days[sample.last],
          reason: sample.reason,
        },
        now,
      );
      if (sample.status)
        await decideLeave(
          users[0],
          leave.id,
          sample.status,
          sample.comment,
          now,
        );
    }
  }
  return {
    users: users.map(({ _id, email, role }) => ({
      id: String(_id),
      email,
      role,
    })),
    requests: await LeaveRequest.countDocuments({
      employeeId: { $in: users.map((user) => user._id) },
    }),
  };
}
