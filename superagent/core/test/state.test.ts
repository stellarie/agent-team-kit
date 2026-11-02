import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ingest, recover, route } from "../src/dispatch.ts";
import type { ThreadRecord } from "../src/state.ts";
import { event, harness } from "./helpers.ts";

test("a restart after the thread map is written starts no duplicate Worker", () => {
  const h = harness();
  const s = h.store.load();
  ingest(h.deps, s, [event()]);
  h.routerReply.text = JSON.stringify({ decisions: [{ thread: "acme/app#7", action: "start", reply: "" }] });
  route(h.deps, s);
  h.store.save(s);

  const h2 = harness(h.deps.cfg);
  const s2 = h2.store.load();
  recover(h2.deps, s2);
  ingest(h2.deps, s2, [event({ body: "@superagent ping" })]);
  route(h2.deps, s2);
  assert.equal(h2.spawns.length, 0);
  assert.equal(h2.routerCalls.length, 0);
  assert.equal(s2.threads["acme/app#7"].pending.length, 1);
});

function starting(n: number): ThreadRecord {
  return {
    thread: `acme/app#${n}`, repo: "acme/app", number: n, branch: `feat/sa-${n}`, worktree: "",
    sessionId: null, pid: null, status: "starting", startedAt: 0, runStartedAt: 0,
    notifiedStatus: null, pending: [],
  };
}

test("a crash in the starting state is adopted when the Worker ran and stalled when it never did", () => {
  const h = harness();
  const s = h.store.load();
  s.threads["acme/app#1"] = starting(1);
  s.threads["acme/app#2"] = starting(2);
  const jobDir = join(h.store.workerDir("acme/app#1"), "job");
  mkdirSync(jobDir, { recursive: true });
  writeFileSync(join(jobDir, "heartbeat"), "1");
  recover(h.deps, s);
  assert.equal(s.threads["acme/app#1"].status, "running");
  assert.equal(s.threads["acme/app#2"].status, "stalled");
});
