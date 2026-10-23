// The data the extension stores. Everything stays in chrome.storage.local on
// the user's computer; nothing here is ever sent anywhere.

export type SavedTab = {
  url: string;
  title: string;
  pinned?: boolean;
  /** Index into the window's `groups` list, when the tab was in a tab group. */
  group?: number;
  /** The tab that was active in its window when captured. */
  active?: boolean;
};

export type SavedGroup = {
  title: string;
  color: chrome.tabGroups.Color | string;
  collapsed?: boolean;
};

export type SavedWindow = {
  tabs: SavedTab[];
  groups: SavedGroup[];
  /** Whether this window had focus when captured; restored first. */
  focused?: boolean;
  state?: "normal" | "minimized" | "maximized" | "fullscreen";
};

/**
 * current:  the live snapshot, rewritten after every change (one per install).
 * auto:     a timed backup of `current`, kept in a rolling list.
 * closed:   a window the user closed, kept so it can be brought back.
 * previous: what was open when the browser last shut down or crashed.
 * saved:    a session the user saved and named.
 */
export type SessionKind = "current" | "auto" | "closed" | "previous" | "saved";

export type Session = {
  id: string;
  kind: SessionKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  windows: SavedWindow[];
};

/** The small record kept for every session so lists render without loading tab data. */
export type SessionSummary = {
  id: string;
  kind: SessionKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  windowCount: number;
  tabCount: number;
};

export type Settings = {
  /** Minutes between automatic backups of the live session. */
  backupEveryMinutes: number;
  /** How many timed backups and closed windows to keep. */
  keepBackups: number;
  /** Restore tabs without loading them until clicked (saves memory and time). */
  lazyRestore: boolean;
  /** Put restored tabs in the current window instead of new windows. */
  restoreIntoCurrentWindow: boolean;
  /** Skip pinned tabs when capturing. */
  ignorePinned: boolean;
  theme: "system" | "light" | "dark";
  /** When the extension was first installed (ms since epoch); 0 if unknown. */
  installedAt: number;
  /** How many sessions the user has saved, for the review ask. */
  saveCount: number;
  /** The one-time review ask was shown and answered. */
  reviewPromptDone: boolean;
  /** How many restores the user has done, for the review ask. */
  restoreCount: number;
  /** When the post-restore Pro nudge was last shown (ms since epoch); 0 = never. */
  nudgeShownAt: number;
};

export const defaultSettings: Settings = {
  backupEveryMinutes: 30,
  keepBackups: 20,
  lazyRestore: true,
  restoreIntoCurrentWindow: false,
  ignorePinned: false,
  theme: "system",
  installedAt: 0,
  saveCount: 0,
  reviewPromptDone: false,
  restoreCount: 0,
  nudgeShownAt: 0,
};

export type License = {
  key: string;
  email?: string;
  verifiedAt: number;
};

/** Limits for the free tier; Pro removes them. */
export const FREE_SAVED_SESSIONS = 5;
/** Free keeps backups from the last day; Pro keeps all of them (up to keepBackups). */
export const FREE_BACKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function summarize(session: Session): SessionSummary {
  return {
    id: session.id,
    kind: session.kind,
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    windowCount: session.windows.length,
    tabCount: countTabs(session.windows),
  };
}

export function countTabs(windows: SavedWindow[]): number {
  return windows.reduce((n, w) => n + w.tabs.length, 0);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Pages that cannot be reopened by an extension, or that are not worth saving. */
export function isSavableUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (url === "about:blank" || url === "chrome://newtab/" || url === "edge://newtab/") return false;
  return /^(https?|file|ftp):/.test(url) || url.startsWith("chrome://") || url.startsWith("edge://");
}

/** A name like "Tue 21 Oct, 14:05" for sessions saved without one. */
export function defaultName(date: Date, kind: SessionKind = "saved"): string {
  const stamp = date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  switch (kind) {
    case "auto":
      return `Backup ${stamp}`;
    case "closed":
      return `Closed window ${stamp}`;
    case "previous":
      return `Previous session ${stamp}`;
    default:
      return stamp;
  }
}
