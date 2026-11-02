import assert from "node:assert/strict";
import { test } from "node:test";
import { ingest } from "../src/dispatch.ts";
import { keepEvent } from "../src/filter.ts";
import { GitHub } from "../src/github.ts";
import { config, event, harness } from "./helpers.ts";

const cfg = config();
const none = new Set<string>();

test("an event from a login outside the allowlist never reaches the Router", () => {
  assert.equal(keepEvent(event({ author: "mallory" }), cfg, none), false);
  const h = harness();
  ingest(h.deps, h.store.load(), [event({ author: "mallory" })]);
  assert.equal(h.store.load().queue.length, 0);
});

test("an event without the label or mention is dropped", () => {
  assert.equal(keepEvent(event({ body: "nice work" }), cfg, none), false);
});

test("label, mention, and owned thread each keep an allowed event", () => {
  assert.equal(keepEvent(event({ body: "x", labels: ["superagent"] }), cfg, none), true);
  assert.equal(keepEvent(event({ body: "hey @SuperAgent look" }), cfg, none), true);
  assert.equal(keepEvent(event({ body: "follow-up" }), cfg, new Set(["acme/app#7"])), true);
});

test("an owned thread still rejects a stranger", () => {
  assert.equal(keepEvent(event({ author: "mallory", body: "x" }), cfg, new Set(["acme/app#7"])), false);
});

test("an event on a repo outside the config is dropped", () => {
  assert.equal(keepEvent(event({ repo: "acme/other" }), cfg, none), false);
});

test("a service comment posted under an allowed login never re-enters its own thread", () => {
  const posted: string[] = [];
  const gh = new GitHub((_args, input) => {
    posted.push(input ?? "");
    return "";
  });
  gh.comment("acme/app", 7, "Worker report");
  const owned = new Set(["acme/app#7"]);
  assert.equal(keepEvent(event({ author: "alice", body: posted[0] }), cfg, owned), false);
  assert.equal(keepEvent(event({ author: "alice", body: "a real follow-up" }), cfg, owned), true);
});
