import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPT } from "@/lib/light/system-prompt";

type Incoming = {
  role: "user" | "assistant";
  content: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "AI is not available in this environment." },
            { status: 503 },
          );
        }

        let body: {
          messages?: Incoming[];
          sandbox?: { mode?: string; title?: string; url?: string | null };
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const incoming = Array.isArray(body.messages) ? body.messages : [];
        const trimmed = incoming
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-16)
          .map((m) => ({
            role: m.role,
            content: m.content.slice(0, 8000),
          }));

        if (trimmed.length === 0) {
          return Response.json({ error: "No messages." }, { status: 400 });
        }

        const sandbox = body.sandbox;
        const sandboxNote =
          sandbox?.mode === "url" && sandbox.url
            ? `Owner's sandbox is currently showing ${sandbox.url}.`
            : sandbox?.mode === "html"
              ? `Owner's sandbox is currently showing a live HTML page titled "${sandbox.title ?? "untitled"}".`
              : `Owner's sandbox is on the new-tab page.`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (obj: unknown) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            };
            try {
              const res = await fetch("https://api.x.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: "grok-4.6",
                  stream: true,
                  temperature: 0.8,
                  max_tokens: 18000000000,
                  reasoning_effort: "xhigh",
                  messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "system", content: sandboxNote },
                    ...trimmed,
                  ],
                }),
              });

              if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "");
                send({
                  type: "error",
                  error: `xAI API error ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`,
                });
                controller.close();
                return;
              }

              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buf = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const t = line.trim();
                  if (!t.startsWith("data:")) continue;
                  const data = t.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const json = JSON.parse(data) as {
                      choices?: Array<{
                        delta?: { content?: string | null };
                      }>;
                    };
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) send({ type: "delta", text: delta });
                  } catch {
                    /* skip */
                  }
                }
              }
              send({ type: "done" });
            } catch (err) {
              send({
                type: "error",
                error: err instanceof Error ? err.message : "Network error",
              });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
