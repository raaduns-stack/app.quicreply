import { useState, useMemo } from 'react';
import { type AuthUser } from 'wasp/auth';
import { Plus, Inbox, X } from 'lucide-react';
import UserLayout from './layout/UserLayout';
import { Button } from '../client/components/ui/button';
import { Input } from '../client/components/ui/input';
import { Label } from '../client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../client/components/ui/select';
import { Textarea } from '../client/components/ui/textarea';

// ─── Types ───────────────────────────────────────────────────────────────────

type PipelineType = 'wig' | 'gadget' | 'custom';
type Priority = 'urgent' | 'high' | 'normal' | 'low';
type Status = 'waiting' | 'priority' | 'follow_up' | 'active' | 'bulk' | 'warm_lead' | 'decision_maker' | 'vip' | 'urgent';

interface Deal {
  id: string;
  customerName: string;
  value: number;
  status: Status;
  stageIndex: number;
  priority: Priority;
  agentInitials: string;
  date: string;
}

interface Stage {
  id: string;
  name: string;
  dotColor: string;
}

interface PipelineConfig {
  stages: Stage[];
  deals: Deal[];
}

// ─── Pipeline Data ───────────────────────────────────────────────────────────

const wigWorkflow: PipelineConfig = {
  stages: [
    { id: 'new_inquiry', name: 'New Inquiry', dotColor: 'bg-gray-400' },
    { id: 'style_confirmed', name: 'Style Confirmed', dotColor: 'bg-indigo-400' },
    { id: 'payment_received', name: 'Payment Received', dotColor: 'bg-amber-400' },
    { id: 'shipped_closed', name: 'Shipped/Closed', dotColor: 'bg-green-400' },
  ],
  deals: [
    {
      id: '1',
      customerName: 'Alice Wong',
      value: 240,
      status: 'priority',
      stageIndex: 0,
      priority: 'high',
      agentInitials: 'AW',
      date: 'Mar 15',
    },
    {
      id: '2',
      customerName: 'Sarah J.',
      value: 180,
      status: 'waiting',
      stageIndex: 0,
      priority: 'normal',
      agentInitials: 'SJ',
      date: 'Mar 14',
    },
    {
      id: '3',
      customerName: 'Linda T.',
      value: 310,
      status: 'follow_up',
      stageIndex: 0,
      priority: 'normal',
      agentInitials: 'LT',
      date: 'Mar 12',
    },
    {
      id: '4',
      customerName: 'Kylie M.',
      value: 450,
      status: 'urgent',
      stageIndex: 1,
      priority: 'urgent',
      agentInitials: 'KM',
      date: 'Mar 18',
    },
    {
      id: '5',
      customerName: 'Beyoncé F.',
      value: 1200,
      status: 'vip',
      stageIndex: 2,
      priority: 'high',
      agentInitials: 'BF',
      date: 'Mar 10',
    },
  ],
};

const gadgetWorkflow: PipelineConfig = {
  stages: [
    { id: 'inquiry', name: 'Inquiry', dotColor: 'bg-gray-400' },
    { id: 'spec_confirmed', name: 'Spec Confirmed', dotColor: 'bg-indigo-400' },
    { id: 'payment_received', name: 'Payment Received', dotColor: 'bg-amber-400' },
    { id: 'delivered', name: 'Delivered', dotColor: 'bg-green-400' },
  ],
  deals: [
    {
      id: '6',
      customerName: 'Marcus R.',
      value: 890,
      status: 'active',
      stageIndex: 0,
      priority: 'high',
      agentInitials: 'MR',
      date: 'Mar 16',
    },
    {
      id: '7',
      customerName: 'Tech Store Ltd',
      value: 2400,
      status: 'bulk',
      stageIndex: 1,
      priority: 'high',
      agentInitials: 'TS',
      date: 'Mar 17',
    },
    {
      id: '8',
      customerName: 'Diana P.',
      value: 650,
      status: 'urgent',
      stageIndex: 2,
      priority: 'urgent',
      agentInitials: 'DP',
      date: 'Mar 19',
    },
  ],
};

