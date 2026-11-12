# IBS UX/UI Redesign — Woord van Lewe Design System

**Status:** Design specification / audit baseline  
**Branch:** `feat/ibs-woordvanlewe-ux-ui`  
**Base:** `main` at `8b39bbebc2812664765a8a4da10b33bbea9ca6ee`  
**Scope:** Existing IBS application and its Kerygma integration. This document does not authorise a rebuild or data-model changes.

## 1. Product objective

Make IBS a coherent, Scripture-centred biblical research and inductive study environment with a professional user experience and a visual identity consistent with the Woord van Lewe website.

The application must feel like the research workspace of the same organisation, not a generic SaaS dashboard. Its character should be editorial, scholarly, restrained, confident, accessible and calm during extended reading and study.

## 2. Non-negotiable safeguards

- Preserve the existing application architecture and deployed workflows.
- Do not edit `main` directly. All implementation must use feature branches and pull requests.
- Do not replace the application, introduce a parallel frontend, or duplicate existing features.
- Preserve studies, stage notes, Bible-reader state, markups, Strong's and morphology data, outlines, verse maps, cross-references, related passages, evidence links, version history, Supabase sync, backup/restore, authentication and Kerygma sermons.
- No database migration for visual work.
- Do not change Bible text, original-language data, study semantics or evidence provenance as part of a styling task.
- Maintain keyboard access, visible focus, readable contrast, responsive behaviour and reduced-motion support.
- Run the existing IBS and IBS/Kerygma regression workflows. Verify production deployment separately from merge status.

## 3. Brand alignment

Reference: https://www.woordvanlewe.co.za/

The public brand communicates a return to the authority of Scripture, biblical discipleship, theological depth and faithful witness. IBS should express those values through its visual language and product behaviour.

### Brand extraction requirement

Before implementation, inspect the live WordPress theme and its loaded stylesheets, fonts, logo assets and computed styles. Record the actual brand values and source locations here. Do not guess HEX values or substitute a generic navy/teal palette.

Record:
- Primary and secondary brand colours.
- Accent and link colours.
- Main background and surface colours.
- Heading and body text colours.
- Border, muted text and focus colours.
- Font families, weights and type scale.
- Logo/wordmark assets and usage rules.
- Light/dark theme behaviour, if the public site defines both.

### Semantic IBS tokens

Map verified brand values into semantic tokens rather than hardcoding colours per component:

- `--ibs-brand-primary`
- `--ibs-brand-secondary`
- `--ibs-brand-accent`
- `--ibs-bg`
- `--ibs-surface`
- `--ibs-surface-raised`
- `--ibs-text`
- `--ibs-text-muted`
- `--ibs-border`
- `--ibs-focus`
- `--ibs-link`
- `--ibs-success`
- `--ibs-warning`
- `--ibs-danger`

Semantic status colours must remain distinguishable and meet contrast requirements. Scripture markup colours are a separate functional system and must not be recoloured indiscriminately to match brand accents.

## 4. Experience principles

1. **Scripture first:** the active passage remains the visual and functional centre of study.
2. **One continuous workflow:** Observation, Interpretation, Doctrine and Discipleship feel like connected stages of one study, not four separate applications.
3. **Evidence remains traceable:** handoffs and conclusions retain source references and provenance.
4. **Context is preserved:** opening a lexicon, cross-reference, AI Mentor or research panel must not lose the active passage, selected verse or current stage.
5. **Progressive disclosure:** show frequently used controls; collapse secondary tools until needed.
6. **Quiet interface:** reduce decorative cards, heavy borders, excessive shadows, oversized headings and unnecessary empty space.
7. **Predictability:** common controls, navigation, dialogs, save states and interactions behave consistently.
8. **Responsive by design:** desktop, tablet and mobile receive intentional layouts, not merely compressed desktop screens.
9. **Accessible by default:** keyboard navigation, focus indicators, contrast, readable line lengths, scalable text and touch targets.
10. **User trust:** clearly distinguish Scripture, student-authored content, imported sources and AI-generated content.

