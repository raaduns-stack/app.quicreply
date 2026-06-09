import * as z from "zod";

export const whatsappEnvSchema = z.object({
  META_WHATSAPP_APP_ID: z.string().optional(),
  META_WHATSAPP_CONFIG_ID: z.string().optional(),
  META_WHATSAPP_APP_SECRET: z.string().optional(),
  META_WHATSAPP_API_VERSION: z.string().optional(),
  META_WHATSAPP_SYSTEM_USER_TOKEN: z.string().optional(),
  META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_PROVIDER: z.enum(["mock", "evolution"]).optional(),
  EVOLUTION_API_BASE_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  WHATSAPP_WEBHOOK_BASE_URL: z.string().optional(),
  WHATSAPP_INBOUND_WEBHOOK_SECRET: z.string().optional(),
  N8N_WHATSAPP_ROUTER_WEBHOOK_URL: z.string().optional(),
  N8N_WHATSAPP_ROUTER_SECRET: z.string().optional(),
  N8N_WHATSAPP_INBOUND_WEBHOOK_URL: z.string().optional(),
  N8N_WHATSAPP_REPLY_SECRET: z.string().optional(),
  N8N_AI_TEST_WEBHOOK_URL: z.string().optional(),
  N8N_AI_TEST_WEBHOOK_SECRET: z.string().optional(),
  N8N_CAMPAIGN_WEBHOOK_URL: z.string().optional(),
  N8N_CAMPAIGN_WEBHOOK_SECRET: z.string().optional(),
});
