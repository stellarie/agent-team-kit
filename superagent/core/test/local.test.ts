import assert from "node:assert/strict";
import { test } from "node:test";
import { ingest, route } from "../src/dispatch.ts";
import { buildInvocation } from "../src/runtime.ts";
import { LocalInbox } from "../src/local.ts";
import { config, event, harness, tmp } from "./helpers.ts";

function localConfig(over: Record<string, any> = {}) {
  return config({ source: "local", repos: [], allow: { logins: [] }, policy: { maxWorkersCap: 2 }, localRepos: { app: tmp() }, ...over });
}

test("a local task starts a Worker with no Router call and its report lands in the outbox", () => {
  const cfg = localConfig();
  const h = harness(cfg);
  const inbox = new LocalInbox(cfg.stateDir, cfg.trigger.label);
  h.deps.channel = inbox;
  const item = inbox.ask("app", "fix the login bug");
  const s = h.store.load();
  ingest(h.deps, s, inbox.pollAll());
  route(h.deps, s);
  assert.equal(h.routerCalls.length, 0);
  assert.equal(h.spawns.length, 1);
  assert.match(h.spawns[0].job.prompt, /fix the login bug/);
  assert.match(h.spawns[0].job.prompt, /under \d+ words/);
  assert.deepEqual(inbox.pollAll(), []);
  inbox.comment("app", item.number, "done");
  assert.match(inbox.read("app", item.number), /done/);
});

test("a local source drops events for unknown repos and non-local authors", () => {
  const h = harness(localConfig());
  const s = h.store.load();
  ingest(h.deps, s, [event({ repo: "other", author: "local" }), event({ repo: "app", author: "alice" })]);
  assert.equal(s.queue.length, 0);
});

test("label-starts skips the Router for labeled events only", () => {
  const h = harness(config({ router: "label-starts" }));
  const s = h.store.load();
  ingest(h.deps, s, [event({ labels: ["superagent"] })]);
  route(h.deps, s);
  assert.equal(h.routerCalls.length, 0);
  assert.equal(h.spawns.length, 1);
  ingest(h.deps, s, [event({ number: 8 })]);
  route(h.deps, s);
  assert.equal(h.routerCalls.length, 1);
});

test("a lean budget adds token-saving flags and drops GitHub tools for local Workers", () => {
  const budget = { lean: true, effort: "low", maxUsdPerRun: 0.5, routerBodyChars: 600, reportWords: 120 } as const;
  const inv = buildInvocation({ runtime: "claude", role: "worker", model: "m", cwd: ".", resumeId: null, testCommand: null, source: "local", budget });
  for (const f of ["--bare", "--strict-mcp-config", "--effort", "--max-budget-usd"]) assert.ok(inv.args.includes(f), f);
  assert.doesNotMatch(inv.args.join(" "), /gh pr/);
});
