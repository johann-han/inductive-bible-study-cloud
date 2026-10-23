# Integration Plan and Handover: Inductive Bible Study Workspace + Expository Sermon Preparation Studio

Document status: IBS→Kerygma import/export, provider-backed AI workflows, stage-specific coaching, More Questions/More Insights, stage-separated Guide chat, and evidence traceability for Homiletical Outline, Big Idea & Proposition, Illustrations & Application, Manuscript / Notes, paragraph-level manuscript claims, readable cross-reference panels, section-heading reference inheritance, sentence-level claim review, distinct proposition extraction, claim-only numbering, persistent claim-review statuses, and a cross-sermon claim-review queue with inline review-status updates are merged into `main`. PRs #38, #40, #41, #43, #44, #45, #46, #48, #50, #52, #54, #56, #57, #58 and #59 are merged; SHAs and links are recorded below. On 22 October 2026 the user confirmed that claim-review statuses persist after testing. PR #59 added the cross-sermon queue and passed GitHub Actions run 83. On 22 October 2026, the user verified the live queue and confirmed, “It is good.” PR #61 added search and review-status filters and merged as `76af0cc5b06bcb422dd100cb8294344fa2c19ffa`; final PR-head GitHub Actions run 84 passed. Live acceptance: **completed by the user on 23 October 2026.** The user confirmed, “Looks good and it works,” after opening Kerygma directly and testing the deployed search/status filters. PR #63 added inline queue status updates, merged as `50cfa46f1c14926ab552038d810a6a80fbb2b208`; both PR-head and post-merge GitHub Actions checks passed. Live verification of that new status selector remains pending. PR #65 fixes the IBS Study Library search gap by including Doctrine notes and adding IBS-specific regression tests. It merged as `0abeb471234cb9c311c57cd7dad760015c4f74e4`; post-merge GitHub Actions run 39902957765 passed. Live verification after deployment remains pending.
Last reviewed: 23 October 2026.
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

### Big Idea & Proposition evidence traceability (22 October 2026)

Merged in PR #36 at `348528c8482c31b1337ebe36f1b20e6b1a41ed33`. CI passed on feature commit `8206d1c02553615686928c6d8d087ac9cc80bf90` and main merge commit `348528c8482c31b1337ebe36f1b20e6b1a41ed33`. Live Render verification remains pending.
The user confirmed the Homiletical Outline evidence panel works and agreed to continue traceability at the preceding stage. This feature places the current Kerygma exegetical subject, exegetical complement, Big Idea/proposition and sermon aim beside the imported IBS evidence that should inform review of the central claim.

Expected contents:
- Collapsed **Evidence traceability · Big Idea & Proposition** panel below the current Big Idea form.
- A separate current-claim section containing the four Kerygma fields.
- Imported IBS Interpretation and Doctrine notes shown separately; explicit status when no source is attached or one/both key sections are absent.
- Source divisions from the IBS passage outline, the study's selected verses, a bounded selection of populated verse-map/word-study entries, and user-created/standard cross-reference entries.
- A provenance note saying this is a manual comparison, not an automated verdict that the Big Idea follows from the evidence.
- All imported content rendered through `textContent`, excerpts bounded, and current open/closed state preserved while form fields change. The view makes no writes to sermon fields or source data.
- Existing prompt generation, AI behavior, outline traceability, import/export and chat remain unchanged.

A regression test checks the panel, source categories, status wording, safe bounded text rendering, preserving open state, and absence of any storage/source mutation in the rendering method. Feature and main CI passed. After Render deploys, test the Romans 2 study by expanding the trace; verify that the Big Idea, subject/complement, Interpretation and Doctrine notes are clearly separate and the existing sermon fields remain untouched.

### Illustrations & Application evidence traceability (22 October 2026)

Merged in PR #38 at `618cc4ed83978a540e1140187cc5b6d296a24ca0`. CI passed on feature commit `aa33efe775e28b4beb7019e85f7926fda5c7dff4` and main merge commit `618cc4ed83978a540e1140187cc5b6d296a24ca0`. Live Render verification remains pending.
This follows the Big Idea traceability feature and connects the application stage to the imported IBS stages that should constrain response: Doctrine and Discipleship.

