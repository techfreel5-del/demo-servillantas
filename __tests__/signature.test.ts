import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, signPayload } from "@/lib/payments/signature";

describe("Webhook Signature", () => {
  const secret = "whsec_test_secret_123";
  const payload = '{"event":"payment.approved","orderId":"abc123"}';

  it("signs and verifies a payload correctly", () => {
    const signature = signPayload(payload, secret);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("rejects tampered payload", () => {
    const signature = signPayload(payload, secret);
    const tampered = payload.replace("approved", "rejected");
    expect(verifyWebhookSignature(tampered, signature, secret)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const signature = signPayload(payload, secret);
    expect(verifyWebhookSignature(payload, signature, "wrong_secret")).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
  });

  it("rejects signature with wrong length", () => {
    expect(verifyWebhookSignature(payload, "abc", secret)).toBe(false);
  });
});
