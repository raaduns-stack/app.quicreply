import { type AuthUser } from 'wasp/auth';
import { useState } from 'react';
import UserLayout from './layout/UserLayout';
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  X,
} from 'lucide-react';
import { cn } from '../client/utils';

interface Conversation {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  isActive: boolean;
}

interface Message {
  id: string;
  type: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
  isAI?: boolean;
}

const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Jordon Smith',
    preview: 'Interested in the volume Tier 3 API…',
    timestamp: '2m',
    unread: true,
    isActive: true,
  },
  {
    id: '2',
    name: 'Elena Rodriguez',
    preview: 'Sent the documentation link.',
    timestamp: '1h',
    unread: true,
    isActive: false,
  },
  {
    id: '3',
    name: 'Mike Brown',
    preview: 'Can you share the price list?',
    timestamp: '2h',
    unread: false,
    isActive: false,
  },
  {
    id: '4',
    name: 'Emily Davis',
    preview: 'Do you deliver to my area?',
    timestamp: '3h',
    unread: false,
    isActive: false,
  },
  {
    id: '5',
    name: 'David Wilson',
    preview: 'I want to place a bulk order',
    timestamp: '5h',
    unread: false,
    isActive: false,
  },
  {
    id: '6',
    name: 'Jessica Lee',
    preview: "What's the warranty on this?",
    timestamp: 'Yesterday',
    unread: false,
    isActive: false,
  },
  {
    id: '7',
    name: 'Rahul Khanna',
    preview: 'Thanks for the quick response!',
    timestamp: 'Yesterday',
    unread: false,
    isActive: false,
  },
];

const messages: Message[] = [
  {
    id: '1',
    type: 'inbound',
    text: "Hi, I'm interested in your API Tier 3 volume plan. Can you send me more details?",
    timestamp: '2m ago',
  },
  {
    id: '2',
    type: 'outbound',
    text: 'Hi Jordon! Thanks for reaching out. Our Tier 3 API plan supports up to 10k requests per minute with dedicated support.',
    timestamp: '1m ago',
    isAI: true,
  },
  {
    id: '3',
    type: 'inbound',
    text: 'That sounds great. What about pricing for annual contracts?',
    timestamp: '1m ago',
  },
  {
    id: '4',
    type: 'outbound',
    text: 'Annual contracts include a 20% discount and custom SLA. I can send you a detailed proposal by EOD.',
    timestamp: 'now',
    isAI: true,
  },
];

