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

## Known unresolved discovery items

- Exact inventory of all localStorage/sessionStorage keys and sql.js database tables.
- Complete API route catalogue and request/response schemas from `server.js`.
- Complete mapping of current DOM controls/events to domain capabilities.
- Exact Woord van Lewe CSS colour values, font-family names and logo asset references from the live WordPress theme.
- Preview service environment isolation and safe Supabase target.
- Browser-level acceptance baseline for desktop, tablet and mobile.

These are Phase 0 blockers. Do not begin write-capable data integration until the relevant contracts are documented and the preview database target is verified.
