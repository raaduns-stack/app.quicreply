import {
  BarChart3,
  Bot,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Network,
  Settings,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import LogoWithoutText from "../../client/static/logos/LOGOWITHOUTTEXT.png";
import LogoWithTextDark from "../../client/static/logos/TextLogo_dark.png";
import LogoWithTextLight from "../../client/static/logos/TextLogo_light.png";
import { cn } from "../../client/utils";
import useColorMode from "../../client/hooks/useColorMode";
import {
  dashboardShellBorderClassName,
  dashboardShellHeaderBackgroundClassName,
  dashboardShellHeaderClassName,
} from "./layoutConstants";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (arg: boolean) => void;
  user: AuthUser;
}

type NavItem = {
  name: string;
  href?: string;
  icon?: typeof LayoutDashboard;
  disabled?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type NavGroup = {
  name: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Messages",
    items: [{ name: "Inbox", href: "/inbox", icon: Inbox }],
  },
  {
    label: "Customers",
    items: [
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Pipeline", href: "/pipeline", icon: Workflow },
    ],
  },
  {
    label: "Growth",
    items: [{ name: "Campaigns", href: "/campaigns", icon: Megaphone }],
  },
];

const navGroups: Array<NavGroup & { section: string }> = [
  {
    section: "Growth",
    name: "AI / Jennifer",
    icon: Bot,
    items: [
      { name: "Overview", href: "/ai" },
      { name: "Setup", href: "/ai/setup" },
      { name: "Knowledge Base", href: "/ai/knowledge" },
      { name: "Test AI", href: "/ai/test" },
      { name: "Settings", href: "/ai/settings" },
    ],
  },
  {
    section: "Channels",
    name: "WhatsApp",
    icon: MessageSquare,
    items: [
      { name: "Overview", href: "/whatsapp" },
      { name: "API Setup", href: "/whatsapp/setup" },
    ],
  },
];

