// Makes the launch demo GIF (store/demo.gif, 960x600) from the real extension
// running in Chrome for Testing. Run after `npm run build`:
//   node scripts/demo-gif.mjs
// Needs the network (real sites give real titles and icons).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const out = join(root, "store");
mkdirSync(out, { recursive: true });
const PORT = 9347;
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

const profile = join(tmpdir(), "tabcove-demo-profile");
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
    ...(process.platform === "linux" ? ["--no-sandbox", "--disable-dev-shm-usage"] : []),
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
async function attach(targetId, width = 1280, height = 800, scale = 1) {
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false }, sessionId);
  return sessionId;
}
async function evaluate(sessionId, expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
}
async function png(sessionId, width, height, scale = 1) {
  await sleep(500);
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale } }, sessionId);
  return Buffer.from(data, "base64");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Frame = manager screenshot, optional popup overlay (top right), caption bar at the bottom. */
async function frame(managerPng, caption, popupPng) {
  const layers = [];
  if (popupPng) {
    const popup = await sharp(popupPng).resize({ width: 400 }).png().toBuffer();
    const meta = await sharp(popup).metadata();
    const shadow = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width + 40}" height="${meta.height + 40}"><rect x="20" y="20" width="${meta.width}" height="${meta.height}" rx="10" fill="#000" opacity="0.35"/></svg>`,
    );
    const shadowLeft = 1280 - meta.width - 24 - 20;
    const shadowPng = await sharp(shadow)
      .blur(12)
      .extract({ left: 0, top: 0, width: Math.min(meta.width + 40, 1280 - shadowLeft), height: Math.min(meta.height + 40, 800 - 2) })
      .png()
      .toBuffer();
    layers.push({ input: shadowPng, left: shadowLeft, top: 2 });
    layers.push({ input: popup, left: 1280 - meta.width - 24, top: 16 });
  }
  const bar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
    <rect x="0" y="716" width="1280" height="84" fill="#0f6e8c"/>
    <text x="640" y="769" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#ffffff">${esc(caption)}</text>
  </svg>`);
  layers.push({ input: bar, left: 0, top: 0 });
  // sharp resizes before it composites, so composite first and resize in a second pass.
  const composed = await sharp(managerPng).composite(layers).png().toBuffer();
  return sharp(composed).resize(960, 600).png().toBuffer();
}

const frames = [];
const delays = [];
const add = async (buf, ms) => {
  frames.push(buf);
  delays.push(ms);
};

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

  const { targetId } = await send("Target.createTarget", { url: `chrome-extension://${id}/manager.html` });
  const page = await attach(targetId);
  await waitFor(() => evaluate(page, "document.querySelector('.sidebar') !== null"));
  await evaluate(page, `chrome.tabs.query({ url: 'chrome-extension://${id}/manager.html#welcome' }).then(t => Promise.all(t.map(x => chrome.tabs.remove(x.id)))).then(() => true)`);

  const work = [
    "https://github.com/",
    "https://developer.chrome.com/docs/extensions",
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
    "https://www.bbc.com/news",
    "https://www.reddit.com/r/productivity/",
  ];
  const w2id = await evaluate(page, `(async () => {
    const w = await chrome.windows.getCurrent();
    for (const url of ${JSON.stringify(work)}) await chrome.tabs.create({ windowId: w.id, url, active: false });
    const w2 = await chrome.windows.create({ url: ${JSON.stringify(research[0])}, focused: false });
    for (const url of ${JSON.stringify(research.slice(1))}) await chrome.tabs.create({ windowId: w2.id, url, active: false });
    const first = (await chrome.tabs.query({ windowId: w.id, url: 'https://github.com/*' }))[0];
    if (first) await chrome.tabs.update(first.id, { pinned: true });
    const ids = (await chrome.tabs.query({ windowId: w.id })).filter(t => /mozilla|react.dev|vercel/.test(t.url || '')).map(t => t.id);
    if (ids.length) { const g = await chrome.tabs.group({ tabIds: ids }); await chrome.tabGroups.update(g, { title: 'Docs', color: 'blue' }); }
    return w2.id;
  })()`);
  await sleep(15000);
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'capture' })");
  await sleep(1500);

  // 1. Open now.
  await evaluate(page, "location.hash = ''; true");
  await waitFor(() => evaluate(page, "document.querySelectorAll('.tab').length >= 10"));
  const openNow = await png(page, 1280, 800);
  await add(await frame(openNow, "14 tabs in 2 windows. One crash and Chrome forgets them."), 2600);

  // 2. Popup, empty then with a name.
  const { targetId: popupId } = await send("Target.createTarget", { url: `chrome-extension://${id}/popup.html` });
  const popup = await attach(popupId, 340, 420, 2);
  await waitFor(() => evaluate(popup, "document.querySelector('.popup .counts')?.textContent.includes('tab')"));
  await sleep(600);
  const h1 = await evaluate(popup, "document.querySelector('.popup').getBoundingClientRect().height");
  await add(await frame(openNow, "Click the Tabcove button...", await png(popup, 340, Math.ceil(h1), 2)), 1800);
  await evaluate(popup, `(() => {
    const el = document.querySelector('.popup input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, 'Client project');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(300);
  await add(await frame(openNow, "...name it, press Save.", await png(popup, 340, Math.ceil(h1), 2)), 2000);

  // 3. Saved.
  const saved = await evaluate(page, "chrome.runtime.sendMessage({ type: 'save', name: 'Client project' })");
  await waitFor(() => evaluate(page, "document.body.textContent.includes('Client project')"));
  await sleep(400);
  await add(await frame(await png(page, 1280, 800), "Saved: every tab, pinned tabs and tab groups included."), 2400);

  // 4. Close a window, it is kept.
  await evaluate(page, `chrome.windows.remove(${w2id}).then(() => true)`);
  await waitFor(() => evaluate(page, "document.body.textContent.includes('Closed window')"), 80, 300);
  await sleep(600);
  await add(await frame(await png(page, 1280, 800), "Closed a window by accident? Tabcove kept it."), 2400);

  // 5. The saved session with the restore buttons.
  await evaluate(page, `location.hash = 's/${saved.summary.id}'; true`);
  await waitFor(() => evaluate(page, "document.querySelector('.session-head input.title') !== null"));
  await sleep(400);
  await add(await frame(await png(page, 1280, 800), "Open all, one window, or just the tabs you tick."), 2400);

  // 6. Restore, then show the live view again.
  await evaluate(page, `chrome.runtime.sendMessage({ type: 'restore', target: { sessionId: '${saved.summary.id}' } })`);
  await sleep(2500);
  await evaluate(page, "chrome.runtime.sendMessage({ type: 'capture' })");
  await evaluate(page, "location.hash = ''; true");
  await waitFor(
    () => evaluate(page, "!document.body.textContent.includes('Loading') && document.querySelectorAll('.tab').length >= 14"),
    100,
    300,
  );
  await sleep(800);
  await add(await frame(await png(page, 1280, 800), "Back in a second. Tabs load only when you click them."), 2600);

  // 7. Closing card.
  const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
    <rect width="1280" height="800" fill="#0f6e8c"/>
    <text x="640" y="330" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">Tabcove</text>
    <text x="640" y="410" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#dff2f8">Automatic backups. Nothing leaves your computer.</text>
    <text x="640" y="480" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#ffd166">Free: 5 sessions, 24h backups.  Pro: $9.99 once.</text>
  </svg>`);
  const icon = await sharp(join(root, "public", "icons", "icon-128.png")).resize(120).png().toBuffer();
  const closing = await sharp(card).composite([{ input: icon, left: 580, top: 160 }]).png().toBuffer();
  await add(await sharp(closing).resize(960, 600).png().toBuffer(), 3200);

  const gif = await sharp(frames, { join: { animated: true } })
    .gif({ delay: delays, loop: 0, colours: 128, effort: 7 })
    .toFile(join(out, "demo.gif"));
  console.log(`wrote store/demo.gif (${frames.length} frames, ${Math.round(gif.size / 1024)} KB)`);
  // A still of the first frame for places that take an image, not a GIF.
  await sharp(frames[0]).png().toFile(join(out, "demo-still.png"));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(1500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may still hold a file; the next run clears it.
  }
}
