import { describe, expect, it } from 'vitest';
import {
  countWorkingDays,
  dateOnly,
  isDateOnly,
  todayUtc,
  utcDate,
} from '../src/utils/dates.js';

const noHolidays = { weekendDays: [0, 6], holidays: [] };

describe('working-day calendar', () => {
  it.each([
    ['Monday to Friday', '2026-09-07', '2026-09-11', 5, 0],
    ['full weekend', '2026-09-12', '2026-09-13', 0, 2],
    ['two weekends', '2026-09-04', '2026-09-14', 7, 4],
    ['single weekday', '2026-09-08', '2026-09-08', 1, 0],
    ['single weekend day', '2026-09-12', '2026-09-12', 0, 1],
    ['starts on Saturday', '2026-09-12', '2026-09-15', 2, 2],
    ['ends on Sunday', '2026-09-10', '2026-09-13', 2, 2],
    ['leap day', '2028-02-28', '2028-03-01', 3, 0],
  ])('%s', (_label, start, end, workingDays, weekendDaysSkipped) => {
    expect(countWorkingDays(start, end, noHolidays)).toEqual({
      workingDays,
      weekendDaysSkipped,
      holidaysSkipped: 0,
    });
  });
  it('excludes a configured holiday inside the range', () => {
    expect(
      countWorkingDays('2026-09-07', '2026-09-11', {
        ...noHolidays,
        holidays: ['2026-09-09'],
      }),
    ).toEqual({ workingDays: 4, weekendDaysSkipped: 0, holidaysSkipped: 1 });
  });
  it('does not count a weekend holiday twice', () => {
    expect(
      countWorkingDays('2026-09-12', '2026-09-13', {
        ...noHolidays,
        holidays: ['2026-09-12'],
      }).holidaysSkipped,
    ).toBe(0);
  });
  it('supports configurable weekends and the default holiday list', () => {
    expect(
      countWorkingDays('2026-09-11', '2026-09-13', {
        weekendDays: [5, 6],
        holidays: [],
      }).workingDays,
    ).toBe(1);
    expect(countWorkingDays('2026-10-02', '2026-10-02').workingDays).toBe(0);
  });
  it('rejects reversed ranges', () => {
    expect(() => countWorkingDays('2026-09-10', '2026-09-09')).toThrow(
      'End date',
    );
  });
});

describe('date-only values', () => {
  it.each([
    '2026-02-30',
    '2026-2-01',
    '2026-13-01',
    'not a date',
    '2026-09-01T00:00:00Z',
    '',
    null,
  ])('rejects %s', (value) => {
    expect(isDateOnly(value)).toBe(false);
    expect(() => utcDate(value)).toThrow(RangeError);
  });
  it('preserves dates across timezones', () => {
    expect(utcDate('2026-09-10').toISOString()).toBe(
      '2026-09-10T00:00:00.000Z',
    );
    expect(dateOnly(utcDate('2026-09-10'))).toBe('2026-09-10');
    expect(todayUtc(new Date('2026-09-10T23:30:00-07:00'))).toBe('2026-09-11');
  });
});
