import { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  userId?: string;
  householdId?: string | null;
}

/**
 * Verifies the bearer token and attaches userId/householdId to the request.
 * Every data-access route MUST scope its Prisma queries by householdId (or
 * userId, where household isn't applicable) — this middleware only proves
 * *who* is asking, not what they're allowed to see.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAuthToken(token);
    // Re-check the user still exists and re-derive householdId fresh from
    // the DB rather than trusting a possibly-stale token claim.
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    req.userId = user.id;
    req.householdId = user.householdId;
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