Implementation:
- Add a collapsed **Evidence traceability · Illustrations & Application** panel after the existing Illustration and Contextual Application cards.
- Show current Kerygma context, applications for seekers/non-believers, believers/growing Christians and suffering/weary hearers, plus the currently saved illustration/analogy pool.
- Show IBS Doctrine separately as theological guardrails and IBS Discipleship separately as lived response/formation. Report clearly when the packet or either source section is absent.
- Add supporting context from the imported packet identity, passage divisions, selected verses, bounded populated verse maps/word studies, and user-created/standard cross-references.
- Include an explicit provenance caveat: current records do not tag each illustration individually as user-written or AI-generated. Kerygma application and illustration fields are draft content and must not be mistaken for imported IBS source findings. Source overlap is contextual evidence, not proof that the application is faithful or illustration factual.
- Render imported material via `textContent`, bound note and entry excerpts, preserve the open/closed state as current fields refresh, and avoid any writes in the trace renderer.
- Refresh after loading a sermon, editing application fields, adding/editing/removing an illustration, and accepting AI brainstorm output. Existing AI brainstorm behavior, source packet, imports/exports, Big Idea/Outline traceability, and other workflows remain unchanged.
- Regression tests verify each source/application category, missing-source statuses, the provenance caveat, bounded text, preservation of open state, no mutation/storage calls in the renderer, and refresh hooks; both feature and main CI passed. After Render deploys from `main`, open the panel on Romans 2 and confirm IBS Doctrine/Discipleship notes are distinct from the saved applications and illustrations, with no sermon/source data changed by opening it.

### Manuscript / Notes evidence traceability (22 October 2026)

Merged via PR #40, **Add manuscript evidence traceability**, at squash commit `02c58c05c6d041bbca1bf4a00224c3233f72dfdd` on 22 October 2026. Feature-branch CI passed on `645d7c4f6f251a2987cec640a831cb8eda5098e7`; the main-branch run passed on the merge commit: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39762524576. Live Render/browser verification remains pending.

Implementation:
- A collapsed, read-only **Evidence traceability · Manuscript / Notes** panel is placed within the existing Manuscript / Notes tab, immediately before the manuscript editor. The editor, AI Draft Full Manuscript button and Auto-Generate from Outline button are retained.
- It displays the current saved Kerygma manuscript, Big Idea and aim separately from homiletical outline points; imported IBS Interpretation and Doctrine separately from Kerygma application drafts and imported IBS Discipleship notes.
- Imported passage divisions are shown as candidate links to outline points where verse ranges overlap. Missing/invalid reference data and missing source links receive explicit review statuses. Overlap is not proof of support.
- The bounded review checklist asks the user to inspect unsupported assertions, verse-to-claim fit, doctrinal warrants, application fit, quotations and factual claims. The panel does not automatically classify each assertion as theologically correct or supported.
- Source/manuscript excerpts and list counts are bounded and rendered with DOM text nodes. The view does not write storage, edit manuscript fields or mutate the imported packet. Its open/closed state is preserved when refreshed.
- Regression tests cover source/draft distinctions, no-write/no-mutation behavior, bounded rendering, candidate verse links, refresh paths, and preservation of outline compilation plus the manuscript AI overwrite-confirmation safeguard.

Post-merge check still required:
- Verify Render is serving `02c58c05c6d041bbca1bf4a00224c3233f72dfdd` or its descendant, then manually test the live panel with the existing Romans 2 imported packet. Confirm that opening/refreshing the panel leaves the manuscript text and packet unchanged; check the original “Peace in the Storm” sermon remains intact; and confirm all four IBS stages plus the manuscript, AI-draft and outline-compilation actions continue working.
- At merge time, the Browser connector stopped responding during the live check. GitHub verifies the merge and passing CI, not Render deployment. Do not claim live success until this check is explicitly completed.
- The user subsequently reported that the panel “looks good” on 22 October 2026. Record this as user-observed visual confirmation; the exact Render SHA and the entire live data-preservation/regression checklist remain independently unverified.

### Paragraph-by-paragraph manuscript claim traceability (PR #41 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/41  
Merged by squash commit `a2244e047371fcd5cdc1ffac19008f7538d7ad86` on `main`. The latest PR-head GitHub Actions run passed on `a30678212b25b6a06c74348b73c9a9b70ce11f80`: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39766139364. Post-merge main CI and Render deployment have not been independently verified.

Implementation:
- Extends the existing read-only Manuscript / Notes evidence panel with a **Paragraph-by-paragraph / claim-level traceability** review aid. It does not add a second editor or overwrite any sermon field.
- Splits Markdown manuscript content into paragraph blocks and treats headings as section labels. Common Introduction, Exposition / outline, Application / response and Conclusion headings receive simple labels; unfamiliar headings remain explicitly unclassified.
- Detects canonical full-book references and unprefixed chapter/verse or verse-only references. Candidate homiletical-outline and imported IBS passage-division links are suggested only when the reference belongs to the imported book/chapter and verse ranges overlap.
- Flags possible missing passage links, different-book/chapter references, theological claims, factual/historical details, quotations/attributions and application/response claims for human review. A missing automatic match is not evidence that a claim is false or unsupported.
- Caps analysis at the first 60,000 manuscript characters, shows at most 30 paragraph blocks, and bounds each displayed excerpt to 420 characters. The renderer uses DOM text nodes and does not access localStorage, write to storage, alter the manuscript, or mutate the imported IBS packet.
- Adds a Romans 2 fixture test for section labels, reference-to-outline and reference-to-division overlap, wrong-book rejection, review flags, immutability and display bounds. Existing outline compilation, manuscript editing, AI-draft confirmation and other evidence panels are covered by the regression suite.
- Manual deployment check remains required: confirm Render serves `a2244e047371fcd5cdc1ffac19008f7538d7ad86` or a descendant, then inspect the Manuscript / Notes evidence panel on the existing Romans 2 sermon. Confirm paragraph analysis appears, candidate references are appropriate, and opening/refreshing the panel leaves the manuscript and source packet unchanged. Confirm the original “Peace in the Storm” sermon, four IBS stages, source sections, and outline/AI drafting actions still work.
- The screenshot supplied by the user on 22 October shows the pre-merge application’s Romans 2 source sections and the sample sermon still in the Vault; it does not verify the merged paragraph-level feature.

