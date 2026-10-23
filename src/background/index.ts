// The background service worker: keeps the live snapshot up to date, makes
// timed backups, remembers closed windows, and does the work the pages ask for.
import { captureWindows, fingerprint, type LiveGroup, type LiveWindow } from "@/lib/capture.ts";
import { parseImport } from "@/lib/import.ts";
import { isActive, needsRecheck, PRO_PRICE_LABEL, verifyKey } from "@/lib/license.ts";
import type { Request, Response } from "@/lib/messages.ts";
import {
  countTabs,
  defaultName,
  FREE_BACKUP_WINDOW_MS,
  FREE_SAVED_SESSIONS,
  newId,
  type Session,
  type SessionKind,
} from "@/lib/model.ts";
import { restoreWindows } from "@/lib/restore.ts";
import {
  deleteSessions,
  getIndex,
  getLicense,
  getSession,
  getSettings,
  prune,
  putCurrent,
  putSession,
  renameSession,
  setLicense,
  setSettings,
} from "@/lib/storage.ts";

const BACKUP_ALARM = "backup";
const SNAPSHOT_DELAY_MS = 1200;
const MANAGER_URL = chrome.runtime.getURL("manager.html");

// ---------- live snapshot ----------

let snapshotTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSnapshot() {
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => void snapshot(), SNAPSHOT_DELAY_MS);
}

async function liveWindows(): Promise<Session["windows"]> {
  const settings = await getSettings();
  const windows = (await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] })) as LiveWindow[];
  const groups = (await chrome.tabGroups.query({}).catch(() => [])) as LiveGroup[];
  return captureWindows(windows, groups, { ignorePinned: settings.ignorePinned });
}

async function snapshot(): Promise<Session> {
  const now = Date.now();
  const previous = await getSession("current");
  const session: Session = {
    id: "current",
    kind: "current",
    name: "Open now",
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    windows: await liveWindows(),
  };
  await putCurrent(session);
  return session;
}

// Every change to tabs or windows refreshes the snapshot a moment later.
for (const event of [
  chrome.tabs.onCreated,
  chrome.tabs.onRemoved,
  chrome.tabs.onMoved,
  chrome.tabs.onAttached,
  chrome.tabs.onDetached,
]) {
  (event as chrome.events.Event<(...args: unknown[]) => void>).addListener(scheduleSnapshot);
}
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.url || change.title || change.pinned !== undefined || change.groupId !== undefined) scheduleSnapshot();
});
chrome.tabs.onActivated.addListener(scheduleSnapshot);
chrome.tabGroups?.onUpdated.addListener(scheduleSnapshot);
chrome.windows.onCreated.addListener(scheduleSnapshot);

// A closed window is kept from the last snapshot, so it can be brought back.
chrome.windows.onRemoved.addListener((windowId) => void rememberClosedWindow(windowId));

async function rememberClosedWindow(windowId: number): Promise<void> {
  const current = await getSession("current");
  const stillOpen = (await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] })) as LiveWindow[];
  if (!current) return scheduleSnapshot();
  // The closed window is whichever saved window no longer matches an open one.
  const openPrints = new Set(captureWindows(stillOpen).map((w) => fingerprint([w])));
  const closed = current.windows.find((w) => !openPrints.has(fingerprint([w])));
  if (closed && closed.tabs.length > 0 && !(closed.tabs.length === 1 && closed.tabs[0]?.url === MANAGER_URL)) {
    const now = Date.now();
    await putSession({
      id: newId(),
      kind: "closed",
      name: defaultName(new Date(now), "closed"),
      createdAt: now,
      updatedAt: now,
      windows: [closed],
    });
    await pruneBackups();
  }
  // Ignore the window that is being closed; the event fires before Chrome drops it from getAll.
  void windowId;
  scheduleSnapshot();
}

// ---------- timed backups ----------

async function backup(): Promise<void> {
  const current = await snapshot();
  if (current.windows.length === 0) return;
  const index = await getIndex();
  const last = index.filter((s) => s.kind === "auto").sort((a, b) => b.createdAt - a.createdAt)[0];
  const lastSession = last ? await getSession(last.id) : null;
  if (lastSession && fingerprint(lastSession.windows) === fingerprint(current.windows)) return;
  const now = Date.now();
  await putSession({
    id: newId(),
    kind: "auto",
    name: defaultName(new Date(now), "auto"),
    createdAt: now,
    updatedAt: now,
    windows: current.windows,
  });
  await pruneBackups();
}

