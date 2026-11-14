# IBS Workspace Interaction Map

**Status:** Source-level audit; no application code changed  
**Audit baseline:** `main` at `8b39bbebc2812664765a8a4da10b33bbea9ca6ee` (the baseline used for the UX redesign branch)  
**Working branch:** `feat/ibs-woordvanlewe-ux-ui`

## Purpose

This map records the existing DOM surfaces and behavioural dependencies that must be preserved while the IBS workspace is reorganised. It is an implementation safety document, not a proposal to replace the study engine.

## Existing surfaces and responsibilities

| Existing element / function | Current responsibility | Redesign treatment | Preservation requirement |
|---|---|---|---|
| `#readerWorkspace` | Main authenticated Bible-reading environment | Become the shared study workspace shell rather than a reader-only surface | Keep authenticated show/hide flow and Bible reader state |
| `#scriptureContainer` | Renders the active chapter and verse interactions | Keep as the Scripture pane, with more deliberate space and clear active-passage context | Preserve verse selection, markups, copy, Strong's, cross-reference and verse-map actions |
| `#workspacePanel` | Fixed right-hand study notes drawer | Evolve into the primary study-work area within the shared workspace; do not discard its controls | Preserve all child IDs and existing event listeners until each is deliberately migrated |
| `#wsTabObserve`, `#wsTabInterpret`, `#wsTabDoctrine`, `#wsTabApply` | Select active inductive stage | Present as a persistent, readable stage navigator | Preserve stage keys: `observe`, `interpret`, `doctrine`, `apply` |
| `#workspaceWorkflowProgress` and child progress IDs | Show stage position and notes completion | Keep as compact stage context, not the dominant visual element | Preserve status calculations and accessible progress semantics |
| `#workspaceStageGuidance` and review controls | Stage-specific purpose, prompts and review state | Place beside/above the active stage editor as contextual guidance | Preserve review hash invalidation when notes change |
| `#workspaceEvidenceHandoff` | Displays evidence from earlier stages and allows explicit insertion | Make this a compact, discoverable “Evidence from earlier stages” area | Never auto-insert evidence; retain explicit user action and provenance |
| `#workspaceClaimEvidencePanel` | Links a selected user-authored statement to Scripture/study sources | Keep as a contextual evidence inspector, available from the active stage | Preserve claim/source relationship types and statement selection safeguards |
| `#workspaceNoteArea` | Main text editor for active stage | Promote to the central writing surface | Preserve autosave, version snapshots, word count, find-in-section, and cloud sync |
| `#studyRelatedPassagesSection` and manager | Stores related passages with the study | Move into a contextual research/evidence area; avoid occupying permanent editor height | Preserve saved passage records and manager actions |
| `#workspaceNoteFind` | Search within active stage notes | Keep in a secondary editor toolbar or collapsible utility | Preserve next/previous matching behaviour |
| Export/report/sermon controls | Export study notes and structured sermon source | Group under a single “Export” or “Study actions” menu | Preserve all export formats and Kerygma integration |
| `#aiDrawer` / `setAIDrawerOpen()` | AI Hermeneutic Study Guide conversation | Make contextual and adjacent to the passage/stage; avoid a detached competing primary panel | Preserve conversation, prompt chips, selected passage context and explicit insertion/review behaviour |
| `#mobileBackdrop` | Backdrop for mobile navigation | Do not reuse as a workspace overlay | Keep hidden when the study workspace opens |
| `openStudyWorkspacePanel()` | Opens notes panel and relocates it to body on touch layouts | Replace only after the integrated layout is in place and tested | Preserve fullscreen exit, touch detection, ARIA state and mobile behaviour during transition |
| `setReaderFullscreenMode()` | Hides notes and AI while reading fullscreen | Revisit as a workspace focus mode, not a competing navigation state | Preserve Escape handling and restore predictable state |
| `showBibleReader()` / `showDashboardHome()` | Switches between dashboard and authenticated reader | Keep the dashboard/reader route transition; workspace composition changes inside reader | Preserve auth checks, active note save and active passage restore |

## Dependency and regression map

### A. Active passage and stage state

