import { describe, it, expect } from "vitest";
import { problemResponse, validationError, notFound, unauthorized, conflict, internalError } from "@/lib/errors";

describe("RFC 7807 Error Helpers", () => {
  it("problemResponse creates correct status", async () => {
    const res = problemResponse({ type: "TEST", title: "Test error", status: 418, correlationId: "abc" });
    expect(res.status).toBe(418);
    const body = await res.json();
    expect(body.type).toBe("TEST");
    expect(body.title).toBe("Test error");
    expect(body.status).toBe(418);
    expect(body.correlationId).toBe("abc");
  });

  it("validationError returns 422 with errors array", async () => {
    const res = validationError([{ field: "email", message: "invalid" }], "cor-1");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.type).toBe("VALIDATION_ERROR");
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("email");
  });

  it("notFound returns 404", async () => {
    const res = notFound("Orden");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.title).toContain("Orden");
  });

  it("unauthorized returns 401", async () => {
    const res = unauthorized("Bad token");
    expect(res.status).toBe(401);
  });

  it("conflict returns 409", async () => {
    const res = conflict("Duplicate", "Already exists");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.detail).toBe("Already exists");
  });

  it("internalError returns 500", async () => {
    const res = internalError("x");
    expect(res.status).toBe(500);
  });
});
