# Kerygma Rebuild — Implementation Plan

## Decision

Rebuild Kerygma as a separate, progressively deliverable frontend while keeping the current studio available at \`/sermon/index.html\`. The first rebuild preview is \`/sermon-preview/index.html\`.

The rebuild is not a replacement deployment until the feature set, existing sermon records, IBS source packets, AI workflows, cloud sync, claim-review data and exports have been verified. The existing application remains the reference implementation during the transition.

## Current implementation inventory

The current Kerygma page is a 4,688-line standalone HTML file with its application controller and most UI logic embedded in \`sermon/index.html\`. It currently includes:

- A sermon vault with create/select/delete behavior and a built-in example sermon.
- Five workflow stages: Text & Exegesis, Big Idea & Proposition, Homiletical Outline, Illustrations & Application, and Manuscript / Notes.
- Versioned IBS source import with validation, preview, explicit conflict/overwrite choices and a persistent source panel.
- Five server-backed AI generation workflows and the separate Kerygma Guide & Assistant.
- Cross-sermon claim-review queue with search/filtering and inline review-status updates.
- Evidence traceability for the Big Idea, homiletical points, illustrations/applications, and manuscript claims.
- Supabase-backed sermon storage with a browser cache, per-user identity scoping, cloud deletion tombstones and synchronization.
- Sermon export, optional IBS-source appendix, and preservation of the original example sermon.

This functionality is the baseline to preserve. Rebuilding the interface does not authorise removing or simplifying a workflow.

## Non-negotiable compatibility rules

1. Keep the current app at \`/sermon/index.html\` until the user explicitly accepts the replacement.
2. Never clear, rename, migrate in-place, or overwrite \`kerygma_sermons\`, \`kerygma_local_owner_id\`, pending deletion stores, claim-review statuses, or the Supabase \`public.kerygma_sermons\` table during the preview phase.
3. Preserve each sermon ID and existing sermon fields, including user-authored notes, Big Idea, outline, applications, manuscript and timestamps.
4. Keep \`inductiveStudySource\` as a distinct nested source packet. The four IBS stages remain separate: Observe, Interpretation, Doctrine and Discipleship.
5. Preserve the existing IBS source packet version, provenance, personal-versus-standard cross-reference distinction, related-passage content, verse maps, markup and outline.
6. Continue to use the authenticated server-side \`/api/sermon-ai\` and existing \`/api/config\` contract. AI credentials stay in the server environment; no browser API key or direct provider call is reintroduced.
7. Keep sermon cloud records scoped to the signed-in user under the existing Supabase RLS rules. Do not replace the cloud model or change the schema as part of a visual rebuild.
8. Keep claim-review status data distinct from sermon content. Do not flatten queue status into the manuscript or source packet.
9. Render imported sermon/source content as text or safe DOM nodes, not executable HTML.
10. The preview dashboard is read-only. Any later edit/save functionality must be introduced as a separate tested step after the read/write adapter has been validated against the existing storage contract.

## Rebuild structure

The new preview starts with separate files under \`sermon-preview/\`:

- \`index.html\` — page entry point and semantic landmarks.
- \`styles.css\` — responsive presentation.
- \`data.js\` — pure display adapters for existing sermon records.
- \`app.js\` — preview rendering and interaction.

No new runtime framework or production dependency is introduced in the first preview slice. The current Node static server serves the separate route. CSS is served with an explicit \`text/css\` content type.

The preview reads the existing browser cache key \`kerygma_sermons\` without writing to it. It does not initialise a second Supabase client, create sample data, call AI, or issue any server mutation. If the browser cache is empty, the preview shows an honest empty state and links to the current studio.

## Delivery stages

### Stage 1 — Safe rebuild shell and sermon-library overview

- A separate route and responsive application shell.
- A left-hand sermon library with text search.
- A dashboard with live counts derived from the existing browser cache.
- A selected-sermon summary and progress across the five existing workflow stages.
- A source-study indicator derived from the attached IBS packet.
- Direct links back to IBS and the current production Kerygma.
- Read-only access only; no changes to local storage or cloud records.

### Stage 2 — Sermon workspace and stage navigation

Rebuild each of the five editing stages with clear hierarchy and stage-aware navigation. Preserve field meanings, existing outline/illustration identifiers and the current autosave/save contract. Implement a data adapter first and test load/edit/save/reload against a disposable fixture before connecting it to user storage.

### Stage 3 — IBS source and evidence workspace

Rebuild the persistent Source Inductive Study panel and all four stage sections. Retain outline, verse-map, markup, related-passage and cross-reference provenance. Rebuild the four evidence-traceability panels without turning overlap into an automated theological verdict.

### Stage 4 — Kerygma Guide and AI generation

Connect the existing five AI generation operations and Guide to the same server endpoints and stage-specific prompt profiles. Preserve overwrite confirmation, non-mutating Guide behavior, safe Markdown rendering, stage-labelled conversation history, and request cancellation/stale-response handling.

### Stage 5 — Claim-review workspace

Rebuild the cross-sermon queue, search/status filters, inline status updates, proposition extraction, sentence/paragraph claim analysis and navigation back to the exact sermon content. Preserve its separate per-user review-status storage and stable claim keys.

### Stage 6 — Cloud sync, backup and export

Only after local record compatibility is verified, connect Supabase using the existing authenticated user session and RLS-protected \`kerygma_sermons\` table. Test both directions, equal timestamps, newer local/cloud values, deletion tombstones, sign-out/user changes and recovery. Preserve the existing sermon export and optional IBS-source appendix.

### Stage 7 — Parallel acceptance and cutover

Run the current and rebuilt applications side by side using the same disposable acceptance dataset. Verify each capability and all data-preservation cases. Keep the original route as the rollback path. Switch the main Kerygma link only after explicit user acceptance; do not delete the legacy implementation until the new version has completed live acceptance.

## Stage 1 acceptance criteria

- The preview loads at \`/sermon-preview/index.html\` and the current studio remains reachable at \`/sermon/index.html\`.
- Existing browser-local sermons are displayed without being changed.
- Counts, source badges, search results and five-stage progress are derived from the actual records, not hard-coded sample data.
- Older or partially populated sermon records render safely.
- Malformed storage, missing browser storage and empty libraries produce an honest empty state rather than a blank page or invented data.
- No \`setItem\`, \`removeItem\`, Supabase write, AI request or cloud sync runs from the preview shell.
- Desktop and mobile layouts remain usable and scroll correctly.
- Node regression tests and server syntax checks pass on the exact PR head.
