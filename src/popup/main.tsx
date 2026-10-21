import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { send } from "@/lib/messages.ts";
import { FREE_SAVED_SESSIONS } from "@/lib/model.ts";
import { PRO_URL } from "@/lib/license.ts";
import {
  applyTheme,
  Icon,
  openManager,
  plural,
  timeAgo,
  useIndex,
  usePro,
  useSession,
  useSettings,
} from "@/ui/shared.tsx";

function Popup() {
  const current = useSession("current");
  const index = useIndex();
  const [settings] = useSettings();
  const { pro } = usePro();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "danger" | "warn" } | null>(null);

  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings]);

  const windows = current?.windows.length ?? 0;
  const tabs = current?.windows.reduce((n, w) => n + w.tabs.length, 0) ?? 0;
  const saved = index.filter((s) => s.kind === "saved");
  const recent = index
    .filter((s) => s.kind !== "saved")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  async function save(closeAfter: boolean) {
    setBusy(true);
    const response = await send({ type: "save", name, closeAfter });
    setBusy(false);
    if (response.ok) {
      setName("");
      setMessage({ text: closeAfter ? "Saved. Closing windows…" : `Saved “${response.summary?.name}”.`, kind: "ok" });
      if (closeAfter) setTimeout(() => window.close(), 400);
    } else {
      setMessage({ text: response.error, kind: response.limit ? "warn" : "danger" });
    }
  }

  async function restore(id: string) {
    setBusy(true);
    const response = await send({ type: "restore", target: { sessionId: id } });
    setBusy(false);
    if (!response.ok) setMessage({ text: response.error, kind: "danger" });
    else window.close();
  }

  return (
    <div className="popup">
      <div className="brand">
        <img src="/icons/icon-32.png" alt="" />
        Tabcove
        <span className="counts">
          {plural(windows, "window")} · {plural(tabs, "tab")}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <input
          className="input"
          placeholder="Session name (optional)"
          value={name}
          maxLength={120}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          autoFocus
        />
        <button
          className="btn primary"
          type="submit"
          disabled={busy || tabs === 0}
          title="Save all windows (Ctrl+Shift+S)"
        >
          <Icon name="save" /> Save
        </button>
      </form>

      <div className="actions">
        <button className="btn block" type="button" disabled={busy || tabs === 0} onClick={() => void save(true)}>
          <Icon name="close" /> Save and close all windows
        </button>
        <button className="btn block" type="button" onClick={() => openManager()}>
          <Icon name="open" /> Open manager ({plural(saved.length, "saved session")})
        </button>
      </div>

      {message && <div className={`notice ${message.kind}`}>{message.text}</div>}

      {recent.length > 0 && (
        <div className="recent">
          <h2>Bring back</h2>
          {recent.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void restore(s.id)}
              title={`Open ${plural(s.tabCount, "tab")} from ${s.name}`}
            >
              <Icon name="restore" />
              <span className="name">{s.name}</span>
              <span className="small muted">{plural(s.tabCount, "tab")}</span>
            </button>
          ))}
        </div>
      )}

      <footer>
        <span>{pro ? "Pro" : `Free: ${saved.length}/${FREE_SAVED_SESSIONS} saved sessions`}</span>
        {pro ? (
          <span>Backups every {settings?.backupEveryMinutes ?? 30} min</span>
        ) : (
          <a href={PRO_URL} target="_blank" rel="noopener">
            Get Pro
          </a>
        )}
      </footer>
      {current && <span className="sr-only">Snapshot {timeAgo(current.updatedAt)}</span>}
    </div>
  );
}

render(<Popup />, document.getElementById("app")!);
