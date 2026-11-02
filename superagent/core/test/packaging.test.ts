import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateConfig } from "../src/config.ts";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PLUGINS = join(KIT, "plugins");
const json = (p: string) => JSON.parse(readFileSync(join(KIT, p), "utf8"));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

function filled(raw: any): any {
  return { ...raw, repos: ["work/app"], policy: { ...raw.policy, allowedOwners: ["work"] } };
}

test("both marketplaces list only plugins that exist", () => {
  const claude = json(".claude-plugin/marketplace.json");
  assert.deepEqual(claude.plugins.map((p: any) => p.name), ["superagent-home", "superagent-corp"]);
  for (const p of claude.plugins) assert.ok(existsSync(join(KIT, p.source, ".claude-plugin", "plugin.json")));
  const codex = json(".agents/plugins/marketplace.json");
  assert.equal(codex.plugins[0].source.source, "local");
  assert.ok(existsSync(join(KIT, codex.plugins[0].source.path, "plugin.json")));
});

test("the Codex manifest follows the portable schema and ships skills, not commands", () => {
  const m = json("plugins/superagent-codex/plugin.json");
  assert.equal(m.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(m.name, "superagent-codex");
  assert.match(m.version, /^\d+\.\d+\.\d+$/);
  assert.equal(existsSync(join(PLUGINS, "superagent-codex", "commands")), false);
  for (const s of ["start", "stop", "status", "doctor", "watchdog"]) {
    const md = readFileSync(join(PLUGINS, "superagent-codex", "skills", `superagent-${s}`, "SKILL.md"), "utf8");
    assert.match(md, new RegExp(`^---\\nname: superagent-${s}\\n`));
  }
});

test("the corporate examples cap Workers at 1, carry no persona, and pick their runtime", () => {
  for (const [name, runtime] of [["superagent-corp", "claude"], ["superagent-codex", "codex"]]) {
    const cfg = validateConfig(filled(json(`plugins/${name}/config.example.json`)));
    assert.equal(cfg.runtime, runtime);
    assert.equal(cfg.maxWorkers, 1);
    assert.equal(cfg.promptOverlay, null);
  }
  assert.equal(validateConfig(filled(json("plugins/superagent-home/config.example.json"))).maxWorkers, 2);
});

test("the corporate plugins name no family member or personal account", () => {
  for (const name of ["superagent-corp", "superagent-codex"]) {
    for (const f of files(join(PLUGINS, name))) {
      const text = readFileSync(f, "utf8");
      assert.doesNotMatch(text, /chloe|yuu|sherry|oniichan|imouto|momo/i, f);
    }
  }
});
