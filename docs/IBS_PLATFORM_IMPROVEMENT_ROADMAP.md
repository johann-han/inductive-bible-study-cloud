# IBS Platform Improvement Roadmap

**Purpose:** Standing project reference for the six agreed improvement areas, their objectives, acceptance criteria and implementation order.

**Product direction:** Make the platform one coherent, evidence-driven biblical research and study environment. Begin with Scripture, guide the student through the four inductive stages, and preserve a traceable path from every important conclusion back to its supporting evidence.

**Baseline:** The roadmap begins from the merge of PR #163. Existing features should be integrated and strengthened, not duplicated or replaced.

## Existing platform foundation

The platform already includes the four-stage study workspace, Bible reader, notes, Scripture markups, Strong's numbers, Hebrew/Aramaic/Greek morphology, verse maps, outlines, cross-references, related passages, cloud sync, version history, AI study guidance and the Kerygma sermon studio.

## Guiding principles and safeguards

1. **Scripture remains primary.** Background resources, dictionaries, commentaries and AI explanations are supporting tools, not substitutes for the biblical text.
2. **Keep the stages distinct.** Observation, interpretation, doctrine and discipleship must remain methodologically distinct. An inference must not be presented as an explicit statement of Scripture.
3. **Preserve provenance.** Every meaningful evidence item should retain its biblical reference, source type and relationship to the stage or conclusion using it.
4. **Keep the student in control.** Evidence may be suggested and reviewed; it must not be silently inserted, overwritten or promoted into a conclusion.
5. **Preserve existing data.** Protect all studies, stage notes, markups, outlines, verse maps, cross-references, related passages, version history, backups and Kerygma sermons.
6. **Prefer backward-compatible changes.** Extend the existing study-record JSON and cloud payload before considering migrations. A migration requires a demonstrated need and a separate safety review.
7. **Develop incrementally.** Use feature branches and PRs. Do not edit `main` directly. Run both the full IBS and IBS/Kerygma regression workflows before merging.
8. **Verify end-to-end behaviour.** Check local storage, cloud round-trips, mobile/desktop behaviour, backup/restore and PWA cache versioning when affected.

**Non-goals:** Do not restart the project, replace the current application architecture, create parallel note stores, duplicate existing tools, or add AI features merely to add buttons.

### Protected project data

- Existing study library and all four stage note sections.
- Scripture markups, verse maps, passage outlines, cross-references and related passages.
- Note version history, active-stage pointers, local storage, cloud-sync records and backup/restore compatibility.
- Kerygma sermons, including existing sermon content and links back to IBS studies.
- Invitation-only access, administrator tools and current authentication/security controls.

---

# The six improvement areas

## 1. Evidence-driven inductive workflow

**Priority: First**

**Objective:** Make the passage, the student's observations and later conclusions part of one traceable chain of reasoning.

Required capabilities:

- Each evidence item has a stable identifier, category, biblical reference, source location, translation where relevant, source stage where applicable, and capture/update information.
- Stage handoffs show the actual source and its origin. A copied text block is not sufficient as the only record of provenance.
- Conclusions can be linked to one or more evidence items. The platform distinguishes direct textual support, contextual support, inference and unresolved questions.
- Evidence created in a later stage cannot silently flow backwards into an earlier stage.
- Refreshing carried-forward material updates only generated content and its source links; personal notes remain intact.
- Provenance metadata survives local storage, cloud sync, backup/restore and version operations.

**Acceptance standard:** A student can select a doctrinal or interpretive conclusion and identify the exact observations, verses, word studies or related passages that support it. Unsupported conclusions are visibly distinguishable from supported ones.

## 2. Guided inductive methodology

**Objective:** Make each stage methodologically clear and prevent premature movement to conclusions.

| Stage | Guiding question | Core work |
|---|---|---|
| Observation | What does the passage actually say? | Context, repeated terms, linking words, people, actions, commands, contrasts, structure and relationships. |
| Interpretation | What did the author communicate in context? | Historical and literary context, grammar, original languages, paragraph flow, authorial intention and meaning. |
| Doctrine | What does the passage teach? | Biblical principle, doctrinal theme, supporting passages, boundaries and theological conclusion. |
| Discipleship | How should we respond? | Worship, obedience, character, relationships, ministry and practical response. |