### Readable imported cross-reference panels (PR #43 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/43
Merged by squash commit `7e36f69b829a3d7718e6586ddb271ec5ca228124` on `main`. Feature-head CI passed in GitHub Actions run 63: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39772236380. Post-merge CI and Render deployment for this fix remain to be verified.

User-visible issue: screenshots of the live Kerygma Manuscript / Notes tab showed **My Cross-References · personal links** and **Standard cross-references** displaying raw JSON. The underlying v1 packet and its data were intact; `renderInductiveStudySource()` was explicitly calling `JSON.stringify` for these two display sections.

Implementation:
- Personal links display as a readable source → target Bible reference, followed by the relationship label and optional user note. Example: `Romans 2:14 → Ephesians 2:12–13`.
- Standard cross-references show availability and source note, then groups by verse with human-readable anchor phrases and reference lists.
- Display caps limit personal links to 100, standard verse groups to 60, anchor phrases per verse to 12, and references per anchor to 12; omitted items are reported rather than dumping an unbounded structure.
- The existing DOM `textContent` rendering is retained. The formatters do not mutate `inductiveStudySource`, write browser storage, call AI, or change import/export structure. Verse maps and scripture-markup panels are outside the scope of this specific fix.
- Regression coverage verifies personal reference formatting, relationship/note fields, grouped standard references, bounding, absence of raw-JSON formatting in these two panels, and inline script/test syntax. Feature-head CI run 63 passed.
- Post-merge manual verification: **completed by user screenshot on 22 October 2026.** The visible Romans 2 Source Inductive Study panel shows the personal link `Romans 2:14 → Ephesians 2:12` with its relationship label, and the standard cross-references appear grouped by verse and anchor phrase rather than as raw JSON. The screenshot also shows the imported Romans 2 packet and both sermons in the Vault, including the original “Peace in the Storm.” The user explicitly confirmed: “The cross-reference panels are correct.” This verifies the visible behavior on the live page; it does not independently verify every hidden source field or browser-storage invariant.

### Live verification — readable cross-reference panels (22 October 2026)

The user supplied a fresh screenshot after PR #43 merged and explicitly confirmed that the cross-reference panels are correct. It shows:
- Personal links formatted as a readable source → target reference (`Romans 2:14 → Ephesians 2:12`), with `Relationship: theme` underneath.
- Standard cross-references grouped by verse and anchor phrase, including inline reference lists and a compact `+N more` indication for long lists.
- The Romans 2 · KJV source packet is still visible, alongside both `Sermon on Romans 2` and `Peace in the Storm` in the Sermon Vault.
- No raw JSON in either of the two corrected cross-reference panels.

Treat the display fix as deployed and visually verified. Do not redo this check unless later code changes affect the source panel. This confirmation is from the user's live screenshot; no claim is made that every imported source field was byte-for-byte checked.

### Section-heading reference inheritance for manuscript traceability (PR #46 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/46
Merged by squash commit `a920ae4c892556eea81d89735b23661185e9b292` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on the final PR head in run 65: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39773914300. Post-merge main CI and Render deployment for this enhancement remain to be verified.

Implementation:
- Tracks the current Markdown heading alongside each paragraph block. Numbered/Roman-numeral outline headings such as `I. Judgment of Others ...` are classified as **Exposition / outline**, unless a more specific heading class (Introduction, Application, Conclusion) applies.
- If a paragraph has no Bible reference of its own, checks the active section heading for an explicit canonical book/chapter/verse-range citation. That citation may supply candidate links to overlapping sermon-outline points and imported IBS passage divisions.
- If the paragraph already cites a reference, it does not inherit the heading citation. This prevents a paragraph that explicitly mentions a different book (e.g. John 2) from being linked automatically to Romans 2.
- Inherited citations display as `[from section heading]` and add a review flag asking the preacher to confirm that the paragraph belongs within that range. This remains a heuristic review aid; it does not prove that a claim is supported or theologically correct.
- Regression coverage includes an uncited Romans 2 paragraph inheriting `Romans 2:1–4` from a numbered heading, candidate links to the matching outline/IBS division, visible provenance label, numbered heading classification, and refusal to inherit that heading reference for an explicit John 2 citation. Direct fixture checks, inline JavaScript parsing and the GitHub Actions feature-head suite passed.
- Before calling this live, confirm Render serves `a920ae4c892556eea81d89735b23661185e9b292` or a descendant. In the live Romans 2 Manuscript / Notes panel, confirm inherited references are explicitly labelled, candidate links match verse ranges, an explicit out-of-book citation does not acquire the enclosing Romans link, and manuscript/source data remain unchanged. Keep the previously verified readable cross-reference panels and the original “Peace in the Storm” sermon intact.

