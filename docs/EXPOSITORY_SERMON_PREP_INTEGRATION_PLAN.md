# Integration Plan and Handover: Inductive Bible Study Workspace + Expository Sermon Preparation Studio

Document status: IBS→Kerygma import/export, provider-backed AI workflows, stage-specific coaching across all five tabs, More Questions/More Insights, labelled/stage-separated Guide chat, Markdown list formatting, panel/tab-overlap fix, and Homiletical Outline evidence traceability are merged into `main`. PR #34 merged at `326504cca2f4bee6ba983bf0fc939797ba54295c`; source-aware CI passed on the feature commit and main merge commit. Each homiletical point now has a collapsed Evidence traceability panel showing the claim/reference, imported verse text when available, candidate overlapping IBS passage divisions, explicitly verse-referenced Observe/Interpretation note blocks, verse maps, markups and cross-references, plus review status. Source overlaps are explicitly not represented as proof of interpretive support. The panel uses text rendering and bounded excerpts and does not mutate sermon/IBS source data. Live Render verification of the new panel remains pending.
Last reviewed: 22 October 2026.
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
- The Kerygma browser code does not call Gemini or OpenRouter directly and does not store API keys. Server-side `/api/sermon-ai` supports Gemini via `GEMINI_API_KEY` and falls back to OpenRouter via `OPENROUTER_API_KEY` when Gemini is absent; `OPENROUTER_MODEL` is configurable and defaults in code to `openai/gpt-4o-mini`. `/api/config` reports the configured provider and booleans without exposing secrets. OpenRouter uses the current OpenAI-compatible chat completions contract and a strict JSON Schema response format; top-level outline arrays are wrapped/unwrapped to preserve the existing browser contract. Authentication, request-size limits and rate limiting are retained. This provider correction merged in PR #5 at `f81725fd77913a0c47f1b39e395902fd9e2345b4`; the `source-aware-ai-tests` GitHub Actions run completed successfully on that commit. Live Render deployment and provider environment configuration remain unverified.
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

Current implementation status (21 October 2026): PR #7 merged optional imported-source appendix export into `main` at `82c886d8d8266186bd355d0d2d97e9c3b168dc93`; the `Kerygma source-aware AI checks` workflow passed on the merge commit. When a source packet is attached, export asks whether to include a separate appendix containing the four IBS stages, passage text when present, source passage outline, verse maps, Scripture markup, selected verses, personal cross-references, and standard cross-reference dataset/licence metadata. Imported material is explicitly distinguished from AI-generated or user-edited sermon fields. The user supplied the appendix export again after the reload/re-export step; it was byte-identical to the preceding export (48,410 bytes, 1,412 lines). Keep the sample sermon untouched. The manuscript's theological review remains pending.

- Preserve current Kerygma text export.
- Add imported source material to a separate appendix or clearly labelled source-notes section only if the user selects it.
- Ensure sermon export carries title, reference, Big Idea, objective, outline, applications, manuscript and optionally the original source study.
- Distinguish citations/reference notes that were in the imported study from AI-suggested references.
- Never silently claim that all standard cross-references are from TSK if they did not originate there; preserve available provenance/licensing information.
- Round-trip test: import packet → save sermon → reload browser → export sermon → confirm the source study and manuscript persist.

### Kerygma Guide & Assistant — width/coaching update merged; Render check pending

