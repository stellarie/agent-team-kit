import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ThreadStatus = "starting" | "running" | "idle" | "done" | "stalled" | "timeout" | "failed";

export interface ThreadRecord {
  thread: string;
  repo: string;
  number: number;
  branch: string;
  worktree: string;
  sessionId: string | null;
  pid: number | null;
  status: ThreadStatus;
  startedAt: number;
  runStartedAt: number;
  notifiedStatus: ThreadStatus | null;
  pending: string[];
}

export interface QueuedEvent {
  id: string;
  thread: string;
  repo: string;
  number: number;
  author: string;
  body: string;
  title: string;
  attempts: number;
}

export interface State {
  cursors: Record<string, string>;
  queue: QueuedEvent[];
  threads: Record<string, ThreadRecord>;
  seen: string[];
}

export function emptyState(): State {
  return { cursors: {}, queue: [], threads: {}, seen: [] };
}

export class StateStore {
  dir: string;
  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }

  get path(): string {
    return join(this.dir, "state.json");
  }

  load(): State {
    try {
      return { ...emptyState(), ...JSON.parse(readFileSync(this.path, "utf8")) };
    } catch (e: any) {
      if (e.code === "ENOENT") return emptyState();
      throw e;
    }
  }

  save(state: State): void {
    // Keep the dedupe list bounded.
    if (state.seen.length > 5000) state.seen = state.seen.slice(-5000);
    const tmp = `${this.path}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, this.path);
  }

  workerDir(thread: string): string {
    const dir = join(this.dir, "workers", thread.replace(/[^A-Za-z0-9._-]/g, "_"));
    mkdirSync(dir, { recursive: true });
    return dir;
  }
}