### Sentence-level manuscript claim traceability (PR #48 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/48
Merged by squash commit `6c969efbc4cd5aef86dbe84387df7edba92fa0fa` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on final feature-head commit `e9d10c65704a3bdd4d0a36aacca9ffccda605bd8` in run 69: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39776480748. Post-merge main CI and live Render verification for this feature have not been independently confirmed.

Implementation:
- Adds conservative sentence splitting to each paragraph block. Common abbreviations such as `Dr.`, `e.g.`, `i.e.`, `v.`, `vv.`, `A.D.` and `B.C.` are protected from accidental sentence boundaries; punctuation in references such as `Romans 2:1–4` remains with the sentence.
- The existing paragraph overview is retained and now includes sentence-level claims, each with a bounded excerpt, explicit/inherited reference provenance, candidate outline links, candidate IBS passage divisions and cautious review flags.
- Reference provenance is explicit: a sentence's own citation takes precedence; otherwise a reference may be inherited from another sentence in the same paragraph (labelled paragraph context) or from the active Markdown section heading (labelled section heading). Inherited references display review reminders. A sentence explicitly citing another book/chapter does not automatically inherit the enclosing Romans heading range.
- Sentence review reuses the existing cautious heuristics for missing/mismatched references, theological assertions, historical/factual details, quotations/attributions and application language. Candidate range overlap is not proof of support or theological correctness.
- Retains the 60,000-character manuscript analysis cap and 30 paragraph block cap; sentence review is further limited to 8 claims per paragraph and 120 claims across displayed paragraphs. Sentence excerpts and source link lists are bounded. Manuscript and imported IBS data are not edited.
- Romans 2 regression coverage verifies multiple claims within one paragraph, sentence vs paragraph-context vs section-heading citation provenance, candidate links, wrong-book non-inheritance, abbreviation-safe splitting, output bounds and source/manuscript immutability. GitHub Actions feature-head run 69 passed after two test-only assertion corrections.
- Post-merge check: verify Render serves `6c969efbc4cd5aef86dbe84387df7edba92fa0fa` or its descendant. In the live Romans 2 Manuscript / Notes panel, confirm sentence-level rows display beneath each paragraph, references show whether they belong to the sentence, paragraph context or heading, and candidate links/flags are sensible. Confirm saved manuscript, imported packet, readable cross-reference panels and “Peace in the Storm” remain intact. Do not describe this enhancement as live until this check is completed.

### Remove parent paragraph excerpts from sentence-level traceability (PR #50 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/50
Merged by squash commit `7e5675bffe6fbb6522145ec2e74dd1446becd30f` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on feature-head commit `2f7e2ea67dc92900c4185ba98e5262ec3e045666` in run 71: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39810920804.

User feedback: the live sentence-level traceability display looked good, but repeated parent paragraph excerpts were cluttering the view. The user asked: “Remove all the paragraph excerpts.”

Implementation:
- Removes the parent `Paragraph excerpt: …` line from each traceability entry.
- Retains paragraph number and section label, paragraph/heading reference context, individual sentence claims, sentence-level reference provenance, candidate outline and IBS division links, review flags, and coverage counts.
- The analyzer’s internal excerpt field remains available for bounded review/test identification but is no longer rendered. No saved manuscript or imported IBS packet is changed.
- Regression tests assert the parent excerpt line is absent from the UI renderer while sentence-level claim text and paragraph-reference context remain present.
- The user should refresh Kerygma with Ctrl+F5 to load the merged display change. The code is merged and CI passed; do not claim the live panel has updated until a refreshed page or new user screenshot confirms it.

### Distinct proposition extraction in sentence-level traceability (PR #52 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/52
Merged by squash commit `b86b29c874c02346ca21453091b11d8fdc5ce988` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on final feature-head commit `f1dcf5910677cfe20489a200307f8ceb18b69376` in run 73: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39813878180. Live Render confirmation for the new display has not yet been supplied.

User feedback: the prior “Claim” field repeated the source sentence rather than identifying an asserted proposition.

