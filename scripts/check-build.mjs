// After `vite build`: makes sure dist/ holds everything manifest.json refers to,
// and that no file references the dev server. Fails the build otherwise.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
const problems = [];

const expect = (path) => {
  if (!existsSync(join(dist, path))) problems.push(`missing ${path}`);
};
expect(manifest.background.service_worker);
expect(manifest.action.default_popup);
expect(manifest.options_ui.page.split("#")[0]);
for (const icon of Object.values(manifest.icons)) expect(icon);
for (const icon of Object.values(manifest.action.default_icon)) expect(icon);

// Every html page must load only local files (the store rejects remote code).
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(html|js)$/.test(name)) {
      const text = readFileSync(path, "utf8");
      if (/<script[^>]+src=["']https?:/.test(text)) problems.push(`${name} loads a remote script`);
      if (/localhost:5173/.test(text)) problems.push(`${name} references the dev server`);
    }
  }
}
walk(dist);

// Chrome Web Store limits.
if (manifest.name.length > 75) problems.push(`name is ${manifest.name.length} characters (max 75)`);
if (manifest.description.length > 132)
  problems.push(`description is ${manifest.description.length} characters (max 132)`);
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version))
  problems.push(`version ${manifest.version} is not 1 to 4 dot-separated integers`);

let total = 0;
(function size(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) size(path);
    else total += statSync(path).size;
  }
})(dist);

if (problems.length) {
  console.error("Build check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Build check passed: ${manifest.name} v${manifest.version}, ${(total / 1024).toFixed(0)} KB in dist/`);
