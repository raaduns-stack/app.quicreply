# QuicReply Page Readiness

Last reviewed: May 23, 2026

## Status Legend

| Status | Meaning |
| --- | --- |
| Done | Implemented in the app and backed by real code/data where required. |
| Partial | Some working pieces exist, but the full milestone requirement is not complete. |
| Missing | Not implemented yet. |
| Blocked | Needs another module, external system, or final client decision first. |

## Dashboard Page

Current route: `/`

The original Milestone 4 dashboard UI is mostly done and now goes beyond static/mock cards. The newer Revenue Command Center milestone is only partially complete because it needs pipeline/deals data, audit events, and real-time infrastructure.

| Requirement | Status | What Exists Now | Remaining Work | Dependency |
| --- | --- | --- | --- | --- |
| Dashboard page loads without errors | Done | Dashboard is implemented in `src/user/UserDashboardPage.tsx`. | Keep regression testing after schema/UI changes. | None |
| 3-4 stat cards | Done | KPI cards exist for messages received, leads captured, AI responses, and revenue in pipeline. | Revenue value needs real deal/pipeline totals. | Pipeline/CRM deal model |
| Total contacts / leads metric | Done | Leads captured is pulled from `Contact` records by selected time range. | Confirm final wording with client. | Contact table |
| Campaigns / campaign performance | Partial | Latest campaign performance appears from `Campaign`. | Dashboard does not currently show a primary "Campaigns Sent" KPI. | Campaign backend |
| Messages sent / received metric | Partial | Messages received counts inbound `WhatsAppMessageLog` records. | Add sent/outbound KPI if client expects "Messages Sent" specifically. | WhatsApp logs |
| WhatsApp status | Done | QR connected/disconnected state comes from `Organization`. | Needs live updates without refresh. | WebSocket/SSE |
| Current week default timeline filter | Done | Dashboard default range is `current-week`. | Add clearer UI copy if client wants explicit date range display. | None |
| Additional timeline filters | Done | Supports today, last 7 days, current month, and all time. | None. | None |
| WhatsApp connection card | Done | Shows QR status and reconnect action. | Improve stale/disconnected detection from Evolution events. | Evolution connection webhooks |
| Reconnect button | Partial | Calls `refreshWhatsAppQrStatus`. | Needs stronger recovery flow when instance was disconnected from phone. | Evolution provider state handling |
| API bridge status | Partial | Displays API status from organization. | Official API setup still not fully integrated with Meta approval/payment flow. | API setup module |
| Limited QR mode warning | Done | Warning/upgrade CTA exists. | Dynamic usage threshold can be improved. | Usage limits/plans |
| Messages Received KPI | Done | Real inbound count from DB for selected time range. | None. | WhatsApp logs |
| Leads Captured KPI | Done | Real contact count from DB for selected time range. | None. | Contact table |
| AI Responses KPI | Partial | Counts logs where source is `n8n`. | Depends on n8n consistently writing reply logs. | n8n reply workflow |
| Revenue in Pipeline KPI | Missing | Currently returns `0`. | Add deal/pipeline tables and aggregate open deal value. | CRM pipeline/deals |
| Unread notification bar | Partial | Unread count exists from message log status. | Client already flagged it as wrong. Need a thread-level unread model based on contact `unreadCount` or message read receipts. | Inbox unread logic + Evolution read events |
| Open Inbox / View Leads actions | Done | Buttons navigate to Inbox and Contacts. | None. | None |
| Test AI action | Partial | CTA exists. | Needs real AI sandbox/test endpoint if this should verify Jennifer. | n8n/OpenClaw |
| Activity feed | Partial | Feed is built from recent contacts and WhatsApp logs. | Client spec asks for last 10 audit events by category with deep links. | Audit/event log table |
| Activity feed tabs | Partial | Basic categories exist in UI. | Needs real category-backed event orchestration. | Audit/event log table |
| Activity item deep links | Missing | Items are display-only. | Link lead events to contact profiles, message events to inbox thread, campaigns to campaign detail. | Routing + entity IDs |
| Smart recommendations | Partial | Static recommendation cards exist. | Make recommendations dynamic from plan, usage, AI status, WhatsApp status. | Usage/plans + AI status |
| Real-time dashboard updates within 60s | Missing | Data updates on query refetch/page reload. | Add polling or WebSocket/SSE. WebSocket is better long term. | WebSocket/SSE |
| Responsive layout | Done | Cards and sections are responsive. | Keep visual QA on mobile/tablet. | None |

