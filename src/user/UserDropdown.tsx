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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 outline-none cursor-pointer group">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-foreground text-sm font-semibold dark:bg-card-subtle dark:border-border uppercase group-hover:border-primary/30 transition-colors">
            {user.email ? user.email.charAt(0) : "U"}
          </div>
          <div className="hidden sm:flex flex-col text-left mr-1">
            <span className="truncate text-sm font-medium text-foreground max-w-[150px]">
              {user.username || user.email}
            </span>
          </div>
          <ChevronDown
            size={14}
            className="text-muted-foreground group-hover:text-foreground transition-colors"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border border-gray-200 dark:border-border p-1 shadow-lg dark:bg-card z-[99999]"
      >
        <DropdownMenuItem className="cursor-pointer gap-3 text-sm py-2 rounded-lg">
          <UserCircle size={18} strokeWidth={1.5} />
          My profile
        </DropdownMenuItem>

        {user.isAdmin && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-3 text-sm py-2 rounded-lg text-primary focus:text-primary focus:bg-primary/5"
          >
            <a href="/admin">
              <ShieldCheck size={18} strokeWidth={1.5} />
              Admin Dashboard
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="cursor-pointer gap-3 text-sm py-2 rounded-lg justify-between"
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

        <DropdownMenuSeparator className="bg-gray-100 dark:bg-border my-1" />

        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-3 text-sm py-2 rounded-lg"
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

        <DropdownMenuSeparator className="bg-gray-100 dark:bg-border my-1" />

        <DropdownMenuItem
          className="cursor-pointer gap-3 text-sm py-2 rounded-lg text-destructive focus:text-destructive"
          onClick={() => void logoutAndRedirect()}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
