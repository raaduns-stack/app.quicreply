## Inbox AI Runtime Plan

This plan turns Jennifer from a test-only sandbox into a real Inbox assistant for live WhatsApp conversations.

Current base already exists in QuicReply:

- Inbox thread list and message view:
  - `/Users/azam/Documents/Codes/client/app.quicreply/src/user/InboxPage.tsx`
- Inbox operations:
  - `/Users/azam/Documents/Codes/client/app.quicreply/src/inbox/operations.ts`
- Inbound WhatsApp webhook forwarding to n8n:
  - `/Users/azam/Documents/Codes/client/app.quicreply/src/whatsapp/webhook.ts`
- n8n reply callback back into QuicReply:
  - `n8nWhatsAppReplyWebhook` in `/Users/azam/Documents/Codes/client/app.quicreply/src/whatsapp/webhook.ts`

That means the transport foundation is mostly done already:

`WhatsApp -> QuicReply webhook -> n8n -> OpenClaw -> QuicReply reply webhook -> WhatsApp`

## What Inbox AI should do

Jennifer in Inbox should:

- read the latest inbound message plus recent thread history
- use the workspace business context and knowledge base
- answer simple sales and support questions directly
- ask one short follow-up only when needed
- avoid inventing live facts like refunds, payment confirmations, or order actions
- hand off to a human when the request is risky, account-specific, or clearly needs staff

Inbox AI should not:

- reuse the `/ai/test` sandbox contract for live traffic
- claim that a refund, order change, or manual business action was completed unless QuicReply itself confirmed it
- answer after a human handoff flag is raised

## Phase 1: Live Runtime Contract

Create a separate live n8n workflow, for example:

- `QuicReply WhatsApp Inbox Runtime`

Input contract from QuicReply should include:

- organization id
- contact id
- contact name
- contact phone
- provider message id
- inbound message text
- message timestamp
- last 10 to 20 thread messages
- contact tags
- contact status
- contact notes if present
- workspace AI setup fields
- knowledge base summary

Output contract back from n8n should include:

- `action`
  - `reply`
  - `handoff`
  - `skip`
- `message`
- `confidence`
- `reason`
- `handoffCategory`

## Phase 2: QuicReply Backend Changes

### 1. Send richer thread context to n8n

Today the webhook already forwards inbound traffic. Extend the payload builder in:

- `/Users/azam/Documents/Codes/client/app.quicreply/src/whatsapp/webhook.ts`

Add:

- recent message history from `WhatsAppMessageLog`
- contact tags
- contact status
- contact notes
- assigned user if any
- workspace AI setup summary
- knowledge base content or precomputed summary

### 2. Persist AI decision metadata

Add storage for:

- last AI reply timestamp
- last AI confidence
- last AI reason
- last AI handoff reason
- last AI provider message id

This can start in contact settings JSON or thread-related fields, then move to dedicated columns if needed.

### 3. Add Inbox-safe guardrails

Before forwarding to n8n, block auto-reply when:

- organization AI is off
- contact AI is off
- thread is resolved
- thread is in explicit human takeover mode
- the last outbound message was recently manual and the user is in an active human conversation

## Phase 3: n8n Workflow Behavior

The live workflow should do this:

1. Receive inbound payload from QuicReply.
2. Validate org/contact AI state.
3. Build a compact Jennifer prompt from:
   - latest user message
   - recent thread history
   - business context
   - policies
   - knowledge base
4. Ask OpenClaw for a reply and a structured decision.
5. If the decision is `reply`, call QuicReply’s reply webhook.
6. If the decision is `handoff`, do not send an AI reply. Return handoff metadata only.
7. If the decision is `skip`, do not send anything.

Recommended handoff rules:

- exact refund confirmation request
- exact order status unavailable in current context
- billing dispute
- angry customer
- legal or compliance-sensitive request
- explicit human request
- custom pricing or negotiation

## Phase 4: Inbox UI

Update the Inbox page to show live AI state.

Add:

- `Jennifer replied` message label on AI-generated outbound messages
- `Needs human` badge when handoff is triggered
- `AI paused` badge when a thread is excluded from automation
- confidence indicator on the thread header
- last AI action summary in the right-side controls area

Actions to add:

- pause AI for this thread
- resume AI for this thread
- force handoff
- retry last AI draft without sending

## Phase 5: Human Handoff Model

Inbox AI becomes much better if the system has explicit thread ownership states.

Recommended states:

- `ai-active`
- `human-active`
- `needs-attention`
- `resolved`

Behavior:

- `ai-active`: Jennifer may answer
- `human-active`: Jennifer does not answer automatically
- `needs-attention`: Jennifer stops and waits for staff
- `resolved`: no auto-reply unless reopened by a new inbound message

## Phase 6: Quality Controls

To make Inbox AI feel production-grade:

- keep replies short by default
- allow one follow-up question maximum unless the user keeps engaging
- prefer direct answers over repetitive qualification questions
- explicitly refuse unsupported live-action confirmations
- keep policy answers tied to saved business data only

## Phase 7: Real-Time Updates

The Inbox should not depend on manual refresh to reflect AI activity.

Add real-time updates for:

- thread preview changes
- unread count changes
- outbound AI reply arrival
- handoff state changes
- confidence updates

This can be implemented with the same real-time strategy used elsewhere in the app, but the UI contract should be defined first.

## Recommended Execution Order

1. Finalize live n8n Inbox workflow contract.
2. Extend QuicReply inbound payload with thread history and AI context.
3. Store AI decision metadata.
4. Add handoff-safe backend rules.
5. Add Inbox UI states and controls.
6. Add real-time thread refresh.
7. Run staged tests with one real WhatsApp contact before broader rollout.

## Immediate Next Step

The best next implementation step is:

- define and build the live n8n Inbox runtime contract in a new workflow

That gives QuicReply a stable boundary and avoids mixing sandbox behavior with real Inbox automation.
