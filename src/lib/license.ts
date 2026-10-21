// Pro licence through Gumroad's licence API. The key is checked once when
// entered and again now and then; a check that cannot reach the network keeps
// the last result for a grace period so Pro never switches off on a train.
import type { License } from "./model.ts";

/** Set to the Gumroad product ID once the product exists; empty disables licence checks. */
export const GUMROAD_PRODUCT_ID = "";
export const PRO_PRICE_LABEL = "$9.99 once";
export const PRO_URL = "https://tabcove.gumroad.com/l/pro";

const RECHECK_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export type VerifyResult = { ok: true; email?: string } | { ok: false; reason: string; offline?: boolean };

export async function verifyKey(key: string, fetcher: typeof fetch = fetch): Promise<VerifyResult> {
  const trimmed = key.trim();
  if (!/^[A-Z0-9]{8}(-[A-Z0-9]{8}){3}$/i.test(trimmed)) {
    return { ok: false, reason: "A licence key looks like XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX." };
  }
  if (!GUMROAD_PRODUCT_ID) return { ok: false, reason: "Licence checks are not set up in this build." };
  let response: globalThis.Response;
  try {
    response = await fetcher("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: trimmed,
        increment_uses_count: "false",
      }),
    });
  } catch {
    return {
      ok: false,
      reason: "Could not reach the licence server. Check your connection and try again.",
      offline: true,
    };
  }
  let data: {
    success?: boolean;
    message?: string;
    purchase?: { email?: string; refunded?: boolean; chargebacked?: boolean };
  };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    return { ok: false, reason: "The licence server gave an unexpected reply.", offline: true };
  }
  if (!data.success) return { ok: false, reason: data.message ?? "That key was not found." };
  if (data.purchase?.refunded || data.purchase?.chargebacked)
    return { ok: false, reason: "That purchase was refunded." };
  return { ok: true, email: data.purchase?.email };
}

/** Whether a stored licence still counts as Pro right now. */
export function isActive(license: License | null, now = Date.now()): boolean {
  if (!license) return false;
  return now - license.verifiedAt < GRACE_MS;
}

export function needsRecheck(license: License, now = Date.now()): boolean {
  return now - license.verifiedAt > RECHECK_MS;
}
