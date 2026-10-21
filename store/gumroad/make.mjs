// Gumroad assets: square thumbnail 600x600, horizontal covers 1280x720, readme for the Content tab.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
const root = join(import.meta.dirname, "..", "..");
const out = import.meta.dirname;
const shots = join(root, "store", "screenshots");

const icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f6e8c"/>
  <rect x="13" y="16" width="38" height="9" rx="2.5" fill="#ffffff" opacity="0.55"/>
  <rect x="13" y="28" width="38" height="9" rx="2.5" fill="#ffffff" opacity="0.8"/>
  <rect x="13" y="40" width="38" height="9" rx="2.5" fill="#ffffff"/>
  <path d="M41 40h10v13l-5-4-5 4z" fill="#ffd166"/>
</svg>`;

// Thumbnail: icon on a soft background with the name under it.
const thumb = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <rect width="600" height="600" fill="#e6f3f7"/>
  <text x="300" y="500" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="56" font-weight="700" fill="#0f6e8c">Tabcove Pro</text>
</svg>`;
await sharp(Buffer.from(thumb))
  .composite([{ input: await sharp(Buffer.from(icon(300))).png().toBuffer(), left: 150, top: 110 }])
  .png().toFile(join(out, "thumbnail-600x600.png"));

// Cover 1: headline + popup composite (already 1280x800) cropped to 1280x720.
await sharp(join(shots, "5-popup.png")).resize(1280, 720, { fit: "cover", position: "centre" }).png().toFile(join(out, "cover-1-1280x720.png"));
// Cover 2 and 3: manager screenshots cropped from the top.
await sharp(join(shots, "1-open-now.png")).resize(1280, 720, { fit: "cover", position: "top" }).png().toFile(join(out, "cover-2-1280x720.png"));
await sharp(join(shots, "2-saved-session.png")).resize(1280, 720, { fit: "cover", position: "top" }).png().toFile(join(out, "cover-3-1280x720.png"));

writeFileSync(join(out, "tabcove-pro-readme.txt"), `Thank you for buying Tabcove Pro.

Your licence key is shown on this page and in your receipt email. It looks like XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX.

To activate:
1. Open Chrome and click the Tabcove icon, then "Open manager" (or press Ctrl+Shift+Y).
2. Click Settings (bottom left).
3. Paste the key into the Pro box and click Activate.

Pro removes the 5-session limit, keeps backups for as long as you choose, and enables import from OneTab and Session Buddy. The key works on every computer where you use Chrome with the same key.

Questions or problems: umairii2207@gmail.com
`);
console.log("done");
