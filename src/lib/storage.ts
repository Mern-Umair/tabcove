// chrome.storage.local is the only store. Each session is its own key so a
// large session never slows the list down; `index` holds the summaries.
import {
  defaultSettings,
  summarize,
  type License,
  type Session,
  type SessionKind,
  type SessionSummary,
  type Settings,
} from "./model.ts";

const INDEX = "index";
const SETTINGS = "settings";
const LICENSE = "license";
const CURRENT = "s:current";

const sessionKey = (id: string) => `s:${id}`;

export async function getIndex(): Promise<SessionSummary[]> {
  const data = await chrome.storage.local.get(INDEX);
  return (data[INDEX] as SessionSummary[] | undefined) ?? [];
}

async function setIndex(index: SessionSummary[]): Promise<void> {
  await chrome.storage.local.set({ [INDEX]: index });
}

export async function getSession(id: string): Promise<Session | null> {
  const key = id === "current" ? CURRENT : sessionKey(id);
  const data = await chrome.storage.local.get(key);
  return (data[key] as Session | undefined) ?? null;
}

/** Writes the live snapshot. Not in the index: the UI reads it directly. */
export async function putCurrent(session: Session): Promise<void> {
  await chrome.storage.local.set({ [CURRENT]: session });
}

export async function putSession(session: Session): Promise<SessionSummary> {
  const summary = summarize(session);
  const index = await getIndex();
  const at = index.findIndex((s) => s.id === session.id);
  if (at >= 0) index[at] = summary;
  else index.unshift(summary);
  await chrome.storage.local.set({ [sessionKey(session.id)]: session, [INDEX]: index });
  return summary;
}

export async function deleteSessions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const index = (await getIndex()).filter((s) => !ids.includes(s.id));
  await chrome.storage.local.remove(ids.map(sessionKey));
  await setIndex(index);
}

export async function renameSession(id: string, name: string): Promise<void> {
  const session = await getSession(id);
  if (!session) return;
  session.name = name;
  session.updatedAt = Date.now();
  await putSession(session);
}

/** Keeps only the newest `keep` sessions of a kind (and none older than `notBefore`). */
export async function prune(kind: SessionKind, keep: number, notBefore = 0): Promise<void> {
  const index = await getIndex();
  const ofKind = index.filter((s) => s.kind === kind).sort((a, b) => b.createdAt - a.createdAt);
  const drop = ofKind.filter((s, i) => i >= keep || s.createdAt < notBefore).map((s) => s.id);
  await deleteSessions(drop);
}

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS);
  return { ...defaultSettings, ...((data[SETTINGS] as Partial<Settings> | undefined) ?? {}) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS]: next });
  return next;
}

export async function getLicense(): Promise<License | null> {
  const data = await chrome.storage.local.get(LICENSE);
  return (data[LICENSE] as License | undefined) ?? null;
}

export async function setLicense(license: License | null): Promise<void> {
  if (license) await chrome.storage.local.set({ [LICENSE]: license });
  else await chrome.storage.local.remove(LICENSE);
}

/** Everything, for export. */
export async function exportAll(): Promise<{ version: 1; exportedAt: number; sessions: Session[] }> {
  const index = await getIndex();
  const keys = index.map((s) => sessionKey(s.id));
  const data = await chrome.storage.local.get(keys);
  const sessions = keys.map((k) => data[k] as Session | undefined).filter((s): s is Session => Boolean(s));
  return { version: 1, exportedAt: Date.now(), sessions };
}

export async function bytesInUse(): Promise<number> {
  return chrome.storage.local.getBytesInUse(null);
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear();
}
