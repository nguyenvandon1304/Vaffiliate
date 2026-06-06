import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, '../public/seo/icon.svg');
const outDir = path.join(__dirname, '../public/seo');

// Generate PNGs at multiple sizes
const sizes = [32, 192, 512];

(async () => {
  const svgBuffer = await sharp(svgPath).toBuffer();

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(outPath);
    console.log(`✓ Generated ${outPath} (${size}x${size})`);
  }

  // Also generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 90 })
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png (180x180)');
})();
