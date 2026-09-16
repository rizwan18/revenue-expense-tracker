import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 12;

export interface AuthTokenPayload {
  userId: string;
  householdId: string | null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

/**
 * Password reset tokens are single-use and short-lived. We store only a
 * hash of the token (like a password) so a database leak doesn't expose
 * usable reset links. The raw token is only ever sent to the user, e.g. via
 * a (not-yet-wired-up) email provider — see README "Password reset".
 */
export function generatePasswordResetToken(): { raw: string; hash: string } {
  const raw = cryptoRandomString(40);
  const hash = bcrypt.hashSync(raw, 10);
  return { raw, hash };
}

function cryptoRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
