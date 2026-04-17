import React, { useState } from "react";
import { ArrowLeft, Mail, Send, ShieldQuestion } from "lucide-react";
import { requestPasswordReset } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import {
  AuthBackdrop,
  AuthBackLink,
  AuthCardLayout,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
} from "../components/AuthCardLayout";

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset({ email });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "We couldn't send the reset link right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop>
      <AuthCardLayout
        icon={<ShieldQuestion className="h-8 w-8" strokeWidth={2.4} />}
        title="Forgot password?"
        description="Enter your email and we'll send you a link to reset your password."
        footer={
          <AuthBackLink href={routes.LoginRoute.to}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
            Back to Login
          </AuthBackLink>
        }
      >
        <form className="space-y-4 text-left" onSubmit={handleSubmit}>
          {submitted ? (
            <AuthMessage tone="success">
              If an account exists for <strong>{email}</strong>, a password
              reset link is on its way. Check your inbox and spam folder.
            </AuthMessage>
          ) : (
            <>
              {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#5f5e5e]">
                  Email address
                </label>
                <AuthInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  icon={<Mail className="h-5 w-5" strokeWidth={2.2} />}
                />
              </div>
              <AuthPrimaryButton type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
                <Send className="h-5 w-5" strokeWidth={2.4} />
              </AuthPrimaryButton>
            </>
          )}
        </form>
      </AuthCardLayout>
    </AuthBackdrop>
  );
}
