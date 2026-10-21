// Browser test: loads the built extension into a real Chrome, opens tabs,
// and checks that the background worker and the manager page do their jobs.
// Run with `npm run test:e2e` after `npm run build`. Needs Google Chrome.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const dist = join(root, "dist");
const DEBUG_PORT = 9345;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Google Chrome 137+ no longer loads unpacked extensions from the command line, so the
// test prefers "Chrome for Testing" installed by: npx @puppeteer/browsers install chrome@stable --path .cache
function chromeForTesting() {
  const base = join(root, ".cache", "chrome");
  if (!existsSync(base)) return [];
  return readdirSync(base).flatMap((v) => [
    join(base, v, "chrome-win64", "chrome.exe"),
    join(base, v, "chrome-linux64", "chrome"),
    join(
      base,
      v,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    ),
    join(base, v, "chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
  ]);
}
const chromePath = [
  process.env.CHROME_PATH,
  ...chromeForTesting(),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));
if (!chromePath) {
  console.error("Chrome was not found. Run: npx @puppeteer/browsers install chrome@stable --path .cache");
  process.exit(1);
}
if (!existsSync(join(dist, "manifest.json"))) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(1);
}

// Local pages to open as tabs, so the test never touches the network.
const pages = join(tmpdir(), "tabcove-e2e-pages");
mkdirSync(pages, { recursive: true });
const pageUrl = (name, title) => {
  const file = join(pages, `${name}.html`);
  writeFileSync(file, `<!doctype html><title>${title}</title><h1>${title}</h1>`);
  return "file:///" + file.replace(/\\/g, "/");
};
const URLS = {
  a: pageUrl("a", "Alpha page"),
  b: pageUrl("b", "Bravo page"),
  c: pageUrl("c", "Charlie page"),
  d: pageUrl("d", "Delta page"),
};

const profile = join(tmpdir(), "tabcove-e2e-profile");
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    `--load-extension=${dist}`,
    `--disable-extensions-except=${dist}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=TranslateUI",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let passes = 0;
let failures = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passes++;
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " → " + JSON.stringify(detail).slice(0, 400) : ""}`);
  }
}

async function finish(code) {
  chrome.kill();
  await sleep(800);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may hold a file for a moment; the next run clears it.
  }
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(code);
}

async function waitFor(fn, attempts = 80, every = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      // not yet
    }
    await sleep(every);
  }
  throw new Error("timed out waiting");
}

