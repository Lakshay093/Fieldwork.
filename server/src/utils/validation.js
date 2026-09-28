import { z } from 'zod';
import { isDateOnly } from './dates.js';

const date = z
  .string()
  .refine(isDateOnly, 'Use a valid date in YYYY-MM-DD format.');
export const leaveType = z.enum(['casual', 'sick'], {
  error: 'Choose Casual or Sick leave.',
});
export const leaveInput = z.object({
  type: leaveType,
  startDate: date,
  endDate: date,
  reason: z
    .string()
    .trim()
    .min(5, 'Use at least 5 characters.')
    .max(500, 'Use 500 characters or fewer.'),
});
export const previewInput = z.object({
  type: leaveType,
  start: date,
  end: date,
});
export const idInput = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Use a valid request ID.');
export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password is too long.',
    ),
});
export const decisionInput = z.object({
  comment: z.string().trim().max(500).default(''),
});
export const rejectionInput = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'A comment is required when declining a request.')
    .max(500),
});
