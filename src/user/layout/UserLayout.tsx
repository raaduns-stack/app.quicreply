import { FC, ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import { routes } from "wasp/client/router";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const UserLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const navigate = useNavigate();
  const isOnboardingCompleted =
    (user as AuthUser & { onboardingCompleted?: boolean }).onboardingCompleted ===
    true;

  useEffect(() => {
    if (!isOnboardingCompleted) {
      navigate(routes.OnboardingRoute.to, { replace: true });
    }
  }, [isOnboardingCompleted, navigate]);

  if (!isOnboardingCompleted) {
    return null;
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          isSidebarExpanded={isSidebarExpanded}
          setIsSidebarExpanded={setIsSidebarExpanded}
          user={user}
        />
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto duration-300 ease-in-out">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isSidebarExpanded={isSidebarExpanded}
            setIsSidebarExpanded={setIsSidebarExpanded}
            user={user}
          />
          <main>
            <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
