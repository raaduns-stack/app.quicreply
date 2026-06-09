# Campaign n8n Contract

This document freezes the current app-side contract for Campaign launch, recipient delivery, and status sync.

## Outbound launch from QuicReply to n8n

QuicReply sends a `POST` request to `N8N_CAMPAIGN_WEBHOOK_URL` when a campaign is queued and the webhook is configured.

Headers:

- `Content-Type: application/json`
- `x-quicreply-event: campaign.launch_queued`
- `x-quicreply-webhook-secret: <N8N_CAMPAIGN_WEBHOOK_SECRET>` when configured

Payload shape:

```json
{
  "organizationId": "uuid",
  "campaignId": "uuid",
  "name": "Summer Promo 2026",
  "subtitle": "Promotional",
  "message": "Hi {{first_name}}, ...",
  "mediaUrl": "https://example.com/promo.jpg",
  "mediaType": "image",
  "useApprovedTemplate": false,
  "templateName": null,
  "templateLanguage": "en",
  "enableJenniferReplies": true,
  "campaignContext": "Land promo for DHA buyers",
  "campaignAiContext": {
    "offerSummary": "Land promo for DHA buyers with installment options.",
    "primaryGoal": "Qualify serious buyers and book a viewing.",
    "audienceNotes": "Warm real-estate leads who already asked about plots or location.",
    "faqAndObjections": "Plot sizes, location, payment plan, title documents, and whether site visits are available.",
    "allowedClaims": "Jennifer may explain the offer, mention installments if configured, and invite the lead to speak with sales for exact pricing.",
    "handoffRules": "Hand off on legal questions, negotiation, custom quotes, or angry customers."
  },
  "audienceCount": 42,
  "recipients": [
    {
      "campaignRecipientId": "uuid",
      "contactId": "uuid",
      "name": "Azam",
      "phone": "923001234567",
      "status": "queued"
    }
  ]
}
```

Notes:

- This payload is stored in `CampaignMessageEvent.rawPayload` with event type `launch_queued`.
- If webhook delivery succeeds, QuicReply also records `n8n_handoff_delivered`.
- If no webhook URL is configured, QuicReply records `launch_waiting_for_n8n_config`.
- If webhook delivery fails, QuicReply marks the campaign `failed` and records `n8n_handoff_failed`.
- `campaignContext` is a human-readable summary for downstream systems and admin inspection.
- `campaignAiContext` is the structured Jennifer reply context for campaign-specific follow-up logic.

## Per-recipient send from n8n back into QuicReply

n8n should send each queued recipient to:

`POST /webhooks/n8n/campaigns/send-recipient`

Headers:

- `Content-Type: application/json`
- `x-quicreply-webhook-secret: <N8N_CAMPAIGN_WEBHOOK_SECRET>` when configured

Payload shape:

```json
{
  "campaignId": "uuid",
  "campaignRecipientId": "uuid"
}
```

Behavior:

- QuicReply resolves the recipient, renders the final message variables, and reuses the existing Evolution WhatsApp sender.
- On success it marks the recipient `sent`, stores `providerMessageId`, and writes an outbound `WhatsAppMessageLog`.
- On failure it marks the recipient `failed` with `lastError`.
- Response shape is always JSON and is intended for n8n aggregation:

```json
{
  "ok": true,
  "skipped": false,
  "campaignRecipientId": "uuid",
  "phone": "923001234567",
  "status": "sent",
  "providerMessageId": "wamid.xxx",
  "lastError": null,
  "sentAt": "2026-06-08T10:15:00.000Z",
  "deliveredAt": null
}
```

## Inbound status update from n8n to QuicReply

n8n should send status updates to:

`POST /webhooks/n8n/campaigns/status`

Headers:

- `Content-Type: application/json`
- `x-quicreply-webhook-secret: <N8N_CAMPAIGN_WEBHOOK_SECRET>` when configured

Payload shape:

```json
{
  "campaignId": "uuid",
  "status": "sending",
  "sentCount": 10,
  "deliveredCount": 7,
  "failedCount": 1,
  "sentAt": "2026-05-24T10:15:00.000Z",
  "failureReason": null,
  "recipients": [
    {
      "campaignRecipientId": "uuid",
      "phone": "923001234567",
      "status": "delivered",
      "providerMessageId": "wamid.xxx",
      "lastError": null,
      "sentAt": "2026-05-24T10:14:50.000Z",
      "deliveredAt": "2026-05-24T10:15:12.000Z"
    }
  ]
}
```

Rules:

- `campaignId` is required.
- `status` should be one of: `draft`, `queued`, `sending`, `sent`, `failed`.
- Each recipient update can be matched by `campaignRecipientId` or by `phone`.
- QuicReply records the full callback in `CampaignMessageEvent.rawPayload` with event type `n8n_status_update`.
- If `failureReason` is present, QuicReply records an additional event `n8n_status_failure_reason`.

## Recommended round trip

1. User queues campaign in QuicReply.
2. QuicReply stores `launch_queued` event and posts payload to n8n.
3. n8n marks campaign `sending` through the status webhook.
4. n8n calls `/webhooks/n8n/campaigns/send-recipient` once per queued recipient.
5. n8n aggregates the results and sends a final status update with `sent` or `failed`.

## Current app status

- QuicReply launch queueing is implemented.
- QuicReply outbound webhook handoff is implemented.
- QuicReply per-recipient sender webhook is implemented.
- QuicReply inbound status webhook is implemented.
- A real local n8n workflow artifact exists in this repo and should replace the older simulation workflow.