Implementation:
- Adds a conservative `extractManuscriptClaimProposition` pass. Where known sentence forms can be distilled, the display shows a distinct candidate proposition rather than echoing the source sentence.
- Greetings, directions and transitions (for example, `Good morning, beloved congregation` and `Today, we turn our hearts and minds to Romans 2`) are labelled as context, not claims.
- Recognized Romans 2 quote forms receive cautious paraphrase candidates, explicitly labelled for verification against the passage.
- If a sentence cannot be safely distilled, the display states that no separate proposition was extracted and points the user to the sentence in the manuscript. It does not repeat the sentence verbatim as a pretend claim.
- Derived propositions retain their source sentence index and carry candidate Bible-reference provenance, candidate outline/IBS links, and review flags. The source sentence is not duplicated in the traceability display; the saved manuscript remains the source of record.
- Coverage counts distinguish candidate propositions from context or undistilled sentence items. Output limits, heading/paragraph reference inheritance and wrong-book non-inheritance remain in place.
- Regression tests cover greetings/transitions, distinct propositions from the Romans 2 introduction, quoted wording, unresolved fallback, inherited references, abbreviations, bounded output, and no mutation of manuscript/source packet. Inline JS and test-file syntax checks plus GitHub Actions run 73 passed.
- After Render deploys this commit or a descendant, confirm the live Romans 2 traceability panel shows concise derived propositions for recognizable assertions, classifies greetings/transitions as context, and labels undistilled sentences without repeating them as claims. Confirm reference provenance remains clear and existing source data, cross-reference lists and “Peace in the Storm” remain intact.

### Number only distilled candidate propositions (PR #54 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/54
Merged by squash commit `cd9a964c944634c9227011e8a01884869a71a1b4` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on final PR head commit `348750ca92f825bbdd3d3bdf136ed9354ed26b63` in run 76: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39816494363.

User feedback: all sentence rows were numbered as `Sentence N`, including unresolved items such as `No proposition distilled`, making them appear like claims.

Implementation:
- Only successfully distilled candidate propositions receive `Claim N` numbering. Their source sentence number remains visible as provenance, e.g. `Claim 1 (candidate proposition from source sentence 3): …`.
- Context sentences display as `Context — …` without numbering.
- Sentences where no distinct proposition was extracted display as `Not distilled — …` without numbering. Their reference provenance, candidate outline/IBS links and review flags remain visible.
- No sentence analysis, proposition extraction, manuscript text, imported IBS data, or source/reference link logic changed; this is a display-label change.
- Regression checks assert only distilled propositions are numbered, context and undistilled items are unnumbered, and the old `Sentence N` label is absent. The initial run exposed a missing quote in a test assertion; that test was fixed, and run 76 passed.
- Post-merge manual verification: **completed by user on 22 October 2026.** The user confirmed: “It's good.” Treat claim-only numbering as live and visually verified. Only extracted candidate propositions should be numbered; context and undistilled items use unnumbered labels. The user’s confirmation completes the live UI check for this change.

### Persistent per-proposition review statuses (PR #57 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/57
Merged by squash commit `bb9cb66bed9d5150df9ed8ae48f3a0cf9e9bd5f5` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on final PR-head commit `af12520783166a1dec5005588f55159a67b67ece` in run 80: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39830415073. The merged application and tests are verified in `main`; live Render verification is pending.

Implementation:
- In the Manuscript / Notes claim traceability panel, each extracted candidate proposition has a selector with four states: `Not reviewed`, `Reviewed`, `Needs research`, and `Requires revision`. Context and undistilled sentence entries do not get review controls.
- Review decisions are stored in a separate browser key, `kerygma_claim_review_status_v1`, keyed by sermon ID and a deterministic claim key (paragraph location, source-sentence location and normalized-proposition hash). The same claim retains its decision after refresh; different sermons and changed proposition text do not silently share a status.
- Invalid states are rejected. Failed writes restore the last saved selection and display a persistence warning. The summary counts review states among the propositions currently displayed, respecting traceability output bounds.
- Review status writes do not touch `kerygma_sermons`, manuscript fields or `inductiveStudySource`. The rendering method contains no direct browser-storage access and does not call `saveToStorage`; it invokes a separate helper only in response to a user changing a claim’s selector. Existing DOM text-node rendering is retained.
- Regression tests cover initial status, per-sermon isolation, valid state changes, rejection of invalid state, dedicated-key-only writes, stable review keys, changed-proposition invalidation, and exclusion of context/non-claims. GitHub Actions run 80 passed.
- Live acceptance: **completed by user on 22 October 2026.** The user explicitly reported, “I have tested it.” Treat the four-state selector and refresh persistence as user-confirmed live behavior. The cross-sermon dashboard builds on this verified baseline.

### Cross-sermon claim-review queue (PR #59 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/59
Merged by squash commit `67fca22545b4bb544ee6fa7255f6964e1faef712` on `main`. GitHub Actions **Kerygma source-aware AI checks** passed on final PR-head commit `5d3c3a1bc93be4771db8278d7f3a2fbbc0be0503` in run 83: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39832309328. Live acceptance: **completed by the user on 22 October 2026.** The user confirmed that the Claim review queue works and replied, “It is good.” The search/status filter enhancement is covered by PR #61 and must be tested after deployment.

