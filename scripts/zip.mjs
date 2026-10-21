// Zips dist/ into tabcove-<version>.zip for upload to the Chrome Web Store.
// Uses the system zip on macOS/Linux and PowerShell on Windows.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "manifest.json"))) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
const target = join(root, `tabcove-${version}.zip`);
rmSync(target, { force: true });

if (process.platform === "win32") {
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${dist}\\*' -DestinationPath '${target}' -Force`,
  ]);
} else {
  execFileSync("zip", ["-r", "-q", target, "."], { cwd: dist });
}
console.log(`Wrote ${target}`);
