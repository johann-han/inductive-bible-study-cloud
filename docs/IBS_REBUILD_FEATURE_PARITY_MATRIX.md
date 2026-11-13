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
| Evidence handoff | Partial preview implementation | Later stages can expand earlier-stage notes for the same passage in canonical order. This is contextual note handoff only; production claim-to-source links, evidence classifications and provenance remain outstanding. |
| Cross-references, markup, backup/restore | Not integrated | Existing behaviour remains in production; new-app parity is outstanding. |
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
