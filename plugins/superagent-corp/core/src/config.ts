import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export type Runtime = "claude" | "codex";
export type Source = "github" | "local";
export type RouterMode = "always" | "label-starts" | "off";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Budget {
  // Claude: --bare --strict-mcp-config, which needs API-key auth.
  lean: boolean;
  effort: Effort | null;
  maxUsdPerRun: number | null;
  routerBodyChars: number;
  reportWords: number;
}

export interface Config {
  runtime: Runtime;
  source: Source;
  repos: string[];
  localRepos: Record<string, string>;
  ghHost: string;
  allow: { logins: string[] };
  policy: {
    allowedRuntimes: Runtime[];
    allowedOwners: string[];
    maxWorkersCap: number;
    allowOwnLogin: boolean;
    forbiddenLogins: string[];
  };
  trigger: { label: string; mention: string };
  router: RouterMode;
  pollSeconds: number;
  maxWorkers: number;
  models: { router: string; worker: string };
  budget: Budget;
  worktreeRoot: string;
  watchdog: { stallMinutes: number; maxRunMinutes: number };
  stateDir: string;
  promptOverlay: string | null;
  testCommand: string | null;
}

export class ConfigError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.field = field;
  }
}

const RUNTIMES: Runtime[] = ["claude", "codex"];
const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];
const ROUTER_MODES: RouterMode[] = ["always", "label-starts", "off"];

export const DEFAULT_CONFIG_PATH = join(homedir(), ".superagent", "config.json");

export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return join(homedir(), p.slice(2));
  return p;
}

function nonEmptyStrings(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.length === 0 || !v.every((s) => typeof s === "string" && s.length > 0)) {
    throw new ConfigError(field, "must be a non-empty list of strings");
  }
  return v as string[];
}

function positive(v: unknown, field: string, fallback: number): number {
  if (v === undefined) return fallback;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 1) {
    throw new ConfigError(field, "must be a number >= 1");
  }
  return v;
}

function oneOf<T extends string>(v: unknown, allowed: T[], field: string, fallback: T): T {
  if (v === undefined) return fallback;
  if (!allowed.includes(v as T)) throw new ConfigError(field, `must be one of ${allowed.join(", ")}`);
  return v as T;
}

function runtimeOf(v: unknown, field: string): Runtime {
  if (!RUNTIMES.includes(v as Runtime)) {
    throw new ConfigError(field, `unknown runtime ${JSON.stringify(v)}`);
  }
  return v as Runtime;
}

function budgetOf(b: any): Budget {
  b = b ?? {};
  const effort = b.effort === undefined || b.effort === null ? null : oneOf(b.effort, EFFORTS, "budget.effort", "low");
  let maxUsdPerRun: number | null = null;
  if (b.maxUsdPerRun !== undefined && b.maxUsdPerRun !== null) {
    if (typeof b.maxUsdPerRun !== "number" || !(b.maxUsdPerRun > 0)) {
      throw new ConfigError("budget.maxUsdPerRun", "must be a number > 0");
    }
    maxUsdPerRun = b.maxUsdPerRun;
  }
  return {
    lean: b.lean === true,
    effort,
    maxUsdPerRun,
    routerBodyChars: positive(b.routerBodyChars, "budget.routerBodyChars", 2000),
    reportWords: positive(b.reportWords, "budget.reportWords", 200),
  };
}

function localReposOf(v: unknown): Record<string, string> {
  if (v === null || typeof v !== "object" || Object.keys(v as object).length === 0) {
    throw new ConfigError("localRepos", "must map at least one name to a repository path");
  }
  const out: Record<string, string> = {};
  for (const [name, path] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new ConfigError("localRepos", `${name} is not a simple name`);
    if (typeof path !== "string" || !isAbsolute(expandHome(path))) {
      throw new ConfigError("localRepos", `${name} must map to an absolute path`);
    }
    out[name] = resolve(expandHome(path));
  }
  return out;
}

