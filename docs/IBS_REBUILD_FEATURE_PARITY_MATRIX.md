# IBS Rebuild — Feature and Data Parity Matrix

**Baseline:** `main` at `8b39bbebc2812664765a8a4da10b33bbea9ca6ee`  
**Rebuild branch:** `feat/ibs-next-generation-rebuild`  
**Purpose:** Prevent the new front end from losing existing user capabilities or data contracts.

## Confirmed backend and deployment contracts

| Area | Existing contract | Rebuild rule |
|---|---|---|
| Hosting | Existing Render Node service; `server.js` starts with `npm start`. | Keep same origin and Node service during initial migration. |
| Health | `GET /healthz`. | Keep endpoint and health semantics unchanged. |
| Public client config | `GET /api/config` exposes Supabase URL/public anon key and AI-provider availability only. | Never expose service-role or AI provider secrets to browser code. |
| Authentication | Supabase Auth; invitation-only sign-up/access flow. | Preserve session, redirects and invitation-only restrictions. |
| Study cloud data | `public.study_records`, keyed by `user_id, book, chapter`; JSON `sections`, `active_section`, timestamps and soft deletion. | Read/write through a compatibility adapter; do not change schema in the UI rebuild. |
| Kerygma cloud data | `public.kerygma_sermons`, keyed by `user_id, sermon_id`, with JSON sermon payload and soft deletion. | Preserve records and source-study references. |
| Access requests | `public.ibs_access_requests`, server-only service-role access. | Preserve server-side access controls; no browser table access. |
| AI Mentor | Server-managed AI provider routes with Supabase session verification and rate limiting when cloud configuration is enabled. | Browser calls existing server endpoints; never move provider secrets to client. |
| Static application | Current `index.html` and `sermon/index.html` are served by existing Node host. | Keep legacy pages available during the transition and provide a reversible route to the new UI. |

## Existing test coverage to retain

The repository's Node test suite includes these named areas:

- Invitation-only access and access-request email.
- Server startup and security hardening.
- Study dashboard and study library.
- Last-read passage restoration.
- Bible search and interlinear loading/audits.
- Related passages and compact mobile related-passage UI.
- Study workflow, claim/evidence linking and evidence provenance.
- AI textual features and Mentor response filtering.
- Kerygma cloud sync and Kerygma source/AI workflows.

The CI workflow runs `npm test` on Node 22. The rebuild must keep this workflow green and add build/type/accessibility/end-to-end checks rather than replacing the current suite.

## Feature parity checklist

| Feature group | Existing capability to inventory and preserve | Required parity evidence |
|---|---|---|
| Identity and access | Sign-in, sign-out, invitation-only registration, access requests, admin invitation/review tools. | Auth journey and role/permission tests. |
| Home | Resume active study at exact saved stage; recent studies; create/open study; admin controls. | Resume and create journeys on desktop/mobile. |
| Bible navigation | 66-book navigation, OT/NT, chapter selection, previous/next, translation selection, Bible search. | Navigation and search regression tests. |
| Scripture reading | Verse rendering, selection, copy, last-read restore, fullscreen, translation context. | Passage/verse interaction tests. |
| Study stages | Observe, Interpret, Doctrine, Discipleship/Application; stage guidance and review status. | Stage transition and note-preservation tests. |
| Notes | Autosave, cloud sync, active-stage pointer, word count/search, history/version snapshots, export. | Local/cloud round-trip, offline/retry and export tests. |
| Evidence | Carried-forward evidence, statement-to-evidence links, source provenance, classifications. | Provenance and no-silent-overwrite tests. |
| Scripture markup | Observation/repeated/contrast/command/promise and other existing markup behaviours. | Save, reload, selection and backup/restore tests. |
| Research | Strong's, Greek/Hebrew/Aramaic morphology, interlinear, lexicons, word popovers, verse maps, outlines. | Source data integrity and contextual mapping tests. |
| References | Standard cross-references, user cross-references, related passages. | Persistence, source attribution and responsive modal tests. |
| AI Mentor | Stage-aware guidance, active passage/selection context, explicit insertion into notes. | Context, stage adherence and user-control tests. |
| Library and recovery | Search/filter, backup/restore, deletion/recovery, imports/exports. | Restore deleted study and legacy backup compatibility. |
| Kerygma | Sermon studio, AI flows, cloud save/sync, IBS import/source links. | Existing Kerygma regression workflows and round-trip tests. |
| PWA and device support | Manifest, service worker, install prompt, cache versioning, mobile behaviour. | Installability and update/cache tests. |

## Rebuild implementation status

**Reviewed at commit:** `8884d142c4277b3ab563c86912a8585e8db77f67`

