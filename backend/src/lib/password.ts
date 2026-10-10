import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash plaintext password using bcrypt with standard work factor.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plaintext password against hashed password securely.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Normalize an email address for consistent canonical indexing and lookup.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
