import { type AuthUser } from "wasp/auth";
import UserLayout from "./layout/UserLayout";

const WhatsAppPage = ({ user }: { user: AuthUser }) => {
  return (
    <UserLayout user={user}>
      <div className="mx-auto max-w-7xl pt-8 md:pt-16 flex items-center justify-center">
        <div className="text-center p-10">
          <h1 className="text-foreground text-4xl lg:text-5xl font-[900] tracking-tight">
            WhatsApp <span className="text-primary italic">Inbox</span>
          </h1>
          <p className="text-secondary dark:text-muted-foreground mt-4 text-xl">
            This is the WhatsApp page with dummy content.
          </p>
        </div>
      </div>
    </UserLayout>
  );
};

export default WhatsAppPage;
