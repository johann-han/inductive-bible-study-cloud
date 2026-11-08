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
