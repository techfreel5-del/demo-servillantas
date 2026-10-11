import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify HMAC-SHA256 webhook signature.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Create HMAC-SHA256 signature for outgoing payloads.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
