import { logout } from "wasp/client/auth";
import { routes } from "wasp/client/router";

export function useLogoutAndRedirect() {
  return async (onAfterLogout?: () => void) => {
    try {
      await logout();
    } finally {
      onAfterLogout?.();
      window.location.replace(routes.LoggedOutRoute.to);
    }
  };
}
