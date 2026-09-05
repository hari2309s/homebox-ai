import { timingSafeEqual } from "node:crypto";

/**
 * Meant for routes invoked by a scheduler (see vercel.json's cron entries),
 * not a user — Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
 * for configured cron routes, which this checks for instead of a user session.
 *
 * Constant-time comparison so a wrong guess can't be distinguished by how
 * long the check took — a plain `===` short-circuits on the first mismatched
 * byte, which in principle leaks the secret's prefix to a timing attacker.
 */
export function isCronRequestAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