const trailingSections: NavSection[] = [
  {
    label: "Insights",
    items: [{ name: "Analytics", href: "/analytics", icon: BarChart3 }],
  },
  {
    label: "Team",
    items: [{ name: "Team", href: "/team", icon: Users }],
  },
  {
    label: "System",
    items: [
      { name: "Billing", href: "/billing", icon: CreditCard },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const itemClassName =
  "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200";

const activeItemClassName =
  "bg-[#fff3e1] text-[#c96a00] dark:bg-[rgba(254,144,29,0.14)] dark:text-[#ffb84d]";

const idleItemClassName =
  "text-[#6b7280] hover:bg-[#f8f9fa] hover:text-[#182235] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100";

function SectionLabel({
  children,
  isSidebarExpanded,
}: {
  children: string;
  isSidebarExpanded: boolean;
}) {
  if (!isSidebarExpanded) {
    return (
      <div className="mt-3 border-t border-[#ece8df] dark:border-white/10" />
    );
  }

  return (
    <div className="px-4 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#a5adba] dark:text-slate-500">
      {children}
    </div>
  );
}

function SoonBadge({ isSidebarExpanded }: { isSidebarExpanded: boolean }) {
  if (!isSidebarExpanded) {
    return null;
  }

  return (
    <span className="ml-auto rounded-full bg-[#fff3e1] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#c96a00] dark:bg-[rgba(254,144,29,0.12)] dark:text-[#ffb84d]">
      Soon
    </span>
  );
}

function SidebarItem({
  item,
  isSidebarExpanded,
}: {
  item: NavItem;
  isSidebarExpanded: boolean;
}) {
  const Icon = item.icon;

  if (item.disabled || !item.href) {
    return (
      <button
        className={cn(
          itemClassName,
          "cursor-not-allowed border-l-transparent text-[#a5adba] opacity-75 dark:text-slate-600",
          { "justify-center px-0": !isSidebarExpanded },
        )}
        disabled
        title={!isSidebarExpanded ? `${item.name} coming soon` : undefined}
        type="button"
      >
        {Icon ? (
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
        ) : null}
        <span
          className={cn("truncate transition-all", {
            hidden: !isSidebarExpanded,
          })}
        >
          {item.name}
        </span>
        <SoonBadge isSidebarExpanded={isSidebarExpanded} />
      </button>
    );
  }

  return (
    <NavLink
      className={({ isActive }) =>
        cn(itemClassName, isActive ? activeItemClassName : idleItemClassName, {
          "justify-center px-0": !isSidebarExpanded,
        })
      }
      end={item.href === "/"}
      title={!isSidebarExpanded ? item.name : undefined}
      to={item.href}
    >
      {({ isActive }) => (
        <>
          {Icon ? (
            <Icon
              className={cn("h-[18px] w-[18px] shrink-0", {
                "text-[#fe901d]": isActive,
              })}
              strokeWidth={1.7}
            />
          ) : null}
          <span
            className={cn("truncate transition-all", {
              hidden: !isSidebarExpanded,
            })}
          >
            {item.name}
          </span>
        </>
      )}
    </NavLink>
  );
}

function SidebarGroup({
  group,
  isSidebarExpanded,
}: {
  group: NavGroup;
  isSidebarExpanded: boolean;
}) {
  const location = useLocation();
  const isGroupActive = group.items.some(
    (item) => item.href && (location.pathname === item.href || location.pathname.startsWith(item.href + "/")),
  );
  const [isOpen, setIsOpen] = useState(isGroupActive);
  const Icon = group.icon;

  useEffect(() => {
    if (isGroupActive) {
      setIsOpen(true);
    }
  }, [isGroupActive]);

  return (
    <div>
      <button
        className={cn(
          itemClassName,
          isGroupActive ? activeItemClassName : idleItemClassName,
          "cursor-pointer",
          { "justify-center px-0": !isSidebarExpanded },
        )}
        onClick={() => setIsOpen((current) => !current)}
        title={!isSidebarExpanded ? group.name : undefined}
        type="button"
      >
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0", {
            "text-[#fe901d]": isGroupActive,
          })}
          strokeWidth={1.7}
        />
        <span
          className={cn("truncate transition-all", {
            hidden: !isSidebarExpanded,
          })}
        >
          {group.name}
        </span>
        <ChevronDown
          className={cn("ml-auto h-4 w-4 text-[#a5adba] transition-transform", {
            hidden: !isSidebarExpanded,
            "rotate-180": isOpen,
          })}
          strokeWidth={1.8}
        />
      </button>

      {isSidebarExpanded ? (
        <div
          className={cn(
            "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200",
            isOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0">
            <div className="mb-1 ml-7 mt-1 space-y-1 border-l border-[#ece8df] pl-3 dark:border-white/10">
              {group.items.map((item) =>
                item.disabled || !item.href ? (
                  <button
                    className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#a5adba] opacity-75 dark:text-slate-600"
                    disabled
                    key={item.name}
                    type="button"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d1d5db] dark:bg-slate-700" />
                    <span>{item.name}</span>
                    <SoonBadge isSidebarExpanded />
                  </button>
                ) : (
                  <NavLink
                    end
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                        isActive
                          ? "bg-[#fff3e1] text-[#c96a00] dark:bg-[rgba(254,144,29,0.12)] dark:text-[#ffb84d]"
                          : "text-[#6b7280] hover:bg-[#f8f9fa] hover:text-[#182235] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100",
                      )
                    }
                    key={item.name}
                    to={item.href}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", {
                            "bg-[#fe901d]": isActive,
                            "bg-[#d1d5db] dark:bg-slate-700": !isActive,
                          })}
                        />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  isSidebarExpanded,
  setIsSidebarExpanded,
}: SidebarProps) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const sidebar = useRef<HTMLElement | null>(null);
  const [colorMode] = useColorMode();
  const isLightMode = colorMode === "light";

  const sectionsWithGroups = useMemo(() => {
    return navSections.map((section) => ({
      ...section,
      groups: navGroups.filter((group) => group.section === section.label),
    }));
  }, []);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      ) {
        return;
      }
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [setSidebarOpen, sidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!sidebarOpen || key !== "Escape") return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [setSidebarOpen, sidebarOpen]);

  return (
    <aside
      ref={sidebar}
      className={cn(
        "absolute left-0 top-0 z-9999 flex h-screen flex-col overflow-hidden border-r border-[#ece8df] bg-white shadow-xl transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-[#08111f] lg:static lg:translate-x-0 lg:shadow-none",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
          "w-64": isSidebarExpanded,
          "w-[4.5rem]": !isSidebarExpanded,
        },
      )}
    >
      <div
        className={cn(
          dashboardShellHeaderClassName,
          dashboardShellBorderClassName,
          dashboardShellHeaderBackgroundClassName,
          "sticky top-0 z-20 flex items-center border-b transition-all",
          isSidebarExpanded ? "justify-between px-4" : "justify-center px-0",
        )}
      >
        <div
          className={cn("flex min-w-0 items-center gap-3 overflow-hidden", {
            "flex-1": isSidebarExpanded,
            "w-full justify-center": !isSidebarExpanded,
          })}
        >
          {isSidebarExpanded ? (
            <img
              alt="QuicReply"
              className="h-8 w-auto shrink-0 object-contain"
              src={isLightMode ? LogoWithTextLight : LogoWithTextDark}
            />
          ) : (
            <button
              className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-transparent transition-colors hover:bg-[#fff3e1] dark:hover:bg-white/5"
              onClick={() => setIsSidebarExpanded(true)}
              title="Expand sidebar"
              type="button"
            >
              <img
                alt="QuicReply"
                className="h-6 w-6 shrink-0 object-contain"
                src={LogoWithoutText}
              />
            </button>
          )}
        </div>

        {isSidebarExpanded ? (
          <div className="flex items-center gap-1">
            <button
              className="hidden size-8 cursor-pointer items-center justify-center rounded-xl text-[#7d8798] transition-colors hover:bg-[#fff3e1] hover:text-[#c96a00] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100 lg:flex"
              onClick={() => setIsSidebarExpanded(false)}
              title="Collapse sidebar"
              type="button"
            >
              <ChevronLeft size={18} strokeWidth={1.7} />
            </button>

            <button
              className="block cursor-pointer rounded-xl p-1.5 text-[#7d8798] transition-colors hover:bg-[#fff3e1] hover:text-[#c96a00] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              ref={trigger}
              type="button"
            >
              <X strokeWidth={1.7} size={20} />
            </button>
          </div>
        ) : null}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {sectionsWithGroups.map((section) => (
          <div key={section.label}>
            <SectionLabel isSidebarExpanded={isSidebarExpanded}>
              {section.label}
            </SectionLabel>
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  isSidebarExpanded={isSidebarExpanded}
                  item={item}
                  key={item.name}
                />
              ))}
              {section.groups.map((group) => (
                <SidebarGroup
                  group={group}
                  isSidebarExpanded={isSidebarExpanded}
                  key={group.name}
                />
              ))}
            </div>
          </div>
        ))}

        {navGroups
          .filter(
            (group) =>
              !sectionsWithGroups.some((section) =>
                section.groups.some(
                  (sectionGroup) => sectionGroup.name === group.name,
                ),
              ),
          )
          .map((group) => (
            <div key={group.section}>
              <SectionLabel isSidebarExpanded={isSidebarExpanded}>
                {group.section}
              </SectionLabel>
              <SidebarGroup
                group={group}
                isSidebarExpanded={isSidebarExpanded}
              />
            </div>
          ))}

        {trailingSections.map((section) => (
          <div key={section.label}>
            <SectionLabel isSidebarExpanded={isSidebarExpanded}>
              {section.label}
            </SectionLabel>
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  isSidebarExpanded={isSidebarExpanded}
                  item={item}
                  key={item.name}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {isSidebarExpanded ? (
        <div className="border-t border-[#ece8df] p-3 dark:border-white/10">
          <div className="rounded-2xl border border-[#f4dfc3] bg-[#fff8ee] px-3 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-[12px] font-extrabold text-[#182235] dark:text-slate-100">
              <Network className="h-4 w-4 text-[#fe901d]" strokeWidth={1.8} />
              Revenue Sales OS
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#667085] dark:text-slate-400">
              QR first. API when you scale.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

export default Sidebar;
