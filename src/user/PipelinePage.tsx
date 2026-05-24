import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type AuthUser } from "wasp/auth";
import {
  createDeal,
  deleteDeal,
  getContacts,
  getPipelineState,
  setActivePipelineTemplate,
  updateDeal,
  updateDealStage,
  useQuery,
} from "wasp/client/operations";
import {
  ArrowRight,
  Circle,
  ExternalLink,
  GripVertical,
  Inbox,
  Loader2,
  Phone,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
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
import { cn } from "../client/utils";
import { useToast } from "../client/hooks/use-toast";

type Priority = "urgent" | "high" | "normal" | "low";
type DealStatus = "open" | "won" | "lost";

type Deal = {
  id: string;
  customerName: string;
  phone?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
  value: number;
  currency: string;
  status: DealStatus;
  priorityLevel: Priority;
  agentInitials: string;
  date: string;
  lastInteractionAt?: string;
  stageId: string;
  stageSlug: string;
  stageName: string;
  isStale: boolean;
  notes?: string;
};

type PipelineStage = {
  id: string;
  slug: string;
  name: string;
  color: string;
  sortOrder?: number;
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

type DealDrawerForm = {
  customerName: string;
  phone: string;
  value: string;
  priorityLevel: Priority;
  stageId: string;
  status: DealStatus;
  notes: string;
};

const priorityColors: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const stageDotColors: Record<string, string> = {
  gray: "text-slate-400",
  indigo: "text-indigo-400",
  amber: "text-amber-400",
  green: "text-emerald-400",
  red: "text-rose-400",
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
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.includes("Phone/WhatsApp")) {
      return "Enter a valid WhatsApp number for this deal.";
    }

    if (error.message.includes("Pipeline stage")) {
      return "The selected pipeline stage is no longer available. Refresh and try again.";
    }

    if (error.message.includes("Contact not found")) {
      return "That CRM contact is no longer available. Pick another contact or create a new one.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function cloneStages(stages: PipelineStage[]) {
  return stages.map((stage) => ({
    ...stage,
    deals: stage.deals.map((deal) => ({ ...deal })),
  }));
}

function recalculateStages(stages: PipelineStage[]) {
  return stages.map((stage) => {
    const value = stage.deals.reduce((sum, deal) => sum + deal.value, 0);

    return {
      ...stage,
      count: stage.deals.length,
      value,
    };
  });
}

function moveDealToStage(stages: PipelineStage[], dealId: string, targetStageId: string) {
  const nextStages = cloneStages(stages);
  let movedDeal: Deal | null = null;

  for (const stage of nextStages) {
    const dealIndex = stage.deals.findIndex((deal) => deal.id === dealId);
    if (dealIndex >= 0) {
      const [deal] = stage.deals.splice(dealIndex, 1);
      movedDeal = {
        ...deal,
        stageId: targetStageId,
      };
      break;
    }
  }

  if (!movedDeal) {
    return stages;
  }

  const targetStage = nextStages.find((stage) => stage.id === targetStageId);
  if (!targetStage) {
    return stages;
  }

  targetStage.deals.unshift({
    ...movedDeal,
    stageName: targetStage.name,
    stageSlug: targetStage.slug,
    status: targetStage.slug.includes("won") ? "won" : "open",
  });

  return recalculateStages(nextStages);
}

function updateDealInStages(
  stages: PipelineStage[],
  dealId: string,
  updater: (deal: Deal, stage: PipelineStage) => Deal,
) {
  const nextStages = cloneStages(stages);

  for (const stage of nextStages) {
    const dealIndex = stage.deals.findIndex((deal) => deal.id === dealId);
    if (dealIndex >= 0) {
      stage.deals[dealIndex] = updater(stage.deals[dealIndex], stage);
      return recalculateStages(nextStages);
    }
  }

  return stages;
}

function removeDealFromStages(stages: PipelineStage[], dealId: string) {
  return recalculateStages(
    cloneStages(stages).map((stage) => ({
      ...stage,
      deals: stage.deals.filter((deal) => deal.id !== dealId),
    })),
  );
}

function buildDrawerForm(deal: Deal): DealDrawerForm {
  return {
    customerName: deal.customerName,
    phone: deal.phone ?? "",
    value: String(deal.value),
    priorityLevel: deal.priorityLevel,
    stageId: deal.stageId,
    status: deal.status,
    notes: deal.notes ?? "",
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDealStatusButtonClassName(status: DealStatus, value: DealStatus) {
  const isSelected = status === value;

  if (value === "won") {
    return isSelected
      ? "border-emerald-500 bg-emerald-500 text-white shadow-sm hover:border-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:border-emerald-400 dark:hover:bg-emerald-400"
      : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-200";
  }

  return isSelected
    ? "border-rose-500 bg-rose-500 text-white shadow-sm hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-500 dark:bg-rose-500 dark:text-white dark:hover:border-rose-400 dark:hover:bg-rose-400"
    : "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-200";
}

function StageColumn({
  stage,
  currency,
  isDropTarget,
  children,
  onAddDeal,
}: {
  stage: PipelineStage;
  currency: string;
  isDropTarget: boolean;
  children: ReactNode;
  onAddDeal: () => void;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id },
  });
  const dotColor = stageDotColors[stage.color] ?? "text-slate-400";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[23rem] flex-shrink-0 rounded-xl border bg-white/90 shadow-sm backdrop-blur dark:bg-[#101827]/70",
        isDropTarget
          ? "border-[#fe901d] ring-2 ring-[#fe901d]/20 dark:border-[#fe901d]"
          : "border-slate-200/90 dark:border-white/10",
      )}
    >
      <div className="border-b border-slate-200/80 px-4 py-4 dark:border-white/10">
        <div className="mb-2 flex items-center gap-2">
          <Circle className={cn("h-3.5 w-3.5 fill-current", dotColor)} />
          <h3 className="font-semibold text-slate-900 dark:text-white">{stage.name}</h3>
          <span className="ml-auto rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {stage.count}
          </span>
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          {formatMoney(stage.value, currency)}
        </div>
      </div>

      <div className="max-h-[640px] min-h-[18rem] space-y-3 overflow-y-auto p-4">
        {stage.deals.length > 0 ? (
          children
        ) : (
          <div
            className={cn(
              "flex min-h-[13rem] flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center",
              isDropTarget
                ? "border-[#fe901d]/60 bg-[#fe901d]/5 text-[#fe901d]"
                : "border-slate-300/90 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
            )}
          >
            <Inbox className="mb-3 h-8 w-8" />
            <p className="text-sm font-medium">No deals in this stage yet</p>
            <p className="mt-1 text-xs">
              Drag a deal here or add a new one directly into {stage.name}.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/80 px-4 py-3 dark:border-white/10">
        <button
          type="button"
          onClick={onAddDeal}
          className="text-sm font-medium text-[#fe901d] transition-colors hover:text-[#e67e0d]"
        >
          + Add deal to {stage.name}
        </button>
      </div>
    </div>
  );
}

function DealCard({
  deal,
  currency,
  isMoving,
  canAdvance,
  onOpen,
  onAdvance,
  onOpenContact,
}: {
  deal: Deal;
  currency: string;
  isMoving: boolean;
  canAdvance: boolean;
  onOpen: () => void;
  onAdvance: () => void;
  onOpenContact: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: deal.id,
      data: { type: "deal", stageId: deal.stageId },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-white/10 dark:bg-[#0d1524]",
        isDragging && "rotate-[1deg] opacity-60 shadow-lg",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 text-left"
        >
          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {deal.customerName}
          </h4>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {deal.phone || "No phone linked"}
          </p>
        </button>
        <div className="flex items-start gap-1">
          <button
            type="button"
            className="mt-0.5 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={`Drag ${deal.customerName}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="shrink-0 text-sm font-bold text-[#fe901d]">
            {formatMoney(deal.value, deal.currency || currency)}
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize",
            priorityColors[deal.priorityLevel],
          )}
        >
          {deal.priorityLevel}
        </span>
        {deal.status !== "open" && (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize",
              deal.status === "won"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
            )}
          >
            {deal.status}
          </span>
        )}
        {deal.isStale && (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/50 dark:text-red-100">
            Stale
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fe901d] text-[11px] font-bold text-white">
            {deal.agentInitials}
          </div>
          <span>{deal.date}</span>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          Details
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
          onClick={onOpenContact}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Contact
        </Button>
        {canAdvance && (
          <Button
            type="button"
            size="sm"
            className="ml-auto h-8 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
            onClick={onAdvance}
            disabled={isMoving}
          >
            {isMoving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Moving
              </>
            ) : (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                Advance
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [boardStages, setBoardStages] = useState<PipelineStage[]>([]);
  const [activeDragDealId, setActiveDragDealId] = useState<string | null>(null);
  const [activeDropStageId, setActiveDropStageId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [drawerForm, setDrawerForm] = useState<DealDrawerForm | null>(null);
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);
  const [isDeletingDeal, setIsDeletingDeal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  useEffect(() => {
    if (pipeline?.activeTemplate?.id && !selectedTemplateId) {
      setSelectedTemplateId(pipeline.activeTemplate.id);
    }
  }, [pipeline?.activeTemplate?.id, selectedTemplateId]);

  useEffect(() => {
    if (pipeline?.stages) {
      setBoardStages(recalculateStages(cloneStages(pipeline.stages)));
    }
  }, [pipeline?.stages]);

  useEffect(() => {
    if (!formData.stageId && boardStages[0]?.id) {
      setFormData((current) => ({ ...current, stageId: boardStages[0].id }));
    }
  }, [formData.stageId, boardStages]);

  const stages = boardStages;
  const templates = pipeline?.templates ?? [];
  const contacts = (contactsQuery.data ?? []) as ContactOption[];
  const baseCurrency = pipeline?.stats.currency ?? "NGN";
  const stats = useMemo(() => {
    const allDeals = stages.flatMap((stage) => stage.deals);
    const closedDeals = allDeals.filter((deal) => deal.status === "won" || deal.status === "lost");
    const wonDeals = allDeals.filter((deal) => deal.status === "won");

    return {
      totalValue: allDeals
        .filter((deal) => deal.status !== "lost")
        .reduce((sum, deal) => sum + deal.value, 0),
      dealCount: allDeals.length,
      winRate: closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0,
      currency: baseCurrency,
    };
  }, [baseCurrency, stages]);

  const stageIndexById = useMemo(() => {
    return new Map(stages.map((stage, index) => [stage.id, index]));
  }, [stages]);

  const selectedDeal = useMemo(() => {
    return stages.flatMap((stage) => stage.deals).find((deal) => deal.id === selectedDealId) ?? null;
  }, [selectedDealId, stages]);

  const activeDragDeal = useMemo(() => {
    return stages.flatMap((stage) => stage.deals).find((deal) => deal.id === activeDragDealId) ?? null;
  }, [activeDragDealId, stages]);

  useEffect(() => {
    if (selectedDeal) {
      setDrawerForm(buildDrawerForm(selectedDeal));
      return;
    }

    setDrawerForm(null);
  }, [selectedDeal]);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      nextErrors.customerName = "Customer name is required";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone/WhatsApp is required";
    }

    if (!formData.dealValue.trim()) {
      nextErrors.dealValue = "Deal value is required";
    } else if (Number.isNaN(Number(formData.dealValue))) {
      nextErrors.dealValue = "Deal value must be a number";
    }

    if (!formData.stageId) {
      nextErrors.stageId = "Choose a pipeline stage";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      stageId: stages[0]?.id ?? "",
    });
    setErrors({});
  };

  const openContactProfile = (contactId?: string) => {
    if (!contactId) {
      toast({
        title: "No linked contact yet",
        description: "Link or create a CRM contact before opening the profile.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/contacts/${contactId}`);
  };

  const openInboxThread = (contactId?: string) => {
    if (!contactId) {
      toast({
        title: "No inbox thread found",
        description: "This deal needs a linked CRM contact before the inbox can open it directly.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/inbox?contactId=${contactId}`);
  };

  const handleContactSelect = (value: string) => {
    if (value === "new-contact") {
      setFormData((current) => ({ ...current, contactId: "" }));
      return;
    }

    const contact = contacts.find((item) => item.id === value);
    if (!contact) {
      return;
    }

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
      setSelectedDealId(null);
      resetForm();
      toast({
        title: "Pipeline switched",
        description: "The board is now showing the selected workflow.",
      });
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
    if (!validateForm()) {
      toast({
        title: "Review the deal details",
        description: "Fill the required fields before saving the deal.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDeal(true);

    try {
      await createDeal({
        contactId: formData.contactId || undefined,
        customerName: formData.customerName,
        phone: formData.phone,
        value: Number(formData.dealValue),
        currency: stats.currency,
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
        description: "The pipeline has been updated with the new deal.",
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

    const previousStages = stages;
    setMovingDealId(deal.id);
    setBoardStages((current) => moveDealToStage(current, deal.id, nextStage.id));

    try {
      await updateDealStage({ id: deal.id, stageId: nextStage.id });
      await pipelineQuery.refetch();
      toast({
        title: "Deal moved",
        description: `${deal.customerName} is now in ${nextStage.name}.`,
      });
    } catch (error) {
      setBoardStages(previousStages);
      toast({
        title: "Could not move deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setMovingDealId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragDealId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const dealId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    const sourceStageId = stages.find((stage) => stage.deals.some((deal) => deal.id === dealId))?.id;
    const destinationStageId =
      stages.find((stage) => stage.id === overId)?.id ??
      stages.find((stage) => stage.deals.some((deal) => deal.id === overId))?.id ??
      null;

    setActiveDragDealId(null);
    setActiveDropStageId(null);

    if (!sourceStageId || !destinationStageId || sourceStageId === destinationStageId) {
      return;
    }

    const previousStages = stages;
    const destinationStage = stages.find((stage) => stage.id === destinationStageId);
    const draggedDeal = stages.flatMap((stage) => stage.deals).find((deal) => deal.id === dealId);

    if (!destinationStage || !draggedDeal) {
      return;
    }

    setBoardStages((current) => moveDealToStage(current, dealId, destinationStageId));
    setMovingDealId(dealId);

    try {
      await updateDealStage({ id: dealId, stageId: destinationStageId });
      await pipelineQuery.refetch();
      toast({
        title: "Deal moved",
        description: `${draggedDeal.customerName} moved to ${destinationStage.name}.`,
      });
    } catch (error) {
      setBoardStages(previousStages);
      toast({
        title: "Could not move deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setMovingDealId(null);
    }
  };

  const handleDragCancel = () => {
    setActiveDragDealId(null);
    setActiveDropStageId(null);
  };

  const handleDrawerSave = async () => {
    if (!selectedDeal || !drawerForm) {
      return;
    }

    if (!drawerForm.customerName.trim()) {
      toast({
        title: "Customer name is required",
        description: "Add a customer name before saving the deal.",
        variant: "destructive",
      });
      return;
    }

    if (!drawerForm.phone.trim()) {
      toast({
        title: "Phone/WhatsApp is required",
        description: "Add a valid WhatsApp number before saving the deal.",
        variant: "destructive",
      });
      return;
    }

    if (!drawerForm.value.trim() || Number.isNaN(Number(drawerForm.value))) {
      toast({
        title: "Deal value is invalid",
        description: "Enter a numeric deal value before saving.",
        variant: "destructive",
      });
      return;
    }

    const previousStages = stages;
    const isStageChange = selectedDeal.stageId !== drawerForm.stageId;

    setIsSavingDrawer(true);
    setBoardStages((current) => {
      const movedStages = isStageChange
        ? moveDealToStage(current, selectedDeal.id, drawerForm.stageId)
        : current;

      return updateDealInStages(movedStages, selectedDeal.id, (deal, stage) => ({
        ...deal,
        customerName: drawerForm.customerName.trim(),
        phone: drawerForm.phone.trim(),
        value: Number(drawerForm.value),
        priorityLevel: drawerForm.priorityLevel,
        status: drawerForm.status,
        notes: drawerForm.notes.trim() || undefined,
        currency: stats.currency,
        stageId: stage.id,
        stageName: stage.name,
        stageSlug: stage.slug,
      }));
    });

    try {
      await updateDeal({
        id: selectedDeal.id,
        customerName: drawerForm.customerName.trim(),
        phone: drawerForm.phone.trim(),
        value: Number(drawerForm.value),
        currency: stats.currency,
        priorityLevel: drawerForm.priorityLevel,
        status: drawerForm.status,
        stageId: drawerForm.stageId,
        notes: drawerForm.notes.trim(),
      });
      await pipelineQuery.refetch();
      toast({
        title: "Deal updated",
        description: "The latest changes have been saved.",
      });
    } catch (error) {
      setBoardStages(previousStages);
      toast({
        title: "Could not update deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!selectedDeal) {
      return;
    }

    const previousStages = stages;
    setIsDeletingDeal(true);
    setBoardStages((current) => removeDealFromStages(current, selectedDeal.id));

    try {
      await deleteDeal({ id: selectedDeal.id });
      await pipelineQuery.refetch();
      setSelectedDealId(null);
      toast({
        title: "Deal deleted",
        description: `${selectedDeal.customerName} has been removed from the pipeline.`,
      });
    } catch (error) {
      setBoardStages(previousStages);
      toast({
        title: "Could not delete deal",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsDeletingDeal(false);
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
              Track live deals, move them across stages, and update contact context from one board.
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
                  <SelectValue placeholder={isChangingTemplate ? "Switching workflow..." : "Choose workflow"} />
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
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatMoney(stats.totalValue, stats.currency)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">Deals</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{stats.dealCount}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400">Win Rate</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{stats.winRate}%</div>
              </div>
            </div>

            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#fe901d] text-white hover:bg-[#e67e0d]"
              disabled={pipelineQuery.isLoading || stages.length === 0 || isChangingTemplate}
            >
              <Plus className="h-4 w-4" />
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
                className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800/40"
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragMove={(event) => {
              const overId = event.over?.id ? String(event.over.id) : null;
              const nextStageId =
                stages.find((stage) => stage.id === overId)?.id ??
                stages.find((stage) => stage.deals.some((deal) => deal.id === overId))?.id ??
                null;
              setActiveDropStageId(nextStageId);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="no-scrollbar overflow-x-auto pb-2">
              <div className="flex min-w-max gap-6">
                {stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    currency={stats.currency}
                    isDropTarget={activeDropStageId === stage.id}
                    onAddDeal={() => {
                      setFormData((current) => ({
                        ...current,
                        stageId: stage.id,
                      }));
                      setShowAddModal(true);
                    }}
                  >
                    <SortableContext
                      items={stage.deals.map((deal) => deal.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {stage.deals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          currency={stats.currency}
                          isMoving={movingDealId === deal.id}
                          canAdvance={(stageIndexById.get(stage.id) ?? 0) < stages.length - 1}
                          onOpen={() => setSelectedDealId(deal.id)}
                          onAdvance={() => handleAdvanceStage(deal)}
                          onOpenContact={() => openContactProfile(deal.contactId)}
                        />
                      ))}
                    </SortableContext>
                  </StageColumn>
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeDragDeal ? (
                <div className="w-[23rem] rounded-xl border border-[#fe901d]/30 bg-white p-3 shadow-2xl dark:border-[#fe901d]/20 dark:bg-[#0d1524]">
                  <div className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
                    {activeDragDeal.customerName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatMoney(activeDragDeal.value, activeDragDeal.currency)}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0d1524]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Deal</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create a pipeline deal and optionally link it to an existing CRM contact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactId" className="text-slate-900 dark:text-white">
                    CRM Contact
                  </Label>
                  <Select
                    value={formData.contactId || "new-contact"}
                    onValueChange={handleContactSelect}
                    disabled={contactsQuery.isLoading || isSavingDeal}
                  >
                    <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Create a new CRM contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new-contact">Create a new CRM contact</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} · {contact.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pick an existing contact or let the deal create a new CRM record.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName" className="text-slate-900 dark:text-white">
                      Customer Name *
                    </Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(event) =>
                        setFormData({ ...formData, customerName: event.target.value })
                      }
                      className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      placeholder="Enter customer name"
                    />
                    {errors.customerName && (
                      <p className="mt-1 text-sm text-red-500">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-slate-900 dark:text-white">
                      Phone/WhatsApp *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData({ ...formData, phone: event.target.value })
                      }
                      className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dealValue" className="text-slate-900 dark:text-white">
                      Deal Value *
                    </Label>
                    <Input
                      id="dealValue"
                      type="number"
                      value={formData.dealValue}
                      onChange={(event) =>
                        setFormData({ ...formData, dealValue: event.target.value })
                      }
                      className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      placeholder={`Amount in ${stats.currency}`}
                    />
                    {errors.dealValue && (
                      <p className="mt-1 text-sm text-red-500">{errors.dealValue}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priority" className="text-slate-900 dark:text-white">
                      Priority
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value as Priority })
                      }
                    >
                      <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
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
                </div>

                <div>
                  <Label htmlFor="stage" className="text-slate-900 dark:text-white">
                    Pipeline Stage *
                  </Label>
                  <Select
                    value={formData.stageId}
                    onValueChange={(value) => setFormData({ ...formData, stageId: value })}
                  >
                    <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
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
                  {errors.stageId && <p className="mt-1 text-sm text-red-500">{errors.stageId}</p>}
                </div>

                <div>
                  <Label htmlFor="notes" className="text-slate-900 dark:text-white">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                    className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    placeholder="Add any notes about this deal"
                    rows={4}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                <Button
                  onClick={handleSaveDeal}
                  className="flex-1 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
                  disabled={isSavingDeal || isChangingTemplate}
                >
                  {isSavingDeal ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving deal...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Deal
                    </>
                  )}
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

        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-40 transition-opacity",
            selectedDeal ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            aria-label="Close deal drawer"
            onClick={() => setSelectedDealId(null)}
            className={cn(
              "absolute inset-0 bg-slate-950/20 transition-opacity",
              selectedDeal ? "pointer-events-auto opacity-100" : "opacity-0",
            )}
          />
          <aside
            className={cn(
              "pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-[32rem] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform dark:border-white/10 dark:bg-[#0d1524]",
              selectedDeal ? "translate-x-0" : "translate-x-full",
            )}
          >
            {selectedDeal && drawerForm ? (
              <>
                <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedDeal.customerName}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Edit deal details, manage stage, and jump into the linked CRM context.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDealId(null)}
                      className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openContactProfile(selectedDeal.contactId)}
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      Open Contact Profile
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openInboxThread(selectedDeal.contactId)}
                    >
                      <Inbox className="h-3.5 w-3.5" />
                      Open Inbox Conversation
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={getDealStatusButtonClassName(drawerForm.status, "won")}
                      onClick={() =>
                        setDrawerForm((current) =>
                          current ? { ...current, status: "won" } : current,
                        )
                      }
                    >
                      Mark Won
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={getDealStatusButtonClassName(drawerForm.status, "lost")}
                      onClick={() =>
                        setDrawerForm((current) =>
                          current ? { ...current, status: "lost" } : current,
                        )
                      }
                    >
                      Mark Lost
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-slate-900 dark:text-white">Deal Name</Label>
                      <Input
                        value={drawerForm.customerName}
                        onChange={(event) =>
                          setDrawerForm((current) =>
                            current ? { ...current, customerName: event.target.value } : current,
                          )
                        }
                        className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-900 dark:text-white">Phone</Label>
                      <Input
                        value={drawerForm.phone}
                        onChange={(event) =>
                          setDrawerForm((current) =>
                            current ? { ...current, phone: event.target.value } : current,
                          )
                        }
                        className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-slate-900 dark:text-white">Deal Value</Label>
                      <Input
                        type="number"
                        value={drawerForm.value}
                        onChange={(event) =>
                          setDrawerForm((current) =>
                            current ? { ...current, value: event.target.value } : current,
                          )
                        }
                        className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Uses the workspace currency: {stats.currency}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-900 dark:text-white">Priority</Label>
                      <Select
                        value={drawerForm.priorityLevel}
                        onValueChange={(value) =>
                          setDrawerForm((current) =>
                            current ? { ...current, priorityLevel: value as Priority } : current,
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-slate-900 dark:text-white">Current Stage</Label>
                      <Select
                        value={drawerForm.stageId}
                        onValueChange={(value) =>
                          setDrawerForm((current) =>
                            current ? { ...current, stageId: value } : current,
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
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
                    </div>
                    <div>
                      <Label className="text-slate-900 dark:text-white">Status</Label>
                      <Select
                        value={drawerForm.status}
                        onValueChange={(value) =>
                          setDrawerForm((current) =>
                            current ? { ...current, status: value as DealStatus } : current,
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-900 dark:text-white">Notes</Label>
                    <Textarea
                      value={drawerForm.notes}
                      onChange={(event) =>
                        setDrawerForm((current) =>
                          current ? { ...current, notes: event.target.value } : current,
                        )
                      }
                      rows={6}
                      className="mt-1 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      placeholder="Deal context, objections, follow-up notes..."
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/40">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Deal Snapshot
                    </h3>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>Linked contact</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedDeal.contactId ? "Connected" : "Not linked"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Phone</span>
                        <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {selectedDeal.phone ?? "Not added"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Created</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatDateTime(selectedDeal.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Last updated</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatDateTime(selectedDeal.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 px-6 py-4 dark:border-white/10">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      className="flex-1 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
                      disabled={isSavingDrawer || isDeletingDeal}
                      onClick={handleDrawerSave}
                    >
                      {isSavingDrawer ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving changes...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      disabled={isSavingDrawer || isDeletingDeal}
                      onClick={handleDeleteDeal}
                    >
                      {isDeletingDeal ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Deal"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </UserLayout>
  );
}
