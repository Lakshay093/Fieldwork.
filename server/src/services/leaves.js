import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import {
  countWorkingDays,
  dateOnly,
  todayUtc,
  utcDate,
} from '../utils/dates.js';
import { AppError } from '../utils/errors.js';

export function serializeLeave(leave) {
  const value = leave.toObject ? leave.toObject() : leave;
  const { _id, __v: _version, ...rest } = value;
  return {
    ...rest,
    id: String(_id),
    employeeId: String(value.employeeId),
    startDate: dateOnly(value.startDate),
    endDate: dateOnly(value.endDate),
  };
}

function validateRange(input, actor, now) {
  if (input.endDate < input.startDate)
    throw new AppError(
      400,
      'INVALID_RANGE',
      'End date must be on or after start date.',
      { endDate: ['Choose an end date on or after the start.'] },
    );
  if (actor.role === 'employee' && input.startDate < todayUtc(now))
    throw new AppError(400, 'PAST_DATE', 'Start date cannot be in the past.', {
      startDate: ['Choose today or a future date.'],
    });
  if (input.startDate.slice(0, 4) !== input.endDate.slice(0, 4))
    throw new AppError(
      400,
      'CROSS_YEAR',
      'Balances are yearly. Please split this request at the calendar year boundary.',
    );
  const days = countWorkingDays(input.startDate, input.endDate);
  if (!days.workingDays)
    throw new AppError(
      400,
      'NO_WORKING_DAYS',
      'This range contains no working days. Choose at least one working day.',
    );
  return days;
}

async function lockEmployee(id, session) {
  const employee = await User.findOneAndUpdate(
    { _id: id },
    { $inc: { leaveRevision: 1 } },
    { returnDocument: 'after', session },
  );
  if (!employee)
    throw new AppError(404, 'NOT_FOUND', 'Employee could not be found.');
  return employee;
}

async function conflictFor(employeeId, startDate, endDate, session, excludeId) {
  return LeaveRequest.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: utcDate(endDate) },
    endDate: { $gte: utcDate(startDate) },
    ...(excludeId && { _id: { $ne: excludeId } }),
  })
    .sort({ startDate: 1 })
    .session(session ?? null);
}

function overlapError(conflict) {
  return new AppError(
    409,
    'OVERLAP',
    `This overlaps the request for ${dateOnly(conflict.startDate)} to ${dateOnly(conflict.endDate)}.`,
  );
}

async function pendingDays(employeeId, type, session, excludeId) {
  const requests = await LeaveRequest.find({
    employeeId,
    type,
    status: 'pending',
    ...(excludeId && { _id: { $ne: excludeId } }),
  })
    .select('workingDays')
    .session(session ?? null);
  return requests.reduce((sum, request) => sum + request.workingDays, 0);
}

function insufficient(requested, available) {
  return new AppError(
    409,
    'INSUFFICIENT_BALANCE',
    `Requested ${requested} working day${requested === 1 ? '' : 's'}; available balance is ${Math.max(0, available)}.`,
  );
}

export async function preview(actor, input, now) {
  const days = validateRange(input, actor, now);
  return mongoose.connection.transaction(async (session) => {
    const employee = await User.findById(actor._id).session(session);
    const reserved = await pendingDays(actor._id, input.type, session);
    const availableBalance = Math.max(
      0,
      employee.balances[input.type] - reserved,
    );
    const conflict = await conflictFor(
      actor._id,
      input.startDate,
      input.endDate,
      session,
    );
    const block = conflict
      ? overlapError(conflict)
      : days.workingDays > availableBalance
        ? insufficient(days.workingDays, availableBalance)
        : null;
    return {
      ...days,
      availableBalance,
      balanceAfter: availableBalance - days.workingDays,
      conflict: conflict
        ? {
            id: String(conflict._id),
            startDate: dateOnly(conflict.startDate),
            endDate: dateOnly(conflict.endDate),
          }
        : null,
      blockingError: block
        ? { code: block.code, message: block.message }
        : null,
    };
  });
}

export async function applyLeave(actor, input, now) {
  const days = validateRange(input, actor, now);
  return mongoose.connection.transaction(async (session) => {
    const employee = await lockEmployee(actor._id, session);
    const conflict = await conflictFor(
      actor._id,
      input.startDate,
      input.endDate,
      session,
    );
    if (conflict) throw overlapError(conflict);
    const available =
      employee.balances[input.type] -
      (await pendingDays(actor._id, input.type, session));
    if (days.workingDays > available)
      throw insufficient(days.workingDays, available);
    const [leave] = await LeaveRequest.create(
      [
        {
          ...input,
          startDate: utcDate(input.startDate),
          endDate: utcDate(input.endDate),
          employeeId: actor._id,
          workingDays: days.workingDays,
        },
      ],
      { session },
    );
    return serializeLeave(leave);
  });
}

