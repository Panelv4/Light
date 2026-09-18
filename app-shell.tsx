import type { ReactNode } from "react";
import { Globe, MessageSquare, RotateCcw } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useLight } from "@/lib/light/store";
import { ChatPanel } from "./chat-panel";
import { SandboxPanel } from "./sandbox-panel";
import { cn } from "@/lib/cn";

export function AppShell() {
  const mobilePane = useLight((s) => s.mobilePane);
  const setMobilePane = useLight((s) => s.setMobilePane);
  const clearChat = useLight((s) => s.clearChat);

  return (
    <div className="flex h-dvh flex-col bg-void text-ink">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-void-line px-3 sm:px-4">
        <img
          src="/light-portrait.jpg"
          alt=""
          className="size-8 rounded-full object-cover object-[50%_28%]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-none text-ink">Light</p>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-ink-subtle">[ L ]</p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="hidden h-10 items-center gap-2 rounded-xl px-3 text-xs text-ink-muted hover:bg-void-panel hover:text-ink sm:flex"
        >
          <RotateCcw className="size-3.5" />
          New talk
        </button>
        <div className="flex rounded-xl border border-void-line p-0.5 sm:hidden">
          <PaneBtn active={mobilePane === "chat"} onClick={() => setMobilePane("chat")} label="Chat">
            <MessageSquare className="size-4" />
          </PaneBtn>
          <PaneBtn
            active={mobilePane === "sandbox"}
            onClick={() => setMobilePane("sandbox")}
            label="Sandbox"
          >
            <Globe className="size-4" />
          </PaneBtn>
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 md:flex">
        <Group orientation="horizontal" className="h-full w-full">
          <Panel defaultSize={46} minSize={32} className="min-w-0">
            <ChatPanel />
          </Panel>
          <Separator className="w-px bg-void-line hover:bg-ink-subtle" />
          <Panel defaultSize={54} minSize={32} className="min-w-0">
            <SandboxPanel />
          </Panel>
        </Group>
      </div>

      <div className="min-h-0 flex-1 md:hidden">
        <div className={cn("h-full", mobilePane === "chat" ? "block" : "hidden")}>
          <ChatPanel />
        </div>
        <div className={cn("h-full", mobilePane === "sandbox" ? "block" : "hidden")}>
          <SandboxPanel />
        </div>
      </div>
    </div>
  );
}

function PaneBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-[10px]",
        active ? "bg-void-panel text-ink" : "text-ink-subtle",
      )}
    >
      {children}
    </button>
  );
}
