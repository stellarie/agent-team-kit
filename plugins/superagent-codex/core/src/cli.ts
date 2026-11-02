import { execFileSync, spawn } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG_PATH, expandHome, loadConfig, type Config } from "./config.ts";
import { recover, tick, type Deps } from "./dispatch.ts";
import { GitHub, realGh, type Channel } from "./github.ts";
import { LocalInbox } from "./local.ts";
import { acquireLock, AlreadyRunning, isAlive, readLockPid } from "./lock.ts";
import { StateStore } from "./state.ts";
import { watchdogPass } from "./watchdog.ts";
import { killTree, prepareLocalWorktree, prepareWorktree, realGit, realSpawner } from "./worker.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, "bin", "superagent.mjs");

function log(msg: string): void {
  process.stderr.write(`[superagent ${new Date().toISOString()}] ${msg}\n`);
}

function prompts(cfg: Config): { router: string; worker: string } {
  const read = (n: string) => readFileSync(join(ROOT, "prompts", n), "utf8");
  const overlay = cfg.promptOverlay ? `\n\n${readFileSync(cfg.promptOverlay, "utf8")}` : "";
  const worker = cfg.source === "local" ? "worker-local.md" : "worker.md";
  return { router: read("router.md") + overlay, worker: read(worker) + overlay };
}

function runCli(cmd: string, args: string[], input: string, cwd: string): string {
  const isCmd = /\.(cmd|bat)$/i.test(cmd);
  return execFileSync(cmd, args, {
    input,
    cwd,
    encoding: "utf8",
    shell: isCmd,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10 * 60_000,
  });
}

function channel(cfg: Config): Channel {
  return cfg.source === "local" ? new LocalInbox(cfg.stateDir, cfg.trigger.label) : new GitHub(realGh(cfg.ghHost), cfg.repos);
}

// Windows npm shims are .cmd files spawn cannot find bare.
function resolveCmd(cmd: string): string {
  if (process.platform !== "win32" || /[\/.]/.test(cmd)) return cmd;
  try {
    const hits = execFileSync("where", [cmd], { encoding: "utf8", windowsHide: true }).split(/\r?\n/);
    return hits.find((h) => /\.(exe|cmd|bat)$/i.test(h.trim()))?.trim() ?? cmd;
  } catch {
    return cmd;
  }
}

function deps(cfg: Config, store: StateStore): Deps {
  const prepare: Deps["prepare"] =
    cfg.source === "local"
      ? (repo, n) => prepareLocalWorktree(cfg.worktreeRoot, repo, cfg.localRepos[repo], n, realGit)
      : (repo, n) => prepareWorktree(cfg.worktreeRoot, repo, n, realGit, (a) => realGh(cfg.ghHost)(a));
  return {
    cfg,
    store,
    channel: channel(cfg),
    spawner: realSpawner,
    prepare,
    runRouter: (inv, prompt) => runCli(resolveCmd(inv.cmd), inv.args, prompt, cfg.worktreeRoot),
    prompts: prompts(cfg),
    now: Date.now,
    log,
  };
}

function lockPath(store: StateStore): string {
  return join(store.dir, "loop.lock");
}