The user clarified that the AI must act as a guide and assistant, not merely as a collection of content-generation buttons. PR #9 merged this feature into `main` as commit `4547da9060e5764461e88be356bbb0e809b4f920`, and its source-aware AI regression workflow passed on both the feature and merge commits. The user has since supplied screenshots confirming the guide panel is live on Render and responds in the context of the imported Romans 2 study. The screenshots exposed two quality issues: assistant replies act like long worksheets with many questions, and Markdown markers display literally. PR #11 (`fix/kerygma-guide-coaching-and-formatting`) merged as `2addbb182a2576f0df5f7016d30944ac7a346726`; the workflow passed on final PR head `5145935e28aab674112c6a560cea5ad9a6aa8b3d` and on the merge commit. The merged assistant prompt aims to respond to the user's latest thought, give one textual connection, and normally ask one follow-up question or suggest one next step; a safe DOM-based Markdown renderer formats headings, emphasis, lists, inline code and http(s) links without inserting model text through `innerHTML`. New user screenshots still show lengthy multi-question replies and a panel width that obstructs the page, so branch `fix/kerygma-guide-width-and-coaching` tightened the prompt, passed a 320-token response budget for guide-only calls, and set a 640px desktop panel width. The user reported that this version felt too narrow for whole-chapter Bible study. PR #15 has now merged the follow-up at `33b4c70ca21a13ae401ec3a593710f4817bdf7e8`: fuller chapter-level overview with verse ranges and interpretive connections, typically 150–250 words adjusted to the question, one focused follow-up question, a guide-only output limit of 900 tokens, and a 760px desktop panel width with screen bounds and horizontal resizing. The server clamps optional output token requests between 128 and 1200 across Gemini and OpenRouter; other AI workflows retain their existing defaults. CI passed on the feature and merge commits. Render dashboard currently shows older deployed SHA `4804c070`, so check for the normal `main` auto-deploy before asking the user to retest.

- A collapsible `Kerygma Guide & Assistant` panel is available in the Kerygma UI proposal, usable across all five workflow tabs.
- The assistant receives the active workflow stage, relevant current sermon fields, recent in-memory chat context, and the matching purpose-specific IBS source context. It reuses the existing server-managed `/api/sermon-ai` path, so Gemini/OpenRouter selection, sign-in, rate limits and provider credentials remain server-side.
- Coaching behavior: explain the current step, ask guiding questions, review drafts, find missing textual support, explain interpretive alternatives fairly, identify theological risk, and suggest a next step. It distinguishes biblical text, imported IBS notes, inferences, and AI suggestions.
- The assistant is conversation-only: it must not edit or save sermon fields or the imported source packet. Conversation history is held in page memory only, is not written into the sermon record, and is reset when the user switches sermons. A reply arriving after a sermon switch is discarded so it cannot be shown in the wrong sermon.
- Chat content and relevant sermon/source excerpts are sent to the configured AI provider for the requested response; the UI states this. Do not log sermon/manuscript contents or API credentials.
- Regression tests check contextual source use, provider-backed requests, non-mutating behavior, safe text rendering, stage awareness, sermon-switch reset and stale-response handling. The guide is confirmed live by the user. The formatting refinement changes the reply style to ~80–140 words by default, focusing on the user’s last statement and one follow-up question/next step, and renders a safe subset of Markdown (headings, emphasis, lists, code, and http(s) links) via DOM nodes rather than `innerHTML`. The imported source and sermon fields remain read-only to the guide. The initial width/coaching/token-budget update merged in PR #13 at `4804c070b5f893438e42cdf690fe3c52ab69d707`. The fuller chapter-aware follow-up merged in PR #15 at `33b4c70ca21a13ae401ec3a593710f4817bdf7e8`; CI passed on PR head `fad2106033f2211eb713b72ca4472c3e7c49514c` and the merge commit. The user has since confirmed the wider layout and fuller response with a live screenshot. The current Text & Exegesis coaching follow-up is not merged yet. Do not modify imported study notes or sermon fields during its live test.

### Latest request: Text & Exegesis coaching (21 October 2026)

The user defines exegesis as critical interpretation and explanation of a text by analyzing language, context, and historical background to determine its meaning as accurately as possible. They note that some language, context and historical-background work is already done in IBS.