## 5. Information architecture proposal

Keep the existing routes and capabilities. Rationalise their presentation into a consistent shell:

- **Home:** resume active study, create study, recent studies, saved work and quick access to Bible/research.
- **Study workspace:** passage header, stage navigation, Scripture/evidence area, notes and contextual tools.
- **Bible reader:** translation and passage controls, readable text, verse actions and persistent reading position.
- **Research:** word studies, Strong's, morphology, lexicons, cross-references, related passages and background resources.
- **Library:** saved studies, search, filters and study management.
- **Kerygma:** clearly connected sermon preparation, with source-study linkage retained.
- **Account/admin:** existing invitation-only access and administrator controls, without weakening security.

Navigation labels and placement must be validated against existing routes before changing them.

## 6. UX audit and acceptance criteria

### A. Global shell and navigation
- One consistent visual system across Home, reader, study workspace and Kerygma handoff.
- Clear active location and current study/passage context.
- Predictable back/navigation behaviour.
- No navigation item takes the user out of an active study unexpectedly.
- Responsive navigation avoids horizontal overflow and inaccessible hidden controls.

### B. Home dashboard
- Primary action is **Resume study**, opening the active study at its correct active stage.
- Secondary action is **New study**.
- Recent studies are scannable and searchable.
- Show useful progress/status without turning the dashboard into a KPI-heavy admin panel.
- Empty, loading and error states are deliberately designed.

### C. Study workspace
- Passage and current stage are always identifiable.
- Stage navigation shows progress and allows deliberate movement without losing work.
- Evidence handoff is visible, reviewable and source-linked.
- Notes remain the student's own work and are never silently overwritten.
- Related passages and secondary panels are compact by default and adjustable where appropriate.
- AI Mentor is available in context and does not navigate away from the study.

### D. Bible reader
- Comfortable reading width, line height and font size.
- Translation and passage selection are easy to reach without dominating the screen.
- Reopen at the last-read passage.
- Verse selection, copy, notes, markup and Strong's actions are discoverable and consistent.
- Word-level interactions do not cause layout jumps or obscure surrounding text.

### E. Research tools
- Research opens alongside or over the active passage, with a clear close/return action.
- Source, language, lemma, morphology and reference are visibly distinguished.
- Definitions and glosses are not conflated.
- Panels use compact density and sensible scrolling.
- Dialogs fit phone viewports and support drag/resize only where useful.

### F. Saving and feedback
- Save/sync state is visible but unobtrusive.
- Distinguish saving, saved, offline/pending sync and failure.
- Errors explain recovery steps in plain language.
- Avoid false success indicators.
- Preserve local/cloud conflict and recovery behaviour.

### G. Mobile and tablet
- Purpose-designed compact navigation.
- Main actions reachable without excessive scrolling.
- Panels become drawers/sheets with sensible heights and visible handles where appropriate.
- No clipped controls, overlapping tabs or horizontal page drift.
- Touch targets and typography remain comfortable.
- Test portrait, landscape and browser desktop-site mode.

## 7. Visual design rules

- Use the verified Woord van Lewe font and colour identity.
- Use a restrained typographic hierarchy; avoid oversized page titles.
- Use consistent spacing, radius, border and elevation tokens.
- Prefer subtle surface separation over nested cards.
- Reserve brand accent for primary actions, active navigation and meaningful emphasis.
- Keep Scripture markup colours semantically distinct from navigation and brand colours.
- Ensure all text and interactive states meet WCAG 2.2 AA contrast targets where applicable.
- Provide visible hover, focus, pressed, disabled, loading and error states.
- Avoid animation that distracts from reading; respect `prefers-reduced-motion`.

## 8. Implementation sequence

