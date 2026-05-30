import { describe, it, expect } from "vitest";
import { calcCashback } from "@/lib/db";

describe("calcCashback", () => {
  it("computes rounded percentage of commission", () => {
    expect(calcCashback(10000, 50)).toBe(5000);
    expect(calcCashback(10000, 53)).toBe(5300);
    expect(calcCashback(10000, 58)).toBe(5800);
  });

  it("rounds to nearest integer", () => {
    expect(calcCashback(333, 50)).toBe(167); // 166.5 -> 167
  });

  // Money-safety: invalid / non-positive commission must yield 0, never NaN or negative.
  it("returns 0 for invalid or non-positive commission", () => {
    expect(calcCashback(0, 50)).toBe(0);
    expect(calcCashback(-100, 50)).toBe(0);
    expect(calcCashback(NaN, 50)).toBe(0);
    expect(calcCashback(Infinity, 50)).toBe(0);
  });

  it("never returns NaN for any finite rate", () => {
    for (const rate of [50, 53, 55, 58]) {
      const v = calcCashback(12345, rate);
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});
