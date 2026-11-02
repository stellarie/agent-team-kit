import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { readJob, realSpawner, startJob } from "../src/worker.ts";
import { tmp } from "./helpers.ts";

test("a detached runner feeds the prompt on stdin and records output and exit code", async () => {
  const dir = join(tmp(), "job");
  const fake = join(tmp(), "fake-cli.mjs");
  writeFileSync(fake, `let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log(JSON.stringify({result:s.toUpperCase(),session_id:"f1"}))})`);
  startJob(dir, { cmd: process.execPath, args: [fake], cwd: tmp(), prompt: "hello worker" }, realSpawner);
  let job = readJob(dir);
  for (let i = 0; i < 100 && !job.finished; i++) {
    await new Promise((r) => setTimeout(r, 100));
    job = readJob(dir);
  }
  assert.equal(job.finished, true);
  assert.equal(job.exitCode, 0);
  assert.ok(job.heartbeatAt);
  assert.deepEqual(JSON.parse(job.stdout), { result: "HELLO WORKER", session_id: "f1" });
});
