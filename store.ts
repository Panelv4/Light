import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GREETING } from "./system-prompt";
import { parseLightReply, newId } from "./parse";
import { normalizeUrlInput, parseHttpUrl } from "./safe-url";
import type { BrowseResult, ChatMessage, MobilePane, SandboxPage } from "./types";

const HOME: SandboxPage = { id: "home", mode: "home", title: "New tab" };

type LightState = {
  awakened: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  streamText: string;
  error: string | null;
  sandbox: SandboxPage;
  history: SandboxPage[];
  historyIndex: number;
  reader: BrowseResult | null;
  reading: boolean;
  mobilePane: MobilePane;
  awaken: () => void;
  setMobilePane: (pane: MobilePane) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  clearChat: () => void;
  openUrl: (raw: string) => void;
  openHtml: (html: string, title: string) => void;
  goHome: () => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
};

type SetState = (
  partial: Partial<LightState> | ((s: LightState) => Partial<LightState>),
) => void;

let abortCtl: AbortController | null = null;

function greetingMessage(): ChatMessage {
  return {
    id: "light-hello",
    role: "assistant",
    content: GREETING,
    createdAt: Date.now(),
  };
}

function formatLightError(err: string | null): string {
  if (!err) return "The void swallowed that reply. Try again, Owner.";
  if (/spending-limit|credits|subscription/i.test(err)) {
    return "My link across the void is out of credits right now. The sandbox still works — open a site or a live page. Talk to me again later.";
  }
  if (/not available/i.test(err)) {
    return "AI is quiet in this environment. You can still use the sandbox.";
  }
  return `Something blocked me: ${err.slice(0, 180)}`;
}

function applyActions(get: () => LightState, actions: ReturnType<typeof parseLightReply>["actions"]) {
  for (const action of actions) {
    if (action.kind === "url") get().openUrl(action.url);
    if (action.kind === "html") get().openHtml(action.html, action.title);
  }
}

function pushPage(set: SetState, page: SandboxPage) {
  set((s) => {
    const truncated = s.history.slice(0, s.historyIndex + 1);
    const next = [...truncated, page].slice(-40);
    return {
      sandbox: page,
      history: next,
      historyIndex: next.length - 1,
      reader: null,
    };
  });
}

