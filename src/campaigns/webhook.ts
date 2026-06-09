import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";
import { sendOrganizationWhatsAppTextMessage } from "../whatsapp/transport";

const campaignStatuses = ["draft", "queued", "sending", "sent", "failed"] as const;

const campaignRecipientUpdateSchema = z.object({
  campaignRecipientId: z.string().uuid().optional(),
  phone: z.string().trim().min(4).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  providerMessageId: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .nullable(),
  lastError: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .nullable(),
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
  failureReason: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .nullable(),
});

const campaignRecipientSendWebhookSchema = z.object({
  campaignId: z.string().uuid(),
  campaignRecipientId: z.string().uuid(),
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

function getFirstName(name: string | null | undefined) {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || "there";
}

function buildLastAction(input: {
  lastMessage: string | null;
  stageName?: string | null;
}) {
  const lastMessage = input.lastMessage?.trim();
  if (lastMessage) {
    return lastMessage;
  }

  if (input.stageName?.trim()) {
    return `currently in ${input.stageName}`;
  }

  return "your recent inquiry";
}

function renderCampaignMessage(
  message: string,
  variables: {
    firstName: string;
    lastAction: string;
  },
) {
  return message
    .replace(/\{\{\s*first_name\s*\}\}/gi, variables.firstName)
    .replace(/\{\{\s*last_action\s*\}\}/gi, variables.lastAction);
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
          providerMessageId:
            recipient.providerMessageId === ""
              ? null
              : recipient.providerMessageId ?? undefined,
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

export async function n8nCampaignSendRecipientWebhook(
  req: any,
  res: any,
  _context: any,
) {
  validateCampaignWebhookSecret(req);

  const parsed = campaignRecipientSendWebhookSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new HttpError(400, "Invalid campaign recipient send payload.");
  }

  const payload = parsed.data;
  const recipient = await prisma.campaignRecipient.findFirst({
    where: {
      id: payload.campaignRecipientId,
      campaignId: payload.campaignId,
    },
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      phone: true,
      name: true,
      status: true,
      campaign: {
        select: {
          id: true,
          organizationId: true,
          status: true,
          message: true,
          name: true,
        },
      },
    },
  });

  if (!recipient) {
    throw new HttpError(404, "Campaign recipient not found.");
  }

  if (
    recipient.campaign.status !== "queued" &&
    recipient.campaign.status !== "sending"
  ) {
    throw new HttpError(
      400,
      "Campaign recipient send is only allowed for queued or sending campaigns.",
    );
  }

  if (recipient.status === "sent" || recipient.status === "delivered") {
    return res.json({
      ok: true,
      skipped: true,
      campaignRecipientId: recipient.id,
      phone: recipient.phone,
      status: recipient.status,
      providerMessageId: null,
      lastError: null,
      sentAt: null,
      deliveredAt: null,
    });
  }

  const organization = await prisma.organization.findFirst({
    where: { id: recipient.campaign.organizationId },
    select: {
      id: true,
      apiStatus: true,
      qrConnected: true,
      qrStatus: true,
      qrSessionId: true,
      evolutionInstanceName: true,
      settings: true,
    },
  });

  if (!organization) {
    throw new HttpError(404, "Campaign organization not found.");
  }

  const [contact, latestDeal] = await Promise.all([
    recipient.contactId
      ? prisma.contact.findFirst({
          where: {
            id: recipient.contactId,
            organizationId: organization.id,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            lastMessage: true,
          },
        })
      : Promise.resolve(null),
    recipient.contactId
      ? prisma.deal.findFirst({
          where: {
            organizationId: organization.id,
            contactId: recipient.contactId,
          },
          orderBy: [{ updatedAt: "desc" }],
          select: {
            stage: {
              select: {
                name: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const renderedMessage = renderCampaignMessage(recipient.campaign.message, {
    firstName: getFirstName(contact?.name ?? recipient.name),
    lastAction: buildLastAction({
      lastMessage: contact?.lastMessage ?? null,
      stageName: latestDeal?.stage.name ?? null,
    }),
  });

  try {
    const send = await sendOrganizationWhatsAppTextMessage({
      organization,
      phoneNumber: recipient.phone,
      message: renderedMessage,
    });

    const sentAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          providerMessageId: send.result.providerMessageId,
          lastError: null,
          sentAt,
        },
      });

      await tx.whatsAppMessageLog.create({
        data: {
          organizationId: organization.id,
          instanceName: send.instanceName,
          direction: "outbound",
          to: recipient.phone,
          messageType: "conversation",
          text: renderedMessage,
          status: send.result.status ?? "SENT",
          source: "campaign",
          providerEvent: "campaign_message",
          providerMessageId: send.result.providerMessageId,
          rawPayload: {
            campaignId: recipient.campaign.id,
            campaignRecipientId: recipient.id,
            provider: send.provider,
            phoneNumberId: send.phoneNumberId,
            providerResponse: send.result.rawResponse,
          } as any,
        },
      });

      await tx.campaignMessageEvent.create({
        data: {
          campaignId: recipient.campaign.id,
          eventType: "campaign_recipient_sent",
          rawPayload: {
            campaignRecipientId: recipient.id,
            phone: recipient.phone,
            providerMessageId: send.result.providerMessageId,
            status: send.result.status ?? "SENT",
          },
        },
      });
    });

    return res.json({
      ok: true,
      skipped: false,
      campaignRecipientId: recipient.id,
      phone: recipient.phone,
      status: "sent",
      providerMessageId: send.result.providerMessageId,
      lastError: null,
      sentAt: sentAt.toISOString(),
      deliveredAt: null,
    });
  } catch (error) {
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not send campaign message.";

    await prisma.$transaction(async (tx) => {
      await tx.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "failed",
          lastError: message,
        },
      });

      await tx.campaignMessageEvent.create({
        data: {
          campaignId: recipient.campaign.id,
          eventType: "campaign_recipient_failed",
          rawPayload: {
            campaignRecipientId: recipient.id,
            phone: recipient.phone,
            message,
          },
        },
      });
    });

    return res.json({
      ok: false,
      skipped: false,
      campaignRecipientId: recipient.id,
      phone: recipient.phone,
      status: "failed",
      providerMessageId: null,
      lastError: message,
      sentAt: null,
      deliveredAt: null,
    });
  }
}
