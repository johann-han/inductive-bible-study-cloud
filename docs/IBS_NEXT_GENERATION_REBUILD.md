# IBS Next-Generation Application Rebuild

**Status:** Approved direction; architecture discovery and foundation phase  
**Branch:** `feat/ibs-next-generation-rebuild`  
**Base:** `main` at `8b39bbebc2812664765a8a4da10b33bbea9ca6ee`  
**Production:** Existing Render service and `study.woordvanlewe.co.za` remain unchanged until acceptance.

## 1. Product decision

The current interface has not met the required usability standard. The next effort is a genuine front-end rebuild, not another round of CSS overrides. The existing application remains available as the production baseline and as a functional reference until the replacement reaches parity.

The rebuild may replace the front-end architecture where that produces a materially better, maintainable product. It must not discard or casually replace the existing backend, Supabase records, Bible/research data, authentication, or Kerygma sermon records.

## 2. Verified repository baseline

The default branch is `main`, currently at `8b39bbebc2812664765a8a4da10b33bbea9ca6ee`.

Repository inventory from the current main branch:

- `index.html` — approximately 617 KB, mature single-page HTML/JavaScript application.
- `sermon/index.html` — approximately 333 KB, existing Kerygma application.
- `server.js` — approximately 52 KB, Node HTTP server, static hosting and application API routes.
- `package.json` — currently minimal; Node server and Node test runner, no React/Vite/TypeScript build tool yet.
- `supabase_schema.sql` and `supabase/migrations/` — existing database/security schema and migrations.
- `js/`, `lib/`, `mentor-response.js` — Bible interlinear, parsers, email and AI support.
- `tests/` and `.github/workflows/` — existing unit, integration and regression coverage for Bible search, notes, study workflow, evidence provenance, invitation-only access, Kerygma sync and AI source handling.
- `render.yaml` — existing Node service configuration.

The current Supabase schema includes at least `study_records`, `kerygma_sermons` and `ibs_access_requests`. The existing study schema and four-stage experience must be audited in full before defining adapters or migrations. No database migration is authorised by this plan.

## 3. Non-negotiable safeguards

1. Never edit `main` directly.
2. Keep the current production service, domain, and application running throughout the rebuild.
3. Do not merge or deploy the replacement until the user has accepted it and all required checks pass.
4. Do not delete, rename destructively, or rewrite existing tables or user records.
5. No production-data writes from preview testing until preview environment variables and Supabase target are positively verified.
6. Preserve invited-user authentication and existing access restrictions.
7. Preserve all current capabilities: Bible reader and translations, last-read passage, studies and four stages, notes/autosave, markups, bookmarks, Strong's, Greek/Hebrew morphology, lexicons, cross-references, related passages, evidence links/provenance, study library/search, export, backup/restore, AI Mentor and Kerygma integration.
8. Preserve the existing test suites. Add new tests rather than weakening or deleting regression assertions.
9. Do not silently alter biblical text, morphology, lexical glosses, evidence provenance or study semantics during a UI rebuild.
10. Every phase must be reviewable, testable and reversible.

## 4. Proposed technical architecture

Subject to the dependency and server-route audit in Phase 0:

- Front end: React + TypeScript + Vite, organised into feature modules and shared accessible components.
- Styling: central semantic design tokens and a documented typography/spacing system; no scattered CSS override patches.
- State: explicit typed domain state for active user, passage, translation, study, stage, notes and research context. Avoid duplicate sources of truth.
- Data access: typed repository/adapters around the existing Supabase schema and current API endpoints.
- Backend: retain the existing Node server and API routes initially. Serve the new compiled front end from the same origin to preserve authentication/session and existing integrations.
- Testing: retain Node regression suites; add component, accessibility and browser-level end-to-end tests for core study journeys.
- Deployment: keep the same Render service and domain. The replacement must first be exposed on a non-production preview path/preview instance; only a separately approved final cutover may replace the root experience.

Do not add a new framework, state library, component library or database layer without showing why it is needed and keeping the dependency footprint maintainable.

## 5. Product information architecture

Primary work areas:

1. **Home** — resume the exact active study and stage; create a study; recent studies and library.
2. **Study Workspace** — one connected four-stage inductive workflow, Scripture, evidence, notes and contextual research.
3. **Bible** — translation, passage navigation, reading position and verse-level interactions.
4. **Research Library** — saved research and access to lexical, morphology and cross-reference tools.
5. **Kerygma** — sermon preparation linked to its source IBS study.
6. **Account and administration** — sign-in, invitation-only access and existing administrative functions.

Map every current route, action and feature to this architecture before removing or relocating any control.

## 6. Core study workspace experience

The workspace is designed around the user's task, not around the number of features available.

### Desktop

- Persistent, calm application navigation.
- A clear study header showing passage, translation, current stage and save/sync state.
- Adjustable Scripture and work panels; both must have useful minimum widths.
- Scripture typography and notes typography must be independently adjustable.
- The active stage's notes and task are the dominant work surface.
- Evidence carried forward is compact, source-linked and expandable.
- Research and AI tools open contextually without losing passage, selected verse, stage or unsaved work.
- No permanently visible pile of small cards, labels and toolbars.

