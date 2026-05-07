import * as z from "zod";

export const whatsappEnvSchema = z.object({
  WHATSAPP_PROVIDER: z.enum(["mock", "evolution"]).default("mock"),
  EVOLUTION_API_BASE_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  WHATSAPP_INBOUND_WEBHOOK_SECRET: z.string().optional(),
  N8N_WHATSAPP_INBOUND_WEBHOOK_URL: z.string().optional(),
  N8N_WHATSAPP_REPLY_SECRET: z.string().optional(),
});
