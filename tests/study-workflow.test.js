const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function functionSource(name) {
  const start = app.indexOf('    function ' + name + '(');
  assert.notEqual(start, -1, 'Expected function ' + name + ' to exist');
  const next = app.indexOf('\n    function ', start + 10);
  return app.slice(start, next < 0 ? app.length : next);
}

test('the four existing study-stage keys remain unchanged', () => {
  assert.ok(app.includes("const NOTE_SECTION_LABELS = { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', apply: 'Discipleship' }"));
  assert.ok(app.includes("const WORKSPACE_STAGE_ORDER = Object.freeze(['observe', 'interpret', 'doctrine', 'apply'])"));
  assert.ok(app.includes("const STUDY_LIBRARY_STORAGE_KEY = 'inductive-study-library-v1'"));
});

test('workspace provides stage progress, previous/continue navigation and evidence review', () => {
  for (const id of [
    'workspaceWorkflowProgress',
    'workspaceStageProgressTrack',
    'workspacePreviousStageBtn',
    'workspaceNextStageBtn',
    'workspaceEvidenceHandoff',
    'workspaceEvidenceHandoffContent',
    'workspaceInsertEvidenceBtn'
  ]) {
    assert.ok(app.includes('id="' + id + '"'), 'Missing workflow control: ' + id);
  }
  assert.match(app, /Step ' \+ \(index \+ 1\) \+ ' of 4/);
  assert.match(app, /Continue to ' \+ NOTE_SECTION_LABELS\[target\]/);
});

test('changing a stage saves notes and stores the selected stage in the existing record', () => {
  const source = functionSource('switchWorkspaceSection');
  assert.ok(source.includes('saveActiveStudyNote()'));
  assert.ok(source.includes('appState.activeNotesSection = section'));
  assert.ok(source.includes('saveLastActiveStudy()'));
  assert.ok(source.includes('persistWorkspaceActiveSection()'));
  assert.ok(source.includes('loadActiveStudyNote()'));

  const persist = functionSource('persistWorkspaceActiveSection');
  assert.ok(persist.includes('const record = library[key]'));
  assert.ok(persist.includes('if (!record'));
  assert.ok(persist.includes('record.activeSection = appState.activeNotesSection'));
  assert.ok(persist.includes('scheduleCloudStudySync()'));
});

test('the handoff gathers earlier-stage notes and saved passage evidence', () => {
  const source = functionSource('getWorkspaceEvidenceHandoffSources');
  for (const required of [
    'WORKSPACE_STAGE_ORDER.slice(0',
    'stripWorkspaceEvidenceHandoffBlocks',
    'normalizePassageOutline(record.passageOutline)',
    'record.scriptureMarkups',
    'normalizeVerseMaps(record.verseMaps)',
    'getStudyRelatedPassageState(record)',
    'if (itemStageIndex > Math.max(0, stageIndex)) return;',
    'if (item.includedInStageNotes) return;',
    'record.crossReferences',
    'VERSE_MAP_CONTENT_FIELDS'
  ]) {
    assert.ok(source.includes(required), 'Evidence collector is missing: ' + required);
  }
});

test('evidence previews are inserted as text rather than interpreted as HTML', () => {
  const source = functionSource('renderWorkspaceEvidenceHandoff');
  assert.ok(source.includes('body.textContent = source.content'));
  assert.ok(source.includes('content.replaceChildren()'));
  assert.ok(!source.includes('innerHTML'));
});

test('evidence insertion is optional, labelled, versioned and limited to its own generated block', () => {
  assert.ok(app.includes("insertEvidenceButton?.addEventListener('click', insertWorkspaceEvidenceHandoff)"));
  const source = functionSource('insertWorkspaceEvidenceHandoff');
  assert.ok(source.includes('saveActiveStudyNote()'));
  assert.ok(source.includes('[[IBS_EVIDENCE_HANDOFF_START:'));
  assert.ok(source.includes('[[IBS_EVIDENCE_HANDOFF_END:'));
  assert.ok(source.includes('saveStudyNoteVersionSnapshot(record)'));
  assert.ok(source.includes('currentNotes.slice(0, startIndex)'));
  assert.ok(source.includes('currentNotes.slice(endIndex + endMarker.length)'));
  assert.ok(source.includes('if (startCount !== endCount || startCount > 1)'));
  assert.ok(source.includes('No changes were made'));
  assert.ok(source.includes('scheduleCloudStudySync()'));
});

test('the Home resume action continues to open the Observation stage', () => {
  assert.ok(app.includes("openDashboardStudy(resumeEntry.book, resumeEntry.chapter, 'observe', { openStudyPanel: true })"));
  assert.ok(app.includes("continueButton.textContent = resumeEntry ? 'Resume Observe Study'"));
});


test('related passages stay compact when empty and remain available through Add / manage', () => {
  const sectionStart = app.indexOf('<section id="studyRelatedPassagesSection"');
  const sectionEnd = app.indexOf('</section>', sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
  const markup = app.slice(sectionStart, sectionEnd + '</section>'.length);
  assert.ok(app.includes('id="workspaceNoteMetaRow" class="flex flex-col gap-1"'));
  assert.ok(markup.includes('min-h-5 h-5'));
  assert.ok(markup.includes('id="openStudyRelatedPassagesBtn"'));
  assert.ok(markup.includes('aria-label="Add or manage related passages for this study"'));
  assert.ok(markup.includes('px-2 py-0.5 text-[10px]'));
  assert.ok(app.includes('id="workspaceWordCount"') && app.indexOf('id="workspaceWordCount"') < app.indexOf('id="studyRelatedPassagesSection"'));
  assert.ok(app.includes('min-height: 0 !important;'));
  assert.ok(app.includes('border-width: 0 !important;'));
  assert.ok(markup.includes('id="studyRelatedPassageStatus" class="sr-only'));
  assert.ok(app.includes('id="studyRelatedPassageList" class="hidden space-y-2'));

  const render = functionSource('renderStudyRelatedPassageList');
  assert.ok(render.includes("list.classList.add('hidden', 'is-mobile-collapsed')"));
  assert.ok(render.includes("toggleButton.classList.add('hidden')"));
  assert.ok(render.includes("list.classList.remove('hidden')"));
  assert.ok(render.includes("toggleButton.classList.remove('hidden')"));
  assert.ok(!render.includes('No related verse text has been added to this study yet.'));
});
