// Reads sessions from files: Tabcove's own export, OneTab's text export, a
// Session Buddy export, or a plain list of URLs (one per line).
import { newId, type SavedTab, type SavedWindow, type Session } from "./model.ts";
import { cleanTitle } from "./capture.ts";
import { isSavableUrl } from "./model.ts";

export type Imported = { sessions: Session[]; format: "tabcove" | "session-buddy" | "onetab" | "urls" };

export function parseImport(text: string, nameForLoose?: string, now = Date.now()): Imported {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The file is empty.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error("The file is not valid JSON.");
    }
    const own = fromTabcove(data, now);
    if (own) return { sessions: own, format: "tabcove" };
    const buddy = fromSessionBuddy(data, now);
    if (buddy) return { sessions: buddy, format: "session-buddy" };
    throw new Error("This JSON is not a Tabcove or Session Buddy export.");
  }
  const oneTab = fromOneTab(trimmed, now, nameForLoose);
  if (oneTab) return { sessions: [oneTab], format: "onetab" };
  const urls = fromUrlList(trimmed, now, nameForLoose);
  if (urls) return { sessions: [urls], format: "urls" };
  throw new Error("No web addresses were found in the file.");
}

function fromTabcove(data: unknown, now: number): Session[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { version?: number; sessions?: unknown };
  if (d.version !== 1 || !Array.isArray(d.sessions)) return null;
  const sessions: Session[] = [];
  for (const raw of d.sessions) {
    const s = raw as Partial<Session>;
    if (!Array.isArray(s.windows)) continue;
    const windows = s.windows.map(cleanWindow).filter((w) => w.tabs.length > 0);
    if (windows.length === 0) continue;
    sessions.push({
      id: newId(),
      kind: "saved",
      name:
        typeof s.name === "string" && s.name.trim() ? s.name.trim() : `Imported ${new Date(now).toLocaleDateString()}`,
      createdAt: typeof s.createdAt === "number" ? s.createdAt : now,
      updatedAt: now,
      windows,
    });
  }
  return sessions;
}

function cleanWindow(raw: unknown): SavedWindow {
  const w = (raw ?? {}) as Partial<SavedWindow>;
  const groups = Array.isArray(w.groups)
    ? w.groups.map((g) => ({
        title: String(g?.title ?? ""),
        color: String(g?.color ?? "grey"),
        collapsed: Boolean(g?.collapsed) || undefined,
      }))
    : [];
  const tabs: SavedTab[] = [];
  for (const raw of Array.isArray(w.tabs) ? w.tabs : []) {
    const t = raw as Partial<SavedTab>;
    if (!isSavableUrl(t.url)) continue;
    const tab: SavedTab = { url: t.url, title: cleanTitle(t.title, t.url) };
    if (t.pinned) tab.pinned = true;
    if (t.active) tab.active = true;
    if (typeof t.group === "number" && groups[t.group]) tab.group = t.group;
    tabs.push(tab);
  }
  return { tabs, groups };
}

/** Session Buddy v3/v4 exports: {"sessions":[{"name","windows":[{"tabs":[{"url","title"}]}]}]} or a bare session list. */
function fromSessionBuddy(data: unknown, now: number): Session[] | null {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { sessions?: unknown }).sessions)
      ? (data as { sessions: unknown[] }).sessions
      : null;
  if (!list) return null;
  const sessions: Session[] = [];
  for (const raw of list) {
    const s = raw as {
      name?: string;
      title?: string;
      windows?: unknown[];
      tabs?: unknown[];
      created?: string | number;
    };
    const windowsRaw = Array.isArray(s.windows) ? s.windows : Array.isArray(s.tabs) ? [{ tabs: s.tabs }] : [];
    const windows = windowsRaw.map(cleanWindow).filter((w) => w.tabs.length > 0);
    if (windows.length === 0) continue;
    const created =
      typeof s.created === "string" ? Date.parse(s.created) : typeof s.created === "number" ? s.created : NaN;
    sessions.push({
      id: newId(),
      kind: "saved",
      name: (s.name ?? s.title ?? "").trim() || `Imported ${new Date(now).toLocaleDateString()}`,
      createdAt: Number.isFinite(created) ? created : now,
      updatedAt: now,
      windows,
    });
  }
  return sessions.length ? sessions : null;
}

/** OneTab export: lines of "url | title", blank lines between groups. */
function fromOneTab(text: string, now: number, name?: string): Session | null {
  if (!/^\S+ \| /m.test(text)) return null;
  const windows: SavedWindow[] = [];
  let tabs: SavedTab[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      if (tabs.length) windows.push({ tabs, groups: [] });
      tabs = [];
      continue;
    }
    const at = line.indexOf(" | ");
    const url = (at >= 0 ? line.slice(0, at) : line).trim();
    const title = at >= 0 ? line.slice(at + 3).trim() : "";
    if (isSavableUrl(url)) tabs.push({ url, title: cleanTitle(title, url) });
  }
  if (tabs.length) windows.push({ tabs, groups: [] });
  if (!windows.length) return null;
  return { id: newId(), kind: "saved", name: name || "Imported from OneTab", createdAt: now, updatedAt: now, windows };
}

function fromUrlList(text: string, now: number, name?: string): Session | null {
  const tabs: SavedTab[] = [];
  for (const raw of text.split(/\s+/)) {
    const url = raw.trim();
    if (isSavableUrl(url)) tabs.push({ url, title: cleanTitle(undefined, url) });
  }
  if (!tabs.length) return null;
  return {
    id: newId(),
    kind: "saved",
    name: name || "Imported links",
    createdAt: now,
    updatedAt: now,
    windows: [{ tabs, groups: [] }],
  };
}
