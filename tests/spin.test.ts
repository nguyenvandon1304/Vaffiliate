import { describe, it, expect } from "vitest";
import { SPIN_SEGMENTS } from "@/lib/spin";

describe("SPIN_SEGMENTS config", () => {
  it("has segments with sequential indexes 0..n", () => {
    SPIN_SEGMENTS.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("all weights are positive integers", () => {
    for (const s of SPIN_SEGMENTS) {
      expect(s.weight).toBeGreaterThan(0);
      expect(Number.isInteger(s.weight)).toBe(true);
    }
  });

  it("all reward amounts are non-negative", () => {
    for (const s of SPIN_SEGMENTS) {
      expect(s.amount).toBeGreaterThanOrEqual(0);
    }
  });

  it("every segment has a non-empty label and color", () => {
    for (const s of SPIN_SEGMENTS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.color.length).toBeGreaterThan(0);
    }
  });
});
