import { useEffect, useRef } from "react";
import { useLight } from "@/lib/light/store";
import { Composer, PromptChips } from "./composer";
import { MessageView } from "./message-view";

export function ChatPanel() {
  const messages = useLight((s) => s.messages);
  const streaming = useLight((s) => s.streaming);
  const streamText = useLight((s) => s.streamText);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamText]);

  const empty = messages.length <= 1 && !streaming;

  return (
    <div className="flex h-full min-h-0 flex-col bg-void">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.map((m) => (
            <MessageView key={m.id} message={m} />
          ))}
          {streaming && streamText && (
            <MessageView message={{ role: "assistant", content: streamText }} streaming />
          )}
          {streaming && !streamText && (
            <div className="flex items-center gap-3 text-ink-subtle">
              <span className="light-breathe size-2 rounded-full bg-light" />
              <span className="font-mono text-xs tracking-wider">Gathering</span>
            </div>
          )}
          {empty && (
            <PromptChips className="pt-2" />
          )}
          <div ref={bottom} />
        </div>
      </div>
      <Composer />
    </div>
  );
}
