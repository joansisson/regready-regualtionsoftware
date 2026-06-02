import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number, code?: string): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Zod payload validation: return consistent 400s with field-level details
  if (err instanceof ZodError) {
    const errorResponse: any = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      path: req.url,
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    };

    console.warn(`Validation error ${req.method} ${req.url}`, errorResponse.details);
    res.status(400).json(errorResponse);
    return;
  }

  const appErr = err as AppError;

  // Log error for monitoring
  console.error(`Error ${appErr?.statusCode || 500}: ${appErr?.message}`, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    stack: appErr?.stack,
  });

  // Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const statusCode = appErr?.statusCode || 500;
  const message = appErr?.isOperational ? appErr?.message : 'Internal server error';

  const errorResponse: any = {
    error: message,
    code: appErr?.code,
    timestamp: new Date().toISOString(),
    path: req.url,
  };

  // Include stack trace in development
  if (isDevelopment && appErr?.stack) {
    errorResponse.stack = appErr.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
