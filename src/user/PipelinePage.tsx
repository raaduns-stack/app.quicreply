import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  createDeal,
  getContacts,
  getPipelineState,
  setActivePipelineTemplate,
  updateDealStage,
  useQuery,
} from "wasp/client/operations";
import { Inbox, Plus, X } from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { Textarea } from "../client/components/ui/textarea";
import { useToast } from "../client/hooks/use-toast";

type Priority = "urgent" | "high" | "normal" | "low";

type Deal = {
  id: string;
  customerName: string;
  phone?: string;
  contactId?: string;
  value: number;
  currency: string;
  status: string;
  priorityLevel: Priority;
  agentInitials: string;
  date: string;
  stageId: string;
  isStale: boolean;
};

type PipelineStage = {
  id: string;
  slug: string;
  name: string;
  color: string;
  value: number;
  count: number;
  deals: Deal[];
};

type PipelineTemplate = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
};

type PipelineState = {
  templates: PipelineTemplate[];
  activeTemplate: PipelineTemplate;
  stages: PipelineStage[];
  stats: {
    totalValue: number;
    dealCount: number;
    winRate: number;
    currency: string;
  };
};

type ContactOption = {
  id: string;
  name: string;
  phone: string;
};

const priorityColors: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const stageDotColors: Record<string, string> = {
  gray: "bg-slate-400",
  indigo: "bg-indigo-400",
  amber: "bg-amber-400",
  green: "bg-green-400",
  red: "bg-red-400",
};

