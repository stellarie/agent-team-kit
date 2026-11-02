import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { acquireLock, readLockPid } from "../src/lock.ts";
import { tmp } from "./helpers.ts";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "superagent.mjs");

function writeConfig(stateDir: string): string {
  const path = join(tmp(), "config.json");
  writeFileSync(path, JSON.stringify({
    runtime: "claude",
    repos: ["acme/app"],
    allow: { logins: ["alice"] },
    policy: { allowedOwners: ["acme"] },
    models: { router: "r", worker: "w" },
    worktreeRoot: tmp(),
    stateDir,
  }));
  return path;
}

test("a second start exits non-zero while the loop lock is live", () => {
  const stateDir = tmp();
  writeFileSync(join(stateDir, "loop.lock"), String(process.pid));
  const r = spawnSync(process.execPath, [BIN, "start", "--config", writeConfig(stateDir)], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, new RegExp(`already running \\(pid ${process.pid}\\)`));
});

test("a lock left by a dead pid is taken over", () => {
  const path = join(tmp(), "loop.lock");
  const dead = spawnSync(process.execPath, ["-e", "0"]).pid!;
  writeFileSync(path, String(dead));
  const release = acquireLock(path);
  assert.equal(readLockPid(path), process.pid);
  release();
  assert.equal(readLockPid(path), null);
});

test("a live lock refuses a second owner in process", () => {
  const path = join(tmp(), "loop.lock");
  const release = acquireLock(path);
  assert.throws(() => acquireLock(path, process.pid + 1), /already running/);
  release();
});