const customWorkflow: PipelineConfig = {
  stages: [
    { id: 'discovery', name: 'Discovery', dotColor: 'bg-gray-400' },
    { id: 'demo_conducted', name: 'Demo Conducted', dotColor: 'bg-indigo-400' },
    { id: 'proposal_sent', name: 'Proposal Sent', dotColor: 'bg-amber-400' },
    { id: 'negotiation', name: 'Negotiation', dotColor: 'bg-green-400' },
    { id: 'won_closed', name: 'Won/Closed', dotColor: 'bg-red-400' },
  ],
  deals: [
    {
      id: '9',
      customerName: 'Bright Labs',
      value: 2800,
      status: 'warm_lead',
      stageIndex: 0,
      priority: 'high',
      agentInitials: 'BL',
      date: 'Mar 13',
    },
    {
      id: '10',
      customerName: 'Acme Corp',
      value: 5000,
      status: 'decision_maker',
      stageIndex: 1,
      priority: 'urgent',
      agentInitials: 'AC',
      date: 'Mar 20',
    },
    {
      id: '11',
      customerName: 'Orbit Systems',
      value: 8500,
      status: 'vip',
      stageIndex: 2,
      priority: 'high',
      agentInitials: 'OS',
      date: 'Mar 21',
    },
    {
      id: '12',
      customerName: 'NovaBridge',
      value: 3200,
      status: 'active',
      stageIndex: 3,
      priority: 'normal',
      agentInitials: 'NB',
      date: 'Mar 22',
    },
  ],
};

const pipelineConfigs: Record<PipelineType, PipelineConfig> = {
  wig: wigWorkflow,
  gadget: gadgetWorkflow,
  custom: customWorkflow,
};

const workflowLabels: Record<PipelineType, string> = {
  wig: 'Wig Vendor Workflow',
  gadget: 'Gadget Store Workflow',
  custom: 'Standard SaaS B2B',
};

