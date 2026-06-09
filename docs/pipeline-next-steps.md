# Pipeline Next Steps

Last updated: 2026-05-24

## Current Status

Pipeline is now functionally beyond mock UI and is backed by real database state.

| Area | Status |
|---|---|
| DB-backed pipeline templates | Done |
| Workflow dropdown | Done |
| Add deal | Done |
| Link deal to existing CRM contact | Done |
| Create new contact from deal | Done |
| Advance stage | Done, persists in DB |
| Open linked contact profile | Done |
| Drag/drop between columns | Done |
| Currency from workspace settings | Done |
| Deal detail drawer | Done |
| Sidebar collapse persistence | Done |
| Auto-stage from Inbox/Jennifer | Not done yet |
| Webhook-driven stage changes | Not done yet |

## Recommended Next Move

Do not add Inbox/Jennifer automation yet.

The clean next move is to finish the Campaigns page first, because it can already build on:
- real Contacts
- real Pipeline stages
- real Campaign draft persistence

That gives the product one complete outbound workflow before returning to pipeline automation.

## Why Campaigns Next

Pipeline is already usable for manual sales tracking.

Campaigns is the next highest-leverage page because it depends on data models that now exist or are close enough to wire properly:
- contacts already exist
- pipeline stage targeting can now become real
- campaign drafts already save to the database

Finishing Campaigns also avoids coupling pipeline automation to half-finished n8n behavior too early.

## Campaigns Execution Plan

### Phase 1: Finish audience targeting without n8n

Implement these first:
- all contacts audience
- audience by tag
- audience by pipeline stage
- manual contact picker
- live recipient count before save

Backend expectations:
- store audience filters in structured form
- generate `CampaignRecipient` rows from the selected audience
- keep campaign status as `draft` or `queued`

### Phase 2: Finish create campaign UX

Add:
- Jennifer handover toggle
- WhatsApp template toggle
- media upload field
- clearer preview of audience and send mode

### Phase 3: Add launch flow

After audience logic is correct:
- add `launchCampaign` backend action
- send normalized payload to n8n
- move campaign from `draft` to `queued`
- later sync sent, delivered, read, and failed events back into DB

## Pipeline Work Deferred Until After Campaigns

These are the next pipeline items after Campaigns:

### 1. Inbox-linked deal intelligence

Add pipeline context into Inbox:
- show current deal/stage inside sales intel
- show total deal value
- show latest pipeline action

### 2. Jennifer-driven pipeline automation

Needed behavior:
- Jennifer suggests or applies stage movement from message intent
- human can override
- low-confidence moves do not auto-apply

### 3. Webhook-driven stage changes

Add a backend endpoint/action that accepts stage updates from trusted systems such as:
- n8n
- Jennifer orchestration
- payment/invoice events

Suggested payload:

```json
{
  "organizationId": "...",
  "contactId": "...",
  "dealId": "...",
  "pipelineStage": "payment_received",
  "confidence": 0.91,
  "reason": "Customer confirmed payment"
}
```

### 4. Audit trail for pipeline state changes

Every automated move should later record:
- who or what changed the stage
- previous stage
- next stage
- confidence
- reason
- timestamp

## Constraints / Notes

- Local source of truth only. Do not edit VPS directly.
- If the local DB complains about missing pipeline tables or schema mismatch, run:

```bash
wasp db migrate-dev
```

- The automation contract for Inbox/Jennifer and pipeline should be designed before implementation, not improvised during UI work.

## Short Decision Summary

1. Pipeline manual workflow is good enough for now.
2. Do not start Jennifer/webhook auto-stage yet.
3. Finish Campaigns audience and launch flow next.
4. Return to pipeline automation only after Campaigns has a real send path.
