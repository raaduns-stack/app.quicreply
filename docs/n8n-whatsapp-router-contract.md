# QuicReply n8n WhatsApp Router Contract

This is the contract for inbound WhatsApp messages sent from QuicReply to n8n.

## Flow

1. Evolution API sends a WhatsApp event to QuicReply.
2. QuicReply validates the Evolution webhook secret.
3. QuicReply stores the message log.
4. QuicReply upserts the contact.
5. If Jennifer is active for the organization and contact, QuicReply forwards a normalized payload to n8n.
6. n8n routes the payload to the free or paid AI workflow.
7. n8n sends the final reply back to QuicReply using `/webhooks/n8n/whatsapp/reply`.

## Env Vars

```env
N8N_WHATSAPP_ROUTER_WEBHOOK_URL=
N8N_WHATSAPP_ROUTER_SECRET=
N8N_WHATSAPP_REPLY_SECRET=
WHATSAPP_WEBHOOK_BASE_URL=https://app.quicreply.io
```

`N8N_WHATSAPP_ROUTER_WEBHOOK_URL` is preferred.

`N8N_WHATSAPP_INBOUND_WEBHOOK_URL` still works as a fallback for the older direct inbound workflow.

`N8N_WHATSAPP_ROUTER_SECRET` is optional. If set, QuicReply sends it to n8n in this header:

```txt
x-quicreply-webhook-secret: <secret>
```

n8n should reject requests when the header does not match.

## Router Request

QuicReply sends this to n8n:

```json
{
  "event": "whatsapp.inbound_message",
  "version": "2026-05-22",
  "source": "quicreply",
  "tenantId": "org_uuid",
  "organizationId": "org_uuid",
  "contactId": "contact_uuid",
  "phone": "2348012345678",
  "receivedAt": "2026-05-22T10:00:00.000Z",
  "message": {
    "id": "EVOLUTION_MESSAGE_ID",
    "text": "Hi, I need more details",
    "type": "conversation",
    "direction": "inbound",
    "occurredAt": "2026-05-22T10:00:00.000Z",
    "providerEvent": "messages.upsert"
  },
  "contact": {
    "id": "contact_uuid",
    "name": "Customer Name",
    "phone": "2348012345678",
    "email": null,
    "source": "WhatsApp",
    "status": "ai-active",
    "tags": ["Interested"],
    "assignedTo": "Jennifer",
    "isAiActive": true,
    "lastMessage": "Hi, I need more details",
    "lastMessageAt": "2026-05-22T10:00:00.000Z",
    "unreadCount": 1
  },
  "organization": {
    "id": "org_uuid",
    "name": "Business Name",
    "phoneNumber": "+2348012345678",
    "industry": "Real Estate",
    "country": "Nigeria",
    "flow": "sales",
    "isAiActive": true,
    "whatsappMode": "qr",
    "apiStatus": "none",
    "plan": {
      "id": "starter",
      "status": null,
      "tier": "free"
    }
  },
  "businessContext": {
    "businessDescription": "What the business does",
    "productsServices": "Products, services, offers, policies",
    "firstAiMessage": "Opening message or default tone",
    "responseStyle": "professional",
    "aiLanguage": "English"
  },
  "routing": {
    "tier": "free",
    "workflow": "free-customer-ai-flow",
    "reason": "no_active_subscription"
  },
  "whatsapp": {
    "provider": "evolution",
    "mode": "qr",
    "instanceName": "quicreply-org-instance",
    "instanceId": "evolution-instance-id",
    "contactJid": "2348012345678@s.whatsapp.net",
    "pushName": "Customer Name"
  },
  "callback": {
    "replyUrl": "https://app.quicreply.io/webhooks/n8n/whatsapp/reply",
    "secretHeader": "x-n8n-webhook-secret"
  },
  "debug": {
    "rawProviderPayload": {}
  }
}
```

## Routing Rules

n8n should use `routing.tier`.

`free` goes to the lightweight free workflow.

`paid` goes to the full paid workflow with memory, RAG, history, and richer orchestration.

QuicReply currently marks paid only when the user has an active non-free subscription plan. Unknown or inactive plans route to `free`.

## Reply Request

n8n should send the final reply to:

```txt
POST /webhooks/n8n/whatsapp/reply
```

Required header when `N8N_WHATSAPP_REPLY_SECRET` is configured:

```txt
x-n8n-webhook-secret: <secret>
```

Body:

```json
{
  "organizationId": "org_uuid",
  "contactId": "contact_uuid",
  "to": "2348012345678",
  "message": "Thanks for reaching out. Here are the details..."
}
```

QuicReply also accepts `phoneNumber` or `number` instead of `to`, and `text` or `body` instead of `message`.

## Failure Behavior

If n8n fails or times out, QuicReply still keeps the inbound message and contact. The webhook returns `202` to Evolution with:

```json
{
  "ok": true,
  "forwarded": false,
  "reason": "n8n_forward_failed"
}
```

This prevents AI workflow failures from blocking message capture.
