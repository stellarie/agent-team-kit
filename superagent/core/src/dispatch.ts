import { join } from "node:path";
import type { Config } from "./config.ts";
import { keepEvent, threadKey } from "./filter.ts";
import type { Channel, GhEvent } from "./github.ts";
import { buildRouterPrompt, parseDecisions } from "./router.ts";
import { buildInvocation, parseOutput, type Invocation } from "./runtime.ts";
import type { QueuedEvent, State, StateStore, ThreadRecord } from "./state.ts";
import { readJob, startJob, type Spawner } from "./worker.ts";

export const MAX_ROUTER_ATTEMPTS = 3;

export interface Deps {
  cfg: Config;
  store: StateStore;
  channel: Channel;
  spawner: Spawner;
  prepare: (repo: string, number: number) => { worktree: string; branch: string };
  runRouter: (inv: Invocation, prompt: string) => string;
  prompts: { router: string; worker: string };
  now: () => number;
  log: (msg: string) => void;
}

const LIVE = new Set(["starting", "running"]);

export function isOwned(r: ThreadRecord): boolean {
  return r.status !== "done" && r.status !== "failed";
}

function jobDir(d: Deps, thread: string): string {
  return join(d.store.workerDir(thread), "job");
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}\n\n[truncated]` : s;
}

function liveCount(s: State): number {
  return Object.values(s.threads).filter((r) => LIVE.has(r.status)).length;
}

function runWorker(d: Deps, rec: ThreadRecord, message: string): void {
  const inv = buildInvocation({
    runtime: d.cfg.runtime,
    role: "worker",
    model: d.cfg.models.worker,
    cwd: rec.worktree,
    resumeId: rec.sessionId,
    testCommand: d.cfg.testCommand,
    source: d.cfg.source,
    budget: d.cfg.budget,
  });
  const limit = `\n\nKeep your final report under ${d.cfg.budget.reportWords} words.`;
  const prompt = (rec.sessionId ? message : `${d.prompts.worker}\n\n${message}`) + limit;
  rec.pid = startJob(jobDir(d, rec.thread), { ...inv, cwd: rec.worktree, prompt }, d.spawner);
  rec.status = "running";
  rec.runStartedAt = d.now();
  rec.notifiedStatus = null;
}

function eventText(e: { author: string; body: string; title?: string }): string {
  return e.title ? `${e.author} opened: ${e.title}\n\n${e.body}` : `${e.author} wrote:\n\n${e.body}`;
}

export function collectFinished(d: Deps, s: State): void {
  for (const rec of Object.values(s.threads)) {
    if (rec.status !== "running") continue;
    const job = readJob(jobDir(d, rec.thread));
    if (!job.finished) continue;
    const out = parseOutput(d.cfg.runtime, job.stdout);
    if (out.sessionId) rec.sessionId = out.sessionId;
    rec.pid = null;
    if (job.exitCode === 0) {
      rec.status = "idle";
      if (out.text.trim()) d.channel.comment(rec.repo, rec.number, clip(out.text, 60000));
    } else {
      rec.status = "failed";
      d.channel.comment(rec.repo, rec.number, `Worker exited with code ${job.exitCode}.\n\n${clip(job.stderr, 4000)}`);
    }
    if (rec.status === "idle" && rec.pending.length > 0) {
      const msg = rec.pending.join("\n\n---\n\n");
      rec.pending = [];
      runWorker(d, rec, msg);
    }
  }
}

function routeOwned(d: Deps, rec: ThreadRecord, e: GhEvent): void {
  const text = eventText(e);
  if (LIVE.has(rec.status)) {
    rec.pending.push(text);
    return;
  }
  runWorker(d, rec, text);
}

export function ingest(d: Deps, s: State, events: GhEvent[]): void {
  const seen = new Set(s.seen);
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    s.seen.push(e.id);
    const owned = new Set(Object.values(s.threads).filter(isOwned).map((r) => r.thread));
    if (!keepEvent(e, d.cfg, owned)) continue;
    const key = threadKey(e.repo, e.number);
    const rec = s.threads[key];
    if (rec && isOwned(rec)) {
      routeOwned(d, rec, e);
      continue;
    }
    const labeled = e.labels.includes(d.cfg.trigger.label);
    const q = s.queue.find((x) => x.thread === key);
    if (q) {
      q.body += `\n\n---\n\n${eventText(e)}`;
      q.labeled = q.labeled || labeled;
    } else {
      s.queue.push({
        id: e.id,
        thread: key,
        repo: e.repo,
        number: e.number,
        author: e.author,
        body: e.body,
        title: e.title,
        labeled,
        attempts: 0,
      });
    }
  }
}

function startThread(d: Deps, s: State, q: QueuedEvent): void {
  const rec: ThreadRecord = {
    thread: q.thread,
    repo: q.repo,
    number: q.number,
    branch: `feat/sa-${q.number}`,
    worktree: "",
    sessionId: null,
    pid: null,
    status: "starting",
    startedAt: d.now(),
    runStartedAt: d.now(),
    notifiedStatus: null,
    pending: [],
  };
  // Persist "starting" before any side effect.
  s.threads[q.thread] = rec;
  d.store.save(s);
  const wt = d.prepare(q.repo, q.number);
  rec.worktree = wt.worktree;
  rec.branch = wt.branch;
  runWorker(d, rec, `Thread ${q.thread} on branch ${rec.branch}.\n\n${eventText(q)}`);
}

function direct(d: Deps, q: QueuedEvent): boolean {
  return d.cfg.router === "off" || (d.cfg.router === "label-starts" && q.labeled);
}

// Explicit tasks skip the Router model call.
function startDirect(d: Deps, s: State): void {
  const keep: QueuedEvent[] = [];
  for (const q of s.queue) {
    if (direct(d, q) && liveCount(s) < d.cfg.maxWorkers) startThread(d, s, q);
    else keep.push(q);
  }
  s.queue = keep;
}

function routeWithModel(d: Deps, s: State, queue: QueuedEvent[]): QueuedEvent[] {
  const live = Object.values(s.threads).filter((r) => LIVE.has(r.status));
  let capacity = d.cfg.maxWorkers - live.length;
  const inv = buildInvocation({
    runtime: d.cfg.runtime,
    role: "router",
    model: d.cfg.models.router,
    cwd: d.cfg.worktreeRoot,
    resumeId: null,
    testCommand: null,
    source: d.cfg.source,
    budget: d.cfg.budget,
  });
  const prompt = buildRouterPrompt(d.prompts.router, queue, live.map((r) => r.thread), d.cfg.budget.routerBodyChars);
  let text = "";
  try {
    text = parseOutput(d.cfg.runtime, d.runRouter(inv, prompt)).text;
  } catch (e) {
    d.log(`router failed: ${e}`);
  }
  const decisions = parseDecisions(text, new Set(queue.map((q) => q.thread)));
  if (decisions === null) {
    d.log("router output rejected");
    for (const q of queue) q.attempts += 1;
    for (const q of queue.filter((x) => x.attempts >= MAX_ROUTER_ATTEMPTS)) {
      d.channel.comment(q.repo, q.number, "I could not decide how to handle this. Please restate the request.");
    }
    return queue.filter((x) => x.attempts < MAX_ROUTER_ATTEMPTS);
  }
  const keep: QueuedEvent[] = [];
  for (const q of queue) {
    const dec = decisions.find((x) => x.thread === q.thread);
    if (!dec) {
      q.attempts += 1;
      if (q.attempts < MAX_ROUTER_ATTEMPTS) keep.push(q);
      continue;
    }
    if (dec.action === "ignore") continue;
    if (dec.action === "ask") {
      if (dec.reply) d.channel.comment(q.repo, q.number, dec.reply);
      continue;
    }
    if (capacity <= 0) {
      // Decided already; skip the Router next time.
      keep.push({ ...q, labeled: true });
      continue;
    }
    capacity -= 1;
    if (dec.reply) d.channel.comment(q.repo, q.number, dec.reply);
    startThread(d, s, q);
  }
  return keep;
}

export function route(d: Deps, s: State): void {
  startDirect(d, s);
  const waiting = s.queue.filter((q) => direct(d, q));
  const undecided = s.queue.filter((q) => !direct(d, q));
  s.queue = waiting;
  if (undecided.length > 0) s.queue.push(...routeWithModel(d, s, undecided));
}

export function poll(d: Deps, s: State): GhEvent[] {
  return d.channel.pollAll(s.cursors, d.now());
}

// Adopt or clear records a crash left in "starting".
export function recover(d: Deps, s: State): void {
  for (const rec of Object.values(s.threads)) {
    if (rec.status !== "starting") continue;
    const job = readJob(jobDir(d, rec.thread));
    rec.status = job.heartbeatAt !== null ? "running" : "stalled";
  }
}

export function tick(d: Deps): void {
  const s = d.store.load();
  collectFinished(d, s);
  ingest(d, s, poll(d, s));
  route(d, s);
  d.store.save(s);
}
