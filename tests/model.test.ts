import assert from "node:assert/strict";
import { test } from "node:test";
import { countTabs, defaultName, isSavableUrl, newId, summarize } from "../src/lib/model.ts";

test("only pages an extension can reopen are savable", () => {
  assert.equal(isSavableUrl("https://a.example/"), true);
  assert.equal(isSavableUrl("http://a.example/"), true);
  assert.equal(isSavableUrl("file:///C:/doc.pdf"), true);
  assert.equal(isSavableUrl("chrome://settings/"), true);
  assert.equal(isSavableUrl("chrome://newtab/"), false);
  assert.equal(isSavableUrl("about:blank"), false);
  assert.equal(isSavableUrl("javascript:alert(1)"), false);
  assert.equal(isSavableUrl("data:text/html,hi"), false);
  assert.equal(isSavableUrl(undefined), false);
  assert.equal(isSavableUrl(""), false);
});

test("summaries count windows and tabs", () => {
  const summary = summarize({
    id: "x",
    kind: "saved",
    name: "n",
    createdAt: 1,
    updatedAt: 2,
    windows: [
      { tabs: [{ url: "https://a.example/", title: "a" }], groups: [] },
      { tabs: [{ url: "https://b.example/", title: "b" }, { url: "https://c.example/", title: "c" }], groups: [] },
    ],
  });
  assert.equal(summary.windowCount, 2);
  assert.equal(summary.tabCount, 3);
  assert.equal(countTabs([]), 0);
});

test("ids are unique and default names say what kind of record it is", () => {
  const ids = new Set(Array.from({ length: 200 }, () => newId()));
  assert.equal(ids.size, 200);
  const date = new Date(2026, 9, 21, 14, 5);
  assert.match(defaultName(date, "auto"), /^Backup /);
  assert.match(defaultName(date, "closed"), /^Closed window /);
  assert.match(defaultName(date, "previous"), /^Previous session /);
  assert.doesNotMatch(defaultName(date), /^(Backup|Closed|Previous)/);
});
