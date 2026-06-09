# n8n AI Test Contract

This contract powers `/ai/test`.

Its job is narrow:

- QuicReply app sends a sandbox test payload to n8n.
- n8n validates and reshapes that payload.
- n8n calls OpenClaw.
- OpenClaw returns a Jennifer-style reply.
- n8n maps that reply back to QuicReply.

This path is only for testing Jennifer's response runtime from saved workspace context.

It must not send WhatsApp messages, create contacts, update inbox threads, or mutate production conversation state.

## Required App Env

Set these on the QuicReply backend environment:

```bash
N8N_AI_TEST_WEBHOOK_URL=https://your-n8n-host/webhook/quicreply-ai-test
```

Optional shared secret:

```bash
N8N_AI_TEST_WEBHOOK_SECRET=replace_me
```

If `N8N_AI_TEST_WEBHOOK_URL` is missing, the app returns:

```json
{
  "message": "AI sandbox runtime is not configured."
}
```

## Runtime Modes

There are two layers in this flow:

1. `QuicReply -> n8n`
2. `n8n -> OpenClaw`

For local Jennifer testing, the working OpenClaw target is:

- base URL: `http://127.0.0.1:18789`
- auth header: `Authorization: Bearer qr-local-openclaw-token-20260607`
- model id: `openclaw/ai-test`

Important:

- `openclaw/ai-test` is a dedicated Jennifer agent for local testing.
- It intentionally avoids the heavier default OpenClaw agent stack.
- It can be backed by either local Ollama or OpenAI, while keeping the same QuicReply and n8n contract.

## Request

QuicReply backend sends a `POST` request to `N8N_AI_TEST_WEBHOOK_URL`.

Headers:

```http
Content-Type: application/json
x-quicreply-event: ai.test
x-quicreply-webhook-secret: <N8N_AI_TEST_WEBHOOK_SECRET, if configured>
```

Body:

```json
{
  "event": "ai.test",
  "version": "2026-05-24",
  "source": "quicreply",
  "organizationId": "org_uuid",
  "userId": "user_uuid",
  "prompt": "What is the price?",
  "conversationHistory": [
    {
      "role": "user",
      "text": "Hi"
    }
  ],
  "businessContext": {
    "businessDescription": "Short description of the business.",
    "productsServices": "Products, services, pricing, delivery info, and policies.",
    "firstAiMessage": "Default Jennifer opening message.",
    "responseStyle": "professional",
    "aiLanguage": "english"
  },
  "contextQuality": {
    "isReady": true,
    "missingFields": [],
    "weakFields": []
  },
  "organization": {
    "name": "QuicReply",
    "phoneNumber": "+234...",
    "industry": "Real Estate",
    "country": "Nigeria",
    "isAiActive": true,
    "whatsappMode": "qr",
    "apiStatus": "not_setup"
  },
  "staff": {
    "firstName": "Azam",
    "lastName": "",
    "displayName": "Azam"
  },
  "aiKnowledge": {
    "pricingAndPlans": "Starter is $99/mo, Professional is $499/mo, Enterprise is custom.",
    "seatsAndLimits": "Starter includes 3 seats, Professional includes 10 seats, Enterprise is positioned as unlimited seats.",
    "coreFeatures": "Shared inbox, WhatsApp replies, lead routing, pipeline tracking, campaigns, Jennifer AI.",
    "productPages": "Dashboard shows overview, Inbox handles live conversations, Pipeline tracks deals, Billing shows plans and invoices.",
    "policiesAndFaqs": "Never invent pricing, guarantees, screenshots, or fake sent-message confirmations."
  },
  "sandbox": {
    "channel": "ai-test-page",
    "testMode": true
  }
}
```

Field notes:

- `contextQuality.isReady` must already be `true` before n8n calls OpenClaw.
- `businessContext.businessDescription` and `businessContext.productsServices` are the minimum meaningful context fields.
- `conversationHistory` is sandbox-only chat history from `/ai/test`, not live WhatsApp history.
- QuicReply trims sandbox history to the most recent `20` messages before sending it onward.
- `staff.displayName` lets Jennifer know the saved workspace owner/admin name when that is relevant.
- `aiKnowledge` is the structured product knowledge layer for plans, limits, features, pages, and FAQ rules.

## Response

n8n must return JSON.

Required:

```json
{
  "message": "Here is Jennifer's response..."
}
```

Optional:

```json
{
  "message": "Here is Jennifer's response...",
  "confidence": 0.86,
  "model": "runtime-model-name",
  "route": "sandbox",
  "warnings": []
}
```

Rules:

- `message` must be a non-empty string.
- `confidence`, if returned, must be a number from `0` to `1`.
- `warnings`, if returned, must be an array of strings.

## n8n -> OpenClaw Request

n8n should call OpenClaw with a minimal, explicit prompt.

Recommended local request:

```http
POST /v1/responses
Authorization: Bearer qr-local-openclaw-token-20260607
Content-Type: application/json
```

Body:

```json
{
  "model": "openclaw/ai-test",
  "input": "Business: QuicReply helps businesses automate WhatsApp follow-up, lead routing, and customer replies.\nProducts/services: WhatsApp automation setup, smart lead routing, AI-assisted support replies.\nOrganization: QuicReply.\nResponse style: professional.\nLanguage: english.\nConversation history:\nuser: Hi\nassistant: Hello\nCustomer message: What exactly do you do and can this work for my small team?\nReply in 2-5 sentences."
}
```

Recommended prompt-building rules inside n8n:

