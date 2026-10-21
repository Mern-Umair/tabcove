import assert from "node:assert/strict";
import { test } from "node:test";
import { isActive, needsRecheck, verifyKey } from "../src/lib/license.ts";

const DAY = 24 * 60 * 60 * 1000;

test("a malformed key is refused before any network call", async () => {
  let called = false;
  const result = await verifyKey("nope", (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch);
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("a well-formed key without a product id configured is refused with a plain message", async () => {
  const result = await verifyKey("ABCD1234-ABCD1234-ABCD1234-ABCD1234");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /not set up/);
});

test("a licence counts as Pro for 30 days after its last check and wants a recheck after 7", () => {
  const now = 1_800_000_000_000;
  assert.equal(isActive(null, now), false);
  assert.equal(isActive({ key: "k", verifiedAt: now - 10 * DAY }, now), true);
  assert.equal(isActive({ key: "k", verifiedAt: now - 31 * DAY }, now), false);
  assert.equal(needsRecheck({ key: "k", verifiedAt: now - 6 * DAY }, now), false);
  assert.equal(needsRecheck({ key: "k", verifiedAt: now - 8 * DAY }, now), true);
});