Current branch: `fix/kerygma-exegesis-coaching` (not yet merged).
- Adds stage-specific instruction only for the Guide when active stage is Text & Exegesis.
- The Guide should first review imported IBS Observe and Interpretation notes, verse maps/word-study notes, Scripture markup and cross-references; acknowledge what is already documented and avoid generic/repeated questions about audience or background.
- Exegesis guidance should focus on textual evidence: wording and connectives, grammar/syntax only when supported, paragraph/argument structure, relations between verse units, immediate and wider context, and documented historical background. Do not invent language or historical details.
- Adds the imported IBS passage outline to the Guide-only source context when present; leaves shared source-context helper, the five AI generation workflows, sermon fields and IBS data unchanged.
- Regression tests have been added for stage-specific guidance and inclusion of the source outline. Run GitHub Actions, open/merge a PR only after CI passes, then ask the user to test the Guide in Text & Exegesis.

### Markdown ordered-list numbering fix (21 October 2026)

The user shared live screenshots after PR #17 confirming the updated Text & Exegesis Guide is deployed. The chapter overview is readable and uses the intended exegesis coaching, but all entries in a numbered “Major Movements” list display as `1.`. Root cause: `renderKerygmaGuideMarkdown` flushes an open ordered list on every blank line, even when the next non-empty line is another ordered-list item.

Follow-up branch: `fix/kerygma-markdown-list-numbering` (not yet merged). The renderer now looks ahead across blank lines and retains the current `ol`/ `ul` only if the next non-empty line continues the same list type. Blank lines before paragraphs/headings and transitions between ordered/unordered lists still close the list. Regression fixture includes a blank line between two ordered items and asserts they remain in one `ol` with two `li` children. No Guide prompt, source context, provider logic, sermon field, or IBS study data is changed. Run CI and merge via PR only after it passes; then verify Render deploy from `main`.

### Kerygma Guide: explicit requests for more questions and insights (21 October 2026)

The latest live screenshot confirms the numbered chapter-overview list runs 1–4 correctly and the More Questions/More Insights buttons are visible. The user has tested both: More Insights produces useful distinct insights; More Questions produces relevant verse-specific questions, but the rationale paragraph between list entries causes each ordered list to restart at 1. This specific follow-up fixes output structure, not the renderer.

Merged in PR #19 at `75e69ea1cc067039313d671eddc7f7b2b9822fcf`. CI passed on feature commit `0c8304f17cfaa2339a013fa3df2971cc4cd3ca84`; the merge-commit workflow is running. Live Render prompt-chip verification is pending.
- Adds two quick prompt chips: **More questions** (requests five additional, non-repetitive questions tied to the active stage/passage, with verse reference and a short reason for each) and **More insights** (requests three to five further insights, with textual evidence and wider-context connection).
- The chips populate the existing compose field, consistent with existing quick prompts; the user reviews the prompt and clicks Ask. They do not create a new request or change sermon fields automatically.
- Prompt rules explicitly say the one-question-at-a-time behavior is a default, not a restriction. When the user asks for more questions, insights, alternatives or deeper exploration, the Guide should honor that request while staying grounded in the active stage, passage and IBS notes.
- Stage-specific Text & Exegesis rules are compatible with this override: default to one focused question, but offer a set when explicitly requested.
- Added regression coverage for both buttons, prompt content, and explicit override instructions. Run the source-aware AI checks, then merge through PR only after CI passes. After Render auto-deploys from `main`, confirm the two chips show up and test each on the Romans 2 sermon without changing its fields or imported IBS source.

### More Questions list numbering (21 October 2026)

PR #21 merged the continuous-list prompt wording. The subsequent bug report revealed the button itself failed: its `onclick` string included a nested single-quoted phrase, which broke JavaScript parsing. PR #24 fixes the prompt string and adds a regression test that extracts the real More Questions button handler and parses it with `new vm.Script`. PR #24 merged at `2fa342120e3872cb1143fba26e66ecbad4d956e2`; CI passed on the PR head and on `main`. After Render deploys from `main`, click More Questions to verify the prompt fills the question box, then click Ask to generate the five questions.
- The prompt asks for one continuous numbered list from 1–5.
- Each list item must contain its verse reference, question, and brief “Why it matters” rationale within the same item. Do not put the rationale in a separate paragraph between list items and do not restart numbering.
- Add a regression assertion for this explicit output contract. Do not change the Markdown renderer or More Insights behavior unless CI reveals a necessary issue.
- The PR is merged with passing CI. After Render deploys `main`, test More Questions on Romans 2 and confirm items run 1–5 without numbering restarting.

