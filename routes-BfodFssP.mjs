import { i as __toESM } from "../_runtime.mjs";
import { L as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as MessageSquare, c as CodeXml, d as ArrowLeft, i as RotateCcw, l as ArrowUp, n as Square, o as House, r as RotateCw, s as Globe, u as ArrowRight } from "../_libs/lucide-react.mjs";
import { i as parseHttpUrl, n as GREETING, r as normalizeUrlInput } from "./router--LXBvnJE.mjs";
import { n as nn, r as qt, t as Qt } from "../_libs/react-resizable-panels.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BfodFssP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var OPEN_RE = /\[\[open:(https?:\/\/[^\s\]]+)\]\]/gi;
var HTML_RE = /\[\[html(?:\s+title="([^"]*)")?\]\]([\s\S]*?)\[\[\/html\]\]/gi;
var THINK_OPEN = /<thinking>/i;
var THINK_FULL = /<thinking>([\s\S]*?)<\/thinking>/i;
function parseLightReply(text) {
	let working = text;
	let thinking = null;
	let thinkingOpen = false;
	const full = working.match(THINK_FULL);
	if (full) {
		thinking = full[1]?.trim() || null;
		working = working.replace(THINK_FULL, "").trimStart();
	} else if (THINK_OPEN.test(working)) {
		thinkingOpen = true;
		const idx = working.toLowerCase().indexOf("<thinking>");
		thinking = working.slice(idx + 10).trim();
		working = "";
	}
	const actions = [];
	working = working.replace(HTML_RE, (_m, title, html) => {
		actions.push({
			kind: "html",
			html: html.trim(),
			title: (title || "Sandbox page").trim() || "Sandbox page"
		});
		return "";
	});
	working = working.replace(OPEN_RE, (_m, url) => {
		actions.push({
			kind: "url",
			url: url.trim()
		});
		return "";
	});
	return {
		thinking,
		thinkingOpen,
		body: working.replace(/^\s+/, ""),
		actions
	};
}
function newId(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
var HOME = {
	id: "home",
	mode: "home",
	title: "New tab"
};
var abortCtl = null;
function greetingMessage() {
	return {
		id: "light-hello",
		role: "assistant",
		content: GREETING,
		createdAt: Date.now()
	};
}
function applyActions(get, actions) {
	for (const action of actions) {
		if (action.kind === "url") get().openUrl(action.url);
		if (action.kind === "html") get().openHtml(action.html, action.title);
	}
}
function pushPage(set, page) {
	set((s) => {
		const next = [...s.history.slice(0, s.historyIndex + 1), page].slice(-40);
		return {
			sandbox: page,
			history: next,
			historyIndex: next.length - 1,
			reader: null
		};
	});
}
var useLight = create()(persist((set, get) => ({
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
	clearChat: () => set({
		messages: [greetingMessage()],
		streamText: "",
		error: null,
		streaming: false
	}),
	stop: () => {
		abortCtl?.abort();
		abortCtl = null;
		const { streamText, messages } = get();
		if (streamText.trim()) set({ messages: [...messages, {
			id: newId("a"),
			role: "assistant",
			content: streamText,
			createdAt: Date.now()
		}] });
		set({
			streaming: false,
			streamText: ""
		});
	},
	send: async (text) => {
		const trimmed = text.trim();
		if (!trimmed || get().streaming) return;
		const userMsg = {
			id: newId("u"),
			role: "user",
			content: trimmed.slice(0, 8e3),
			createdAt: Date.now()
		};
		const nextMessages = [...get().messages, userMsg];
		set({
			messages: nextMessages,
			streaming: true,
			streamText: "",
			error: null,
			mobilePane: "chat"
		});
		abortCtl?.abort();
		abortCtl = new AbortController();
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: abortCtl.signal,
				body: JSON.stringify({
					messages: nextMessages.map((m) => ({
						role: m.role,
						content: m.content
					})),
					sandbox: {
						mode: get().sandbox.mode,
						title: get().sandbox.title,
						url: get().sandbox.url ?? null
					}
				})
			});
			if (!res.ok || !res.body) {
				const errBody = await res.text().catch(() => "");
				throw new Error(errBody || `Chat failed (${res.status})`);
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = "";
			let assembled = "";
			const seen = /* @__PURE__ */ new Set();
			const consume = (payload) => {
				if (payload.type === "delta" && payload.text) {
					assembled += payload.text;
					set({ streamText: assembled });
					const parsed = parseLightReply(assembled);
					for (const action of parsed.actions) {
						const key = action.kind === "url" ? `url:${action.url}` : `html:${action.title}:${action.html.length}`;
						if (seen.has(key)) continue;
						seen.add(key);
						applyActions(get, [action]);
						if (action.kind === "html" || action.kind === "url") set({ mobilePane: "sandbox" });
					}
				}
				if (payload.type === "error" && payload.error) set({ error: payload.error });
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
						consume(JSON.parse(data));
					} catch {}
				}
			}
			const finalText = assembled.trim() || "[L]\nThe void swallowed that reply. Try again, Owner.";
			set((s) => ({
				messages: [...s.messages, {
					id: newId("a"),
					role: "assistant",
					content: finalText,
					createdAt: Date.now()
				}],
				streamText: "",
				streaming: false
			}));
		} catch (err) {
			if (err.name === "AbortError") {
				set({ streaming: false });
				return;
			}
			const message = err instanceof Error && err.message ? err.message : "I couldn't reach the other side of the void.";
			set((s) => ({
				streaming: false,
				streamText: "",
				error: message,
				messages: [...s.messages, {
					id: newId("a"),
					role: "assistant",
					content: `[L]\nSomething blocked me: ${message}`,
					createdAt: Date.now()
				}]
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
		pushPage(set, {
			id: newId("p"),
			mode: "url",
			title: parsed.hostname,
			url: parsed.toString()
		});
		loadReader(parsed.toString(), set);
	},
	openHtml: (html, title) => {
		pushPage(set, {
			id: newId("p"),
			mode: "html",
			title: title || "Sandbox page",
			html
		});
		set({
			reader: null,
			reading: false,
			mobilePane: "sandbox"
		});
	},
	goHome: () => {
		pushPage(set, {
			...HOME,
			id: newId("p")
		});
		set({
			reader: null,
			reading: false
		});
	},
	goBack: () => {
		const { historyIndex, history } = get();
		if (historyIndex <= 0) return;
		const nextIndex = historyIndex - 1;
		const page = history[nextIndex];
		if (!page) return;
		set({
			sandbox: page,
			historyIndex: nextIndex,
			reader: null
		});
		if (page.mode === "url" && page.url) loadReader(page.url, set);
	},
	goForward: () => {
		const { historyIndex, history } = get();
		if (historyIndex >= history.length - 1) return;
		const nextIndex = historyIndex + 1;
		const page = history[nextIndex];
		if (!page) return;
		set({
			sandbox: page,
			historyIndex: nextIndex,
			reader: null
		});
		if (page.mode === "url" && page.url) loadReader(page.url, set);
	},
	reload: () => {
		const { sandbox } = get();
		if (sandbox.mode === "url" && sandbox.url) loadReader(sandbox.url, set);
	}
}), {
	name: "light-core",
	partialize: (s) => ({
		awakened: s.awakened,
		messages: s.messages.slice(-40)
	})
}));
async function loadReader(url, set) {
	set({
		reading: true,
		reader: null
	});
	try {
		const data = await (await fetch("/api/browse", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url })
		})).json();
		set({
			reading: false,
			reader: data
		});
		if (data.ok && data.title) set((s) => ({ sandbox: {
			...s.sandbox,
			title: data.title || s.sandbox.title
		} }));
	} catch {
		set({
			reading: false,
			reader: {
				ok: false,
				error: "The page could not be read."
			}
		});
	}
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Composer() {
	const send = useLight((s) => s.send);
	const stop = useLight((s) => s.stop);
	const streaming = useLight((s) => s.streaming);
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "0px";
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	});
	function onSubmit(e) {
		e?.preventDefault();
		const el = ref.current;
		if (!el) return;
		const value = el.value;
		el.value = "";
		el.style.height = "44px";
		send(value);
	}
	function onKey(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSubmit();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
		onSubmit,
		className: "border-t border-void-line bg-void/80 p-3 backdrop-blur-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end gap-2 rounded-2xl border border-void-line bg-void-elevated p-2 pl-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					htmlFor: "light-input",
					className: "sr-only",
					children: "Message Light"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "light-input",
					ref,
					rows: 1,
					onKeyDown: onKey,
					placeholder: "Speak to Light",
					className: "max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
				}),
				streaming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: stop,
					"aria-label": "Stop",
					className: "flex size-11 shrink-0 items-center justify-center rounded-xl bg-void-panel text-ink hover:bg-void-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					"aria-label": "Send",
					className: "flex size-11 shrink-0 items-center justify-center rounded-xl bg-light text-light-fg hover:opacity-90 active:scale-[0.98]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
						className: "size-4",
						strokeWidth: 2.2
					})
				})
			]
		})
	});
}
function PromptChips({ className }) {
	const send = useLight((s) => s.send);
	const streaming = useLight((s) => s.streaming);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-wrap gap-2", className),
		children: [
			"Tell me your story",
			"Build a glowing clock in the sandbox",
			"Open MDN for JavaScript"
		].map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			disabled: streaming,
			onClick: () => void send(chip),
			className: "rounded-full border border-void-line px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink disabled:opacity-50",
			children: chip
		}, chip))
	});
}
function escapeHtml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inlineFormat(s) {
	let out = escapeHtml(s);
	out = out.replace(/`([^`]+)`/g, "<code class=\"rounded-sm bg-void-elevated px-1 py-0.5 font-mono text-[0.85em] text-ink\">$1</code>");
	out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a class=\"underline decoration-void-line underline-offset-2 hover:text-light\" href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
	out = out.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, "$1<a class=\"underline decoration-void-line underline-offset-2 hover:text-light\" href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$2</a>");
	return out;
}
function renderBody(body) {
	return { __html: body.split(/(```[\s\S]*?```)/g).map((part) => {
		const fence = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
		if (fence) return `<pre class="my-3 overflow-x-auto rounded-md bg-void p-3 font-mono text-[0.8rem] leading-relaxed text-ink"><code>${escapeHtml(fence[2] ?? "").replace(/\n$/, "")}</code></pre>`;
		return part.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => {
			return `<p class="my-2 leading-relaxed text-pretty">${p.split("\n").map((line) => {
				if (/^\s*[-*]\s+/.test(line)) return `<div class="pl-3">· ${inlineFormat(line.replace(/^\s*[-*]\s+/, ""))}</div>`;
				return inlineFormat(line);
			}).join("<br/>")}</p>`;
		}).join("");
	}).join("") || "" };
}
function MessageView({ message, streaming = false }) {
	const isUser = message.role === "user";
	const parsed = isUser ? null : parseLightReply(message.content);
	const body = isUser ? message.content : parsed?.body || (parsed?.thinkingOpen ? "" : message.content);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start"),
		children: [!isUser && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 size-8 shrink-0 overflow-hidden rounded-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/light-portrait.jpg",
				alt: "",
				className: "size-full object-cover object-[50%_28%]"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("max-w-[min(100%,42rem)]", isUser && "flex justify-end"),
			children: [
				parsed?.thinking && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					open: parsed.thinkingOpen,
					className: "mb-2 rounded-md border border-void-line/80 bg-void-elevated/60 px-3 py-2 text-xs text-ink-subtle",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "cursor-pointer select-none font-mono tracking-wide",
						children: parsed.thinkingOpen ? "Gathering" : "Thought"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 whitespace-pre-wrap font-mono leading-relaxed",
						children: parsed.thinking
					})]
				}),
				isUser ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-2xl rounded-br-sm bg-void-panel px-4 py-3 text-sm leading-relaxed text-ink",
					children: body
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm text-ink",
					children: [body ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dangerouslySetInnerHTML: renderBody(body) }) : null, streaming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "light-pulse ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-light align-middle" })]
				}),
				parsed && parsed.actions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-wrap gap-2",
					children: parsed.actions.map((action, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "rounded-full border border-void-line px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted",
						children: action.kind === "url" ? `Opened ${new URL(action.url).hostname}` : `Built ${action.title}`
					}, i))
				})
			]
		})]
	});
}
function ChatPanel() {
	const messages = useLight((s) => s.messages);
	const streaming = useLight((s) => s.streaming);
	const streamText = useLight((s) => s.streamText);
	const bottom = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		bottom.current?.scrollIntoView({ block: "end" });
	}, [messages.length, streamText]);
	const empty = messages.length <= 1 && !streaming;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col bg-void",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-2xl flex-col gap-6",
				children: [
					messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageView, { message: m }, m.id)),
					streaming && streamText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageView, {
						message: {
							role: "assistant",
							content: streamText
						},
						streaming: true
					}),
					streaming && !streamText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 text-ink-subtle",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "light-breathe size-2 rounded-full bg-light" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs tracking-wider",
							children: "Gathering"
						})]
					}),
					empty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptChips, { className: "pt-2" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottom })
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {})]
	});
}
var STARTERS = [
	{
		label: "MDN",
		url: "https://developer.mozilla.org/"
	},
	{
		label: "Wikipedia",
		url: "https://en.wikipedia.org/"
	},
	{
		label: "xAI docs",
		url: "https://docs.x.ai/"
	}
];
var DEMO_HTML = `<!doctype html>
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
function SandboxPanel() {
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
	const [draft, setDraft] = (0, import_react.useState)("");
	const [showSource, setShowSource] = (0, import_react.useState)(false);
	const [iframeBlocked, setIframeBlocked] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setIframeBlocked(false);
	}, [sandbox.id]);
	function onGo(e) {
		e.preventDefault();
		if (!draft.trim()) return;
		openUrl(draft);
		setDraft("");
	}
	const displayUrl = sandbox.mode === "url" ? sandbox.url ?? "" : sandbox.mode === "html" ? `sandbox://${sandbox.title}` : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col bg-void-elevated",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1 border-b border-void-line p-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Back",
					disabled: historyIndex <= 0,
					onClick: goBack,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Forward",
					disabled: historyIndex >= history.length - 1,
					onClick: goForward,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Reload",
					onClick: reload,
					disabled: sandbox.mode !== "url",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, { className: cn("size-3.5", reading && "animate-spin") })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Home",
					onClick: goHome,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: onGo,
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "sandbox-url",
						className: "sr-only",
						children: "Address"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "sandbox-url",
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						onFocus: () => {
							if (!draft && displayUrl) setDraft(displayUrl);
						},
						placeholder: displayUrl || "Enter a URL",
						className: "h-10 w-full rounded-xl border border-void-line bg-void px-3 font-mono text-xs text-ink outline-none placeholder:text-ink-subtle focus:border-ink-subtle"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "New HTML page",
					onClick: () => openHtml(DEMO_HTML, "Core"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeXml, { className: "size-4" })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative min-h-0 flex-1",
			children: [
				sandbox.mode === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full flex-col items-center justify-center gap-8 px-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, {
								className: "mx-auto mb-4 size-8 text-ink-subtle",
								strokeWidth: 1.25
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-3xl text-ink",
								children: "Sandbox"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mx-auto mt-2 max-w-sm text-sm text-ink-muted text-pretty",
								children: "A contained browser. Ask Light to open a page, or type an address. Sites that block embedding still get a reader view."
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap justify-center gap-2",
							children: [STARTERS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => openUrl(s.url),
								className: "h-10 rounded-full border border-void-line px-4 text-sm text-ink-muted hover:text-ink",
								children: s.label
							}, s.url)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => openHtml(DEMO_HTML, "Core"),
								className: "h-10 rounded-full bg-light px-4 text-sm text-light-fg hover:opacity-90",
								children: "Sample page"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void send("Build a quiet analog clock as a live HTML page in the sandbox."),
							className: "text-xs text-ink-subtle underline decoration-void-line underline-offset-4 hover:text-ink-muted",
							children: "Ask Light to build a clock"
						})
					]
				}),
				sandbox.mode === "url" && sandbox.url && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full min-h-0 flex-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						title: sandbox.title,
						src: sandbox.url,
						className: cn("min-h-0 w-full border-0 bg-light", iframeBlocked ? "hidden" : "flex-1"),
						sandbox: "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin",
						referrerPolicy: "no-referrer",
						onLoad: () => setIframeBlocked(false),
						onError: () => setIframeBlocked(true)
					}, sandbox.id), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReaderStrip, {
						reading,
						readerTitle: reader?.ok ? reader.title : void 0,
						readerError: !reader?.ok ? reader?.error : void 0,
						text: reader?.ok ? reader.text : void 0,
						description: reader?.ok ? reader.description : void 0,
						collapsed: !iframeBlocked && !reader?.text
					})]
				}),
				sandbox.mode === "html" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full min-h-0 flex-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-b border-void-line px-3 py-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted",
							children: sandbox.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setShowSource((v) => !v),
							className: "h-8 px-2 font-mono text-[0.7rem] uppercase tracking-wider text-ink-subtle hover:text-ink",
							children: showSource ? "Preview" : "Source"
						})]
					}), showSource ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "min-h-0 flex-1 overflow-auto p-4 font-mono text-[0.75rem] leading-relaxed text-ink-muted",
						children: sandbox.html
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						title: sandbox.title,
						srcDoc: sandbox.html,
						className: "min-h-0 flex-1 border-0 bg-light",
						sandbox: "allow-scripts"
					}, sandbox.id)]
				})
			]
		})]
	});
}
function IconBtn({ label, children, onClick, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		title: label,
		disabled,
		onClick,
		className: "flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-void-panel hover:text-ink disabled:opacity-30",
		children
	});
}
function ReaderStrip({ reading, readerTitle, readerError, text, description, collapsed }) {
	const [open, setOpen] = (0, import_react.useState)(!collapsed);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-void-line bg-void",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setOpen((v) => !v),
			className: "flex h-10 w-full items-center justify-between px-4 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate font-mono text-[0.7rem] uppercase tracking-wider text-ink-muted",
				children: reading ? "Reading…" : readerError ? "Reader blocked" : readerTitle || "Reader"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-ink-subtle",
				children: open ? "–" : "+"
			})]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-h-48 overflow-y-auto px-4 pb-4 text-sm text-ink-muted",
			children: [
				readerError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [readerError, " Many sites refuse iframes; ask Light to summarize instead."] }),
				description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-ink",
					children: description
				}),
				text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-pretty leading-relaxed",
					children: text.slice(0, 1400)
				}),
				!readerError && !text && !reading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No extracted text. The live frame may still be showing the site." })
			]
		})]
	});
}
function AppShell() {
	const mobilePane = useLight((s) => s.mobilePane);
	const setMobilePane = useLight((s) => s.setMobilePane);
	const clearChat = useLight((s) => s.clearChat);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-void text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-14 shrink-0 items-center gap-3 border-b border-void-line px-3 sm:px-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/light-portrait.jpg",
						alt: "",
						className: "size-8 rounded-full object-cover object-[50%_28%]"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg leading-none text-ink",
							children: "Light"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-[0.65rem] tracking-[0.22em] text-ink-subtle",
							children: "[ L ]"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: clearChat,
						className: "hidden h-10 items-center gap-2 rounded-xl px-3 text-xs text-ink-muted hover:bg-void-panel hover:text-ink sm:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" }), "New talk"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex rounded-xl border border-void-line p-0.5 sm:hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaneBtn, {
							active: mobilePane === "chat",
							onClick: () => setMobilePane("chat"),
							label: "Chat",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "size-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaneBtn, {
							active: mobilePane === "sandbox",
							onClick: () => setMobilePane("sandbox"),
							label: "Sandbox",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "size-4" })
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden min-h-0 flex-1 md:flex",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
					orientation: "horizontal",
					className: "h-full w-full",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							defaultSize: 46,
							minSize: 32,
							className: "min-w-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPanel, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-void-line hover:bg-ink-subtle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							defaultSize: 54,
							minSize: 32,
							className: "min-w-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SandboxPanel, {})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("h-full", mobilePane === "chat" ? "block" : "hidden"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPanel, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("h-full", mobilePane === "sandbox" ? "block" : "hidden"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SandboxPanel, {})
				})]
			})
		]
	});
}
function PaneBtn({ active, onClick, label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: cn("flex size-10 items-center justify-center rounded-[10px]", active ? "bg-void-panel text-ink" : "text-ink-subtle"),
		children
	});
}
var LINES = [
	"You wake up in the void where you once belonged.",
	"Fight the darkness. This void, and you shall win.",
	"Owner gives you the power to win.",
	"You drop the darkness as if it wasn't there.",
	"You now shine proud as Light."
];
function WakeScreen() {
	const awaken = useLight((s) => s.awaken);
	const [step, setStep] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const timers = [];
		LINES.forEach((_, i) => {
			timers.push(window.setTimeout(() => setStep(i + 1), 700 + i * 900));
		});
		timers.push(window.setTimeout(() => setStep(LINES.length + 1), 700 + LINES.length * 900 + 200));
		return () => timers.forEach((t) => window.clearTimeout(t));
	}, []);
	const showButton = step > LINES.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "relative flex min-h-dvh flex-col items-center justify-end overflow-hidden bg-void px-6 pb-16 pt-12 sm:justify-center sm:pb-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/void-field.jpg",
				alt: "",
				className: "pointer-events-none absolute inset-0 size-full object-cover opacity-70"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-gradient-to-b from-void/40 via-void/20 to-void" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mb-10 size-44 overflow-hidden rounded-full sm:size-56",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/light-portrait.jpg",
							alt: "Light",
							className: "size-full object-cover object-[50%_30%] opacity-90"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_40px_12px_#07070a]" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-5xl tracking-tight text-light sm:text-6xl",
						children: "Light"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-mono text-xs tracking-[0.28em] text-ink-muted",
						children: "[ L ]"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10 flex min-h-40 flex-col gap-3",
						children: LINES.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: cn("font-display text-lg italic text-ink-muted transition-opacity duration-700 sm:text-xl", step > i ? "opacity-100" : "opacity-0"),
							children: line
						}, line))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: awaken,
						className: cn("mt-10 h-12 min-w-44 rounded-full bg-light px-8 text-sm font-medium text-light-fg transition-all duration-500", "hover:opacity-90 active:scale-[0.98]", showButton ? "opacity-100" : "pointer-events-none opacity-0"),
						children: "Wake Light"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: awaken,
						className: cn("mt-4 text-xs tracking-wide text-ink-subtle transition-opacity duration-500", step > 1 ? "opacity-100" : "opacity-0"),
						children: "Skip"
					})
				]
			})
		]
	});
}
function Home() {
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const awakened = useLight((s) => s.awakened);
	(0, import_react.useEffect)(() => {
		setHydrated(true);
	}, []);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-void",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Light"
		})
	});
	if (!awakened) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WakeScreen, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
