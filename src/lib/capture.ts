// Turns what Chrome reports about open windows into the saved form. Pure
// functions, so they are unit-tested without a browser.
import { isSavableUrl, type SavedGroup, type SavedTab, type SavedWindow } from "./model.ts";

/** The subset of chrome.windows.Window and chrome.tabs.Tab that capture reads. */
export type LiveTab = {
  url?: string;
  pendingUrl?: string;
  title?: string;
  pinned?: boolean;
  active?: boolean;
  groupId?: number;
  incognito?: boolean;
};
export type LiveWindow = {
  id?: number;
  tabs?: LiveTab[];
  focused?: boolean;
  incognito?: boolean;
  type?: string;
  state?: string;
};
export type LiveGroup = { id: number; windowId: number; title?: string; color: string; collapsed?: boolean };

const NO_GROUP = -1;

export function captureWindows(
  windows: LiveWindow[],
  groups: LiveGroup[] = [],
  options: { ignorePinned?: boolean } = {},
): SavedWindow[] {
  const result: SavedWindow[] = [];
  for (const window of windows) {
    // Only ordinary browser windows; popups, app windows and incognito are skipped.
    if (window.incognito || (window.type && window.type !== "normal")) continue;
    const byChromeGroupId = new Map<number, number>();
    const savedGroups: SavedGroup[] = [];
    const tabs: SavedTab[] = [];
    for (const tab of window.tabs ?? []) {
      const url = tab.url || tab.pendingUrl;
      if (!isSavableUrl(url) || tab.incognito) continue;
      if (options.ignorePinned && tab.pinned) continue;
      const saved: SavedTab = { url, title: cleanTitle(tab.title, url) };
      if (tab.pinned) saved.pinned = true;
      if (tab.active) saved.active = true;
      if (tab.groupId !== undefined && tab.groupId !== NO_GROUP) {
        const live = groups.find((g) => g.id === tab.groupId && (window.id === undefined || g.windowId === window.id));
        if (live) {
          let index = byChromeGroupId.get(live.id);
          if (index === undefined) {
            index = savedGroups.length;
            byChromeGroupId.set(live.id, index);
            savedGroups.push({ title: live.title ?? "", color: live.color, collapsed: live.collapsed || undefined });
          }
          saved.group = index;
        }
      }
      tabs.push(saved);
    }
    if (tabs.length === 0) continue;
    const saved: SavedWindow = { tabs, groups: savedGroups };
    if (window.focused) saved.focused = true;
    if (window.state === "maximized" || window.state === "minimized" || window.state === "fullscreen") {
      saved.state = window.state;
    }
    result.push(saved);
  }
  // Focused window first so a restore brings back the one the user was in.
  result.sort((a, b) => Number(Boolean(b.focused)) - Number(Boolean(a.focused)));
  return result;
}

/** A readable title when the page gave none (still loading, or an error page). */
export function cleanTitle(title: string | undefined, url: string): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed.slice(0, 500);
  try {
    const parsed = new URL(url);
    return parsed.hostname ? parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "") : url;
  } catch {
    return url;
  }
}

/** A short fingerprint of the tab URLs, to skip backups when nothing changed. */
export function fingerprint(windows: SavedWindow[]): string {
  let hash = 0;
  for (const window of windows) {
    for (const tab of window.tabs) {
      const line = `${tab.url}|${tab.pinned ? 1 : 0}|${tab.group ?? ""}\n`;
      for (let i = 0; i < line.length; i++) hash = (hash * 31 + line.charCodeAt(i)) | 0;
    }
    hash = (hash * 31 + 7) | 0;
  }
  return `${windows.length}:${countTabs(windows)}:${(hash >>> 0).toString(36)}`;
}

function countTabs(windows: SavedWindow[]): number {
  return windows.reduce((n, w) => n + w.tabs.length, 0);
}