### Stage-specific coaching for all Kerygma tabs (22 October 2026)

Merged in PR #26 at `3d229462e3203440ad022962a3ad46926f78d4c5`. The source-aware AI workflow passed on both feature commit `b9be7768301a93aa28ce9008b3d9990b0c12dffb` and main merge commit `3d229462e3203440ad022962a3ad46926f78d4c5`. Live Render testing of these four stage-specific coaching paths remains pending.
The Text & Exegesis Guide already has detailed coaching directions, but the other four tabs were receiving only generic active-stage guidance. This change adds separate guidance for:
- **Big Idea & Proposition:** use the established Interpretation/Doctrine notes and current exegetical subject/complement; distinguish the original exegetical idea from the contemporary homiletical proposition; keep one text-traceable central claim.
- **Homiletical Outline:** use the IBS passage divisions as evidence, not as a pre-made sermon outline; check the Big Idea, verse ranges, logical progression, distinct points and textual support.
- **Illustrations & Application:** build on Doctrine/Discipleship and the current Big Idea/outline; check each illustration's fit and each audience-specific application for textual grounding and pastoral/theological safety.
- **Manuscript / Notes:** review alignment between passage, Big Idea, objective, outline, applications, illustrations and manuscript; flag unsupported claims, gaps and mismatches while preserving user approval and the read-only source packet.

Existing Exegesis guidance, source-context selection, server/provider behavior, five content-generation prompts, the guide's 900-token budget, safe Markdown rendering, and the user's sermon records are unchanged. New regression coverage checks stage-to-profile mappings and the presence of each distinct coaching contract. CI has passed and the PR is merged. After Render deploys from `main`, test one Guide prompt on each of the four tabs with the imported Romans 2 study. Confirm each reply fits its stage and leaves sermon fields/source notes unchanged.

### Dynamic Guide quick-action label (22 October 2026)

Merged in PR #28 at `3926863c1f13d4bdfb4d964b43667394fb53c225`; the source-aware AI workflow passed on feature commit `3573690e8e041a81f8d63cca248c7a8630a8164f` and main merge commit `3926863c1f13d4bdfb4d964b43667394fb53c225`. Live Render verification of the label remains pending.
The Guide panel's first quick-action button previously said only “Guide this step,” which could be ambiguous when the user switches between tabs. The button now has a stage label element and `updateKerygmaGuideContextLabel()` updates it from `getKerygmaGuideStage()` each time the selected sermon or workflow tab changes.
Expected labels:
- Text & Exegesis — “Guide me through Text & Exegesis”
- Big Idea & Proposition — “Guide me through Big Idea & Proposition”
- Homiletical Outline — “Guide me through Homiletical Outline”
- Illustrations & Application — “Guide me through Illustrations & Application”
- Manuscript / Notes — “Guide me through Manuscript / Notes”

The click handler still fills the existing input with “Guide me through this step. Ask me useful questions rather than doing all the work for me.” This is intentional: the button identifies the stage, while the prompt remains reusable and its active stage comes from the current tab. A regression test checks all stage mappings, the dynamic label updater and preserved generic prompt. CI passed and the PR is merged. After Render deploys from `main`, switch through all five tabs with the Guide open and confirm the label updates each time.

### Stage-separated Kerygma Guide conversation (22 October 2026)

Merged in PR #30 at `cfe8a6830721b2e685bdcf8e7b506c94d058b6f5`; CI passed on feature commit `5a9841a81a11b66fa03da82ede0f945e1caaab4e` and main merge commit `cfe8a6830721b2e685bdcf8e7b506c94d058b6f5`. Live Render verification remains pending.
The user notes that all five Kerygma stages appear in one continuous chat stack, making it unclear which answers belong to which stage.

