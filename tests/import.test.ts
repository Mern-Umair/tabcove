import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImport } from "../src/lib/import.ts";

test("reads a Tabcove export and gives every session a fresh id", () => {
  const text = JSON.stringify({
    version: 1,
    exportedAt: 1,
    sessions: [
      {
        id: "old",
        kind: "auto",
        name: " Work ",
        createdAt: 1700000000000,
        updatedAt: 1,
        windows: [
          { tabs: [{ url: "https://a.example/", title: "A", pinned: true, group: 0 }], groups: [{ title: "G", color: "blue" }] },
          { tabs: [{ url: "about:blank", title: "" }], groups: [] },
        ],
      },
    ],
  });
  const result = parseImport(text, undefined, 5);
  assert.equal(result.format, "tabcove");
  assert.equal(result.sessions.length, 1);
  const s = result.sessions[0]!;
  assert.notEqual(s.id, "old");
  assert.equal(s.kind, "saved");
  assert.equal(s.name, "Work");
  assert.equal(s.createdAt, 1700000000000);
  assert.equal(s.windows.length, 1);
  assert.deepEqual(s.windows[0]!.tabs[0], { url: "https://a.example/", title: "A", pinned: true, group: 0 });
});

test("reads a Session Buddy export", () => {
  const text = JSON.stringify({
    sessions: [
      { name: "Research", created: "2026-01-02T03:04:05Z", windows: [{ tabs: [{ url: "https://r.example/", title: "R" }] }] },
      { title: "Flat", tabs: [{ url: "https://f.example/", title: "F" }] },
      { name: "Empty", windows: [] },
    ],
  });
  const result = parseImport(text);
  assert.equal(result.format, "session-buddy");
  assert.deepEqual(
    result.sessions.map((s) => s.name),
    ["Research", "Flat"],
  );
  assert.equal(result.sessions[0]!.createdAt, Date.parse("2026-01-02T03:04:05Z"));
  assert.equal(result.sessions[1]!.windows[0]!.tabs[0]!.url, "https://f.example/");
});

test("reads OneTab's export text, one window per blank-line group", () => {
  const text = `https://a.example/ | Page A
https://b.example/path | Page B

https://c.example/ | Page C
`;
  const result = parseImport(text, "mine");
  assert.equal(result.format, "onetab");
  const s = result.sessions[0]!;
  assert.equal(s.name, "mine");
  assert.equal(s.windows.length, 2);
  assert.deepEqual(s.windows[0]!.tabs[1], { url: "https://b.example/path", title: "Page B" });
});

test("reads a plain list of links", () => {
  const result = parseImport("https://a.example/\nnot a link\nhttps://b.example/x");
  assert.equal(result.format, "urls");
  assert.deepEqual(
    result.sessions[0]!.windows[0]!.tabs.map((t) => t.url),
    ["https://a.example/", "https://b.example/x"],
  );
});

test("rejects empty files, bad JSON and JSON of an unknown shape with plain messages", () => {
  assert.throws(() => parseImport("   "), /empty/);
  assert.throws(() => parseImport("{not json"), /not valid JSON/);
  assert.throws(() => parseImport('{"hello":"world"}'), /not a Tabcove or Session Buddy/);
  assert.throws(() => parseImport("just words here"), /No web addresses/);
});
