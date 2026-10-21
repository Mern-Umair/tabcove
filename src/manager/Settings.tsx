import { useEffect, useRef, useState } from "preact/hooks";
import { PRO_PRICE_LABEL, PRO_URL } from "@/lib/license.ts";
import { send } from "@/lib/messages.ts";
import { FREE_SAVED_SESSIONS, type Settings } from "@/lib/model.ts";
import { bytesInUse, clearAll, exportAll, getLicense } from "@/lib/storage.ts";
import { download, Icon } from "@/ui/shared.tsx";
import type { Toast } from "./App.tsx";

export function SettingsView(props: {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
  pro: boolean;
  refreshPro: () => Promise<void>;
  notify: Toast;
}) {
  const { settings, update, pro, notify } = props;
  const [key, setKey] = useState("");
  const [licenseEmail, setLicenseEmail] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void bytesInUse().then(setBytes);
    void getLicense().then((l) => setLicenseEmail(l?.email));
  }, [pro]);

  async function activate(e: Event) {
    e.preventDefault();
    setBusy(true);
    const response = await send({ type: "license", key });
    setBusy(false);
    if (response.ok) {
      setKey("");
      notify("Pro is on. Thank you!");
      await props.refreshPro();
    } else notify(response.error, "danger");
  }
  async function deactivate() {
    await send({ type: "license", key: null });
    await props.refreshPro();
    notify("Licence removed from this browser.");
  }
  async function exportEverything() {
    const data = await exportAll();
    download(`tabcove-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    notify(`Exported ${data.sessions.length} sessions.`);
  }
  async function importFile(file: File) {
    const text = await file.text();
    const response = await send({ type: "import", text, name: file.name.replace(/\.[^.]+$/, "") });
    if (response.ok) notify(`Imported ${response.imported} session${response.imported === 1 ? "" : "s"}.`);
    else notify(response.error, response.limit ? "warn" : "danger");
    if (fileRef.current) fileRef.current.value = "";
  }
  async function wipe() {
    if (!confirm("Delete every saved session, backup and setting stored by Tabcove? This cannot be undone.")) return;
    await clearAll();
    notify("All Tabcove data deleted.");
    location.hash = "";
  }
  function openShortcuts() {
    void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  }

  return (
    <div className="settings stack">
      <h1>Settings</h1>

      <section className={`card ${pro ? "" : "pro-box"}`}>
        <h2>{pro ? "Tabcove Pro is on" : "Tabcove Pro"}</h2>
        {pro ? (
          <>
            <p className="muted">
              Unlimited saved sessions, backups kept as long as you like, and imports.{" "}
              {licenseEmail && `Licensed to ${licenseEmail}.`}
            </p>
            <div>
              <button className="btn sm" type="button" onClick={() => void deactivate()}>
                Remove licence from this browser
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Free keeps {FREE_SAVED_SESSIONS} saved sessions and 24 hours of backups. Pro is {PRO_PRICE_LABEL}, no
              subscription: unlimited saved sessions, every backup kept, and import from OneTab or Session Buddy.
            </p>
            <div>
              <a className="btn primary" href={PRO_URL} target="_blank" rel="noopener">
                Get Pro, {PRO_PRICE_LABEL}
              </a>
            </div>
            <form onSubmit={(e) => void activate(e)} className="field">
              <span>Already have a licence key?</span>
              <div style="display:flex;gap:6px">
                <input
                  className="input"
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  value={key}
                  onInput={(e) => setKey((e.target as HTMLInputElement).value)}
                />
                <button className="btn" type="submit" disabled={busy || !key.trim()}>
                  Activate
                </button>
              </div>
              <span className="help">
                The key is in the email from Gumroad after purchase. It is checked once, then stays on this computer.
              </span>
            </form>
          </>
        )}
      </section>

      <section className="card">
        <h2>Backups</h2>
        <label className="field">
          <span>Back up the open windows every</span>
          <select
            className="input"
            value={settings.backupEveryMinutes}
            onChange={(e) => void update({ backupEveryMinutes: Number((e.target as HTMLSelectElement).value) })}
          >
            {[5, 10, 15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}
              </option>
            ))}
          </select>
          <span className="help">
            A backup is only written when something changed, so this costs nothing when you are idle.
          </span>
        </label>
        <label className="field">
          <span>Keep up to</span>
          <select
            className="input"
            value={settings.keepBackups}
            onChange={(e) => void update({ keepBackups: Number((e.target as HTMLSelectElement).value) })}
          >
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} backups and {n} closed windows
              </option>
            ))}
          </select>
          {!pro && (
            <span className="help">On the free plan backups older than 24 hours are removed. Pro keeps them.</span>
          )}
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.ignorePinned}
            onChange={(e) => void update({ ignorePinned: (e.target as HTMLInputElement).checked })}
          />
          <span>Leave pinned tabs out of sessions and backups</span>
        </label>
      </section>

      <section className="card">
        <h2>Restoring</h2>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.lazyRestore}
            onChange={(e) => void update({ lazyRestore: (e.target as HTMLInputElement).checked })}
          />
          <span>
            Open tabs without loading them (they load when clicked)
            <span className="help" style="display:block">
              Fast and light on memory, even for 200 tabs. Turn off if you want every page loaded right away.
            </span>
          </span>
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.restoreIntoCurrentWindow}
            onChange={(e) => void update({ restoreIntoCurrentWindow: (e.target as HTMLInputElement).checked })}
          />
          <span>“Open all” puts tabs in the current window instead of new windows</span>
        </label>
      </section>

      <section className="card">
        <h2>Appearance and shortcuts</h2>
        <label className="field">
          <span>Theme</span>
          <select
            className="input"
            value={settings.theme}
            onChange={(e) => void update({ theme: (e.target as HTMLSelectElement).value as Settings["theme"] })}
          >
            <option value="system">Match the system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="help">
          <span className="kbd">Ctrl</span> + <span className="kbd">Shift</span> + <span className="kbd">S</span> saves
          all windows; <span className="kbd">Ctrl</span> + <span className="kbd">Shift</span> +{" "}
          <span className="kbd">Y</span> opens this page.{" "}
          <button className="btn sm ghost" type="button" onClick={openShortcuts}>
            Change shortcuts
          </button>
        </p>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted">
          Everything Tabcove saves stays in this browser profile on this computer
          {bytes !== null && ` (${(bytes / 1024).toFixed(0)} KB used)`}. Nothing is uploaded anywhere. Export a file now
          and then and keep it somewhere safe.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button className="btn" type="button" onClick={() => void exportEverything()}>
            <Icon name="download" /> Export all sessions
          </button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            className="sr-only"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) void importFile(file);
            }}
          />
          <button className="btn danger" type="button" onClick={() => void wipe()}>
            <Icon name="trash" /> Delete all data
          </button>
        </div>
        <span className="help">
          Import takes Tabcove exports, Session Buddy exports, OneTab’s “Export URLs” text, or a plain list of links.
        </span>
      </section>
    </div>
  );
}