### Dashboard Summary

| Area | Verdict |
| --- | --- |
| Milestone 4 UI | Mostly done. |
| Real data | Mostly done, except pipeline revenue and some campaign-specific expectations. |
| Revenue Command Center | Partial. Good base, not fully production-complete yet. |
| Biggest remaining blockers | Pipeline/deals model, audit/event feed, unread accuracy, and WebSocket/SSE live updates. |

## Inbox Page

Current route: `/inbox`

The Inbox has a strong working base: 3-pane layout, DB-backed threads, real WhatsApp messages, send message support, resolve, read marking, and AI active toggle. The advanced Milestone 7 requirements are not fully complete yet because they depend on WebSockets, n8n/OpenClaw confidence data, pipeline/CRM data, and Evolution delivery status events.

| Requirement | Status | What Exists Now | Remaining Work | Dependency |
| --- | --- | --- | --- | --- |
| 3-pane inbox layout | Done | Left thread list, center transcript, right contact pane exist. | Improve mobile behavior if needed. | None |
| Fixed-height full-width interface | Done | Inbox uses a full-height app layout. | Minor polish only. | None |
| Left thread stream around 320px | Done | Left pane uses `w-80`, equal to 320px. | None. | None |
| Filters: All, Unread, AI Active, Open | Done | These filters exist. | Add Needs Attention if confidence feature is added. | Confidence score |
| Search by name/phone | Done | Backend filters by name, phone, email, and last message. | None. | Contact table |
| Real unread badges | Partial | Uses contact unread counts. | Client has reported wrong unread numbers, so logic needs audit and correction. | Webhook read/unread logic |
| Activity dots | Partial | New count badges exist. | Add live activity indicators from WebSocket events. | WebSocket/SSE |
| AI control bar | Done | Center bar shows Jennifer AI Active and current automation state. | Add confidence score display. | n8n/OpenClaw |
| Real-time confidence score | Missing | No confidence field is stored or displayed. | Store score from AI workflow and render color state below 70%. | n8n/OpenClaw contract |
| Needs Attention filter | Missing | Not present. | Add when confidence and escalation flags exist. | Confidence score + CRM state |
| Take Over button | Partial | Toggles contact `isAiActive` in DB. | Must send PAUSE command to n8n for that contact/session. | n8n control endpoint |
| Transcript bubbles for user/Jennifer/agent | Partial | Inbound/outbound bubble styles exist. | Need distinct visual treatment for Jennifer vs human agent using message source. | Message source conventions |
| Website/WhatsApp source branding | Partial | Contact source is shown in right pane. | Add per-thread/source icons in the list and transcript. | Source normalization |
| Thread merging across channels | Missing | Threads are contact/phone based. | Merge website widget identity with WhatsApp identity. | Website widget + identity matching |
| Customer typing state | Missing | No real typing state. | Receive typing events from channel/websocket and show in UI. | WebSocket/SSE + provider events |
| Jennifer thinking state | Missing | No AI processing state. | n8n must emit processing/complete events. | n8n/OpenClaw contract |
| Delivery checkmarks | Missing | Message status exists in DB, but UI does not show sent/delivered/read/failed ticks. | Map Evolution status events and render ticks. | Evolution status webhook |
| Failed message indicator | Missing | Failed status is not visually shown in transcript. | Add failed bubble state and retry action. | Evolution status webhook |
| Ghosted flag after 4h sent-only | Missing | No ghosting logic. | Scheduled check or query-derived flag. | Delivery status timestamps |
| GET threads equivalent | Done | Wasp query `getInboxThreads` exists. | REST endpoint only needed if external service requires it. | None |
| GET messages equivalent | Done | Wasp query `getInboxThreadMessages` exists. | REST endpoint only needed if external service requires it. | None |
| POST takeover equivalent | Partial | Wasp action toggles AI state. | Add n8n pause command and audit log. | n8n control endpoint |
| POST notes equivalent | Missing | Inbox right pane displays latest contact notes, but does not save notes. | Add notes editor/action in Inbox. | Contact notes or ContactNote model |
| Sales intel header | Partial | Right pane shows contact name, status, phone, source, assigned to, tags, notes. | Add current stage, last action, total value. | Pipeline/deals |
| Profile tab | Partial | Profile button links to contact profile. | Client spec asks functional tabs inside pane. | UI work |
| Pipeline tab | Missing | No pipeline tab inside Inbox. | Show/update stage from pipeline model. | Pipeline/CRM |
| Notes tab | Missing | No notes tab editor inside Inbox. | Add internal notes list/editor. | Notes model/action |
| No leads empty state | Done | Empty states exist for no threads/messages. | Update copy to exact client wording if needed. | None |
| Sticky input | Done | Input stays pinned at bottom. | None. | None |
| Cmd/Ctrl + Enter to send | Missing | Current UX sends on Enter without Shift. | Add command/ctrl-enter behavior if client wants exact spec. | UI work |
| Esc shortcut | Missing | No Esc thread switching behavior. | Define expected behavior first, then implement. | UX decision |
| Real-time incoming messages | Partial | Data comes from DB/webhooks and can be refetched. | Need automatic live updates without manual refresh. | WebSocket/SSE or polling |
| Send message from inbox | Done | `sendInboxMessage` sends through WhatsApp provider and logs outbound message. | Continue hardening status/error feedback. | Evolution provider |

