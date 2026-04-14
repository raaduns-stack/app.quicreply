import { ArrowDown, ArrowUp, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { type DailyStatsProps } from "../../../analytics/stats";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

const TotalRevenueCard = ({
  dailyStats,
  weeklyStats,
  isLoading,
}: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    if (!weeklyStats) return false;
    return weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue > 0;
  }, [weeklyStats]);

  const deltaPercentage = useMemo(() => {
    if (!weeklyStats || weeklyStats.length < 2 || isLoading) return;
    if (
      weeklyStats[1]?.totalRevenue === 0 ||
      weeklyStats[0]?.totalRevenue === 0
    )
      return 0;

    weeklyStats.sort((a, b) => b.id - a.id);

    const percentage =
      ((weeklyStats[0].totalRevenue - weeklyStats[1]?.totalRevenue) /
        weeklyStats[1]?.totalRevenue) *
      100;
    return Math.floor(percentage);
  }, [weeklyStats]);

  return (
    <Card className="bg-white/40 dark:bg-card/40 backdrop-blur-md border-border shadow-lg shadow-black/5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <div className="size-12 bg-orange-500/10 flex items-center justify-center rounded-xl text-orange-600 mb-2">
          <ShoppingCart size={24} />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            Total Revenue
          </p>
          <h4 className="text-3xl font-bold text-foreground tracking-tight">
            ${dailyStats?.totalRevenue?.toLocaleString() ?? "0"}
          </h4>
        </div>

        <div
          className={cn("flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full", {
            "bg-success/10 text-success":
              isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "bg-destructive/10 text-destructive":
              !isDeltaPositive && !isLoading && deltaPercentage !== 0,
            "bg-muted text-muted-foreground":
              isLoading || !deltaPercentage || deltaPercentage === 0,
          })}
        >
          {isLoading
            ? "..."
            : deltaPercentage && deltaPercentage !== 0
              ? `${deltaPercentage}%`
              : "0%"}
          {!isLoading &&
            deltaPercentage &&
            deltaPercentage !== 0 &&
            (isDeltaPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalRevenueCard;