| Area | Status in next-generation branch | Boundary / remaining work |
|---|---|---|
| Visual workspace | Preview baseline implemented | No full browser screenshot/accessibility acceptance yet. |
| Bible canon and chapter reading | Partial implementation | Complete chapter requests for KJV/BSB/ASV/WEB/BBE; source and offline behaviour covered by tests. |
| Last-read passage | Implemented against existing key | Reader restores and updates `inductive-bible-study-last-reading-v1`. |
| Word annotation and lexicon | Partial implementation | KJV source offsets, BSB gloss alignment, Strong’s toggle off by default, STEPBible lexicon entries. Additional Greek/Hebrew/Aramaic morphology and original-script displays remain. |
| Preview notes | Implemented locally only | Per-passage, per-stage auto-save under the preview-specific key; visible save state. Stage indicators derive from non-empty saved notes and survive reloads. Not production storage or cloud sync. |
| Preview study library | Implemented locally only | Lists non-empty preview drafts, note progress, active stage and search; resumes the draft in the preview. It does not show the real production library. |
| Preview Overview dashboard | Implemented locally only | Overview is now the preview landing view, with accurate draft/stage/word totals, saved preview drafts and direct navigation to the reader/library. It explicitly identifies browser-only data and is not the authenticated production home. |
| Cloud study adapter | Pure conversion layer implemented and tested | Preserves four stage bodies and known/unknown JSONB fields; no Supabase client, network calls or writes. |
| Doctrine active stage | Compatibility mapping proposed and unit-tested | Uses `sections._activeStage` and constrained `active_section='interpret'`. Must not be enabled until legacy-client metadata loss and rollout compatibility are resolved. |
| Authentication / user identity | Contract inventoried; not integrated | Invitation-only Supabase sign-in/session, access-request and admin authorization routes are mapped. Wait for an isolated preview Supabase target before integration or credential-based tests. |
| Production study library and sync | Not integrated | Must be built against the verified cloud/local contract and safely tested with isolated data. |
| Evidence handoff | Partial preview implementation | Later stages can expand earlier-stage notes for the same passage in canonical order. Contextual note handoff remains separate from claim-to-source records. |
| Claim and evidence manager | Partial preview implementation | Browser-local evidence records are grouped by claim text; records can be classified as supporting, challenging, qualifying or contextual. Strong’s lexicon and standard/user cross-reference records can be attached with source provenance. No automated proof verdict or Supabase persistence; researcher review remains required. |
| Cross-references | Preview user-created passage links implemented | Dedicated preview-only storage, source/target book and chapter selection, optional verse-level links, explanatory notes, passage navigation and deletion. Standard cross-reference dataset and legacy related-passage behaviour remain outstanding. |
| Scripture markup | Partial preview implementation | Verse-level observation tags (key word, repeated idea, contrast, command, promise, question) save in a dedicated preview key. Full legacy word-level markup, symbols and backup/restore parity remain outstanding. |
| Backup and restore | Not integrated | Existing behaviour remains in production; new-app import/export and recovery parity are outstanding. |
| AI Mentor and Kerygma | Not integrated | Preserve current server routes and cloud sermon contracts; reintroduce after authenticated data context is safe. |

## Adapter design decisions

- The study-record adapter is a pure module. It performs no fetch, Supabase initialization, browser storage access, or write.
- The new app writes only known columns in the existing `study_records` table shape; additional metadata is preserved inside the existing JSONB `sections` object.
- All four stage strings (`observe`, `interpret`, `doctrine`, `apply`) remain unchanged.
- The database currently rejects `doctrine` in `active_section`. The proposed new-client marker is `sections._activeStage`; legacy clients currently serialize a fixed set of JSONB metadata fields and may discard unknown markers on a later sync. This is a release blocker, not a solved migration.
- The adapter covers all enumerated metadata fields: Scripture markups, cross-references, related passages, verse maps, passage outline, note version history, evidence links, study claims and stage reviews. It also preserves unknown JSONB extension keys during the new-client round trip.
- The existing app continues to run from `main`; the new UI is accessible only through the PR preview route.

## Data compatibility rules

1. Existing localStorage keys and IndexedDB/sql.js databases must be inventoried before changing storage code.
2. New application state must not create a second competing store for studies or notes.
3. Existing study records without newer optional metadata must load safely.
4. Unknown fields in JSON payloads must be retained during read-modify-write operations where possible.
5. Cloud sync must continue to respect user ownership, soft deletion and timestamps.
6. Backup files produced by the current app must remain restorable by the new app.
7. Exported studies must preserve verse references, translations, stage boundaries, evidence links and provenance.
8. Kerygma sermon records and IBS source links must remain intact.
9. No production data migration is allowed as part of the initial UI rebuild.

## Confirmed Phase 0 inventories

