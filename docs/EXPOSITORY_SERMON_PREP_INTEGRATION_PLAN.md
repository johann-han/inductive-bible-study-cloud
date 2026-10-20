# Integration Plan and Handover: Inductive Bible Study Workspace + Expository Sermon Preparation Studio

Document status: Phase 1–3 implementation is merged into `main`; source-level checks passed. Live Render/browser import round-trip testing remains pending.
Last reviewed: 20 October 2026.
Purpose: preserve decisions and exact next steps if the current chat reaches its maximum length.

## 1. Executive decision

Build a staged connection between the Inductive Bible Study Workspace (IBS) and the separate Expository Sermon Preparation Studio (called “Kerygma” in its header).

The governing workflow is:

Observe the text → Interpret its meaning → Establish Doctrine → Develop Discipleship → Prepare the sermon Big Idea → Build the homiletical outline → Develop illustrations and applications → Write the manuscript.

IBS is the source of the documented textual and interpretive work. Kerygma is the sermon-development workspace. The sermon should be built from the completed study, not used to predetermine the interpretation.

**Chosen deployment layout:** keep both applications in the existing `johann-han/inductive-bible-study-cloud` repository and use its existing Render Node web service. IBS stays at `/`; Kerygma is now merged at `sermon/index.html` and will be served at `/sermon/index.html` once Render deploys the latest `main` commit. The current Node server serves files from subpaths. This avoids a second repository or Render service and gives both pages the same HTTPS origin. Keep the interfaces and records separate; do not redesign either app.

**First integration method:** explicit, versioned JSON export from IBS and JSON import into Kerygma. The IBS export has been confirmed by a user-uploaded packet. The importer and source panel are merged; deployment and manual round-trip testing are the next gate. Same-origin hosting does not mean the apps share storage implicitly.

## Implementation progress — 20 October 2026

