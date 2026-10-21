import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { send } from "@/lib/messages.ts";
import { FREE_SAVED_SESSIONS, type SessionSummary } from "@/lib/model.ts";
import { PRO_URL } from "@/lib/license.ts";
import { applyTheme, Icon, plural, timeAgo, useIndex, usePro, useSettings } from "@/ui/shared.tsx";
import { SearchView } from "./Search.tsx";
import { SessionView } from "./SessionView.tsx";
import { SettingsView } from "./Settings.tsx";
import { Welcome } from "./Welcome.tsx";

type Route =
  { view: "session"; id: string } | { view: "settings" } | { view: "welcome" } | { view: "search"; q: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (h === "settings") return { view: "settings" };
  if (h === "welcome") return { view: "welcome" };
  if (h.startsWith("search/")) return { view: "search", q: decodeURIComponent(h.slice(7)) };
  if (h.startsWith("s/")) return { view: "session", id: h.slice(2) };
  return { view: "session", id: "current" };
}

export function go(route: Route) {
  const hash =
    route.view === "session"
      ? route.id === "current"
        ? ""
        : `s/${route.id}`
      : route.view === "search"
        ? `search/${encodeURIComponent(route.q)}`
        : route.view;
  location.hash = hash;
}

export type Toast = (text: string, kind?: "ok" | "danger" | "warn") => void;

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  const index = useIndex();
  const [settings, updateSettings] = useSettings();
  const { pro, refresh: refreshPro } = usePro();
  const [toast, setToast] = useState<{ text: string; kind: string } | null>(null);
  const [showAllBackups, setShowAllBackups] = useState(false);
  const [query, setQuery] = useState(route.view === "search" ? route.q : "");
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(location.hash));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.title =
      route.view === "settings" ? "Settings · Tabcove" : route.view === "search" ? `Search · Tabcove` : "Tabcove";
  }, [route]);

  const notify: Toast = (text, kind = "ok") => {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const saved = useMemo(
    () => index.filter((s) => s.kind === "saved").sort((a, b) => b.updatedAt - a.updatedAt),
    [index],
  );
  const backups = useMemo(
    () => index.filter((s) => s.kind !== "saved").sort((a, b) => b.createdAt - a.createdAt),
    [index],
  );
  const shownBackups = showAllBackups ? backups : backups.slice(0, 12);
  const activeId = route.view === "session" ? route.id : null;

  async function saveNow() {
    const response = await send({ type: "save" });
    if (response.ok && response.summary) {
      notify(`Saved “${response.summary.name}”.`);
      go({ view: "session", id: response.summary.id });
    } else if (!response.ok) notify(response.error, response.limit ? "warn" : "danger");
  }

  function submitSearch(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (q) go({ view: "search", q });
    else go({ view: "session", id: "current" });
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/icons/icon-32.png" alt="" />
          Tabcove
          {pro && <span className="badge">Pro</span>}
        </div>

        <form onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="q">
            Search all sessions
          </label>
          <input
            id="q"
            ref={searchRef}
            className="input"
            type="search"
            placeholder="Search all tabs…  ( / )"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
        </form>

        <button className="btn primary block" type="button" onClick={() => void saveNow()} title="Ctrl+Shift+S">
          <Icon name="save" /> Save all windows
        </button>

        <nav className="group" aria-label="Sessions">
          <button
            className={`item ${activeId === "current" ? "active" : ""}`}
            type="button"
            onClick={() => go({ view: "session", id: "current" })}
          >
            <Icon name="open" />
            <span className="name">Open now</span>
          </button>
        </nav>

        <nav className="group" aria-label="Saved sessions">
          <h2>
            <span>Saved sessions</span>
            <span className="small">{pro ? saved.length : `${saved.length}/${FREE_SAVED_SESSIONS}`}</span>
          </h2>
          {saved.length === 0 && (
            <p className="help" style="padding: 2px 8px 6px">
              Nothing saved yet. Press Save above.
            </p>
          )}
          {saved.map((s) => (
            <SidebarItem key={s.id} s={s} active={activeId === s.id} />
          ))}
        </nav>

        <nav className="group" aria-label="Backups">
          <h2>
            <span>Backups and closed windows</span>
            <span className="small">{backups.length}</span>
          </h2>
          {backups.length === 0 && (
            <p className="help" style="padding: 2px 8px 6px">
              Backups appear here automatically.
            </p>
          )}
          {shownBackups.map((s) => (
            <SidebarItem key={s.id} s={s} active={activeId === s.id} />
          ))}
          {backups.length > shownBackups.length && (
            <button className="btn ghost sm" type="button" onClick={() => setShowAllBackups(true)}>
              Show all {backups.length}
            </button>
          )}
        </nav>

        <div className="spacer" />
        <div className="foot">
          {!pro && (
            <a className="btn block" href={PRO_URL} target="_blank" rel="noopener">
              Get Pro · unlimited sessions
            </a>
          )}
          <button
            className={`item ${route.view === "settings" ? "active" : ""}`}
            type="button"
            onClick={() => go({ view: "settings" })}
          >
            <Icon name="settings" />
            <span className="name">Settings</span>
          </button>
        </div>
      </aside>

      <main className="main">
        {route.view === "session" && <SessionView id={route.id} notify={notify} pro={pro} />}
        {route.view === "search" && <SearchView query={route.q} notify={notify} />}
        {route.view === "settings" && settings && (
          <SettingsView settings={settings} update={updateSettings} pro={pro} refreshPro={refreshPro} notify={notify} />
        )}
        {route.view === "welcome" && <Welcome />}
      </main>

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ s, active }: { s: SessionSummary; active: boolean }) {
  const icon = s.kind === "closed" ? "close" : s.kind === "saved" ? "save" : "restore";
  return (
    <button
      className={`item ${active ? "active" : ""}`}
      type="button"
      onClick={() => go({ view: "session", id: s.id })}
      title={`${s.name} · ${timeAgo(s.updatedAt)}`}
    >
      <Icon name={icon} />
      <span className="name">{s.name}</span>
      <span className="count">{plural(s.tabCount, "tab")}</span>
    </button>
  );
}
