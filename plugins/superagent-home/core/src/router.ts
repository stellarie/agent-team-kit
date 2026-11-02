import type { QueuedEvent } from "./state.ts";

export type Action = "start" | "ignore" | "ask";

export interface Decision {
  thread: string;
  action: Action;
  reply: string;
}

const ACTIONS: Action[] = ["start", "ignore", "ask"];

export function buildRouterPrompt(system: string, queue: QueuedEvent[], live: string[], maxChars = 2000): string {
  const events = queue.map((e) => ({
    thread: e.thread,
    author: e.author,
    title: e.title,
    body: e.body.length > maxChars ? `${e.body.slice(0, maxChars)} [truncated]` : e.body,
  }));
  return `${system}\n\nLive threads: ${JSON.stringify(live)}\n\nEvents:\n${JSON.stringify(events, null, 2)}\n`;
}

function words(s: string): number {
  return s.trim() === "" ? 0 : s.trim().split(/\s+/).length;
}

// Returns null when the text is not a valid decision list.
export function parseDecisions(text: string, threads: ReadonlySet<string>): Decision[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let j: any;
  try {
    j = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(j?.decisions)) return null;
  const out: Decision[] = [];
  for (const d of j.decisions) {
    if (typeof d?.thread !== "string" || !threads.has(d.thread)) return null;
    if (!ACTIONS.includes(d.action)) return null;
    const reply = typeof d.reply === "string" ? d.reply : "";
    if (words(reply) > 100) return null;
    out.push({ thread: d.thread, action: d.action, reply });
  }
  return out;
}
