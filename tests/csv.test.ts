import { describe, it, expect } from "vitest";
import { toCSV } from "@/lib/csv";

describe("toCSV", () => {
  it("includes BOM + header + rows", () => {
    const csv = toCSV([{ id: 1, name: "An" }], [
      { key: "id", label: "ID" },
      { key: "name", label: "Tên" },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("ID,Tên");
    expect(csv).toContain("1,An");
  });

  it("escapes commas, quotes, newlines", () => {
    const csv = toCSV([{ v: 'a,b"c\nd' }], [{ key: "v", label: "V" }]);
    // quote-wrapped + doubled inner quotes
    expect(csv).toContain('"a,b""c\nd"');
  });

  // Regression: CSV formula injection — fields starting with = + - @ must be
  // neutralized with a leading apostrophe so Excel/Sheets won't execute them.
  describe("formula injection guard", () => {
    const cases = ["=1+1", "+1", "-1", "@SUM(A1)", "=HYPERLINK(\"http://evil\")"];
    for (const payload of cases) {
      it(`neutralizes ${JSON.stringify(payload)}`, () => {
        const csv = toCSV([{ v: payload }], [{ key: "v", label: "V" }]);
        const dataLine = csv.split("\n")[1];
        // Must start with apostrophe (possibly inside quotes if it also has commas).
        expect(dataLine.replace(/^"/, "").startsWith("'")).toBe(true);
      });
    }

    it("does not alter safe values", () => {
      const csv = toCSV([{ v: "Nguyen Van A" }], [{ key: "v", label: "V" }]);
      expect(csv.split("\n")[1]).toBe("Nguyen Van A");
    });
  });
});
