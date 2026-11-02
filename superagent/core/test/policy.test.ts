import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfigError, validateConfig } from "../src/config.ts";

const ok = {
  runtime: "codex",
  repos: ["work/app"],
  allow: { logins: ["me"] },
  policy: { allowedRuntimes: ["codex", "claude"], allowedOwners: ["work"], maxWorkersCap: 1 },
  models: { router: "r", worker: "w" },
  worktreeRoot: "/tmp/w",
};

function field(raw: any): string {
  try {
    validateConfig(raw);
  } catch (e) {
    assert.ok(e instanceof ConfigError);
    return e.field;
  }
  return "none";
}

test("a runtime outside allowedRuntimes is rejected", () => {
  assert.equal(field({ ...ok, policy: { ...ok.policy, allowedRuntimes: ["codex"] }, runtime: "claude" }), "runtime");
});

test("a repo owner outside allowedOwners is rejected", () => {
  assert.equal(field({ ...ok, repos: ["personal/side"] }), "repos");
});

test("an empty allowlist or repo list is rejected", () => {
  assert.equal(field({ ...ok, allow: { logins: [] } }), "allow.logins");
  assert.equal(field({ ...ok, repos: [] }), "repos");
});

test("maxWorkers above the cap is clamped and logged", () => {
  const logs: string[] = [];
  const cfg = validateConfig({ ...ok, maxWorkers: 4 }, (m) => logs.push(m));
  assert.equal(cfg.maxWorkers, 1);
  assert.match(logs[0], /clamped/);
});
