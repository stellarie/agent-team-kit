import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { GitHub } from "../src/github.ts";
import type { ThreadRecord } from "../src/state.ts";
import { watchdogPass, type WatchdogDeps } from "../src/watchdog.ts";
import { config, harness } from "./helpers.ts";

const T0 = Date.parse("2026-11-02T00:00:00Z");
const MIN = 60_000;

function running(n: number, runStartedAt: number): ThreadRecord {
  return {
    thread: `acme/app#${n}`, repo: "acme/app", number: n, branch: `feat/sa-${n}`, worktree: "",
    sessionId: "s", pid: 900 + n, status: "running", startedAt: runStartedAt, runStartedAt,
    notifiedStatus: null, pending: [],
  };
}

function setup(heartbeatAgeMin: number, runAgeMin: number) {
  const cfg = config({ watchdog: { stallMinutes: 20, maxRunMinutes: 120 } });
  const h = harness(cfg);
  const s = h.store.load();
  s.threads["acme/app#1"] = running(1, T0 - runAgeMin * MIN);
  const dir = join(h.store.workerDir("acme/app#1"), "job");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "heartbeat"), String(T0 - heartbeatAgeMin * MIN));
  writeFileSync(join(dir, "child.pid"), "777");
  h.store.save(s);
  const comments: string[] = [];
  const killed: number[] = [];
  const gh = new GitHub(() => "[]");
  gh.comment = (_r, _n, body) => {
    comments.push(body);
  };
  let restarts = 0;
  const d: WatchdogDeps = {
    cfg, store: h.store, channel: gh, now: () => T0,
    kill: (pid) => killed.push(pid),
    restartLoop: () => restarts++,
    log: () => {},
  };
  return { d, h, comments, killed, restarts: () => restarts };
}

test("a stale heartbeat stops the Worker, marks it stalled, and comments once across passes", () => {
  const w = setup(30, 40);
  watchdogPass(w.d);
  watchdogPass(w.d);
  const rec = w.h.store.load().threads["acme/app#1"];
  assert.equal(rec.status, "stalled");
  assert.deepEqual(w.killed, [777, 901]);
  assert.equal(w.comments.length, 1);
});

test("a run past maxRunMinutes times out even with a fresh heartbeat", () => {
  const w = setup(1, 130);
  watchdogPass(w.d);
  assert.equal(w.h.store.load().threads["acme/app#1"].status, "timeout");
});

test("a healthy Worker is left alone", () => {
  const w = setup(1, 10);
  watchdogPass(w.d);
  assert.equal(w.h.store.load().threads["acme/app#1"].status, "running");
  assert.equal(w.comments.length, 0);
  assert.deepEqual(w.killed, []);
});

test("a dead loop is restarted", () => {
  const w = setup(1, 10);
  watchdogPass(w.d);
  assert.equal(w.restarts(), 1);
});