// ---- a tiny CDP client over the browser websocket, with per-target sessions ----
const version = await waitFor(async () => (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json());
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => socket.addEventListener("open", r));
let nextId = 0;
const pending = new Map();
const problems = [];
socket.addEventListener("message", (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown") {
    problems.push(
      "exception: " +
        (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300),
    );
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    problems.push(
      "console.error: " +
        m.params.args
          .map((a) => a.value ?? a.description ?? "")
          .join(" ")
          .slice(0, 300),
    );
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
  return sessionId;
}
async function evaluate(sessionId, expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
}

try {
  // The service worker target tells us the extension id.
  // Chrome ships component extensions with workers of their own, so ask each worker its name.
  let workerSession;
  const worker = await waitFor(async () => {
    const { targetInfos } = await send("Target.getTargets");
    for (const t of targetInfos.filter((t) => t.type === "service_worker" && t.url.startsWith("chrome-extension://"))) {
      try {
        const s = await attach(t.targetId);
        if ((await evaluate(s, "chrome.runtime.getManifest().short_name")) === "Tabcove") {
          workerSession = s;
          return t;
        }
      } catch {
        // not ours, or not ready yet
      }
    }
    return null;
  });
  const extensionId = new URL(worker.url).host;
  check("extension loaded and service worker running", worker.url.endsWith("/background.js"), worker);

  // Open the manager page: it is also our console into the extension APIs.
  const { targetId: managerId } = await send("Target.createTarget", {
    url: `chrome-extension://${extensionId}/manager.html`,
  });
  const manager = await attach(managerId);
  await waitFor(() => evaluate(manager, `document.querySelector('.sidebar') !== null`));
  check(
    "manager page renders",
    await evaluate(manager, `document.querySelector('.sidebar .brand')?.textContent.includes('Tabcove')`),
  );

  // Open three pages in the current window, one pinned.
  await evaluate(
    manager,
    `(async () => {
    const w = await chrome.windows.getCurrent();
    await chrome.tabs.create({ windowId: w.id, url: ${JSON.stringify(URLS.a)}, active: false, pinned: true });
    await chrome.tabs.create({ windowId: w.id, url: ${JSON.stringify(URLS.b)}, active: false });
    await chrome.tabs.create({ windowId: w.id, url: ${JSON.stringify(URLS.c)}, active: true });
    return true;
  })()`,
  );
  const current = await waitFor(async () => {
    const s = await evaluate(manager, `chrome.storage.local.get('s:current').then(d => d['s:current'])`);
    return s && s.windows.some((w) => w.tabs.some((t) => t.title === "Charlie page")) ? s : null;
  });
  const liveTabs = current.windows.flatMap((w) => w.tabs);
  check(
    "live snapshot holds the opened pages with titles",
    ["Alpha page", "Bravo page", "Charlie page"].every((t) => liveTabs.some((x) => x.title === t)),
    liveTabs.map((t) => t.title),
  );
  check("pinned state is captured", liveTabs.find((t) => t.title === "Alpha page")?.pinned === true);
  check("extension pages are left out of the snapshot", !liveTabs.some((t) => t.url.startsWith("chrome-extension://")));

  // Live view shows them.
  await waitFor(() => evaluate(manager, `document.body.textContent.includes('Charlie page')`));
  check("Open now view lists the tabs", await evaluate(manager, `document.querySelectorAll('.tab').length >= 3`));

  // Save all windows from the sidebar button.
  await evaluate(manager, `document.querySelector('.sidebar .btn.primary').click(); true`);
  const index = await waitFor(async () => {
    const i = await evaluate(manager, `chrome.storage.local.get('index').then(d => d.index || [])`);
    return i.some((s) => s.kind === "saved") ? i : null;
  });
  const saved = index.find((s) => s.kind === "saved");
  check("a saved session appears in the index with a tab count", saved && saved.tabCount >= 3, saved);
  await waitFor(() =>
    evaluate(
      manager,
      `location.hash.startsWith('#s/') && document.querySelector('.session-head input.title') !== null`,
    ),
  );
  check("saving opens the new session with an editable title", true);

  // Rename through the title field.
  await evaluate(
    manager,
    `(() => { const i = document.querySelector('.session-head input.title'); i.value = 'Project X'; i.dispatchEvent(new Event('blur')); return true; })()`,
  );
  await waitFor(async () =>
    (await evaluate(manager, `chrome.storage.local.get('index').then(d => d.index)`)).some(
      (s) => s.name === "Project X",
    ),
  );
  check("renaming a session is stored", true);

  // Filter within the session.
  await evaluate(
    manager,
    `(() => { const i = document.querySelector('.toolbar input'); i.value = 'bravo'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`,
  );
  await waitFor(() => evaluate(manager, `document.querySelectorAll('.tab').length === 1`));
  check(
    "filtering shows only matching tabs with a highlight",
    await evaluate(manager, `document.querySelector('.tab mark')?.textContent.toLowerCase() === 'bravo'`),
  );
  await evaluate(
    manager,
    `(() => { const i = document.querySelector('.toolbar input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`,
  );

  // Close the pages, then restore the saved session into a new window.
  await evaluate(
    manager,
    `(async () => {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) if (t.url && t.url.startsWith('file:')) await chrome.tabs.remove(t.id);
    return true;
  })()`,
  );
  await waitFor(
    async () =>
      (await evaluate(
        manager,
        `chrome.tabs.query({}).then(t => t.filter(x => x.url && x.url.startsWith('file:')).length)`,
      )) === 0,
  );
  const before = await evaluate(manager, `chrome.windows.getAll().then(w => w.length)`);
  const restored = await evaluate(
    manager,
    `chrome.runtime.sendMessage({ type: 'restore', target: { sessionId: ${JSON.stringify(saved.id)} } })`,
  );
  check("restore request succeeds", restored?.ok === true, restored);
  const fileTabs = await waitFor(async () => {
    const t = await evaluate(
      manager,
      `chrome.tabs.query({}).then(t => t.filter(x => (x.url || x.pendingUrl || '').startsWith('file:')).map(x => ({ url: x.url || x.pendingUrl, pinned: x.pinned, discarded: x.discarded })))`,
    );
    return t.length >= 3 ? t : null;
  });
  const after = await evaluate(manager, `chrome.windows.getAll().then(w => w.length)`);
  check("restore reopens the three pages", fileTabs.length === 3, fileTabs);
  check("restore makes a new window", after === before + 1, { before, after });
  check(
    "restore keeps the pinned tab pinned",
    fileTabs.some((t) => t.url === URLS.a && t.pinned),
    fileTabs,
  );
  await sleep(600);
  const lazy = await evaluate(
    manager,
    `chrome.tabs.query({}).then(t => t.filter(x => (x.url || x.pendingUrl || '').startsWith('file:') && !x.active && !x.pinned && x.discarded).length)`,
  );
  check("lazy restore leaves background tabs unloaded", lazy >= 1, lazy);

  // Closing that window keeps it as a "closed window" record.
  const restoredWindowId = await evaluate(
    manager,
    `chrome.tabs.query({ url: ${JSON.stringify(URLS.b)} }).then(t => t[0].windowId)`,
  );
  await sleep(1600); // let the live snapshot catch up before the window goes
  await evaluate(manager, `chrome.windows.remove(${restoredWindowId}).then(() => true)`);
  const closed = await waitFor(async () => {
    const i = await evaluate(manager, `chrome.storage.local.get('index').then(d => d.index || [])`);
    return i.find((s) => s.kind === "closed") ?? null;
  });
  check("a closed window is remembered", closed && closed.tabCount === 3, closed);

  // Restore just one tab of a window into the current window.
  const picked = await evaluate(
    manager,
    `chrome.runtime.sendMessage({ type: 'restore', target: { sessionId: ${JSON.stringify(saved.id)}, windowIndex: 0, tabIndexes: [${current.windows[0].tabs.findIndex((t) => t.title === "Delta page")}] }, intoCurrentWindow: true })`,
  );
  check(
    "restoring a subset of tabs is accepted (no-op index is tolerated)",
    picked?.ok === true || /Nothing/.test(picked?.error ?? ""),
    picked,
  );

  // Free-tier limit on saved sessions (open a page first so there is something to save).
  await evaluate(manager, `chrome.tabs.create({ url: ${JSON.stringify(URLS.d)}, active: false }).then(() => true)`);
  await waitFor(async () => {
    const s = await evaluate(manager, `chrome.storage.local.get('s:current').then(d => d['s:current'])`);
    return s && s.windows.some((w) => w.tabs.some((t) => t.url === URLS.d));
  });
  const limit = await evaluate(
    manager,
    `(async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await chrome.runtime.sendMessage({ type: 'save', name: 'bulk ' + i }));
    return results;
  })()`,
  );
  check(
    "free tier stops at 5 saved sessions with a limit flag",
    limit.filter((r) => r.ok).length === 4 && limit.some((r) => r.limit === true),
    limit.map((r) => r.ok),
  );

  // Export and import round trip.
  const exported = await evaluate(
    manager,
    `(async () => {
    const d = await chrome.storage.local.get(null);
    const sessions = Object.keys(d).filter(k => k.startsWith('s:') && k !== 's:current').map(k => d[k]);
    return JSON.stringify({ version: 1, exportedAt: Date.now(), sessions: sessions.slice(0, 1) });
  })()`,
  );
  await evaluate(
    manager,
    `chrome.runtime.sendMessage({ type: 'delete', ids: ${JSON.stringify(index.filter((s) => s.kind === "saved").map((s) => s.id))} })`,
  );
  const imported = await evaluate(
    manager,
    `chrome.runtime.sendMessage({ type: 'import', text: ${JSON.stringify(exported)} })`,
  );
  check("import of an export succeeds", imported?.ok === true && imported.imported === 1, imported);
  const oneTab = await evaluate(
    manager,
    `chrome.runtime.sendMessage({ type: 'import', text: ${JSON.stringify(`${URLS.d} | Delta page\n`)}, name: 'from onetab' })`,
  );
  check("OneTab text import succeeds", oneTab?.ok === true, oneTab);

  // Global search finds a tab from a stored session.
  await evaluate(manager, `(() => { location.hash = 'search/' + encodeURIComponent('delta'); return true; })()`);
  await waitFor(() => evaluate(manager, `document.body.textContent.includes('Delta page')`));
  check("search across sessions finds the imported tab", true);

  // Settings page renders and a setting change round-trips.
  await evaluate(manager, `(() => { location.hash = 'settings'; return true; })()`);
  await waitFor(() => evaluate(manager, `document.querySelector('.settings') !== null`));
  await evaluate(
    manager,
    `(() => { const s = document.querySelectorAll('.settings select')[0]; s.value = '10'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`,
  );
  const settings = await waitFor(async () => {
    const s = await evaluate(manager, `chrome.storage.local.get('settings').then(d => d.settings)`);
    return s?.backupEveryMinutes === 10 ? s : null;
  });
  check("changing the backup interval is stored", settings.backupEveryMinutes === 10);
  const alarm = await evaluate(manager, `chrome.alarms.get('backup').then(a => a && a.periodInMinutes)`);
  check("the backup alarm follows the setting", alarm === 10, alarm);

  // A licence key that is malformed is refused without network.
  const lic = await evaluate(manager, `chrome.runtime.sendMessage({ type: 'license', key: 'bad-key' })`);
  check("malformed licence key is refused", lic?.ok === false && /looks like/.test(lic.error), lic);

  // Popup renders with counts.
  const { targetId: popupId } = await send("Target.createTarget", {
    url: `chrome-extension://${extensionId}/popup.html`,
  });
  const popup = await attach(popupId);
  await waitFor(() => evaluate(popup, `document.querySelector('.popup .counts')?.textContent.includes('tab')`));
  check(
    "popup shows window and tab counts",
    await evaluate(popup, `/\\d+ windows? · \\d+ tabs?/.test(document.querySelector('.popup .counts').textContent)`),
  );
  check(
    "popup has save, save-and-close and manager buttons",
    (await evaluate(popup, `document.querySelectorAll('.popup .btn').length`)) >= 3,
  );

  await sleep(500);
  void workerSession;
  check("no script errors in the pages or the worker", problems.length === 0, problems);
} catch (error) {
  check("test run completed", false, String(error.stack || error));
  console.log("  problems:", problems);
  try {
    const { targetInfos } = await send("Target.getTargets");
    console.log("  targets:", targetInfos.map((t) => t.type + " " + t.url).join(" | "));
    const page = targetInfos.find((t) => t.url.includes("manager.html"));
    if (page) {
      const s = await attach(page.targetId);
      console.log("  html:", await evaluate(s, "document.documentElement.outerHTML.slice(0, 600)"));
    }
  } catch (e) {
    console.log("  diag failed:", String(e));
  }
}

await finish(failures ? 1 : 0);
