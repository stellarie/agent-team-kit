import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInvocation, parseOutput, type RunSpec } from "../src/runtime.ts";

const base: RunSpec = { runtime: "claude", role: "worker", model: "m", cwd: "/w", resumeId: null, testCommand: null };

test("claude worker argv matches the runtime contract", () => {
  const inv = buildInvocation(base);
  assert.equal(inv.cmd, "claude");
  assert.deepEqual(inv.args.slice(0, 7), ["-p", "--output-format", "json", "--model", "m", "--permission-mode", "acceptEdits"]);
  assert.equal(inv.args[7], "--allowedTools");
  assert.match(inv.args[8], /^Read,Edit,Write,Grep,Glob,Bash\(git:\*\),Bash\(gh pr create:\*\)/);
  assert.deepEqual(buildInvocation({ ...base, resumeId: "s1" }).args.slice(-2), ["--resume", "s1"]);
});

test("claude router gets read-only tools", () => {
  const inv = buildInvocation({ ...base, role: "router" });
  assert.equal(inv.args[inv.args.indexOf("--allowedTools") + 1], "Read");
  assert.equal(inv.args[inv.args.indexOf("--permission-mode") + 1], "default");
});

test("codex argv puts shared flags before resume and never widens the sandbox", () => {
  const c = { ...base, runtime: "codex" as const };
  assert.deepEqual(buildInvocation(c).args, [
    "exec", "--json", "-m", "m", "--sandbox", "workspace-write", "-C", "/w", "--skip-git-repo-check", "-",
  ]);
  assert.deepEqual(buildInvocation({ ...c, resumeId: "u-1" }).args, [
    "exec", "--json", "-m", "m", "--sandbox", "workspace-write", "-C", "/w", "--skip-git-repo-check", "resume", "u-1", "-",
  ]);
  assert.ok(buildInvocation({ ...c, role: "router" }).args.includes("read-only"));
});

test("no runtime or role ever emits a permission bypass", () => {
  for (const runtime of ["claude", "codex"] as const) {
    for (const role of ["router", "worker"] as const) {
      const a = buildInvocation({ ...base, runtime, role, resumeId: "x" }).args.join(" ");
      assert.doesNotMatch(a, /dangerously|bypassPermissions|danger-full-access/);
    }
  }
});

test("output parsing reads the session id for both runtimes", () => {
  assert.deepEqual(parseOutput("claude", '{"result":"hi","session_id":"abc"}'), { sessionId: "abc", text: "hi" });
  const jsonl = [
    '{"type":"thread.started","thread_id":"0199a213"}',
    '{"type":"item.completed","item":{"type":"agent_message","text":"done"}}',
  ].join("\n");
  assert.deepEqual(parseOutput("codex", jsonl), { sessionId: "0199a213", text: "done" });
});
