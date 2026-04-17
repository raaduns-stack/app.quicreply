import { LogOut } from "lucide-react";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User } from "wasp/entities";
import { useLogoutAndRedirect } from "../auth/hooks/useLogoutAndRedirect";
import { userMenuItems } from "./constants";

export const UserMenuItems = ({
  user,
  onItemClick,
}: {
  user?: Partial<User>;
  onItemClick?: () => void;
}) => {
  const logoutAndRedirect = useLogoutAndRedirect();

  return (
    <>
      {userMenuItems.map((item) => {
        if (item.isAuthRequired && !user) return null;
        if (item.isAdminOnly && (!user || !user.isAdmin)) return null;

        return (
          <li key={item.name}>
            <WaspRouterLink
              to={item.to}
              onClick={onItemClick}
              className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
            >
              <item.icon size="1.1rem" />
              {item.name}
            </WaspRouterLink>
          </li>
        );
      })}
      <li>
        <button
          onClick={() => {
            void logoutAndRedirect(() => {
              onItemClick?.();
            });
          }}
          className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-7 transition-colors"
        >
          <LogOut size="1.1rem" />
          Log Out
        </button>
      </li>
    </>
  );
};
