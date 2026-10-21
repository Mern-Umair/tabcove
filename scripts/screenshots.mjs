// Makes the Chrome Web Store screenshots (1280×800) and promo images from the
// real extension running in Chrome for Testing. Run after `npm run build`:
//   node scripts/screenshots.mjs
// Writes store/screenshots/*.png. Needs the network (it opens real sites so
// the list shows real titles and icons).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const out = join(root, "store", "screenshots");
mkdirSync(out, { recursive: true });
const PORT = 9346;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const base = join(root, ".cache", "chrome");
const chromePath = existsSync(base)
  ? readdirSync(base)
      .map((v) => join(base, v, "chrome-win64", "chrome.exe"))
      .concat(readdirSync(base).map((v) => join(base, v, "chrome-linux64", "chrome")))
      .find((p) => existsSync(p))
  : undefined;
if (!chromePath) {
  console.error("Chrome for Testing not found. Run: npx @puppeteer/browsers install chrome@stable --path .cache");
  process.exit(1);
}

const profile = join(tmpdir(), "tabcove-shots-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--window-size=1280,800",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--load-extension=${dist}`,
    `--disable-extensions-except=${dist}`,
    "--no-first-run",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitFor(fn, attempts = 120, every = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      // not yet
    }
    await sleep(every);
  }
  throw new Error("timed out");
}
const version = await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json());
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener("open", r));
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
async function attach(targetId) {
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
  return sessionId;
}
async function evaluate(sessionId, expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
}
async function shot(sessionId, name) {
  await sleep(600);
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 800, scale: 1 } }, sessionId);
  writeFileSync(join(out, name), Buffer.from(data, "base64"));
  console.log("wrote", name);
}

try {
  const worker = await waitFor(async () => {
    const { targetInfos } = await send("Target.getTargets");
    for (const t of targetInfos.filter((t) => t.type === "service_worker")) {
      try {
        const { sessionId } = await send("Target.attachToTarget", { targetId: t.targetId, flatten: true });
        await send("Runtime.enable", {}, sessionId);
        const r = await send("Runtime.evaluate", { expression: "chrome.runtime.getManifest().short_name", returnByValue: true }, sessionId);
        if (r.result?.value === "Tabcove") return t;
      } catch {
        // skip
      }
    }
    return null;
  });
  const id = new URL(worker.url).host;

  // Close the welcome tab the install opened, then use a fresh manager page as the console.
  const { targetId } = await send("Target.createTarget", { url: `chrome-extension://${id}/manager.html` });
  const page = await attach(targetId);
  await waitFor(() => evaluate(page, "document.querySelector('.sidebar') !== null"));
  await evaluate(page, `chrome.tabs.query({ url: 'chrome-extension://${id}/manager.html#welcome' }).then(t => Promise.all(t.map(x => chrome.tabs.remove(x.id)))).then(() => true)`);

  // Two windows of real pages, like a working day.
  const work = [
    "https://github.com/",
    "https://stackoverflow.com/questions",
    "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
    "https://react.dev/learn",
    "https://www.figma.com/",
    "https://docs.google.com/",
    "https://www.notion.so/",
    "https://vercel.com/docs",
  ];
  const research = [
    "https://en.wikipedia.org/wiki/Tab_(interface)",
    "https://www.youtube.com/",
    "https://arxiv.org/list/cs.AI/recent",
    "https://news.ycombinator.com/",
    "https://www.reddit.com/r/productivity/",
    "https://www.bbc.com/news",
  ];
  await evaluate(page, `(async () => {
    const w = await chrome.windows.getCurrent();
    for (const url of ${JSON.stringify(work)}) await chrome.tabs.create({ windowId: w.id, url, active: false });
    const w2 = await chrome.windows.create({ url: ${JSON.stringify(research[0])}, focused: false });
    for (const url of ${JSON.stringify(research.slice(1))}) await chrome.tabs.create({ windowId: w2.id, url, active: false });
    const first = (await chrome.tabs.query({ windowId: w.id, url: 'https://github.com/*' }))[0];
    if (first) await chrome.tabs.update(first.id, { pinned: true });
    const ids = (await chrome.tabs.query({ windowId: w.id })).filter(t => /mozilla|react.dev|vercel/.test(t.url || '')).map(t => t.id);
    if (ids.length) { const g = await chrome.tabs.group({ tabIds: ids }); await chrome.tabGroups.update(g, { title: 'Docs', color: 'blue' }); }
    return true;
  })()`);
  await sleep(15000); // let titles and icons arrive
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'capture' })");
  await sleep(1500);

  // 1. Open now.
  await evaluate(page, "location.hash = ''; true");
  await waitFor(() => evaluate(page, "document.querySelectorAll('.tab').length >= 10"));
  await shot(page, "1-open-now.png");

  // 2. A saved session with a name.
  const saved = await evaluate(page, "chrome.runtime.sendMessage({ type: 'save', name: 'Client project: redesign' })");
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'save', name: 'Thesis reading' })");
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'save', name: 'Holiday planning' })");
  await evaluate(page, `location.hash = 's/${saved.summary.id}'; true`);
  await waitFor(() => evaluate(page, "document.querySelector('.session-head input.title') !== null"));
  await shot(page, "2-saved-session.png");

  // 3. Search.
  await evaluate(page, "location.hash = 'search/docs'; true");
  await waitFor(() => evaluate(page, "document.querySelectorAll('.tab').length >= 1"));
  await shot(page, "3-search.png");

  // 4. Settings in dark theme.
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'settings', patch: { theme: 'dark' } })");
  await evaluate(page, "location.hash = 'settings'; true");
  await waitFor(() => evaluate(page, "document.querySelector('.settings') !== null"));
  await sleep(300);
  await shot(page, "4-settings-dark.png");
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'settings', patch: { theme: 'system' } })");

  // 5. The popup, rendered at its own size and placed on a frame.
  const { targetId: popupId } = await send("Target.createTarget", { url: `chrome-extension://${id}/popup.html` });
  const popup = await attach(popupId);
  await send("Emulation.setDeviceMetricsOverride", { width: 340, height: 420, deviceScaleFactor: 2, mobile: false }, popup);
  await waitFor(() => evaluate(popup, "document.querySelector('.popup .counts')?.textContent.includes('tab')"));
  await sleep(800);
  const h = await evaluate(popup, "document.querySelector('.popup').getBoundingClientRect().height");
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 340, height: Math.ceil(h), scale: 2 } }, popup);
  const popupPng = Buffer.from(data, "base64");
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
    <rect width="1280" height="800" fill="#0f6e8c"/>
    <text x="80" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">One click to save,</text>
    <text x="80" y="370" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">one to save and close.</text>
    <text x="80" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#dff2f8">Ctrl+Shift+S saves every window.</text>
    <text x="80" y="480" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#dff2f8">Everything stays on your computer.</text>
  </svg>`);
  const popupResized = await sharp(popupPng).resize({ width: 520 }).png().toBuffer();
  const meta = await sharp(popupResized).metadata();
  await sharp(frame)
    .composite([{ input: popupResized, left: 1280 - 520 - 90, top: Math.max(40, Math.round((800 - (meta.height ?? 500)) / 2)) }])
    .png()
    .toFile(join(out, "5-popup.png"));
  console.log("wrote 5-popup.png");

  // Promo tile 440×280 and marquee 1400×560.
  const icon = join(root, "public", "icons", "icon-128.png");
  const tile = (w, hgt, size, x, y, fs1, fs2) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
    <rect width="${w}" height="${hgt}" fill="#0f6e8c"/>
    <text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${fs1}" font-weight="700" fill="#ffffff">Tabcove</text>
    <text x="${x}" y="${y + fs1 * 0.95}" font-family="Segoe UI, Arial, sans-serif" font-size="${fs2}" fill="#dff2f8">Never lose your tabs again</text>
  </svg>`;
  await sharp(Buffer.from(tile(440, 280, 96, 150, 135, 44, 20)))
    .composite([{ input: await sharp(icon).resize(96).toBuffer(), left: 36, top: 92 }])
    .png()
    .toFile(join(out, "promo-tile-440x280.png"));
  await sharp(Buffer.from(tile(1400, 560, 200, 360, 280, 92, 40)))
    .composite([{ input: await sharp(icon).resize(200).toBuffer(), left: 120, top: 180 }])
    .png()
    .toFile(join(out, "marquee-1400x560.png"));
  console.log("wrote promo images");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(800);
  rmSync(profile, { recursive: true, force: true });
}