- Legacy browser keys, including workspace-width preference and the per-passage legacy note-key pattern, are inventoried in IBS_REBUILD_PHASE0_AUDIT.md.
- The SQL.js in-memory schema is inventoried: lexicon and word_map, with its bounded seed data.
- Server API route and authentication/authorization contracts are inventoried in IBS_REBUILD_PHASE0_AUDIT.md.
- Cloud study records are browser-Supabase operations under RLS; no separate study REST route exists.

## Remaining discovery and release gates

- Finish mapping current DOM controls/events to domain capabilities and confirm request/response payload schemas where a new client will call them.
- Confirm exact Woord van Lewe font/logo assets if the rebuild needs to match them; the current visual baseline has already been accepted.
- Provision and verify an isolated IBS staging Supabase project and confirm Render PR-preview environment variables target only it (or remain absent).
- Resolve Doctrine active-stage compatibility and legacy unknown-JSON preservation across mixed client versions.
- Complete browser-level acceptance for desktop, tablet and mobile, including accessibility and PWA install/update behaviour.

Do not begin write-capable cloud integration until the staging target and compatibility contracts are independently verified.

## Evidence reassessment and rationale (2026-11-15)

- Existing evidence records can now be reclassified in place as supports, challenges, qualifies, or context/background; the claim-level summary recalculates from the updated records.
- Each newly created evidence record can include a short researcher-authored rationale explaining why the source has that relationship to the claim.
- The rationale is optional and backward-compatible with previously saved browser-local records. It is displayed separately from the source detail and provenance.
- Assessment rationale can also be edited directly on an existing evidence card, so researchers can refine or correct their reasoning after further passage review. Edits are stored with the browser-local evidence record.

- These controls improve traceability but do not automate source evaluation or establish a claim's truth. Evidence remains browser-local in the isolated preview.
- Implementation commits: `2a57cc875475eba748f480e73c502321132e90ab`, `e683d939a2bc2d9c9685a89fcfc213d2344f342c`, `5707700b73780c136825bdc397e940f6d6da24e6`, `27b43c440873d77bd59ec359c135a0b0df346c8c`.
 
### Researcher-assessed source quality (2026-11-16)
- Evidence records now carry a source-quality assessment independently of their relationship to a claim: not assessed, strong, moderate or limited.
- Researchers can record and revise a rationale for each quality judgement, both when adding evidence and on existing evidence cards.
- Claim summaries report the quality distribution separately from support/challenge/qualification/context counts.
- Legacy records remain valid and default to **not assessed**; no quality is inferred from source type or relationship.
- The interface explains that these are researcher judgements, not automated reliability scores. Consider expertise, proximity to evidence, method, date and corroboration when assessing a source.
- Preview-only browser storage remains isolated from production study data.
 
### Morphology explanations and source verification (2026-11-16)
- Clicking a Strong's-annotated word now carries its exact word-level morphology annotation into the lexicon panel.
- The word-study panel explains recognised grammatical labels in plain language, including part of speech, Greek tense/aspect, mood, voice, person, number, case and gender, plus common Hebrew stems and forms.
- The supplied Greek parsing pattern `Verb - Imperfect Indicative Active - 3d Person Singular` is decomposed into six separately explained terms.
- The imperfect explanation distinguishes past-time imperfective presentation from a simplistic “continuous action” rule. The guide repeatedly cautions that syntax and context determine interpretation.
- Unknown parsing labels remain visible but are not assigned invented definitions.
- Evidence records now have a separate researcher-managed verification status: not checked, source opened, content checked against the claim, or independently corroborated. Verification notes are editable on existing records.
- Claim summaries show verification counts separately from claim relationship and source-quality counts. The interface does not claim to automatically validate external URLs or source content.
- All new fields remain optional/backward-compatible for legacy browser-local records; preview remains isolated from production data.


## PR #188 preview addendum — 17 November 2026

The following capability increments are implemented on `feat/ibs-validated-archive-import`. They remain confined to the PR preview; they do not change the production application or Supabase records.

| Area | Current PR #188 preview status | Acceptance boundary |
|---|---|---|
| Study Note History | Implemented in both Active Study and Study Notes editors. Up to eight snapshots are retained per passage, automatic capture is throttled to two minutes, identical content is not duplicated, and restoration first preserves the current note state. All four stage bodies and the active stage are included. | User confirmed the History control is visible and functional in the PR #188 preview on 17 November 2026. |
| Backup and restore | Browser-local archive version 2 supports twelve stores, including saved Word Studies and Recently Deleted study records. Version 1 workspace archives and legacy dossier archives remain importable. Preflight conflict decisions and transactional rollback are retained. | PR #187 to PR #188 recovery and round-trip preservation were confirmed. No cloud or production records are included. |
| Word Studies | A dedicated, searchable collection stores the Strong's identifier, lexical entry and senses, exact verse occurrence (including source offsets), translation, occurrence morphology, source attribution and researcher notes. Saved entries can reopen their verse and hand off the full source record to Evidence Manager. Word Studies participate in archive export/import. | User confirmed the Word Studies workflow works in the PR #188 preview on 17 November 2026. The Evidence Manager handoff is newly implemented and awaits browser acceptance. |
| Supporting Evidence Editor | The Supporting evidence field in Evidence Manager has a dedicated Expand editor / Collapse editor control. Expanded height is viewport-relative and responsive on desktop and mobile; existing text is preserved when collapsing. | User confirmed the control works in the PR #188 preview on 17 November 2026. |
| Storage boundary | Note history and Word Studies use preview-specific browser storage. Archive restore writes only stores present in the selected archive and keeps the existing merge/replace decisions. | Do not clear PR #188 preview site data or switch preview origins while the recovered local workspace is in use. |

