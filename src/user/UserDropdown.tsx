import {
  LogOut,
  UserCircle,
  Sun,
  Moon,
  LinkIcon,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { type AuthUser } from "wasp/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../client/components/ui/dropdown-menu";
import useColorMode from "../client/hooks/useColorMode";
import { cn } from "../client/utils";
import { useLogoutAndRedirect } from "../auth/hooks/useLogoutAndRedirect";

export function UserDropdown({ user }: { user: AuthUser }) {
  const [colorMode, setColorMode] = useColorMode();
  const isInLightMode = colorMode === "light";
  const logoutAndRedirect = useLogoutAndRedirect();
  const displayName = user.username || user.email?.split("@")[0] || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex cursor-pointer items-center gap-2 rounded-full border border-[#ece8df] bg-white px-2 py-1.5 outline-none transition-colors hover:border-[#f3d2a5] hover:bg-[#fffaf3] dark:border-white/10 dark:bg-[#0d1524] dark:hover:border-[#fe901d]/25 dark:hover:bg-white/5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e8e2d8] bg-[#f8fafc] text-sm font-semibold uppercase text-[#172033] transition-colors dark:border-white/10 dark:bg-[#111827] dark:text-slate-100">
            {user.email ? user.email.charAt(0) : "U"}
          </div>
          <div className="mr-1 hidden flex-col text-left sm:flex">
            <span className="max-w-[150px] truncate text-sm font-semibold text-[#172033] dark:text-slate-100">
              {displayName}
            </span>
          </div>
          <ChevronDown
            size={14}
            className="text-slate-500 transition-colors group-hover:text-[#fe901d] dark:text-slate-400"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[99999] w-64 rounded-2xl border border-[#e8e2d8] bg-white p-2 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100 dark:shadow-black/30"
      >
        <div className="px-3 py-3">
          <p className="truncate text-sm font-bold text-[#172033] dark:text-slate-50">
            {displayName}
          </p>
          {user.email ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          ) : null}
        </div>

        <DropdownMenuItem className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#344054] focus:bg-[#f8fafc] focus:text-[#172033] dark:text-slate-200 dark:focus:bg-white/5 dark:focus:text-slate-50">
          <UserCircle size={18} strokeWidth={1.5} />
          My profile
        </DropdownMenuItem>

        {user.isAdmin && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#344054] focus:bg-[#f8fafc] focus:text-[#172033] dark:text-slate-200 dark:focus:bg-white/5 dark:focus:text-slate-50"
          >
            <a href="/admin">
              <ShieldCheck size={18} strokeWidth={1.5} />
              Admin Dashboard
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="cursor-pointer justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#344054] focus:bg-[#f8fafc] focus:text-[#172033] dark:text-slate-200 dark:focus:bg-white/5 dark:focus:text-slate-50"
          onClick={(e) => {
            e.preventDefault();
            if (typeof setColorMode === "function") {
              setColorMode(isInLightMode ? "dark" : "light");
            }
          }}
        >
          <div className="flex items-center gap-3">
            {isInLightMode ? (
              <Sun size={18} strokeWidth={1.5} />
            ) : (
              <Moon size={18} strokeWidth={1.5} />
            )}
            Toggle theme
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-[#eee7de] dark:bg-white/10" />

        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#344054] focus:bg-[#f8fafc] focus:text-[#172033] dark:text-slate-200 dark:focus:bg-white/5 dark:focus:text-slate-50"
        >
          <a
            href="https://www.quicreply.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkIcon size={18} strokeWidth={1.5} />
            Homepage
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-[#eee7de] dark:bg-white/10" />

        <DropdownMenuItem
          className="cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344054] focus:bg-[#fff8ee] focus:text-[#c96a00] dark:text-slate-200 dark:focus:bg-[#fe901d]/10 dark:focus:text-[#ffb84d]"
          onClick={() => void logoutAndRedirect()}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
