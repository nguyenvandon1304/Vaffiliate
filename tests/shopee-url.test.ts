import { describe, it, expect } from "vitest";
import { getHost, isShopeeHost, isShopeeShortHost, extractShopeeUrl } from "@/lib/shopee-url";

describe("shopee-url SSRF guards", () => {
  describe("isShopeeHost", () => {
    it("accepts real Shopee hosts", () => {
      expect(isShopeeHost("https://shopee.vn/product-i.123.456")).toBe(true);
      expect(isShopeeHost("https://www.shopee.vn/abc")).toBe(true);
      expect(isShopeeHost("https://s.shopee.vn/xyz")).toBe(true);
      expect(isShopeeHost("https://shope.ee/abc")).toBe(true);
      expect(isShopeeHost("https://shp.ee/abc")).toBe(true);
      // không scheme cũng chấp nhận (helper tự thêm https://)
      expect(isShopeeHost("shopee.vn/product-i.1.2")).toBe(true);
    });

    // Regression SSRF: các URL lừa qua .includes() PHẢI bị từ chối.
    it("rejects SSRF tricks where 'shopee.vn' is in path/query/subdomain", () => {
      expect(isShopeeHost("https://attacker.com/?x=shopee.vn")).toBe(false);
      expect(isShopeeHost("https://attacker.com/shopee.vn")).toBe(false);
      expect(isShopeeHost("https://shopee.vn.attacker.com/")).toBe(false);
      expect(isShopeeHost("http://169.254.169.254/shopee.vn")).toBe(false);
      expect(isShopeeHost("http://localhost/shopee.vn")).toBe(false);
      expect(isShopeeHost("https://evilshopee.vn/")).toBe(false);
    });

    it("rejects garbage / empty", () => {
      expect(isShopeeHost("")).toBe(false);
      expect(isShopeeHost("not a url")).toBe(false);
    });
  });

  describe("isShopeeShortHost", () => {
    it("true only for short-link hosts", () => {
      expect(isShopeeShortHost("https://s.shopee.vn/abc")).toBe(true);
      expect(isShopeeShortHost("https://shope.ee/abc")).toBe(true);
      expect(isShopeeShortHost("https://shp.ee/abc")).toBe(true);
      expect(isShopeeShortHost("https://shopee.vn/product-i.1.2")).toBe(false);
      expect(isShopeeShortHost("https://attacker.com/s.shopee.vn")).toBe(false);
    });
  });

  describe("getHost", () => {
    it("extracts lowercase hostname", () => {
      expect(getHost("https://Shopee.VN/abc")).toBe("shopee.vn");
    });
    it("returns null for invalid", () => {
      expect(getHost("::::")).toBe(null);
    });
  });

  describe("extractShopeeUrl", () => {
    it("returns a clean Shopee URL unchanged", () => {
      expect(extractShopeeUrl("https://s.shopee.vn/3B4i0dsQ3c")).toBe("https://s.shopee.vn/3B4i0dsQ3c");
    });

    it("extracts link from Android share text (link kèm mô tả)", () => {
      const text = "Quạt mini cầm tay siêu mỏng GOOJODOQ https://s.shopee.vn/3B4i0dsQ3c xem ngay nhé!";
      expect(extractShopeeUrl(text)).toBe("https://s.shopee.vn/3B4i0dsQ3c");
    });

    it("strips trailing punctuation", () => {
      expect(extractShopeeUrl("Mua ngay: https://s.shopee.vn/abc.")).toBe("https://s.shopee.vn/abc");
      expect(extractShopeeUrl("(https://shopee.vn/product-i.1.2)")).toBe("https://shopee.vn/product-i.1.2");
    });

    it("handles link without scheme", () => {
      expect(extractShopeeUrl("s.shopee.vn/abc")).toBe("https://s.shopee.vn/abc");
    });

    it("ignores non-Shopee links, picks the Shopee one", () => {
      const text = "xem https://google.com roi vao https://s.shopee.vn/abc nhe";
      expect(extractShopeeUrl(text)).toBe("https://s.shopee.vn/abc");
    });

    it("returns null when no Shopee link present", () => {
      expect(extractShopeeUrl("https://google.com/abc")).toBe(null);
      expect(extractShopeeUrl("không có link")).toBe(null);
      expect(extractShopeeUrl("")).toBe(null);
    });
  });
});
