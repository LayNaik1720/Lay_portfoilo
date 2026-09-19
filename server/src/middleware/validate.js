import { ApiError } from '../utils/ApiError.js';

/**
 * Validate req[source] against a zod schema and replace it with the
 * parsed (coerced, stripped) result.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.unprocessable('Validation failed', details));
  }
  if (source === 'query') {
    // req.query is a getter-only property on newer Express versions.
    Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true, configurable: true });
  } else {
    req[source] = result.data;
  }
  return next();
};