### Saved Word Study → Evidence Manager handoff
- A saved word study now has an **Attach to evidence** action.
- The action switches the active study to the word study's own book, chapter and translation, and restores that passage's active stage.
- It prepopulates the Evidence Manager with the saved Strong's ID, verse reference, source, source URL/ID, lexical glosses and senses, exact morphology, occurrence offsets, verse wording and researcher notes.
- It does not invent a claim, automatically classify the item as supporting evidence, or mark the source verified. The researcher must formulate the claim, choose the relationship/quality and perform source verification.
- The data conversion is covered by isolated unit tests. PR preview browser acceptance remains pending.


### Supporting Evidence Editor expansion (2026-11-17)
- The Supporting evidence field has an independent **Expand editor / Collapse editor** control; it does not expand the entire Evidence Manager.
- The expanded writing area is viewport-sized on desktop and mobile, remains manually resizable, and preserves its content when collapsed.
- Browser acceptance was confirmed by the user in the PR #188 preview on 17 November 2026.
- Implementation commit: `8a4ab256fa5184033661fdee2bc2fdc4005943d6`.
- CI completed successfully: TypeScript check, Vite build, and 343/343 tests passed.


### PR #190 integration — Study Library recovery (2026-11-18)
- Recently Deleted uses a dedicated preview-only storage key. Soft deletion retains the original passage, all four study-stage notes, active stage and note-version history.
- Restore returns a study to its original passage key and refuses to overwrite an active study at that passage. Permanent deletion remains a separately confirmed action.
- Archive version 2 now recognises **twelve** stores. The new `deletedStudies` collection has explicit schema validation, unique record and passage identity checks, preflight conflict detection, and merge/replace/duplicate handling.
- Import writes the trash store through the existing transactional archive storage adapter and refreshes the Recently Deleted view after a successful restore. Older v2 archives that predate the trash collection remain valid; absent stores are not written or cleared.
- The recovery UI and archive logic remain local to the PR preview. No production, Supabase, Render deployment or `main` data is changed.
- Automated tests cover archive export/import round-trip, note-history preservation, deleted-study conflicts and rejection of malformed or ambiguous trash records. Actual browser acceptance remains a release gate.


### Read-only Study Library integrity audit — PR #190
- The Study Library exposes **Run integrity check**, which audits the preview-specific active drafts and Recently Deleted stores without modifying either one.
- The report checks raw JSON readability and root structure; canonical Bible passage keys; invalid records; repeated active or deleted passage identities; duplicate deleted-study IDs; all four note-stage fields; active-stage values; and note-version history structure.
- Findings are classified as errors or warnings, with a recommended next action. A malformed store is reported as unreadable rather than silently normalized or reset.
- The audit does not repair, rewrite, merge, or remove records. The report is limited to these two recovery stores and is not a certification of other research stores, archive media or external backups.
- Automated tests cover healthy state, malformed JSON, invalid active records, duplicate deleted passages, incomplete note records, invalid note history and the unchanged-storage guarantee.
- Branch: `feat/ibs-study-library-recovery-import`; PR: [#190](https://github.com/johann-han/inductive-bible-study-cloud/pull/190). Browser acceptance remains required before merge.

### Render preview isolation — PR #190
- The repository Blueprint config sets `previews.generation: automatic` for the IBS web service.
- Render documents that a pull-request service preview initially copies the base service's settings, including environment variables. Therefore, previews must not assume inherited cloud credentials are isolated.
- The server detects Render's `IS_PULL_REQUEST=true` flag and returns HTTP 503 for every `/api/*` request before any application API handler executes. This prevents preview pages from reaching the configured Supabase, admin, sync and AI API handlers.
- `tests/preview-api-isolation.test.js` verifies that the preview guard appears before the first API route and that the production handlers remain behind the guard.
- Preview-local Study Library and recovery operations remain browser-storage only. Do not enable cloud features in the PR preview without a separate staging backend and explicit isolation verification.