Implementation:
- Adds a **Claim review queue** button in the sidebar above the Sermon Vault list.
- Scans saved sermons with the bounded traceability analyzer and separate `kerygma_claim_review_status_v1` store. It displays only extracted propositions marked **Needs research** or **Requires revision**, with sermon/passage, paragraph/source-sentence location, proposition, reference provenance, candidate outline and IBS division links, and review flags.
- Provides counts for Needs research, Requires revision and Reviewed, a clear empty state, and an **Open claim in sermon** action. Selecting an entry loads that sermon, switches to Manuscript / Notes, opens the evidence-trace panel and scrolls to the corresponding proposition via its deterministic review-key anchor.
- Caps scanning at 100 sermons and displays at most 100 actionable queue entries. It explicitly reports extra sermons/items and paragraph/sentence content omitted by the underlying analyzer so the dashboard does not imply omitted text has been checked.
- The queue reads sermon manuscripts and the separate review status key. It does not modify manuscript/source fields, set statuses automatically, write to `kerygma_sermons`, or mutate `inductiveStudySource`. Text is rendered using DOM text nodes.
- Regression tests cover multi-sermon filtering, status counts, retaining evidence context, deterministic navigation wiring, bounds/omission warnings, and no mutation of saved sermons. An initial CI run caught an over-escaped regular expression in the new test extractor; this was corrected and run 83 passed.
- Live acceptance completed: the user tested the deployed queue and confirmed it is good. The user reported that the underlying review-status controls had already been tested for refresh persistence. The queue's filter follow-up must also be checked after deployment: verify searching by sermon, passage, proposition and reference; switch between Needs research and Requires revision; confirm an unmatched query shows a clear empty-result state; and ensure Open claim in sermon, saved statuses, the imported IBS packet, readable cross-references and `Peace in the Storm` remain intact.

### Queue search and status filtering (PR #61 merged, 22 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/61
Merge commit: `76af0cc5b06bcb422dd100cb8294344fa2c19ffa`.
Final PR-head CI: **passed** in GitHub Actions run 84: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39833945972.
Live acceptance: **completed by the user on 23 October 2026.** The user tested the deployed filters and confirmed that they work.

The search spans sermon title, passage, proposition, reference, outline link, IBS division link and review flags. The status filter offers All flagged propositions, Needs research, and Requires revision. Regression tests cover case-insensitive combined search/status matching and reference search.

### Inline claim status update from the queue (PR #63 merged, 23 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/63
Merge commit: `50cfa46f1c14926ab552038d810a6a80fbb2b208`.
Final PR-head CI passed in run 39900318970: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39900318970. Post-merge CI passed in run 39900377529: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39900377529.
Live verification of the new inline selector remains pending.

Implementation:
- Adds an explicit status selector to each actionable proposition.
- Writes only to the existing separate `kerygma_claim_review_status_v1` store through `saveClaimReviewStatus`, never to sermon text or `inductiveStudySource`.
- Changing a claim to Reviewed or Not reviewed removes it from the actionable queue immediately; Needs research and Requires revision remain actionable.
- Refreshes the visible summary counts and empty state in place.
- Reports save failure without pretending the status changed.
- Tests the save target against the specific sermon ID and stable claim key, failed-save handling and missing-key rejection.
- After Render deploys this merge or a descendant, test all four statuses, confirm count updates and queue removal for Reviewed/Not reviewed, and verify that the existing search/status filters, Open claim in sermon navigation, imported IBS evidence, cross-reference panels and `Peace in the Storm` remain intact.

### IBS Study Library search improvement — Doctrine notes (PR #65 merged, 23 October 2026)

PR: https://github.com/johann-han/inductive-bible-study-cloud/pull/65
Merge commit: `0abeb471234cb9c311c57cd7dad760015c4f74e4`.
Post-merge GitHub Actions run 39902957765 passed: https://github.com/johann-han/inductive-bible-study-cloud/actions/runs/39902957765.
Live verification after deployment remains pending.

The helper `buildStudyLibrarySearchText(record)` includes all four note stages, including Doctrine, alongside saved verse-map fields and passage-outline content. Previously, the search included Observe, Interpretation and Discipleship notes but skipped Doctrine, so users could not find saved studies using a term that appeared only in Doctrine notes. Regression coverage checks all four stages, saved verse maps, passage-outline text, case-insensitive matching, incomplete records, and that the library renderer uses the tested helper. This is an additive search fix; it does not mutate study data.

Live acceptance test: create or use a saved study with a distinctive phrase only in Doctrine notes, search that phrase in Study Library, and verify the correct study appears. Also confirm searches in the other three sections and existing verse-map/outline searches still work, and that the notes themselves remain unchanged.

### IBS AI Mentor — Greek and Hebrew lexical study