- Flatten the QuicReply payload into a single plain-text business prompt.
- Keep the prompt compact.
- Include only the most recent useful conversation history.
- Include structured product knowledge from `aiKnowledge`.
- Do not send internal labels like `sandbox`, `test bot`, `mock`, `database`, or implementation notes to OpenClaw as user-visible framing.
- Tell Jennifer explicitly that this route is draft-only.
- Jennifer must never claim she sent a message, attached proof, generated a screenshot, completed a handoff, or performed any live action.
- Ask for a plain final answer only.

## OpenAI-backed local runtime

If local OpenClaw is switched from Ollama to OpenAI, keep the same gateway and same `openclaw/ai-test` model id.

Recommended OpenClaw agent model:

- `openai/gpt-4.1-mini`

The provider change happens inside OpenClaw only. QuicReply and n8n do not need a contract change for that switch.

Recommended prompt template:

```text
You are Jennifer, the QuicReply AI assistant.
This is a test sandbox only.
Never claim that you sent a message, completed a handoff, attached proof, generated a screenshot, updated a CRM, or performed any live action.
If the user asks you to send, prove, confirm delivery, or show evidence, clearly say this sandbox can only draft the reply and cannot perform the action.
Do not invent pricing, guarantees, or product capabilities that are not provided below.
Workspace owner reference: {{staff.displayName}}
Business: {{businessDescription}}
Products/services: {{productsServices}}
Pricing and plans: {{aiKnowledge.pricingAndPlans}}
Seats, usage, and limits: {{aiKnowledge.seatsAndLimits}}
Core features: {{aiKnowledge.coreFeatures}}
Product pages: {{aiKnowledge.productPages}}
Policies and FAQs: {{aiKnowledge.policiesAndFaqs}}
Organization: {{organization.name}}
Response style: {{businessContext.responseStyle}}
Language: {{businessContext.aiLanguage}}
Conversation history:
{{flattenedConversationHistory}}
Customer message: {{prompt}}
Reply in 2-5 sentences.
Return plain answer text only.
```

## OpenClaw -> n8n Response

Working local OpenClaw replies look like:

```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "model": "openclaw/ai-test",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "QuicReply automates your WhatsApp follow-ups, routes leads efficiently, and provides AI-powered customer responses. Yes, it works great for small teams like yours! Would be happy to set up a quick demo."
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 211,
    "output_tokens": 43,
    "total_tokens": 254
  }
}
```

n8n should extract:

- `output[0].content[0].text` -> `message`
- `model` -> optional `model`

Optional local mapping:

```json
{
  "message": "QuicReply automates your WhatsApp follow-ups, routes leads efficiently, and provides AI-powered customer responses. Yes, it works great for small teams like yours! Would be happy to set up a quick demo.",
  "model": "openclaw/ai-test",
  "route": "openclaw.ai-test",
  "warnings": []
}
```

## n8n Response Mapping Rules

n8n must normalize OpenClaw output before returning to QuicReply:

1. If OpenClaw returns a completed assistant message, use that text as `message`.
2. Trim leading/trailing whitespace.
3. Do not pass through tool syntax, XML, JSON fragments, markdown code fences, or internal runtime text.
4. If the extracted text claims a live action was taken in the sandbox, replace it with a safe draft-only fallback and add a warning such as `sandbox_claim_blocked`.
5. If the extracted text is empty, treat it as a runtime failure.
6. Do not invent confidence unless you have a real scoring rule.

## Error Behavior

QuicReply maps n8n/runtime failures like this:

- Missing `N8N_AI_TEST_WEBHOOK_URL`: `503`
- n8n timeout after 20 seconds: `504`
- network/fetch failure: `502`
- n8n non-2xx response: `502`
- non-JSON response: `502`
- invalid response schema: `502`

The frontend shows the returned error. It must not create a fake Jennifer answer.

OpenClaw-specific failure handling in n8n:

- If OpenClaw returns non-2xx: return `502` to QuicReply.
- If OpenClaw returns `status != completed`: treat as runtime failure.
- If OpenClaw returns incomplete or malformed output text: treat as runtime failure.
- If OpenClaw returns internal error text or tool-like output only: treat as runtime failure.

Recommended n8n error message back to QuicReply:

```json
{
  "message": "Jennifer runtime did not return a usable response."
}
```

## n8n Workflow Requirements

The n8n workflow should:

1. Receive the `ai.test` webhook payload.
2. Validate `x-quicreply-webhook-secret` if a secret is configured.
3. Refuse the request if `contextQuality.isReady` is `false`.
4. Build a compact plain-text Jennifer prompt from `businessContext`, `organization`, `conversationHistory`, and `prompt`.
5. Call OpenClaw `POST /v1/responses` with `model: "openclaw/ai-test"`.
6. Extract the final assistant text from the OpenClaw response.
7. Return the strict JSON response above.

The workflow should not call Evolution API, send WhatsApp messages, create CRM contacts, or update inbox state for this sandbox route.

## Local Wiring Checklist

For local testing:

1. Start Ollama.
2. Start OpenClaw gateway on `127.0.0.1:18789`.
3. Ensure n8n can reach that address from its runtime environment.
4. Configure the n8n HTTP Request node with:
   - URL: `http://127.0.0.1:18789/v1/responses`
   - Header: `Authorization: Bearer qr-local-openclaw-token-20260607`
   - Header: `Content-Type: application/json`
5. Use `model: "openclaw/ai-test"`.

## Why `openclaw/ai-test`

This local agent exists because the default OpenClaw agent prompt stack is too heavy for a lightweight local model on a MacBook.

`openclaw/ai-test` is intentionally constrained:

- fixed Jennifer prompt
- no skills
- no tool surface
- lower prompt overhead

This keeps local memory and token usage down while still proving the architecture:

`QuicReply -> n8n -> OpenClaw -> model`
