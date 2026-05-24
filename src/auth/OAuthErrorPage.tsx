import { AlertCircle, KeyRound, LogIn, RefreshCcw } from "lucide-react";
import { config } from "wasp/client";
import { routes } from "wasp/client/router";
import {
  AuthBackdrop,
  AuthBackLink,
  AuthCardLayout,
  AuthMessage,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from "./components/AuthCardLayout";

function decodeErrorMessage(error: string | null) {
  if (!error) {
    return null;
  }

  try {
    return decodeURIComponent(error);
  } catch {
    return error;
  }
}

function getOAuthErrorCopy(rawError: string | null) {
  const error = decodeErrorMessage(rawError)?.trim() ?? "";
  const lowered = error.toLowerCase();

  if (
    lowered.includes("same identity already exists") ||
    lowered.includes("same email already exists")
  ) {
    return {
      title: "Account already exists",
      description:
        "This email is already attached to an existing QuicReply account.",
      details:
        "If the account was originally created with email and password, keep using that method for now. Provider linking is not enabled yet, so we should not auto-merge identities.",
      primaryLabel: "Sign In With Password",
      primaryHref: routes.LoginRoute.to,
      secondaryLabel: "Reset Password",
      secondaryHref: routes.RequestPasswordResetRoute.to,
    };
  }

  if (
    lowered.includes("code is missing") ||
    lowered.includes("code has already been used") ||
    lowered.includes("code is invalid")
  ) {
    return {
      title: "Sign-in session expired",
      description:
        "The Google sign-in session did not return a valid callback code.",
      details:
        "This usually happens when the provider flow is retried, closed midway, or the callback is reused after it has already been consumed.",
      primaryLabel: "Try Google Again",
      primaryHref: `${config.apiUrl}/auth/google/login`,
      secondaryLabel: "Sign In With Password",
      secondaryHref: routes.LoginRoute.to,
    };
  }

  if (
    lowered.includes("unknown error occurred while trying to log in with the oauth provider") ||
    lowered.includes("unable to login with the oauth provider") ||
    lowered.includes("access_denied")
  ) {
    return {
      title: "Google sign-in was not completed",
      description:
        "The Google login flow was cancelled, denied, or interrupted before QuicReply could finish signing you in.",
      details:
        "No account changes were made. Retry Google if you meant to continue, or use email and password if you already have an account.",
      primaryLabel: "Try Google Again",
      primaryHref: `${config.apiUrl}/auth/google/login`,
      secondaryLabel: "Sign In With Password",
      secondaryHref: routes.LoginRoute.to,
    };
  }

  return {
    title: "Social login failed",
    description:
      "QuicReply could not complete the provider login request.",
    details:
      error ||
      "Retry the provider login, or use email and password while we investigate the provider callback.",
    primaryLabel: "Sign In With Password",
    primaryHref: routes.LoginRoute.to,
    secondaryLabel: "Try Google Again",
    secondaryHref: `${config.apiUrl}/auth/google/login`,
  };
}

export default function OAuthErrorPage({ error }: { error: string | null }) {
  const copy = getOAuthErrorCopy(error);

  return (
    <AuthBackdrop>
      <AuthCardLayout
        icon={<AlertCircle className="h-8 w-8" strokeWidth={2.2} />}
        title={copy.title}
        description={copy.description}
        footer={
          <AuthBackLink href={routes.LoginRoute.to}>
            Back to Login
          </AuthBackLink>
        }
      >
        <div className="space-y-4">
          <AuthMessage tone="error">{copy.details}</AuthMessage>

          <div className="space-y-[14px]">
            <AuthPrimaryButton
              type="button"
              onClick={() => window.location.assign(copy.primaryHref)}
            >
              {copy.primaryLabel}
              {copy.primaryLabel.toLowerCase().includes("google") ? (
                <RefreshCcw className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <LogIn className="h-5 w-5" strokeWidth={2.4} />
              )}
            </AuthPrimaryButton>

            <AuthSecondaryButton
              type="button"
              onClick={() => window.location.assign(copy.secondaryHref)}
            >
              {copy.secondaryLabel}
              {copy.secondaryLabel.toLowerCase().includes("reset") ? (
                <KeyRound className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <RefreshCcw className="h-5 w-5" strokeWidth={2.4} />
              )}
            </AuthSecondaryButton>
          </div>
        </div>
      </AuthCardLayout>
    </AuthBackdrop>
  );
}
