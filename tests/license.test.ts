import assert from "node:assert/strict";
import { test } from "node:test";
import { GUMROAD_PRODUCT_ID, isActive, needsRecheck, verifyKey } from "../src/lib/license.ts";

const DAY = 24 * 60 * 60 * 1000;
const KEY = "ABCD1234-ABCD1234-ABCD1234-ABCD1234";

/** A fake Gumroad that records the request and answers with the given JSON. */
function gumroad(reply: unknown, status = 200) {
  const calls: { url: string; body: string }[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify(reply), { status });
  }) as typeof fetch;
  return { fetcher, calls };
}

test("a malformed key is refused before any network call", async () => {
  let called = false;
  const result = await verifyKey("nope", (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch);
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("a valid key is sent to Gumroad with the product id and accepted", async () => {
  const api = gumroad({ success: true, purchase: { email: "buyer@example.com", refunded: false } });
  const result = await verifyKey(` ${KEY} `, api.fetcher);
  assert.deepEqual(result, { ok: true, email: "buyer@example.com" });
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0]?.url, "https://api.gumroad.com/v2/licenses/verify");
  const body = new URLSearchParams(api.calls[0]?.body);
  assert.equal(body.get("product_id"), GUMROAD_PRODUCT_ID);
  assert.equal(body.get("license_key"), KEY);
  assert.equal(body.get("increment_uses_count"), "false");
});

test("a key pasted with the whole receipt around it is extracted, case kept", async () => {
  const api = gumroad({ success: true, purchase: { email: "buyer@example.com" } });
  const pasted = `Thanks for buying Tabcove Pro!\n\nYour license key: ${KEY.toLowerCase()}\u200B \nKeep it safe.`;
  const result = await verifyKey(pasted, api.fetcher);
  assert.equal(result.ok, true);
  assert.equal(new URLSearchParams(api.calls[0]?.body).get("license_key"), KEY.toLowerCase());
});

test("an unknown key is refused with Gumroad's message", async () => {
  const api = gumroad({ success: false, message: "That license does not exist for the provided product." }, 404);
  const result = await verifyKey(KEY, api.fetcher);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /does not exist/);
});

test("a refunded purchase is refused", async () => {
  const api = gumroad({ success: true, purchase: { email: "x@example.com", refunded: true } });
  const result = await verifyKey(KEY, api.fetcher);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /refunded/);
});

test("a network failure is reported as offline so the grace period applies", async () => {
  const result = await verifyKey(KEY, (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.offline, true);
});

test("a licence counts as Pro for 30 days after its last check and wants a recheck after 7", () => {
  const now = 1_800_000_000_000;
  assert.equal(isActive(null, now), false);
  assert.equal(isActive({ key: "k", verifiedAt: now - 10 * DAY }, now), true);
  assert.equal(isActive({ key: "k", verifiedAt: now - 31 * DAY }, now), false);
  assert.equal(needsRecheck({ key: "k", verifiedAt: now - 6 * DAY }, now), false);
  assert.equal(needsRecheck({ key: "k", verifiedAt: now - 8 * DAY }, now), true);
});
