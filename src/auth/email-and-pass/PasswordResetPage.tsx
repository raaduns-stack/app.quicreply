import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { resetPassword } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import {
  AuthBackdrop,
  AuthBackLink,
  AuthCardLayout,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
} from "../components/AuthCardLayout";

export function PasswordResetPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError(
        "This reset link is missing a token. Please request a fresh password reset email.",
      );
      return;
    }

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword({ token, password });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "This reset link is invalid or expired. Please request a new one.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop>
      <AuthCardLayout
        icon={
          submitted ? (
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.4} />
          ) : (
            <LockKeyhole className="h-8 w-8" strokeWidth={2.4} />
          )
        }
        title={submitted ? "Password updated" : "Create new password"}
        description={
          submitted
            ? "Your password has been updated successfully. You can log in with your new password now."
            : "Almost there. Enter a secure new password for your account below."
        }
        footer={
          <AuthBackLink href={routes.LoginRoute.to}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            Back to Login
          </AuthBackLink>
        }
      >
        {submitted ? (
          <AuthPrimaryButton
            type="button"
            onClick={() => window.location.assign(routes.LoginRoute.to)}
          >
            Back to Login
          </AuthPrimaryButton>
        ) : (
          <form className="space-y-4 text-left" onSubmit={handleSubmit}>
            {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

            {!token ? (
              <AuthMessage tone="error">
                This reset link is missing or invalid. Request a new password
                reset email to continue.
              </AuthMessage>
            ) : null}

            <div>
              <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#5f5e5e]">
                New password
              </label>
              <AuthInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                icon={<KeyRound className="h-5 w-5" strokeWidth={2.2} />}
              />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#5f5e5e]">
                Confirm password
              </label>
              <AuthInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                icon={<KeyRound className="h-5 w-5" strokeWidth={2.2} />}
              />
            </div>

            <AuthPrimaryButton type="submit" disabled={loading || !token}>
              {loading ? "Updating..." : "Update Password"}
            </AuthPrimaryButton>
          </form>
        )}
      </AuthCardLayout>
    </AuthBackdrop>
  );
}
