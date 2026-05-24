import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";

const campaignStatuses = ["draft", "queued", "sending", "sent", "failed"] as const;

const campaignRecipientUpdateSchema = z.object({
  campaignRecipientId: z.string().uuid().optional(),
  phone: z.string().trim().min(4).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  providerMessageId: z.string().trim().max(255).optional().or(z.literal("")),
  lastError: z.string().trim().max(1000).optional().or(z.literal("")),
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
});

const campaignStatusWebhookSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(campaignStatuses).optional(),
  sentCount: z.number().int().min(0).optional(),
  deliveredCount: z.number().int().min(0).optional(),
  failedCount: z.number().int().min(0).optional(),
  sentAt: z.string().datetime().optional(),
  recipients: z.array(campaignRecipientUpdateSchema).default([]),
  failureReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

function getHeaderValue(req: any, headerName: string) {
  if (typeof req.get === "function") {
    return req.get(headerName);
  }

  const value = req.headers?.[headerName.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function validateCampaignWebhookSecret(req: any) {
  const expectedSecret = env.N8N_CAMPAIGN_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return;
  }

  const providedSecret =
    getHeaderValue(req, "x-quicreply-webhook-secret") ??
    getHeaderValue(req, "x-n8n-webhook-secret") ??
    req.query?.secret;

  if (providedSecret !== expectedSecret) {
    throw new HttpError(401, "Invalid n8n campaign webhook secret.");
  }
}

export async function n8nCampaignStatusWebhook(
  req: any,
  res: any,
  _context: any,
) {
  validateCampaignWebhookSecret(req);

  const parsed = campaignStatusWebhookSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new HttpError(400, "Invalid campaign status webhook payload.");
  }

  const payload = parsed.data;
  const campaign = await prisma.campaign.findUnique({
    where: { id: payload.campaignId },
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found.");
  }

  await prisma.$transaction(async (tx) => {
    for (const recipient of payload.recipients) {
      const where = recipient.campaignRecipientId
        ? { id: recipient.campaignRecipientId }
        : recipient.phone
          ? {
              campaignId_phone: {
                campaignId: campaign.id,
                phone: recipient.phone,
              },
            }
          : null;

      if (!where) {
        continue;
      }

      await tx.campaignRecipient.update({
        where,
        data: {
          status: recipient.status ?? undefined,
          providerMessageId: recipient.providerMessageId || undefined,
          lastError:
            recipient.lastError === ""
              ? null
              : recipient.lastError ?? undefined,
          sentAt: recipient.sentAt ? new Date(recipient.sentAt) : undefined,
          deliveredAt: recipient.deliveredAt
            ? new Date(recipient.deliveredAt)
            : undefined,
        },
      });
    }

    await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        status: payload.status ?? undefined,
        sentCount: payload.sentCount ?? undefined,
        deliveredCount: payload.deliveredCount ?? undefined,
        failedCount: payload.failedCount ?? undefined,
        sentAt: payload.sentAt ? new Date(payload.sentAt) : undefined,
      },
    });

    await tx.campaignMessageEvent.create({
      data: {
        campaignId: campaign.id,
        eventType: "n8n_status_update",
        rawPayload: req.body ?? payload,
      },
    });

    if (payload.failureReason?.trim()) {
      await tx.campaignMessageEvent.create({
        data: {
          campaignId: campaign.id,
          eventType: "n8n_status_failure_reason",
          rawPayload: {
            failureReason: payload.failureReason,
          },
        },
      });
    }
  });

  res.json({ ok: true, updated: true });
}
