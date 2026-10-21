// Small pieces both pages use.
import { useEffect, useState } from "preact/hooks";
import { send } from "@/lib/messages.ts";
import type { Session, SessionSummary, Settings } from "@/lib/model.ts";
import { getIndex, getSession, getSettings } from "@/lib/storage.ts";

export const MANAGER_URL = chrome.runtime.getURL("manager.html");

/** Chrome's favicon cache, which needs the "favicon" permission; never loads the page itself. */
export function faviconUrl(pageUrl: string, size = 16): string {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(size));
  return url.toString();
}

export function Favicon({ url }: { url: string }) {
  return <img className="favicon" src={faviconUrl(url)} alt="" loading="lazy" width={16} height={16} />;
}

export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

export function timeAgo(when: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - when) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(when).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function plural(n: number, word: string): string {
  if (n === 1) return `1 ${word}`;
  return `${n} ${word}${/(ch|sh|s|x|z)$/.test(word) ? "es" : "s"}`;
}

/** The session index, refreshed whenever storage changes. */
export function useIndex(): SessionSummary[] {
  const [index, setIndex] = useState<SessionSummary[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void getIndex().then((i) => alive && setIndex(i));
    load();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes["index"]) load();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);
  return index;
}

/** One session by id ("current" for the live snapshot), kept fresh. */
export function useSession(id: string | null): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    if (!id) {
      setSession(null);
      return;
    }
    let alive = true;
    setSession(undefined);
    const load = () => void getSession(id).then((s) => alive && setSession(s));
    if (id === "current") void send({ type: "capture" }).then(load);
    else load();
    const key = `s:${id}`;
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[key]) load();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, [id]);
  return session;
}

export function useSettings(): [Settings | null, (patch: Partial<Settings>) => Promise<void>] {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  const update = async (patch: Partial<Settings>) => {
    const response = await send({ type: "settings", patch });
    if (response.ok && response.settings) setSettings(response.settings);
  };
  return [settings, update];
}

export function applyTheme(theme: Settings["theme"]) {
  if (theme === "system") delete document.documentElement.dataset["theme"];
  else document.documentElement.dataset["theme"] = theme;
}

export function usePro(): { pro: boolean; refresh: () => Promise<void> } {
  const [pro, setPro] = useState(false);
  const refresh = async () => {
    const response = await send({ type: "license" });
    if (response.ok) setPro(Boolean(response.pro));
  };
  useEffect(() => {
    void refresh();
  }, []);
  return { pro, refresh };
}

export function openManager(hash = "") {
  void chrome.tabs.create({ url: MANAGER_URL + hash });
}

export function download(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Icon({
  name,
}: {
  name:
    | "save"
    | "restore"
    | "close"
    | "search"
    | "trash"
    | "pin"
    | "open"
    | "copy"
    | "x"
    | "check"
    | "plus"
    | "settings"
    | "download"
    | "upload";
}) {
  const paths: Record<typeof name, string> = {
    save: "M4 3h11l5 5v13H4zM8 3v6h7V3M7 21v-7h10v7",
    restore: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
    close: "M6 6l12 12M18 6L6 18",
    search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 17-4.3-4.3",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    pin: "M12 17v5M8 3h8l-1 7 3 3H6l3-3z",
    open: "M14 4h6v6M20 4l-9 9M19 14v6H5V6h6",
    copy: "M9 9h11v11H9zM4 15V4h11",
    x: "M6 6l12 12M18 6L6 18",
    check: "M5 12l5 5L20 7",
    plus: "M12 5v14M5 12h14",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4-2 .5.5 2-1.5 1.5-2-.5-.5 2h-2l-.5-2-2 .5L8.5 15l.5-2L7 12.5v-1l2-.5-.5-2L10 7.5l2 .5.5-2h2l.5 2 2-.5 1.5 1.5-.5 2z",
    download: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4",
    upload: "M12 15V3m0 0 4 4m-4-4-4 4M4 17v4h16v-4",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
