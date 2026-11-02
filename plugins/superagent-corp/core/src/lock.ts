import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { dirname } from "node:path";

export class AlreadyRunning extends Error {
  pid: number;
  constructor(pid: number) {
    super(`already running (pid ${pid})`);
    this.pid = pid;
  }
}

export function isAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === "EPERM";
  }
}

export function readLockPid(path: string): number | null {
  try {
    const pid = Number.parseInt(readFileSync(path, "utf8").trim(), 10);
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

export function acquireLock(path: string, pid: number = process.pid): () => void {
  mkdirSync(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx");
      writeSync(fd, String(pid));
      closeSync(fd);
      return () => {
        if (readLockPid(path) === pid) rmSync(path, { force: true });
      };
    } catch (e: any) {
      if (e.code !== "EEXIST") throw e;
      const owner = readLockPid(path);
      if (owner !== null && isAlive(owner)) throw new AlreadyRunning(owner);
      // Stale lock: the owner is gone.
      rmSync(path, { force: true });
    }
  }
  throw new Error(`could not take lock ${path}`);
}