const emptyForm = {
  contactId: "",
  customerName: "",
  phone: "",
  dealValue: "",
  priority: "normal" as Priority,
  stageId: "",
  notes: "",
};

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function PipelinePage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const pipelineQuery = useQuery(getPipelineState);
  const contactsQuery = useQuery(getContacts, {});
  const pipeline = pipelineQuery.data as PipelineState | undefined;
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [isChangingTemplate, setIsChangingTemplate] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);

  useEffect(() => {
    if (pipeline?.activeTemplate?.id && !selectedTemplateId) {
      setSelectedTemplateId(pipeline.activeTemplate.id);
    }
  }, [pipeline?.activeTemplate?.id, selectedTemplateId]);

  useEffect(() => {
    if (!formData.stageId && pipeline?.stages?.[0]?.id) {
      setFormData((current) => ({ ...current, stageId: pipeline.stages[0].id }));
    }
  }, [formData.stageId, pipeline?.stages]);

  const stages = pipeline?.stages ?? [];
  const templates = pipeline?.templates ?? [];
  const contacts = (contactsQuery.data ?? []) as ContactOption[];
  const stats = pipeline?.stats ?? {
    totalValue: 0,
    dealCount: 0,
    winRate: 0,
    currency: "NGN",
  };

  const stageIndexById = useMemo(() => {
    return new Map(stages.map((stage, index) => [stage.id, index]));
  }, [stages]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone/WhatsApp is required";
    }

    if (!formData.dealValue.trim()) {
      newErrors.dealValue = "Deal value is required";
    } else if (Number.isNaN(Number(formData.dealValue))) {
      newErrors.dealValue = "Deal value must be a number";
    }

    if (!formData.stageId) {
      newErrors.stageId = "Choose a pipeline stage";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      stageId: stages[0]?.id ?? "",
    });
    setErrors({});
  };

  const handleContactSelect = (value: string) => {
    if (value === "new-contact") {
      setFormData((current) => ({ ...current, contactId: "" }));
      return;
    }

    const contact = contacts.find((item) => item.id === value);
    if (!contact) return;

    setFormData((current) => ({
      ...current,
      contactId: contact.id,
      customerName: contact.name,
      phone: contact.phone,
    }));
    setErrors((current) => {
      const { customerName, phone, ...rest } = current;
      return rest;
    });
  };

  const handlePipelineChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsChangingTemplate(true);

    try {
      await setActivePipelineTemplate({ templateId });
      await pipelineQuery.refetch();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Could not switch pipeline",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsChangingTemplate(false);
    }
  };

  const handleSaveDeal = async () => {
    if (!validateForm()) return;

    setIsSavingDeal(true);

    try {
      await createDeal({
        contactId: formData.contactId || undefined,
        customerName: formData.customerName,
        phone: formData.phone,
        value: Number(formData.dealValue),
        currency: stats.currency || "NGN",
        priorityLevel: formData.priority,
        stageId: formData.stageId,
        templateId: selectedTemplateId || pipeline?.activeTemplate.id,
        notes: formData.notes,
      });
      await pipelineQuery.refetch();
      setShowAddModal(false);
      resetForm();
      toast({
        title: "Deal added",
        description: "The pipeline now has the latest deal.",
      });
    } catch (error) {
      toast({
        title: "Could not add deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingDeal(false);
    }
  };

  const handleAdvanceStage = async (deal: Deal) => {
    const currentIndex = stageIndexById.get(deal.stageId) ?? -1;
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      return;
    }

    setMovingDealId(deal.id);

    try {
      await updateDealStage({ id: deal.id, stageId: nextStage.id });
      await pipelineQuery.refetch();
    } catch (error) {
      toast({
        title: "Could not move deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setMovingDealId(null);
    }
  };

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Sales Pipeline
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track and manage your deals across the funnel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Select
                value={selectedTemplateId || pipeline?.activeTemplate.id}
                onValueChange={handlePipelineChange}
                disabled={pipelineQuery.isLoading || isChangingTemplate}
              >
                <SelectTrigger className="w-full border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d1524]">
                  <SelectValue placeholder="Choose workflow" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatMoney(stats.totalValue, stats.currency)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Deals
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {stats.dealCount}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Win Rate
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {stats.winRate}%
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#fe901d] text-white hover:bg-[#e67e0d]"
              disabled={pipelineQuery.isLoading || stages.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </div>
        </div>

        {pipelineQuery.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            Could not load pipeline. {getErrorMessage(pipelineQuery.error)}
          </div>
        )}

        {pipelineQuery.isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-96 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800/40"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-6">
              {stages.map((stage) => {
                const stageDeals = stage.deals;
                const dotColor = stageDotColors[stage.color] ?? "bg-slate-400";

                return (
                  <div
                    key={stage.id}
                    className="w-96 flex-shrink-0 rounded-lg border border-gray-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800/40"
                  >
                    <div className="border-b border-gray-200 px-4 py-4 dark:border-white/10">
                      <div className="mb-2 flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${dotColor}`} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {stage.name}
                        </h3>
                        <span className="ml-auto rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {stage.count}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {formatMoney(stage.value, stats.currency)}
                      </div>
                    </div>

                    <div className="max-h-[600px] space-y-3 overflow-y-auto p-4">
                      {stageDeals.length > 0 ? (
                        stageDeals.map((deal) => (
                          <div
                            key={deal.id}
                            className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-[#fe901d] hover:border-l-4 hover:border-l-[#fe901d] dark:border-white/10 dark:bg-[#0d1524]"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                {deal.customerName}
                              </h4>
                              <span className="shrink-0 text-sm font-bold text-[#fe901d]">
                                {formatMoney(deal.value, deal.currency)}
                              </span>
                            </div>

                            <div className="mb-3 flex flex-wrap gap-2">
                              <span
                                className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${priorityColors[deal.priorityLevel]}`}
                              >
                                {deal.priorityLevel}
                              </span>
                              {deal.isStale && (
                                <span className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-100">
                                  Stale
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fe901d] text-xs font-bold text-white">
                                  {deal.agentInitials}
                                </div>
                                <span>{deal.date}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!deal.contactId) {
                                      toast({
                                        title: "Contact profile not linked",
                                        description:
                                          "Create or link a CRM contact before opening this deal profile.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    window.location.href = `/contacts/${deal.contactId}`;
                                  }}
                                  className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                  View
                                </button>
                                {stageIndexById.get(stage.id)! < stages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceStage(deal)}
                                    disabled={movingDealId === deal.id}
                                    className="rounded bg-[#fe901d] px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-[#e67e0d] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {movingDealId === deal.id ? "Moving..." : "Advance"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 py-8 text-gray-400 dark:border-gray-600 dark:text-gray-500">
                          <Inbox className="mb-2 h-8 w-8" />
                          <span className="text-sm">No deals here</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 px-4 py-3 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((current) => ({
                            ...current,
                            stageId: stage.id,
                          }));
                          setShowAddModal(true);
                        }}
                        className="cursor-pointer text-sm font-medium text-[#fe901d] hover:underline"
                      >
                        + Add deal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-[#0f172a]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Deal
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactId" className="text-gray-900 dark:text-white">
                    CRM Contact
                  </Label>
                  <Select
                    value={formData.contactId || "new-contact"}
                    onValueChange={handleContactSelect}
                    disabled={contactsQuery.isLoading}
                  >
                    <SelectTrigger className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Create a new CRM contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new-contact">
                        Create a new CRM contact
                      </SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} · {contact.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pick an existing CRM contact or create one from this deal.
                  </p>
                </div>

                <div>
                  <Label htmlFor="customerName" className="text-gray-900 dark:text-white">
                    Customer Name *
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(event) =>
                      setFormData({ ...formData, customerName: event.target.value })
                    }
                    className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-500">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                    Phone/WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({ ...formData, phone: event.target.value })
                    }
                    className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dealValue" className="text-gray-900 dark:text-white">
                    Deal Value *
                  </Label>
                  <Input
                    id="dealValue"
                    type="number"
                    value={formData.dealValue}
                    onChange={(event) =>
                      setFormData({ ...formData, dealValue: event.target.value })
                    }
                    className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter deal value"
                  />
                  {errors.dealValue && (
                    <p className="mt-1 text-sm text-red-500">{errors.dealValue}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority" className="text-gray-900 dark:text-white">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value as Priority })
                    }
                  >
                    <SelectTrigger className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stage" className="text-gray-900 dark:text-white">
                    Pipeline Stage *
                  </Label>
                  <Select
                    value={formData.stageId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, stageId: value })
                    }
                  >
                    <SelectTrigger className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.stageId && (
                    <p className="mt-1 text-sm text-red-500">{errors.stageId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes" className="text-gray-900 dark:text-white">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData({ ...formData, notes: event.target.value })
                    }
                    className="mt-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Add any notes about this deal"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
                <Button
                  onClick={handleSaveDeal}
                  className="flex-1 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
                  disabled={isSavingDeal}
                >
                  {isSavingDeal ? "Saving..." : "Save Deal"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                  disabled={isSavingDeal}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