Additional requirement recorded 23 October 2026: when guiding a reader through a biblical study, the AI should examine the Greek or Hebrew meaning of a word when the original-language sense is relevant to the question or helps clarify the passage. It should identify the original form/transliteration when known, explain the contextual sense and relevant range of meaning, and use reliable lexicon/source data. Strong's numbers, morphology, and parsing may be used only when actually available and reliable. The AI must not invent lexical definitions, Strong's entries, grammatical details, or citations; rely on etymology alone; confuse a word's possible meanings with its contextual sense; or imply a one-to-one mapping between English and Greek/Hebrew words. If reliable lexical evidence is unavailable, it must say so and avoid false precision. Word studies should support, not replace, contextual interpretation.

Verification after deployment: test a passage where a Greek or Hebrew term matters, check the definition against a trustworthy lexicon, ensure contextual meaning is distinguished from the full semantic range, and test a term without available lexical data to confirm the AI acknowledges the limitation.


### Bible Reader — Afrikaans translation

Requirement recorded 23 October 2026: add an Afrikaans Bible option to the existing reader without changing the default translation or saved study data. Added Afrikaans 1933/1953 (AFR53) using the Free Use Bible API's AFR1933 translation ID and the existing canonical book-ID map. Chapter content is loaded through the API's simplified chapter endpoint and cached by translation/book/chapter. Strong's word annotations are not inferred for Afrikaans; existing English KJV annotation behavior remains unchanged. The current full-text search service documents KJV and WEB only, so Afrikaans is available for reading, not yet for text search.

Acceptance checks: switch to Afrikaans 1933/1953 and confirm Genesis 1 loads in Afrikaans; navigate to a New Testament chapter; switch back to KJV and confirm Strong's annotations continue to work; confirm notes, bookmarks, verse maps, outlines, cross-references and Kerygma content remain unchanged. Confirm a failed translation request reports the existing chapter-load error rather than showing English text under the Afrikaans label.

### Bible Reader — full-text verse search

Requirement recorded 23 October 2026: readers must be able to find a verse by remembered words or a phrase without knowing its Bible reference. Added a Search control beside passage navigation. The search dialog accepts a word or phrase, lets the reader choose KJV or WEB, displays matching verse references and text, and opens the selected verse in the existing Bible reader. Navigation updates the active book/chapter/translation, selects and scrolls to the verse, and highlights it briefly. Search results are read-only until a result is selected; this feature does not edit saved study notes or Bible content. Search uses the public Bible API full-text endpoint and reports connection/service errors without clearing existing reader state.

Acceptance checks: search for a distinctive phrase without a reference; verify results show reference and verse text; select a result and confirm the reader navigates to the correct book/chapter/verse and translation; verify selected verse navigation and Strong's annotations continue to work where supported; try no-result and network-error queries; close/reopen search; confirm saved notes, verse maps, outlines, cross-references and Kerygma data remain unchanged. The public search endpoint documents KJV and WEB; the selector is limited to those supported translations.

### IBS AI Mentor — save the question with the answer

Follow-up improvement recorded 23 October 2026: when an AI Mentor response is added to a study, save the user's submitted question/request immediately before the answer, under explicit “Question / request:” and “Answer:” labels. Apply this to both new-study additions and additions to existing studies, preserving the existing passage heading, note separators, version snapshots, section contents, and cloud-sync behavior. This lets a reader later understand why an AI answer was generated.

Acceptance checks: ask a free-form question, add the response to an existing study, and verify both the exact question and answer appear in order; repeat with a second question; confirm both entries persist after switching sections and refreshing. Also verify a first response added to a study includes its question/request and that no existing notes are overwritten.

### IBS AI Mentor — ask questions without leaving the active study

Requirement recorded 23 October 2026: readers need a direct, free-form “Ask AI a Question” action in the active study workspace, separate from the guided review action. The question action opens the existing AI Mentor and focuses the question input without navigating away from the study. On narrow/mobile screens, the AI drawer is a bottom sheet rather than a full-screen panel so the active study remains visible above it. The normal AI question flow continues to receive passage, selected-verse, translation, and active-note context; responses can be added to an existing study using the separate append action.

Acceptance checks: open a saved study on mobile, tap “Ask AI a Question,” verify the study remains visible and the input receives focus, ask a free-form question about the current passage, and confirm the answer appears in the AI panel without changing the active notes. Then append the answer to the existing study and confirm it remains after refresh. Confirm “Ask AI to Guide My Active Notes” still works separately and the desktop drawer remains usable.

### IBS AI Mentor — append follow-up responses to existing studies

Requirement recorded 23 October 2026: AI responses and follow-up answers must be addable to a study that already exists. The existing-study response action is now “Add to Existing Study”; it appends a separately headed “Further AI Study Mentor response” to the section containing the matched study. It re-reads the current saved record at click time, snapshots the prior note version, preserves existing text and other sections, updates the local record and schedules cloud sync. The action is only marked complete after the local write succeeds. “Open Existing Study” remains available through the existing study library/navigation.

