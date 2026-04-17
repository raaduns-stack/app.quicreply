import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  LogIn,
  MailCheck,
  RotateCcw,
} from "lucide-react";
import { routes } from "wasp/client/router";
import {
  AuthBackdrop,
  AuthBackLink,
  AuthCardLayout,
  AuthMessage,
  AuthPrimaryButton,
} from "../components/AuthCardLayout";
import { pendingVerificationEmailStorageKey } from "./constants";
import { resendVerificationEmail, verifyEmailToken } from "./actions";

export function EmailVerificationPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get("token");
  const emailFromQuery = params.get("email");

  const [email] = useState(
    emailFromQuery ||
      sessionStorage.getItem(pendingVerificationEmailStorageKey) ||
      "",
  );
  const [status, setStatus] = useState<
    "idle" | "verifying" | "verified" | "resent" | "error"
  >(token ? "verifying" : "idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (emailFromQuery) {
      sessionStorage.setItem(
        pendingVerificationEmailStorageKey,
        emailFromQuery,
      );
    }
  }, [emailFromQuery]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const runVerification = async () => {
      try {
        await verifyEmailToken({ token });
        if (!isMounted) return;
        sessionStorage.removeItem(pendingVerificationEmailStorageKey);
        setStatus("verified");
        setError("");
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setError(
          err?.message ||
            "This verification link is invalid or expired. Please request a new one.",
        );
      }
    };

    void runVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    if (!email) {
      setError(
        "We couldn't find your email. Please sign up again to get a new verification link.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      await resendVerificationEmail({ email });
      setStatus("resent");
      setInfo("A fresh verification email has been sent to your inbox.");
    } catch (err: any) {
      setStatus("error");
      setError(
        err?.message ||
          "We couldn't resend the verification email right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const icon =
    status === "verified" ? (
      <CheckCheck className="h-8 w-8" strokeWidth={2.4} />
    ) : (
      <MailCheck className="h-8 w-8" strokeWidth={2.4} />
    );

  return (
    <AuthBackdrop>
      <AuthCardLayout
        icon={icon}
        title={status === "verified" ? "Email verified" : "Verify your email"}
        description={
          status === "verified" ? (
            <>
              Your email is verified now. You can head back and log in to your
              QuicReply account.
            </>
          ) : (
            <>
              We've sent a verification link to your inbox.
              <br />
              Please click the link to activate your account.
            </>
          )
        }
        footer={
          <AuthBackLink href={routes.LoginRoute.to}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            Back to Login
          </AuthBackLink>
        }
      >
        <div className="space-y-4">
          {email ? (
            <AuthMessage>
              Verification email destination:
              <div className="mt-1 break-all font-bold text-[#191c1d]">
                {email}
              </div>
            </AuthMessage>
          ) : null}

          {info ? <AuthMessage tone="success">{info}</AuthMessage> : null}
          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

          {status === "verified" ? (
            <AuthPrimaryButton
              type="button"
              onClick={() => window.location.assign(routes.LoginRoute.to)}
            >
              Continue to Login
              <LogIn className="h-5 w-5" strokeWidth={2.4} />
            </AuthPrimaryButton>
          ) : token ? (
            status === "verifying" ? (
              <AuthMessage>Verifying your email now...</AuthMessage>
            ) : (
              <AuthPrimaryButton
                type="button"
                onClick={handleResend}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend Verification Email"}
                <RotateCcw className="h-5 w-5" strokeWidth={2.4} />
              </AuthPrimaryButton>
            )
          ) : (
            <AuthPrimaryButton
              type="button"
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend Verification Email"}
              <RotateCcw className="h-5 w-5" strokeWidth={2.4} />
            </AuthPrimaryButton>
          )}
        </div>
      </AuthCardLayout>
    </AuthBackdrop>
  );
}
