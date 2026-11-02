import assert from "node:assert/strict";
import { test } from "node:test";
import { collectFinished, ingest, MAX_ROUTER_ATTEMPTS, route } from "../src/dispatch.ts";
import { event, finishJob, harness } from "./helpers.ts";

function startOne(h: ReturnType<typeof harness>) {
  const s = h.store.load();
  ingest(h.deps, s, [event()]);
  h.routerReply.text = JSON.stringify({ decisions: [{ thread: "acme/app#7", action: "start", reply: "" }] });
  route(h.deps, s);
  h.store.save(s);
  return s;
}

test("a Router start decision creates a Worker on its own branch", () => {
  const h = harness();
  const s = startOne(h);
  assert.equal(h.spawns.length, 1);
  assert.equal(s.threads["acme/app#7"].status, "running");
  assert.equal(s.threads["acme/app#7"].branch, "feat/sa-7");
  assert.match(h.spawns[0].job.prompt, /^WORKER/);
});

test("a follow-up on an owned live thread queues for that Worker with no Router call", () => {
  const h = harness();
  const s = startOne(h);
  h.routerCalls.length = 0;
  ingest(h.deps, s, [event({ body: "also fix logout" })]);
  route(h.deps, s);
  assert.equal(h.routerCalls.length, 0);
  assert.equal(h.spawns.length, 1);
  assert.equal(s.threads["acme/app#7"].pending.length, 1);
});

test("a finished Worker posts its report and resumes its session for pending events", () => {
  const h = harness();
  const s = startOne(h);
  ingest(h.deps, s, [event({ body: "also fix logout" })]);
  finishJob(h.spawns[0].dir, JSON.stringify({ result: "Opened draft PR #9.", session_id: "sess-1" }));
  collectFinished(h.deps, s);
  assert.deepEqual(h.comments.at(-1), { number: 7, body: "Opened draft PR #9." });
  assert.equal(h.spawns.length, 2);
  assert.deepEqual(h.spawns[1].job.args.slice(-2), ["--resume", "sess-1"]);
  assert.equal(s.threads["acme/app#7"].sessionId, "sess-1");
  assert.equal(h.routerCalls.length, 1);
});

test("an idle owned thread resumes directly on a new event", () => {
  const h = harness();
  const s = startOne(h);
  finishJob(h.spawns[0].dir, JSON.stringify({ result: "", session_id: "sess-1" }));
  collectFinished(h.deps, s);
  ingest(h.deps, s, [event({ body: "please add a test" })]);
  assert.equal(h.spawns.length, 2);
  assert.ok(h.spawns[1].job.args.includes("sess-1"));
});

test("malformed Router output starts no Worker and keeps the event with attempts + 1", () => {
  const h = harness();
  const s = h.store.load();
  ingest(h.deps, s, [event()]);
  h.routerReply.text = "Sure! I will start on that.";
  route(h.deps, s);
  assert.equal(h.spawns.length, 0);
  assert.equal(s.queue.length, 1);
  assert.equal(s.queue[0].attempts, 1);
});

test("an event the Router cannot parse after the retry limit gets one question and leaves the queue", () => {
  const h = harness();
  const s = h.store.load();
  ingest(h.deps, s, [event()]);
  h.routerReply.text = "{not json";
  for (let i = 0; i < MAX_ROUTER_ATTEMPTS; i++) route(h.deps, s);
  assert.equal(s.queue.length, 0);
  assert.equal(h.comments.length, 1);
});

test("a decision for an unknown thread rejects the whole Router output", () => {
  const h = harness();
  const s = h.store.load();
  ingest(h.deps, s, [event()]);
  h.routerReply.text = JSON.stringify({ decisions: [{ thread: "evil/repo#1", action: "start", reply: "" }] });
  route(h.deps, s);
  assert.equal(h.spawns.length, 0);
});

test("Workers beyond maxWorkers wait in the queue", () => {
  const h = harness();
  const s = h.store.load();
  ingest(h.deps, s, [event({ number: 1 }), event({ number: 2 }), event({ number: 3 })]);
  h.routerReply.text = JSON.stringify({
    decisions: [1, 2, 3].map((n) => ({ thread: `acme/app#${n}`, action: "start", reply: "" })),
  });
  route(h.deps, s);
  assert.equal(h.spawns.length, 2);
  assert.deepEqual(s.queue.map((q) => q.thread), ["acme/app#3"]);
});

test("a duplicate event id is ingested once", () => {
  const h = harness();
  const s = h.store.load();
  const e = event();
  ingest(h.deps, s, [e, e]);
  ingest(h.deps, s, [e]);
  assert.equal(s.queue.length, 1);
  assert.doesNotMatch(s.queue[0].body, /---/);
});
