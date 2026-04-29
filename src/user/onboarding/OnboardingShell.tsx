import {
  BadgeHelp,
  ChevronDown,
  CreditCard,
  LogOut,
} from "lucide-react";
import { type ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import { useLogoutAndRedirect } from "../../auth/hooks/useLogoutAndRedirect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import useColorMode from "../../client/hooks/useColorMode";
import TextLogoDark from "../../client/static/logos/TextLogo_dark.png";
import TextLogoLight from "../../client/static/logos/TextLogo_light.png";
import { cn } from "../../client/utils";

function getUserLabel(user: AuthUser) {
  const raw =
    user.identities?.email?.id ??
    user.email ??
    user.username ??
    "Workspace User";
  return raw.split("@")[0] || raw;
}

function getInitials(label: string) {
  return label
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function OnboardingTopbar({
  title,
  user,
}: {
  title: string;
  user: AuthUser;
}) {
  const [colorMode] = useColorMode();
  const isDark = colorMode === "dark";
  const label = getUserLabel(user);
  const initials = getInitials(label) || "Q";
  const logoutAndRedirect = useLogoutAndRedirect();
  const email = user.identities?.email?.id ?? user.email ?? "";

  return (
    <div className="sticky top-0 z-30 border-b border-[#ece8df] bg-white dark:border-white/10 dark:bg-[#08111f]">
      <div className="mx-auto flex h-[64px] w-full max-w-[1440px] items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-8 w-[4px] rounded-full bg-[linear-gradient(180deg,#fe901d,#ffb84d)]" />
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#182235] dark:text-slate-100">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex cursor-pointer items-center gap-2 rounded-full border border-[#f4dfc3] bg-white px-2.5 py-1.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:border-[#fe901d]/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#101826] dark:shadow-[0_10px_24px_rgba(2,6,23,0.4)]"
                type="button"
              >
                <span className="relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#131f35] text-[15px] font-bold text-white">
                  {initials}
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#101826]" />
                </span>
                <div className="hidden min-w-0 md:block">
                  <p className="truncate text-[12px] font-bold leading-none text-[#182235] dark:text-slate-50">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.18em] text-[#7d8798] dark:text-slate-400">
                    Workspace Admin
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#fe901d] dark:text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={12}
              className="w-[230px] overflow-hidden rounded-[20px] border border-[#ece8df] bg-white p-0 shadow-[0_18px_36px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#101826]"
            >
              <div className="px-4 py-3.5">
                <p className="text-[14px] font-extrabold text-[#182235] dark:text-slate-50">
                  {label}
                </p>
                <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                  {email || `${label}@workspace.local`}
                </p>
              </div>

              <div className="space-y-1 px-3 py-2.5">
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#3f4a5d] hover:bg-[#fff7eb] focus:bg-[#fff7eb] focus:text-[#3f4a5d] dark:text-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5"
                >
                  <a href="/billing">
                    <CreditCard className="h-4.5 w-4.5 shrink-0 text-[#fe901d] dark:text-slate-300" />
                    Billing &amp; Plans
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#3f4a5d] hover:bg-[#fff7eb] focus:bg-[#fff7eb] focus:text-[#3f4a5d] dark:text-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5"
                >
                  <a href="mailto:support@quicreply.io">
                    <BadgeHelp className="h-4.5 w-4.5 shrink-0 text-[#fe901d] dark:text-slate-300" />
                    Support Center
                  </a>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="mx-0 my-0 bg-[#ebeef3] dark:bg-white/10" />

              <div className="px-3 py-2.5">
                <DropdownMenuItem
                  className="cursor-pointer gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold text-[#c96a00] hover:bg-[#fff7eb] focus:bg-[#fff7eb] focus:text-[#c96a00] dark:hover:bg-[rgba(254,144,29,0.12)] dark:focus:bg-[rgba(254,144,29,0.12)]"
                  onClick={() => void logoutAndRedirect()}
                >
                  <LogOut className="h-4.5 w-4.5 shrink-0 text-[#fe901d] dark:text-[#fe901d]" />
                  Secure Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function OnboardingCanvas({
  children,
  user,
  title,
  className,
}: {
  children: ReactNode;
  user: AuthUser;
  title: string;
  className?: string;
}) {
  const [colorMode] = useColorMode();
  const isDark = colorMode === "dark";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(254,144,29,0.10),transparent_28%),#f8f9fb] dark:bg-[radial-gradient(circle_at_top,rgba(254,144,29,0.12),transparent_26%),#050b15]">
      <OnboardingTopbar title={title} user={user} />
      <main className={cn("px-6 py-10 md:px-8 md:py-14", className)}>
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8">
          <div className="flex justify-center">
            <img
              alt="QuicReply"
              className="h-10 w-auto"
              src={isDark ? TextLogoDark : TextLogoLight}
            />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
