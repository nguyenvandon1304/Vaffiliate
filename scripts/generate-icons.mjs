/**
 * Generate PWA + favicon icons từ public/seo/icon.svg.
 * Output:
 *   - public/seo/icon-192.png
 *   - public/seo/icon-512.png
 *   - public/seo/apple-touch-icon.png  (180x180)
 *   - public/seo/icon-32.png  (favicon)
 *   - public/seo/icon-16.png  (favicon)
 *   - public/favicon.ico (multi-size ico, replace nếu có)
 *
 * Chạy: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SVG = path.join(ROOT, "public/seo/icon.svg");
const OUT_DIR = path.join(ROOT, "public/seo");

if (!fs.existsSync(SVG)) {
  console.error(`❌ Missing source SVG: ${SVG}`);
  process.exit(1);
}

const sizes = [
  { size: 16,  out: "icon-16.png" },
  { size: 32,  out: "icon-32.png" },
  { size: 180, out: "apple-touch-icon.png" }, // iOS Home Screen
  { size: 192, out: "icon-192.png" },          // PWA Android
  { size: 512, out: "icon-512.png" },          // PWA splash
];

const svgBuffer = fs.readFileSync(SVG);

for (const { size, out } of sizes) {
  const outPath = path.join(OUT_DIR, out);
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`✅ ${out} (${size}×${size}, ${(stat.size / 1024).toFixed(1)}KB)`);
}

// Favicon.ico multi-size (16, 32, 48)
// Sharp không hỗ trợ ICO trực tiếp — dùng PNG 32 làm favicon thay
// (tương thích đa số browser hiện đại)
const faviconPath = path.join(ROOT, "public/favicon.ico");
await sharp(svgBuffer).resize(32, 32).png().toFile(faviconPath);
console.log(`✅ favicon.ico (PNG fallback, 32×32)`);

console.log("\n🎉 Done.");
