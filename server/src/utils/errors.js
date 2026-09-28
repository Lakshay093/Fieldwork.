import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorBody(error) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields && { fields: error.fields }),
    },
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    const fields = {};
    for (const issue of error.issues) {
      const field = issue.path.join('.') || 'body';
      (fields[field] ??= []).push(issue.message);
    }
    error = new AppError(
      400,
      'VALIDATION_ERROR',
      'Check the highlighted fields.',
      fields,
    );
  } else if (error.type === 'entity.parse.failed') {
    error = new AppError(
      400,
      'INVALID_JSON',
      'The request body must be valid JSON.',
    );
  } else if (error.type === 'entity.too.large') {
    error = new AppError(413, 'BODY_TOO_LARGE', 'The request is too large.');
  } else if (!(error instanceof AppError)) {
    console.error('Request failed:', error);
    error = new AppError(
      500,
      'INTERNAL_ERROR',
      'Something went wrong. Please try again.',
    );
  }
  res.status(error.status).json(errorBody(error));
}
