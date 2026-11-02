#!/usr/bin/env node
// Runs one CLI turn for a Worker or Router.
// Writes heartbeat, out.txt, and result.json in the job dir.
import { spawn } from "node:child_process";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const job = JSON.parse(readFileSync(join(dir, "job.json"), "utf8"));

function writeAtomic(name, text) {
  const tmp = join(dir, `${name}.tmp`);
  writeFileSync(tmp, text);
  renameSync(tmp, join(dir, name));
}

const beat = () => writeAtomic("heartbeat", String(Date.now()));
beat();
const timer = setInterval(beat, 15_000);

const isCmd = /\.(cmd|bat)$/i.test(job.cmd);
const quote = (a) => (/[\s"&|<>^()%!,]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);
const child = spawn(isCmd ? `"${job.cmd}"` : job.cmd, isCmd ? job.args.map(quote) : job.args, {
  cwd: job.cwd,
  shell: isCmd,
  windowsHide: true,
  stdio: ["pipe", "pipe", "pipe"],
});
writeAtomic("child.pid", String(child.pid ?? ""));

let out = "";
let err = "";
child.stdout.on("data", (d) => (out += d));
child.stderr.on("data", (d) => (err += d));
child.stdin.end(job.prompt);

function finish(code) {
  clearInterval(timer);
  writeFileSync(join(dir, "out.txt"), out);
  writeFileSync(join(dir, "err.txt"), err);
  writeAtomic("result.json", JSON.stringify({ exitCode: code, finishedAt: Date.now() }));
  process.exit(0);
}
child.on("error", (e) => {
  err += String(e);
  finish(-1);
});
child.on("close", (code) => finish(code ?? -1));
