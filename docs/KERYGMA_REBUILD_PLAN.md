# Kerygma — Complete Workspace Redesign

## Objective

Replace the legacy Kerygma interface with a coherent, modern expository-sermon workspace comparable in quality and usability to the redesigned IBS experience. The redesign is a new application surface, not a replacement of Kerygma's established research, sermon, AI, source, review, storage or export capabilities.

## Route and rollback

- New redesigned preview: \`/sermon-preview/index.html\`
- Existing Kerygma reference and rollback: \`/sermon/index.html\`
- IBS remains at \`/\`
- Shared repository and Render web service: \`johann-han/inductive-bible-study-cloud\`
- The new preview must remain separate until all acceptance gates pass. No production navigation switch is permitted without explicit user approval.

## Existing contracts that must be preserved

The rebuild must remain compatible with:

1. Existing \`kerygma_sermons\` browser-cache key and sermon record fields.
2. Existing \`sermon.id\` values, timestamps, optional extension fields and the built-in sample sermon.
3. Nested \`inductiveStudySource\` packet, format \`inductive-bible-study-sermon-source\`, version 1, with separate Observe, Interpretation, Doctrine and Discipleship notes.
4. IBS passage outline, verse maps, scripture markup, personal cross-references, standard references, related passage content and source/licence provenance.
5. The separate \`kerygma_claim_review_status_v1\` store and its existing status values:
   - \`not-reviewed\`
   - \`reviewed\`
   - \`needs-research\`
   - \`requires-revision\`
6. Existing server-side AI endpoints: \`/api/config\` and \`/api/sermon-ai\`. Authentication remains through the existing Supabase session; provider keys remain server-side.
7. Existing Supabase table \`public.kerygma_sermons\`, per-user row-level security, cloud merge, user scoping and deletion tombstones.
8. Existing sermon text export and opt-in source appendix.
9. The complete five-stage workflow and purpose-specific AI prompt distinctions.
10. The Kerygma Guide's conversation-only behavior: it may advise but must not edit or save sermon fields or IBS source material.

## Current implementation baseline

The legacy Kerygma application is a standalone 4,688-line HTML file with inline JavaScript. It contains the established five-stage workflow, IBS import, source display, five AI generation workflows, Kerygma Guide, evidence traceability, claim-review analysis and queue, Supabase cloud storage, deletion recovery and export.

The redesigned preview now contains:

- A new responsive green/sage/gold application shell and navigation.
- Overview and sermon-library views, search and data-derived progress summaries.
- Five working sermon editor stages:
  - Text & Exegesis
  - Big Idea & Proposition
  - Homiletical Outline
  - Illustrations & Application
  - Manuscript / Notes
- Autosave to the existing \`kerygma_sermons\` local browser cache.
- Preservation of unknown fields and existing nested IBS source packets during local edits.
- Version 1 IBS packet validation, preview and explicit attachment to a new or currently selected sermon.
- Read-only display of the four imported IBS stages.
- The five purpose-specific AI generation operations using the authenticated \`/api/sermon-ai\` service.
- A conversation-only Kerygma Guide that receives the active stage and relevant current sermon/source context.
- Text export with an optional separate IBS source appendix.
- A clear warning that cloud sync, deletion and the complete claim-review queue still use the legacy studio during this transition.

The redesigned preview intentionally does not initialise a second Supabase client, silently sync, delete records, clear storage or migrate claim statuses. It saves edits locally to the established cache key; the legacy studio remains available for cloud synchronisation and the full claim-review queue until those workflows are migrated and tested.

## Rebuild delivery stages

### Stage A — Core redesigned workspace (implemented; browser review required)

- Replace the dashboard-only preview with the five-stage editable sermon workspace.
- Preserve existing sermon fields and record extensions.
- Add safe local autosave and save feedback.
- Add IBS source attachment, display and prompt context.
- Add the five server-backed AI workflows and conversation-only Guide.
- Add a sermon export and a visible rollback link.
- Test the desktop and mobile layout, every editor field, reload persistence, new-sermon creation, import conflict behavior and AI authentication.

### Stage B — Full IBS research and evidence panels

- Bring the complete Source Inductive Study panel into the redesigned workspace.
- Restore the full evidence displays for Big Idea, each homiletical point, illustration/application and manuscript.
- Retain the distinction between imported source material, user-authored claims and AI suggestions.
- Preserve related passages, verse text, passage divisions, verse maps, personal and standard cross-reference provenance, visual markup and licensing details.
- Keep evidence overlap as a review/navigation aid, never as an automated verdict.

### Stage C — Claim-review workspace

- Rebuild the cross-sermon queue with its existing search and status filters.
- Migrate the exact paragraph/sentence proposition extraction and biblical-reference inheritance behavior, not a simpler substitute.
- Preserve stable claim-review keys and the separate \`kerygma_claim_review_status_v1\` storage contract.
- Retain status updates, queue counts and navigation to the exact sermon claim.
- Prove the new queue reads/writes the same per-user status records and does not flatten review metadata into manuscripts.

### Stage D — Cloud sync and account behavior

- Reuse the established Supabase authentication session, \`public.kerygma_sermons\` table and RLS policies.
- Rebuild the connection/status controls, first-load hydration, manual/automatic sync, user scoping, merge rules and deletion tombstones.
- Test no-session, sign-in, sign-out, account changes, offline/timeout, local-newer, cloud-newer, equal timestamps, duplicate records and remote deletion.
- Preserve all local sermon records and cloud rows; no destructive migration is allowed.

### Stage E — Import, recovery and export completeness

- Retain source packet validation and explicit create-new/attach-to-current choices.
- Preserve existing handwritten sermon fields and explicit source-only replacement warnings.
- Complete export of all sermon fields and the optional, separate IBS source appendix.
- Add robust backup and restore only against the existing contracts.
- Verify Unicode, large notes, malformed packets, duplicate imports, reload and round-trip export.

### Stage F — Cutover and retirement of the legacy interface

- Run the legacy and redesigned apps side by side against the same non-destructive acceptance dataset.
- Verify all five stages, source packet, AI generation, Guide, traceability, claim review, cloud sync, deletion recovery and exports.
- Test desktop and phone.
- Obtain explicit user acceptance.
- Only then change the production Kerygma route. Keep the old application available for rollback until post-cutover checks pass.

## Safety and privacy rules

- Never clear browser storage or overwrite the existing sample sermon to test destructive actions.
- Do not replace the \`kerygma_sermons\` key or Supabase schema.
- Do not introduce a second sermon data store.
- Do not write cloud rows until the existing account/session and merge contracts are fully migrated.
- Do not delete records from the redesigned preview until cloud tombstone behavior is implemented.
- Never place AI provider keys in browser code, localStorage or chat.
- Never send the full sermon library or all note history to AI.
- Render imported source and manuscript text as text/safe DOM nodes, not executable HTML.
- Keep the Guide read-only.
- Every code change must pass regression tests on the exact PR head before browser acceptance.

## Acceptance state

Stage A is implemented in the separate preview and awaits browser acceptance. Stages B–F remain scheduled work. PR #191 is a draft, targets \`main\`, and must remain unmerged until explicit approval. The legacy Kerygma and IBS production routes remain unchanged.
