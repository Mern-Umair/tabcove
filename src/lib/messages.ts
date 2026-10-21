// Requests the pages send to the background worker, and a typed helper to send them.
import type { License, Session, SessionSummary, Settings } from "./model.ts";

export type RestoreTarget = { sessionId: string; windowIndex?: number; tabIndexes?: number[] };

export type Request =
  | { type: "save"; name?: string; closeAfter?: boolean }
  | { type: "restore"; target: RestoreTarget; intoCurrentWindow?: boolean }
  | { type: "delete"; ids: string[] }
  | { type: "rename"; id: string; name: string }
  | { type: "duplicate"; id: string; name?: string }
  | { type: "removeTabs"; id: string; windowIndex: number; tabIndexes: number[] }
  | { type: "import"; text: string; name?: string }
  | { type: "settings"; patch?: Partial<Settings> }
  | { type: "license"; key?: string | null }
  | { type: "capture" };

export type Response =
  | {
      ok: true;
      summary?: SessionSummary;
      session?: Session;
      settings?: Settings;
      license?: License | null;
      pro?: boolean;
      imported?: number;
      error?: never;
    }
  | { ok: false; error: string; limit?: boolean };

export async function send(request: Request): Promise<Response> {
  try {
    const response = (await chrome.runtime.sendMessage(request)) as Response | undefined;
    return response ?? { ok: false, error: "No reply from the extension; try reloading it." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