Changes in progress:
- On each actual stage transition, add a strong visual divider such as **STEP 2 · BIG IDEA & PROPOSITION** plus a short note that new messages below relate to this stage. Do not add a divider when the user clicks the already-active tab.
- Label every user and assistant message with the stage where it was asked/answered, so the earlier chat remains intelligible when the user moves on and back.
- Store the stage label alongside real conversation history so recent prior exchanges are presented to the model with their originating stage. Visual divider objects are only in `guideMessages`, not `guideHistory`, and must never be sent as AI messages.
- Capture the stage at the time of an AI request so a response remains labelled with the stage of the request, even if the user changes tabs while waiting.
- Keep a single chat and preserve existing messages on stage changes; do not clear chat history, sermon content, or imported IBS data.
- Test all five stage names, transition-only separator insertion, accessible separator semantics, stage-labelled bubbles and the exclusion of divider markers from AI history. CI passed and the PR is merged. Verify on Render after the main-branch deploy by switching through all five tabs with chat open and checking that each group divider and message-stage label appears correctly.

### Kerygma Guide panel must not cover workflow-tab labels (22 October 2026)

Current branch: `fix/kerygma-panel-clear-workflow-tabs` (not yet merged).
The user’s live screenshot shows the Guide panel overlaps the top workflow-tab row and covers the label “Manuscript / Notes.” The panel previously anchored itself to `bottom-20` and could grow to `84vh`, letting its top edge rise over the tabs.

The follow-up:
- Anchor the panel at `top-32` (8rem, below the top header + workflow tabs) rather than anchoring it only from the bottom.
- Bound height to `calc(100vh - 13rem)`, leaving the panel within the viewport and above the bottom launcher region.
- Preserve `width:min(94vw,760px)`, min/max width and `resize:horizontal`.
- Add regression assertions that the panel starts below the tab row, is screen-bounded, and preserves its useful width.
- Do not alter the Guide chat rendering, stage separators, messages, sermon fields or IBS source. Merge only after CI passes; after Render deploys from `main`, confirm all five tab labels are fully visible with the Guide open.

### Kerygma Guide panel/tab overlap fix (22 October 2026)

Merged in PR #32 at `0d7d21a97de9e319e88d31d503d1012d0c6d54ea`. CI passed on feature commit `ee6f02c755e450f206bfb1e8729d192d9585236d` and main merge commit `0d7d21a97de9e319e88d31d503d1012d0c6d54ea`.

The user’s screenshot showed the floating Guide panel covering the “Manuscript / Notes” workflow tab. The fix anchors the panel at `top-32` and caps height at `calc(100vh - 13rem)`, leaving the tab row visible while preserving panel width, horizontal resizing, stage separators, and message history. A regression test confirms the top anchor, height cap, and width. Once Render deploys this main commit, refresh with Ctrl+F5 and verify all five workflow tab labels remain fully visible while the Guide panel is open.

### Homiletical Outline evidence traceability (22 October 2026)

Merged in PR #34 at `326504cca2f4bee6ba983bf0fc939797ba54295c`. CI passed on feature commit `4b67c26f989faceff10383ef36a4ae7b57354bf6` and main merge commit `326504cca2f4bee6ba983bf0fc939797ba54295c`. Live Render verification remains pending.
The next improvement connects each Kerygma main point to supplied IBS evidence without implying that simple overlap proves the claim is true.

