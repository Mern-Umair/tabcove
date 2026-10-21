import { useEffect, useState } from "preact/hooks";
import type { Session } from "@/lib/model.ts";
import { exportAll, getSession } from "@/lib/storage.ts";
import { Favicon, hostOf, Icon, plural, timeAgo } from "@/ui/shared.tsx";
import { go, type Toast } from "./App.tsx";
import { highlight, matches } from "./SessionView.tsx";

type Hit = { session: Session; url: string; title: string };

export function SearchView({ query, notify }: { query: string; notify: Toast }) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, current] = await Promise.all([exportAll(), getSession("current")]);
      const sessions = current ? [current, ...all.sessions] : all.sessions;
      const found: Hit[] = [];
      for (const session of sessions) {
        for (const window of session.windows) {
          for (const tab of window.tabs) {
            if (matches(tab.title, tab.url, needle)) found.push({ session, url: tab.url, title: tab.title });
          }
        }
      }
      if (alive) setHits(found.slice(0, 500));
    })();
    return () => {
      alive = false;
    };
  }, [needle]);

  if (hits === null) return <p className="muted">Searching…</p>;
  const bySession = new Map<string, Hit[]>();
  for (const hit of hits) bySession.set(hit.session.id, [...(bySession.get(hit.session.id) ?? []), hit]);

  return (
    <div>
      <div className="session-head">
        <h1>“{query}”</h1>
        <span className="meta">
          {plural(hits.length, "match")} in {plural(bySession.size, "session")}
        </span>
      </div>
      {hits.length === 0 && (
        <div className="empty">
          <h2>No tabs match</h2>
          <p>Search looks at titles and addresses in every saved session and backup.</p>
        </div>
      )}
      {[...bySession.values()].map((group) => {
        const session = group[0]!.session;
        return (
          <section className="window" key={session.id}>
            <div className="window-head">
              <button className="btn sm ghost" type="button" onClick={() => go({ view: "session", id: session.id })}>
                {session.name}
              </button>
              <span className="count">
                {session.kind === "current" ? "open now" : timeAgo(session.createdAt)} · {plural(group.length, "match")}
              </span>
            </div>
            <ul className="tab-list">
              {group.map((hit, i) => (
                <li className="tab" key={i}>
                  <Favicon url={hit.url} />
                  <div className="text">
                    <span
                      className="title"
                      role="link"
                      tabIndex={0}
                      onClick={() => open(hit.url, notify)}
                      onKeyDown={(e) => e.key === "Enter" && open(hit.url, notify)}
                      title={hit.url}
                    >
                      {highlight(hit.title, needle)}
                    </span>
                    <span className="url">{highlight(hostOf(hit.url), needle)}</span>
                  </div>
                  <span className="tools">
                    <button
                      className="btn sm ghost icon"
                      type="button"
                      title="Open in a new tab"
                      onClick={() => open(hit.url, notify)}
                    >
                      <Icon name="open" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function open(url: string, notify: Toast) {
  void chrome.tabs.create({ url, active: false }).then(() => notify("Opened in a new tab."));
}
