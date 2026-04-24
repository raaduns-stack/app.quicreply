import * as z from "zod";

export const whatsappEnvSchema = z.object({
  N8N_WHATSAPP_QR_START_URL: z.string().default(""),
  N8N_WHATSAPP_QR_STATUS_URL: z.string().default(""),
  N8N_WHATSAPP_AUTH_HEADER_NAME: z.string().default(""),
  N8N_WHATSAPP_AUTH_HEADER_VALUE: z.string().default(""),
});
