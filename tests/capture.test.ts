import assert from "node:assert/strict";
import { test } from "node:test";
import { captureWindows, cleanTitle, fingerprint } from "../src/lib/capture.ts";

const groups = [
  { id: 7, windowId: 1, title: "Work", color: "blue", collapsed: false },
  { id: 9, windowId: 4, title: "", color: "red" },
];

test("captures normal windows, skips incognito, popups, blank tabs and chrome pages that cannot be reopened", () => {
  const saved = captureWindows(
    [
      {
        id: 1,
        focused: false,
        state: "maximized",
        tabs: [
          { url: "https://a.example/one", title: "One", pinned: true },
          { url: "about:blank", title: "" },
          { url: "chrome://newtab/", title: "New Tab" },
          { url: "https://b.example/two", title: "Two", active: true, groupId: 7 },
          { pendingUrl: "https://c.example/three", title: "" },
        ],
      },
      { id: 2, incognito: true, tabs: [{ url: "https://secret.example/", title: "Secret" }] },
      { id: 3, type: "popup", tabs: [{ url: "https://popup.example/", title: "Popup" }] },
      { id: 4, focused: true, tabs: [{ url: "https://d.example/", title: "Four", groupId: 9 }] },
      { id: 5, tabs: [{ url: "about:blank", title: "" }] },
    ],
    groups,
  );
  assert.equal(saved.length, 2);
  // Focused window comes first.
  assert.equal(saved[0]!.focused, true);
  assert.deepEqual(saved[0]!.tabs, [{ url: "https://d.example/", title: "Four", group: 0 }]);
  assert.deepEqual(saved[0]!.groups, [{ title: "", color: "red", collapsed: undefined }]);
  const w = saved[1]!;
  assert.equal(w.state, "maximized");
  assert.deepEqual(
    w.tabs.map((t) => t.url),
    ["https://a.example/one", "https://b.example/two", "https://c.example/three"],
  );
  assert.equal(w.tabs[0]!.pinned, true);
  assert.equal(w.tabs[1]!.active, true);
  assert.equal(w.tabs[1]!.group, 0);
  assert.equal(w.groups[0]!.title, "Work");
  assert.equal(w.tabs[2]!.title, "c.example/three");
});

test("ignorePinned leaves pinned tabs out", () => {
  const saved = captureWindows(
    [{ id: 1, tabs: [{ url: "https://a.example/", title: "A", pinned: true }, { url: "https://b.example/", title: "B" }] }],
    [],
    { ignorePinned: true },
  );
  assert.deepEqual(
    saved[0]!.tabs.map((t) => t.url),
    ["https://b.example/"],
  );
});

test("a group id that belongs to another window is not applied", () => {
  const saved = captureWindows([{ id: 1, tabs: [{ url: "https://a.example/", title: "A", groupId: 9 }] }], groups);
  assert.equal(saved[0]!.tabs[0]!.group, undefined);
  assert.equal(saved[0]!.groups.length, 0);
});

test("cleanTitle falls back to the host and path, and trims long titles", () => {
  assert.equal(cleanTitle("  Hello ", "https://x.example/"), "Hello");
  assert.equal(cleanTitle("", "https://x.example/docs/a?b=1"), "x.example/docs/a");
  assert.equal(cleanTitle(undefined, "https://x.example/"), "x.example");
  assert.equal(cleanTitle("a".repeat(600), "https://x.example/").length, 500);
});

test("fingerprint changes with urls, pin state and grouping, not with titles", () => {
  const base = [{ tabs: [{ url: "https://a.example/", title: "A" }], groups: [] }];
  const sameUrlsNewTitle = [{ tabs: [{ url: "https://a.example/", title: "B" }], groups: [] }];
  const pinned = [{ tabs: [{ url: "https://a.example/", title: "A", pinned: true }], groups: [] }];
  const other = [{ tabs: [{ url: "https://b.example/", title: "A" }], groups: [] }];
  assert.equal(fingerprint(base), fingerprint(sameUrlsNewTitle));
  assert.notEqual(fingerprint(base), fingerprint(pinned));
  assert.notEqual(fingerprint(base), fingerprint(other));
  assert.notEqual(fingerprint(base), fingerprint([...base, ...other]));
});
