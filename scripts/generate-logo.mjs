/**
 * Generate new V-Affiliate logo PNG (192x192) with brand orange/amber palette.
 * No purple/blue — pure V-Affiliate branding.
 *
 * Run: node scripts/generate-logo.mjs
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "seo");

const SIZES = [
  { name: "icon-32", size: 32 },
  { name: "icon-192", size: 192 },
];

function drawVLogo(size) {
  const svg = `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#18181b"/>
        <stop offset="100%" stop-color="#09090b"/>
      </linearGradient>
      <linearGradient id="vGradL" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#fb923c"/>
      </linearGradient>
      <linearGradient id="vGradR" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fb923c"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur">
        <feGaussianBlur stdDeviation="${size * 0.04}"/>
      </filter>
    </defs>

    <!-- Background rounded rect -->
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bgGrad)"/>

    <!-- Glow behind V -->
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.38}" fill="url(#glow)" filter="url(#blur)"/>

    <!-- V Logo — constructed from two thick diagonal strokes -->
    <!-- Left stroke -->
    <line
      x1="${size * 0.22}" y1="${size * 0.20}"
      x2="${size * 0.50}" y2="${size * 0.80}"
      stroke="url(#vGradL)"
      stroke-width="${size * 0.20}"
      stroke-linecap="round"
    />
    <!-- Right stroke -->
    <line
      x1="${size * 0.78}" y1="${size * 0.20}"
      x2="${size * 0.50}" y2="${size * 0.80}"
      stroke="url(#vGradR)"
      stroke-width="${size * 0.20}"
      stroke-linecap="round"
    />

    <!-- Subtle sparkle dots -->
    <circle cx="${size * 0.80}" cy="${size * 0.22}" r="${size * 0.025}" fill="#fb923c" opacity="0.7"/>
    <circle cx="${size * 0.20}" cy="${size * 0.30}" r="${size * 0.018}" fill="#fb923c" opacity="0.5"/>
    <circle cx="${size * 0.84}" cy="${size * 0.70}" r="${size * 0.02}" fill="#fb923c" opacity="0.5"/>
  </svg>`;
  return Buffer.from(svg);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const { name, size } of SIZES) {
  const svgBuf = drawVLogo(size);
  const buf = await sharp(svgBuf).png().toBuffer();
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated: ${filePath} (${size}x${size})`);
}

console.log("Done!");
