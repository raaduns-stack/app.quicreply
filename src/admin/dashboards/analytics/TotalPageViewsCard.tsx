import { ArrowDown, ArrowUp, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

type PageViewsStats = {
  totalPageViews: number | undefined;
  prevDayViewsChangePercent: string | undefined;
};

const TotalPageViewsCard = ({
  totalPageViews,
  prevDayViewsChangePercent,
}: PageViewsStats) => {
  const prevDayViewsChangePercentValue = parseInt(
    prevDayViewsChangePercent || "",
  );
  const isDeltaPositive = prevDayViewsChangePercentValue > 0;

  return (
    <Card className="bg-white/40 dark:bg-card/40 backdrop-blur-md border-border shadow-lg shadow-black/5 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <div className="size-12 bg-primary/10 flex items-center justify-center rounded-xl text-primary mb-2">
          <Eye size={24} />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            Total Views
          </p>
          <h4 className="text-3xl font-bold text-foreground tracking-tight">
            {totalPageViews?.toLocaleString() ?? "0"}
          </h4>
        </div>

        <div
          className={cn("flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full", {
            "bg-success/10 text-success":
              isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "bg-destructive/10 text-destructive":
              !isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "bg-muted text-muted-foreground":
              !prevDayViewsChangePercent ||
              prevDayViewsChangePercentValue === 0,
          })}
        >
          {prevDayViewsChangePercent && prevDayViewsChangePercentValue !== 0
            ? `${prevDayViewsChangePercent}%`
            : "0%"}
          {prevDayViewsChangePercent &&
            prevDayViewsChangePercentValue !== 0 &&
            (isDeltaPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalPageViewsCard;