### Inbox Summary

| Area | Verdict |
| --- | --- |
| Layout | Done. |
| DB-backed conversations | Done. |
| Sending messages | Done. |
| Read/resolve/takeover basics | Partial but usable. |
| Advanced AI/HITL requirements | Mostly missing because they need n8n/OpenClaw events. |
| Real-time behavior | Partial. Needs WebSocket/SSE or short polling. |
| Sales Intel pane | Partial. Needs pipeline/deals and notes editor. |

## Campaigns Page

Current route: `/campaigns`

The Campaigns page has a real database-backed listing and a create flow that saves draft campaigns. It is not a production broadcast engine yet. The sending flow is explicitly blocked in the UI with "Sending flow coming next", and the backend only snapshots all contacts into `CampaignRecipient` rows.

| Requirement | Status | What Exists Now | Remaining Work | Dependency |
| --- | --- | --- | --- | --- |
| Campaign list page | Done | `/campaigns` route exists and renders `src/user/CampaignsPage.tsx`. | Add route alias if client requires `/dashboard/campaigns`. | Routing decision |
| Header, subtitle, Create Campaign button | Done | Title, subtitle, and primary create button exist. | None. | None |
| Search filter | Done | Frontend filters campaigns by name, subtitle, and message. Backend also supports search args, but page currently filters locally. | Optional: move filtering fully server-side for scale. | None |
| Status dropdown | Done | Status filter exists for all/sent/sending/queued/draft/failed. | Optional: pass status to backend query instead of local filtering. | None |
| Date range picker | Partial | Date range button is visible with static May 2026 dates. | Add real date range state, picker UI, backend date filtering, and reset behavior. | Campaign query filters |
| Campaign table columns | Done | Icon, name/subtitle, message preview, audience, status, sent, delivered, date, actions exist. | Add read rate if client wants read percentage separately. | Campaign event data |
| Real campaign data | Done | `getCampaigns` reads `Campaign` rows from Prisma. | None for basic list. | Campaign table |
| Loading state | Done | Table shows loader while campaigns query is loading. | None. | None |
| Empty state | Done | Empty campaign state exists. | None. | None |
| Create flow | Partial | Create flow exists inside the same page when `isCreateOpen` is true. | Add real `/campaigns/create` route if required by spec. | Routing decision |
| Create visual style | Done | Uses QuicReply neutral/orange palette and light/dark theme. | Continue visual QA. | None |
| Save draft | Done | Saves a real `Campaign` row and creates `CampaignRecipient` rows. | Add edit/update draft support. | Campaign operations |
| Campaign appears immediately after creation | Done | Newly created draft is added to local state and appears in list. | Also refetch after create for full consistency. | None |
| Audience count | Partial | Audience count equals all current contacts. | Must support selected segments and manual picker counts. | Contact filters + Pipeline stages |
| Segment by tag | Missing | Audience only supports `allContacts`. | Add tag selector and backend recipient query. | Contact tags |
| Segment by pipeline stage | Missing | No pipeline-stage audience filter. | Add pipeline/deal stages first, then campaign targeting by stage. | Pipeline/CRM |
| Manual contact picker | Missing | No searchable checkbox picker in create flow. | Add contact picker with selected recipient state and backend validation. | Contact query |
| Message composer | Done | Textarea and live WhatsApp-style preview exist. | None for basic text campaigns. | None |
| Variables UI | Partial | UI supports `{{name}}`, `{{business}}`, and `{{offer}}`. | Client spec asks for `{{first_name}}` and `{{last_action}}`; also needs real replacement before sending. | Variable engine + CRM data |
| Variable replacement engine | Missing | Variables are inserted into text only. | Replace variables per recipient before queue/send. | n8n worker or backend send queue |
| Media support | Missing | No image upload field. | Add upload, storage, campaign media metadata, and provider send payload support. | File storage + Evolution/Meta media sending |
| WhatsApp approved template toggle | Missing | No template mode. | Add template selector/toggle for outside 24-hour window. | Official WhatsApp API / Meta templates |
| Jennifer handles replies toggle | Missing | No campaign-level Jennifer handover toggle/context. | Store campaign AI handover flag and campaign context for reply workflow. | n8n/OpenClaw + campaign context |
| Campaign-specific AI context | Missing | No campaign context is passed to AI. | n8n must receive campaignId/context and use matching knowledge base/FAQ. | n8n/OpenClaw + knowledge base |
| Status states queued/sending/sent/failed | Partial | Status enum and UI styles exist. New campaigns are always saved as `draft`. | Add queue/send worker to move statuses through real lifecycle. | n8n worker / queue |
| Real-time sent counter | Missing | Sent count is stored but not live-updated. | Update from worker/Evolution events via WebSocket/SSE. | WebSocket/SSE + campaign events |
| Delivered/read analytics | Partial | Delivered count and delivery rate are shown from DB fields. | Need Evolution status event sync and read percentage. | Evolution status webhook |
| n8n hook for campaign sending | Missing | Launch flow does not call n8n. It shows upgrade/save draft behavior. | Connect launch to n8n webhook or backend queue endpoint. | n8n campaign webhook |
| QR mode upgrade guard | Done | QR-only users are blocked from launch and shown upgrade UI. | Confirm final business rule: QR limited send vs API-only bulk. | Product decision |
| Progress bar/live counter during sending | Missing | No progress bar. | Add progress state from CampaignMessageEvent or n8n worker updates. | WebSocket/SSE + campaign event table |
| Campaign detail / summary report | Partial | Clicking a campaign opens a right-side detail panel with basic message and counts. | Add full summary report with recipients, delivery, read, failed reasons, and timeline. | CampaignMessageEvent |
| Recipient status tracking | Partial | `CampaignRecipient` rows are created as queued. | Need per-recipient send/delivery/read/failed updates. | Campaign worker + Evolution events |
| Pagination | Partial | Static page controls exist. | Add real pagination for large campaign lists. | Backend pagination |

