import { type PageViewSource } from "wasp/entities";

const SourcesTable = ({
  sources,
}: {
  sources: PageViewSource[] | undefined;
}) => {
  return (
    <div className="bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border shadow-lg shadow-black/5 p-6 rounded-2xl transition-all duration-300 overflow-hidden">
      <h4 className="text-foreground mb-6 text-xl font-bold tracking-tight">
        Top Sources
      </h4>

      <div className="flex flex-col">
        <div className="bg-gray-100 dark:bg-white/5 grid grid-cols-3 rounded-xl mb-2">
          <div className="p-4">
            <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              Source
            </h5>
          </div>
          <div className="p-4 text-center">
            <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              Visitors
            </h5>
          </div>
          <div className="hidden p-4 text-center sm:block">
            <h5 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              Sales
            </h5>
          </div>
        </div>

        {sources && sources.length > 0 ? (
          sources.map((source, idx) => (
            <div key={idx} className={cn("grid grid-cols-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl", {
              "border-b border-border/50": idx !== sources.length - 1
            })}>
              <div className="flex items-center gap-3 p-4">
                <p className="text-sm font-semibold text-foreground">{source.name}</p>
              </div>

              <div className="flex items-center justify-center p-4">
                <p className="text-sm font-bold text-foreground">{source.visitors.toLocaleString()}</p>
              </div>

              <div className="hidden items-center justify-center p-4 sm:flex">
                <p className="text-sm font-medium text-muted-foreground">--</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted size-12 rounded-full flex items-center justify-center mb-4">
              <span className="text-muted-foreground text-xl">?</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">No sources detected yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SourcesTable;
