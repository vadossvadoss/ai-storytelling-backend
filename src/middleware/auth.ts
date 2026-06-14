import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logError } from "../lib/log-error.js";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    console.error("\n========== AUTH FAILED ==========");
    console.error("reason:  no Bearer token in Authorization header");
    console.error("path:   ", req.method, req.path);
    console.error("header: ", header ?? "(missing)");
    console.error("================================\n");
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET is not configured" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    logError("auth JWT verify failed", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
