import { describe, it, expect } from "vitest";
import { getHost, isShopeeHost, isShopeeShortHost } from "@/lib/shopee-url";

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
});
