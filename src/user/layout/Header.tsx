import { type AuthUser } from "wasp/auth";
import DarkModeSwitcher from "../../client/components/DarkModeSwitcher";
import { cn } from "../../client/utils";
import { UserDropdown } from "../UserDropdown";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (arg0: boolean) => void;
  user: AuthUser;
}) => {
  return (
    <header className="bg-background/80 backdrop-blur-xl border-border sticky top-0 z-10 flex w-full border-b shadow-xs lg:hidden">
        <div className="flex grow items-center justify-end px-8 py-5">
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
            {/* <!-- Hamburger Toggle BTN --> */}

            <button
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation();
                props.setSidebarOpen(!props.sidebarOpen);
              }}
              className="z-99999 border-border bg-background block rounded-sm border p-1.5 shadow-xs lg:hidden"
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

            {/* <!-- Hamburger Toggle BTN --> */}
          </div>
        </div>
    </header>
  );
};

export default Header;
