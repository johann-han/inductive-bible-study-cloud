import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../next-app/src/App.tsx', import.meta.url), 'utf8');

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, 'expected source marker: ' + startMarker);
  assert.ok(end > start, 'expected end marker: ' + endMarker);
  return source.slice(start, end);
}

test('saved Word Studies has a mounted searchable library route and an evidence handoff action', () => {
  assert.match(app, /view === 'word-studies' \? <section className="word-studies-view">/);
  assert.match(app, /visibleWordStudies\.map\(record => <article className="word-study-card"/);
  assert.match(app, /Search Strong’s ID, lemma, passage, parsing or notes/);
  assert.match(app, /onClick=\{\(\) => attachSavedWordStudyEvidence\(record\)\}>Attach to evidence/);
  assert.match(app, /onClick=\{\(\) => openSavedWordStudyPassage\(record\)\}>Open verse/);
});

test('Word Studies navigation renders its page in the main view switch, not inside the breadcrumb', () => {
  const breadcrumbStart = app.indexOf('<div className="crumbs">');
  const breadcrumbEnd = app.indexOf('</div>', breadcrumbStart);
  assert.ok(breadcrumbStart >= 0 && breadcrumbEnd > breadcrumbStart, 'expected a complete workspace breadcrumb');
  const breadcrumb = app.slice(breadcrumbStart, breadcrumbEnd);
  assert.match(breadcrumb, /view === 'word-studies' \? 'Word studies'/);
  assert.doesNotMatch(breadcrumb, /<section className="word-studies-view">/);

  const renderStart = app.indexOf("{view === 'archive' ? <section className=\"archive-workspace\">");
  const activeStudyStart = app.indexOf("view === 'study' ? <section className=\"active-study-view\">", renderStart);
  assert.ok(renderStart >= 0 && activeStudyStart > renderStart, 'expected the main page render switch');
  const renderBranches = app.slice(renderStart, activeStudyStart);
  assert.match(renderBranches, /: view === 'word-studies' \? <section className="word-studies-view">/);
});

test('saved Word Study handoff preloads attributed source evidence without inventing a claim or verification', () => {
  const handoff = sliceBetween(
    app,
    'const attachSavedWordStudyEvidence = (record: WordStudyRecord) => {',
    'const openSavedWordStudyPassage = (record: WordStudyRecord) => {'
  );
  assert.match(handoff, /buildWordStudyEvidenceDraft\(record\)/);
  assert.match(handoff, /setEvidenceReference\(draft\.reference\)/);
  assert.match(handoff, /setEvidenceDetail\(draft\.detail\)/);
  assert.match(handoff, /setEvidenceSource\(draft\.source\)/);
  assert.match(handoff, /setEvidenceSourceUrl\(draft\.sourceUrl \|\| ''\)/);
  assert.match(handoff, /setEvidenceSourceId\(draft\.sourceId \|\| ''\)/);
  assert.match(handoff, /setEvidenceClaim\(''\)/);
  assert.match(handoff, /setEvidenceVerification\('not_checked'\)/);
  assert.match(handoff, /setEvidenceSourceQuality\('unassessed'\)/);
  assert.match(handoff, /setView\('study'\)/);
});

test('Evidence Manager requires a researcher-authored claim before saving handed-off source material', () => {
  assert.match(app, /if \(!evidenceClaim\.trim\(\) \|\| !evidenceReference\.trim\(\) \|\| !evidenceDetail\.trim\(\)\)/);
  assert.match(app, /onClick=\{addEvidenceRecord\}/);
  assert.match(app, /Formulate the claim you are assessing/);
});


test('Word Study saving is gated on a complete occurrence-level morphology and matching verse text', () => {
  assert.match(app, /selectedMorphology\.originalText\.trim\(\)/);
  assert.match(app, /selectedMorphology\.language\.trim\(\)/);
  assert.match(app, /selectedMorphology\.parsingFull\.trim\(\) \|\| selectedMorphology\.parsing\.trim\(\)/);
  assert.match(app, /selectedMorphology\.end <= selectedOccurrenceVerseText\.length/);
  assert.match(app, /disabled=\{!canSaveCurrentWordStudy \|\| currentWordStudySaved\}/);
  assert.match(app, /open this passage in BSB interlinear and select the word there/i);
});

test('Word Study save validates, writes and reads back the record before opening the library', () => {
  const save = sliceBetween(app, 'const saveCurrentWordStudy = () => {', 'const updateWordStudyNotes = (id: string, notes: string, markUpdated = false) => {');
  assert.match(save, /if \(!isWordStudyRecord\(record\)\)/);
  assert.match(save, /if \(!writeWordStudies\(nextWordStudies\)\)/);
  assert.match(save, /const persistedWordStudies = readWordStudies\(\)/);
  assert.match(save, /persistedWordStudies\.some\(item => item\.id === record\.id\)/);
  const writeIndex = save.indexOf('writeWordStudies(nextWordStudies)');
  const successNavigationIndex = save.indexOf("setView('word-studies')", writeIndex);
  assert.ok(writeIndex >= 0 && successNavigationIndex > writeIndex);
});
