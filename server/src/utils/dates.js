import { calendar } from '../config/calendar.js';

const DAY_MS = 86400000;

export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export function utcDate(value) {
  if (!isDateOnly(value))
    throw new RangeError('Use a valid date in YYYY-MM-DD format.');
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function todayUtc(now = new Date()) {
  return dateOnly(now);
}

export function countWorkingDays(start, end, config = calendar) {
  const first = utcDate(start).valueOf();
  const last = utcDate(end).valueOf();
  if (last < first)
    throw new RangeError('End date must be on or after start date.');
  const weekends = new Set(config.weekendDays);
  const holidays = new Set(config.holidays);
  let workingDays = 0;
  let weekendDaysSkipped = 0;
  let holidaysSkipped = 0;
  for (let time = first; time <= last; time += DAY_MS) {
    const date = new Date(time);
    if (weekends.has(date.getUTCDay())) weekendDaysSkipped++;
    else if (holidays.has(dateOnly(date))) holidaysSkipped++;
    else workingDays++;
  }
  return { workingDays, weekendDaysSkipped, holidaysSkipped };
}
