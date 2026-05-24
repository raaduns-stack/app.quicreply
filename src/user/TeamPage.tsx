import { Users } from "lucide-react";
import { type AuthUser } from "wasp/auth";
import UserLayout from "./layout/UserLayout";

export default function TeamPage({ user }: { user: AuthUser }) {
  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Team management is not wired into the product yet.
          </p>
        </div>

        <section className="rounded-3xl border border-[#e8e2d8] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="rounded-2xl bg-[#fff3e1] p-4 text-[#c96a00] dark:bg-[rgba(254,144,29,0.14)] dark:text-[#ffb84d]">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#182235] dark:text-white">
              Team workspace coming next
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This route is reserved for real team seats, roles, invites, and
              performance reporting. The previous mock roster has been removed
              so the app only shows features backed by actual product behavior.
            </p>
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
