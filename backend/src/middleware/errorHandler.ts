import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/** Wraps an async route handler so thrown errors reach errorHandler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export class FriendlyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof FriendlyError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return res.status(400).json({
      error: firstIssue ? `Please check "${firstIssue.path.join(".")}" and try again.` : "Please check your details and try again.",
      details: err.issues,
    });
  }
  // Never leak raw database/internal errors to the user.
  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: "Something went wrong on our end. Please try again in a moment.",
  });
}
