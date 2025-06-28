import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Always log errors for debugging
  console.error('Unhandled error:', {
    message,
    statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  const response: any = {
    success: false,
    message,
  };

  // Include stack trace and additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.error = error.toString();
    response.requestDetails = {
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    };
  }

  res.status(statusCode).json(response);
};