### Campaigns Summary

| Area | Verdict |
| --- | --- |
| Campaign list UI | Done. |
| Real DB listing | Done. |
| Draft creation | Done. |
| Audience targeting | Partial. Only all contacts exists. |
| Broadcast sending | Missing. |
| n8n integration | Missing. |
| Delivery/read analytics | Partial UI only; needs event sync. |
| Summary reporting | Partial side panel only. |

## Pipeline Page

Current route: `/pipeline`

This milestone is for the Pipeline/Kanban CRM page. The client calls the route `/dashboard/pipeline`, but this Wasp app currently registers it as `/pipeline` in `main.wasp`.

The current page is a good UI prototype: it has workflow switching, Kanban columns, deal cards, stats, an Add Deal modal, and an Advance button. It is not production-ready yet because all deals, workflows, stages, values, and movements live in React state inside `src/user/PipelinePage.tsx`. There is no `Deal` or `PipelineTemplate` Prisma model yet.

| Requirement | Status | What Exists Now | Remaining Work | Dependency |
| --- | --- | --- | --- | --- |
| Pipeline route | Done | `/pipeline` route exists and renders `src/user/PipelinePage.tsx`. | Add `/dashboard/pipeline` alias only if the client requires that exact URL. | Routing decision |
| Template-driven CRM | Partial | Page has hardcoded `wig`, `gadget`, and `custom` workflow configs. | Fetch active template from organization settings and store templates in DB. | Organization settings + PipelineTemplate model |
| Active template from organization settings | Missing | Default is local React state: `useState('wig')`. | Add org-level active pipeline template field and query/action to read/update it. | Organization settings |
| Template switcher | Partial | Dropdown switches between hardcoded workflow configs. | Make switcher read real templates and persist selected template. | PipelineTemplate model |
| Revenue totals header | Partial | Total value, deal count, and win rate are calculated from local deals. | Build backend aggregator from real deal records and selected filters. | Deal model |
| Total Value | Partial | Shows local static/demo deal values. | Use real deal values and org currency. | Deal model + currency setting |
| Total Deals | Partial | Counts local demo deals. | Count real open/won/lost deals from DB. | Deal model |
| Win Rate | Partial | Hardcoded to `38`. | Calculate won deals divided by closed deals or client-approved formula. | Deal model |
| Add Deal button | Partial | Modal exists and adds a deal to local state only. | Persist a real Deal row linked to a Contact. | Deal model + Contact model |
| Manual deal creation defaults to New Inquiry | Partial | Form can choose a stage and defaults to stage index `0`. | Backend should default to first stage of active template when no stage is provided. | PipelineTemplate model |
| Dynamic Kanban columns | Partial | Columns change based on hardcoded config. | Render columns from DB-backed template stages. | PipelineTemplate model |
| Wig Vendor Workflow columns | Partial | Hardcoded columns exist: New Inquiry, Style Confirmed, Payment Received, Shipped/Closed. | Store this as a template and allow per-org selection/customization. | PipelineTemplate model |
| Deal cards | Partial | Cards show customer name, value, status tag, initials, date, View, and Advance. | Use real contact/deal data and normalized status/priority fields. | Deal + Contact models |
| Contact name + avatar | Partial | Uses local `customerName` and initials. | Link each deal to a real Contact and use contact avatar/initials. | Contact model |
| Deal value | Partial | Uses local number with `$`. | Use decimal field and org currency, likely NGN for this client. | Deal model + currency setting |
| Urgency badge | Partial | Uses hardcoded status/priority values. | Store `priorityLevel` and later update from AI/webhooks. | Deal model + AI workflow |
| Interaction date | Partial | Uses local static/form-created date labels. | Use last message/contact activity timestamp. | WhatsApp logs + Contact model |
| Quick action: View | Missing | View button exists but does not navigate. | Link to the matching Inbox thread/contact profile. | Inbox route + Contact ID |
| Quick action: Advance | Partial | Moves local deal to next column in React state. | Persist `pipelineStage` update in DB. | Deal update action |
| Drag and drop | Missing | No drag-and-drop library is integrated. | Add `dnd-kit` and update deal stage on drop. | Deal update action |
| Source/destination revenue recalculation | Partial | Local totals update after local Advance. | Recalculate from DB after drag/advance and keep server as source of truth. | Deal aggregator |
| Deal table/schema | Missing | `schema.prisma` has no `Deal` or `PipelineTemplate` model. | Add Deal, PipelineTemplate, and PipelineStage schema. | Prisma migration |
| Contact foreign key | Missing | Local deals are not tied to contacts. | Add `contactId` relation on Deal. | Contact model |
| Deal status open/won/lost | Missing | Local `Status` type is mixed with UI labels. | Add proper enum/status field and lifecycle rules. | Deal model |
| AI-calculated priority | Missing | No AI priority update flow. | Accept priority updates from n8n/OpenClaw or internal scoring logic. | AI/n8n contract |
| Auto-stage movement | Missing | No webhook automation. | Build endpoint/action for Jennifer/payment events to move deals. | n8n/webhook contract |
| Payment Received automation hook | Missing | No Paystack/invoicing trigger. | Trigger invoice/payment link flow when a deal enters payment stage. | Billing/Paystack module |
| Stale deal alerts after 48h | Missing | No stale indicator. | Derive stale state from last stage change/activity timestamp. | Deal timestamps + scheduled query |
| Inbox link | Missing | View button is display-only. | Route to `/inbox` with selected contact/thread, or create `/inbox/:contactId`. | Inbox deep-link support |
| Mobile responsiveness | Partial | Board uses horizontal overflow and fixed-width columns. | Verify mobile swipe experience and adjust sidebars/header. | Visual QA |

