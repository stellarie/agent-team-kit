import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateConfig, type Config } from "../src/config.ts";
import type { Deps } from "../src/dispatch.ts";
import { GitHub, type GhEvent } from "../src/github.ts";
import type { Invocation } from "../src/runtime.ts";
import { StateStore } from "../src/state.ts";
import type { Job } from "../src/worker.ts";

export function tmp(): string {
  return mkdtempSync(join(tmpdir(), "superagent-test-"));
}

export function config(over: Record<string, any> = {}): Config {
  return validateConfig({
    runtime: "claude",
    repos: ["acme/app"],
    allow: { logins: ["alice"] },
    policy: { allowedOwners: ["acme"], maxWorkersCap: 2 },
    models: { router: "r", worker: "w" },
    worktreeRoot: tmp(),
    stateDir: tmp(),
    maxWorkers: 2,
    ...over,
  });
}

export function event(over: Partial<GhEvent> = {}): GhEvent {
  return {
    id: `comment:${Math.random()}`,
    kind: "comment",
    repo: "acme/app",
    number: 7,
    author: "alice",
    body: "@superagent please fix the login bug",
    title: "",
    labels: [],
    updatedAt: "2026-11-02T00:00:00Z",
    ...over,
  };
}

export interface Harness {
  deps: Deps;
  store: StateStore;
  comments: { number: number; body: string }[];
  spawns: { dir: string; job: Job }[];
  routerCalls: Invocation[];
  routerReply: { text: string };
}

export function harness(cfg: Config = config()): Harness {
  const store = new StateStore(cfg.stateDir);
  const comments: { number: number; body: string }[] = [];
  const spawns: { dir: string; job: Job }[] = [];
  const routerCalls: Invocation[] = [];
  const routerReply = { text: "" };
  const gh = new GitHub(() => "[]");
  gh.comment = (_repo, number, body) => {
    comments.push({ number, body });
  };
  const deps: Deps = {
    cfg,
    store,
    gh,
    spawner: (dir, job) => {
      spawns.push({ dir, job });
      return 4242;
    },
    prepare: (repo, n) => {
      const worktree = join(cfg.worktreeRoot, `${repo.replace("/", "_")}-${n}`);
      mkdirSync(worktree, { recursive: true });
      return { worktree, branch: `feat/sa-${n}` };
    },
    runRouter: (inv) => {
      routerCalls.push(inv);
      return JSON.stringify({ result: routerReply.text, session_id: "router" });
    },
    prompts: { router: "ROUTER", worker: "WORKER" },
    now: () => Date.parse("2026-11-02T00:00:00Z"),
    log: () => {},
  };
  return { deps, store, comments, spawns, routerCalls, routerReply };
}

export function finishJob(dir: string, stdout: string, exitCode = 0): void {
  writeFileSync(join(dir, "out.txt"), stdout);
  writeFileSync(join(dir, "err.txt"), "");
  writeFileSync(join(dir, "result.json"), JSON.stringify({ exitCode }));
}
