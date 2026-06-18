import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useSearchParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  getInboxThreadMessages,
  getInboxThreads,
  getInboxAiRuntimeStatus,
  markInboxThreadRead as markInboxThreadReadOperation,
  resolveInboxThread as resolveInboxThreadOperation,
  sendInboxMessage as sendInboxMessageOperation,
  toggleInboxThreadAi as toggleInboxThreadAiOperation,
  useQuery,
} from "wasp/client/operations";
import {
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  MoreVertical,
  Phone,
  Search,
  Send,
  UserCheck,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { Textarea } from "../client/components/ui/textarea";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type ThreadFilter = "all" | "unread" | "ai" | "open" | "resolved";

type InboxThread = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  tags: string[];
  assignedTo: string | null;
  notes: string | null;
  preview: string;
  timestamp: string;
  unreadCount: number;
  isAiActive: boolean;
  isResolved: boolean;
  color: string;
  initials: string;
};

type InboxMessage = {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
  createdAt: string;
  source: string | null;
  status: string | null;
};

type InboxAiRuntimeStatus = {
  status: "online" | "unavailable" | "not-configured" | "disabled";
  checkedAt: string;
  detail: string;
};

const filters: Array<{ value: ThreadFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "ai", label: "AI" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

function getStatusLabel(status: string) {
  switch (status) {
    case "ai-active":
      return "AI Active";
    case "human-active":
      return "Human Active";
    case "needs-attention":
      return "Needs Attention";
    case "new-lead":
      return "New Lead";
    default:
      return status || "New Lead";
  }
}

function getSourceLabel(source: string) {
  return source || "Manual";
}

function getMessageSourceLabel(source: string | null) {
  if (source === "n8n") {
    return "Jennifer";
  }

  if (source === "app") {
    return "Team";
  }

  return null;
}

function getJenniferState(
  thread: InboxThread | null,
  runtime: InboxAiRuntimeStatus | null,
) {
  if (thread?.status === "needs-attention") {
    return {
      label: "Needs attention",
      detail: "Jennifer paused this thread and requested human follow-up.",
      dotClass: "bg-amber-400",
    };
  }

  if (!thread?.isAiActive) {
    return {
      label: "Human takeover",
      detail: "Jennifer is paused while your team handles this conversation.",
      dotClass: "bg-slate-500",
    };
  }

  if (runtime?.status === "online") {
    return {
      label: "Jennifer online",
      detail: "Jennifer and the inbox router are ready to respond.",
      dotClass: "bg-emerald-400",
    };
  }

  return {
    label: "Jennifer unavailable",
    detail:
      runtime?.detail ?? "Jennifer runtime readiness is being checked.",
    dotClass: "bg-amber-400",
  };
}

export default function InboxPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingThread, setIsUpdatingThread] = useState(false);

  const threadsQuery = useQuery(
    getInboxThreads,
    {
      filter: threadFilter,
      search: searchQuery,
    },
    {
      refetchInterval: () =>
        typeof document !== "undefined" && !document.hidden ? 8_000 : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: "always",
    },
  );
  const threads = (threadsQuery.data as InboxThread[] | undefined) ?? [];
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null,
    [activeThreadId, threads],
  );
  const messagesQuery = useQuery(
    getInboxThreadMessages,
    { contactId: activeThread?.id ?? "" },
    {
      enabled: Boolean(activeThread?.id),
      refetchInterval: () =>
        typeof document !== "undefined" && !document.hidden ? 5_000 : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: "always",
    },
  );
  const messages = (messagesQuery.data as InboxMessage[] | undefined) ?? [];
  const runtimeQuery = useQuery(
    getInboxAiRuntimeStatus,
    {},
    {
      refetchInterval: () =>
        typeof document !== "undefined" && !document.hidden ? 15_000 : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: "always",
    },
  );
  const runtimeStatus =
    (runtimeQuery.data as InboxAiRuntimeStatus | undefined) ?? null;
  const jenniferState = getJenniferState(activeThread, runtimeStatus);

  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  useEffect(() => {
    const requestedContactId = searchParams.get("contactId");
    if (!requestedContactId) {
      return;
    }

    const requestedThread = threads.find((thread) => thread.id === requestedContactId);
    if (requestedThread && activeThreadId !== requestedThread.id) {
      setActiveThreadId(requestedThread.id);
    }
  }, [activeThreadId, searchParams, threads]);

  useEffect(() => {
    if (!activeThread?.id || activeThread.unreadCount === 0) {
      return;
    }

    void markInboxThreadReadOperation({ contactId: activeThread.id }).then(() =>
      threadsQuery.refetch?.(),
    );
  }, [activeThread?.id, activeThread?.unreadCount]);

  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  const refreshInbox = async () => {
    await Promise.all([threadsQuery.refetch?.(), messagesQuery.refetch?.()]);
  };

  const handleSend = async () => {
    if (!activeThread || !message.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await sendInboxMessageOperation({
        contactId: activeThread.id,
        message: message.trim(),
      });
      setMessage("");
      await refreshInbox();
      toast({
        title: "Message sent",
        description: "The WhatsApp message was delivered to the active session.",
      });
    } catch (error: any) {
      toast({
        title: "Could not send message",
        description: error?.message ?? "Please confirm WhatsApp is connected.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleAi = async () => {
    if (!activeThread) {
      return;
    }

    setIsUpdatingThread(true);
    try {
      await toggleInboxThreadAiOperation({
        contactId: activeThread.id,
        isAiActive: !activeThread.isAiActive,
      });
      await refreshInbox();
    } finally {
      setIsUpdatingThread(false);
    }
  };

  const handleResolve = async () => {
    if (!activeThread) {
      return;
    }

    setIsUpdatingThread(true);
    try {
      await resolveInboxThreadOperation({ contactId: activeThread.id });
      await refreshInbox();
    } finally {
      setIsUpdatingThread(false);
    }
  };

  return (
    <UserLayout user={user}>
      <div className="-m-4 flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0d1524] dark:text-white md:-m-6 2xl:-m-10">
        <aside className="hidden w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#111827] md:flex">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold">Inbox</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  WhatsApp conversations
                </p>
              </div>
              <span className="rounded-full bg-[#fe901d] px-2.5 py-1 text-xs font-bold text-white">
                {unreadTotal} New
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fe901d] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setThreadFilter(filter.value)}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    threadFilter === filter.value
                      ? "bg-[#fe901d] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threadsQuery.isLoading ? (
              <div className="flex h-48 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversations
              </div>
            ) : threads.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations found.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={cn(
                    "w-full cursor-pointer border-l-2 px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5",
                    activeThread?.id === thread.id
                      ? "border-l-[#fe901d] bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.08)]"
                      : "border-l-transparent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: thread.color }}
                    >
                      {thread.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <h2 className="truncate text-sm font-semibold">{thread.name}</h2>
                        <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          {thread.timestamp}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                        {thread.preview}
                      </p>
                    </div>
                    {thread.unreadCount > 0 ? (
                      <span className="mt-0.5 rounded-full bg-[#fe901d] px-2 py-0.5 text-[10px] font-bold text-white">
                        {thread.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#0d1524]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111827] md:px-6">
            {activeThread ? (
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: activeThread.color }}
                >
                  {activeThread.initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">{activeThread.name}</h2>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {getSourceLabel(activeThread.source)} · {getStatusLabel(activeThread.status)}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-bold">Inbox</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a conversation to begin.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={!activeThread}
                asChild={Boolean(activeThread)}
              >
                {activeThread ? (
                  <Link to={`/contacts/${activeThread.id}`}>Profile</Link>
                ) : (
                  <span>Profile</span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer border-[#fe901d] text-[#fe901d] hover:bg-[#fff3e1] dark:hover:bg-white/10"
                disabled={!activeThread || isUpdatingThread}
                onClick={handleResolve}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {activeThread?.isResolved ? "Reopen" : "Resolve"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white dark:bg-[#0d1017] md:px-6">
            <div className="flex items-center gap-3">
              <span
                className={cn("h-2 w-2 rounded-full", jenniferState.dotClass)}
              />
              <span className="text-sm font-semibold">{jenniferState.label}</span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                {jenniferState.detail}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer border-slate-600 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
              disabled={!activeThread || isUpdatingThread}
              onClick={handleToggleAi}
            >
              <Bot className="mr-2 h-4 w-4" />
              {activeThread?.isAiActive ? "Take Over" : "Resume AI"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            {!activeThread ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <MessageSquare className="mb-3 h-8 w-8" />
                <p className="font-semibold">No active conversation</p>
                <p className="text-sm">New WhatsApp messages will appear here.</p>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading messages
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <MessageSquare className="mb-3 h-8 w-8" />
                <p className="font-semibold">No messages yet</p>
                <p className="text-sm">Send a message or wait for an inbound reply.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === "outbound" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs rounded-2xl px-4 py-3 text-sm shadow-sm lg:max-w-md",
                        msg.direction === "outbound"
                          ? "bg-[#fe901d] text-white"
                          : "border border-slate-200 bg-white text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-2 text-xs",
                          msg.direction === "outbound"
                            ? "text-orange-100"
                            : "text-slate-500 dark:text-slate-400",
                        )}
                      >
                        <span>{msg.timestamp}</span>
                        {getMessageSourceLabel(msg.source) ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              msg.direction === "outbound"
                                ? "bg-white/15 text-white"
                                : "bg-[#fff3e1] text-[#c96a00] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]",
                            )}
                          >
                            {getMessageSourceLabel(msg.source)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111827] md:px-6">
            <div className="flex items-end gap-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                disabled={!activeThread || isSending}
                className="min-h-[44px] flex-1 resize-none rounded-lg border-slate-200 bg-slate-100 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400"
              />
              <Button
                type="button"
                className="h-11 w-11 cursor-pointer bg-[#fe901d] p-0 text-white hover:bg-[#e08115]"
                disabled={!activeThread || !message.trim() || isSending}
                onClick={handleSend}
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {activeThread?.status === "needs-attention"
                ? "Jennifer paused this thread and flagged it for a human response."
                : activeThread?.isAiActive
                  ? "Jennifer can respond automatically for this contact."
                  : "Human takeover is active for this contact."}
            </p>
          </div>
        </main>

        <aside className="hidden w-80 flex-shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-white/10 dark:bg-[#111827] xl:flex">
          {activeThread ? (
            <div className="space-y-6 p-6">
              <div className="text-center">
                <div
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{ background: activeThread.color }}
                >
                  {activeThread.initials}
                </div>
                <h3 className="mb-1 font-bold">{activeThread.name}</h3>
                <span className="inline-block rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                  {getStatusLabel(activeThread.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer"
                  asChild
                >
                  <Link to={`/contacts/${activeThread.id}`}>Profile</Link>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleToggleAi}
                >
                  {activeThread.isAiActive ? "Take Over" : "Resume AI"}
                </Button>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Contact
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-[#fe901d]" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                      <p className="font-medium">{activeThread.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-medium">{activeThread.email ?? "Not added"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Source</p>
                    <p className="font-medium">{getSourceLabel(activeThread.source)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Assigned to</p>
                    <p className="font-medium">{activeThread.assignedTo ?? "Unassigned"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeThread.tags.length > 0 ? (
                    activeThread.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-white/10"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">No tags</span>
                  )}
                </div>
              </div>

              {activeThread.notes ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <p className="mb-1 text-xs font-semibold text-amber-900 dark:text-amber-300">
                    Latest Note
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {activeThread.notes}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <UserCheck className="h-4 w-4 text-[#fe901d]" />
                  Thread State
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeThread.isResolved
                    ? "Resolved threads stay available for history."
                    : "Open threads appear in the active conversation queue."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <MoreVertical className="mb-3 h-6 w-6" />
              Select a conversation to view contact details.
            </div>
          )}
        </aside>
      </div>
    </UserLayout>
  );
}
