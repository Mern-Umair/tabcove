import { Icon } from "@/ui/shared.tsx";
import { go } from "./App.tsx";

export function Welcome() {
  return (
    <div className="welcome stack">
      <div>
        <h1>Your tabs are safe now</h1>
        <p className="muted">Tabcove is already watching your windows. Here is all you need to know.</p>
      </div>
      <div className="card stack">
        <ol>
          <li>
            <strong>Nothing to set up.</strong> Every window is backed up automatically, and a window you close is kept
            so you can bring it back.
          </li>
          <li>
            <strong>Save a session</strong> with the Tabcove button in the toolbar, or <span className="kbd">Ctrl</span>{" "}
            + <span className="kbd">Shift</span> + <span className="kbd">S</span>. Give it a name if you like.
          </li>
          <li>
            <strong>Bring it back</strong> from the list on the left: the whole session, one window, or just the tabs
            you tick. Tabs open without loading until you click them, so even 200 tabs come back in a moment.
          </li>
          <li>
            <strong>Find anything</strong> with the search box: it looks through every saved session and backup.
          </li>
          <li>
            <strong>Your data stays yours.</strong> Everything lives in this browser on this computer. Export a file
            from Settings now and then.
          </li>
        </ol>
        <div>
          <button className="btn primary" type="button" onClick={() => go({ view: "session", id: "current" })}>
            <Icon name="open" /> See what is open now
          </button>
        </div>
      </div>
      <p className="help">
        Tip: pin Tabcove to the toolbar (puzzle-piece icon, then the pin) so saving is one click away.
      </p>
    </div>
  );
}
