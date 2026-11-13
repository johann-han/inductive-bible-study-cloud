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

## This implementation milestone

The new read-only Bible layer is isolated in \`next-app/src/lib/bible.mjs\`. It contains the 66-book canon, book/chapter validation, source selection and last-read compatibility. The React reader uses the complete returned chapter rather than an embedded eight-verse illustration. Copying the selected verse and translation/book/chapter navigation are included.

The reader also has optional Strong’s display, switched off by default. KJV annotations retain their original character offsets and are accepted only when the bounds and Strong’s IDs validate. BSB word alignment follows the existing app’s ordered gloss-matching method; unmatched glosses remain untagged. Selected words open a STEPBible Brief Lexicons entry, and missing senses are reported as unavailable rather than replaced with generated definitions. Optional annotation failures do not prevent the Scripture chapter from loading.

The preview-specific notes layer now auto-saves the four stage drafts per passage under `ibs-next-generation-preview-drafts-v1`. It uses a key reserved for this new preview and does not reuse or overwrite the current app’s study-library or note keys. Browser storage failures are surfaced in the editor status rather than falsely reporting a save.

The new `study-records.mjs` adapter is a pure conversion layer for the existing `study_records` shape. It preserves the four stage bodies, all currently enumerated metadata fields, unknown JSONB keys, and unknown local record properties. Doctrine stage compatibility is encoded through `_activeStage` while keeping `active_section` within the existing three-value check constraint. Ten adapter tests cover the schema boundary, unknown-field round trips, timestamps and invalid records. Network access and cloud writes are not part of this module.

The layer intentionally does not:
- connect to Supabase or write production data;
- sync notes or study stages to the cloud;
- load additional Greek/Hebrew morphology, original-script interlinear displays, or lexical usage counts;
- claim that research, evidence handoff, AI, or Kerygma are integrated.

## Remaining blockers and next phases

1. Inspect the complete login/session lifecycle and ensure a preview Supabase target is isolated before adding even read access to user records.
2. Design a Doctrine active-stage compatibility contract that preserves older client sync behaviour and unknown JSON fields. This needs tests against the existing cloud row shape before any data adapter is enabled.
3. Inventory and port related passages, study markup, claims/evidence, verse maps, outlines, export, backup/restore, note history, search, and deletion/recovery.
4. Reconnect KJV/BSB interlinear and Strong's annotations with source provenance and verified word offsets.
5. Reconnect AI Mentor and Kerygma through their existing server endpoints and current context contracts.
6. Add route-level and browser-level tests for auth, passage navigation, notes, sync, stage transitions and recovery.

## Safety gates
- Keep this PR draft and separate from \`main\`.
- No production Supabase writes or DDL.
- No changes to the production Render service or domain.
- Keep the existing regression suites and add new coverage.
- Do not advertise unsaved preview notes as persistent.
