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
