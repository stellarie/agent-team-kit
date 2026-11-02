import type { Budget, Runtime, Source } from "./config.ts";

export type Role = "router" | "worker";

export interface RunSpec {
  runtime: Runtime;
  role: Role;
  model: string;
  cwd: string;
  resumeId: string | null;
  testCommand: string | null;
  source?: Source;
  budget?: Budget;
}

export interface Invocation {
  cmd: string;
  args: string[];
}

export const WORKER_TOOLS = ["Read", "Edit", "Write", "Grep", "Glob", "Bash(git:*)"];

export const GITHUB_TOOLS = [
  "Bash(gh pr create:*)",
  "Bash(gh pr view:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh issue view:*)",
];

export function claudeTools(spec: RunSpec): string[] {
  if (spec.role === "router") return ["Read"];
  const tools = spec.source === "local" ? WORKER_TOOLS : [...WORKER_TOOLS, ...GITHUB_TOOLS];
  return spec.testCommand ? [...tools, `Bash(${spec.testCommand}:*)`] : tools;
}

function claudeBudget(b: Budget | undefined): string[] {
  if (!b) return [];
  const out: string[] = [];
  if (b.lean) out.push("--bare", "--strict-mcp-config", "--exclude-dynamic-system-prompt-sections");
  if (b.effort) out.push("--effort", b.effort);
  if (b.maxUsdPerRun) out.push("--max-budget-usd", String(b.maxUsdPerRun));
  return out;
}

function codexBudget(b: Budget | undefined): string[] {
  return b?.effort ? ["-c", `model_reasoning_effort="${b.effort}"`] : [];
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
      ...claudeBudget(spec.budget),
    ];
    if (spec.resumeId) args.push("--resume", spec.resumeId);
    return { cmd: "claude", args };
  }
  const sandbox = spec.role === "router" ? "read-only" : "workspace-write";
  // Shared flags must precede `resume`; it does not inherit them.
  const common = [
    "exec", "--json", "-m", spec.model, "--sandbox", sandbox, "-C", spec.cwd, "--skip-git-repo-check",
    ...codexBudget(spec.budget),
  ];
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
