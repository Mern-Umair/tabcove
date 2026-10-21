import { useEffect, useMemo, useState } from "preact/hooks";
import { send } from "@/lib/messages.ts";
import type { SavedWindow, Session, SessionKind } from "@/lib/model.ts";
import { download, Favicon, hostOf, Icon, plural, timeAgo, useSession } from "@/ui/shared.tsx";
import { go, type Toast } from "./App.tsx";

const kindLabel: Record<SessionKind, string> = {
  current: "Live view of your open windows",
  auto: "Automatic backup",
  closed: "Closed window",
  previous: "What was open before the browser last closed",
  saved: "Saved session",
};

export function SessionView({ id, notify, pro }: { id: string; notify: Toast; pro: boolean }) {
  const session = useSession(id);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFilter("");
    setSelected(new Set());
  }, [id]);

  if (session === undefined) return <p className="muted">Loading…</p>;
  if (session === null) {
    return (
      <div className="empty">
        <h2>{id === "current" ? "No open tabs to show" : "This session no longer exists"}</h2>
        <p>{id === "current" ? "Open a few tabs and they appear here." : "It may have been deleted or pruned."}</p>
      </div>
    );
  }

  const isCurrent = session.kind === "current";
  const editable = session.kind === "saved";
  const totalTabs = session.windows.reduce((n, w) => n + w.tabs.length, 0);

  async function run(label: string, request: Parameters<typeof send>[0], after?: () => void) {
    setBusy(true);
    const response = await send(request);
    setBusy(false);
    if (response.ok) {
      if (label) notify(label);
      after?.();
    } else notify(response.error, response.limit ? "warn" : "danger");
    return response;
  }

  function restoreAll(intoCurrent?: boolean) {
    void run(`Opening ${plural(totalTabs, "tab")}…`, {
      type: "restore",
      target: { sessionId: id },
      intoCurrentWindow: intoCurrent,
    });
  }
  function restoreWindow(windowIndex: number, intoCurrent?: boolean) {
    void run("Opening window…", {
      type: "restore",
      target: { sessionId: id, windowIndex },
      intoCurrentWindow: intoCurrent,
    });
  }
  function restoreSelected() {
    const byWindow = new Map<number, number[]>();
    for (const key of selected) {
      const [w, t] = key.split(":").map(Number) as [number, number];
      byWindow.set(w, [...(byWindow.get(w) ?? []), t]);
    }
    for (const [windowIndex, tabIndexes] of byWindow) {
      void run("", { type: "restore", target: { sessionId: id, windowIndex, tabIndexes }, intoCurrentWindow: true });
    }
    notify(`Opening ${plural(selected.size, "tab")} in this window…`);
    setSelected(new Set());
  }
  function openTab(url: string) {
    void chrome.tabs.create({ url, active: false });
  }
  async function saveAsSession() {
    if (isCurrent) {
      const response = await run("", { type: "save" });
      if (response.ok && response.summary) {
        notify(`Saved “${response.summary.name}”.`);
        go({ view: "session", id: response.summary.id });
      }
    } else {
      const response = await run("", {
        type: "duplicate",
        id,
        name: session!.name.replace(/^(Backup|Closed window|Previous session) /, ""),
      });
      if (response.ok && response.summary) {
        notify("Kept as a saved session.");
        go({ view: "session", id: response.summary.id });
      }
    }
  }
  function remove() {
    if (!confirm(`Delete “${session!.name}” (${plural(totalTabs, "tab")})? This cannot be undone.`)) return;
    void run("Deleted.", { type: "delete", ids: [id] }, () => go({ view: "session", id: "current" }));
  }
  function removeTabs(windowIndex: number, tabIndexes: number[]) {
    void run("", { type: "removeTabs", id, windowIndex, tabIndexes });
    setSelected(new Set());
  }
  function removeSelected() {
    const byWindow = new Map<number, number[]>();
    for (const key of selected) {
      const [w, t] = key.split(":").map(Number) as [number, number];
      byWindow.set(w, [...(byWindow.get(w) ?? []), t]);
    }
    for (const [w, t] of byWindow) removeTabs(w, t);
    notify(`Removed ${plural(selected.size, "tab")} from the session.`);
  }
  function exportJson() {
    const text = JSON.stringify({ version: 1, exportedAt: Date.now(), sessions: [session] }, null, 2);
    download(`tabcove-${safeName(session!.name)}.json`, text);
  }
  function copyUrls() {
    const text = session!.windows.map((w) => w.tabs.map((t) => `${t.url} | ${t.title}`).join("\n")).join("\n\n");
    void navigator.clipboard.writeText(text).then(() => notify(`Copied ${plural(totalTabs, "link")}.`));
  }
  function rename(name: string) {
    if (name.trim() && name.trim() !== session!.name) void run("Renamed.", { type: "rename", id, name });
  }

  const needle = filter.trim().toLowerCase();
  const shownCount = needle
    ? session.windows.reduce((n, w) => n + w.tabs.filter((t) => matches(t.title, t.url, needle)).length, 0)
    : totalTabs;

  return (
    <div>
      <div className="session-head">
        {editable ? (
          <input
            className="input title"
            defaultValue={session.name}
            maxLength={120}
            aria-label="Session name"
            onBlur={(e) => rename((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <h1>{session.name}</h1>
        )}
        <span className="meta">
          {kindLabel[session.kind]} · {plural(session.windows.length, "window")}, {plural(totalTabs, "tab")} ·{" "}
          {isCurrent ? `updated ${timeAgo(session.updatedAt)}` : timeAgo(session.createdAt)}
        </span>
        <div className="right">
          {!isCurrent && (
            <>
              <button className="btn primary" type="button" disabled={busy} onClick={() => restoreAll()}>
                <Icon name="restore" /> Open all
              </button>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => restoreAll(true)}
                title="Open every tab in the window you are in"
              >
                In this window
              </button>
            </>
          )}
          {!editable && (
            <button className="btn" type="button" disabled={busy} onClick={() => void saveAsSession()}>
              <Icon name="save" /> {isCurrent ? "Save as session" : "Keep as session"}
            </button>
          )}
          <button className="btn" type="button" onClick={exportJson} title="Download this session as a JSON file">
            <Icon name="download" /> Export
          </button>
          <button className="btn" type="button" onClick={copyUrls} title="Copy all links as text">
            <Icon name="copy" /> Copy links
          </button>
          {!isCurrent && (
            <button className="btn danger" type="button" disabled={busy} onClick={remove}>
              <Icon name="trash" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          placeholder={`Filter ${plural(totalTabs, "tab")} in this session…`}
          value={filter}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
          aria-label="Filter tabs"
        />
        {needle && <span className="muted small">{plural(shownCount, "match")}</span>}
        {selected.size > 0 && (
          <>
            <button className="btn sm" type="button" onClick={restoreSelected}>
              <Icon name="open" /> Open {selected.size} selected
            </button>
            {editable && (
              <button className="btn sm danger" type="button" onClick={removeSelected}>
                <Icon name="trash" /> Remove {selected.size}
              </button>
            )}
            <button className="btn sm ghost" type="button" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </>
        )}
      </div>

      {session.windows.map((window, wi) => (
        <WindowCard
          key={wi}
          index={wi}
          window={window}
          needle={needle}
          editable={editable}
          isCurrent={isCurrent}
          selected={selected}
          onToggle={(key, on) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (on) next.add(key);
              else next.delete(key);
              return next;
            })
          }
          onOpenWindow={(into) => restoreWindow(wi, into)}
          onOpenTab={openTab}
          onRemoveTab={(ti) => removeTabs(wi, [ti])}
        />
      ))}
      {!pro && session.kind !== "current" && session.kind !== "saved" && (
        <p className="help">Free keeps backups for 24 hours. Pro keeps them all, so an old session is never lost.</p>
      )}
    </div>
  );
}

function WindowCard(props: {
  index: number;
  window: SavedWindow;
  needle: string;
  editable: boolean;
  isCurrent: boolean;
  selected: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  onOpenWindow: (intoCurrent: boolean) => void;
  onOpenTab: (url: string) => void;
  onRemoveTab: (tabIndex: number) => void;
}) {
  const { window, index, needle } = props;
  const rows = useMemo(
    () =>
      window.tabs.map((tab, ti) => ({ tab, ti })).filter(({ tab }) => !needle || matches(tab.title, tab.url, needle)),
    [window, needle],
  );
  if (rows.length === 0) return null;
  const allKeys = rows.map(({ ti }) => `${index}:${ti}`);
  const allOn = allKeys.every((k) => props.selected.has(k));
  return (
    <section className="window" aria-label={`Window ${index + 1}`}>
      <div className="window-head">
        <input
          type="checkbox"
          checked={allOn}
          aria-label="Select all tabs in this window"
          onChange={(e) => allKeys.forEach((k) => props.onToggle(k, (e.target as HTMLInputElement).checked))}
        />
        Window {index + 1}
        <span className="count">
          {plural(window.tabs.length, "tab")}
          {window.groups.length > 0 && `, ${plural(window.groups.length, "group")}`}
          {window.focused && props.isCurrent && " · focused"}
        </span>
        <div className="right">
          {!props.isCurrent && (
            <>
              <button className="btn sm" type="button" onClick={() => props.onOpenWindow(false)}>
                <Icon name="restore" /> Open window
              </button>
              <button
                className="btn sm ghost"
                type="button"
                onClick={() => props.onOpenWindow(true)}
                title="Open these tabs in the window you are in"
              >
                Here
              </button>
            </>
          )}
        </div>
      </div>
      <ul className="tab-list">
        {rows.map(({ tab, ti }) => {
          const key = `${index}:${ti}`;
          const group = tab.group !== undefined ? window.groups[tab.group] : undefined;
          return (
            <li className="tab" key={key}>
              <input
                type="checkbox"
                checked={props.selected.has(key)}
                aria-label={`Select ${tab.title}`}
                onChange={(e) => props.onToggle(key, (e.target as HTMLInputElement).checked)}
              />
              <Favicon url={tab.url} />
              <div className="text">
                <span
                  className="title"
                  role="link"
                  tabIndex={0}
                  onClick={() => props.onOpenTab(tab.url)}
                  onKeyDown={(e) => e.key === "Enter" && props.onOpenTab(tab.url)}
                  title={tab.url}
                >
                  {highlight(tab.title, needle)}
                </span>
                <span className="url">
                  {group && (
                    <>
                      <i
                        style={`display:inline-block;width:8px;height:8px;border-radius:50%;background:${groupColor(group.color)};margin-right:5px;vertical-align:middle`}
                      />
                      {group.title || "Group"} ·{" "}
                    </>
                  )}
                  {highlight(hostOf(tab.url), needle)}
                </span>
              </div>
              {tab.pinned && (
                <span className="pin" title="Pinned">
                  <Icon name="pin" />
                </span>
              )}
              <span className="tools">
                <button
                  className="btn sm ghost icon"
                  type="button"
                  title="Open in a new tab"
                  onClick={() => props.onOpenTab(tab.url)}
                >
                  <Icon name="open" />
                </button>
                {props.editable && (
                  <button
                    className="btn sm ghost icon danger"
                    type="button"
                    title="Remove from this session"
                    onClick={() => props.onRemoveTab(ti)}
                  >
                    <Icon name="x" />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function matches(title: string, url: string, needle: string): boolean {
  return title.toLowerCase().includes(needle) || url.toLowerCase().includes(needle);
}

export function highlight(text: string, needle: string) {
  if (!needle) return text;
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

const colors: Record<string, string> = {
  grey: "#8a8f98",
  blue: "#3b82f6",
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  pink: "#ec4899",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
};
export function groupColor(color: string): string {
  return colors[color] ?? colors["grey"]!;
}

function safeName(name: string): string {
  return (
    name
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "session"
  );
}

export type { Session };
