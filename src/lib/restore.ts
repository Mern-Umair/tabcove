// Reopens saved windows and tabs. Runs in the background worker.
import type { SavedTab, SavedWindow } from "./model.ts";

export type RestoreOptions = {
  /** Open tabs without loading them; they load when clicked. */
  lazy: boolean;
  /** Put the tabs into this window instead of creating new windows. */
  intoWindowId?: number;
};

const CHUNK = 10;

export async function restoreWindows(windows: SavedWindow[], options: RestoreOptions): Promise<void> {
  for (const [i, window] of windows.entries()) {
    if (options.intoWindowId !== undefined) {
      await restoreInto(options.intoWindowId, window, options.lazy);
    } else {
      await restoreAsNewWindow(window, options.lazy, i === 0);
    }
  }
}

async function restoreAsNewWindow(window: SavedWindow, lazy: boolean, focus: boolean): Promise<void> {
  const [first, ...rest] = window.tabs;
  if (!first) return;
  const created = await chrome.windows.create({
    url: first.url,
    focused: focus,
    state: window.state === "minimized" ? "normal" : window.state,
  });
  const windowId = created?.id;
  if (windowId === undefined) return;
  const firstTab = created?.tabs?.[0];
  const ids: (number | undefined)[] = [firstTab?.id];
  if (firstTab?.id !== undefined && first.pinned) await chrome.tabs.update(firstTab.id, { pinned: true });
  ids.push(...(await createTabs(windowId, rest, lazy)));
  await applyGroups(window, ids);
  const activeAt = window.tabs.findIndex((t) => t.active);
  const activeId = activeAt >= 0 ? ids[activeAt] : undefined;
  if (activeId !== undefined) await chrome.tabs.update(activeId, { active: true }).catch(() => {});
}

async function restoreInto(windowId: number, window: SavedWindow, lazy: boolean): Promise<void> {
  const ids = await createTabs(windowId, window.tabs, lazy);
  await applyGroups(window, ids);
}

/** Creates tabs in order, a few at a time so a 200-tab session does not freeze the browser. */
async function createTabs(windowId: number, tabs: SavedTab[], lazy: boolean): Promise<(number | undefined)[]> {
  const ids: (number | undefined)[] = [];
  for (let start = 0; start < tabs.length; start += CHUNK) {
    const slice = tabs.slice(start, start + CHUNK);
    const created = await Promise.all(
      slice.map((tab) =>
        chrome.tabs
          .create({ windowId, url: tab.url, active: false, pinned: Boolean(tab.pinned) })
          .catch(() => undefined),
      ),
    );
    for (const tab of created) ids.push(tab?.id);
    if (lazy) {
      // Discard right away: Chrome keeps the title and URL, and loads the page when the tab is clicked.
      await Promise.all(created.map((tab) => (tab?.id !== undefined ? discardSoon(tab.id) : Promise.resolve())));
    }
  }
  return ids;
}

async function discardSoon(tabId: number): Promise<void> {
  // A tab can only be discarded once it exists and is not active; a short wait avoids a race on slow machines.
  await new Promise((resolve) => setTimeout(resolve, 150));
  await chrome.tabs.discard(tabId).catch(() => {});
}

async function applyGroups(window: SavedWindow, ids: (number | undefined)[]): Promise<void> {
  if (!window.groups.length || !chrome.tabs.group) return;
  for (const [groupIndex, group] of window.groups.entries()) {
    const tabIds = window.tabs
      .map((tab, i) => (tab.group === groupIndex ? ids[i] : undefined))
      .filter((id): id is number => id !== undefined);
    if (tabIds.length === 0) continue;
    try {
      const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] });
      await chrome.tabGroups.update(groupId, {
        title: group.title,
        color: group.color as chrome.tabGroups.Color,
        collapsed: Boolean(group.collapsed),
      });
    } catch {
      // Grouping is cosmetic; the tabs are already open.
    }
  }
}
