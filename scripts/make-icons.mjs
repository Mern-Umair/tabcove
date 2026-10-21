// Renders the Tabcove icon (an SVG defined here) to the PNG sizes the
// manifest and the Chrome Web Store need. Run: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const out = join(import.meta.dirname, "..", "public", "icons");
mkdirSync(out, { recursive: true });

// A rounded square in the brand teal with three stacked "tabs" and a small
// bookmark notch: the cove that keeps tabs safe. Simple enough to read at 16 px.
function svg(size, { background = true } = {}) {
  const r = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  ${background ? `<rect width="64" height="64" rx="${(r * 64) / size}" fill="#0f6e8c"/>` : ""}
  <rect x="13" y="16" width="38" height="9" rx="2.5" fill="#ffffff" opacity="0.55"/>
  <rect x="13" y="28" width="38" height="9" rx="2.5" fill="#ffffff" opacity="0.8"/>
  <rect x="13" y="40" width="38" height="9" rx="2.5" fill="#ffffff"/>
  <path d="M41 40h10v13l-5-4-5 4z" fill="#ffd166"/>
</svg>`;
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = await sharp(Buffer.from(svg(size)))
    .resize(size, size)
    .png()
    .toFile(join(out, `icon-${size}.png`));
  console.log(`icon-${size}.png ${png.width}x${png.height}`);
}

// Store assets: 128 px icon is the same file; a 1400x560 marquee and 440x280 tile come later with real screenshots.
writeFileSync(join(out, "icon.svg"), svg(128));
console.log("icon.svg written");
