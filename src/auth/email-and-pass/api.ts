import { randomUUID } from "node:crypto";
import { createJWT, TimeSpan, validateJWT } from "wasp/auth/jwt";
import {
  createProviderId,
  doFakeWork,
  findAuthIdentity,
  findAuthWithUserBy,
  getProviderDataWithPassword,
  updateAuthIdentityProviderData,
} from "wasp/auth/utils";
import { ensureValidEmail } from "wasp/auth/validation";
import { getVerificationEmailContent } from "./emails";
import { HttpError, config } from "wasp/server";
import { emailSender } from "wasp/server/email";
import { isEmailResendAllowed } from "wasp/server/auth/email";

const verificationClientRoute = "/email-verification";
const verificationFrom = {
  name: "QuicReply Notifications",
  email: "noreply@quicreply.io",
};

type EmailProviderDataWithNonce = ReturnType<
  typeof getProviderDataWithPassword<"email">
> & {
  emailVerificationNonce?: string | null;
};

async function createVerificationLink(email: string, nonce: string) {
  const token = await createJWT(
    { email, nonce },
    { expiresIn: new TimeSpan(30, "m") },
  );

  return `${config.frontendUrl}${verificationClientRoute}?token=${token}`;
}

export async function resendVerificationEmailApi(
  req: any,
  res: any,
  _context: any,
) {
  const args = req.body ?? {};
  ensureValidEmail(args);

  const providerId = createProviderId("email", args.email);
  const authIdentity = await findAuthIdentity(providerId);

  if (!authIdentity) {
    await doFakeWork();
    res.json({ success: true });
    return;
  }

  const providerData = getProviderDataWithPassword<"email">(
    authIdentity.providerData,
  ) as EmailProviderDataWithNonce;

  if (providerData.isEmailVerified) {
    await doFakeWork();
    res.json({ success: true });
    return;
  }

  const { isResendAllowed, timeLeft } = isEmailResendAllowed(
    providerData,
    "emailVerificationSentAt",
  );
  if (!isResendAllowed) {
    throw new HttpError(
      400,
      `Please wait ${timeLeft} secs before trying again.`,
    );
  }

  const nonce = randomUUID();
  const verificationLink = await createVerificationLink(args.email, nonce);

  await updateAuthIdentityProviderData(
    providerId,
    providerData as any,
    {
      emailVerificationNonce: nonce,
      emailVerificationSentAt: new Date().toISOString(),
    } as any,
  );

  try {
    await emailSender.send({
      from: verificationFrom,
      to: args.email,
      ...getVerificationEmailContent({ verificationLink }),
    });
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    throw new HttpError(500, "Failed to send email verification email.");
  }

  res.json({ success: true });
}

export async function verifyEmailLatestApi(req: any, res: any, _context: any) {
  const { token } = req.body ?? {};
  if (!token) {
    throw new HttpError(400, "Email verification failed, missing token");
  }

  const payload = await validateJWT<{
    email: string;
    nonce?: string;
  }>(token).catch(() => {
    throw new HttpError(400, "Email verification failed, invalid token");
  });

  const providerId = createProviderId("email", payload.email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new HttpError(400, "Email verification failed, invalid token");
  }

  const providerData = getProviderDataWithPassword<"email">(
    authIdentity.providerData,
  ) as EmailProviderDataWithNonce;

  if (providerData.isEmailVerified) {
    res.json({ success: true });
    return;
  }

  const latestNonce = providerData.emailVerificationNonce ?? null;
  if (latestNonce && payload.nonce !== latestNonce) {
    throw new HttpError(
      400,
      "This verification link has expired. Please request a new one.",
    );
  }

  if (!latestNonce && payload.nonce) {
    throw new HttpError(
      400,
      "This verification link has expired. Please request a new one.",
    );
  }

  await updateAuthIdentityProviderData(
    providerId,
    providerData as any,
    {
      isEmailVerified: true,
      emailVerificationNonce: null,
    } as any,
  );

  const auth = await findAuthWithUserBy({ id: authIdentity.authId });
  if (!auth) {
    throw new HttpError(400, "Email verification failed, invalid token");
  }

  res.json({ success: true, message: "Email verified successfully." });
}
