import React, { useState } from "react";
// We import login from Wasp
import { login } from "wasp/client/auth";
import { config } from "wasp/client";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import TextLogoDark from "../client/static/logos/TextLogo_dark.png";
import "./SignupPage.css"; // Reuse the great CSS from the Signup page!

export default function Login() {
  useRedirectIfLoggedIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await login({
        email,
        password,
      });
      window.location.assign(routes.UserPageRoute.to);
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout font-sans bg-[color:var(--surface)] text-[color:var(--text)]">
      {/* Required for the Material UI icons */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* Clean Error Message */}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg font-medium text-sm max-w-sm">
            <span className="material-symbols-outlined text-red-500">
              error
            </span>
            <span className="flex-1">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── LEFT PANEL ─── */}
      <aside className="left-panel">
        <div className="left-content">
          <div className="left-logo">
            <img
              src={TextLogoDark}
              alt="QuicReply"
              style={{ height: "30px" }}
            />
          </div>

          <div className="left-hero">
            <h2 className="left-headline">
              Turn Leads into
              <br />
              Revenue —<br />
              <span className="accent">Automatically</span>
            </h2>
          </div>

          {/* ── PHONE MOCKUP SCENE ── */}
          <div className="phone-scene">
            <div className="phone-shell">
              <div
                style={{
                  background: "#0a0a0a",
                  padding: "10px 16px 6px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div className="phone-notch"></div>
              </div>

              <div className="phone-chat" style={{ minHeight: "340px" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.06,
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23fff'/%3E%3C/svg%3E\")",
                    backgroundSize: "20px 20px",
                  }}
                ></div>

                {/* Chat bar */}
                <div
                  style={{
                    background: "#1f2c34",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #25D366, #128C7E)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e9edef",
                      }}
                    >
                      New Prospect
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#25D366",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#25D366",
                          display: "inline-block",
                        }}
                      ></span>
                      AI responding…
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      background: "#202c33",
                      color: "#e9edef",
                      alignSelf: "flex-start",
                      borderBottomLeftRadius: "3px",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 500,
                      lineHeight: 1.4,
                      maxWidth: "80%",
                    }}
                  >
                    Hi, I'm interested in your pricing plans. Can you help? 🙌
                  </div>
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary), var(--primary-v))",
                      color: "#fff",
                      alignSelf: "flex-end",
                      borderBottomRightRadius: "3px",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 500,
                      lineHeight: 1.4,
                      maxWidth: "80%",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        background: "rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "7px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "1px 5px",
                        borderRadius: "20px",
                        marginBottom: "3px",
                      }}
                    >
                      AUTO
                    </div>
                    <br />
                    Hey! 👋 Our Starter plan starts at ₦29k/mo. Should I send
                    you a full breakdown?
                  </div>
                </div>
              </div>
            </div>

            {/* Floating active sales card */}
            <div
              className="graph-card"
              style={{
                top: "16px",
                bottom: "auto",
                right: "-20px",
                width: "150px",
              }}
            >
              <div className="graph-label">
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      display: "inline-block",
                    }}
                  ></span>
                  Active Sales
                </span>
              </div>
              <div className="graph-val" style={{ fontSize: "20px" }}>
                $4,820.00
              </div>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "11px" }}
                >
                  arrow_upward
                </span>{" "}
                +16.2%
              </div>
            </div>
          </div>

          <div className="status-bar" style={{ marginTop: "auto" }}>
            <span className="status-dot"></span>
            <span className="status-text">
              <strong>1,402 leads</strong> auto-replied today
            </span>
          </div>
        </div>
      </aside>

      {/* ─── RIGHT PANEL ─── */}
      <div className="right-panel">
        <div className="mobile-top">
          <WaspRouterLink to={routes.UserPageRoute.to}>
            <img
              src={TextLogoDark}
              alt="QuicReply"
              style={{ height: "24px" }}
            />
          </WaspRouterLink>
          <WaspRouterLink
            to={routes.SignupRoute.to}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--primary)",
              textDecoration: "none",
            }}
          >
            Create Account →
          </WaspRouterLink>
        </div>

        <div className="right-inner">
          <div className="form-container" style={{ maxWidth: "420px" }}>
            <div className="form-header">
              <div
                className="free-trial-badge"
                style={{
                  color: "var(--primary)",
                  background: "rgba(254, 144, 29, 0.08)",
                  borderColor: "rgba(254, 144, 29, 0.18)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "13px" }}
                >
                  lock
                </span>{" "}
                Secure Login
              </div>
              <h1>Welcome back 👋</h1>
              <p>
                Sign in to your QuicReply dashboard and pick up where you left
                off.
              </p>
            </div>

            <div className="form-card">
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="auth-label" htmlFor="email">
                    Email address
                  </label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined icon">mail</span>
                    <input
                      type="email"
                      id="email"
                      className="auth-input"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="auth-label" htmlFor="password">
                    Password
                  </label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined icon">lock</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="auth-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                      tabIndex={-1}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px" }}
                      >
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "26px",
                    padding: "12px 14px",
                    background: "#f9fafb",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      cursor: "pointer",
                      marginBottom: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--primary)",
                        cursor: "pointer",
                        borderRadius: "4px",
                      }}
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />{" "}
                    Remember me
                  </label>
                  <WaspRouterLink
                    to={routes.RequestPasswordResetRoute.to}
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      textDecoration: "none",
                    }}
                  >
                    Forgot password?
                  </WaspRouterLink>
                </div>

                <button
                  type="submit"
                  className="btn-primary-auth"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="btn-spinner" /> Signing in…
                    </>
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "19px" }}
                      >
                        login
                      </span>
                      Sign In to Dashboard
                    </>
                  )}
                </button>

                <div
                  className="divider"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    color: "var(--muted)",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "18px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "var(--border)",
                    }}
                  ></span>
                  or
                  <span
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "var(--border)",
                    }}
                  ></span>
                </div>

                <a
                  href={`${config.apiUrl}/auth/google/login`}
                  className="btn-google"
                  style={{
                    width: "100%",
                    height: "50px",
                    background: "#fff",
                    border: "1.5px solid var(--border)",
                    borderRadius: "14px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--text)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    transition: "transform 0.14s, box-shadow 0.2s",
                    textDecoration: "none",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Continue with Google
                </a>
              </form>
            </div>

            <div className="switch-link">
              Don't have an account?
              <WaspRouterLink to={routes.SignupRoute.to}>
                Start Free Trial →
              </WaspRouterLink>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  padding: "0 14px",
                  borderRight: "1px solid var(--border)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", color: "#25D366" }}
                >
                  verified_user
                </span>{" "}
                SSL Secured
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  padding: "0 14px",
                  borderRight: "1px solid var(--border)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", color: "#25D366" }}
                >
                  lock
                </span>{" "}
                Data Encrypted
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  padding: "0 14px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", color: "#25D366" }}
                >
                  support_agent
                </span>{" "}
                24/7 Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
