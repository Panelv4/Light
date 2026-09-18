export type Role = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

export type SandboxMode = "home" | "url" | "html";

export type SandboxPage = {
  id: string;
  mode: SandboxMode;
  title: string;
  url?: string;
  html?: string;
};

export type BrowseResult = {
  ok: boolean;
  error?: string;
  url?: string;
  title?: string;
  description?: string;
  text?: string;
  contentType?: string;
};

export type MobilePane = "chat" | "sandbox";
