import { useEffect, useRef } from "react";
import { type AuthUser } from "wasp/auth";
import { getWorkspaceShell, useQuery } from "wasp/client/operations";
import { Bell, Megaphone, Receipt, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { cn } from "../../client/utils";
import { UserDropdown } from "../UserDropdown";
import {
  dashboardShellBorderClassName,
  dashboardShellHeaderBackgroundClassName,
  dashboardShellHeaderClassName,
} from "./layoutConstants";

function HeaderSearch() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        buttonRef.current?.click();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Open quick search"
      onClick={() => {
        // TODO: open search modal/command palette
      }}
      className="hidden w-[200px] shrink-0 cursor-pointer items-center rounded-full border border-[#ece8df] bg-white px-4 py-2.5 shadow-sm shadow-slate-200/50 transition-colors hover:border-[#f3d2a5] hover:bg-[#fffaf3] dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none dark:hover:border-[#fe901d]/25 dark:hover:bg-white/5 lg:flex xl:w-[280px]"
    >
      <Search
        className="mr-3 h-5 w-5 shrink-0 text-slate-400"
        strokeWidth={2}
      />
      <span className="min-w-0 flex-1 text-left text-sm font-medium text-slate-400 dark:text-slate-500">
        Quick Search…
      </span>
      <span className="ml-3 rounded-md border border-[#ece8df] bg-[#f7f8fa] px-2 py-0.5 text-xs font-bold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
        ⌘K
      </span>
    </button>
  );
}

function NotificationDropdown() {
  const updates = [
    {
      title: 'Broadcast "Flash Sale" Completed',
      body: "Sent to 12.5k recipients with 94% delivery rate.",
      time: "10 min ago",
      icon: Megaphone,
      tone: "blue",
    },
    {
      title: "Invoice Paid Automatically",
      body: "Monthly standard subscription renewed.",
      time: "2 hours ago",
      icon: Receipt,
      tone: "orange",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ece8df] bg-white text-slate-500 outline-none transition-colors hover:border-[#f3d2a5] hover:bg-[#fffaf3] hover:text-[#fe901d] dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-300 dark:hover:border-[#fe901d]/25 dark:hover:bg-white/5 dark:hover:text-[#ffb84d]"
          type="button"
        >
          <Bell className="h-5 w-5" strokeWidth={1.9} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#fe901d] dark:border-[#0d1524]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[99999] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white p-0 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100 dark:shadow-black/30"
        sideOffset={12}
      >
        <div className="flex items-center justify-between border-b border-[#eee7de] px-5 py-4 dark:border-white/10">
          <h3 className="text-sm font-bold text-[#172033] dark:text-slate-50">
            Notifications
          </h3>
          <button
            className="cursor-pointer text-sm font-semibold text-[#fe901d] hover:underline"
            type="button"
          >
            Mark all read
          </button>
        </div>
        <div className="divide-y divide-[#f0ebe4] dark:divide-white/10">
          {updates.map((update) => {
            const Icon = update.icon;

            return (
              <div className="flex gap-4 px-5 py-5" key={update.title}>
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                    update.tone === "blue"
                      ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300"
                      : "border-[#ffd6a6] bg-[#fff7e8] text-[#fe901d] dark:border-[#fe901d]/20 dark:bg-[#fe901d]/10 dark:text-[#ffb84d]",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#172033] dark:text-slate-50">
                    {update.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {update.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {update.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="w-full cursor-pointer border-t border-[#eee7de] px-5 py-4 text-center text-sm font-semibold text-[#344054] transition-colors hover:bg-[#fffaf3] dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          type="button"
        >
          View all updates
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (arg0: boolean) => void;
  user: AuthUser;
}) => {
  const { data } = useQuery(getWorkspaceShell);
  const workspaceShell = data as
    | {
        staffDisplayName: string;
        staffRole: string;
      }
    | undefined;

  return (
    <header
      className={cn(
        dashboardShellHeaderClassName,
        dashboardShellBorderClassName,
        dashboardShellHeaderBackgroundClassName,
        "sticky top-0 z-10 flex w-full shrink-0 border-b transition-all duration-300",
      )}
    >
      <div className="flex grow items-center justify-between gap-4 px-4 lg:px-8">
        {/* <!-- Left side: Sidebar Toggle for mobile --> */}
        <div className="flex items-center lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-99999 block rounded-xl border border-[#ece8df] bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#101826]"
          >
            <span className="h-5.5 w-5.5 relative block cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span
                  className={cn(
                    "bg-foreground relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm delay-0 duration-200 ease-in-out",
                    {
                      "w-full! delay-300": !props.sidebarOpen,
                    },
                  )}
                ></span>
                <span
                  className={cn(
                    "bg-foreground relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm delay-150 duration-200 ease-in-out",
                    {
                      "delay-400 w-full!": !props.sidebarOpen,
                    },
                  )}
                ></span>
                <span
                  className={cn(
                    "bg-foreground relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm delay-200 duration-200 ease-in-out",
                    {
                      "w-full! delay-500": !props.sidebarOpen,
                    },
                  )}
                ></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span
                  className={cn(
                    "bg-foreground absolute left-2.5 top-0 block h-full w-0.5 rounded-sm delay-300 duration-200 ease-in-out",
                    {
                      "h-0! delay-0!": !props.sidebarOpen,
                    },
                  )}
                ></span>
                <span
                  className={cn(
                    "delay-400 bg-foreground absolute left-0 top-2.5 block h-0.5 w-full rounded-sm duration-200 ease-in-out",
                    {
                      "h-0! delay-200!": !props.sidebarOpen,
                    },
                  )}
                ></span>
              </span>
            </span>
          </button>
        </div>

        <div className="hidden flex-1 lg:flex" />

        {/* <!-- Right side items --> */}
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <HeaderSearch />
          <NotificationDropdown />
          <UserDropdown
            displayName={workspaceShell?.staffDisplayName}
            subtitle={workspaceShell?.staffRole}
            user={props.user}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