The stage experience should provide guidance and optional review criteria without forcing a rigid checklist. Completion status should distinguish not started, in progress and reviewed; it must not imply that a passage is fully understood merely because fields have been filled.

## 3. AI Study Mentor

**Objective:** Make AI a disciplined study tutor that helps the student reason from the text.

- **Stage-aware guidance:** Respect the active inductive stage and do not jump from observation directly to application.
- **Socratic teaching:** Ask useful questions first, then explain when explanation is needed. Do not simply replace the student's work with a generated essay.
- **Contextual reading:** Consider the immediate paragraph, argument, book context and relevant canonical connections.
- **Original-language integration:** Use existing Strong's, Hebrew/Aramaic/Greek morphology and word-study data in context. Do not treat a dictionary gloss as the meaning of every occurrence.
- **Evidence audit:** Identify unsupported claims, missing context, questionable quotations, overconfident conclusions and unresolved alternatives.
- **Citation discipline:** Distinguish exact biblical quotation, paraphrase, historical-source summary and AI explanation. Never invent a Bible reference or quotation.
- **Uncertainty:** State when evidence is insufficient or when multiple interpretations remain plausible.

**Acceptance standard:** AI responses are relevant to the selected passage and stage, use verifiable references, distinguish text from inference, and help the student develop rather than bypass inductive reasoning.

## 4. Biblical research environment

**Objective:** Integrate research resources around the active passage without overwhelming the study workspace.

- Parallel Bible translations and meaningful comparison of wording, including clear identification of translation and textual differences.
- Historical, cultural, geographical and literary background resources with source attribution.
- Biblical dictionaries, theological dictionaries, lexicons and reference resources.
- Expanded Hebrew, Aramaic and Greek research, with morphology, syntax and word usage in context.
- Theme and subject studies that show how a theme develops across Scripture while retaining the context of each passage.
- Cross-reference exploration that explains the nature of the relationship rather than merely listing references.
- Check resource licensing, attribution and availability before integration.

**Acceptance standard:** A student can investigate a passage and its key terms using reliable, attributed sources without losing the active passage or current stage.

## 5. Study reports and academic output

**Objective:** Generate useful documents from the student's verified study material while retaining source traceability.

- Complete inductive study report covering all four stages.
- Passage exposition and teaching outline.
- Doctrinal study and thematic Bible study.
- Academic research report with biblical references and resource citations.
- Expository sermon preparation handoff to Kerygma, retaining links to the IBS source study and evidence.
- Export to editable formats such as DOCX and Markdown, with PDF where required.

**Acceptance standard:** Reports use only existing or explicitly reviewed material, preserve references and provenance, identify gaps and unresolved issues, and never invent citations to make a document appear complete.

## 6. Workspace experience

**Objective:** Make serious study easier by reducing interface friction and keeping related tools close to the passage.

- Efficient use of vertical space and compact controls for infrequently used panels.
- Adjustable and collapsible research panels with sensible defaults on desktop, tablet and mobile.
- Clear visual distinction between Bible text, student-authored notes, imported sources and AI-generated material.
- A study overview showing current stage, saved work, outstanding questions and source/evidence status.
- Fast navigation between a verse, its notes, word studies, markups, cross-references and related passages.
- Reliable autosave and cloud-sync status, including clear recovery behaviour when the network is unavailable.
- Global search across the student's saved studies, notes, references and research.

**Acceptance standard:** The student can move through the study without losing context; the interface remains usable on small screens; saving and sync behaviour are understandable and dependable.

---

# Recommended implementation sequence

| Phase | Workstream | Deliverable | Order |
|---|---|---|---|
| 1 | Evidence provenance foundation | Add structured source identifiers and evidence-link metadata to the existing handoff. Preserve it through local/cloud sync. No schema migration. | Current start |
| 2 | Claim-to-evidence links | Let the student select a statement, attach one or more evidence sources, classify the relationship, and review stale or changed statements. | Merged in PR #165 · live deployment unverified |
| 3 | Stage methodology | Improve prompts, stage guidance, review criteria and completion states without turning study into a forced form. | After Phase 2 |
| 4 | AI Mentor reliability | Use active-stage context, source metadata, original-language evidence and verification rules in AI prompts and response checks. | After Phase 3 |
| 5 | Research resources | Add attributed reference sources, translation comparison and richer contextual/theme research in manageable modules. | Parallel, controlled |
| 6 | Reports and experience | Build source-aware reports and continue usability improvements informed by real use. | Ongoing |

