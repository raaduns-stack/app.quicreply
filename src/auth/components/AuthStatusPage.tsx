import type { ReactNode } from "react";
import { cn } from "../../client/utils";

export function AuthStatusPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fcfcfc] text-[#191c1d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.10)_0%,transparent_70%)] blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[35%] w-[35%] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.08)_0%,transparent_70%)] blur-[80px]" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        {children}
      </div>
    </div>
  );
}

interface AuthStatusCardProps {
  icon: ReactNode;
  eyebrow?: ReactNode;
  title: string;
  description: string;
  actions: ReactNode;
  footer?: ReactNode;
}

export function AuthStatusCard({
  icon,
  eyebrow,
  title,
  description,
  actions,
  footer,
}: AuthStatusCardProps) {
  return (
    <div className="w-full max-w-[440px]">
      <div className="relative overflow-hidden rounded-[32px] border border-[#e2e8f0] bg-white px-8 py-10 text-center shadow-[0_20px_60px_-12px_rgba(0,0,0,0.06)] sm:px-12 sm:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(254,144,29,0.08)_0px,transparent_1px)] bg-[length:100%_56px] bg-no-repeat" />

        <div className="relative">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[rgba(22,163,74,0.08)] text-[#16a34a] shadow-[0_10px_25px_-5px_rgba(22,163,74,0.2)]">
            {icon}
          </div>

          {eyebrow ? (
            <div className="mb-4 inline-flex items-center rounded-full border border-[rgba(254,144,29,0.18)] bg-[rgba(254,144,29,0.08)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-[30px] font-black tracking-[-0.04em] text-[#191c1d]">
            {title}
          </h1>
          <p className="mt-3 text-[15px] font-medium leading-6 text-[#5f5e5e]">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-[14px]">{actions}</div>

          {footer ? <div className="mt-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

interface AuthStatusActionLinkProps {
  to?: string;
  href?: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
}

export function AuthStatusActionLink({
  to,
  href,
  children,
  icon,
  variant = "primary",
}: AuthStatusActionLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (href) {
          window.location.assign(href);
          return;
        }
        if (to) {
          window.location.assign(to);
        }
      }}
      className={cn(
        "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-4 text-[15px] transition-all duration-200",
        variant === "primary"
          ? "bg-[linear-gradient(135deg,#fe901d,#e8861d)] font-extrabold text-white shadow-[0_12px_30px_-8px_rgba(254,144,29,0.32)] hover:-translate-y-px hover:shadow-[0_16px_36px_-8px_rgba(254,144,29,0.45)]"
          : "border border-[#e2e8f0] bg-[#f8fafc] font-bold text-[#5f5e5e] hover:border-[#cbd5e1] hover:bg-[#f1f5f9] hover:text-[#191c1d]",
      )}
    >
      <span>{children}</span>
      {icon}
    </button>
  );
}

export function AuthStatusBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-[6px] rounded-full bg-[#f8fafc] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5f5e5e] opacity-60">
      <span className="h-[6px] w-[6px] rounded-full bg-primary" />
      <span>{children}</span>
    </div>
  );
}
