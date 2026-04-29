import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const [email, ...flags] = process.argv.slice(2);
const shouldWipe = flags.includes("--wipe");

if (!email) {
  console.error(
    "Usage: npm run reset:onboarding -- <email> [--wipe]\n" +
      "Example: npm run reset:onboarding -- samplebruh001@gmail.com --wipe",
  );
  process.exit(1);
}

const defaultSettings = {
  saveNewChats: true,
  autoTag: true,
  notificationsEnabled: false,
};

try {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: email }],
    },
    select: {
      id: true,
      email: true,
      organization: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    console.error(`No user found for "${email}".`);
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: false,
        onboardingStep: 1,
      },
    });

    if (user.organization?.id) {
      await tx.organization.update({
        where: { id: user.organization.id },
        data: shouldWipe
          ? {
              flow: "sales",
              name: "",
              phoneNumber: "",
              industry: "",
              country: "",
              primaryGoal: "generate_leads",
              trafficSources: [],
              whatsappMode: "qr",
              qrConnected: false,
              apiStatus: "none",
              settings: defaultSettings,
              businessDescription: "",
              productsServices: "",
              firstAiMessage: "",
              isAiActive: true,
            }
          : {
              whatsappMode: "qr",
              qrConnected: false,
              apiStatus: "none",
              isAiActive: true,
            },
      });
    }
  });

  console.log(
    shouldWipe
      ? `Onboarding fully reset for ${user.email ?? email}.`
      : `Onboarding reopened for ${user.email ?? email}.`,
  );
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  ) {
    console.error(
      "Your database schema is behind the Prisma schema. Run `wasp db migrate-dev` first, then retry the reset command.",
    );
    process.exit(1);
  }

  throw error;
} finally {
  await prisma.$disconnect();
}
