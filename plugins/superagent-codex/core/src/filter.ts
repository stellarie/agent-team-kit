import type { Config } from "./config.ts";
import type { GhEvent } from "./github.ts";

export function threadKey(repo: string, number: number): string {
  return `${repo}#${number}`;
}

export function isTriggered(e: GhEvent, cfg: Config): boolean {
  const mention = cfg.trigger.mention.toLowerCase();
  return (
    e.labels.includes(cfg.trigger.label) ||
    e.body.toLowerCase().includes(mention) ||
    e.title.toLowerCase().includes(mention)
  );
}

export function keepEvent(e: GhEvent, cfg: Config, owned: ReadonlySet<string>): boolean {
  if (e.number <= 0) return false;
  // Only the machine's own user can write the inbox.
  if (cfg.source === "local") return e.author === "local" && e.repo in cfg.localRepos;
  if (!cfg.repos.includes(e.repo)) return false;
  if (!cfg.allow.logins.includes(e.author)) return false;
  if (owned.has(threadKey(e.repo, e.number))) return true;
  return isTriggered(e, cfg);
}
