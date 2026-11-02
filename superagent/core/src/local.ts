import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Channel, GhEvent } from "./github.ts";

export interface InboxItem {
  repo: string;
  number: number;
  body: string;
  createdAt: string;
}

// Tasks arrive as files; reports go to one Markdown file per thread.
export class LocalInbox implements Channel {
  dir: string;
  label: string;
  constructor(stateDir: string, label: string) {
    this.dir = join(stateDir, "local");
    this.label = label;
    mkdirSync(join(this.dir, "inbox"), { recursive: true });
    mkdirSync(join(this.dir, "outbox"), { recursive: true });
  }

  nextNumber(): number {
    const path = join(this.dir, "next");
    let n = 1;
    try {
      n = Number.parseInt(readFileSync(path, "utf8"), 10) || 1;
    } catch {
      // First task.
    }
    writeFileSync(path, String(n + 1));
    return n;
  }

  ask(repo: string, body: string, number?: number, now: number = Date.now()): InboxItem {
    const item: InboxItem = { repo, number: number ?? this.nextNumber(), body, createdAt: new Date(now).toISOString() };
    const name = `${now}-${process.pid}-${Math.random().toString(36).slice(2, 8)}.json`;
    writeFileSync(join(this.dir, "inbox", name), JSON.stringify(item));
    return item;
  }

  pollAll(): GhEvent[] {
    const inbox = join(this.dir, "inbox");
    const events: GhEvent[] = [];
    for (const name of readdirSync(inbox).filter((n) => n.endsWith(".json")).sort()) {
      const path = join(inbox, name);
      try {
        const item: InboxItem = JSON.parse(readFileSync(path, "utf8"));
        events.push({
          id: `local:${name}`,
          kind: "comment",
          repo: item.repo,
          number: item.number,
          author: "local",
          body: item.body,
          title: "",
          labels: [this.label],
          updatedAt: item.createdAt,
        });
      } catch {
        // A half-written file; take it next poll.
        continue;
      }
      rmSync(path, { force: true });
    }
    return events;
  }

  outboxPath(repo: string, number: number): string {
    return join(this.dir, "outbox", `${repo}-${number}.md`);
  }

  comment(repo: string, number: number, body: string): void {
    appendFileSync(this.outboxPath(repo, number), `\n## ${new Date().toISOString()}\n\n${body}\n`);
  }

  read(repo: string, number: number): string {
    try {
      return readFileSync(this.outboxPath(repo, number), "utf8");
    } catch {
      return "";
    }
  }
}