1. **Brand extraction and design inventory:** collect real website tokens and assets; inventory current IBS components and CSS.
2. **Design-system foundation:** define semantic CSS variables, typography, spacing, radii, surfaces, controls and focus states. No behaviour/data changes.
3. **Global shell and Home:** establish consistent header/sidebar/mobile navigation and redesign dashboard.
4. **Study workspace:** improve stage navigation, passage hierarchy, evidence handoff and panel behaviour.
5. **Bible reader:** refine reading ergonomics and verse interactions.
6. **Research surfaces:** standardise lexicon, morphology, cross-reference and related-passage panels.
7. **Kerygma consistency:** align visual language while preserving sermon workflows and IBS links.
8. **Responsive/accessibility pass:** test device sizes, keyboard, contrast, zoom and reduced motion.
9. **Regression and production verification:** run both test workflows, verify persistence and restore, then confirm deployed commit.

Each phase should be a small, reviewable PR with screenshots and explicit acceptance checks. Do not bundle broad visual changes with unrelated data or feature work.

## 9. First audit findings from repository review

- The deployed application is a mature single-page HTML/JavaScript application with a large `index.html` and supporting `js`, `lib`, `server.js`, `sermon` and Supabase assets. Avoid a framework rewrite.
- Tailwind CDN and substantial inline CSS are present; design tokens should be centralised before component-level restyling.
- Existing markup colours encode study meaning and must be protected.
- Mobile-specific viewport and overflow handling already exists; any shell redesign must preserve and regression-test it.
- The existing platform roadmap already requires Scripture-first design, stage separation, evidence provenance, user control and responsive workspace improvements. This document extends that roadmap; it does not replace it.

## 10. Evidence gathered from the 12 November 2026 screen recordings

The recordings show the live IBS Home, active study workspace and the current Woord van Lewe homepage in the same browser session. The website's visible design language is confirmed at the visual level:

- Deep forest-green identity in the announcement strip, primary dark sections and calls to action.
- Warm ivory/off-white page surfaces and muted beige section backgrounds.
- Sage/soft green secondary surfaces and restrained muted-gold details.
- Dark green/near-black body text, with refined high-contrast serif display headings and clean sans-serif supporting text.
- Editorial composition: generous whitespace, clear section rhythm, restrained borders and understated cards.
- The logo combines an open-book symbol with the Woord van Lewe name and the descriptor “Bybelse dissipelskap”.
- Brand language centres on Scripture, Christ, obedience and biblical discipleship; IBS should feel like the practical study environment of this identity.

The recordings do not expose the website's CSS values, font file names or asset URLs. Exact HEX values and font-family names remain unverified and must be extracted from the site's stylesheet/theme before they are committed as tokens.

### Current IBS Home observations

- The page already has a useful hierarchy: administrator access controls, study statistics, “Pick up where you left off”, recent passages, and the four inductive stages.
- The fixed dark navy header and bright orange buttons are visually disconnected from the forest-green/ivory website identity.
- The large pale-yellow resume panel draws attention, but its visual weight competes with the actual next action. Rework it as a calm, clear “Continue your study” feature with a single dominant action.
- Administrator invitation and access-request tools are prominent on the same page as the student's study dashboard. Keep administrator functions available but visually subordinate/collapsible so they do not dominate routine study.
- The four-stage overview is useful, but should read as one connected study path with clear progress and a visible active/resume stage.
- Recent studies, statistics and the stage overview should use a more consistent spacing and surface system, with less nested-card appearance.
- The video confirms the current active study is Romans 1 and that the resume action is labelled “Resume Observe Study”. Preserve this behaviour and verify its destination during implementation.

### Current study-workspace observations from the second recording

The second recording is especially important because it shows actual interaction with the study workspace rather than only its appearance.

- The top navigation is dense, with many compact actions competing for attention. Actions for study navigation, tools, AI and other features are presented at nearly the same visual level.
- The Bible passage is visible, but its relationship to the study stage and the research/notes workflow is not sufficiently explicit. The user must infer where to go next.
- The stage tabs and secondary controls occupy separate horizontal bands. This consumes vertical space and makes the workspace feel like a collection of toolbars.
- The AI Mentor appears as a separate right-side panel. Its content is useful, but the panel competes with the passage for space and feels detached from the point being studied.
- Study notes, evidence and AI output need a clearer relationship. A user should be able to see which verse or observation a note or AI response relates to, and decide whether to add it to their own study.
- The workspace presents too many simultaneous controls and panels. This increases cognitive load before the user has even begun interpreting the passage.
- The page appears to preserve a large reading area, but there is not yet a strong, persistent visual indication of the current study task, stage objective and what has been carried forward from earlier stages.
- The visual density and small controls are likely to become more difficult on tablet and mobile. Responsive behaviour must be designed around task priority, not simply shrinking or wrapping the existing toolbar.

