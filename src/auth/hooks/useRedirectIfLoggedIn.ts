import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import { routes } from "wasp/client/router";

export function useRedirectIfLoggedIn(redirectTo = "/") {
  const { data: user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const isOnboardingCompleted =
        (user as typeof user & { onboardingCompleted?: boolean })
          ?.onboardingCompleted === true;

      navigate(
        isOnboardingCompleted ? redirectTo : routes.OnboardingRoute.to,
      );
    }
  }, [user, navigate, redirectTo]);
}
