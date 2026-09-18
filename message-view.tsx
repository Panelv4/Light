import { parseLightReply } from "@/lib/light/parse";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/lib/light/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function inlineFormat(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="rounded-sm bg-void-elevated px-1 py-0.5 font-mono text-[0.85em] text-ink">$1</code>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a class="underline decoration-void-line underline-offset-2 hover:text-light" href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  out = out.replace(
    /(^|[\s(])(https?:\/\/[^\s<]+)/g,
    '$1<a class="underline decoration-void-line underline-offset-2 hover:text-light" href="$2" target="_blank" rel="noreferrer">$2</a>',
  );
  return out;
}

function renderBody(body: string): { __html: string } {
  const parts = body.split(/(```[\s\S]*?```)/g);
  const html = parts
    .map((part) => {
      const fence = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
      if (fence) {
        const code = escapeHtml(fence[2] ?? "").replace(/\n$/, "");
        return `<pre class="my-3 overflow-x-auto rounded-md bg-void p-3 font-mono text-[0.8rem] leading-relaxed text-ink"><code>${code}</code></pre>`;
      }
      const paras = part
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const lines = p.split("\n").map((line) => {
            if (/^\s*[-*]\s+/.test(line)) {
              return `<div class="pl-3">· ${inlineFormat(line.replace(/^\s*[-*]\s+/, ""))}</div>`;
            }
            return inlineFormat(line);
          });
          return `<p class="my-2 leading-relaxed text-pretty">${lines.join("<br/>")}</p>`;
        })
        .join("");
      return paras;
    })
    .join("");
  return { __html: html || "" };
}

export function MessageView({
  message,
  streaming = false,
}: {
  message: Pick<ChatMessage, "role" | "content">;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  const parsed = isUser ? null : parseLightReply(message.content);
  const body = isUser ? message.content : parsed?.body || (parsed?.thinkingOpen ? "" : message.content);

  return (
    <article
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="mt-1 size-8 shrink-0 overflow-hidden rounded-full">
          <img src="/light-portrait.jpg" alt="" className="size-full object-cover object-[50%_28%]" />
        </div>
      )}
      <div className={cn("max-w-[min(100%,42rem)]", isUser && "flex justify-end")}>
        {parsed?.thinking && (
          <details
            open={parsed.thinkingOpen}
            className="mb-2 rounded-md border border-void-line/80 bg-void-elevated/60 px-3 py-2 text-xs text-ink-subtle"
          >
            <summary className="cursor-pointer select-none font-mono tracking-wide">
              {parsed.thinkingOpen ? "Gathering" : "Thought"}
            </summary>
            <p className="mt-2 whitespace-pre-wrap font-mono leading-relaxed">{parsed.thinking}</p>
          </details>
        )}
        {isUser ? (
          <div className="rounded-2xl rounded-br-sm bg-void-panel px-4 py-3 text-sm leading-relaxed text-ink">
            {body}
          </div>
        ) : (
          <div className="text-sm text-ink">
            {body ? <div dangerouslySetInnerHTML={renderBody(body)} /> : null}
            {streaming && <span className="light-pulse ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-light align-middle" />}
          </div>
        )}
        {parsed && parsed.actions.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {parsed.actions.map((action, i) => (
              <li
                key={i}
                className="rounded-full border border-void-line px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted"
              >
                {action.kind === "url" ? `Opened ${new URL(action.url).hostname}` : `Built ${action.title}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