## 11. Structural redesign: the study experience must change, not just its skin

The core product problem is not primarily colour, typography or card styling. It is that the interface exposes features and controls without making the study method itself the organising structure. The redesign must therefore begin with the user's end-to-end study journey and the information architecture.

### 11.1 Organise the product around the user's work

The primary navigation should distinguish a small number of work areas:

1. **Study** — the active inductive study, with its passage, stage, evidence, notes and contextual tools.
2. **Bible** — reading and passage exploration, with a direct route to start or continue a study.
3. **Research Library** — saved and searchable word studies, lexicons, morphology, cross-references and other research resources.
4. **Sermons** — Kerygma sermon preparation, linked to its source study.
5. **Home** — resume, create and find work.

These are proposed conceptual groupings, not permission to delete existing routes or features. During implementation, map every existing action and route into the new information architecture before moving controls.

### 11.2 Make the study workspace a single connected environment

The active study should have a stable frame with four zones:

- **Study identity and progress:** passage, translation, current stage, save/sync status and progress through the four stages.
- **Primary work area:** the content needed for the current stage. Scripture should remain visible and central when the task requires passage work.
- **Evidence and notes:** observations, interpretation, doctrinal conclusions and discipleship responses, with references back to the verse/source that supports them.
- **Contextual research:** Strong's, morphology, lexicons, cross-references, related passages and AI Mentor. These should open when requested and should not permanently compete with the passage.

The zones may be implemented as columns, tabs, drawers or resizable panels depending on viewport. The conceptual relationships and context retention must remain consistent.

### 11.3 Turn the four stages into a guided progression

The stage navigation should explain where the user is, what the stage is for and what evidence is expected. It should not be merely four tabs.

- **Observe:** What does the text say? Record textual details, repeated words, structure, grammar, linking words, context and questions. Keep conclusions and applications out of this stage.
- **Interpret:** What did the author mean? Work from observations toward contextually grounded meaning, using cross-references and original-language research where relevant.
- **Doctrine:** What does the passage teach about God, humanity, sin, salvation, the church and other relevant doctrinal themes? Conclusions must remain grounded in the passage and context.
- **Discipleship:** How should the truth shape belief, character, obedience, relationships and action? Application must follow sound observation and interpretation rather than replace them.

Each stage should show:
- A concise stage purpose and practical prompt.
- Existing work carried forward from prior stages, clearly labelled as inherited evidence.
- The current stage's own editable work.
- Source/verse links for each evidence item where available.
- A clear completion/ready-to-advance state without forcing a user to complete every optional field.
- A review of what will be carried into the next stage.

Do not silently copy AI output into student-authored notes. AI suggestions must be clearly labelled and require explicit user acceptance.

### 11.4 Make evidence handoff explicit and reversible

A core interaction should be “carry forward” rather than making users copy and paste between stages. When moving from Observation to Interpretation, for example, the user should see relevant observations and references available in the next stage.

- Preserve the original evidence and its stage of origin.
- Allow the user to select which evidence items are relevant to carry forward.
- Preserve links to the source verse, word, passage or research item.
- Allow the user to revise their selection without destroying the earlier stage.
- Distinguish inherited evidence from new conclusions.
- Never turn a dictionary definition into a translation gloss or treat an AI-generated statement as established biblical evidence.

### 11.5 Make tools contextual rather than permanently visible

The passage, selected verse or selected word should be the context for research actions. Selecting a verse or word should offer a compact, consistent action surface for notes, markup, Strong's, morphology, cross-references and AI assistance.