export function validateConfig(raw: any, log: (msg: string) => void = () => {}): Config {
  if (raw === null || typeof raw !== "object") throw new ConfigError("config", "must be an object");

  const runtime = runtimeOf(raw.runtime, "runtime");
  const source = oneOf<Source>(raw.source, ["github", "local"], "source", "github");
  const p = raw.policy ?? {};
  const allowedRuntimes = (p.allowedRuntimes ?? RUNTIMES).map((r: unknown) =>
    runtimeOf(r, "policy.allowedRuntimes"),
  );
  if (!allowedRuntimes.includes(runtime)) {
    throw new ConfigError("runtime", `${runtime} is not in policy.allowedRuntimes`);
  }

  let repos: string[] = [];
  let logins: string[] = [];
  let allowedOwners: string[] = [];
  let localRepos: Record<string, string> = {};
  if (source === "github") {
    repos = nonEmptyStrings(raw.repos, "repos");
    for (const r of repos) {
      if (!/^[^/\s]+\/[^/\s]+$/.test(r)) throw new ConfigError("repos", `${r} is not owner/name`);
    }
    logins = nonEmptyStrings(raw.allow?.logins, "allow.logins");
    allowedOwners = nonEmptyStrings(p.allowedOwners, "policy.allowedOwners");
    for (const r of repos) {
      const owner = r.split("/")[0];
      if (!allowedOwners.includes(owner)) {
        throw new ConfigError("repos", `owner ${owner} is not in policy.allowedOwners`);
      }
    }
  } else {
    localRepos = localReposOf(raw.localRepos);
  }

  const maxWorkersCap = positive(p.maxWorkersCap, "policy.maxWorkersCap", 2);
  let maxWorkers = positive(raw.maxWorkers, "maxWorkers", 1);
  if (maxWorkers > maxWorkersCap) {
    log(`maxWorkers ${maxWorkers} clamped to policy.maxWorkersCap ${maxWorkersCap}`);
    maxWorkers = maxWorkersCap;
  }

  if (typeof raw.worktreeRoot !== "string" || raw.worktreeRoot.length === 0) {
    throw new ConfigError("worktreeRoot", "must be a path");
  }
  if (typeof raw.models?.router !== "string" || typeof raw.models?.worker !== "string") {
    throw new ConfigError("models", "router and worker must be model ids");
  }

  return {
    runtime,
    source,
    repos,
    localRepos,
    ghHost: typeof raw.ghHost === "string" ? raw.ghHost : "github.com",
    allow: { logins },
    policy: {
      allowedRuntimes,
      allowedOwners,
      maxWorkersCap,
      allowOwnLogin: p.allowOwnLogin === true,
      forbiddenLogins: Array.isArray(p.forbiddenLogins) ? p.forbiddenLogins : [],
    },
    trigger: {
      label: raw.trigger?.label ?? "superagent",
      mention: raw.trigger?.mention ?? "@superagent",
    },
    router: oneOf(raw.router, ROUTER_MODES, "router", source === "local" ? "off" : "always"),
    pollSeconds: positive(raw.pollSeconds, "pollSeconds", 60),
    maxWorkers,
    models: { router: raw.models.router, worker: raw.models.worker },
    budget: budgetOf(raw.budget),
    worktreeRoot: resolve(expandHome(raw.worktreeRoot)),
    watchdog: {
      stallMinutes: positive(raw.watchdog?.stallMinutes, "watchdog.stallMinutes", 20),
      maxRunMinutes: positive(raw.watchdog?.maxRunMinutes, "watchdog.maxRunMinutes", 120),
    },
    stateDir: resolve(expandHome(raw.stateDir ?? "~/.superagent/state")),
    promptOverlay: typeof raw.promptOverlay === "string" ? resolve(expandHome(raw.promptOverlay)) : null,
    testCommand: typeof raw.testCommand === "string" ? raw.testCommand : null,
  };
}

export function loadConfig(path: string, log?: (msg: string) => void): Config {
  const text = readFileSync(path, "utf8");
  return validateConfig(JSON.parse(text), log);
}