### Pipeline Summary

| Area | Verdict |
| --- | --- |
| Page/UI prototype | Done. |
| Dynamic templates | Partial, but hardcoded only. |
| Real DB-backed deals | Missing. |
| Drag and drop | Missing. |
| Revenue forecasting | Partial UI only, not real. |
| Automation hooks | Missing. |
| Main blocker | Deal/PipelineTemplate schema and backend operations. |

## Dependency Map

| Dependency | Needed For | Current Status |
| --- | --- | --- |
| Contact CRM model | Dashboard leads, Inbox threads, right pane profile | Exists |
| WhatsAppMessageLog | Dashboard message counts, Inbox transcripts, activity feed | Exists |
| Campaign model | Dashboard campaign performance | Exists |
| CampaignRecipient model | Campaign audience snapshots and per-recipient tracking | Exists |
| CampaignMessageEvent model | Campaign progress, delivery/read analytics, failure reporting | Exists/needs wiring |
| Deal model | Pipeline cards, revenue totals, stage movement, dashboard pipeline revenue | Needed |
| PipelineTemplate model | Dynamic Kanban columns and active workflow selection | Needed |
| Audit/Event log | Dashboard activity feed with categories and deep links | Needed |
| WebSocket/SSE | Live dashboard updates, live inbox messages, typing states, delivery updates | Needed |
| Evolution message status webhook | Sent/delivered/read/failed ticks, ghosted lead detection | Needed/needs verification |
| n8n/OpenClaw AI contract | Confidence score, Jennifer thinking state, HITL pause command | Needed |
| n8n campaign worker | Campaign queueing, bulk sending, progress updates | Needed |
| File storage | Campaign media/image uploads | Needed |
| Official WhatsApp API / Meta templates | Approved templates and compliant outbound campaigns | Needed |
| Website widget identity | Omnichannel continuity and thread merging | Needed |
| Notes model or notes action | Inbox right-pane notes tab | Needed/partial through Contact notes |
| Billing/Paystack module | Deal payment hooks and pipeline automation after payment stage | Needed |

