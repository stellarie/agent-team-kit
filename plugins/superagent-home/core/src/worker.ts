import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Invocation } from "./runtime.ts";

export const RUNNER = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "worker-runner.mjs");

export interface Job extends Invocation {
  cwd: string;
  prompt: string;
}

export interface JobStatus {
  heartbeatAt: number | null;
  finished: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export type Spawner = (jobDir: string, job: Job) => number;

// Detached, so a long Worker never blocks the loop.
export const realSpawner: Spawner = (jobDir, job) => {
  const child = spawn(process.execPath, [RUNNER, jobDir], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return child.pid ?? 0;
};

export function startJob(jobDir: string, job: Job, spawner: Spawner): number {
  mkdirSync(jobDir, { recursive: true });
  for (const f of ["result.json", "out.txt", "err.txt", "heartbeat", "child.pid"]) {
    rmSync(join(jobDir, f), { force: true });
  }
  writeFileSync(join(jobDir, "job.json"), JSON.stringify(job, null, 2));
  return spawner(jobDir, job);
}

function readOr(path: string, fallback: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return fallback;
  }
}

export function readJob(jobDir: string): JobStatus {
  const hb = Number.parseInt(readOr(join(jobDir, "heartbeat"), ""), 10);
  const resultPath = join(jobDir, "result.json");
  const finished = existsSync(resultPath);
  const result = finished ? JSON.parse(readOr(resultPath, "{}")) : null;
  return {
    heartbeatAt: Number.isFinite(hb) ? hb : null,
    finished,
    exitCode: result ? result.exitCode : null,
    stdout: finished ? readOr(join(jobDir, "out.txt"), "") : "",
    stderr: finished ? readOr(join(jobDir, "err.txt"), "") : "",
  };
}

export function childPid(jobDir: string): number | null {
  const n = Number.parseInt(readOr(join(jobDir, "child.pid"), ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function killTree(pid: number): void {
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // Already gone.
  }
}

export type Git = (args: string[], cwd?: string) => string;

export const realGit: Git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true });

export function prepareWorktree(
  root: string,
  repo: string,
  number: number,
  git: Git,
  gh: (args: string[]) => string,
): { worktree: string; branch: string } {
  const safe = repo.replace("/", "_");
  const clone = join(root, "_repos", safe);
  const worktree = join(root, `${safe}-${number}`);
  const branch = `feat/sa-${number}`;
  if (!existsSync(clone)) {
    mkdirSync(dirname(clone), { recursive: true });
    gh(["repo", "clone", repo, clone]);
  }
  git(["fetch", "origin", "--prune"], clone);
  if (!existsSync(worktree)) {
    const head = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], clone).trim();
    git(["worktree", "add", "-B", branch, worktree, head], clone);
  }
  return { worktree, branch };
}

// Branches from the local checkout; no clone, no fetch.
export function prepareLocalWorktree(
  root: string,
  name: string,
  source: string,
  number: number,
  git: Git,
): { worktree: string; branch: string } {
  const worktree = join(root, `${name}-${number}`);
  const branch = `feat/sa-${number}`;
  if (!existsSync(worktree)) {
    mkdirSync(root, { recursive: true });
    git(["worktree", "add", "-B", branch, worktree, "HEAD"], source);
  }
  return { worktree, branch };
}