async function pruneBackups(): Promise<void> {
  const settings = await getSettings();
  const pro = isActive(await getLicense());
  const notBefore = pro ? 0 : Date.now() - FREE_BACKUP_WINDOW_MS;
  await prune("auto", settings.keepBackups, notBefore);
  await prune("closed", settings.keepBackups, notBefore);
  await prune("previous", 3, 0);
}

async function scheduleBackupAlarm(): Promise<void> {
  const settings = await getSettings();
  await chrome.alarms.create(BACKUP_ALARM, { periodInMinutes: Math.max(5, settings.backupEveryMinutes) });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BACKUP_ALARM) void backup();
});

// ---------- startup: keep what was open before the browser closed ----------

chrome.runtime.onStartup.addListener(() => void onStartup());
chrome.runtime.onInstalled.addListener((details) => void onInstalled(details));

async function onStartup(): Promise<void> {
  const before = await getSession("current");
  if (before && before.windows.length > 0) {
    const now = Date.now();
    await putSession({
      ...before,
      id: newId(),
      kind: "previous",
      name: defaultName(new Date(before.updatedAt), "previous"),
      createdAt: now,
      updatedAt: now,
    });
    await prune("previous", 3, 0);
  }
  await scheduleBackupAlarm();
  scheduleSnapshot();
}

async function onInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  await scheduleBackupAlarm();
  scheduleSnapshot();
  const settings = await getSettings();
  if (!settings.installedAt) await setSettings({ installedAt: Date.now() });
  if (details.reason === "install") await chrome.tabs.create({ url: `${MANAGER_URL}#welcome` });
}

// ---------- keyboard shortcuts ----------

chrome.commands.onCommand.addListener((command) => {
  if (command === "save-session") void saveSession().then(flashBadge);
  if (command === "open-manager") void openManager();
});

async function flashBadge(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: "#15803d" });
  await chrome.action.setBadgeText({ text: "✓" });
  setTimeout(() => void chrome.action.setBadgeText({ text: "" }), 2000);
}

async function openManager(hash = ""): Promise<void> {
  const url = MANAGER_URL + hash;
  const open = await chrome.tabs.query({ url: MANAGER_URL + "*" });
  const tab = open[0];
  if (tab?.id !== undefined) {
    await chrome.tabs.update(tab.id, { active: true, url });
    if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
}

// ---------- the work the pages ask for ----------

async function saveSession(name?: string): Promise<Response> {
  const pro = isActive(await getLicense());
  const index = await getIndex();
  const saved = index.filter((s) => s.kind === "saved").length;
  if (!pro && saved >= FREE_SAVED_SESSIONS) {
    return {
      ok: false,
      limit: true,
      error: `Free keeps ${FREE_SAVED_SESSIONS} saved sessions. Delete one, or get Pro (${PRO_PRICE_LABEL}) for unlimited sessions.`,
    };
  }
  const current = await snapshot();
  if (countTabs(current.windows) === 0) return { ok: false, error: "There are no tabs to save." };
  const now = Date.now();
  const session: Session = {
    id: newId(),
    kind: "saved",
    name: name?.trim() || defaultName(new Date(now)),
    createdAt: now,
    updatedAt: now,
    windows: current.windows,
  };
  const summary = await putSession(session);
  const settings = await getSettings();
  await setSettings({ saveCount: settings.saveCount + 1 });
  return { ok: true, summary, session };
}

async function closeAllButManager(): Promise<void> {
  // Open the manager first so the browser never ends up with zero windows.
  const keep = await chrome.windows.create({ url: MANAGER_URL, focused: true });
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  for (const window of windows) {
    if (window.id !== undefined && window.id !== keep?.id) await chrome.windows.remove(window.id).catch(() => {});
  }
}

async function restore(request: Extract<Request, { type: "restore" }>): Promise<Response> {
  const session = await getSession(request.target.sessionId);
  if (!session) return { ok: false, error: "That session no longer exists." };
  const settings = await getSettings();
  let windows = session.windows;
  if (request.target.windowIndex !== undefined) {
    const window = windows[request.target.windowIndex];
    if (!window) return { ok: false, error: "That window no longer exists." };
    windows = [window];
    if (request.target.tabIndexes) {
      const picked = request.target.tabIndexes
        .map((i) => window.tabs[i])
        .filter((t): t is NonNullable<typeof t> => Boolean(t));
      windows = [{ ...window, tabs: picked }];
    }
  }
  if (countTabs(windows) === 0) return { ok: false, error: "Nothing to open." };
  const into = request.intoCurrentWindow ?? settings.restoreIntoCurrentWindow;
  let intoWindowId: number | undefined;
  if (into) {
    const last = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => undefined);
    intoWindowId = last?.id;
  }
  await restoreWindows(windows, { lazy: settings.lazyRestore, intoWindowId });
  await setSettings({ restoreCount: settings.restoreCount + 1 });
  return { ok: true, restored: countTabs(windows) };
}