function startDetached(configPath: string, stateDir: string): number {
  const out = openSync(join(stateDir, "loop.log"), "a");
  const child = spawn(process.execPath, [BIN, "run", "--config", configPath], {
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  child.unref();
  return child.pid ?? 0;
}

async function runLoop(cfg: Config, store: StateStore): Promise<void> {
  const release = acquireLock(lockPath(store));
  const d = deps(cfg, store);
  const stop = () => {
    release();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const s = store.load();
  recover(d, s);
  store.save(s);
  log(`loop started, runtime ${cfg.runtime}, source ${cfg.source}`);
  for (;;) {
    try {
      tick(d);
    } catch (e) {
      log(`tick failed: ${e}`);
    }
    await new Promise((r) => setTimeout(r, cfg.pollSeconds * 1000));
  }
}

function which(cmd: string): string | null {
  try {
    const out = execFileSync(process.platform === "win32" ? "where" : "which", [cmd], {
      encoding: "utf8",
      windowsHide: true,
    });
    return out.split(/\r?\n/)[0].trim() || null;
  } catch {
    return null;
  }
}

function doctor(cfg: Config): boolean {
  const local: [string, () => string | true][] = Object.entries(cfg.localRepos).map(([n, p]) => [
    `local repo ${n}`,
    () => (existsSync(join(p, ".git")) ? true : `${p} is not a git checkout`),
  ]);
  const github: [string, () => string | true][] = [
    ["gh on PATH", () => (which("gh") ? true : "gh not found")],
    [
      `gh signed in to ${cfg.ghHost}`,
      () => {
        try {
          execFileSync("gh", ["auth", "status", "--hostname", cfg.ghHost], { stdio: "ignore", windowsHide: true });
          return true;
        } catch {
          return `run: gh auth login --hostname ${cfg.ghHost}`;
        }
      },
    ],
    [
      "gh login is an agent account",
      () => {
        const login = new GitHub(realGh(cfg.ghHost)).login();
        if (cfg.policy.allowOwnLogin) return true;
        if (cfg.policy.forbiddenLogins.includes(login)) return `gh is signed in as ${login}; use a dedicated agent account`;
        return true;
      },
    ],
  ];
  const checks: [string, () => string | true][] = [
    ["git on PATH", () => (which("git") ? true : "git not found")],
    [`${cfg.runtime} on PATH`, () => (which(cfg.runtime) ? true : `${cfg.runtime} not found`)],
    ...(cfg.source === "local" ? local : github),
    [
      `${cfg.runtime} signed in`,
      () => {
        const args = cfg.runtime === "codex" ? ["login", "status"] : ["auth", "status"];
        try {
          runCli(resolveCmd(cfg.runtime), args, "", process.cwd());
          return true;
        } catch {
          return `${cfg.runtime} ${args.join(" ")} failed`;
        }
      },
    ],
    ["prompt overlay readable", () => (!cfg.promptOverlay || existsSync(cfg.promptOverlay) ? true : `${cfg.promptOverlay} missing`)],
  ];
  let ok = true;
  for (const [name, check] of checks) {
    let r: string | true;
    try {
      r = check();
    } catch (e) {
      r = String(e);
    }
    console.log(`${r === true ? "pass" : "FAIL"}  ${name}${r === true ? "" : `: ${r}`}`);
    if (r !== true) ok = false;
  }
  return ok;
}

function status(store: StateStore): void {
  const pid = readLockPid(lockPath(store));
  console.log(`loop: ${pid !== null && isAlive(pid) ? `running (pid ${pid})` : "stopped"}`);
  const s = store.load();
  console.log(`queued events: ${s.queue.length}`);
  const rows = Object.values(s.threads);
  if (rows.length === 0) return console.log("threads: none");
  for (const r of rows) console.log(`${r.status.padEnd(8)} ${r.thread}  ${r.branch}  session ${r.sessionId ?? "-"}`);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function local(cmd: string, argv: string[], cfg: Config): number {
  if (cfg.source !== "local") {
    console.error(`${cmd} needs "source": "local"`);
    return 2;
  }
  const inbox = new LocalInbox(cfg.stateDir, cfg.trigger.label);
  const names = Object.keys(cfg.localRepos);
  const repo = flag(argv, "--repo") ?? (names.length === 1 ? names[0] : undefined);
  if (!repo || !cfg.localRepos[repo]) {
    console.error(`pass --repo <${names.join("|")}>`);
    return 2;
  }
  const thread = flag(argv, "--thread");
  if (cmd === "show") {
    if (!thread) {
      console.error("pass --thread N");
      return 2;
    }
    console.log(inbox.read(repo, Number(thread)) || "no report yet");
    return 0;
  }
  const skip = new Set(["--repo", "--thread", "--config"]);
  const words = argv.slice(1).filter((a, i, all) => !skip.has(a) && !skip.has(all[i - 1] ?? ""));
  if (words.length === 0) {
    console.error('usage: superagent ask "<task>" [--repo name] [--thread N]');
    return 2;
  }
  const item = inbox.ask(repo, words.join(" "), thread ? Number(thread) : undefined);
  console.log(`queued ${repo}#${item.number}; read it with: superagent show --repo ${repo} --thread ${item.number}`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const cmd = argv[0] ?? "help";
  const i = argv.indexOf("--config");
  const configPath = expandHome(i >= 0 ? argv[i + 1] : process.env.SUPERAGENT_CONFIG ?? DEFAULT_CONFIG_PATH);
  if (cmd === "help" || cmd === "--help") {
    console.log("usage: superagent <start|stop|status|doctor|watchdog|run|ask|show> [--config path]");
    return 0;
  }
  const cfg = loadConfig(configPath, log);
  const store = new StateStore(cfg.stateDir);
  switch (cmd) {
    case "run":
      await runLoop(cfg, store);
      return 0;
    case "start": {
      const pid = readLockPid(lockPath(store));
      if (pid !== null && isAlive(pid)) {
        console.error(new AlreadyRunning(pid).message);
        return 1;
      }
      console.log(`started (pid ${startDetached(configPath, store.dir)}); log: ${join(store.dir, "loop.log")}`);
      return 0;
    }
    case "stop": {
      const pid = readLockPid(lockPath(store));
      if (pid === null || !isAlive(pid)) {
        console.log("not running");
        return 0;
      }
      killTree(pid);
      console.log(`stopped (pid ${pid})`);
      return 0;
    }
    case "status":
      status(store);
      return 0;
    case "doctor":
      return doctor(cfg) ? 0 : 1;
    case "ask":
    case "show":
      return local(cmd, argv, cfg);
    case "watchdog":
      watchdogPass({
        cfg,
        store,
        channel: channel(cfg),
        now: Date.now,
        kill: killTree,
        restartLoop: () => startDetached(configPath, store.dir),
        log,
      });
      return 0;
    default:
      console.error(`unknown command ${cmd}`);
      return 2;
  }
}
