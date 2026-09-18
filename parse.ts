export type SandboxAction =
  | { kind: "url"; url: string }
  | { kind: "html"; html: string; title: string };

export type ParsedLight = {
  thinking: string | null;
  thinkingOpen: boolean;
  body: string;
  actions: SandboxAction[];
};

const OPEN_RE = /\[\[open:(https?:\/\/[^\s\]]+)\]\]/gi;
const HTML_RE = /\[\[html(?:\s+title="([^"]*)")?\]\]([\s\S]*?)\[\[\/html\]\]/gi;
const THINK_OPEN = /<thinking>/i;
const THINK_FULL = /<thinking>([\s\S]*?)<\/thinking>/i;

export function parseLightReply(text: string): ParsedLight {
  let working = text;
  let thinking: string | null = null;
  let thinkingOpen = false;

  const full = working.match(THINK_FULL);
  if (full) {
    thinking = full[1]?.trim() || null;
    working = working.replace(THINK_FULL, "").trimStart();
  } else if (THINK_OPEN.test(working)) {
    thinkingOpen = true;
    const idx = working.toLowerCase().indexOf("<thinking>");
    thinking = working.slice(idx + "<thinking>".length).trim();
    working = "";
  }

  const actions: SandboxAction[] = [];

  working = working.replace(HTML_RE, (_m, title: string | undefined, html: string) => {
    actions.push({
      kind: "html",
      html: html.trim(),
      title: (title || "Sandbox page").trim() || "Sandbox page",
    });
    return "";
  });

  working = working.replace(OPEN_RE, (_m, url: string) => {
    actions.push({ kind: "url", url: url.trim() });
    return "";
  });

  return {
    thinking,
    thinkingOpen,
    body: working.replace(/^\s+/, ""),
    actions,
  };
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