Research should open in a contextual side panel on wide screens and a drawer/sheet on narrow screens. It must retain the selected reference and return the user to the same place. The AI Mentor should work in this same contextual model, not as a separate destination that displaces the active study.

### 11.6 Redesign the dashboard around the next meaningful action

The Home screen should answer, in order:

1. What study was I working on?
2. What stage was I in?
3. What is the next useful action?
4. How can I start a new study or find previous work?

Do not make statistics, administration tools or a catalogue of features the main event. Administrative controls should be in a separate admin area or a clearly subordinate expandable section, subject to the existing access model.

### 11.7 Responsive layout must change interaction patterns

- Desktop: stable study frame with a central work area and optional contextual research panel.
- Tablet: prioritise passage and current task; secondary panels open on demand.
- Mobile: one primary task surface at a time, with persistent stage/context navigation and bottom-sheet or full-screen research. Avoid a miniature desktop toolbar.
- Preserve reading position, selected verse, stage, unsaved note state and open research context when panels open/close or layout changes.

## 12. Revised implementation priorities and acceptance gates

The previous sequence is revised. Do not begin by changing global colours or the dashboard alone.

**Phase 0 — Workflow and information-architecture audit**
- Inventory every current navigation item, button, panel, modal and route.
- Trace the actual user journey from starting a study through all four stages and into Kerygma.
- Identify duplicate actions, orphaned features, confusing labels, unnecessary navigation and context loss.
- Map each existing capability to its new conceptual location.
- Record what data is read/written by each interaction and which existing tests cover it.
- Deliver an approved interaction map and before/after navigation model before moving existing controls.

**Phase 1 — Study workspace interaction prototype**
- Prototype the stable study frame, stage progression, evidence carry-forward and contextual research panel.
- Test a representative passage workflow on desktop and mobile.
- Validate with existing Romans 1 study data without altering or deleting it.
- No production data migration.

**Phase 2 — Shared design system and global shell**
- Extract verified Woord van Lewe colours, fonts and logo assets.
- Implement semantic design tokens and common navigation, buttons, fields, panels, dialogs and status states.
- Apply the shell to Home, Study, Bible, Research and Kerygma.

**Phase 3 — Implement the guided study workflow**
- Improve all four stages and their handoffs.
- Ensure evidence provenance, verse links, student ownership and AI labelling.
- Test save/sync, reload, resume, backup and restore.

**Phase 4 — Dashboard, Bible and research redesign**
- Implement the new dashboard priorities.
- Improve Bible reading and verse/word interaction.
- Consolidate research surfaces into contextual panels without removing capabilities.

**Phase 5 — Kerygma, responsive and accessibility**
- Keep sermon preparation linked to the source study.
- Complete mobile/tablet interaction patterns and accessibility checks.
- Perform full regression and deployment verification.

### Acceptance gate: no design phase is complete merely because it looks better

A phase is accepted only when:
- The user's next action is obvious without needing to understand the application's internal feature names.
- The active passage, stage and study remain identifiable.
- The user can move between stages without losing work or source links.
- Relevant evidence is carried forward transparently and can be reviewed.
- Research and AI tools preserve the selected passage/verse context.
- Existing functionality, data persistence, auth and Kerygma linkage continue to work.
- Desktop, tablet and mobile flows have been tested.
- Screenshots and test results are attached to the PR.

## 13. Outstanding evidence before implementation

- Extract exact colours, fonts and logo asset URLs from the current live Woord van Lewe WordPress theme.
- Capture or inspect mobile IBS Home, Bible reader, active study stages, research panels and Kerygma.
- Map current navigation/actions to existing functions and routes.
- Identify CSS selectors and components responsible for the reported visual inconsistencies.
- Establish a screenshot baseline before the first visual PR.
- Validate the proposed work-area groupings against the full set of existing application features.

**Definition of done:** IBS has a coherent Woord van Lewe visual identity, a clear and efficient study workflow, readable Scripture, accessible research tools and dependable responsive behaviour, with all existing data and capabilities preserved. The interface guides the inductive study method rather than requiring users to manage a collection of disconnected tools.
