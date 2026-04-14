import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Megaphone,
  Settings,
  MoreHorizontal,
  X,
  UserCircle,
  Sun,
  Moon,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { logout } from "wasp/client/auth";
import LogoWithoutText from "../../client/static/logos/LOGOWITHOUTTEXT.png";
import LogoWithText_Dark from "../../client/static/logos/TextLogo_dark.png";
import LogoWithText_Light from "../../client/static/logos/TextLogo_light.png";
import { cn } from "../../client/utils";
import useColorMode from "../../client/hooks/useColorMode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (arg: boolean) => void;
  user: AuthUser;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  isSidebarExpanded, 
  setIsSidebarExpanded,
  user
}: SidebarProps) => {
  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);
  const location = useLocation();
  const [colorMode, setColorMode] = useColorMode();
  const isInLightMode = colorMode === "light";

  // Close on click outside (mobile)
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-white dark:bg-card absolute top-0 left-0 z-9999 flex h-screen flex-col overflow-y-hidden border-r border-border transition-all duration-300 ease-in-out lg:static lg:translate-x-0 w-64 shadow-xl lg:shadow-none",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
          "w-64": isSidebarExpanded,
          "w-[4.5rem]": !isSidebarExpanded,
        },
      )}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className={cn("flex flex-col border-b border-border transition-all duration-300 pointer-events-none sticky top-0 bg-white/40 dark:bg-card/40 backdrop-blur-md z-20", {
        "px-4": isSidebarExpanded,
        "px-0": !isSidebarExpanded
      })}>
        <div className={cn("flex items-center gap-2.5 h-[77px] pointer-events-auto", {
          "justify-between": isSidebarExpanded,
          "justify-center": !isSidebarExpanded
        })}>
          <div className={cn("flex items-center gap-3 overflow-hidden", {
            "flex-1": isSidebarExpanded,
            "w-full justify-center": !isSidebarExpanded
          })}>
            {isSidebarExpanded ? (
              <img 
                src={isInLightMode ? LogoWithText_Light : LogoWithText_Dark} 
                alt="Logo with Text" 
                className="h-7.5 w-auto object-contain shrink-0"
              />
            ) : (
              <button 
                onClick={() => setIsSidebarExpanded(true)}
                className="flex size-10 items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer outline-none border-none bg-transparent"
                title="Expand Sidebar"
              >
                <img 
                  src={LogoWithoutText} 
                  alt="Logo" 
                  className="h-6 w-6 object-contain shrink-0"
                />
              </button>
            )}
          </div>

          {isSidebarExpanded && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Desktop Collapse Button */}
              <button
                onClick={() => setIsSidebarExpanded(false)}
                className="hidden lg:flex size-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-secondary hover:text-foreground transition-all duration-200 outline-none"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>

              {/* Mobile Close Button */}
              <button
                ref={trigger}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="block lg:hidden p-1.5 text-secondary hover:text-foreground hover:bg-gray-100 rounded-lg dark:hover:bg-white/10"
              >
                <X strokeWidth={1.5} size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col flex-1 overflow-y-auto">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-4 px-3 flex-1 flex flex-col">
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-primary/10 text-primary dark:bg-primary/20" 
                          : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-foreground",
                        {
                          "justify-center px-0": !isSidebarExpanded
                        }
                      )
                    }
                    title={!isSidebarExpanded ? item.name : ""}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon 
                          strokeWidth={1.5} 
                          size={18} 
                          className={cn("shrink-0", { "text-primary": isActive, "text-inherit": !isActive })} 
                        />
                        <span className={cn("whitespace-nowrap transition-all duration-300", {
                          "opacity-0 w-0 hidden": !isSidebarExpanded,
                          "opacity-100 w-auto ml-1": isSidebarExpanded,
                        })}>
                          {item.name}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>


    </aside>
  );
};

export default Sidebar;
