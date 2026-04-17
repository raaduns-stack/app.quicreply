import React, { useState } from "react";
// In Wasp ^0.22, email signup action is imported like this:
import { signup } from "wasp/client/auth";
import { config } from "wasp/client";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import TextLogoDark from "../client/static/logos/TextLogo_dark.png";
import { pendingVerificationEmailStorageKey } from "./email-and-pass/constants";
import "./SignupPage.css"; // Ensure CSS is applied

export function Signup() {
  useRedirectIfLoggedIn();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Simplified Password Strength (for display only as per requested HTML)
  const getPasswordStrength = (val: string) => {
    const len = val.length;
    let score = 0;
    if (len >= 8) score++;
    if (len >= 10 && (/[A-Z]/.test(val) || /[0-9]/.test(val))) score++;
    if (len >= 12 && /[0-9]/.test(val) && /[A-Z]/.test(val)) score++;
    if (len >= 14 && /[^A-Za-z0-9]/.test(val)) score++;
    return { len, score };
  };

  const { len, score } = getPasswordStrength(password);
  const colors = ["", "#ef4444", "#f59e0b", "#f59e0b", "#22c55e"];
  const labels = [
    "Enter a password",
    "Too weak — add more characters",
    "Could be stronger",
    "Almost strong!",
    "Strong password ✓",
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) {
      setTermsError(true);
      alert("Please agree to the Terms of Service to continue.");
      return;
    }

    setIsLoading(true);
    try {
      // Execute wasp email signup
      await signup({
        email,
        password,
        firstName,
        lastName,
        whatsapp,
        username: email, // Required by type system since it's in defineUserSignupFields
        isAdmin: false, // Required by type system since it's in defineUserSignupFields
      });
      sessionStorage.setItem(pendingVerificationEmailStorageKey, email);
      window.location.assign(
        `${routes.EmailVerificationRoute.to}?email=${encodeURIComponent(
          email,
        )}`,
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout font-sans bg-[color:var(--surface)] text-[color:var(--text)]">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ─── LEFT PANEL ─── */}
      <aside className="left-panel">
        <div className="left-content">
          <div className="left-logo">
            <img src={TextLogoDark} alt="QuicReply" />
          </div>

          <div className="left-hero">
            <h2 className="left-headline">
              Scale Sales on
              <br />
              Autopilot —<br />
              <span className="accent">Automatically</span>
            </h2>
          </div>

          <div className="phone-scene">
            <div className="phone-shell">
              <div
                style={{
                  background: "#0a0a0a",
                  padding: "8px 16px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div className="phone-notch"></div>
              </div>

              <div className="phone-chat">
                <div className="ai-pill">AI ASSISTANT</div>
                <div className="chat-msg">
                  Great! To better help you &mdash; what is your average monthly
                  incoming volume of leads?
                </div>
                <div className="chat-reply">Around 5,000 leads per month.</div>
                <div className="chat-msg">
                  Understood. Based on that volume, QuicReply can save you up to
                  40+ hours per week.
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "var(--wa-green)",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    className="status-dot"
                    style={{ width: "6px", height: "6px", boxShadow: "none" }}
                  ></span>{" "}
                  Lead Qualified &ensp;•&ensp; CRM Synced
                </div>
              </div>
            </div>

            <div className="graph-card">
              <div className="graph-label">
                Conversion Success
                <span>+142%</span>
              </div>
              <div className="graph-val">12,402</div>
              <svg className="sparkline" viewBox="0 0 100 40">
                <path d="M0,35 Q10,32 20,25 T40,15 T60,20 T80,5 T100,2" />
              </svg>
            </div>
          </div>

          <div className="status-bar">
            <span className="status-dot"></span>
            <span className="status-text">
              <strong>500+ teams</strong> scaling with QuicReply
            </span>
          </div>
        </div>
      </aside>

      {/* ─── RIGHT PANEL ─── */}
      <div className="right-panel">
        <div className="mobile-top">
          <WaspRouterLink to={routes.UserPageRoute.to}>
            <img src={TextLogoDark} alt="QuicReply" />
          </WaspRouterLink>
          <WaspRouterLink
            to={routes.LoginRoute.to}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--primary)",
              textDecoration: "none",
            }}
          >
            Sign In →
          </WaspRouterLink>
        </div>

        <div className="right-inner">
          <div className="form-container">
            <div className="form-header">
              <div className="free-trial-badge">
                <span className="ping-dot"></span>
                Free for 14 Days · No Credit Card
              </div>
              <h1>Create your account 🚀</h1>
              <p>Start automating your WhatsApp sales in minutes.</p>
            </div>

            <div className="form-card">
              <form onSubmit={handleSignup}>
                <div className="form-row" style={{ marginBottom: "18px" }}>
                  <div className="form-group">
                    <label htmlFor="firstName" className="auth-label">
                      First name
                    </label>
                    <div className="input-wrap">
                      <span className="material-symbols-outlined icon">
                        person
                      </span>
                      <input
                        type="text"
                        id="firstName"
                        className="auth-input"
                        placeholder="John"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName" className="auth-label">
                      Last name
                    </label>
                    <div className="input-wrap">
                      <span className="material-symbols-outlined icon">
                        person
                      </span>
                      <input
                        type="text"
                        id="lastName"
                        className="auth-input"
                        placeholder="Doe"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="auth-label">
                    Work email
                  </label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined icon">mail</span>
                    <input
                      type="email"
                      id="email"
                      className="auth-input"
                      placeholder="name@company.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="whatsapp" className="auth-label">
                    WhatsApp number
                  </label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined icon">
                      phone
                    </span>
                    <input
                      type="tel"
                      id="whatsapp"
                      className="auth-input"
                      placeholder="+234 700 000 0000"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="auth-label">
                    Create password
                  </label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined icon">lock</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="auth-input"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px" }}
                      >
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  <div className="pwd-strength">
                    <div className="pwd-strength-bar">
                      {[1, 2, 3, 4].map((seg, i) => (
                        <div
                          key={seg}
                          className="strength-seg"
                          style={{
                            background:
                              i < score && len > 0 ? colors[score] : "",
                          }}
                        ></div>
                      ))}
                    </div>
                    <div
                      className="pwd-strength-label"
                      style={{ color: len === 0 ? "" : colors[score] }}
                    >
                      {len === 0 ? labels[0] : labels[score]}
                    </div>
                  </div>
                </div>

                <div
                  className={`terms-check ${termsError ? "error-state" : ""}`}
                  id="terms-check-wrap"
                  style={{ marginBottom: "24px" }}
                >
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    checked={terms}
                    onChange={(e) => {
                      setTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                  />
                  <label htmlFor="terms">
                    I agree to QuicReply's <a href="#">Terms of Service</a> and{" "}
                    <a href="#">Privacy Policy</a>. I understand my data will be
                    processed securely.
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary-auth"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner"></div> Creating your account…
                    </>
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px" }}
                      >
                        rocket_launch
                      </span>{" "}
                      Start My Free Trial
                    </>
                  )}
                </button>

                <div className="divider">or</div>

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

              <div className="perks-strip">
                <div className="perk-pill">
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>{" "}
                  No credit card
                </div>
                <div className="perk-pill">
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>{" "}
                  Cancel anytime
                </div>
                <div className="perk-pill">
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>{" "}
                  Setup in 5 min
                </div>
              </div>
            </div>

            <div className="switch-link">
              Already have an account?
              <WaspRouterLink to={routes.LoginRoute.to}>
                Sign in here →
              </WaspRouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
