/**
 * Error Handler Middleware
 * ISO 27001 A.12.4 - Logging
 * Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../services/audit';
import { ZodError } from 'zod';

/**
 * Custom application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  auditLogger.getRawLogger().error({
    err,
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  }, 'Request error');

  // Handle different error types
  if (err instanceof ZodError) {
    // Validation error
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    // Application error
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.isOperational && { message: err.message }),
    });
    return;
  }

  // Generic error (don't expose details in production)
  const statusCode = (err as any).statusCode || 500;
  const message = statusCode === 500 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
