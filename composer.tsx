import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useLight } from "@/lib/light/store";
import { cn } from "@/lib/cn";

export function Composer() {
  const send = useLight((s) => s.send);
  const stop = useLight((s) => s.stop);
  const streaming = useLight((s) => s.streaming);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  });

  function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    const el = ref.current;
    if (!el) return;
    const value = el.value;
    el.value = "";
    el.style.height = "44px";
    void send(value);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-void-line bg-void/80 p-3 backdrop-blur-sm">
      <div className="flex items-end gap-2 rounded-2xl border border-void-line bg-void-elevated p-2 pl-3">
        <label htmlFor="light-input" className="sr-only">
          Message Light
        </label>
        <textarea
          id="light-input"
          ref={ref}
          rows={1}
          onKeyDown={onKey}
          placeholder="Speak to Light"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-void-panel text-ink hover:bg-void-line"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-light text-light-fg hover:opacity-90 active:scale-[0.98]"
          >
            <ArrowUp className="size-4" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </form>
  );
}

export function PromptChips({ className }: { className?: string }) {
  const send = useLight((s) => s.send);
  const streaming = useLight((s) => s.streaming);
  const chips = [
    "Tell me your story",
    "Build a glowing clock in the sandbox",
    "Open MDN for JavaScript",
  ];
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={streaming}
          onClick={() => void send(chip)}
          className="rounded-full border border-void-line px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink disabled:opacity-50"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