## Phase 1 implementation scope

The first code phase adds structured provenance to the existing carried-forward evidence:

- Source ID.
- Source category/type.
- Originating stage where relevant.
- Biblical passage reference.
- Destination stage.
- Capture time.

The metadata must survive the existing local-storage and Supabase JSON round-trip. No new database table or migration is planned for this phase.

---

# Technical delivery and quality gates

- Create a feature branch from the latest `main`; never commit directly to `main`.
- Change the smallest possible surface area. Reuse existing records, controls and data structures where appropriate.
- Existing studies without new metadata must continue to load and save unchanged.
- Verify that evidence links survive local save, Supabase upload/download, merge, backup and restore paths as applicable.
- Do not silently rewrite stage notes. Generated handoff blocks remain bounded and refreshable.
- Run the full IBS suite and combined IBS/Kerygma suite; inspect failures rather than weakening meaningful tests.
- Compile inline JavaScript and verify desktop/mobile behaviour. Update the service-worker cache version when a client asset requires it.
- Distinguish merged from deployed. Verify the exact production commit before reporting that a change is live.

# Current status and change log

| Area | Current position | Next verification | Status |
|---|---|---|---|
| Evidence-driven workflow | PR #164 established source provenance; PR #165 adds statement-to-evidence links with direct, contextual, corroborating and inference classifications. | Verify the production commit, then test evidence adequacy and begin guided methodology improvements. | Phases 1–2 merged · live deployment unverified |
| Guided methodology | Four stages now have distinct text-led prompts, optional review criteria and note-specific review states. Reviewed status is invalidated when notes change and is stored in the existing study JSON payload. | Run IBS and IBS/Kerygma CI; verify local/cloud/backup round-trips and mobile layout before merge. | In PR · Phase 3 implementation |
| AI Study Mentor | AI Mentor and stage guidance already exist. | Audit stage adherence, quotation accuracy and evidence grounding. | Planned |
| Research environment | Strong's, morphology, word studies and cross-references exist. | Map missing resources and source/licensing requirements. | Planned |
| Reports and output | Exports and Kerygma integration already exist. | Verify generated output preserves sources and provenance. | Planned |
| Workspace experience | Responsive workspace and compact passage controls exist. | Continue desktop and mobile usability checks. | Ongoing |

### Implementation log

| Date/reference | Change | Verification |
|---|---|---|
| 2026-11-08 · PR #161 | Added guided stage progress/navigation and optional evidence handoff. | IBS and IBS/Kerygma regression workflows passed. |
| 2026-11-08 · PR #162 | Compacted the empty Related passages panel. | IBS and IBS/Kerygma regression workflows passed. |
| 2026-11-08 · PR #163 | Placed Related passages control beside the study word count. | IBS and IBS/Kerygma regression workflows passed. |
| 2026-11-08 · PR #164 | Added structured source provenance to handoffs and stored links in the existing `study_records.sections._evidenceLinks` JSON payload; no migration. | IBS #31 and IBS/Kerygma #363 passed, including a local → cloud → local evidence-link round-trip test. |
| 2026-11-08 · PR #165 | Added selected-statement evidence linking, relationship classifications, stale-statement review, and local/cloud/backup persistence for claims. | IBS Regression #40 and IBS/Kerygma #373 passed; merged as `29ec6e0`. Render deployment not yet verified. |

**Platform success criterion:** A student can move from a biblical passage to a carefully reasoned interpretation, a defensible doctrinal conclusion and a faithful response, while being able to inspect the Scripture and research evidence behind every important step.


### 2026-11-12 · Phase 3 implementation

- Added stage-specific guidance for Observation, Interpretation, Doctrine and Discipleship.
- Added optional review criteria and Not started / In progress / Reviewed status.
- Reviewed status is tied to a fingerprint of the stage notes; editing the notes invalidates the review.
- Stored review metadata in the existing study-record JSON and included it in cloud sync and version-1 backup/restore without a schema migration.
- Review is optional and does not block movement between stages or imply that the passage is fully understood.
- Pending: automated CI and production verification.
