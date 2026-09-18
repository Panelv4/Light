import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  Globe,
  House,
  RotateCw,
} from "lucide-react";
import { useLight } from "@/lib/light/store";
import { cn } from "@/lib/cn";

const STARTERS = [
  { label: "MDN", url: "https://developer.mozilla.org/" },
  { label: "Wikipedia", url: "https://en.wikipedia.org/" },
  { label: "xAI docs", url: "https://docs.x.ai/" },
];

const DEMO_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html,body{margin:0;height:100%;background:#07070a;color:#e8e6e1;font-family:Georgia,serif;display:grid;place-items:center}
    .core{width:18px;height:18px;border-radius:50%;background:#f4f1ea;box-shadow:0 0 40px 12px rgba(244,241,234,.35)}
    p{margin-top:28px;letter-spacing:.28em;text-transform:uppercase;font-size:11px;opacity:.6}
  </style>
</head>
<body>
  <div style="text-align:center">
    <div class="core"></div>
    <p>Light</p>
  </div>
</body>
</html>`;

export function SandboxPanel() {
  const sandbox = useLight((s) => s.sandbox);
  const openUrl = useLight((s) => s.openUrl);
  const openHtml = useLight((s) => s.openHtml);
  const goHome = useLight((s) => s.goHome);
  const goBack = useLight((s) => s.goBack);
  const goForward = useLight((s) => s.goForward);
  const reload = useLight((s) => s.reload);
  const historyIndex = useLight((s) => s.historyIndex);
  const history = useLight((s) => s.history);
  const reader = useLight((s) => s.reader);
  const reading = useLight((s) => s.reading);
  const send = useLight((s) => s.send);
  const [draft, setDraft] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  useEffect(() => {
    setIframeBlocked(false);
  }, [sandbox.id]);

  function onGo(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    openUrl(draft);
    setDraft("");
  }

  const displayUrl =
    sandbox.mode === "url" ? sandbox.url ?? "" : sandbox.mode === "html" ? `sandbox://${sandbox.title}` : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-void-elevated">
      <div className="flex items-center gap-1 border-b border-void-line p-2">
        <IconBtn label="Back" disabled={historyIndex <= 0} onClick={goBack}>
          <ArrowLeft className="size-4" />
        </IconBtn>
        <IconBtn
          label="Forward"
          disabled={historyIndex >= history.length - 1}
          onClick={goForward}
        >
          <ArrowRight className="size-4" />
        </IconBtn>
        <IconBtn label="Reload" onClick={reload} disabled={sandbox.mode !== "url"}>
          <RotateCw className={cn("size-3.5", reading && "animate-spin")} />
        </IconBtn>
        <IconBtn label="Home" onClick={goHome}>
          <House className="size-4" />
        </IconBtn>
        <form onSubmit={onGo} className="min-w-0 flex-1">
          <label htmlFor="sandbox-url" className="sr-only">
            Address
          </label>
          <input
            id="sandbox-url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => {
              if (!draft && displayUrl) setDraft(displayUrl);
            }}
            placeholder={displayUrl || "Enter a URL"}
            className="h-10 w-full rounded-xl border border-void-line bg-void px-3 font-mono text-xs text-ink outline-none placeholder:text-ink-subtle focus:border-ink-subtle"
          />
        </form>
        <IconBtn
          label="New HTML page"
          onClick={() => openHtml(DEMO_HTML, "Core")}
        >
          <Code2 className="size-4" />
        </IconBtn>
      </div>

      <div className="relative min-h-0 flex-1">
        {sandbox.mode === "home" && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
            <div>
              <Globe className="mx-auto mb-4 size-8 text-ink-subtle" strokeWidth={1.25} />
              <h2 className="font-display text-3xl text-ink">Sandbox</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted text-pretty">
                A contained browser. Ask Light to open a page, or type an address. Sites that block embedding still get a reader view.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => openUrl(s.url)}
                  className="h-10 rounded-full border border-void-line px-4 text-sm text-ink-muted hover:text-ink"
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => openHtml(DEMO_HTML, "Core")}
                className="h-10 rounded-full bg-light px-4 text-sm text-light-fg hover:opacity-90"
              >
                Sample page
              </button>
            </div>
            <button
              type="button"
              onClick={() => void send("Build a quiet analog clock as a live HTML page in the sandbox.")}
              className="text-xs text-ink-subtle underline decoration-void-line underline-offset-4 hover:text-ink-muted"
            >
              Ask Light to build a clock
            </button>
          </div>
        )}

        {sandbox.mode === "url" && sandbox.url && (
          <div className="flex h-full min-h-0 flex-col">
            <iframe
              key={sandbox.id}
              title={sandbox.title}
              src={sandbox.url}
              className={cn("min-h-0 w-full border-0 bg-light", iframeBlocked ? "hidden" : "flex-1")}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              referrerPolicy="no-referrer"
              onLoad={() => setIframeBlocked(false)}
              onError={() => setIframeBlocked(true)}
            />
            <ReaderStrip
              reading={reading}
              readerTitle={reader?.ok ? reader.title : undefined}
              readerError={!reader?.ok ? reader?.error : undefined}
              text={reader?.ok ? reader.text : undefined}
              description={reader?.ok ? reader.description : undefined}
              collapsed={!iframeBlocked && !reader?.text}
            />
          </div>
        )}

        {sandbox.mode === "html" && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-void-line px-3 py-1.5">
              <p className="truncate font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted">
                {sandbox.title}
              </p>
              <button
                type="button"
                onClick={() => setShowSource((v) => !v)}
                className="h-8 px-2 font-mono text-[0.7rem] uppercase tracking-wider text-ink-subtle hover:text-ink"
              >
                {showSource ? "Preview" : "Source"}
              </button>
            </div>
            {showSource ? (
              <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[0.75rem] leading-relaxed text-ink-muted">
                {sandbox.html}
              </pre>
            ) : (
              <iframe
                key={sandbox.id}
                title={sandbox.title}
                srcDoc={sandbox.html}
                className="min-h-0 flex-1 border-0 bg-light"
                sandbox="allow-scripts"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-void-panel hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ReaderStrip({
  reading,
  readerTitle,
  readerError,
  text,
  description,
  collapsed,
}: {
  reading: boolean;
  readerTitle?: string;
  readerError?: string;
  text?: string;
  description?: string;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);

  return (
    <div className="border-t border-void-line bg-void">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between px-4 text-left"
      >
        <span className="truncate font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted">
          {reading ? "Reading…" : readerError ? "Reader blocked" : readerTitle || "Reader"}
        </span>
        <span className="text-ink-subtle">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto px-4 pb-4 text-sm text-ink-muted">
          {readerError && <p>{readerError} Many sites refuse iframes; ask Light to summarize instead.</p>}
          {description && <p className="mb-2 text-ink">{description}</p>}
          {text && <p className="text-pretty leading-relaxed">{text.slice(0, 1400)}</p>}
          {!readerError && !text && !reading && (
            <p>No extracted text. The live frame may still be showing the site.</p>
          )}
        </div>
      )}
    </div>
  );
}
