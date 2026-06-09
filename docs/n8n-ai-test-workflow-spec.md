# n8n AI Test Workflow Spec

Last updated: 2026-06-07

This document describes the recommended n8n workflow for `/ai/test`.

Use it together with:

- [n8n-ai-test-contract.md](/Users/azam/Documents/Codes/client/app.quicreply/docs/n8n-ai-test-contract.md)
- [quicreply-ai-test-runtime.workflow.json](/Users/azam/Documents/Codes/client/app.quicreply/docs/n8n-workflows/quicreply-ai-test-runtime.workflow.json)

The contract defines payload shape and response rules.

This spec defines how the n8n workflow should be built.

The JSON file is the local import artifact for the first-pass workflow.

## Goal

The workflow should:

1. accept the QuicReply AI test webhook
2. validate the shared secret when configured
3. reject incomplete Jennifer context cleanly
4. flatten the sandbox payload into a compact Jennifer prompt
5. call local or hosted OpenClaw
6. map the OpenClaw answer back to QuicReply JSON

This workflow is sandbox-only.

It must not:

- send WhatsApp messages
- update contacts
- write Inbox replies
- mutate production conversation state

## Recommended Workflow Name

```text
QuicReply AI Test Runtime
```

Suggested webhook path:

```text
/webhook/quicreply-ai-test
```

## Runtime Target

For local development, use:

- OpenClaw base URL: `http://127.0.0.1:18789`
- auth token: `qr-local-openclaw-token-20260607`
- model: `openclaw/ai-test`

`openclaw/ai-test` exists specifically to keep local MacBook usage low:

- lightweight Ollama model
- no tool surface
- no heavy bootstrap stack
- predictable short-form Jennifer answers

## Node Layout

Recommended first-pass node order:

1. `Webhook`
2. `Validate Secret`
3. `Validate Context`
4. `Build Jennifer Prompt`
5. `Call OpenClaw`
6. `Extract Assistant Message`
7. `Respond Success`

Error exits:

- `Reject Unauthorized`
- `Reject Incomplete Setup`
- `Reject Runtime Failure`

## Node-by-Node Spec

### 1. Webhook

Node type:

```text
Webhook
```

Recommended config:

- method: `POST`
- path: `quicreply-ai-test`
- response mode: `responseNode`

Expected input comes from QuicReply backend and matches:

- `docs/n8n-ai-test-contract.md`

### 2. Validate Secret

Node type:

```text
IF
```

Purpose:

- if no n8n-side secret is configured, allow the request through
- if a secret is configured, require it to match `x-quicreply-webhook-secret`

Recommended n8n environment variable:

```text
QUICREPLY_AI_TEST_SECRET
```

Rule:

- pass when `QUICREPLY_AI_TEST_SECRET` is empty
- pass when header exactly matches `QUICREPLY_AI_TEST_SECRET`
- otherwise branch to `Reject Unauthorized`

Recommended unauthorized response:

```json
{
  "message": "Unauthorized AI test webhook request."
}
```

HTTP status:

```text
401
```

### 3. Validate Context

Node type:

```text
IF
```

Purpose:

- stop the workflow if QuicReply sends incomplete Jennifer setup

Rules:

- require `contextQuality.isReady === true`
- require `businessContext.businessDescription` to be present
- require `businessContext.productsServices` to be present

Do not try to “fix” missing business context inside n8n.

Recommended failure response:

```json
{
  "message": "Complete Jennifer setup before testing."
}
```

HTTP status:

```text
422
```

### 4. Build Jennifer Prompt

Node type:

```text
Code
```

Purpose:

- flatten the QuicReply payload into one compact string for OpenClaw

Output fields to build:

- `openclawPrompt`
- `openclawModel`
- `organizationId`
- optional `historyPreview`

Recommended rules:

- keep only the last 4 to 6 useful history turns
- map each turn to `role: text`
- strip empty lines
- keep prompt small and plain-text
- do not include internal implementation labels
- do not include `sandbox`, `mock`, `database`, or runtime notes

Recommended code:

```javascript
const body = $json.body ?? $json;
const history = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
const recentHistory = history
  .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
  .slice(-6)
  .map((entry) => `${entry.role || 'user'}: ${entry.text.trim()}`);

const businessDescription = body.businessContext?.businessDescription?.trim() || '';
const productsServices = body.businessContext?.productsServices?.trim() || '';
const responseStyle = body.businessContext?.responseStyle?.trim() || 'professional';
const aiLanguage = body.businessContext?.aiLanguage?.trim() || 'english';
const organizationName = body.organization?.name?.trim() || 'the business';
const customerPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

const promptParts = [
  `Business: ${businessDescription}`,
  `Products/services: ${productsServices}`,
  `Organization: ${organizationName}`,
  `Response style: ${responseStyle}`,
  `Language: ${aiLanguage}`,
  `Conversation history:\n${recentHistory.length ? recentHistory.join('\n') : 'No prior conversation.'}`,
  `Customer message: ${customerPrompt}`,
  'Reply in 2-5 sentences.'
];

return [{
  json: {
    ...body,
    openclawModel: 'openclaw/ai-test',
    openclawPrompt: promptParts.join('\n'),
    historyPreview: recentHistory
  }
}];
```