### Tablet

- A deliberate two-pane or task-focused layout depending on available width.
- Clear transition between Scripture and notes; no squeezed desktop columns.

### Mobile

- One primary task at a time with obvious Scripture/Study switching.
- Full-height, accessible research and AI sheets with sensible handles and close actions.
- No horizontal page overflow or tiny controls.
- Passage, stage and draft note state survive panel transitions and rotation.

## 7. Typography and accessibility baseline

Initial design targets (to be validated in real layouts):

- Scripture: 18–21 px desktop; 17–19 px mobile, adjustable.
- Main notes editor: 17–18 px desktop; 16–18 px mobile, adjustable.
- Section headings: 20–24 px, restrained hierarchy.
- Body guidance: 15–16 px.
- Supporting metadata: generally 13–14 px, never used for essential instructions.
- Line-height: approximately 1.55–1.75 for reading and notes.
- Comfortable measure: approximately 60–80 characters for long-form prose.
- WCAG 2.2 AA contrast targets, visible keyboard focus, semantic controls, reduced-motion support and browser zoom without clipping.

These are minimum starting points, not substitutes for user testing.

## 8. Brand requirements

Use the actual Woord van Lewe identity, not a guessed generic SaaS palette. Inspect the live website's stylesheets, font files, logo assets and computed styles. Record exact values and sources before locking tokens.

The visible reference suggests forest green, warm ivory, sage and restrained gold, with editorial serif display headings and clean sans-serif interface text. Exact hex values and font names remain unverified until extracted.

## 9. Delivery phases and gates

### Phase 0 — Discovery and contract (current)

- Inventory all app routes, UI capabilities, API endpoints, storage keys, Supabase tables and test coverage.
- Map existing data models and browser storage to a compatibility contract.
- Identify all existing features that require parity.
- Inspect Render hosting and route behaviour.
- Extract actual Woord van Lewe brand tokens.
- Produce a traceable feature/data/API inventory and risk register.

**Exit gate:** No implementation assumptions remain about data ownership, auth, core persistence or critical feature routes.

### Phase 1 — Design system and application shell

- Set up React/TypeScript/Vite in an isolated app directory.
- Add semantic tokens, typography, accessible primitives and responsive shell.
- Build the Home/dashboard and shell with realistic fixtures.
- Do not connect write-capable production data.
- Publish a preview route while the existing root application remains intact.

**Exit gate:** desktop/tablet/mobile shell approved; type scale and readability accepted.

### Phase 2 — Data and authentication adapters

- Implement read-only adapters first against verified contracts.
- Verify invited-user auth/session handling.
- Add guarded write adapters only after preview Supabase target is verified.
- Test compatibility with existing records and local browser state.

**Exit gate:** no data loss; read and write round-trip tests pass in isolated environment.

### Phase 3 — Bible and study workflow

- Bible passage navigation, translation, last-read restoration and verse selection.
- Four stages: Observe, Interpret, Doctrine, Discipleship/Application.
- Notes, autosave, review state, evidence handoff and claim-to-source provenance.
- Study Library, search, export and backup/restore.

**Exit gate:** existing study regression suite passes and manual journeys are accepted.

### Phase 4 — Research and AI

- Strong's, lexicons, Greek/Hebrew morphology, interlinear, cross-references and related passages.
- AI Mentor in context with explicit insert/accept actions; AI text remains distinct from student-authored notes.
- Preserve original-language source and gloss/definition distinctions.

**Exit gate:** research and AI tests pass without losing passage/stage context.

### Phase 5 — Kerygma

- Integrate existing sermon studio and cloud sync.
- Preserve source study links, import/export contracts and sermon records.
- Align shared shell and visual language without breaking sermon-specific workflows.

**Exit gate:** Kerygma sync, source-link and AI regression suites pass.

### Phase 6 — Accessibility, performance and acceptance

- Test desktop, tablet, mobile portrait/landscape, zoom, keyboard and reduced motion.
- Add end-to-end journeys for resume study, create study, stage transitions, evidence handoff, research, AI insertion, Kerygma handoff and recovery.
- Verify backup/restore and cloud sync in isolated environment.
- Provide before/after screenshots and known limitations.

**Exit gate:** user acceptance and all CI green.

### Phase 7 — Controlled cutover

- User approval required.
- Merge through PR only after CI and preview acceptance.
- Verify Render deployed exact approved commit.
- Keep rollback path and legacy source until production smoke tests pass.
- Confirm no production data migration was needed.

## 10. Acceptance standard

The replacement is not “done” because it compiles or looks modern. It must:

- Make the next study action obvious.
- Make Scripture and notes comfortable for extended use.
- Preserve the user's active passage, stage, notes and context across navigation.
- Make the four stages feel connected and evidence-driven.
- Keep research powerful without cluttering the main workspace.
- Distinguish student writing, Scripture, external sources and AI output.
- Work deliberately on desktop, tablet and phone.
- Preserve all existing user data and critical capabilities.
- Pass existing and new regression tests.
- Be accepted by the user in a live preview before production cutover.