export default function InboxPage({ user }: { user: AuthUser }) {
  const [activeConv, setActiveConv] = useState('1');
  const [convTab, setConvTab] = useState<'all' | 'unread' | 'ai' | 'open'>('all');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      'from-red-400 to-pink-500',
      'from-blue-400 to-cyan-500',
      'from-purple-400 to-pink-500',
      'from-green-400 to-emerald-500',
      'from-yellow-400 to-orange-500',
      'from-indigo-400 to-blue-500',
      'from-orange-400 to-red-500',
    ];
    return gradients[index % gradients.length];
  };

  const activeConversation = conversations.find((c) => c.id === activeConv);

  return (
    <UserLayout user={user}>
    <div className="-m-4 md:-m-6 2xl:-m-10 flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-[#0d1524]">
      {/* PANE 1: CONVERSATION LIST */}
      <div className="w-full md:w-80 md:flex-shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] flex flex-col hidden md:flex">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-white/10 px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Active Threads
            </h2>
            <span className="bg-[#fe901d] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              12 New
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fe901d]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'unread', 'ai', 'open'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setConvTab(tab)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                  convTab === tab
                    ? 'bg-[#fe901d] text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv, idx) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={cn(
                'w-full px-3 py-3 border-l-2 transition-all text-left hover:bg-slate-50 dark:hover:bg-white/5',
                conv.isActive || activeConv === conv.id
                  ? 'border-l-[#fe901d] bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.08)]'
                  : 'border-l-transparent'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br',
                    getAvatarGradient(idx)
                  )}
                >
                  {getInitials(conv.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {conv.name}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {conv.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {conv.preview}
                  </p>
                </div>

                {/* Unread Indicator */}
                {conv.unread && (
                  <div className="h-2 w-2 rounded-full bg-[#fe901d] flex-shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PANE 2: CHAT VIEW */}
      <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0d1524]">
        {/* Chat Header */}
        <div className="border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between bg-white dark:bg-[#111827]">
          {activeConversation && (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br',
                  getAvatarGradient(
                    conversations.findIndex((c) => c.id === activeConv)
                  )
                )}
              >
                {getInitials(activeConversation.name)}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeConversation.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Online · Enterprise Lead · Last seen 2 min ago
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
              <Phone className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
              <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="px-4 py-1.5 text-sm font-semibold text-[#fe901d] border border-[#fe901d] rounded-lg hover:bg-[#fff3e1] dark:hover:bg-white/10 transition-colors">
              Resolve
            </button>
          </div>
        </div>

        {/* AI Bar */}
        <div className="bg-[#111827] dark:bg-[#0d1017] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-white">Jennifer AI Active</span>
            <span className="text-xs text-slate-400">94% confidence</span>
          </div>
          <button className="px-3 py-1 text-sm font-semibold text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500 transition-colors">
            Take Over
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.type === 'outbound' ? 'justify-end' : 'justify-start')}
            >
              {msg.type === 'inbound' ? (
                <div className="max-w-xs lg:max-w-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-2xl px-4 py-3">
                  <p className="text-sm text-slate-900 dark:text-white">{msg.text}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {msg.timestamp}
                  </p>
                </div>
              ) : (
                <div className="max-w-xs lg:max-w-md">
                  <div className="bg-[#fe901d] rounded-2xl px-4 py-3 text-white mb-1">
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs text-orange-100 mt-1">{msg.timestamp}</p>
                  </div>
                  {msg.isAI && (
                    <div className="flex justify-end">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 text-purple-900 dark:text-purple-300 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                        <span>⚡</span> Jennifer AI
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Jordon is typing
            </span>
            <div className="flex gap-1">
              <div
                className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>

        {/* Composer Bar */}
        <div className="border-t border-slate-200 dark:border-white/10 px-6 py-4 bg-white dark:bg-[#111827]">
          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fe901d] resize-none"
            />
            <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0">
              <Paperclip className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0">
              <Smile className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button className="p-2.5 bg-[#fe901d] hover:bg-[#e08115] rounded-lg text-white transition-colors flex-shrink-0">
              <Send className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Jennifer AI composing ·{' '}
            <button className="text-slate-600 dark:text-slate-300 hover:underline">
              Disable
            </button>
          </p>
        </div>
      </div>

      {/* PANE 3: CONTACT PANEL */}
      <div className="w-72 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] flex flex-col overflow-y-auto hidden lg:flex">
        {activeConversation && (
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="text-center">
              <div
                className={cn(
                  'h-16 w-16 rounded-2xl flex items-center justify-center text-white text-sm font-bold mx-auto mb-3 bg-gradient-to-br',
                  getAvatarGradient(
                    conversations.findIndex((c) => c.id === activeConv)
                  )
                )}
              >
                {getInitials(activeConversation.name)}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                {activeConversation.name}
              </h3>
              <span className="inline-block px-2.5 py-1 bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
                Enterprise Lead
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {['Profile', 'Pipeline', 'Note'].map((action) => (
                <button
                  key={action}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Sales Intel */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                Sales Intel
              </h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 dark:text-slate-400">Stage</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                    Review
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Last Action</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    Email sent
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Value</span>
                  <span className="text-[#fe901d] font-bold text-lg">$4,800</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Messages</span>
                  <span className="text-slate-900 dark:text-white font-medium">7</span>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                Contact
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-0.5">
                    Phone
                  </p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    +1 (555) 123-4567
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-0.5">
                    Email
                  </p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    jordon@enterprise.com
                  </p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-0.5">
                    Company
                  </p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    Enterprise Inc.
                  </p>
                </div>
              </div>
            </div>

            {/* Latest Note */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                Latest Note
              </p>
              <p className="text-xs italic text-amber-800 dark:text-amber-200">
                "Discussed volume pricing. Interested in annual contract. Follow up with proposal by EOD."
              </p>
            </div>

            {/* AI Analysis */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">
                AI Analysis
              </p>
              <p className="text-xs text-purple-800 dark:text-purple-200">
                High-value prospect showing strong intent. Recommended next step: send technical specification doc and schedule demo call.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </UserLayout>
  );
}
