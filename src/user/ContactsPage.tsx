import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  createContact as createContactOperation,
  deleteContact as deleteContactOperation,
  getContacts,
  sendContactWhatsAppMessage as sendContactWhatsAppMessageOperation,
  updateContact as updateContactOperation,
  useQuery,
} from "wasp/client/operations";
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Upload,
  UserCheck,
  UserPen,
  Users,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { Textarea } from "../client/components/ui/textarea";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContactStatus =
  | "ai-active"
  | "human-active"
  | "needs-attention"
  | "new-lead";

export type ContactSource =
  | "Facebook Ad"
  | "Instagram"
  | "Website"
  | "WhatsApp"
  | "Landing Page"
  | "Walk-in"
  | "Other";

export type ContactTag = string;

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: ContactSource;
  status: ContactStatus;
  tags: ContactTag[];
  lastMsg: string;
  lastMsgTime: string;
  assignedTo: string;
  avi: string;
  color: string;
  notes?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Style maps ───────────────────────────────────────────────────────────────

export const STATUS_META: Record<
  ContactStatus,
  { label: string; dot: string; textClass: string }
> = {
  "ai-active": {
    label: "AI Active",
    dot: "#10b981",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  "human-active": {
    label: "Human Active",
    dot: "#f97316",
    textClass: "text-orange-700 dark:text-orange-400",
  },
  "needs-attention": {
    label: "Needs Attention",
    dot: "#f59e0b",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  "new-lead": {
    label: "New Lead",
    dot: "#3b82f6",
    textClass: "text-blue-700 dark:text-blue-400",
  },
};

export const SOURCE_CLASSES: Record<ContactSource, string> = {
  "Facebook Ad":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  Instagram:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  Website:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
  WhatsApp:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  "Landing Page":
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  "Walk-in":
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
  Other:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
};

export const TAG_CLASSES: Record<string, string> = {
  Hot: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  Warm: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  Cold: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
  Buyer:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  Interested:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  Negotiation:
    "bg-[#fff7ed] text-primary border-primary/20 dark:bg-orange-950/20",
  "Follow Up":
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
  Repeat:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
};

const DEFAULT_TAG_CLASS =
  "bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10";

const ROWS_OPTIONS = [10, 25, 50] as const;
const CONTACT_SOURCES: ContactSource[] = [
  "Facebook Ad",
  "Instagram",
  "Website",
  "WhatsApp",
  "Landing Page",
  "Walk-in",
  "Other",
];
const CONTACT_STATUSES: ContactStatus[] = [
  "ai-active",
  "human-active",
  "needs-attention",
  "new-lead",
];

function normalizeFilterValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhoneSearch(value: string) {
  return value.replace(/\D/g, "");
}

function coerceContactSource(value: string): ContactSource {
  return (
    CONTACT_SOURCES.find(
      (source) => normalizeFilterValue(source) === normalizeFilterValue(value),
    ) ?? "Other"
  );
}

function coerceContactStatus(value: string): ContactStatus {
  return (
    CONTACT_STATUSES.find(
      (status) => normalizeFilterValue(status) === normalizeFilterValue(value),
    ) ?? "new-lead"
  );
}

export function makeAvi(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// ─── WhatsApp Icon ────────────────────────────────────────────────────────────

function WaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#25d366"
      className="h-3 w-3 flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ contacts }: { contacts: Contact[] }) {
  const stats = useMemo(
    () => ({
      total: contacts.length,
      activeLeads: contacts.filter(
        (c) => c.status === "ai-active" || c.status === "human-active",
      ).length,
      aiActive: contacts.filter((c) => c.status === "ai-active").length,
      needsAttention: contacts.filter((c) => c.status === "needs-attention")
        .length,
      closedWon: contacts.filter((c) => c.tags.includes("Buyer")).length,
    }),
    [contacts],
  );

  const items = [
    {
      label: "Total Contacts",
      value: stats.total,
      sub: stats.total === 0 ? "No contacts yet" : "Contacts in workspace",
      subClass: "text-muted-foreground",
      icon: <Users className="h-4 w-4" />,
      valueClass: "",
    },
    {
      label: "Active Leads",
      value: stats.activeLeads,
      sub: `${Math.round(
        (stats.activeLeads / Math.max(stats.total, 1)) * 100,
      )}% of base`,
      subClass: "text-indigo-500",
      icon: <UserCheck className="h-4 w-4" />,
      valueClass: "",
    },
    {
      label: "AI Active",
      value: stats.aiActive,
      sub: "Handled by Jennifer",
      subClass: "text-muted-foreground",
      icon: <Bot className="h-4 w-4" />,
      valueClass: "",
    },
    {
      label: "Needs Attention",
      value: stats.needsAttention,
      sub: "Follow up due",
      subClass: "text-amber-500",
      icon: <AlertTriangle className="h-4 w-4" />,
      valueClass:
        stats.needsAttention > 0 ? "text-amber-600 dark:text-amber-400" : "",
    },
    {
      label: "Closed Won",
      value: stats.closedWon,
      sub: "This month",
      subClass: "text-primary",
      icon: <Trophy className="h-4 w-4" />,
      valueClass: "text-primary",
    },
  ];

  return (
    <div className="flex overflow-hidden rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-1 flex-col gap-0.5 px-5 py-4",
            i < items.length - 1 &&
              "border-r border-[#f0ebe4] dark:border-white/10",
            i >= 2 && "hidden sm:flex",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {item.label}
            </span>
            <span className="text-muted-foreground/40">{item.icon}</span>
          </div>
          <span
            className={cn(
              "text-3xl font-bold tracking-tight text-foreground",
              item.valueClass,
            )}
          >
            {item.value}
          </span>
          <span className={cn("text-xs font-medium", item.subClass)}>
            {item.sub}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Row Action Dropdown ──────────────────────────────────────────────────────

function RowDropdown({
  onEdit,
  onDelete,
  onMessage,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={buttonRef}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-slate-200"
        onClick={() => setOpen((v) => !v)}
        title="More options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] flex w-44 flex-col rounded-lg border border-border/60 bg-card p-1 shadow-lg shadow-black/10 dark:border-white/10 dark:bg-[#0d1524] dark:shadow-black/40"
          style={{ top: menuPosition.top, right: menuPosition.right }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <UserPen className="h-4 w-4" /> Edit Contact
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onMessage();
            }}
          >
            <MessageSquare className="h-4 w-4" /> Send Message
          </button>
          <div className="my-1 h-px bg-border/60" />
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete Contact
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Contact Table Row ────────────────────────────────────────────────────────

function ContactRow({
  contact,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onMessage,
  onClick,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  onClick: () => void;
}) {
  const sm = STATUS_META[contact.status];

  return (
    <tr
      className="group cursor-pointer border-b border-[#f0ebe4] transition-colors last:border-b-0 hover:bg-[#fafafa] dark:border-white/5 dark:hover:bg-white/5"
      onClick={onClick}
    >
      {/* Checkbox */}
      <td className="w-10 px-4 py-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
        />
      </td>

      {/* Name + phone */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: contact.color }}
          >
            {contact.avi}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {contact.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <WaIcon /> {contact.phone}
            </p>
          </div>
        </div>
      </td>

      {/* Source */}
      <td className="hidden px-4 py-3.5 lg:table-cell">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
            SOURCE_CLASSES[contact.source],
          )}
        >
          {contact.source}
        </span>
      </td>

      {/* Status */}
      <td className="hidden px-4 py-3.5 md:table-cell">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: sm.dot }}
          />
          <span className={cn("text-sm font-semibold", sm.textClass)}>
            {sm.label}
          </span>
        </div>
      </td>

      {/* Tags */}
      <td className="hidden px-4 py-3.5 xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                TAG_CLASSES[tag] ?? DEFAULT_TAG_CLASS,
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </td>

      {/* Last message */}
      <td className="hidden px-4 py-3.5 lg:table-cell">
        <p className="max-w-[180px] truncate text-sm text-muted-foreground">
          {contact.lastMsg}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          {contact.lastMsgTime}
        </p>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-slate-200"
            title="Send message"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <RowDropdown onEdit={onEdit} onDelete={onDelete} onMessage={onMessage} />
        </div>
      </td>
    </tr>
  );
}

// ─── Draft type & modal ───────────────────────────────────────────────────────

type DraftContact = {
  name: string;
  phone: string;
  email: string;
  source: ContactSource;
  status: ContactStatus;
  assignedTo: string;
  tags: string;
  notes: string;
};

const EMPTY_DRAFT: DraftContact = {
  name: "",
  phone: "",
  email: "",
  source: "Website",
  status: "new-lead",
  assignedTo: "Agent A",
  tags: "",
  notes: "",
};

function ContactModal({
  open,
  onClose,
  draft,
  setDraft,
  onSave,
  isEditing,
  error,
}: {
  open: boolean;
  onClose: () => void;
  draft: DraftContact;
  setDraft: React.Dispatch<React.SetStateAction<DraftContact>>;
  onSave: () => void;
  isEditing: boolean;
  error: string;
}) {
  const set = <K extends keyof DraftContact>(key: K, val: DraftContact[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));
  const inputClass =
    "h-10 border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";
  const selectTriggerClass =
    "h-10 cursor-pointer border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none focus:border-[#fe901d] focus:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100";
  const selectContentClass =
    "border-[#e8e2d8] bg-white text-foreground shadow-xl dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] overflow-hidden border-[#e8e2d8] bg-white text-foreground shadow-2xl shadow-black/10 sm:max-w-[640px] sm:rounded-xl dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100 dark:shadow-black/50">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the contact details below."
              : "Fill in the details to add a new contact."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                className={inputClass}
                placeholder="e.g. John Doe"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Phone / WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                className={inputClass}
                placeholder="+1 (555) 000-0000"
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Email{" "}
                <span className="text-xs font-normal normal-case text-muted-foreground">
                  (Optional)
                </span>
              </Label>
              <Input
                className={inputClass}
                type="email"
                placeholder="john@example.com"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Source
              </Label>
              <Select
                value={draft.source}
                onValueChange={(v) => set("source", v as ContactSource)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {(
                    [
                      "Facebook Ad",
                      "Instagram",
                      "Website",
                      "WhatsApp",
                      "Landing Page",
                      "Walk-in",
                      "Other",
                    ] as ContactSource[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Status
              </Label>
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as ContactStatus)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="new-lead">New Lead</SelectItem>
                  <SelectItem value="ai-active">AI Active</SelectItem>
                  <SelectItem value="human-active">Human Active</SelectItem>
                  <SelectItem value="needs-attention">
                    Needs Attention
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Assigned To
              </Label>
              <Select
                value={draft.assignedTo}
                onValueChange={(v) => set("assignedTo", v)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="Agent A">Agent A</SelectItem>
                  <SelectItem value="Agent B">Agent B</SelectItem>
                  <SelectItem value="Agent C">Agent C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">
              Tags{" "}
              <span className="text-xs font-normal normal-case text-muted-foreground">
                (comma separated)
              </span>
            </Label>
            <Input
              className={inputClass}
              placeholder="e.g. Hot, Buyer, Negotiation"
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">
              Notes
            </Label>
            <Textarea
              className="h-20 resize-none border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Optional notes…"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {isEditing ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteModal({
  open,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <DialogTitle className="text-xl">Delete Contact?</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{name}</span>?
              This cannot be undone.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-2 sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendMessageModal({
  open,
  contact,
  message,
  setMessage,
  sending,
  error,
  onClose,
  onSend,
}: {
  open: boolean;
  contact: Contact | null;
  message: string;
  setMessage: (message: string) => void;
  sending: boolean;
  error: string;
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-[#e8e2d8] bg-white text-foreground sm:max-w-[520px] dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
          <DialogDescription>
            {contact
              ? `Send a direct WhatsApp message to ${contact.name}.`
              : "Send a direct WhatsApp message."}
          </DialogDescription>
        </DialogHeader>

        {contact && (
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground dark:border-white/10 dark:bg-[#0b1324]">
            {contact.phone}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <Textarea
          className="min-h-32 border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Type the WhatsApp message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={sending || !message.trim()}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const contactsQuery = useQuery(getContacts);

  const contacts = (contactsQuery.data as Contact[] | undefined) ?? [];

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] =
    useState<(typeof ROWS_OPTIONS)[number]>(10);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftContact>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messagingContact, setMessagingContact] = useState<Contact | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const phoneQuery = normalizePhoneSearch(q);
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        Boolean(phoneQuery && normalizePhoneSearch(c.phone).includes(phoneQuery)) ||
        Boolean(c.email?.toLowerCase().includes(q)) ||
        c.tags.some((tag) => tag.toLowerCase().includes(q));

      if (!matchesSearch) {
        return false;
      }
      if (
        filterStatus !== "all" &&
        normalizeFilterValue(c.status) !== filterStatus
      ) {
        return false;
      }
      if (
        filterSource !== "all" &&
        normalizeFilterValue(c.source) !== filterSource
      ) {
        return false;
      }
      if (
        filterTag !== "all" &&
        !c.tags.some((t) => normalizeFilterValue(t) === filterTag)
      ) {
        return false;
      }
      if (
        filterAgent !== "all" &&
        normalizeFilterValue(c.assignedTo) !== filterAgent
      ) {
        return false;
      }
      return true;
    });
  }, [contacts, search, filterStatus, filterSource, filterTag, filterAgent]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageContacts = filtered.slice(pageStart, pageStart + rowsPerPage);

  function resetPage() {
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    filterStatus !== "all" ||
    filterSource !== "all" ||
    filterTag !== "all" ||
    filterAgent !== "all";

  function clearFilters() {
    setSearch("");
    setFilterStatus("all");
    setFilterSource("all");
    setFilterTag("all");
    setFilterAgent("all");
    resetPage();
  }

  // Selection
  const allPageSelected =
    pageContacts.length > 0 && pageContacts.every((c) => selectedIds.has(c.id));
  function toggleAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageContacts.forEach((c) =>
        checked ? next.add(c.id) : next.delete(c.id),
      );
      return next;
    });
  }

  // Add / Edit
  function openAdd() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setDraftError("");
    setAddEditOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingId(contact.id);
    setDraft({
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? "",
      source: contact.source,
      status: contact.status,
      assignedTo: contact.assignedTo,
      tags: contact.tags.join(", "),
      notes: contact.notes ?? "",
    });
    setDraftError("");
    setAddEditOpen(true);
  }

  async function saveContact() {
    if (!draft.name.trim() || !draft.phone.trim()) {
      setDraftError("Name and Phone are required.");
      return;
    }
    setDraftError("");
    const rawTags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean) as ContactTag[];
    const tags =
      rawTags.length > 0 ? rawTags : (["Interested"] as ContactTag[]);

    try {
      if (editingId) {
        await updateContactOperation({
          id: editingId,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email,
          source: draft.source,
          status: draft.status,
          assignedTo: draft.assignedTo,
          tags,
          notes: draft.notes,
        });
        toast({ title: "Contact updated" });
      } else {
        await createContactOperation({
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email,
          source: draft.source,
          status: draft.status,
          assignedTo: draft.assignedTo,
          tags,
          notes: draft.notes,
        });
        toast({ title: "Contact added" });
      }
      setAddEditOpen(false);
    } catch (err: any) {
      setDraftError(err?.message || "Could not save contact.");
    }
  }

  // Delete
  function openDelete(contact: Contact) {
    setDeletingContact(contact);
    setDeleteOpen(true);
  }
  async function confirmDelete() {
    if (!deletingContact) return;
    try {
      await deleteContactOperation({ id: deletingContact.id });
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(deletingContact.id);
        return n;
      });
      toast({ title: "Contact deleted" });
      setDeleteOpen(false);
      setDeletingContact(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not delete contact",
        description: err?.message || "Please try again.",
      });
    }
  }

  function openMessage(contact: Contact) {
    setMessagingContact(contact);
    setMessageDraft("");
    setMessageError("");
    setMessageOpen(true);
  }

  async function sendMessage() {
    if (!messagingContact || !messageDraft.trim()) {
      setMessageError("Type a message first.");
      return;
    }

    setMessageSending(true);
    setMessageError("");
    try {
      await sendContactWhatsAppMessageOperation({
        contactId: messagingContact.id,
        message: messageDraft.trim(),
      });
      toast({ title: "Message sent" });
      setMessageOpen(false);
      setMessagingContact(null);
      setMessageDraft("");
      await contactsQuery.refetch?.();
    } catch (err: any) {
      setMessageError(err?.message || "Could not send message.");
    } finally {
      setMessageSending(false);
    }
  }

  function exportContacts() {
    const rows = filtered.length > 0 ? filtered : contacts;
    const headers = [
      "name",
      "phone",
      "email",
      "source",
      "status",
      "tags",
      "assignedTo",
      "notes",
      "lastMessage",
    ];
    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((contact) =>
        [
          contact.name,
          contact.phone,
          contact.email ?? "",
          contact.source,
          contact.status,
          contact.tags.join("|"),
          contact.assignedTo,
          contact.notes ?? "",
          contact.lastMsg === "No messages yet" ? "" : contact.lastMsg,
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quicreply-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  async function importContacts(file: File) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      toast({
        variant: "destructive",
        title: "Import file is empty",
        description: "Use a CSV with name and phone columns.",
      });
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) =>
      header.toLowerCase().replace(/\s+/g, ""),
    );
    let imported = 0;
    let failed = 0;

    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      const getValue = (key: string) => {
        const index = headers.indexOf(key);
        return index >= 0 ? values[index] ?? "" : "";
      };

      const name = getValue("name") || getValue("fullname");
      const phone = getValue("phone") || getValue("whatsapp");
      if (!name || !phone) {
        failed += 1;
        continue;
      }

      try {
        await createContactOperation({
          name,
          phone,
          email: getValue("email"),
          source: coerceContactSource(getValue("source")),
          status: coerceContactStatus(getValue("status")),
          assignedTo: getValue("assignedto") || "",
          tags: (getValue("tags") || "Interested")
            .split(/[|,]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          notes: getValue("notes"),
        });
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    await contactsQuery.refetch?.();
    toast({
      title: "Import finished",
      description:
        failed > 0
          ? `${imported} imported, ${failed} skipped.`
          : `${imported} contacts imported.`,
    });
  }

  // Page numbers
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (safePage >= totalPages - 3)
      return [
        1,
        "…",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "…", safePage - 1, safePage, safePage + 1, "…", totalPages];
  }, [totalPages, safePage]);

  const filterRows = [
    {
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        { v: "all", l: "Status" },
        { v: "ai-active", l: "AI Active" },
        { v: "human-active", l: "Human Active" },
        { v: "needs-attention", l: "Needs Attention" },
        { v: "new-lead", l: "New Lead" },
      ],
    },
    {
      value: filterSource,
      onChange: setFilterSource,
      options: [
        { v: "all", l: "Source" },
        { v: "facebook-ad", l: "Facebook Ad" },
        { v: "instagram", l: "Instagram" },
        { v: "whatsapp", l: "WhatsApp" },
        { v: "landing-page", l: "Landing Page" },
        { v: "website", l: "Website" },
        { v: "walk-in", l: "Walk-in" },
        { v: "other", l: "Other" },
      ],
    },
    {
      value: filterTag,
      onChange: setFilterTag,
      options: [
        { v: "all", l: "Tags" },
        { v: "hot", l: "Hot" },
        { v: "warm", l: "Warm" },
        { v: "cold", l: "Cold" },
      ],
    },
    {
      value: filterAgent,
      onChange: setFilterAgent,
      options: [
        { v: "all", l: "Assigned To" },
        { v: "agent-a", l: "Agent A" },
        { v: "agent-b", l: "Agent B" },
        { v: "agent-c", l: "Agent C" },
      ],
    },
  ] as const;

  return (
    <UserLayout user={user}>
      <div className="flex flex-col gap-5">
        {/* ── Page header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Contacts
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage and organise all your leads and customers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importContacts(file);
                }
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => importInputRef.current?.click()}
              title="Import contacts from CSV"
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportContacts}
              disabled={contacts.length === 0}
              title="Export contacts to CSV"
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <StatBar contacts={contacts} />

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm dark:bg-[#0d1524] dark:border-white/10 dark:shadow-none">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] px-3 py-2 outline-none transition-colors focus-within:border-[#f3d2a5] focus-within:bg-white dark:border-white/10 dark:bg-[#111827] dark:focus-within:border-[#fe901d]/40 dark:focus-within:bg-[#111827]">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>

          <div className="h-5 w-px bg-[#e8e2d8] dark:bg-white/10" />

          {filterRows.map((f, i) => (
            <select
              key={i}
              className="cursor-pointer rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] px-3 py-2 text-sm font-semibold text-[#172033] outline-none transition-colors hover:bg-white focus:border-[#f3d2a5] dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5 dark:focus:border-[#fe901d]/40"
              value={f.value}
              onChange={(e) => {
                f.onChange(e.target.value);
                resetPage();
              }}
            >
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ))}

          <div className="h-5 w-px bg-[#e8e2d8] dark:bg-white/10" />

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            title={hasActiveFilters ? "Clear active filters" : "No active filters"}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters ? "Clear Filters" : "Filters Ready"}
          </Button>
        </div>

        {/* ── Table card ── */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm dark:bg-[#0d1524] dark:border-white/10 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#e8e2d8] bg-[#f7f8fa] dark:border-white/10 dark:bg-white/5">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </th>
                  {[
                    { label: "Name", cls: "" },
                    { label: "Source", cls: "hidden lg:table-cell" },
                    { label: "Status", cls: "hidden md:table-cell" },
                    { label: "Tags", cls: "hidden xl:table-cell" },
                    { label: "Last Message", cls: "hidden lg:table-cell" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-slate-500",
                        col.cls,
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {contactsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Loading contacts
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : pageContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted">
                          <Search className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          No contacts found
                        </p>
                        <p className="text-sm text-muted-foreground/60">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageContacts.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      selected={selectedIds.has(contact.id)}
                      onSelect={(checked) =>
                        setSelectedIds((prev) => {
                          const n = new Set(prev);
                          checked ? n.add(contact.id) : n.delete(contact.id);
                          return n;
                        })
                      }
                      onEdit={() => openEdit(contact)}
                      onDelete={() => openDelete(contact)}
                      onMessage={() => openMessage(contact)}
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3 dark:border-white/10">
            <span className="text-sm text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to{" "}
              {Math.min(pageStart + rowsPerPage, filtered.length)} of{" "}
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            </span>

            <div className="flex items-center gap-1">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((p, i) =>
                p === "…" ? (
                  <span
                    key={`e${i}`}
                    className="px-1 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                      p === safePage
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Rows per page
              <select
                className="rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] px-2 py-1 text-sm font-semibold text-[#172033] outline-none dark:border-white/10 dark:bg-[#111827] dark:text-slate-200"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(
                    Number(e.target.value) as (typeof ROWS_OPTIONS)[number],
                  );
                  setPage(1);
                }}
              >
                {ROWS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <ContactModal
        open={addEditOpen}
        onClose={() => setAddEditOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSave={saveContact}
        isEditing={!!editingId}
        error={draftError}
      />
      <DeleteModal
        open={deleteOpen}
        name={deletingContact?.name ?? ""}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
      <SendMessageModal
        open={messageOpen}
        contact={messagingContact}
        message={messageDraft}
        setMessage={setMessageDraft}
        sending={messageSending}
        error={messageError}
        onClose={() => setMessageOpen(false)}
        onSend={sendMessage}
      />
    </UserLayout>
  );
}
