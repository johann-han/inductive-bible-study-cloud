# IBS rebuild — Phase 0 integration audit

**Branch:** \`feat/ibs-next-generation-rebuild\`  
**Scope:** Read-only inspection of the current application and the connected IBS Supabase schema.  
**No production records, schema, or settings were modified during this audit.**

## Confirmed production compatibility contracts

### Existing study storage
- Local study library key: \`inductive-study-library-v1\`
- Local deletion markers: \`inductive-study-library-deleted-v1\`
- Last reading pointer: \`inductive-bible-study-last-reading-v1\`
- Last active study pointer: \`inductive-bible-study-last-active-study-v1\`
- Legacy note keys: \`inductive-notes:{book}:{chapter}:{OT|NT}\`
- Four study sections are represented as \`observe\`, \`interpret\`, \`doctrine\`, and \`apply\`.
- The current cloud payload stores notes and metadata in \`study_records.sections\` JSONB. Existing metadata includes scripture markups, cross-references, related passages, verse maps, passage outline, version history, evidence links, study claims, and stage reviews.


### Browser storage and local database inventory
A direct source inventory of the production index.html found these browser-persistence contracts:
- `inductive-study-library-v1`: local study records.
- `inductive-study-library-deleted-v1`: local deletion tombstones; sync uses timestamps and deletion wins on ties.
- `inductive-bible-study-last-reading-v1`: last book, chapter and translation.
- `inductive-bible-study-last-active-study-v1`: last active book, chapter and study section.
- `inductive-notes:{book}:{chapter}:{OT|NT}`: legacy per-passage note keys, read during migration into the study library.
- `inductive-bible-study-workspace-width-v1`: adjustable workspace width.

No sessionStorage or native indexedDB access was found in the inspected application source. The SQL.js setup creates a fresh in-memory SQLite database at app initialization; no database persistence was found in that initialization path. It defines two tables:
- lexicon(id, lemma, translit, phonetic, pos, gloss, def, usage, source).
- word_map(word, strong_id).

The source seeds 12 explicit lexicon rows and 43 English-word-to-Strong's mappings. This is a small legacy lookup aid, not comprehensive lexical coverage and not a persistent user database. The rebuild's HelloAO / STEPBible Strong's layer is separate from these seed rows.

### Live Supabase schema observation
The connected IBS project exposes three public tables:
- \`study_records\`, with row-level security enabled and ownership scoped by \`user_id\`.
- \`kerygma_sermons\`, with row-level security enabled and ownership scoped by \`user_id\`.
- \`ibs_access_requests\`, with RLS enabled and no browser policies; access is intentionally server-only through the Node service role.

The live \`study_records.active_section\` check constraint permits only \`observe\`, \`interpret\`, and \`apply\`. The JSONB \`sections\` payload contains the Doctrine key, so Doctrine text is stored, but the active-stage column cannot currently represent Doctrine. A read-only aggregate query found 8 non-deleted study records; all 8 had a Doctrine key and 3 had non-empty Doctrine text. No note contents were queried.

**Compatibility decision:** do not write \`doctrine\` into \`active_section\` until a separately approved schema strategy exists. Do not silently rewrite Doctrine text or change the production constraint as part of the front-end rebuild. Any adapter must preserve the active section supported by the live database and preserve the four note bodies and unknown JSON metadata.

### Bible sources already used by the current application
- KJV primary text source: Free Use Bible API / HelloAO, endpoint pattern \`/api/eng_kjv/{bookId}/{chapter}.simple.json\`.
- KJV word annotations are a separate data layer from \`.words.simple.json\`; these annotations are not yet connected in the new reader.
- BSB source: \`/api/BSB/{bookId}/{chapter}.simple.json\`. The current app does not silently substitute another translation when BSB is unavailable.
- ASV, WEB, and BBE are loaded through \`bible-api.com\` using a translation query parameter.
- KJV retains the existing \`bible-api.com\` fallback if the HelloAO primary source is unavailable.
- The existing last-read browser key is \`inductive-bible-study-last-reading-v1\`; the new reader reads and writes the same shape: book, chapter, translation.

## Existing Node server API and identity contract

The current server.js route inventory was inspected read-only:

| Route | Method | Access and behaviour |
|---|---|---|
| /healthz | GET | Public health check; returns service status only. |
| /api/config | GET | Public settings only: Supabase URL, anon key and AI-provider availability. Service-role and AI-provider secrets are not returned. |
| /api/standard-cross-references | GET | Public validated TSV dataset; cached for six hours with stale-while-revalidate. |
| /api/access-requests | POST | Public invitation request; validated and rate-limited, stored via server-only service role. Does not create an Auth account. |
| /api/admin/status | GET | Requires verified Supabase bearer session; admin also requires confirmed email in IBS_ADMIN_EMAILS. |
| /api/admin/access-requests | GET | Confirmed configured admin only; returns up to 50 pending requests. |
| /api/admin/invite | POST | Confirmed configured admin only; server-side invitation, rate-limited. |
| /api/admin/access-requests/:id/invite | POST | Confirmed configured admin only; sends invitation and marks request invited. |
| /api/admin/access-requests/:id/decline | POST | Confirmed configured admin only; marks pending request declined. |
| /api/mentor | POST | AI Mentor route; rate-limited and session-verified whenever cloud auth is configured. |
| /api/sermon-ai | POST | Kerygma AI route; requires configured AI and Supabase auth, with per-user rate limiting. |

There is no application-owned REST endpoint for study records. The signed-in browser Supabase client reads and upserts public.study_records directly; row-level security scopes those operations to the current auth.uid(). Kerygma uses its own Supabase cloud-sync path for public.kerygma_sermons. The PR-preview API guard blocks every /api/* route until a dedicated staging target exists.

### Authentication lifecycle inspected
- The browser requests /api/config, then initializes Supabase JS v2 with persistent sessions, automatic token refresh and invitation redirect detection.
- Sign-in uses signInWithPassword; sign-out uses signOut; session recovery uses getSession; UI state follows onAuthStateChange.
- There is no public auth.signUp() flow. New accounts are provisioned through server-side invitations by a configured administrator.
- Invited users may submit an access request, but that only creates a pending request for review; it does not create an account.
- Admin status is checked server-side against the configured, confirmed-email allowlist. Client-side user metadata is not admin authority.
- The new UI must reproduce invitation-only sign-in/out, invitation callback/password setup, session-expiry handling and admin gating. These remain unimplemented until staging is isolated.

## This implementation milestone

The new read-only Bible layer is isolated in \`next-app/src/lib/bible.mjs\`. It contains the 66-book canon, book/chapter validation, source selection and last-read compatibility. The React reader uses the complete returned chapter rather than an embedded eight-verse illustration. Copying the selected verse and translation/book/chapter navigation are included.

The reader also has optional Strong’s display, switched off by default. KJV annotations retain their original character offsets and are accepted only when the bounds and Strong’s IDs validate. BSB word alignment follows the existing app’s ordered gloss-matching method; unmatched glosses remain untagged. Selected words open a STEPBible Brief Lexicons entry, and missing senses are reported as unavailable rather than replaced with generated definitions. Optional annotation failures do not prevent the Scripture chapter from loading.

The preview-specific notes layer now auto-saves the four stage drafts per passage under `ibs-next-generation-preview-drafts-v1`. It uses a key reserved for this new preview and does not reuse or overwrite the current app’s study-library or note keys. Browser storage failures are surfaced in the editor status rather than falsely reporting a save.

The Study Library view now lists only real, non-empty drafts stored by the new preview, with stage progress, active-stage restoration and passage/note search. These records remain preview-specific; the view does not claim to contain or replace the production Study Library.

The new `study-records.mjs` adapter is a pure conversion layer for the existing `study_records` shape. It preserves the four stage bodies, all currently enumerated metadata fields, unknown JSONB keys, and unknown local record properties. Doctrine stage compatibility is encoded through `_activeStage` while keeping `active_section` within the existing three-value check constraint. Ten adapter tests cover the schema boundary, unknown-field round trips, timestamps and invalid records. The preview Study Library also has regression coverage for filtering empty records, counting words, stage progress, and restoring each passage’s active stage. Network access and cloud writes are not part of this module.

The layer intentionally does not:
- connect to Supabase or write production data;
- sync notes or study stages to the cloud;
- load additional Greek/Hebrew morphology, original-script interlinear displays, or lexical usage counts;
- claim that research, evidence handoff, AI, or Kerygma are integrated.

## Supabase project inventory and preview isolation

The connected Supabase organization currently contains the active IBS production project, an inactive BSMP project, and a separate Mail Assistant project. There is no dedicated IBS staging project. The existing non-IBS projects must not be reused as IBS staging.

The PR-preview server now checks Render's `IS_PULL_REQUEST=true` flag before routing any `/api/*` request. In that environment it returns HTTP 503 before reaching `/api/config`, Supabase auth/admin routes, cloud study sync paths, AI routes or other existing APIs. This prevents inherited production environment variables from being exposed or used through the PR preview. Production startup is unchanged because the guard is conditional on Render's PR-preview flag.

Until a dedicated IBS staging backend is provisioned and explicitly configured on the PR preview service:
- do not enable sign-in, cloud study sync, admin actions, access requests or AI API calls in the preview;
- do not run write-capable tests against the production IBS project;
- do not point the PR preview at the live production Supabase project, even for read-only user-library testing;
- keep the new UI's study records isolated to the preview-specific browser storage key.

## Remaining blockers and next phases

1. Provision and verify an isolated IBS staging project; only then use it for sign-in, cloud sync and admin integration testing.
2. Design a Doctrine active-stage compatibility contract that preserves older-client sync behaviour and unknown JSON fields. The legacy serializer can discard unknown JSONB keys, so _activeStage is not yet a safe cross-version marker.
3. Finish mapping DOM controls to domain capabilities and port related passages, markup, claims/evidence, verse maps, outlines, export, backup/restore, note history, search, deletion/recovery and panel preferences.
4. Complete original-language parity: Greek/Hebrew/Aramaic morphology, original-script interlinear displays, lexical usage and morphology-to-token mapping beyond the current KJV/BSB Strong's layer.
5. Reconnect AI Mentor and Kerygma through existing server endpoints and current context contracts, using isolated staging data.
6. Add route-level and browser-level tests for invitation-only auth, passage navigation, notes, sync, stage transitions, backup/restore and mobile accessibility.

## Safety gates
- Keep this PR draft and separate from \`main\`.
- No production Supabase writes or DDL.
- No changes to the production Render service or domain.
- Keep the existing regression suites and add new coverage.
- Do not advertise unsaved preview notes as persistent.
