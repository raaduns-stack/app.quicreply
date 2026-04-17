import type { ReactNode } from "react";
import TextLogoDark from "../../client/static/logos/TextLogo_light.png";

export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fcfcfc] text-[#191c1d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.1)_0%,transparent_70%)] blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[35%] w-[35%] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.08)_0%,transparent_70%)] blur-[80px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        {children}
      </div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <a
      href="https://www.quicreply.io/"
      className="mb-10 inline-flex cursor-pointer justify-center"
    >
      <img src={TextLogoDark} alt="QuicReply" className="h-8 w-auto" />
    </a>
  );
}

interface AuthCardLayoutProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function AuthCardLayout({
  icon,
  title,
  description,
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="w-full max-w-[460px]">
      <div className="flex flex-col items-center">
        <AuthLogo />

        <div className="relative w-full overflow-hidden rounded-[32px] border border-[#e2e8f0] bg-white px-8 py-10 text-center shadow-[0_20px_60px_-12px_rgba(0,0,0,0.06)] sm:px-12 sm:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(254,144,29,0.08)_0px,transparent_1px)] bg-[length:100%_56px] bg-no-repeat" />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(254,144,29,0.08)] text-primary">
              {icon}
            </div>

            <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#191c1d] sm:text-[30px]">
              {title}
            </h1>
            <div className="mx-auto mt-3 max-w-[340px] text-[15px] font-medium leading-6 text-[#5f5e5e]">
              {description}
            </div>

            {children ? <div className="mt-8">{children}</div> : null}
          </div>
        </div>

        {footer ? <div className="mt-7">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#fe901d,#e8861d)] px-5 py-4 text-[15px] font-extrabold text-white shadow-[0_12px_30px_-8px_rgba(254,144,29,0.34)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_16px_36px_-8px_rgba(254,144,29,0.45)] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export function AuthSecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 text-[15px] font-bold text-[#5f5e5e] transition-all duration-200 hover:border-[#cbd5e1] hover:bg-[#f1f5f9] hover:text-[#191c1d] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

export function AuthBackLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-bold text-[#5f5e5e] transition-colors hover:text-[#191c1d]"
    >
      {children}
    </a>
  );
}

export function AuthInput({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
          {icon}
        </div>
      ) : null}
      <input
        {...props}
        className={`h-[52px] w-full rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] ${
          icon ? "pl-12" : "pl-4"
        } pr-4 text-[15px] font-semibold text-[#191c1d] outline-none transition-all duration-200 placeholder:text-[#9ca3af] focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(254,144,29,0.12)]`}
      />
    </div>
  );
}

export function AuthMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#dcfce7] bg-[#f0fdf4] text-[#166534]"
      : tone === "error"
        ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
        : "border-[#e2e8f0] bg-[#f8fafc] text-[#5f5e5e]";

  return (
    <div
      className={`rounded-[16px] border px-4 py-4 text-left text-[14px] font-medium leading-6 ${toneClass}`}
    >
      {children}
    </div>
  );
}