- `appState.currentBook`, `appState.currentChapter`, and `appState.activeNotesSection` are the shared context for Scripture and study notes.
- Stage identifiers are stable data keys, not presentation labels.
- Opening a study from the dashboard loads the requested book/chapter/stage, renders the book list, chapter pills and Scripture, loads the active note, then opens the study workspace.
- Any integrated layout must use this existing state. Do not introduce a second independent “current passage” or “current stage” state.

### B. Notes persistence

- The editor is bound to the existing study-library record and active stage.
- Meaningful note edits create version snapshots; edits invalidate that stage's reviewed state.
- Save and cloud-sync behaviour must remain unchanged.
- Moving the editor in the DOM must not duplicate its ID, detach it from event listeners, replace its value during a rerender, or cause save handlers to point to a stale element.

### C. Evidence integrity

- Earlier-stage evidence is presented for deliberate review and insertion.
- Statement-to-evidence linking distinguishes direct textual support from inference and other source relationships.
- Preserve the existing source records, claim links and explicit insertion step.
- Do not merge generated evidence into user-authored notes silently.

### D. AI context and insertion

- AI is currently a separate drawer with a conversation stream and prompt chips.
- Its contextual passage status must continue to reflect the active Bible passage and selected verse where applicable.
- AI-generated material must remain distinguishable from the user's own analysis and require an explicit action before being inserted into notes.

### E. Responsive and focus states

- Current phone/tablet behaviour moves fixed panels to `document.body` to escape clipping by the reader's overflow-hidden container.
- The workspace and AI drawer each manage their own open/close classes and ARIA state.
- Fullscreen reading explicitly hides both the study panel and AI drawer.
- A new integrated layout should reduce these special cases, but should not remove them until equivalent keyboard, touch, orientation-change and desktop-site-mode tests pass.

## Proposed target composition

### Desktop / wide tablet

1. **Workspace header:** passage reference, translation and concise passage-level actions.
2. **Scripture pane:** readable passage with verse-level selection and markup.
3. **Study pane:** persistent four-stage navigation, stage purpose, central notes editor and compact progress.
4. **Contextual evidence/research area:** earlier-stage evidence, claim links, related passages, outline and cross-references.
5. **AI guide:** contextual side panel or expandable inspector, not a second primary workspace.

The Scripture and study panes should be visible together at normal desktop widths. The user should not need to open a drawer simply to continue the active study.

### Phone / narrow tablet

- One primary task at a time: Scripture or active study.
- A clear, persistent switch between Scripture and Study; retain the active passage and stage when switching.
- Evidence, related passages and AI open as focused sheets or full-screen secondary views.
- No horizontal page overflow; controls remain reachable and the editor remains usable with the on-screen keyboard.
- Avoid nested fixed drawers and multiple backdrops.

## Implementation sequence

1. Add a new integrated workspace composition around existing elements without changing study data or business logic.
2. Move/reparent existing DOM nodes only after confirming all listeners are attached to stable elements and no code assumes their old parent.
3. Introduce a single responsive workspace state model and map existing open/close actions to it.
4. Simplify toolbar duplication and place secondary actions in contextual menus/inspectors.
5. Apply verified Woord van Lewe design tokens after extracting exact live-site values and assets.
6. Remove obsolete CSS overrides only after equivalent layout and interaction tests pass.

## Required regression checks before merge

- Dashboard “Resume study” opens the correct active passage and Observe stage.
- Opening an existing study from the library opens its saved active stage without adding content.
- Switch through all four stages; each stage loads and saves its own text.
- Editing reviewed notes invalidates only the relevant stage review.
- Earlier-stage evidence is accurate and is inserted only after explicit user action.
- Statement-to-evidence links can be created, reopened and remain associated with the correct claim.
- Related passages remain saved and manageable.
- Verse selection, markup, copy, Strong's, cross-references, outline and verse mapping still work.
- AI prompt chips use the active passage context; AI response insertion remains explicit.
- Export Markdown, study report and Kerygma sermon-source export still work.
- Cloud sync, version history, backup and restore preserve all study fields.
- Desktop, phone, tablet, landscape orientation and browser desktop-site mode pass.
- Keyboard focus, Escape behaviour, ARIA expanded/hidden states and screen-reader labels remain correct.

## Explicit non-goals

- No database schema or migration changes for layout work.
- No rewrite of the single-page application or introduction of a new frontend framework.
- No removal of existing study, Bible, original-language, AI, export or Kerygma features.
- No production changes outside the established feature-branch / PR / CI workflow.
