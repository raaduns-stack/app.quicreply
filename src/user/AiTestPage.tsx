import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getWorkspaceSettings, runAiSandboxTest, useAction, useQuery } from "wasp/client/operations";
import { AlertTriangle, Bot, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
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
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type AiSandboxResult = {
  message: string;
  confidence?: number;
  route?: string;
  warnings?: string[];
};

const MIN_CONTEXT_LENGTH = 20;
const REVEAL_CHUNK_DELAY_MS = 45;
const MAX_SANDBOX_HISTORY_MESSAGES = 20;
const COMPOSER_MIN_HEIGHT_PX = 52;
const COMPOSER_MAX_HEIGHT_PX = 156;

function compactContextValue(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function getContextQuality(settings: WorkspaceSettings | undefined) {
  const missingFields: string[] = [];
  const weakFields: string[] = [];

  const requiredFields = [
    {
      label: "business/service details",
      value: compactContextValue(settings?.organization.businessDescription),
    },
    {
      label: "products/services",
      value: compactContextValue(settings?.organization.productsServices),
    },
  ];

  for (const field of requiredFields) {
    if (!field.value) {
      missingFields.push(field.label);
    } else if (field.value.length < MIN_CONTEXT_LENGTH) {
      weakFields.push(field.label);
    }
  }

  return {
    isReady: missingFields.length === 0 && weakFields.length === 0,
    missingFields,
    weakFields,
  };
}

export default function AiTestPage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const runSandboxTest = useAction(runAiSandboxTest);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [revealedAssistantText, setRevealedAssistantText] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<AiSandboxResult | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const revealTimeoutsRef = useRef<number[]>([]);
  const contextQuality = useMemo(() => getContextQuality(settings), [settings]);

  useEffect(() => {
    if (!conversationRef.current) {
      return;
    }

    conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages, isSending, revealedAssistantText]);

  useEffect(() => {
    if (isSending || !contextQuality.isReady) {
      return;
    }

    composerRef.current?.focus();
  }, [isSending, contextQuality.isReady, messages.length]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) {
      return;
    }

    composer.style.height = `${COMPOSER_MIN_HEIGHT_PX}px`;
    const nextHeight = Math.min(composer.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
    composer.style.height = `${Math.max(nextHeight, COMPOSER_MIN_HEIGHT_PX)}px`;
    composer.style.overflowY = composer.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    return () => {
      revealTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      revealTimeoutsRef.current = [];
    };
  }, []);

  function clearRevealTimeouts() {
    revealTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    revealTimeoutsRef.current = [];
  }

  function animateAssistantReply(messageId: string, fullText: string) {
    const chunks = fullText.match(/\S+\s*/g) ?? [fullText];

    setRevealedAssistantText((current) => ({
      ...current,
      [messageId]: "",
    }));

    chunks.forEach((chunk, index) => {
      const timeoutId = window.setTimeout(() => {
        setRevealedAssistantText((current) => ({
          ...current,
          [messageId]: `${current[messageId] ?? ""}${chunk}`,
        }));
      }, REVEAL_CHUNK_DELAY_MS * (index + 1));

      revealTimeoutsRef.current.push(timeoutId);
    });
  }

  async function sendMessage(text: string) {
    const value = text.trim();
    if (!value || isSending) {
      return;
    }
    if (!contextQuality.isReady) {
      toast({
        title: "Jennifer setup incomplete",
        description: "Complete Jennifer setup before testing.",
        variant: "destructive",
      });
      return;
    }

    const nextUserMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: value,
    };

    const history = messages.slice(-MAX_SANDBOX_HISTORY_MESSAGES).map((message) => ({
      role: message.role,
      text: message.text,
    }));

    setMessages((current) => [...current, nextUserMessage]);
    setDraft("");

    setIsSending(true);
    try {
      const result = (await runSandboxTest({
        prompt: value,
        conversationHistory: history,
      })) as AiSandboxResult;
      const assistantMessageId = `${Date.now()}-assistant`;

      setLastResult(result);
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          text: result.message,
        },
      ]);
      animateAssistantReply(assistantMessageId, result.message);
    } catch (error: any) {
      toast({
        title: "Jennifer runtime test failed",
        description:
          error?.message ?? "The sandbox request failed before a runtime response was returned.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void sendMessage(draft);
    }
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
          <Button
            onClick={() => {
              clearRevealTimeouts();
              setMessages([]);
              setRevealedAssistantText({});
              setLastResult(null);
            }}
            variant="outline"
          >
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
            {!contextQuality.isReady ? (
              <section className={cn(mutedCardClass, "border-[#f3d4aa] bg-[#fff4e6] p-5 dark:border-[#5b3b14] dark:bg-[#1f170d]")}>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-3 text-[#d97706] shadow-sm dark:bg-[#271c10] dark:text-[#ffb84d]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[#182235] dark:text-white">
                      Complete Jennifer setup before testing.
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Add meaningful business/service details and products/services so Jennifer has enough context to answer accurately.
                    </p>
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {contextQuality.missingFields.length > 0 ? (
                        <p>Missing: {contextQuality.missingFields.join(", ")}</p>
                      ) : null}
                      {contextQuality.weakFields.length > 0 ? (
                        <p>Needs more detail: {contextQuality.weakFields.join(", ")}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className={cn(shellCardClass, "flex h-[calc(100vh-19rem)] min-h-[620px] max-h-[820px] flex-col overflow-hidden")}>
              <div className="flex flex-wrap gap-2 border-b border-[#efe5d5] px-5 py-4 dark:border-white/10">
                {[
                  `Tone: ${settings?.preferences.responseStyle ?? "professional"}`,
                  `Language: ${settings?.preferences.aiLanguage ?? "english"}`,
                  `AI: ${settings?.organization.isAiActive ? "active" : "paused"}`,
                  `Runtime: ${lastResult?.route ?? "sandbox"}`,
                  `Confidence: ${
                    typeof lastResult?.confidence === "number"
                      ? `${Math.round(lastResult.confidence * 100)}%`
                      : "not returned"
                  }`,
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#e6e0d6] bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-500 dark:border-white/10 dark:bg-[#111b2d] dark:text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="border-b border-[#efe5d5] px-5 py-4 dark:border-white/10">
                  <div className={sectionEyebrowClass}>Conversation Preview</div>
                  <div className="mt-1 text-base font-semibold text-[#182235] dark:text-white">
                    Jennifer response sandbox
                  </div>
                </div>

                <div
                  ref={conversationRef}
                  className="flex-1 space-y-4 overflow-y-auto bg-[#fffaf5] px-5 py-5 dark:bg-[#0b1220]"
                >
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Bot className="h-10 w-10 text-[#fe901d]" />
                      <div className="mt-4 text-sm font-semibold text-[#182235] dark:text-white">
                        No test conversation yet
                      </div>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Use one of the sample prompts or write your own. This page sends sandbox requests through the Jennifer runtime without touching live conversations.
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
                          {message.role === "assistant"
                            ? revealedAssistantText[message.id] ?? message.text
                            : message.text}
                        </div>
                      </div>
                    ))
                  )}

                  {isSending ? (
                    <div className="flex justify-start">
                      <div className="max-w-[75%] rounded-2xl border border-[#eadfcb] bg-white px-4 py-3 text-[#182235] shadow-sm dark:border-white/10 dark:bg-[#111b2d] dark:text-white">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#fe901d] [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#fe901d] [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#fe901d]" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-[#efe5d5] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="items-end gap-3 sm:flex">
                    <Textarea
                      ref={composerRef}
                      className={cn(
                        "h-[52px] min-h-[52px] flex-1 resize-none overflow-y-hidden py-3 leading-6",
                        inputClass,
                      )}
                      placeholder="Ask Jennifer a test question..."
                      disabled={isSending || !contextQuality.isReady}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                    />
                    <Button
                      className="mt-3 h-[52px] px-4 sm:mt-0"
                      disabled={!draft.trim() || isSending || !contextQuality.isReady}
                      onClick={() => void sendMessage(draft)}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </section>
            </section>

            {lastResult?.warnings?.length ? (
              <section className={cn(mutedCardClass, "p-5")}>
                <div className="text-base font-semibold text-[#182235] dark:text-white">
                  Runtime Warnings
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {lastResult.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </UserLayout>
  );
}