### 5. Call OpenClaw

Node type:

```text
HTTP Request
```

Purpose:

- send the flattened prompt to OpenClaw

Recommended config:

- method: `POST`
- URL: `http://127.0.0.1:18789/v1/responses`
- send headers:
  - `Authorization: Bearer qr-local-openclaw-token-20260607`
  - `Content-Type: application/json`
- JSON body:

```json
{
  "model": "={{ $json.openclawModel }}",
  "input": "={{ $json.openclawPrompt }}"
}
```

Recommended timeout:

```text
15000 ms
```

Recommended retry policy:

- retries: `1`
- retry only for transient network failure or `5xx`

Do not retry on:

- `4xx`
- malformed payload
- empty assistant output

### 6. Extract Assistant Message

Node type:

```text
Code
```

Purpose:

- normalize OpenClaw output into QuicReply response JSON

Rules:

- only accept completed assistant text
- trim whitespace
- reject code fences, tool traces, or empty output

Recommended code:

```javascript
const response = $json.body ?? $json;
const output = Array.isArray(response.output) ? response.output : [];

const text = output
  .flatMap((entry) => Array.isArray(entry.content) ? entry.content : [])
  .find((content) => content?.type === 'output_text' && typeof content.text === 'string')
  ?.text
  ?.trim();

const looksInvalid =
  !text ||
  text.startsWith('```') ||
  text.includes('<tool') ||
  text.includes('"tool_name"');

if (looksInvalid) {
  throw new Error('OpenClaw returned no usable assistant message.');
}

return [{
  json: {
    message: text,
    model: response.model || 'openclaw/ai-test',
    route: 'openclaw.ai-test',
    warnings: []
  }
}];
```

### 7. Respond Success

Node type:

```text
Respond to Webhook
```

HTTP status:

```text
200
```

Response body:

```json
{
  "message": "={{ $json.message }}",
  "model": "={{ $json.model }}",
  "route": "={{ $json.route }}",
  "warnings": "={{ $json.warnings }}"
}
```

## Error Nodes

### Reject Unauthorized

Node type:

```text
Respond to Webhook
```

HTTP status:

```text
401
```

Body:

```json
{
  "message": "Unauthorized AI test webhook request."
}
```

### Reject Incomplete Setup

Node type:

```text
Respond to Webhook
```

HTTP status:

```text
422
```

Body:

```json
{
  "message": "Complete Jennifer setup before testing."
}
```

### Reject Runtime Failure

Node type:

```text
Respond to Webhook
```

HTTP status:

```text
502
```

Body:

```json
{
  "message": "Jennifer runtime failed to produce a response."
}
```

Use this node for:

- OpenClaw timeout
- OpenClaw non-JSON response
- OpenClaw empty assistant output
- malformed OpenClaw output

## Suggested n8n Branching

Recommended logic:

1. `Webhook` -> `Validate Secret`
2. secret invalid -> `Reject Unauthorized`
3. secret valid -> `Validate Context`
4. context invalid -> `Reject Incomplete Setup`
5. context valid -> `Build Jennifer Prompt`
6. prompt built -> `Call OpenClaw`
7. OpenClaw success -> `Extract Assistant Message`
8. extraction success -> `Respond Success`
9. any runtime/extraction error -> `Reject Runtime Failure`

## Test Cases

Use these before any production import.

### 1. Happy Path

Input:

- valid secret
- meaningful `businessDescription`
- meaningful `productsServices`
- short customer prompt

Expected:

- `200`
- non-empty `message`
- route `openclaw.ai-test`

### 2. Missing Secret

Input:

- configured n8n secret
- no request header

Expected:

- `401`

### 3. Incomplete Jennifer Setup

Input:

- `contextQuality.isReady = false`

Expected:

- `422`
- no OpenClaw call

### 4. Empty Runtime Text

Simulate:

- OpenClaw returns no `output_text`

Expected:

- `502`

### 5. Large History Payload

Input:

- more than 6 history turns

Expected:

- workflow keeps only recent useful turns
- prompt remains compact

## Design Notes

- Keep n8n orchestration thin.
- Keep Jennifer reasoning inside OpenClaw.
- Keep the prompt compact for low local resource usage.
- Do not push router, memory, campaign, or WhatsApp side effects into this test workflow.
- Once this flow is stable, the same OpenClaw boundary can be reused for the larger WhatsApp router pipeline.