- Deployment choice: keep both apps in the existing IBS repository and Render service. IBS stays at `/`; Kerygma is merged at `sermon/index.html` and is intended for `/sermon/index.html` after Render deploys.
- The supplied Kerygma HTML is preserved as the source file; SHA-256: `2fb84cecaa19255491dda8aeaa5e8bd125cab91d9dc21ab621ea7524f7a91656`.
- Phase 1: a version 1 transfer contract is implemented in the export builder. The packet format is `inductive-bible-study-sermon-source`.
- Phase 2: IBS-side JSON export is committed. Main implementation: [2dd717f](https://github.com/johann-han/inductive-bible-study-cloud/commit/2dd717f13a9ee7d40541334ce7360ff6eca404c2). Passage-text escaping correction: [1078da7](https://github.com/johann-han/inductive-bible-study-cloud/commit/1078da7a1bd49d9220bb34705ad7dc6d7619e4f9).
- Source checks passed: all inline JavaScript parses; schema version and four-stage mapping pass; invalid markup is filtered; personal and standard cross-references remain separate; TSK-derived source attribution is included; JSON round-trip passes; verse-text normalization and line breaks passed a targeted test.
- User confirmed IBS export by uploading `Romans-2-sermon-source.json` on 20 October 2026. It parses as format `inductive-bible-study-sermon-source`, version 1; it includes all 29 verses of Romans 2 in KJV because the exported reference is `Romans 2` (not Romans 2:1–16), four study sections, six outline sections, one verse map, one personal cross-reference, 29 standard cross-reference entries, dataset attribution and CC BY 4.0 licence. No API key field is present.
- Phase 3 implementation was merged into `main` by [PR #1](https://github.com/johann-han/inductive-bible-study-cloud/pull/1), merge commit `8f70b3085a89ef1c94c56f0d746257594a35d4eb`. Kerygma lives at `sermon/index.html`; it imports version 1 JSON after preview/confirmation, validates passage reference and structure, stores source evidence under `inductiveStudySource`, and does not silently overwrite hand-written sermon fields. Its source panel separates personal and standard cross-references with provenance.
- The Kerygma browser code no longer calls Gemini directly or stores a Gemini API key. `/api/sermon-ai` uses the Gemini API through server-side `GEMINI_API_KEY` and optional `GEMINI_MODEL` environment variables, preserves the source app's structured JSON response schema, requires a valid signed-in Supabase session, and is rate-limited with request-size limits. The key must never be pasted into Kerygma or committed to GitHub. `/api/config` exposes only a boolean `geminiConfigured`, never the secret. If the Render service has no `GEMINI_API_KEY`, study import and local sermon work still function, but AI actions show a setup warning. AI prompts do not yet use the imported source packet; Phase 4 waits for manual live import/save/reload testing.
- Source-level checks passed: both inline Kerygma scripts parse; uploaded Romans packet passes importer normalization; unsupported packet versions and cross-chapter sermon references are rejected; server syntax parses; the existing `/api/mentor` and root static route remain present. No live Render/browser test has yet been performed.
- The feature branch was merged into main as commit `8f70b3085a89ef1c94c56f0d746257594a35d4eb`. This confirms repository state only; it does not prove Render has finished deploying. Verify the live route before claiming deployment success.
- Latest known IBS index blob after export commits: `c0269f7a1826d911d786cbb5aa2b36247dc01ff8` (fetch again before edits).

## 2. Current baseline — do not lose this information

### Inductive Bible Study Workspace

- Repository: https://github.com/johann-han/inductive-bible-study-cloud
- Branch: main
- Last verified main tip immediately before the handover update: `8f70b3085a89ef1c94c56f0d746257594a35d4eb`.
- Latest main `index.html` blob SHA at the same check: `1520784af128c6033bc9a919121c53347dfe5d46`.
- Live application: https://inductive-bible-study-workspace.onrender.com/
- Render is configured to deploy from the repository; verify the actual deployment after every code commit.
- This document-only change must not be treated as implementation of integration functionality.

Current IBS features include the four study stages Observe, Interpretation, Doctrine and Discipleship; Bible reading; Strong’s word studies; verse mapping; editable passage outlines; visual scripture markup; personal cross-references; standard TSK-derived cross-references; note version history and recovery; local saving; optional Supabase cloud sync; full backups; Markdown exports; and publication-ready HTML reports.

Relevant code in IBS index.html:
- Study data key: inductive-study-library-v1
- Study record key format: book::chapter
- Main access helpers: readStudyLibrary(), writeStudyLibrary(), getStudyRecord(), saveActiveStudyNote()
- Markdown export: downloadStudyMarkdown(record)
- Publication report: buildStudyReportHtml(...)
- Study record data includes sections, passageOutline, verseMaps, scriptureMarkups, crossReferences and versionHistory.
- The section persistence keys are observe, interpret, doctrine and apply. The user-facing “Discipleship” section deliberately keeps the apply key for backward compatibility.
- Custom cross-references and standard TSK cross-references are distinct features. Keep their provenance separate in any transfer packet.
- Cloud sync serializes many structured fields into the existing study_records.sections JSON object; do not casually alter its current schema during the first export/import phase.
- Note history is for recovery and does not need to be included in the default sermon source packet. Do not expose or transfer all history by default.

Inspect the live main index.html again before any code change. Never assume these SHAs remain current in a later chat.

### Expository Sermon Preparation Studio / Kerygma

- Uploaded source filename: index.html
- SHA-256 of the supplied upload at review time: 2fb84cecaa19255491dda8aeaa5e8bd125cab91d9dc21ab621ea7524f7a91656
- This SHA is for the supplied upload, not a repository commit.
- The uploaded file is a standalone HTML app using Tailwind CSS, Lucide icons and the ExpositoryStudio JavaScript class.
- The supplied Kerygma HTML has no separate repository. Its chosen home is `sermon/index.html` in the existing IBS repository; the existing Render service will serve it at `/sermon/index.html`. Keep its code and UI separate from the root IBS app.

Observed current Kerygma storage and data model:
- Sermons are saved in browser localStorage under kerygma_sermons.
- The optional custom Gemini key is stored in localStorage under kerygma_gemini_api_key.
- Each sermon currently contains fields including id, title, passage, text, context, keywords, exeSubject, exeComplement, bigIdea, aim, outline, illustrations, appSeekers, appBelievers, appSuffering and manuscript.
- There are five UI workflow tabs: Text & Exegesis, Big Idea & Proposition, Homiletical Outline, Illustrations & Application, and Manuscript / Notes.
- The Outline items use reference, statement and notes.
- Kerygma currently has no structured IBS import function or dedicated source fields for all four IBS stages.
- Kerygma currently calls the Gemini API directly from browser JavaScript; see security requirements in Section 10.

Relevant method locations in the uploaded Kerygma source (line numbers refer to the supplied upload, not the IBS repo):
- API caller: callGeminiAPI(), around line 418
- Exegesis analysis: aiAnalyzeExegesis(), around line 466
- Big Idea generation: aiGenerateBigIdea(), around line 512
- Outline generation: aiGenerateOutline(), around line 558
- Application brainstorming: aiBrainstormApplications(), around line 610
- Manuscript drafting: aiDraftManuscript(), around line 673
- Default record and fields: createDefaultSermon(), around line 704
- Browser save: saveToStorage(), around line 734
- Form loading and saving: loadCurrentSermon() and updateMeta(), around lines 811 and 833
- Markdown-like outline-to-manuscript compilation: compileOutlineIntoManuscript(), around line 987
- Text export: exportSermon(), around line 1016

## 3. Intended user experience

1. The user completes and saves the passage study in IBS.
2. The user selects “Prepare Sermon” or equivalent from the active study or saved-study card.
3. IBS creates a downloadable, schema-versioned JSON packet for that passage. The user can review the content and optionally include supporting evidence before download.
4. In Kerygma, the user chooses “Import Inductive Study” and selects that JSON file.
5. Kerygma validates the file, shows a preview containing passage reference, translation, notes and supporting evidence, and asks whether to create a new sermon or import into the currently selected sermon.
6. After explicit confirmation, the tool attaches the structured study as the sermon’s source material and fills only agreed fields. Existing manual sermon work is never silently overwritten.
7. The user reviews the material before any AI operation. AI outputs are drafts/suggestions, not replacements for exegesis or the user’s theological judgement.
8. The imported source material remains accessible from all sermon workflow tabs and is saved with that sermon.
9. The user can re-import a newer study packet later. The app must show a difference/overwrite choice and preserve sermon-specific content.

## 4. Phase plan and order of work

### Phase 0 — Verify baselines and backups

Before coding:
1. Fetch the latest IBS main/index.html and record the branch tip and blob SHA.
2. Confirm the latest mobile UI changes are still present and the live app is working.
3. After Render deploys the export commits, ask the user to test the new Sermon button and confirm the JSON file downloads with the expected study fields.
4. Confirm the supplied Kerygma HTML checksum and preserve the original. Its deployment destination is the existing repository’s `sermon/index.html` path; use the current Node static server and same Render service, not a new service.
5. Completed: the IBS export was confirmed by the uploaded Romans 2 packet, and Kerygma has since been merged in PR #1. Keep the original Kerygma source copy preserved; use the current `main/sermon/index.html` for future edits.
5. Create an IBS full study backup and retain the original Kerygma file. Do not clear browser localStorage.
6. Confirm whether Kerygma’s browser-local sermons need a backup/export enhancement before integration. If so, handle that as a small, separately tested preparation step.

Completion gate: the IBS repository and Render service are verified; the supplied Kerygma HTML is preserved and its target path (`sermon/index.html`) is decided. The integration is now proceeding in staged commits.

### Phase 1 — Define and test a stable transfer contract

Document and implement a pure schema/validation layer before wiring UI. Start with one book/chapter study per packet.

Required packet structure (version 1; names can be finalized before implementation):

- format: inductive-bible-study-sermon-source
- version: 1
- exportedAt: ISO timestamp
- studyReference: object with book, chapter and display reference
- translation: translation identifier/abbreviation, if known
- sermonPassage: optional more precise sermon verse range supplied/confirmed by the user
- sourceUpdatedAt: source study updatedAt
- sections: observe, interpret, doctrine, discipleship
- passageOutline: optional title plus sections containing heading, verseRange, majorIdea and supportingDetails
- verseMaps: optional per-verse structured mapping
- scriptureMarkups: optional selected/highlighted phrase and markup type
- customCrossReferences: optional user-created cross-references, kept distinct from standard references
- standardCrossReferences: optional standard dataset references with dataset/provenance metadata, kept distinct from personal links
- selectedVerses: optional verse references if the user explicitly selected them at export time

Rules:
- Use actual stored data only. Do not synthesize absent study content.
- Omit or mark unavailable fields rather than inventing a translation, verse text or reference.
- Include only the study being exported, never the user’s full library, by default.
- Do not include versionHistory by default.
- Exclude credentials, API keys, Supabase tokens, account details and other secrets.
- Put a size limit on import (initial proposal: 5 MB) and validate the complete packet before applying any changes.
- Use a deterministic validator and normalize fields before saving.
- Version 1 initially covers a single book/chapter record. Multi-chapter sermon packets can be added later by a new schema version after single-chapter transfer is reliable.

Test the validator for a good packet, missing required fields, unsupported version, invalid Bible reference, oversized text/packet, invalid nested arrays/objects and unknown fields. Unknown optional fields should be safely ignored, not executed.

### Phase 2 — Add JSON export to IBS only

Make a small additive change in the current IBS index.html:
1. Add a “Prepare Sermon” / “Export for Sermon Prep” action near existing current-study export tools. Keep Report and Export MD intact.
2. Export one saved book/chapter study into the version 1 packet.
3. Include the four note stages and available outline, mapping, markings and references with clear provenance. Keep custom links distinct from TSK-derived references.
4. If a narrower preaching passage is needed, permit the user to enter/confirm it; do not guess verse boundaries.
5. Show a clear download/success state and explain what is included.
6. Avoid changing storage schema, cloud sync logic or the current Bible reader as part of this phase.

Test:
- Export an empty study, a partially filled study and a populated study.
- Verify all four stage labels map correctly, particularly Discipleship ↔ stored apply.
- Verify outline headings and verse ranges, maps, marks and references retain correct values and provenance.
- Verify that data absent from the local study is not invented.
- Recheck Report, Markdown, History, cloud/local saving, both cross-reference systems and mobile layout.

Commit and test the IBS export before touching the sermon tool. Wait for the user’s live-app confirmation.

### Phase 3 — Add JSON import and source display to Kerygma

Only after Phase 2 is confirmed:
1. Add a clearly labelled “Import Inductive Study” button and hidden file input.
2. Parse JSON as data; never use eval or execute packet contents.
3. Validate format/version/reference, shape, content lengths and maximum file size before mutating the current sermon.
4. Display a preview and explicit choice: “Create new sermon” or “Import into current sermon.”
5. For a new sermon, create a new unique ID. Preserve every other sermon.
6. For import into an existing sermon, ask which fields to fill and whether any existing values may be replaced. Default to preserving existing handwritten content.
7. Store the imported packet under a dedicated nested property such as inductiveStudySource on the Kerygma sermon record. Do not flatten all evidence into one text box.
8. Add a collapsible “Source Inductive Study” display that preserves Observe, Interpretation, Doctrine, Discipleship, passage outline, verse maps and cross-reference provenance. Keep it available throughout the five sermon tabs.
9. Extend loading/saving carefully. Older sermon records lacking inductiveStudySource must still load with empty source material; this must be a backward-compatible optional property.
10. Preserve existing title, reference, AI buttons, outline editing, illustrations, applications, manuscript and export workflows.

Suggested field mapping:
- study reference → Kerygma passage (only on user confirmation; keep user-provided verse range)
- available exact source passage text and translation → Kerygma text/translation metadata only if supplied and verified; otherwise ask the user to paste/select the sermon text
- IBS context / interpretation → reference material for exegesis, not an automatic replacement of handwritten context
- observations, Strong’s studies and verse maps → separate source evidence/keyword suggestions
- IBS Doctrine → a distinct theological source field; do not collapse it into Interpretation
- IBS Discipleship → starting evidence for applications, not an automatic replacement for seekers/believers/suffering application fields
- IBS passage-outline sections → previewable candidates for homiletical points. Require user confirmation before replacing/merging an existing outline
- personal and standard cross-references → two visibly distinct lists with their origin retained
- verse markup → evidence/observation display; do not treat colored highlighting as proof of an interpretation

Test import with valid and malformed JSON, duplicate imports, existing sermon with handwritten content, new sermon, old records with no source property, Unicode, long notes, unsupported versions, invalid references, mobile and desktop UI. Confirm that importing never deletes an existing sermon or silently overwrites a manuscript.

### Phase 4 — Connect the imported study to AI prompts

Do this only after import/export round-trip works and the user has confirmed it.

Modify prompts deliberately, not by appending every field blindly:
- Exegesis analysis: include available passage text, translation, existing context, observations, interpretation, original-language notes and selected verse maps. Ask AI to distinguish user source notes from additional suggestions and flag uncertainty.
- Big Idea: use the established interpretation and doctrinal conclusions to propose an exegetical subject/complement and homiletical proposition. Require the output to be traceable to the passage and avoid moving from observation directly to application.
- Outline: use the saved passage outline as evidence for textual divisions. Generate homiletical points from it without claiming that the homiletical outline is identical to the original passage outline. Preserve verse ranges and require text-based explanatory notes.
- Applications: use the user’s Doctrine and Discipleship notes as constraints and foundations. Treat applications for seekers, believers and suffering hearers as tailored developments, not as three replacements for the Discipleship stage.
- Manuscript: include the relevant core study, final user-approved Big Idea, approved sermon outline, doctrinal guardrails, chosen applications and supporting references. Avoid dumping unnecessary raw data into the prompt.
- All AI-generated content remains editable and must never replace saved source material unless the user chooses to use it.

Acceptance gate: an AI draft must reflect the imported study, preserve the intended meaning, retain the sermon’s reference/divisions, distinguish evidence from inference, and not invent sources or theological conclusions.

### Phase 5 — Make export and provenance coherent

- Preserve current Kerygma text export.
- Add imported source material to a separate appendix or clearly labelled source-notes section only if the user selects it.
- Ensure sermon export carries title, reference, Big Idea, objective, outline, applications, manuscript and optionally the original source study.
- Distinguish citations/reference notes that were in the imported study from AI-suggested references.
- Never silently claim that all standard cross-references are from TSK if they did not originate there; preserve available provenance/licensing information.
- Round-trip test: import packet → save sermon → reload browser → export sermon → confirm the source study and manuscript persist.

### Phase 6 — Optional direct integration (not part of the initial build)

Only consider shared backend synchronization after JSON integration proves useful and the Kerygma hosting/repository is confirmed.

Potential options:
1. A server-mediated API that authenticates the user and returns a selected study packet; or
2. A shared data model/database with carefully defined permissions.

Do not expose Supabase service-role credentials, Gemini/OpenRouter secrets or user notes through a public unauthenticated endpoint. Do not create a public API endpoint that allows arbitrary users to enumerate studies. Do not make direct cross-origin access to browser localStorage part of the design.

The simplest supported first release should remain downloadable JSON import/export; it is easier to validate, recover and roll back.

## 5. Data contract decisions

### Mapping from IBS

Stored keys and user labels:
- observe → Observe
- interpret → Interpretation
- doctrine → Doctrine
- apply → Discipleship

Structured data:
- passageOutline: title and outline sections with heading, verseRange, majorIdea and supportingDetails
- verseMaps: keyed by verse, with existing structured word-study, context, translation-comparison, cross-reference and response fields
- scriptureMarkups: verse, quote, translation and markup type
- crossReferences: personal links including source, target, relationship and note
- standard cross-references: obtained from the separate standard dataset; only transfer when actual results/provenance are available
- updatedAt and export timestamp: retain for source tracking
- versionHistory: do not include by default; it is for recovery, not sermon drafting.

### Suggested Kerygma extension

Add an optional nested inductiveStudySource property to each sermon. It should contain the normalized version 1 packet and minimal import metadata (importedAt, sourceReference, schemaVersion). Do not store credentials or hidden account state in it.

Keep the current Kerygma sermon fields independent; new source data must not change the semantics of text, context, keywords, Big Idea, outline, applications or manuscript.

## 6. Test gates before each next phase

Never move on just because code parses. Test in this order:
1. Syntax/integrity checks on each modified HTML file.
2. Pure schema/normalization tests.
3. IBS export file inspection and round-trip validation.
4. Kerygma import, preview, conflict choices and persistence.
5. Existing feature regression tests in both tools.
6. AI prompt spot-checks against a passage already studied by the user.
7. Live deployment verification by the user, with explicit confirmation before continuing.

Use a low-risk known study first (for example, the user’s already-tested Romans 2 study). Do not use a production sermon as the first destructive-overwrite test.

## 7. Rollback and recovery

- Make small, purpose-specific commits, one phase at a time.
- Record each commit URL and the last confirmed good commit in the handover notes.
- Never revert an entire current index.html to an old copy merely to undo one integration feature; that would remove subsequent mobile UI and recovery features.
- Roll back by reverting only the integration-specific commit(s), or by a small corrective commit.
- Keep the current working local copy of Kerygma and an IBS full backup.
- Never clear localStorage to troubleshoot integration.
- Import operations must validate first, ask for confirmation, and write only after approval.
- Include a Cancel path and preserve current state on validation failure.
- The source packet is read-only input: importing must not modify the original study in IBS.

## 8. Security and privacy

- The supplied Kerygma code stores the custom Gemini API key in browser localStorage and sends it from browser JavaScript in the Gemini URL. This is not an appropriate security model for a publicly deployed app.
- Before a public/prod sermon integration, move Gemini calls server-side and read the secret from the deployment environment; do not ask the user to paste secrets into chat.
- Do not log full study notes or manuscripts in server logs.
- Keep import local and explicit, with a clear statement of what note material will become available to the sermon generator.
- Do not send a user’s whole IBS library or all version history to the AI.
- Validate imported text size and shape, render text as text, and do not interpolate imported fields into unsafe HTML.
- If cloud-backed sermon records are later added, require authenticated, per-user authorization and test database policies.

## 9. Definition of done

Initial integration is complete only when:
- The user can export a valid passage study from IBS.
- The user can preview/import it in Kerygma.
- All four study stages map and remain separately visible.
- The outline, maps, markup and references preserve their structure and provenance.
- Existing Kerygma sermons, custom edits, manuscript and current workflows remain intact.
- Imported data persists after reload and is represented in export when selected.
- AI prompts make considered use of the study without replacing it or inventing content.
- The old and new app features have been tested in their live deployment(s).
- The user explicitly confirms success before the next phase begins.

## 10. New-chat recovery instructions (copy this section into a new chat)

We are integrating the separate Expository Sermon Preparation Studio
https://github.com/johann-han/inductive-bible-study-cloud/blob/main/docs/EXPOSITORY_SERMON_PREP_INTEGRATION_PLAN.md

Current shared repository: https://github.com/johann-han/inductive-bible-study-cloud
Live IBS app: https://inductive-bible-study-workspace.onrender.com/
Chosen deployment layout: IBS remains `/`; Kerygma is merged at `sermon/index.html` and will be served by the same Render service at `/sermon/index.html` after deployment.
Baseline recorded on 20 October 2026: main was checked at merge commit `8f70b3085a89ef1c94c56f0d746257594a35d4eb` and `index.html` blob `1520784af128c6033bc9a919121c53347dfe5d46`. Always fetch current `main/index.html` before editing.

The Kerygma HTML started as an uploaded standalone file whose SHA-256 at review time was `2fb84cecaa19255491dda8aeaa5e8bd125cab91d9dc21ab621ea7524f7a91656`. Its integrated copy is merged into `main` at `sermon/index.html`, with the server-side Gemini route changes in `server.js`. Verify `https://inductive-bible-study-workspace.onrender.com/sermon/index.html` and Render deployment status; merging alone does not prove deployment.

Do not redesign either app. Read the progress section first. The user confirmed the IBS export by uploading a valid Romans 2 v1 packet, and on 20 October 2026 confirmed that the Source Inductive Study panel persists after refresh with all four stages, outline and cross-references while the original sample sermon remains unchanged. Phase 4 source-aware AI prompts have been merged in PR #2 at merge commit `5b5353b61b9d8e0fbef5305196ab4845240f4a35`. The GitHub Actions workflow `.github/workflows/kerygma-source-ai-tests.yml` passed on both the PR and merge commit; it checks `server.js` syntax and runs `tests/kerygma-source-ai.test.cjs`. The five AI workflows use purpose-specific parts of the imported study and ask before replacing populated sermon output fields. Source-level validation is complete, but live Render deployment and the five AI smoke tests remain unverified from this session. Next: after Render deploys, open `/sermon/index.html` and test exegesis, Big Idea, outline, applications and manuscript with the imported Romans 2 study. Do not start Phase 5 until the live checks confirm that generated drafts use the source notes appropriately and the original sample/source packet remain unchanged. Do not expose API keys or clear localStorage. Kerygma AI requires the server-side `GEMINI_API_KEY`; never paste a key into the browser or chat.

## 11. First action when resuming in a new chat

Phase 4 is merged into `main` at `5b5353b61b9d8e0fbef5305196ab4845240f4a35`; the remaining gate is live validation:
1. Verify Render has deployed the merge commit and that `https://inductive-bible-study-workspace.onrender.com/sermon/index.html` loads. The GitHub merge and passing tests do not themselves prove deployment.
2. Open the imported Romans 2 sermon and run each AI action separately: Analyze Passage, Synthesize Big Idea, Generate Outline, Brainstorm Applications and Draft Manuscript. Compare the drafts with the Observe, Interpretation, Doctrine and Discipleship sections shown in the source panel.
3. Confirm the exegesis uses observations/interpretation; the Big Idea respects Interpretation/Doctrine; the homiletical outline is grounded in the passage outline without conflating them; applications distinguish Doctrine/Discipleship; and the manuscript follows the approved Big Idea, outline and applications.
4. Re-run an AI action after it has populated its target fields. Confirm the replacement warning appears, choose Cancel once to verify the fields and imported source remain unchanged, and only approve replacement when testing on the new Romans 2 sermon. Do not use the original sample sermon for destructive-overwrite testing.
5. Confirm the original sample sermon and imported source packet remain unchanged after the tests. Only then begin Phase 5 export/provenance work.
Keep Gemini credentials server-side in `GEMINI_API_KEY`; never place secrets in HTML or chat.
Keep Gemini credentials server-side in `GEMINI_API_KEY`; never place secrets in HTML or chat.
5. Only after that manual round-trip succeeds, begin Phase 4 prompt integration. Keep Gemini credentials server-side in `GEMINI_API_KEY`; do not put secrets in HTML.
