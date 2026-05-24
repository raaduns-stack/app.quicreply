import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getWorkspaceSettings, useQuery } from "wasp/client/operations";
import { Bot, Loader2, RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import UserLayout from "./layout/UserLayout";
import {
  AiTabs,
  inputClass,
  mutedCardClass,
  sectionEyebrowClass,
  shellCardClass,
  type WorkspaceSettings,
} from "./ai/shared";
import { Button } from "../client/components/ui/button";
import { Textarea } from "../client/components/ui/textarea";
import { cn } from "../client/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function buildAssistantReply(input: string, settings?: WorkspaceSettings) {
  const normalized = input.toLowerCase();
  const intro =
    settings?.organization.firstAiMessage.trim() ||
    "Hi, I'm Jennifer. I can help you with product questions, pricing, and next steps.";
  const products =
    settings?.organization.productsServices.trim() ||
    "We can share product details, pricing, delivery, and recommendation guidance.";
  const tone = settings?.preferences.responseStyle ?? "professional";

  if (normalized.includes("price")) {
    return `${intro} Based on the current setup, pricing guidance should come from this knowledge source: ${products}`;
  }

  if (normalized.includes("deliver") || normalized.includes("shipping")) {
    return `${intro} Delivery policy is not yet structured as a dedicated knowledge document, so Jennifer would currently answer from saved products/services context: ${products}`;
  }

  if (normalized.includes("human") || normalized.includes("agent")) {
    return `Under the current ${tone} tone setting, Jennifer should acknowledge the request and hand over to a human teammate when needed.`;
  }

  return `${intro} Jennifer would answer this using your current ${tone} tone and the workspace knowledge already saved.`;
}

const starterPrompts = [
  "What is the price?",
  "Do you deliver outside Lagos?",
  "Can I speak to a human?",
  "What exactly do you sell?",
];

export default function AiTestPage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const helperText = useMemo(() => {
    if (!settings) {
      return "";
    }

    return `Previewing with ${settings.preferences.responseStyle} tone in ${settings.preferences.aiLanguage}. This is a UI sandbox, not the live Jennifer execution path.`;
  }, [settings]);

  function sendMessage(text: string) {
    const value = text.trim();
    if (!value) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: value },
      {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: buildAssistantReply(value, settings),
      },
    ]);
    setDraft("");
  }

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Test AI Sandbox
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Simulate prompts against the current Jennifer setup before wiring the live agent path.
            </p>
          </div>
          <Button onClick={() => setMessages([])} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        </div>

        <AiTabs currentHref="/ai/test" />

        {settingsQuery.isLoading ? (
          <div className={cn(shellCardClass, "flex items-center gap-3 px-5 py-8")}>
            <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading Jennifer sandbox
            </span>
          </div>
        ) : (
          <>
            <section className={cn(mutedCardClass, "p-5")}>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-[#fe901d] shadow-sm dark:bg-[#0f1728] dark:text-[#ffb84d]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-[#182235] dark:text-white">
                    UI sandbox only
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {helperText}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <section className={cn(shellCardClass, "flex min-h-[620px] flex-col overflow-hidden")}>
                <div className="border-b border-[#efe5d5] px-5 py-4 dark:border-white/10">
                  <div className={sectionEyebrowClass}>Conversation Preview</div>
                  <div className="mt-1 text-base font-semibold text-[#182235] dark:text-white">
                    Jennifer response sandbox
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#fffaf5] px-5 py-5 dark:bg-[#0b1220]">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Bot className="h-10 w-10 text-[#fe901d]" />
                      <div className="mt-4 text-sm font-semibold text-[#182235] dark:text-white">
                        No test conversation yet
                      </div>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Use one of the sample prompts or write your own. This page previews UI behavior and configuration, not the live AI runtime.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === "user" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                            message.role === "user"
                              ? "bg-[#182235] text-white"
                              : "border border-[#eadfcb] bg-white text-[#182235] dark:border-white/10 dark:bg-[#111b2d] dark:text-white",
                          )}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-[#efe5d5] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="flex gap-3">
                    <Textarea
                      className={cn("min-h-[52px] flex-1 resize-none", inputClass)}
                      placeholder="Ask Jennifer a test question..."
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <Button className="h-auto px-4" onClick={() => sendMessage(draft)}>
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <section className={cn(shellCardClass, "p-5")}>
                  <div className={sectionEyebrowClass}>Try These</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        className="rounded-full border border-[#e6e0d6] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-[#fff7ec] hover:text-[#182235] dark:border-white/10 dark:bg-[#111b2d] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                        onClick={() => sendMessage(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </section>

                <section className={cn(mutedCardClass, "p-5")}>
                  <div className="text-base font-semibold text-[#182235] dark:text-white">
                    Current sandbox inputs
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">Tone</dt>
                      <dd className="font-semibold capitalize text-[#182235] dark:text-white">
                        {settings?.preferences.responseStyle ?? "professional"}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">Language</dt>
                      <dd className="font-semibold capitalize text-[#182235] dark:text-white">
                        {settings?.preferences.aiLanguage ?? "english"}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500 dark:text-slate-400">AI Status</dt>
                      <dd className="font-semibold text-[#182235] dark:text-white">
                        {settings?.organization.isAiActive ? "Active" : "Paused"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}