Implementation:
- Each homiletical point gets a collapsed “Evidence traceability” panel that identifies the point's textual reference and a human-review status.
- Parse references such as `Romans 2:1–4`, `2:5`, `vv. 17–29`, and a bare verse/range relative to the imported study chapter.
- List candidate IBS passage-outline sections whose verse ranges overlap, plus Observe/Interpretation blocks with explicit verse references, verse-map/word-study entries, Scripture markups, and personal/standard cross-references from the selected range.
- Display the current Kerygma point notes separately as the sermon explanation, not as an independently verified source finding.
- Use status language such as “Potential links found — verify fit”, “Needs review — no direct range matches”, “Check verse reference”, and “No IBS source attached”. State clearly that range overlap is a navigation aid and does not prove interpretive support.
- Build the evidence display with DOM `textContent`, not HTML insertion, and bound excerpt size to avoid unbounded cards. Refresh the trace when point reference, statement, or notes are edited.
- Do not change the five existing AI generation workflows, guide conversation, import/export, source packet, or sermon records.
- Tests exercise reference parsing/range overlap and assert evidence categories, uncertainty/provenance, safe text rendering and refresh behavior; both feature and main CI passed. After Render deploys from `main`, live-test by expanding the trace for Romans 2:1–4 and one later point. Confirm that the candidate source references and status make sense and that the sermon/IBS fields remain unchanged.

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

Do not redesign either app. Read the progress section first. The user confirmed the IBS export by uploading a valid Romans 2 v1 packet, and on 20 October 2026 confirmed that the Source Inductive Study panel persists after refresh with all four stages, outline and cross-references while the original sample sermon remains unchanged. Phase 4 source-aware AI prompts have been merged in PR #2 at merge commit `5b5353b61b9d8e0fbef5305196ab4845240f4a35`; GitHub Actions passed for those prompt changes. The user reported that AI generation failed because the page said Gemini was not configured. PR #5 (`fix/kerygma-openrouter-provider`) has now merged as `f81725fd77913a0c47f1b39e395902fd9e2345b4`. Its GitHub Actions workflow `source-aware-ai-tests` passed on the merge commit. This confirms source-level syntax, prompt regressions, provider configuration flags, and structured-schema conversion only; Render deployment and the five live AI workflows are still unconfirmed. Do not start Phase 5 until generated drafts use the source notes appropriately and the original sample/source packet remain unchanged. Do not expose API keys or clear localStorage. Kerygma AI requires either `GEMINI_API_KEY` or `OPENROUTER_API_KEY` in the server environment; never paste a key into the browser or chat.

## 11. First action when resuming in a new chat

Phase 4 prompt integration is merged (PR #2); provider support is also merged into `main` at `f81725fd77913a0c47f1b39e395902fd9e2345b4`, and its source-aware AI workflow passed. The remaining gate is live validation:
1. Verify Render has deployed the merge commit and that `https://inductive-bible-study-workspace.onrender.com/sermon/index.html` loads. The GitHub merge and passing tests do not themselves prove deployment.
2. Open the imported Romans 2 sermon and run each AI action separately: Analyze Passage, Synthesize Big Idea, Generate Outline, Brainstorm Applications and Draft Manuscript. Compare the drafts with the Observe, Interpretation, Doctrine and Discipleship sections shown in the source panel.
3. Confirm the exegesis uses observations/interpretation; the Big Idea respects Interpretation/Doctrine; the homiletical outline is grounded in the passage outline without conflating them; applications distinguish Doctrine/Discipleship; and the manuscript follows the approved Big Idea, outline and applications.
4. Re-run an AI action after it has populated its target fields. Confirm the replacement warning appears, choose Cancel once to verify the fields and imported source remain unchanged, and only approve replacement when testing on the new Romans 2 sermon. Do not use the original sample sermon for destructive-overwrite testing.
5. Confirm the original sample sermon and imported source packet remain unchanged after the tests. Only then begin Phase 5 export/provenance work.
Keep AI credentials server-side in `GEMINI_API_KEY` or `OPENROUTER_API_KEY`; never place secrets in HTML or chat.
Keep Gemini credentials server-side in `GEMINI_API_KEY`; never place secrets in HTML or chat.
5. Phase 4 prompts are already merged. Once provider fallback CI passes and Render deploys, validate AI workflows; only then begin Phase 5 export/provenance work. Keep credentials server-side and never put secrets in HTML or chat.
