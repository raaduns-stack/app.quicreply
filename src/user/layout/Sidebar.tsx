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
  LogOut
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { logout } from "wasp/client/auth";
import LogoWithoutText from "../../client/static/logos/LOGOWITHOUTTEXT.png";
import LogoWithText from "../../client/static/logos/LOGOWITHTEXT.png";
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
        "bg-white dark:bg-card absolute top-0 left-0 z-9999 flex h-screen flex-col overflow-y-hidden border-r transition-all duration-300 ease-in-out lg:static lg:translate-x-0 w-64 shadow-xl lg:shadow-none",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
          "w-64": isSidebarExpanded,
          "w-[4.5rem]": !isSidebarExpanded,
        },
      )}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className={cn("flex flex-col border-b border-gray-100 dark:border-border", {
        "px-4 py-3": isSidebarExpanded,
        "px-2 py-3": !isSidebarExpanded
      })}>
        <div className="flex flex-row items-center justify-between">
          <button 
            type="button"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} 
            className="flex items-center gap-3 w-full h-[54px] rounded-lg border-none bg-transparent hover:bg-gray-100 dark:hover:bg-accent transition-colors duration-200 outline-none p-1 cursor-pointer"
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarExpanded ? (
              <img 
                src={LogoWithText} 
                alt="Logo with Text" 
                className="h-9 w-auto object-contain shrink-0"
              />
            ) : (
              <div className="flex w-full justify-center">
                <img 
                  src={LogoWithoutText} 
                  alt="Logo" 
                  className="h-8 w-8 object-contain shrink-0"
                />
              </div>
            )}
          </button>

          <div className="flex items-center">
            {/* Mobile Close Button */}
            <button
              ref={trigger}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="block lg:hidden p-1.5 text-secondary hover:text-foreground hover:bg-gray-100 rounded-lg dark:hover:bg-accent"
            >
              <X strokeWidth={1.5} size={20} />
            </button>
          </div>
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
                          : "text-muted-foreground hover:bg-gray-50 hover:text-foreground dark:hover:bg-card-subtle dark:hover:text-foreground",
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
                          size={20} 
                          className={cn("shrink-0", { "text-primary": isActive, "text-inherit": !isActive })} 
                        />
                        <span className={cn("whitespace-nowrap transition-all duration-300", {
                          "opacity-0 w-0 hidden": !isSidebarExpanded,
                          "opacity-100 w-auto": isSidebarExpanded,
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

      {/* <!-- User Profile Section --> */}
      <div className={cn("border-t border-gray-100 dark:border-border p-3 transition-all duration-300 overflow-visible", {
        "px-4": isSidebarExpanded,
        "px-2": !isSidebarExpanded
      })}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-full border-none outline-none flex items-center justify-between rounded-xl p-2 cursor-pointer transition-colors bg-transparent",
              "hover:bg-gray-50 dark:hover:bg-accent group",
              {
                "justify-center px-1": !isSidebarExpanded
              }
            )}>
              <div className="flex flex-1 items-center gap-3 overflow-hidden">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-foreground text-sm font-semibold dark:bg-card-subtle dark:border-border uppercase">
                  {user.email ? user.email.charAt(0) : "U"}
                </div>
                
                <div className={cn("flex flex-col text-left overflow-hidden transition-all duration-300", {
                  "opacity-0 w-0 hidden": !isSidebarExpanded,
                  "opacity-100 w-full": isSidebarExpanded,
                })}>
                  <span className="truncate text-sm font-medium text-foreground w-full">
                    {user.email}
                  </span>
                </div>
              </div>
              
              {isSidebarExpanded && (
                <MoreHorizontal size={16} className="text-secondary group-hover:text-foreground transition-colors shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align={isSidebarExpanded ? "start" : "center"} 
            side="top"
            sideOffset={14}
            className="w-56 rounded-xl border border-gray-200 dark:border-border p-1 shadow-lg dark:bg-card z-[99999]"
          >
            <DropdownMenuItem className="cursor-pointer gap-3 text-sm py-2 rounded-lg">
              <UserCircle size={18} strokeWidth={1.5} />
              My profile
            </DropdownMenuItem>
            
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

            <DropdownMenuItem asChild className="cursor-pointer gap-3 text-sm py-2 rounded-lg">
              <a href="https://www.quicreply.io/" target="_blank" rel="noopener noreferrer">
                <LinkIcon size={18} strokeWidth={1.5} />
                Homepage
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-100 dark:bg-border my-1" />

            <DropdownMenuItem 
              className="cursor-pointer gap-3 text-sm py-2 rounded-lg"
              onClick={() => logout()}
            >
              <LogOut size={18} strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default Sidebar;
