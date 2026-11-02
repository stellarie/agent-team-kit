import type { Runtime } from "./config.ts";

export type Role = "router" | "worker";

export interface RunSpec {
  runtime: Runtime;
  role: Role;
  model: string;
  cwd: string;
  resumeId: string | null;
  testCommand: string | null;
}

export interface Invocation {
  cmd: string;
  args: string[];
}

export const WORKER_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Grep",
  "Glob",
  "Bash(git:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr view:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh issue view:*)",
];

export function claudeTools(spec: RunSpec): string[] {
  if (spec.role === "router") return ["Read"];
  return spec.testCommand ? [...WORKER_TOOLS, `Bash(${spec.testCommand}:*)`] : WORKER_TOOLS;
}

// The prompt always goes on stdin, never in argv.
export function buildInvocation(spec: RunSpec): Invocation {
  if (spec.runtime === "claude") {
    const args = [
      "-p",
      "--output-format",
      "json",
      "--model",
      spec.model,
      "--permission-mode",
      spec.role === "router" ? "default" : "acceptEdits",
      "--allowedTools",
      claudeTools(spec).join(","),
    ];
    if (spec.resumeId) args.push("--resume", spec.resumeId);
    return { cmd: "claude", args };
  }
  const sandbox = spec.role === "router" ? "read-only" : "workspace-write";
  // Shared flags must precede `resume`; it does not inherit them.
  const common = ["exec", "--json", "-m", spec.model, "--sandbox", sandbox, "-C", spec.cwd, "--skip-git-repo-check"];
  if (spec.resumeId) return { cmd: "codex", args: [...common, "resume", spec.resumeId, "-"] };
  return { cmd: "codex", args: [...common, "-"] };
}

export interface RunResult {
  sessionId: string | null;
  text: string;
}

export function parseOutput(runtime: Runtime, stdout: string): RunResult {
  if (runtime === "claude") {
    try {
      const j = JSON.parse(stdout.trim());
      return { sessionId: j.session_id ?? null, text: String(j.result ?? "") };
    } catch {
      return { sessionId: null, text: stdout };
    }
  }
  let sessionId: string | null = null;
  let text = "";
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === "thread.started" && ev.thread_id) sessionId = ev.thread_id;
    if (ev.type === "item.completed" && ev.item?.type === "agent_message") text = ev.item.text ?? text;
  }
  return { sessionId, text };
}
