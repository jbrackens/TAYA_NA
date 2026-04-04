import { Response, Request, NextFunction } from "express";

export function checkHeadersSent(
  _: Request,
  res: Response,
  next: NextFunction
) {
  if (!res.headersSent) {
    next();
  }
}
