import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  getContact,
  updateContact as updateContactOperation,
  useQuery,
} from "wasp/client/operations";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Tag,
  UserCheck,
  UserPen,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import {
  SOURCE_CLASSES,
  STATUS_META,
  TAG_CLASSES,
  type Contact,
  type ContactTag,
} from "./ContactsPage";

// ─── Timeline event types ─────────────────────────────────────────────────────

type TimelineEventKind =
  | "message-received"
  | "ai-response"
  | "note-added"
  | "status-changed"
  | "contact-created";

type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  label: string;
  body: string;
  time: string;
};

const EVENT_META: Record<
  TimelineEventKind,
  { dotClass: string; labelClass: string; cardClass: string }
> = {
  "message-received": {
    dotClass: "bg-primary",
    labelClass: "text-[#182235] dark:text-slate-100",
    cardClass: "border-border/60 bg-card",
  },
  "ai-response": {
    dotClass: "bg-[#fe901d]",
    labelClass: "text-primary",
    cardClass: "border-primary/20 bg-[#fff7ed] dark:bg-[#fe901d]/10",
  },
  "note-added": {
    dotClass: "bg-blue-500",
    labelClass: "text-blue-600 dark:text-blue-400",
    cardClass: "border-border/60 bg-card",
  },
  "status-changed": {
    dotClass: "bg-indigo-500",
    labelClass: "text-indigo-600 dark:text-indigo-400",
    cardClass: "border-border/60 bg-card",
  },
  "contact-created": {
    dotClass: "bg-slate-300 dark:bg-slate-600",
    labelClass: "text-slate-500 dark:text-slate-400",
    cardClass: "border-border/60 bg-card",
  },
};

// ─── Build a dynamic timeline from contact data ───────────────────────────────

function buildTimeline(contact: Contact): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Show last message if present
  if (contact.lastMsg && contact.lastMsg !== "No messages yet") {
    events.push({
      id: "last-msg",
      kind: "message-received",
      label: "Last Message",
      body: `"${contact.lastMsg}"`,
      time: contact.lastMsgTime,
    });

    // If AI is active, show an AI response event
    if (contact.status === "ai-active") {
      events.push({
        id: "ai-resp",
        kind: "ai-response",
        label: "AI Response Sent",
        body: "Jennifer (AI) automatically responded to this message.",
        time: contact.lastMsgTime,
      });
    }
  }

  // Show status info
  const sm = STATUS_META[contact.status];
  if (contact.status !== "new-lead") {
    events.push({
      id: "status",
      kind: "status-changed",
      label: "Status Updated",
      body: `Contact status set to "${sm.label}".`,
      time: contact.lastMsgTime || "Recently",
    });
  }

  // Show notes if present
  if (contact.notes) {
    events.push({
      id: "notes",
      kind: "note-added",
      label: "Internal Note",
      body: contact.notes,
      time: "Added by team",
    });
  }

  // Contact created is always the last event
  events.push({
    id: "created",
    kind: "contact-created",
    label: "Contact Created",
    body: `Lead captured via ${contact.source}.`,
    time: "Origin",
  });

  return events;
}

// ─── WhatsApp Icon ─────────────────────────────────────────────────────────────

function WaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#25d366"
      className={cn("h-4 w-4 flex-shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

// ─── Left sidebar: profile overview ──────────────────────────────────────────

function ProfileSidebar({
  contact,
  onSaveNotes,
}: {
  contact: Contact;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(
    contact.notes ?? "No internal notes yet. Click to add some.",
  );
  const [dirty, setDirty] = useState(false);
  const sm = STATUS_META[contact.status];

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-border/60 bg-card p-8">
      {/* Avatar + name + status badge */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-sm"
          style={{ background: contact.color }}
        >
          {contact.avi}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#182235] dark:text-slate-50">
            {contact.name}
          </h2>
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: sm.dot }}
            />
            <span className={cn("text-sm font-semibold", sm.textClass)}>
              {sm.label}
            </span>
          </div>
        </div>

        {/* Top tag as a badge */}
        {contact.tags.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider",
              TAG_CLASSES[contact.tags[0]],
            )}
          >
            {contact.tags[0]}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Contact info */}
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Contact Method
          </p>
          <p className="flex items-center gap-2 text-sm font-bold text-[#182235] dark:text-slate-100">
            <WaIcon /> {contact.phone}
          </p>
          {contact.email && (
            <p className="mt-1 text-sm text-muted-foreground">{contact.email}</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Lead Source
          </p>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
              SOURCE_CLASSES[contact.source],
            )}
          >
            {contact.source}
          </span>
        </div>

        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Assigned To
          </p>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {contact.assignedTo}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                  TAG_CLASSES[tag as ContactTag],
                )}
              >
                {tag}
              </span>
            ))}
            <button className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-border/80 hover:bg-muted">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Internal notes — saved to DB */}
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Internal Notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm italic leading-relaxed text-slate-700 outline-none transition-colors focus:border-amber-300 focus:bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-slate-300"
          rows={5}
        />
        {dirty && (
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onSaveNotes(notes);
              setDirty(false);
            }}
          >
            Save Notes
          </Button>
        )}
      </div>
    </aside>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          No activity recorded yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const meta = EVENT_META[event.kind];
        const isLast = i === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-border/50" />
            )}

            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 border-card",
                meta.dotClass,
              )}
            />

            {/* Card */}
            <div
              className={cn(
                "flex-1 rounded-xl border p-4",
                meta.cardClass,
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    meta.labelClass,
                  )}
                >
                  {event.label}
                </span>
                <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">
                  {event.time}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {event.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ContactProfilePage({ user }: { user: AuthUser }) {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch contact from the real database
  const contactQuery = useQuery(getContact, { id: contactId ?? "" });
  const contact = contactQuery.data as Contact | null | undefined;

  // Loading state
  if (contactQuery.isLoading) {
    return (
      <UserLayout user={user}>
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <Loader2 className="h-7 w-7 animate-spin text-[#fe901d]" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Loading contact…
          </p>
        </div>
      </UserLayout>
    );
  }

  // 404 state
  if (!contact) {
    return (
      <UserLayout user={user}>
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <Phone className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Contact not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The contact you're looking for doesn't exist or was deleted.
            </p>
          </div>
          <Button onClick={() => navigate("/contacts")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Contacts
          </Button>
        </div>
      </UserLayout>
    );
  }

  // Build dynamic timeline from real contact data
  const timelineEvents = buildTimeline(contact);

  async function handleSaveNotes(newNotes: string) {
    try {
      await updateContactOperation({
        id: contact!.id,
        name: contact!.name,
        phone: contact!.phone,
        email: contact!.email ?? "",
        source: contact!.source,
        status: contact!.status,
        assignedTo: contact!.assignedTo,
        tags: contact!.tags,
        notes: newNotes,
      });
      toast({ title: "Notes saved" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not save notes",
        description: err?.message || "Please try again.",
      });
    }
  }

  return (
    <UserLayout user={user}>
      {/* Override the default layout padding with a full-bleed flex layout */}
      <div className="-m-4 flex min-h-[calc(100vh-64px)] flex-col md:-m-6 2xl:-m-10">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-6 py-3">
          <button
            onClick={() => navigate("/contacts")}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </button>
          <p className="text-xs font-semibold text-muted-foreground">
            Contact Intelligence
          </p>
        </div>

        {/* ── Body: sidebar + timeline ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: profile sidebar */}
          <ProfileSidebar contact={contact} onSaveNotes={handleSaveNotes} />

          {/* Right: interaction timeline */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 dark:bg-[#0b1220]/50 md:p-10">
            <div className="mx-auto max-w-2xl">

              {/* Timeline header */}
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold tracking-tight text-[#182235] dark:text-white">
                  Interaction Timeline
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled
                    title="Coming soon"
                  >
                    <Send className="h-4 w-4" /> Send Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled
                    title="Coming soon"
                  >
                    <Calendar className="h-4 w-4" /> Schedule Call
                  </Button>
                </div>
              </div>

              {/* Quick action chips */}
              <div className="mb-6 flex flex-wrap gap-2">
                {[
                  { icon: <Tag className="h-3.5 w-3.5" />, label: "Add Tag" },
                  { icon: <UserPen className="h-3.5 w-3.5" />, label: "Edit Contact" },
                  { icon: <Bot className="h-3.5 w-3.5" />, label: "AI Summary" },
                  { icon: <MessageSquare className="h-3.5 w-3.5" />, label: "View Inbox" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    disabled
                    title="Coming soon"
                    className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chip.icon} {chip.label}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              <Timeline events={timelineEvents} />
            </div>
          </div>

        </div>
      </div>
    </UserLayout>
  );
}
