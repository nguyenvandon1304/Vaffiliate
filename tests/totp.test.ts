import { describe, it, expect } from "vitest";
import { generateTotpCode, verifyTotpCode } from "@/lib/db";

// Base32 secret (RFC 4648 alphabet) for deterministic testing.
const SECRET = "JBSWY3DPEHPK3PXP";

describe("TOTP", () => {
  it("verifies a freshly generated code", () => {
    const code = generateTotpCode(SECRET, Date.now());
    expect(verifyTotpCode(SECRET, code)).toBe(true);
  });

  it("accepts code from the previous and next 30s step (±1 window)", () => {
    const now = Date.now();
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, now - 30_000))).toBe(true);
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, now + 30_000))).toBe(true);
  });

  // Regression: window was tightened from ±3 to ±1. A code from 2+ steps away
  // must NOT verify anymore.
  it("rejects codes outside the ±1 window (>=2 steps away)", () => {
    const now = Date.now();
    const far = generateTotpCode(SECRET, now - 90_000); // 3 steps ago
    // It's theoretically possible (but extremely unlikely) for two steps to
    // collide on the same 6-digit code; guard against false negative.
    const current = generateTotpCode(SECRET, now);
    if (far !== current) {
      expect(verifyTotpCode(SECRET, far)).toBe(false);
    }
  });

  it("rejects malformed codes", () => {
    expect(verifyTotpCode(SECRET, "")).toBe(false);
    expect(verifyTotpCode(SECRET, "abc")).toBe(false);
    expect(verifyTotpCode(SECRET, "12345")).toBe(false);
    expect(verifyTotpCode(SECRET, "1234567")).toBe(false);
  });

  it("generates 6-digit codes", () => {
    expect(generateTotpCode(SECRET, Date.now())).toMatch(/^\d{6}$/);
  });
});
