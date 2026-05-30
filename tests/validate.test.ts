import { describe, it, expect } from "vitest";
import { isEmail, isUsername, isNonEmptyString, isPositiveInt, pickString } from "@/lib/validate";

describe("validate helpers", () => {
  describe("isEmail", () => {
    it("accepts valid emails", () => {
      expect(isEmail("a@b.com")).toBe(true);
      expect(isEmail("user.name@domain.vn")).toBe(true);
    });
    it("rejects invalid emails", () => {
      expect(isEmail("nope")).toBe(false);
      expect(isEmail("a@b")).toBe(false);
      expect(isEmail("a b@c.com")).toBe(false);
      expect(isEmail(123)).toBe(false);
      expect(isEmail(null)).toBe(false);
    });
  });

  describe("isUsername", () => {
    it("accepts 3-20 alphanumeric/underscore", () => {
      expect(isUsername("abc")).toBe(true);
      expect(isUsername("user_123")).toBe(true);
    });
    it("rejects too short / too long / bad chars", () => {
      expect(isUsername("ab")).toBe(false);
      expect(isUsername("a".repeat(21))).toBe(false);
      expect(isUsername("has space")).toBe(false);
      expect(isUsername("emoji😀")).toBe(false);
    });
  });

  describe("isPositiveInt", () => {
    it("accepts positive integers", () => {
      expect(isPositiveInt(1)).toBe(true);
      expect(isPositiveInt(50000)).toBe(true);
    });
    it("rejects zero, negative, float, NaN, non-number", () => {
      expect(isPositiveInt(0)).toBe(false);
      expect(isPositiveInt(-5)).toBe(false);
      expect(isPositiveInt(1.5)).toBe(false);
      expect(isPositiveInt(NaN)).toBe(false);
      expect(isPositiveInt("100")).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("accepts non-empty within max", () => {
      expect(isNonEmptyString("hello")).toBe(true);
    });
    it("rejects empty / whitespace / over max", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
      expect(isNonEmptyString("x".repeat(201), 200)).toBe(false);
    });
  });

  describe("pickString", () => {
    it("trims and caps length", () => {
      expect(pickString("  hi  ")).toBe("hi");
      expect(pickString("x".repeat(10), 5)).toBe("xxxxx");
    });
    it("returns undefined for non-string / empty", () => {
      expect(pickString(123)).toBeUndefined();
      expect(pickString("   ")).toBeUndefined();
    });
  });
});
