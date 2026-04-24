import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserPen,
  Users,
  MessageSquareQuote,
  Phone,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { cn } from "../client/utils";

type ContactStatus = "new" | "active" | "customer" | "inactive";
type ContactSource =
  | "Facebook Ad"
  | "Inbound WhatsApp"
  | "Website Form"
  | "Referral";

type Contact = {
  id: string;
  name: string;
  phone: string;
  status: ContactStatus;
  source: ContactSource;
};

const statusOptions: Array<{ value: ContactStatus; label: string }> = [
  { value: "new", label: "New lead" },
  { value: "active", label: "Active" },
  { value: "customer", label: "Customer" },
  { value: "inactive", label: "Inactive" },
];

const sourceOptions: ContactSource[] = [
  "Facebook Ad",
  "Inbound WhatsApp",
  "Website Form",
  "Referral",
];

const initialContacts: Contact[] = [
  {
    id: "cnt_001",
    name: "Sarah Johnson",
    phone: "+234 801 554 1288",
    status: "new",
    source: "Facebook Ad",
  },
  {
    id: "cnt_002",
    name: "Mike Adebayo",
    phone: "+234 803 225 9901",
    status: "active",
    source: "Inbound WhatsApp",
  },
  {
    id: "cnt_003",
    name: "Chioma Nwosu",
    phone: "+234 806 019 8224",
    status: "customer",
    source: "Referral",
  },
  {
    id: "cnt_004",
    name: "David Ojo",
    phone: "+234 809 116 4402",
    status: "inactive",
    source: "Website Form",
  },
  {
    id: "cnt_005",
    name: "Nadia Hussain",
    phone: "+92 300 877 5124",
    status: "active",
    source: "Facebook Ad",
  },
];

const emptyDraft: Omit<Contact, "id"> = {
  name: "",
  phone: "",
  status: "new",
  source: "Inbound WhatsApp",
};

function statusBadge(status: ContactStatus) {
  switch (status) {
    case "new":
      return "bg-blue-500/10 text-blue-700";
    case "active":
      return "bg-emerald-500/10 text-emerald-700";
    case "customer":
      return "bg-primary/10 text-primary";
    case "inactive":
      return "bg-slate-500/10 text-slate-700";
  }
}

function sourceBadge(source: ContactSource) {
  switch (source) {
    case "Facebook Ad":
      return "bg-indigo-500/10 text-indigo-700";
    case "Inbound WhatsApp":
      return "bg-emerald-500/10 text-emerald-700";
    case "Website Form":
      return "bg-amber-500/10 text-amber-700";
    case "Referral":
      return "bg-purple-500/10 text-purple-700";
  }
}

export default function ContactsPage({ user }: { user: AuthUser }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Contact, "id">>(emptyDraft);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) =>
      [contact.name, contact.phone, contact.source]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [contacts, search]);

  const stats = useMemo(() => {
    return {
      total: contacts.length,
      inbound: contacts.filter((contact) => contact.source === "Inbound WhatsApp").length,
      ads: contacts.filter((contact) => contact.source === "Facebook Ad").length,
      active: contacts.filter((contact) => contact.status === "active").length,
    };
  }, [contacts]);

  function openAddModal() {
    setEditingContactId(null);
    setDraft(emptyDraft);
    setIsDialogOpen(true);
  }

  function openEditModal(contact: Contact) {
    setEditingContactId(contact.id);
    setDraft({
      name: contact.name,
      phone: contact.phone,
      status: contact.status,
      source: contact.source,
    });
    setIsDialogOpen(true);
  }

  function resetDialog() {
    setIsDialogOpen(false);
    setEditingContactId(null);
    setDraft(emptyDraft);
  }

  function saveContact() {
    if (!draft.name.trim() || !draft.phone.trim()) {
      return;
    }

    if (editingContactId) {
      setContacts((currentContacts) =>
        currentContacts.map((contact) =>
          contact.id === editingContactId
            ? { ...contact, ...draft, name: draft.name.trim(), phone: draft.phone.trim() }
            : contact,
        ),
      );
    } else {
      setContacts((currentContacts) => [
        {
          id: `cnt_${Date.now()}`,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          status: draft.status,
          source: draft.source,
        },
        ...currentContacts,
      ]);
    }

    resetDialog();
  }

  function deleteContact(contactId: string) {
    setContacts((currentContacts) =>
      currentContacts.filter((contact) => contact.id !== contactId),
    );
  }

  const isDraftValid = draft.name.trim().length > 0 && draft.phone.trim().length > 0;

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Contacts</p>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Contacts Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage inbound leads and ad-driven contacts before the real backend lands.
            </p>
          </div>

          <Button className="shrink-0" onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Total contacts
                </p>
                <Users className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Inbound WhatsApp
                </p>
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{stats.inbound}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Facebook Ads
                </p>
                <Phone className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{stats.ads}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Active
                </p>
                <Users className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{stats.active}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-border/60">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Contacts table
                </p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                  Mock contacts list
                </h2>
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, or source"
                  value={search}
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/60">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Source
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60 bg-card">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-muted/20">
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">ID: {contact.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">{contact.phone}</td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
                              statusBadge(contact.status),
                            )}
                          >
                            {statusOptions.find((option) => option.value === contact.status)?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                              sourceBadge(contact.source),
                            )}
                          >
                            {contact.source}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(contact)}>
                                <UserPen className="h-4 w-4" />
                                Edit contact
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => deleteContact(contact.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete contact
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}

                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-sm text-muted-foreground" colSpan={5}>
                          No contacts match your search yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>
                {editingContactId ? "Edit contact" : "Add contact"}
              </DialogTitle>
              <DialogDescription>
                This is UI-only for now. Changes stay in local page state using mock data.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Sarah Johnson"
                  value={draft.name}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+234 801 000 0000"
                  value={draft.phone}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(value: ContactStatus) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        status: value,
                      }))
                    }
                    value={draft.status}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select
                    onValueChange={(value: ContactSource) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        source: value,
                      }))
                    }
                    value={draft.source}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={resetDialog} variant="outline">
                Cancel
              </Button>
              <Button disabled={!isDraftValid} onClick={saveContact}>
                {editingContactId ? "Save changes" : "Add contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}
