import React, { useEffect, useRef, useState } from 'react';
import { type AuthUser } from 'wasp/auth';
import {
  MessageCircle,
  Users,
  Zap,
  DollarSign,
  BarChart3,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import UserLayout from './layout/UserLayout';

const AnalyticsPage: React.FC<{ user: AuthUser }> = ({ user }) => {
  // Canvas refs for charts
  const lineCanvasRef = useRef<HTMLCanvasElement>(null);
  const donutCanvasRef = useRef<HTMLCanvasElement>(null);

  // Chart instance refs
  const lineChartRef = useRef<any>(null);
  const donutChartRef = useRef<any>(null);

  // State for Chart.js readiness
  const [chartReady, setChartReady] = useState(false);

  // Load Chart.js from CDN
  useEffect(() => {
    if ((window as any).Chart) {
      setChartReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.async = true;
    script.onload = () => {
      setChartReady(true);
    };
    script.onerror = () => {
      console.error('Failed to load Chart.js');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize line chart (Message Volume & Lead Trends)
  useEffect(() => {
    if (!chartReady || !lineCanvasRef.current) return;

    // Destroy previous instance
    lineChartRef.current?.destroy();

    // Generate 7 days of data
    const labels = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const messagesData = [2800, 3200, 2900, 3500, 3800, 4100, 4200];
    const leadsData = [420, 480, 450, 560, 610, 680, 720];

    const Chart = (window as any).Chart;
    lineChartRef.current = new Chart(lineCanvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Messages',
            data: messagesData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Leads',
            data: leadsData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              color: '#64748b',
              font: { size: 12, weight: 'normal' },
              usePointStyle: true,
              padding: 20,
              boxWidth: 6,
            },
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#334155',
            borderWidth: 1,
            borderRadius: 6,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              drawBorder: false,
            },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              padding: 8,
            },
          },
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              padding: 8,
            },
          },
        },
      },
    });

    return () => {
      lineChartRef.current?.destroy();
    };
  }, [chartReady]);

  // Initialize donut chart (AI vs Human Handled)
  useEffect(() => {
    if (!chartReady || !donutCanvasRef.current) return;

    // Destroy previous instance
    donutChartRef.current?.destroy();

    const Chart = (window as any).Chart;
    donutChartRef.current = new Chart(donutCanvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['AI Handled', 'Human Handled'],
        datasets: [
          {
            data: [84, 16],
            backgroundColor: ['#a855f7', '#d1d5db'],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom' as const,
            labels: {
              color: '#64748b',
              font: { size: 12, weight: 'normal' },
              usePointStyle: true,
              padding: 15,
              boxWidth: 6,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 12,
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#334155',
            borderWidth: 1,
            borderRadius: 6,
            callbacks: {
              label: function (context: any) {
                return context.label + ': ' + context.parsed + '%';
              },
            },
          },
        },
      },
    });

    return () => {
      donutChartRef.current?.destroy();
    };
  }, [chartReady]);

  const kpis = [
    {
      title: 'Total Messages',
      value: '12,842',
      change: '+18%',
      trend: 'up',
      icon: MessageCircle,
      color: 'blue',
    },
    {
      title: 'Leads Captured',
      value: '1,284',
      change: '+22%',
      trend: 'up',
      icon: Users,
      color: 'green',
    },
    {
      title: 'AI Autonomy',
      value: '84%',
      change: '+5pp',
      trend: 'up',
      icon: Zap,
      color: 'purple',
    },
    {
      title: 'Closed Revenue',
      value: '$42.8k',
      change: '+31%',
      trend: 'up',
      icon: DollarSign,
      color: 'amber',
    },
    {
      title: 'Conv. Rate',
      value: '9.1%',
      change: '-0.3pp',
      trend: 'down',
      icon: BarChart3,
      color: 'red',
    },
    {
      title: 'Avg Response',
      value: '2.4m',
      change: '-18%',
      trend: 'down',
      icon: Clock,
      color: 'teal',
    },
  ];

  const colorConfig: Record<
    string,
    { bgColor: string; iconColor: string; textColor: string }
  > = {
    blue: {
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-600 dark:text-green-400',
    },
    purple: {
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    amber: {
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    red: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-600 dark:text-red-400',
    },
    teal: {
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      textColor: 'text-teal-600 dark:text-teal-400',
    },
  };

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Analytics</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              AI-powered performance insights
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <select className="px-4 py-2 rounded-lg bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-medium hover:border-slate-300 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="last90days">Last 90 days</option>
            </select>
            <button className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors">
              Export
            </button>
          </div>
        </div>

        {/* KPI Cards Grid - 2 rows x 3 cols */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const config = colorConfig[kpi.color];
            const isNegative = kpi.trend === 'down';

            return (
              <div
                key={index}
                className="bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {kpi.value}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {isNegative ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                      <p
                        className={`text-sm font-semibold ${
                          isNegative
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {kpi.change}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        vs last month
                      </p>
                    </div>
                  </div>
                  <div className={`${config.bgColor} p-3 rounded-lg`}>
                    <Icon className={`${config.iconColor} w-6 h-6`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Message Volume & Lead Trends Chart */}
            <div className="bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Message Volume & Lead Trends
              </h3>
              <div style={{ position: 'relative', height: '300px' }}>
                <canvas ref={lineCanvasRef}></canvas>
              </div>
            </div>

            {/* AI Audit Card */}
            <div className="bg-slate-950 dark:bg-slate-950 border border-slate-700 dark:border-slate-700 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-[#fe901d]" />
                <h3 className="text-lg font-bold">Jennifer AI Performance Audit</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Intent Recognition
                  </p>
                  <p className="text-xl font-bold text-white">96%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Escalation Rate
                  </p>
                  <p className="text-xl font-bold text-white">4.2%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Avg Confidence
                  </p>
                  <p className="text-xl font-bold text-white">91%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">Unanswered</p>
                  <p className="text-xl font-bold text-white">2.1%</p>
                </div>
              </div>
            </div>

            {/* Campaign Performance Table */}
            <div className="bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Campaign Performance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Campaign
                      </th>
                      <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Sent
                      </th>
                      <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Delivered
                      </th>
                      <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Open Rate
                      </th>
                      <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Conv.
                      </th>
                      <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        Summer Campaign
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        5,240
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        5,108
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        38%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        12%
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                        $18,540
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        Lead Gen Q2
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        3,820
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        3,652
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        42%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        14%
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                        $12,820
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        Retention
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        2,340
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        2,256
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        51%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        8%
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                        $9,240
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                        Flash Sale
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        6,180
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        5,912
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        45%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                        10%
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                        $15,670
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - 1 col width */}
          <div className="space-y-6">
            {/* AI vs Human Handled Donut Chart */}
            <div className="bg-white dark:bg-[#0d1524] border border-slate-200 dark:border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                AI vs Human Handled
              </h3>
              <div style={{ position: 'relative', height: '280px' }}>
                <canvas ref={donutCanvasRef}></canvas>
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="bg-[#fff8ec] dark:bg-[rgba(254,144,29,0.08)] border border-[#fddcaa] dark:border-[rgba(254,144,29,0.2)] rounded-lg p-6">
              <h3 className="text-lg font-bold text-[#c96a00] dark:text-[#ffb84d] mb-4">
                AI Insights
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#fe901d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#7a4a00] dark:text-orange-200">
                    Your AI is handling 84% of inquiries independently, a 5pp increase from
                    last month.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#fe901d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#7a4a00] dark:text-orange-200">
                    Conversion rate improved to 9.1%, driven by faster response times and better
                    intent matching.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#fe901d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#7a4a00] dark:text-orange-200">
                    Average response time down to 2.4m. Consider automating more common queries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default AnalyticsPage;