async function importText(text: string, name?: string): Promise<Response> {
  const pro = isActive(await getLicense());
  let parsed;
  try {
    parsed = parseImport(text, name);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const index = await getIndex();
  const saved = index.filter((s) => s.kind === "saved").length;
  if (!pro && saved + parsed.sessions.length > FREE_SAVED_SESSIONS) {
    return {
      ok: false,
      limit: true,
      error: `This file holds ${parsed.sessions.length} session(s); the free version keeps ${FREE_SAVED_SESSIONS} saved sessions in total. Upgrade to Pro to import everything.`,
    };
  }
  for (const session of parsed.sessions) await putSession(session);
  return { ok: true, imported: parsed.sessions.length };
}

async function license(key: string | null | undefined): Promise<Response> {
  if (key === null) {
    await setLicense(null);
    return { ok: true, license: null, pro: false };
  }
  if (key === undefined) {
    const stored = await getLicense();
    if (stored && needsRecheck(stored)) {
      const result = await verifyKey(stored.key);
      if (result.ok) await setLicense({ ...stored, email: result.email ?? stored.email, verifiedAt: Date.now() });
      else if (!result.offline) await setLicense(null);
    }
    const now = await getLicense();
    return { ok: true, license: now, pro: isActive(now) };
  }
  const result = await verifyKey(key);
  if (!result.ok) return { ok: false, error: result.reason };
  const stored = { key: key.trim(), email: result.email, verifiedAt: Date.now() };
  await setLicense(stored);
  return { ok: true, license: stored, pro: true };
}

async function removeTabs(id: string, windowIndex: number, tabIndexes: number[]): Promise<Response> {
  const session = await getSession(id);
  const window = session?.windows[windowIndex];
  if (!session || !window) return { ok: false, error: "That session no longer exists." };
  const drop = new Set(tabIndexes);
  window.tabs = window.tabs.filter((_, i) => !drop.has(i));
  session.windows = session.windows.filter((w) => w.tabs.length > 0);
  session.updatedAt = Date.now();
  if (session.windows.length === 0) {
    await deleteSessions([id]);
    return { ok: true };
  }
  return { ok: true, summary: await putSession(session), session };
}

async function duplicate(id: string, name?: string): Promise<Response> {
  const session = await getSession(id);
  if (!session) return { ok: false, error: "That session no longer exists." };
  const pro = isActive(await getLicense());
  const saved = (await getIndex()).filter((s) => s.kind === "saved").length;
  if (!pro && saved >= FREE_SAVED_SESSIONS) {
    return {
      ok: false,
      limit: true,
      error: `The free version keeps ${FREE_SAVED_SESSIONS} saved sessions. Delete one, or upgrade to Pro.`,
    };
  }
  const now = Date.now();
  const copy: Session = {
    ...session,
    id: newId(),
    kind: "saved",
    name: name?.trim() || `${session.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, summary: await putSession(copy), session: copy };
}

async function handle(request: Request): Promise<Response> {
  switch (request.type) {
    case "capture":
      return { ok: true, session: await snapshot() };
    case "save": {
      const result = await saveSession(request.name);
      if (result.ok && request.closeAfter) await closeAllButManager();
      return result;
    }
    case "restore":
      return restore(request);
    case "delete":
      await deleteSessions(request.ids);
      return { ok: true };
    case "rename":
      await renameSession(request.id, request.name.trim() || defaultName(new Date()));
      return { ok: true };
    case "duplicate":
      return duplicate(request.id, request.name);
    case "removeTabs":
      return removeTabs(request.id, request.windowIndex, request.tabIndexes);
    case "import":
      return importText(request.text, request.name);
    case "settings": {
      const settings = request.patch ? await setSettings(request.patch) : await getSettings();
      if (request.patch?.backupEveryMinutes !== undefined) await scheduleBackupAlarm();
      return { ok: true, settings };
    }
    case "license":
      return license(request.key);
    default:
      return { ok: false, error: "Unknown request." };
  }
}

chrome.runtime.onMessage.addListener((message: Request, _sender, sendResponse: (r: Response) => void) => {
  handle(message)
    .catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) }))
    .then(sendResponse);
  return true;
});

// Keep the kinds list in one place for the pages (also documents the storage).
export type { SessionKind };

// First snapshot when the worker wakes.
scheduleSnapshot();