const statusColors: Record<Status, string> = {
  waiting: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  priority: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  follow_up: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  bulk: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  warm_lead: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  decision_maker: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
  vip: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PipelinePage({ user }: { user: AuthUser }) {
  const [pipelineType, setPipelineType] = useState<PipelineType>('wig');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deals, setDeals] = useState<Deal[]>(pipelineConfigs[pipelineType].deals);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    dealValue: '',
    priority: 'normal' as Priority,
    stage: '0',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const config = pipelineConfigs[pipelineType];

  // Update deals when pipeline type changes
  const handlePipelineChange = (newType: PipelineType) => {
    setPipelineType(newType);
    setDeals(pipelineConfigs[newType].deals);
    setShowAddModal(false);
  };

  const stats = useMemo(() => {
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
    const dealCount = deals.length;
    return {
      totalValue,
      dealCount,
      winRate: 38,
    };
  }, [deals]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<number, Deal[]> = {};
    config.stages.forEach((_, index) => {
      grouped[index] = deals.filter(deal => deal.stageIndex === index);
    });
    return grouped;
  }, [deals, config]);

  const stageValues = useMemo(() => {
    const values: Record<number, number> = {};
    config.stages.forEach((_, index) => {
      values[index] = dealsByStage[index]?.reduce((sum, deal) => sum + deal.value, 0) || 0;
    });
    return values;
  }, [dealsByStage, config]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone/WhatsApp is required';
    }
    if (!formData.dealValue.trim()) {
      newErrors.dealValue = 'Deal value is required';
    }
    if (isNaN(Number(formData.dealValue))) {
      newErrors.dealValue = 'Deal value must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDeal = () => {
    if (!validateForm()) return;

    const newDeal: Deal = {
      id: Math.random().toString(36).substr(2, 9),
      customerName: formData.customerName,
      value: Number(formData.dealValue),
      status: formData.priority as Status,
      stageIndex: Number(formData.stage),
      priority: formData.priority,
      agentInitials: formData.customerName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    setDeals([...deals, newDeal]);
    setShowAddModal(false);
    setFormData({
      customerName: '',
      phone: '',
      dealValue: '',
      priority: 'normal',
      stage: '0',
      notes: '',
    });
    setErrors({});
  };

  const handleAdvanceStage = (dealId: string) => {
    setDeals(
      deals.map(deal => {
        if (deal.id === dealId && deal.stageIndex < config.stages.length - 1) {
          return { ...deal, stageIndex: deal.stageIndex + 1 };
        }
        return deal;
      })
    );
  };

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Sales Pipeline</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track and manage your deals across the funnel</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-56">
              <Select value={pipelineType} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-full bg-white dark:bg-[#0d1524] border-slate-200 dark:border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wig">{workflowLabels.wig}</SelectItem>
                  <SelectItem value="gadget">{workflowLabels.gadget}</SelectItem>
                  <SelectItem value="custom">{workflowLabels.custom}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Stats */}
            <div className="flex gap-2">
              <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">${stats.totalValue.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400">Deals</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{stats.dealCount}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400">Win Rate</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{stats.winRate}%</div>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#fe901d] hover:bg-[#e67e0d] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {config.stages.map((stage, stageIndex) => {
              const stageDeals = dealsByStage[stageIndex] || [];
              const stageValue = stageValues[stageIndex] || 0;

              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-96 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-gray-200 dark:border-white/10"
                >
                  {/* Column Header */}
                  <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${stage.dotColor}`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {stage.name}
                      </h3>
                      <span className="ml-auto bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      ${stageValue.toLocaleString()}
                    </div>
                  </div>

                  {/* Cards List */}
                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {stageDeals.length > 0 ? (
                      stageDeals.map(deal => (
                        <div
                          key={deal.id}
                          className="bg-white dark:bg-[#0d1524] rounded-lg p-3 border border-gray-200 dark:border-white/10 hover:border-[#fe901d] hover:border-l-4 hover:border-l-[#fe901d] transition-all cursor-pointer group"
                        >
                          {/* Deal Header */}
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                              {deal.customerName}
                            </h4>
                            <span className="text-sm font-bold text-[#fe901d]">
                              ${deal.value}
                            </span>
                          </div>

                          {/* Status Tag */}
                          <div className="mb-3">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[deal.status]}`}>
                              {deal.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <div className="w-6 h-6 rounded-full bg-[#fe901d] text-white flex items-center justify-center text-xs font-bold">
                                {deal.agentInitials}
                              </div>
                              <span>{deal.date}</span>
                            </div>
                            <div className="flex gap-2">
                              <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-medium">
                                View
                              </button>
                              {stageIndex < config.stages.length - 1 && (
                                <button
                                  onClick={() => handleAdvanceStage(deal.id)}
                                  className="px-2 py-1 rounded bg-[#fe901d] text-white hover:bg-[#e67e0d] transition-colors text-xs font-medium"
                                >
                                  Advance
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                        <Inbox className="w-8 h-8 mb-2" />
                        <span className="text-sm">No deals here</span>
                      </div>
                    )}
                  </div>

                  {/* Add Deal Footer Link */}
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="text-sm text-[#fe901d] hover:underline font-medium"
                    >
                      + Add deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Deal Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-96 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Deal</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <Label htmlFor="customerName" className="text-gray-900 dark:text-white">
                    Customer Name *
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                  )}
                </div>

                {/* Phone/WhatsApp */}
                <div>
                  <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                    Phone/WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* Deal Value */}
                <div>
                  <Label htmlFor="dealValue" className="text-gray-900 dark:text-white">
                    Deal Value *
                  </Label>
                  <Input
                    id="dealValue"
                    type="number"
                    value={formData.dealValue}
                    onChange={e => setFormData({ ...formData, dealValue: e.target.value })}
                    className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter deal value"
                  />
                  {errors.dealValue && (
                    <p className="text-red-500 text-sm mt-1">{errors.dealValue}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority" className="text-gray-900 dark:text-white">
                    Priority
                  </Label>
                  <Select value={formData.priority} onValueChange={value => setFormData({ ...formData, priority: value as Priority })}>
                    <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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

                {/* Pipeline Stage */}
                <div>
                  <Label htmlFor="stage" className="text-gray-900 dark:text-white">
                    Pipeline Stage *
                  </Label>
                  <Select value={formData.stage} onValueChange={value => setFormData({ ...formData, stage: value })}>
                    <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.stages.map((stage, index) => (
                        <SelectItem key={stage.id} value={index.toString()}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-gray-900 dark:text-white">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add any notes about this deal"
                    rows={3}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                <Button
                  onClick={handleSaveDeal}
                  className="flex-1 bg-[#fe901d] hover:bg-[#e67e0d] text-white"
                >
                  Save Deal
                </Button>
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    setErrors({});
                  }}
                  variant="outline"
                  className="flex-1 dark:border-gray-600 dark:text-white"
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
