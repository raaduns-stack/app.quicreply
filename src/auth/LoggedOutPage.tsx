import { Home, LogIn, ShieldCheck } from "lucide-react";
import { routes } from "wasp/client/router";
import {
  AuthBackdrop,
  AuthBackLink,
  AuthCardLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from "./components/AuthCardLayout";

export default function LoggedOutPage() {
  return (
    <AuthBackdrop>
      <AuthCardLayout
        icon={<ShieldCheck className="h-8 w-8" strokeWidth={2.2} />}
        title="Logged out securely"
        description="Your session has been ended. Thank you for using QuicReply to automate your revenue."
        footer={
          <AuthBackLink href={routes.LoginRoute.to}>
            Encrypted Session Terminated
          </AuthBackLink>
        }
      >
        <div className="space-y-[14px]">
          <AuthPrimaryButton
            type="button"
            onClick={() => window.location.assign(routes.LoginRoute.to)}
          >
            Login Again
            <LogIn className="h-5 w-5" strokeWidth={2.4} />
          </AuthPrimaryButton>
          <AuthSecondaryButton
            type="button"
            onClick={() => window.location.assign("https://www.quicreply.io/")}
          >
            Return to Homepage
            <Home className="h-5 w-5" strokeWidth={2.4} />
          </AuthSecondaryButton>
        </div>
      </AuthCardLayout>
    </AuthBackdrop>
  );
}
