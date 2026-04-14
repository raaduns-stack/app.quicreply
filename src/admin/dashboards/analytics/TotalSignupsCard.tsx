import { ArrowDown, ArrowUp, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { type DailyStatsProps } from "../../../analytics/stats";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

const TotalSignupsCard = ({ dailyStats, isLoading }: DailyStatsProps) => {
  const isDeltaPositive = useMemo(() => {
    return !!dailyStats?.userDelta && dailyStats.userDelta > 0;
  }, [dailyStats]);

  return (
    <Card className="bg-white/40 dark:bg-card/40 backdrop-blur-md border-border shadow-lg shadow-black/5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <div className="size-12 bg-emerald-500/10 flex items-center justify-center rounded-xl text-emerald-600 mb-2">
          <UsersRound size={24} />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            Total Signups
          </p>
          <h4 className="text-3xl font-bold text-foreground tracking-tight">
            {dailyStats?.userCount?.toLocaleString() ?? "0"}
          </h4>
        </div>

        <div
          className={cn("flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full", {
            "bg-success/10 text-success": isDeltaPositive && !isLoading,
            "bg-destructive/10 text-destructive":
              !isDeltaPositive && !isLoading && dailyStats?.userDelta !== 0,
            "bg-muted text-muted-foreground": isLoading || !dailyStats?.userDelta,
          })}
        >
          {isLoading ? "..." : (dailyStats?.userDelta ?? "0")}
          {!isLoading && (dailyStats?.userDelta ?? 0) !== 0 && (
            isDeltaPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalSignupsCard;
