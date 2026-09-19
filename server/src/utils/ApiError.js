/** Operational error carrying an HTTP status code. */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) { return new ApiError(400, message, details); }
  static unauthorized(message = 'Authentication required') { return new ApiError(401, message); }
  static forbidden(message = 'You do not have permission to do that') { return new ApiError(403, message); }
  static notFound(message = 'Resource not found') { return new ApiError(404, message); }
  static conflict(message = 'Conflict', details) { return new ApiError(409, message, details); }
  static unprocessable(message = 'Unprocessable', details) { return new ApiError(422, message, details); }
  static tooMany(message = 'Too many requests') { return new ApiError(429, message); }
  static internal(message = 'Something went wrong') { return new ApiError(500, message); }
}