Acceptance checks: create or open an existing study, ask the AI a follow-up question, append the answer, and confirm both original content and the added answer survive switching sections and refreshing; append a second follow-up; confirm each is separately headed and readable; confirm note version history is retained and cloud sync is scheduled when signed in. Check storage-write failure feedback and ensure no existing note is overwritten.

### IBS AI Mentor — verified lexical context handoff

Follow-up implementation on feature branch `feat/mentor-lexicon-context`: the reader collects Strong's IDs attached to the currently displayed passage (or selected verses), prioritizes a word mentioned in the user's question, and sends only candidate IDs and word labels to the server. The server retrieves up to four lexical records directly from the STEPBible Brief Lexicons endpoint, validates the response shape, and supplies the returned lemma, transliteration, part of speech when provided, senses/definitions, and source attribution to the AI Mentor. The server does not trust client-supplied definitions. Verified records are cached in memory for 24 hours; unavailable records are omitted rather than replaced with fabricated definitions or demo entries. This is additive and does not modify study notes, Bible text, saved records, or cross-references.

Post-deployment checks: (1) ask about a tagged Greek/Hebrew word in a passage and confirm the AI receives and uses the STEPBible source record; (2) ask about a word whose record is unavailable and confirm the AI acknowledges the limitation; (3) ask a non-lexical question and confirm lexical details do not distract from the answer; (4) confirm selected-verse context, saved notes, verse maps, outlines, and cross-references remain unchanged.

### IBS AI Mentor — Keywords and Linking Words analysis

Implementation requirement recorded 23 October 2026: whenever the AI Mentor analyzes a biblical passage, it must explicitly examine **Keywords** and **Linking Words** as part of the textual evidence. Keywords analysis identifies significant repeated words, key terms, meaningful variations and contrasts, and explains their contextual importance without treating every repetition as significant. Linking Words analysis identifies connectors actually present in the supplied text and explains the relationships they signal (such as addition, contrast, reason, result, condition, purpose, sequence, or inference). The AI must not invent words or relationships, and must distinguish direct textual observation from interpretation. Passage-analysis responses should label these two subsections when appropriate and incorporate them concisely in shorter answers.

The first implementation adds this requirement to the shared AI Mentor system prompt in `server.js`; it does not change saved notes, study data, cross-references, or passage text. Follow-up verification should test a passage with repeated key terms and clear connectors (for example, Romans 5:1–5 or Ephesians 2:1–10), confirm both categories are grounded in the supplied translation, and confirm a non-passage question is not forced into an irrelevant word study.

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


### Bible Reader — unavailable Afrikaans translation removed (23 October 2026)

The Afrikaans 1933/1953 selector and its dedicated AFR53 request path were removed because chapter loading could not be verified in the live app and no dependable, authorised source had been established. The reader retains KJV, ASV, WEB and BBE. This is limited to the translation selector and its fetch branch; saved study notes, annotations, cross-references and other reader functions are not migrated or deleted. If a verified and appropriately licensed Afrikaans source becomes available, it can be added later as a separate, tested feature.


### Bible Reader — Berean Standard Bible added (23 October 2026)

Added BSB as the first additional translation, using the Free Use Bible API's documented `BSB` translation ID and the existing canonical book-ID map. The official Berean Bible terms state that the Berean Standard Bible text is dedicated to the public domain; attribution is appreciated but not required (https://berean.bible/terms.htm). The reader requests one complete chapter at a time and rejects empty or malformed chapter content. BSB does not receive inferred Strong's annotations; the existing KJV-only word annotation path remains unchanged. The existing KJV, ASV, WEB and BBE options and all saved study data remain untouched.

Acceptance checks before proceeding to another translation: load Genesis 1 and a New Testament chapter in BSB; switch to KJV and confirm Strong's annotations still work; switch back to BSB and confirm no KJV annotations are carried over; navigate between chapters and books; verify the reader reports a BSB-specific error if the source fails rather than displaying another translation; confirm Bible search remains limited to its already-supported KJV/WEB sources and does not falsely imply BSB search support. Verify notes, bookmarks, verse maps, outlines, cross-references, markups, and Kerygma data remain unchanged.


### Bible Reader — Darby Translation added (23 October 2026)

Added Darby Translation (DBY) as the second additional reader option. eBible.org identifies the Darby Translation as public domain and lists its canon-only edition (https://ebible.org/find/show.php?id=engDBY). The reader requests one chapter from the Free Use Bible API using the translation ID `engDBY` and the existing canonical book-ID map. The loader validates that the response contains verse text and does not silently substitute a different translation. Strong's annotations remain KJV-only; no annotations are inferred for Darby. Existing translation options and saved study data are unchanged.

Acceptance checks before proceeding to another translation: load Genesis 1 and a New Testament chapter in DBY; confirm chapter navigation; switch to KJV and confirm Strong's annotations; confirm DBY has no inferred KJV annotations; confirm failure handling names DBY; verify notes, markups, bookmarks, verse maps, cross-references, and Kerygma remain intact. Search remains limited to its existing supported translations.
