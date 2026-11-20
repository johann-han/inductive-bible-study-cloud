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

### Stage D — Cloud sync and account behavior (adapter, explicit account flow and mocked safety tests implemented; browser acceptance required)

- Reuse the established Supabase authentication session, \`public.kerygma_sermons\` table and RLS policies.
- Rebuild the connection/status controls, first-load hydration, manual/automatic sync, user scoping, merge rules and deletion tombstones.
- Test no-session, sign-in, sign-out, account changes, offline/timeout, local-newer, cloud-newer, equal timestamps, duplicate records and remote deletion.
- Preserve all local sermon records and cloud rows; no destructive migration is allowed.
- The redesigned adapter's mocked regression suite exercises owner-scoped pending deletion queues, account-switch isolation, tombstone upload ordering, tombstone retention after server errors, local-queue persistence failures after remote tombstone success, timeout behavior, user-scoped query errors and transactional local cache/owner-marker writes.
- When another account signs in, pending tombstones remain attached to their original owner and are never uploaded under the new account. New deletions cannot be mixed into a queue owned by another account.
- Account switching is stopped when the prior owner's sermon cache or separate Claim Review status backup cannot be written. The new account's previous local status backup is restored, or an empty status set is used; failed cache/owner-marker writes roll back the prior account's sermon cache and review statuses.
- Cloud merge tests cover local-newer, cloud-newer, equal timestamps (cloud copy wins the tie), and remote deletion tombstones without affecting unrelated records.

### Stage E — Import, recovery and export completeness (implemented in preview; browser round-trip check remains)

- Retains version 1 IBS source packet validation and explicit create-new/attach-to-current choices.
- Preserves existing handwritten sermon fields and warns when an attached source packet will be replaced.
- Expands readable sermon export to include Scripture text, context, keywords, exegetical subject/complement, Big Idea, aim, complete homiletical outline and notes, illustrations, all application fields, manuscript and record metadata. The optional source appendix includes the full imported IBS packet as JSON, keeping source material separate from authored sermon content.
- Adds a versioned kerygma-sermon-workspace JSON backup/restore format. It preserves complete sermon records and extension fields, the nested IBS packet, the separate Claim Review statuses, the existing local owner marker, the pending cloud-deletion tombstones and their owner marker.
- Restore defaults to adding only missing sermon IDs. Matching IDs are preserved unless the user explicitly selects replacement. Re-importing is idempotent, records absent from the archive are never deleted, and account-owner mismatches are rejected.
- Restore writes only the existing Kerygma browser keys and rolls back prior writes if a later storage write fails. An archive owner marker is adopted when restoring into an unowned local cache so restored data cannot later be uploaded under another account.
- Automated regression tests cover full-fidelity Unicode/large-note round trips, malformed/unsupported archives, duplicate and missing IDs, merge and explicit replacement behavior, claim-review status handling, tombstone retention, owner isolation, storage failure rollback and protection of unrelated localStorage keys.
- Browser-level backup/download/restore and export/re-import round-trip acceptance remains to be checked. Cloud sync is dormant by default in this preview and can only be started after the user signs in on the preview origin, reviews a read-only cloud merge summary, and separately confirms the first sync.

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
- Do not write cloud rows at page load or during development. In the preview, the first cloud upsert and any deletion tombstones require a signed-in user to inspect the read-only merge preview and separately confirm the sync.
- Do not delete records from the redesigned preview until cloud tombstone behavior is implemented.
- Never place AI provider keys in browser code, localStorage or chat.
- Never send the full sermon library or all note history to AI.
- Render imported source and manuscript text as text/safe DOM nodes, not executable HTML.
- Keep the Guide read-only.
- Every code change must pass regression tests on the exact PR head before browser acceptance.

## Acceptance state

The user has visually reviewed the redesigned Kerygma preview and confirmed that it looks good (2026-11-20). Stages A–E are implemented in the feature branch; browser acceptance of the full workflow, account flow, sync round trip, backup/restore, and exports remains outstanding. Stage D now includes explicit preview-origin IBS email/password sign-in, a read-only cloud-library/merge preview, a separate confirmation before any sermon upload or deletion tombstone, background account-switch refusal, account-owned pending deletion queues, and per-account local Claim Review status backups. The adapter is not initialised at page load; no sermon rows are read or written until the user starts the preview flow. Stage F (production route cutover) has not been approved. PR #191 is open, a draft, targets `main`, and must remain unmerged until explicit approval. The legacy Kerygma and IBS production routes and live Supabase records remain unchanged.


### Stage C — Inline manuscript claim-review parity (implemented; browser acceptance required)

Restored the legacy Manuscript-stage claim-review layer in the redesigned preview:

- Displays paragraph-level analysis, paragraph references, sentence classification and candidate proposition extraction beneath the editable manuscript.
- Shows candidate sentence references, outline links, IBS division links and heuristic review flags.
- Restores all four review statuses — Not reviewed, Reviewed, Needs research and Requires revision — using the existing separate \`kerygma_claim_review_status_v1\` local store.
- Displays review-progress counts for propositions in the visible analysis and keeps status changes separate from manuscript and IBS source records.
- Assigns the established stable review key to each inline proposition. Opening a flagged item from the cross-sermon queue expands the Manuscript review panel, scrolls to the exact claim and focuses it.
- Preserves analyzer safety limits and explicitly reports omitted paragraphs, omitted sentences and the 60,000-character analysis cap. The review remains heuristic and is not a theological verdict.

Regression assertions cover the inline panel, stable claim anchors, queue-to-claim navigation, and persistence of all four statuses.

Validation on exact code commit \`154b4a6bcda0c5526e54450b8e8ab6e5a14a82ec\`:
- IBS CI: passed.
- IBS Regression Checks: passed.
- IBS and Kerygma source-aware regression checks: **170/170 passed**.

Browser acceptance of inline status updates, queue navigation and mobile layout remains outstanding. Cloud sync remains dormant by default and requires explicit preview-origin sign-in, a read-only merge preview and user confirmation.


## Stage D completion — explicit cloud account and merge-preview workflow (2026-11-20)

The redesigned preview now provides an explicit Account & Sync flow:

1. Sign in on the separate preview origin using the same invited IBS email/password. Signing in alone does not access sermon records.
2. Run a read-only preview scoped to the signed-in user's existing \`public.kerygma_sermons\` rows. It reports local, cloud and expected merged sermon counts and a limited title/passage preview; it does not upload sermon data or send tombstones.
3. Separately confirm the sync. Only then does the adapter merge by the established timestamp/tombstone rules and upsert the merged records. The confirmation describes account switching and pending deletion tombstones before proceeding.

Additional account safeguards:
- Auth sign-in events do not auto-trigger a sermon sync.
- Focus/visibility background sync refuses a changed account. Switching requires the explicit preview and confirmation flow.
- Previous-account sermon cache and separate Claim Review statuses are backed up locally before switching. The destination account's saved local Claim Review status backup is restored, or an empty status map is used.
- Cache, owner marker and Claim Review status writes are guarded and rolled back together where possible.
- Tombstones stay scoped to their originating account and are not sent by another account.

Automated validation on exact PR head \`5733d879f698a65ca67fa0d6de2553b5702c4635\`:
- IBS CI: **254/254 passed**.
- IBS Regression Checks: **254/254 passed**.
- IBS and Kerygma source-aware regression checks: **174/174 passed**.

This is automated/mock validation. No live Kerygma Supabase records were read or written during development. The new preview-origin sign-in, read-only preview and user-confirmed sync still require browser acceptance after the PR preview has deployed the latest head. The currently open Render preview tab was still serving an older build when checked. Production cutover remains unapproved.


## Preview deployment verification — 2026-11-20

The current Render preview now serves the explicit Account & Sync interface on the separate preview route:

- Preview URL: https://inductive-bible-study-workspace-pr-191.onrender.com/sermon-preview/index.html
- The rendered page displays the **Account & Sync** control.
- Its initial status is **Cloud sync not connected · open Account & Sync to sign in**. The preview does not start cloud synchronisation at page load.
- The interface presents a staged flow: preview-origin IBS sign-in, read-only cloud merge preview, then a distinct confirmation before synchronisation.
- The top-level browser check confirms the deployed page and account entry point are present. It does **not** yet verify a real sign-in, Supabase read-only query, confirmed sync, account switch, tombstone delivery, or recovery round trip. Those remain user/browser acceptance gates.
- The existing Current Studio link and production route remain available. No production route, schema, or live sermon record was changed.

The latest verified branch head before this documentation update was `4bd7ec94ec63296bf2713a368b1407731e86bb50`. On that exact head, the three GitHub Actions workflows completed successfully:

- IBS and Kerygma regression checks: **174/174 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44699864459
- IBS CI: **254/254 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44699865350
- IBS Regression Checks: **254/254 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44699864530

PR #191 remains open, draft and unmerged. Production cutover still requires all browser acceptance gates and explicit user approval.


## Read-only preview acceptance and pending-deletion disclosure — 2026-11-20

The user completed the preview-origin IBS sign-in and read-only cloud preview in the deployed Kerygma preview. The rendered account dialog showed one local sermon, two existing cloud sermons, an expected merged count of three, and one pending deletion tombstone. The two cloud records were listed by title and passage. The interface stated that no sermon records had been written or changed.

A safety gap was identified: the read-only preview reported the pending deletion count but did not identify its target. Before allowing the user to confirm sync, the feature branch now:
- Returns the title, passage and record ID for each deletion tombstone owned by the signed-in account.
- Lists those targets under **Pending deletions that will be sent** in the merge preview.
- Includes the deletion targets in the final confirmation prompt.
- Blocks sync when the count of pending deletions does not match the number of identifiable preview targets.
- Does not expose the titles or passages of tombstones held for another account; it reports only their count and keeps that queue untouched.

Regression tests cover both disclosure of the active account's targets and withholding another account's deletion details. These changes require CI on the exact latest branch head and a refreshed Render preview before the deletion target can be reviewed in the browser. The user has not confirmed sync. No cloud sermon record or tombstone has been changed by this read-only preview. Production remains untouched.


## Projected merge count correction — 2026-11-20

Before sync, the browser showed 1 local sermon, 2 cloud sermons, 1 owned deletion tombstone, and a projected merged count of 3. The deletion target was confirmed by the user as the local preview sermon **New Expository Sermon**. Review of the actual sync sequence showed that owned tombstones are uploaded before cloud rows are fetched and merged. The earlier preview count did not simulate that first step and therefore overstated the post-sync merged library by one.

The feature branch now calculates the projected merge by applying the signed-in account's pending tombstones to a read-only in-memory copy of the cloud rows before calling the existing merge helper. It does not upload tombstones or mutate local/cloud data. An automated regression test verifies that a local sermon already marked for deletion is excluded from the projected post-sync count.

For the observed preview data, the expected merged library should therefore be **2 sermons**, not 3: the two existing cloud sermons remain, and the local sermon marked for deletion is excluded. The user confirmed the deletion target, but has not authorised the sync confirmation in the application. Re-run the read-only preview on the latest deployed build and confirm the revised count before any cloud write.


Automated validation after the tombstone-aware projection and revised preview wording, on code head `e11979051f60d53a66d107568ff4ab986a30a832`:
- IBS CI: **256/256 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44723332195
- IBS Regression Checks: **256/256 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44723332276
- IBS and Kerygma source-aware regression checks: **176/176 passed** — https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/44723332148

The tests remain mocked/automated and do not write to live Supabase. The current connected browser session could not be re-read after this update, so Render deployment and browser confirmation of the revised two-sermon projection remain outstanding. No sync has been started.


## Preview script cache-busting — 2026-11-20

The browser rendered the revised preview wording and deletion target, but continued to show a projected merge count of three instead of the tombstone-aware expected count of two. The code and automated test on the feature branch already calculated two, so the deployed browser may have been reusing a cached `cloud-adapter.js` asset.

The preview HTML now uses explicit version query strings for both `cloud-adapter.js` and `app.js` (`?v=tombstone-projection-20261120`) to force the current feature-branch assets to be fetched together. A regression assertion checks these script URLs. The server also sets preview assets to `no-cache`.

Validation on exact code head `d728d510fcfb042c90a1374fe271862dda8b9e5b`:
- IBS CI: **256/256 passed**.
- IBS Regression Checks: **256/256 passed**.
- IBS and Kerygma source-aware regression checks: **176/176 passed**.

The refreshed Render preview still needs to be checked for the projected count of two. Do not confirm sync while the browser shows three. No cloud write or production change has occurred.


## Pending-deletion target matching diagnostics — 2026-11-20

The read-only account preview now reports whether each owned deletion target matches:
- A sermon in the current local preview cache.
- An active sermon row in the signed-in user's cloud library.

The match flags are shown alongside the tombstone's title, passage and record ID, and are repeated in the final sync confirmation. This avoids assuming that a matching title alone proves that the tombstone points to the current local or cloud record.

The current browser tab snapshot predates the new versioned script URLs. Hard-refresh the preview to load `app.js` and `cloud-adapter.js` with the updated `deletion-match-diagnostic-20261120` version. The match flags will then show whether the pending deletion actually applies to the local record and/or an active cloud record. Do not confirm sync until those flags and the projected count have been reviewed.

Validation on code head `bbed3ad2e41a1eff267fdb51f0c12de6da8b1e22`:
- IBS CI: **256/256 passed**.
- IBS and Kerygma source-aware regression checks: **176/176 passed**.

No sync or live cloud write has been started.
