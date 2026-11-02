import { execFileSync } from "node:child_process";

export type EventKind = "issue" | "comment" | "review";

export interface GhEvent {
  id: string;
  kind: EventKind;
  repo: string;
  number: number;
  author: string;
  body: string;
  title: string;
  labels: string[];
  updatedAt: string;
}

export interface Channel {
  pollAll(cursors: Record<string, string>, now: number): GhEvent[];
  comment(repo: string, number: number, body: string): void;
}

export type GhRunner = (args: string[], input?: string) => string;

export function realGh(host: string): GhRunner {
  return (args, input) =>
    execFileSync("gh", args, {
      encoding: "utf8",
      input,
      env: { ...process.env, GH_HOST: host },
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
}

function numberFromUrl(url: string): number {
  const m = /\/(?:issues|pulls)\/(\d+)/.exec(url ?? "");
  return m ? Number(m[1]) : 0;
}

function pages(out: string): any[] {
  // `gh api --paginate --slurp` returns an array of pages.
  const parsed = JSON.parse(out || "[]");
  return Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed.flat() : parsed;
}

export class GitHub implements Channel {
  run: GhRunner;
  repos: string[];
  constructor(run: GhRunner, repos: string[] = []) {
    this.run = run;
    this.repos = repos;
  }

  api(path: string): any[] {
    return pages(this.run(["api", "--paginate", "--slurp", path]));
  }

  poll(repo: string, since: string): GhEvent[] {
    const q = `since=${encodeURIComponent(since)}&per_page=100`;
    const events: GhEvent[] = [];
    for (const i of this.api(`repos/${repo}/issues?state=open&${q}`)) {
      events.push({
        id: `issue:${i.id}`,
        kind: "issue",
        repo,
        number: i.number,
        author: i.user?.login ?? "",
        body: i.body ?? "",
        title: i.title ?? "",
        labels: (i.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
        updatedAt: i.updated_at,
      });
    }
    for (const c of this.api(`repos/${repo}/issues/comments?${q}`)) {
      events.push({
        id: `comment:${c.id}`,
        kind: "comment",
        repo,
        number: numberFromUrl(c.issue_url),
        author: c.user?.login ?? "",
        body: c.body ?? "",
        title: "",
        labels: [],
        updatedAt: c.updated_at,
      });
    }
    for (const c of this.api(`repos/${repo}/pulls/comments?${q}`)) {
      events.push({
        id: `review:${c.id}`,
        kind: "review",
        repo,
        number: numberFromUrl(c.pull_request_url),
        author: c.user?.login ?? "",
        body: c.path ? `${c.path}: ${c.body ?? ""}` : c.body ?? "",
        title: "",
        labels: [],
        updatedAt: c.updated_at,
      });
    }
    return events.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  // The first poll of a repo starts from now, not history.
  pollAll(cursors: Record<string, string>, now: number): GhEvent[] {
    const all: GhEvent[] = [];
    for (const repo of this.repos) {
      const since = cursors[repo];
      if (!since) {
        cursors[repo] = new Date(now).toISOString();
        continue;
      }
      const events = this.poll(repo, since);
      all.push(...events);
      const last = events.at(-1)?.updatedAt;
      if (last && last > since) cursors[repo] = last;
    }
    return all;
  }

  comment(repo: string, number: number, body: string): void {
    this.run(["issue", "comment", String(number), "--repo", repo, "--body-file", "-"], body);
  }

  login(): string {
    return this.run(["api", "user", "--jq", ".login"]).trim();
  }
}