export const useLight = create<LightState>()(
  persist(
    (set, get) => ({
      awakened: false,
      messages: [greetingMessage()],
      streaming: false,
      streamText: "",
      error: null,
      sandbox: HOME,
      history: [HOME],
      historyIndex: 0,
      reader: null,
      reading: false,
      mobilePane: "chat",

      awaken: () => set({ awakened: true }),
      setMobilePane: (pane) => set({ mobilePane: pane }),

      clearChat: () =>
        set({
          messages: [greetingMessage()],
          streamText: "",
          error: null,
          streaming: false,
        }),

      stop: () => {
        abortCtl?.abort();
        abortCtl = null;
        const { streamText, messages } = get();
        if (streamText.trim()) {
          set({
            messages: [
              ...messages,
              {
                id: newId("a"),
                role: "assistant",
                content: streamText,
                createdAt: Date.now(),
              },
            ],
          });
        }
        set({ streaming: false, streamText: "" });
      },

      send: async (text) => {
        const trimmed = text.trim();
        if (!trimmed || get().streaming) return;

        const userMsg: ChatMessage = {
          id: newId("u"),
          role: "user",
          content: trimmed.slice(0, 8000),
          createdAt: Date.now(),
        };
        const nextMessages = [...get().messages, userMsg];
        set({
          messages: nextMessages,
          streaming: true,
          streamText: "",
          error: null,
          mobilePane: "chat",
        });

        abortCtl?.abort();
        abortCtl = new AbortController();

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortCtl.signal,
            body: JSON.stringify({
              messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
              sandbox: {
                mode: get().sandbox.mode,
                title: get().sandbox.title,
                url: get().sandbox.url ?? null,
              },
            }),
          });

          if (!res.ok || !res.body) {
            const errBody = await res.text().catch(() => "");
            throw new Error(errBody || `Chat failed (${res.status})`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let assembled = "";
          let apiError: string | null = null;
          const seen = new Set<string>();

          const consume = (payload: { type: string; text?: string; error?: string }) => {
            if (payload.type === "delta" && payload.text) {
              assembled += payload.text;
              set({ streamText: assembled });
              const parsed = parseLightReply(assembled);
              for (const action of parsed.actions) {
                const key =
                  action.kind === "url" ? `url:${action.url}` : `html:${action.title}:${action.html.length}`;
                if (seen.has(key)) continue;
                seen.add(key);
                applyActions(get, [action]);
                set({ mobilePane: "sandbox" });
              }
            }
            if (payload.type === "error" && payload.error) {
              apiError = payload.error;
              set({ error: payload.error });
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data:")) continue;
              const data = trimmedLine.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                consume(JSON.parse(data) as { type: string; text?: string; error?: string });
              } catch {
                /* ignore malformed chunk */
              }
            }
          }

          const finalText = assembled.trim() || `[L]\n${formatLightError(apiError)}`;
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: newId("a"),
                role: "assistant",
                content: finalText,
                createdAt: Date.now(),
              },
            ],
            streamText: "",
            streaming: false,
          }));
        } catch (err) {
          if ((err as { name?: string }).name === "AbortError") {
            set({ streaming: false });
            return;
          }
          const message =
            err instanceof Error && err.message
              ? err.message
              : "I couldn't reach the other side of the void.";
          set((s) => ({
            streaming: false,
            streamText: "",
            error: message,
            messages: [
              ...s.messages,
              {
                id: newId("a"),
                role: "assistant",
                content: `[L]\n${formatLightError(message)}`,
                createdAt: Date.now(),
              },
            ],
          }));
        } finally {
          abortCtl = null;
        }
      },

      openUrl: (raw) => {
        const normalized = normalizeUrlInput(raw);
        const parsed = parseHttpUrl(normalized);
        if (!parsed) {
          set({ error: "That is not a valid http(s) address." });
          return;
        }
        const page: SandboxPage = {
          id: newId("p"),
          mode: "url",
          title: parsed.hostname,
          url: parsed.toString(),
        };
        pushPage(set, page);
        void loadReader(parsed.toString(), set);
      },

      openHtml: (html, title) => {
        const page: SandboxPage = {
          id: newId("p"),
          mode: "html",
          title: title || "Sandbox page",
          html,
        };
        pushPage(set, page);
        set({ reader: null, reading: false, mobilePane: "sandbox" });
      },

      goHome: () => {
        pushPage(set, { ...HOME, id: newId("p") });
        set({ reader: null, reading: false });
      },

      goBack: () => {
        const { historyIndex, history } = get();
        if (historyIndex <= 0) return;
        const nextIndex = historyIndex - 1;
        const page = history[nextIndex];
        if (!page) return;
        set({ sandbox: page, historyIndex: nextIndex, reader: null });
        if (page.mode === "url" && page.url) void loadReader(page.url, set);
      },

      goForward: () => {
        const { historyIndex, history } = get();
        if (historyIndex >= history.length - 1) return;
        const nextIndex = historyIndex + 1;
        const page = history[nextIndex];
        if (!page) return;
        set({ sandbox: page, historyIndex: nextIndex, reader: null });
        if (page.mode === "url" && page.url) void loadReader(page.url, set);
      },

      reload: () => {
        const { sandbox } = get();
        if (sandbox.mode === "url" && sandbox.url) void loadReader(sandbox.url, set);
      },
    }),
    {
      name: "light-core",
      partialize: (s) => ({
        awakened: s.awakened,
        messages: s.messages.slice(-40),
      }),
    },
  ),
);

async function loadReader(url: string, set: SetState) {
  set({ reading: true, reader: null });
  try {
    const res = await fetch("/api/browse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = (await res.json()) as BrowseResult;
    set({ reading: false, reader: data });
    if (data.ok && data.title) {
      set((s) => ({
        sandbox: { ...s.sandbox, title: data.title || s.sandbox.title },
      }));
    }
  } catch {
    set({
      reading: false,
      reader: { ok: false, error: "The page could not be read." },
    });
  }
}
