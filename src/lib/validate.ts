import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe comparison of the webhookKey query parameter against the stored secret.
 * Returns true if the key is valid.
 */
export function validateWebhookKey(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
