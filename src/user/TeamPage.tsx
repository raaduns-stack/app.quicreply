import React, { useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import UserLayout from './layout/UserLayout';

interface TeamMember {
  id: number;
  initials: string;
  name: string;
  role: 'Admin' | 'Agent' | 'Viewer';
  conversations: number;
  responseTime: string;
  performance: number;
  status: 'Active' | 'Away';
  isCurrentUser?: boolean;
  avatarColor: string;
}

const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    initials: 'JD',
    name: 'John Doe',
    role: 'Admin',
    conversations: 430,
    responseTime: '1m 12s',
    performance: 92,
    status: 'Active',
    isCurrentUser: true,
    avatarColor: 'from-indigo-500 to-indigo-600',
  },
  {
    id: 2,
    initials: 'SJ',
    name: 'Sarah Jenkins',
    role: 'Admin',
    conversations: 398,
    responseTime: '1m 45s',
    performance: 88,
    status: 'Active',
    avatarColor: 'from-blue-500 to-blue-600',
  },
  {
    id: 3,
    initials: 'MB',
    name: 'Michael Brown',
    role: 'Agent',
    conversations: 320,
    responseTime: '2m 05s',
    performance: 85,
    status: 'Active',
    avatarColor: 'from-amber-500 to-red-500',
  },
  {
    id: 4,
    initials: 'EW',
    name: 'Emma Ward',
    role: 'Agent',
    conversations: 280,
    responseTime: '2m 15s',
    performance: 76,
    status: 'Active',
    avatarColor: 'from-green-500 to-blue-500',
  },
  {
    id: 5,
    initials: 'DW',
    name: 'David Wilson',
    role: 'Agent',
    conversations: 210,
    responseTime: '2m 40s',
    performance: 72,
    status: 'Active',
    avatarColor: 'from-purple-500 to-pink-600',
  },
  {
    id: 6,
    initials: 'OM',
    name: 'Olivia Martinez',
    role: 'Agent',
    conversations: 180,
    responseTime: '3m 10s',
    performance: 68,
    status: 'Active',
    avatarColor: 'from-red-500 to-amber-600',
  },
  {
    id: 7,
    initials: 'DF',
    name: 'Daniel Foster',
    role: 'Agent',
    conversations: 160,
    responseTime: '3m 25s',
    performance: 65,
    status: 'Away',
    avatarColor: 'from-slate-500 to-slate-600',
  },
];

const getPerformanceColor = (performance: number): string => {
  if (performance >= 80) return 'bg-green-500';
  if (performance >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const getPerformanceTextColor = (performance: number): string => {
  if (performance >= 80) return 'text-green-600 dark:text-green-400';
  if (performance >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const getRoleBgColor = (role: string): string => {
  switch (role) {
    case 'Admin':
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    case 'Agent':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
    case 'Viewer':
      return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
    default:
      return 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
  }
};

const KPICard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  label: string;
  labelColor: string;
}> = ({ title, value, icon, bgColor, label, labelColor }) => (
  <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
      </div>
      <div className={`${bgColor} p-3 rounded-lg`}>{icon}</div>
    </div>
    <div className={`text-xs font-medium ${labelColor}`}>{label}</div>
  </div>
);

export default function TeamPage({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'activity'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'Agent' | 'Viewer'>('all');

  const filteredMembers = mockTeamMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Team</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your team members, roles, and monitor performance
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
              Export
            </button>
            <button className="px-4 py-2 bg-[#fe901d] hover:bg-[#e67e0d] text-white rounded-lg text-sm font-medium transition">
              Invite Team
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Members"
            value="8"
            icon={
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            }
            bgColor="bg-green-500"
            label="+2 new this month"
            labelColor="text-green-600 dark:text-green-400"
          />
          <KPICard
            title="Active Agents"
            value="6"
            icon={
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 10c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm8-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
            }
            bgColor="bg-indigo-500"
            label="75% of team active"
            labelColor="text-green-600 dark:text-green-400"
          />
          <KPICard
            title="Conversations Handled"
            value="2,430"
            icon={
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            }
            bgColor="bg-blue-500"
            label="+18% vs last 7 days"
            labelColor="text-green-600 dark:text-green-400"
          />
          <KPICard
            title="Avg Response Time"
            value="1m 42s"
            icon={
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 5V1h-1v4H8.98v2h4.03V5h-1zm6.93 12.26c1.24-1.78 2.08-3.96 2.08-6.26 0-6.08-4.92-11-11-11S1 5.92 1 12s4.92 11 11 11c2.3 0 4.48-.84 6.26-2.08l3.42 3.42 1.41-1.41-3.42-3.42zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            }
            bgColor="bg-amber-500"
            label="-12% vs last 7 days"
            labelColor="text-green-600 dark:text-green-400"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-8">
            {(['members', 'roles', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition relative ${
                  activeTab === tab
                    ? 'text-slate-900 dark:text-white border-b-2 border-[#fe901d]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'members' && 'Team Members'}
                {tab === 'roles' && 'Roles & Permissions'}
                {tab === 'activity' && 'Activity Log'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          {/* Team Members Table Card */}
          <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fe901d]"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fe901d]"
                >
                  <option value="all">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Agent">Agent</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Conversations
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${member.avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                          >
                            {member.initials}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {member.name}
                              {member.isCurrentUser && (
                                <span className="ml-2 inline-block px-2 py-0.5 bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)] text-[#c96a00] dark:text-[#ffb84d] text-xs font-medium rounded">
                                  You
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBgColor(member.role)}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                        {member.conversations}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                        {member.responseTime}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 max-w-xs">
                            <div
                              className={`${getPerformanceColor(member.performance)} h-1.5 rounded-full`}
                              style={{ width: `${member.performance}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${getPerformanceTextColor(member.performance)}`}
                          >
                            {member.performance}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              member.status === 'Active'
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                            }`}
                          />
                          <span className="text-slate-600 dark:text-slate-400">
                            {member.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-[#fe901d] hover:text-[#e67e0d] text-sm font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Showing 1-{filteredMembers.length} of {mockTeamMembers.length} members</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-slate-300 dark:border-white/10 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50 text-sm">
                  Prev
                </button>
                <button className="px-3 py-1 bg-[#fe901d] text-white rounded font-medium text-sm">
                  1
                </button>
                <button className="px-3 py-1 border border-slate-300 dark:border-white/10 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50 text-sm">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Invite Member Card */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Invite Member</h3>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fe901d]"
                />
                <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fe901d]">
                  <option>Select Role</option>
                  <option>Admin</option>
                  <option>Agent</option>
                  <option>Viewer</option>
                </select>
                <button className="w-full px-4 py-2 bg-[#fe901d] hover:bg-[#e67e0d] text-white rounded-lg text-sm font-medium transition">
                  Send Invite
                </button>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Conversations</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">1,978</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Avg Performance</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">78%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Active Today</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">6</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { icon: '👤', text: 'John Doe joined the team', time: '2 hours ago' },
                  { icon: '💬', text: 'Sarah handled 15 conversations', time: '4 hours ago' },
                  { icon: '⭐', text: 'Michael achieved 90% performance', time: '1 day ago' },
                  { icon: '🔄', text: 'Team performance increased by 5%', time: '2 days ago' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{activity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white">{activity.text}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
