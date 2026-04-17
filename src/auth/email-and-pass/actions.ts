import { api, handleApiError } from "wasp/client/api";

export async function resendVerificationEmail(data: { email: string }) {
  try {
    const response = await api.post("/auth/email/resend-verification", data);
    return response.data as { success: boolean; message?: string };
  } catch (error) {
    throw handleApiError(error as any);
  }
}

export async function verifyEmailToken(data: { token: string }) {
  try {
    const response = await api.post("/auth/email/verify-email-latest", data);
    return response.data as { success: boolean; message?: string };
  } catch (error) {
    throw handleApiError(error as any);
  }
}