## Recommended Build Order

| Order | Work | Why This First |
| --- | --- | --- |
| 1 | Fix unread count logic | Client already flagged this, and it affects Dashboard + Inbox trust. |
| 2 | Add delivery status rendering in Inbox | Message sending works, but users need sent/delivered/read/failed clarity. |
| 3 | Add WebSocket/SSE or short polling | Inbox must update when new WhatsApp messages arrive. |
| 4 | Add n8n HITL pause contract | Take Over should actually stop Jennifer, not only flip a DB flag. |
| 5 | Add confidence score contract + UI | This unlocks confidence bar and Needs Attention filter. |
| 6 | Add campaign audience targeting | Campaign sending needs correct recipients before n8n starts broadcasting. |
| 7 | Add n8n campaign worker hook | Converts campaign drafts into real queued/sending/sent broadcasts. |
| 8 | Add CampaignMessageEvent sync | Required for progress, delivered/read percentages, and failure reasons. |
| 9 | Add Deal and PipelineTemplate models | Required for Pipeline page, dashboard revenue, Sales Intel stage, campaign stage targeting, and total value. |
| 10 | Build pipeline CRUD + stage movement | Makes Add Deal, Advance, and dashboard revenue real. |
| 11 | Add drag-and-drop Kanban | Should come after DB stage updates exist. |
| 12 | Add Inbox notes editor | Completes right-pane CRM usefulness. |
| 13 | Add audit/event feed | Completes dashboard activity feed and deep links. |
| 14 | Add omnichannel merge | Best done after website widget/customer identity exists. |

## Straight Answer

Dashboard is not just a mock anymore. It has real backend data for messages, contacts, AI response count, WhatsApp status, and campaign summary. What is not fully done is the newer Revenue Command Center layer: real pipeline revenue, audit-feed deep links, exact unread correctness, and real-time updates.

Inbox is also not hardcoded anymore. It has real contacts, real message logs, real outbound sending, and real contact-backed threads. What remains is the advanced production layer: WebSockets, Evolution delivery/read status mapping, n8n pause/takeover, confidence score, Sales Intel pipeline data, and internal notes inside the right pane.

Campaigns is database-backed for listing and draft creation. It is not yet a real broadcast engine. The remaining production work is audience segmentation, variable replacement, media/templates, n8n queue/send hook, WebSocket progress, and Evolution delivery/read analytics.

Pipeline is currently the clearest example of "good UI but not real backend yet." The right next step for this milestone is schema first: `Deal`, `PipelineTemplate`, and template stages, then CRUD/actions, then drag-and-drop, then automation hooks.
