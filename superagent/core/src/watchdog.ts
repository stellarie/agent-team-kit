import { join } from "node:path";
import type { Config } from "./config.ts";
import type { Channel } from "./github.ts";
import { isAlive, readLockPid } from "./lock.ts";
import type { StateStore, ThreadStatus } from "./state.ts";
import { childPid, readJob } from "./worker.ts";

export interface WatchdogDeps {
  cfg: Config;
  store: StateStore;
  channel: Channel;
  now: () => number;
  kill: (pid: number) => void;
  restartLoop: () => void;
  log: (msg: string) => void;
}

const MESSAGES: Partial<Record<ThreadStatus, string>> = {
  stalled: "The Worker stopped reporting progress, so the watchdog stopped it. Comment again to resume.",
  timeout: "The Worker ran past its time limit, so the watchdog stopped it. Comment again to resume.",
};

export function watchdogPass(d: WatchdogDeps): void {
  const lockPath = join(d.store.dir, "loop.lock");
  const owner = readLockPid(lockPath);
  if (owner === null || !isAlive(owner)) {
    d.log("loop not running; restarting");
    d.restartLoop();
  }

  const s = d.store.load();
  const now = d.now();
  const stallMs = d.cfg.watchdog.stallMinutes * 60_000;
  const maxMs = d.cfg.watchdog.maxRunMinutes * 60_000;

  for (const rec of Object.values(s.threads)) {
    if (rec.status === "running" || rec.status === "starting") {
      const dir = join(d.store.workerDir(rec.thread), "job");
      const job = readJob(dir);
      if (job.finished) continue;
      let next: ThreadStatus | null = null;
      if (now - rec.runStartedAt > maxMs) next = "timeout";
      else if (now - (job.heartbeatAt ?? rec.runStartedAt) > stallMs) next = "stalled";
      if (!next) continue;
      for (const pid of [childPid(dir), rec.pid]) if (pid) d.kill(pid);
      rec.pid = null;
      rec.status = next;
    }
    const msg = MESSAGES[rec.status];
    if (msg && rec.notifiedStatus !== rec.status) {
      d.channel.comment(rec.repo, rec.number, msg);
      rec.notifiedStatus = rec.status;
    }
  }
  d.store.save(s);
}