function balancesFor(employee, requests) {
  return Object.fromEntries(
    ['casual', 'sick'].map((type) => {
      const used = requests
        .filter((r) => r.type === type && r.status === 'approved')
        .reduce((sum, r) => sum + r.workingDays, 0);
      const pending = requests
        .filter((r) => r.type === type && r.status === 'pending')
        .reduce((sum, r) => sum + r.workingDays, 0);
      const remaining = employee.balances[type];
      return [
        type,
        {
          total: remaining + used,
          used,
          pending,
          remaining,
          available: Math.max(0, remaining - pending),
        },
      ];
    }),
  );
}

export async function mine(actor) {
  return mongoose.connection.transaction(async (session) => {
    const employee = await User.findById(actor._id).session(session);
    const leaves = await LeaveRequest.find({ employeeId: actor._id })
      .sort({ createdAt: -1, _id: -1 })
      .session(session);
    return {
      leaves: leaves.map(serializeLeave),
      balances: balancesFor(employee, leaves),
    };
  });
}

export async function managerList(actor, decided = false) {
  const employees = await User.find({
    managerId: actor._id,
    _id: { $ne: actor._id },
  }).lean();
  const employeesById = new Map(
    employees.map((employee) => [String(employee._id), employee]),
  );
  let query = LeaveRequest.find({
    employeeId: { $in: employees.map((employee) => employee._id) },
    status: decided ? { $in: ['approved', 'rejected'] } : 'pending',
  }).sort(decided ? { decidedAt: -1 } : { createdAt: 1 });
  if (decided) query = query.limit(50);
  const leaves = await query;
  return leaves.map((leave) => {
    const employee = employeesById.get(String(leave.employeeId));
    return {
      ...serializeLeave(leave),
      employee: {
        id: String(employee._id),
        name: employee.name,
        email: employee.email,
        balances: employee.balances,
      },
    };
  });
}

export async function decideLeave(actor, id, status, comment, now) {
  return mongoose.connection.transaction(async (session) => {
    const leave = await LeaveRequest.findById(id).session(session);
    if (!leave)
      throw new AppError(404, 'NOT_FOUND', 'Request could not be found.');
    const employee = await lockEmployee(leave.employeeId, session);
    if (
      String(actor._id) === String(employee._id) ||
      String(employee.managerId) !== String(actor._id)
    )
      throw new AppError(
        403,
        'FORBIDDEN',
        'You can only review requests from your direct reports, and cannot review your own request.',
      );
    if (leave.status !== 'pending')
      throw new AppError(
        409,
        'ALREADY_DECIDED',
        'This request is no longer pending. Refresh to see its current status.',
      );
    if (status === 'approved') {
      const conflict = await conflictFor(
        employee._id,
        dateOnly(leave.startDate),
        dateOnly(leave.endDate),
        session,
        leave._id,
      );
      if (conflict) throw overlapError(conflict);
      const available =
        employee.balances[leave.type] -
        (await pendingDays(employee._id, leave.type, session, leave._id));
      if (leave.workingDays > available)
        throw insufficient(leave.workingDays, available);
      const field = `balances.${leave.type}`;
      const deducted = await User.findOneAndUpdate(
        { _id: employee._id, [field]: { $gte: leave.workingDays } },
        { $inc: { [field]: -leave.workingDays } },
        { session, returnDocument: 'after' },
      );
      if (!deducted)
        throw insufficient(leave.workingDays, employee.balances[leave.type]);
    }
    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status,
          managerComment: comment,
          decidedBy: actor._id,
          decidedAt: now,
        },
      },
      { returnDocument: 'after', session, runValidators: true },
    );
    if (!updated)
      throw new AppError(
        409,
        'ALREADY_DECIDED',
        'This request is no longer pending. Refresh to see its current status.',
      );
    return serializeLeave(updated);
  });
}

export async function cancelLeave(actor, id, now) {
  return mongoose.connection.transaction(async (session) => {
    const employee = await lockEmployee(actor._id, session);
    const leave = await LeaveRequest.findById(id).session(session);
    if (!leave)
      throw new AppError(404, 'NOT_FOUND', 'Request could not be found.');
    if (String(leave.employeeId) !== String(actor._id))
      throw new AppError(
        403,
        'FORBIDDEN',
        'You can only cancel your own requests.',
      );
    if (!['pending', 'approved'].includes(leave.status))
      throw new AppError(
        409,
        'CANNOT_CANCEL',
        'This request has already been closed.',
      );
    if (
      leave.status === 'approved' &&
      dateOnly(leave.startDate) <= todayUtc(now)
    )
      throw new AppError(
        409,
        'CANNOT_CANCEL',
        'Approved leave can only be cancelled before its start date.',
      );
    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: id, status: leave.status },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after', session },
    );
    if (!updated)
      throw new AppError(
        409,
        'CANNOT_CANCEL',
        'This request changed. Refresh to see its current status.',
      );
    if (leave.status === 'approved')
      await User.updateOne(
        { _id: employee._id },
        { $inc: { [`balances.${leave.type}`]: leave.workingDays } },
        { session },
      );
    return serializeLeave(updated);
  });
}
