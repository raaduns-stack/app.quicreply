import { LayoutDashboard } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import { getDailyStats, useQuery } from "wasp/client/operations";
import { cn } from "../../../client/utils";
import DefaultLayout from "../../layout/DefaultLayout";
import RevenueAndProfitChart from "./RevenueAndProfitChart";
import SourcesTable from "./SourcesTable";
import TotalPageViewsCard from "./TotalPageViewsCard";
import TotalPayingUsersCard from "./TotalPayingUsersCard";
import TotalRevenueCard from "./TotalRevenueCard";
import TotalSignupsCard from "./TotalSignupsCard";

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { data: stats, isLoading, error } = useQuery(getDailyStats);

  if (error) {
    return (
      <DefaultLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <p className="text-2xl font-bold text-red-500">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {error.message || "Something went wrong while fetching stats."}
            </p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <div className="relative min-h-[500px]">
        <div
          className={cn("transition-all duration-700 ease-in-out", {
            "opacity-10 blur-sm pointer-events-none scale-95": !stats,
            "opacity-100 blur-0 scale-100": stats,
          })}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <TotalPageViewsCard
              totalPageViews={stats?.dailyStats?.totalViews}
              prevDayViewsChangePercent={
                stats?.dailyStats?.prevDayViewsChangePercent
              }
            />
            <TotalRevenueCard
              dailyStats={stats?.dailyStats}
              weeklyStats={stats?.weeklyStats}
              isLoading={isLoading}
            />
            <TotalPayingUsersCard
              dailyStats={stats?.dailyStats}
              isLoading={isLoading}
            />
            <TotalSignupsCard
              dailyStats={stats?.dailyStats}
              isLoading={isLoading}
            />
          </div>

          <div className="mt-8 grid grid-cols-12 gap-6">
            <RevenueAndProfitChart
              weeklyStats={stats?.weeklyStats}
              isLoading={isLoading}
            />

            <div className="col-span-12 lg:col-span-8">
              <SourcesTable sources={stats?.dailyStats?.sources} />
            </div>
          </div>
        </div>

        {(!stats || error) && !isLoading && (
          <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center z-10 p-4">
            <div className="bg-white/60 dark:bg-card/60 backdrop-blur-xl border border-white/40 dark:border-border/40 rounded-3xl p-12 shadow-2xl text-center max-w-lg transition-all duration-500 hover:shadow-primary/10">
              <div className="bg-primary/20 size-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <LayoutDashboard className="text-primary" size={40} />
              </div>
              <h2 className="text-foreground text-3xl font-black mb-4 tracking-tight">
                Preparing Your Data
              </h2>
              <div className="space-y-4">
                <p className="text-muted-foreground text-base leading-relaxed">
                  Welcome to your new Admin Control Center. We're currently waiting for the first batch of analytics to be processed.
                </p>
                <div className="bg-primary/5 rounded-xl p-4 text-left border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Status Update
                  </p>
                  <p className="text-sm text-foreground/80 leading-snug">
                    Automated background jobs run periodically to calculate views, revenue, and user trends. Your dashboard will populate automatically once the next cycle completes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
