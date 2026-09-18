import { createFileRoute } from "@tanstack/react-router";
import { assertSafeHttpUrl } from "@/lib/light/safe-url";

const MAX_BYTES = 900_000;
const TIMEOUT_MS = 9000;

function decodeEntities(s: string): string {
  return s
    .replace(/\u0026nbsp;/gi, " ")
    .replace(/\u0026amp;/gi, "&")
    .replace(/\u0026lt;/gi, "<")
    .replace(/\u0026gt;/gi, ">")
    .replace(/\u0026quot;/gi, '"')
    .replace(/\u0026#39;/g, "'")
    .replace(/\u0026#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function extract(html: string): { title: string; description: string; text: string } {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const title =
    decodeEntities(stripped.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

  const descMatch =
    stripped.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ??
    stripped.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i) ??
    stripped.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  const description = decodeEntities(descMatch?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);

  const text = decodeEntities(stripped.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  return { title, description, text };
}

export const Route = createFileRoute("/api/browse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw = "";
        try {
          const body = (await request.json()) as { url?: string };
          raw = typeof body.url === "string" ? body.url : "";
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        let url: URL;
        try {
          url = assertSafeHttpUrl(raw);
        } catch (err) {
          return Response.json({
            ok: false,
            error: err instanceof Error ? err.message : "Blocked URL",
          });
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
          const res = await fetch(url.toString(), {
            method: "GET",
            redirect: "follow",
            signal: ctrl.signal,
            headers: {
              "User-Agent": "LightSandbox/1.0 (compatible; public-reader)",
              Accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/json;q=0.9,*/*;q=0.1",
            },
          });

          const finalUrl = res.url || url.toString();
          try {
            assertSafeHttpUrl(finalUrl);
          } catch {
            return Response.json({ ok: false, error: "Redirected to a blocked host." });
          }

          const contentType = res.headers.get("content-type") ?? "";
          const buf = new Uint8Array(await res.arrayBuffer());
          if (buf.byteLength > MAX_BYTES) {
            return Response.json({
              ok: false,
              error: "Page is too large to read into the sandbox.",
              url: finalUrl,
            });
          }
          const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);

          if (!res.ok) {
            return Response.json({
              ok: false,
              error: `Remote responded ${res.status}`,
              url: finalUrl,
              contentType,
            });
          }

          if (/html/i.test(contentType) || /<html/i.test(text.slice(0, 800))) {
            const extracted = extract(text);
            return Response.json({
              ok: true,
              url: finalUrl,
              contentType,
              ...extracted,
            });
          }

          return Response.json({
            ok: true,
            url: finalUrl,
            contentType,
            title: new URL(finalUrl).hostname,
            description: "",
            text: text.slice(0, 6000),
          });
        } catch (err) {
          const aborted = (err as { name?: string }).name === "AbortError";
          return Response.json({
            ok: false,
            error: aborted ? "The page took too long." : "Could not fetch that page.",
            url: url.toString(),
          });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
