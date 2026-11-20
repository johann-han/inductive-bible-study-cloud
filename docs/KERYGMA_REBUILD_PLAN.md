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
- The redesigned cross-sermon Claim Review queue, using the original proposition-analysis rules, stable review keys and the existing separate status store.
- A clear warning that Supabase cloud sync and deletion recovery still use the legacy studio during this transition.

The redesigned preview saves sermon edits locally to the established cache key and the Claim Review writes only to the existing separate review-status key. It does not initialise a second cloud-sync process or delete sermon records. The legacy studio remains available for authenticated Supabase synchronisation and deletion recovery until those workflows are migrated and tested.

## Rebuild delivery stages

### Stage A — Core redesigned workspace (implemented; browser review required)

- Replace the dashboard-only preview with the five-stage editable sermon workspace.
- Preserve existing sermon fields and record extensions.
- Add safe local autosave and save feedback.
- Add IBS source attachment, display and prompt context.
- Add the five server-backed AI workflows and conversation-only Guide.
- Add a sermon export and a visible rollback link.
- Test the desktop and mobile layout, every editor field, reload persistence, new-sermon creation, import conflict behavior and AI authentication.

### Stage B — Full IBS research and evidence panels (implemented; browser acceptance required)

- Bring the complete Source Inductive Study panel into the redesigned workspace.
- Restore the full evidence displays for Big Idea, each homiletical point, illustration/application and manuscript.
- Retain the distinction between imported source material, user-authored claims and AI suggestions.
- Preserve related passages, verse text, passage divisions, verse maps, personal and standard cross-reference provenance, visual markup and licensing details.
- Keep evidence overlap as a review/navigation aid, never as an automated verdict.

### Stage C — Claim-review workspace (implemented in redesigned preview; browser acceptance required)

- Rebuilds the cross-sermon queue with its existing search and status filters.
- Extracts the original paragraph/sentence proposition analysis, biblical-reference inheritance, outline/IBS division matching, and stable review keys into \`sermon-preview/claim-review.js\` without simplifying the algorithms.
- Preserves the separate \`kerygma_claim_review_status_v1\` store and existing four status values.
- Retains inline status updates, review counts, filtering and navigation to the manuscript paragraph.
- Regression tests exercise proposition extraction, sentence segmentation, reference matching, stable keys, status persistence and queue filtering.
- User/browser acceptance is still required; no statuses are migrated or reset.

### Stage D — Cloud sync and account behavior (adapter and mocked safety tests implemented; live activation held until cutover)

- Reuse the established Supabase authentication session, \`public.kerygma_sermons\` table and RLS policies.
- Rebuild the connection/status controls, first-load hydration, manual/automatic sync, user scoping, merge rules and deletion tombstones.
- Test no-session, sign-in, sign-out, account changes, offline/timeout, local-newer, cloud-newer, equal timestamps, duplicate records and remote deletion.
- Preserve all local sermon records and cloud rows; no destructive migration is allowed.
- The redesigned adapter's mocked regression suite now exercises owner-scoped pending deletion queues, account-switch isolation, tombstone upload ordering, tombstone retention after server errors, local-queue persistence failures after remote tombstone success, timeout behavior, user-scoped query errors and transactional local cache/owner-marker writes.
- When another account signs in, pending tombstones remain attached to their original owner and are never uploaded under the new account. New deletions cannot be mixed into a queue owned by another account.
- Account switching is stopped when the prior owner's cache backup cannot be written. The merged local sermon cache is only replaced after the new cache and owner marker can be persisted; a failed owner-marker write rolls the previous cache back.
- Cloud merge tests cover local-newer, cloud-newer, equal timestamps (cloud copy wins the tie), and remote deletion tombstones without affecting unrelated records.

### Stage E — Import, recovery and export completeness (implemented in preview; browser round-trip check remains)

- Retains version 1 IBS source packet validation and explicit create-new/attach-to-current choices.
- Preserves existing handwritten sermon fields and warns when an attached source packet will be replaced.
- Expands readable sermon export to include Scripture text, context, keywords, exegetical subject/complement, Big Idea, aim, complete homiletical outline and notes, illustrations, all application fields, manuscript and record metadata. The optional source appendix includes the full imported IBS packet as JSON, keeping source material separate from authored sermon content.
- Adds a versioned kerygma-sermon-workspace JSON backup/restore format. It preserves complete sermon records and extension fields, the nested IBS packet, the separate Claim Review statuses, the existing local owner marker, the pending cloud-deletion tombstones and their owner marker.
- Restore defaults to adding only missing sermon IDs. Matching IDs are preserved unless the user explicitly selects replacement. Re-importing is idempotent, records absent from the archive are never deleted, and account-owner mismatches are rejected.
- Restore writes only the existing Kerygma browser keys and rolls back prior writes if a later storage write fails. An archive owner marker is adopted when restoring into an unowned local cache so restored data cannot later be uploaded under another account.
- Automated regression tests cover full-fidelity Unicode/large-note round trips, malformed/unsupported archives, duplicate and missing IDs, merge and explicit replacement behavior, claim-review status handling, tombstone retention, owner isolation, storage failure rollback and protection of unrelated localStorage keys.
- Browser-level backup/download/restore and export/re-import round-trip acceptance remains to be checked. Cloud backup/sync is not activated in this preview.

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

The user has visually reviewed the redesigned Kerygma preview and confirmed that it looks good (2026-11-20). Stages A–C are implemented; interaction and device acceptance of the full workflow remains part of final browser verification. Stage E's full-fidelity local archive, restore safeguards and expanded text export are implemented in the feature branch; browser-level download/restore/re-import acceptance remains outstanding. Stage D's cloud adapter and account-safety protections are implemented and mocked-tested, but live cloud sync and deletion recovery remain disabled in the new preview until the cutover gate. Stage F (production route cutover) has not been approved. PR #191 is open, a draft, targets `main`, and must remain unmerged until explicit approval. The legacy Kerygma and IBS production routes and live Supabase records remain unchanged.
