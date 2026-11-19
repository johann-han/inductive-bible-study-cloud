import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDY_NOTE_VERSION_LIMIT,
  appendStudyNoteVersionSnapshot,
  countStudyNoteVersionWords,
  normalizeStudyNoteVersionHistory,
  restoreStudyNoteVersion
} from './study-note-history.mjs';

const draft = (overrides = {}) => ({
  observe: 'Observation one',
  interpret: 'Interpretation one',
  doctrine: '',
  apply: '',
  activeStage: 'interpret',
  customMetadata: { keep: true },
  ...overrides
});

const snapshot = (id, savedAt, sections, activeStage = 'observe') => ({
  id, savedAt, activeStage, sections
});

test('normalizes and validates note history, sorts newest first and caps it at eight', () => {
  const history = Array.from({ length: 10 }, (_, index) => snapshot(
    'v' + index,
    new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
    { observe: 'Text ' + index, interpret: '', doctrine: '', apply: '' }
  ));
  history.push(history[0]);
  history.push(snapshot('bad-date', 'not-a-date', { observe: '', interpret: '', doctrine: '', apply: '' }));
  history.push(snapshot('bad-stage', '2026-01-01T00:00:00Z', { observe: '', interpret: '', doctrine: '', apply: '' }, 'unknown'));

  const normalized = normalizeStudyNoteVersionHistory(history);
  assert.equal(normalized.length, STUDY_NOTE_VERSION_LIMIT);
  assert.equal(normalized[0].id, 'v9');
  assert.equal(normalized.at(-1).id, 'v2');
});

test('captures a dated snapshot of the pre-edit four-stage note content', () => {
  const updated = appendStudyNoteVersionSnapshot(draft(), {
    now: Date.parse('2026-11-17T12:00:00.000Z'),
    id: 'first'
  });
  assert.equal(updated.versionHistory.length, 1);
  assert.equal(updated.versionHistory[0].activeStage, 'interpret');
  assert.deepEqual(updated.versionHistory[0].sections, {
    observe: 'Observation one',
    interpret: 'Interpretation one',
    doctrine: '',
    apply: ''
  });
  assert.deepEqual(updated.customMetadata, { keep: true });
});

test('skips identical snapshots and throttles automatic versions to two minutes', () => {
  const first = appendStudyNoteVersionSnapshot(draft(), {
    now: Date.parse('2026-11-17T12:00:00.000Z'),
    id: 'first'
  });
  const identical = appendStudyNoteVersionSnapshot(first, {
    now: Date.parse('2026-11-17T12:01:00.000Z'),
    id: 'identical'
  });
  assert.equal(identical.versionHistory.length, 1);

  const changed = appendStudyNoteVersionSnapshot({
    ...first,
    observe: 'Observation changed'
  }, {
    now: Date.parse('2026-11-17T12:01:59.000Z'),
    id: 'too-soon'
  });
  assert.equal(changed.versionHistory.length, 1);

  const afterInterval = appendStudyNoteVersionSnapshot({
    ...first,
    observe: 'Observation changed'
  }, {
    now: Date.parse('2026-11-17T12:02:00.000Z'),
    id: 'after-interval'
  });
  assert.equal(afterInterval.versionHistory.length, 2);
});

test('forced snapshots bypass the interval but never store duplicate content', () => {
  const first = appendStudyNoteVersionSnapshot(draft(), {
    now: Date.parse('2026-11-17T12:00:00.000Z'),
    id: 'first'
  });
  const forced = appendStudyNoteVersionSnapshot({
    ...first,
    apply: 'A new response'
  }, {
    now: Date.parse('2026-11-17T12:00:01.000Z'),
    force: true,
    id: 'forced'
  });
  assert.equal(forced.versionHistory.length, 2);
  assert.equal(forced.versionHistory[0].id, 'forced');
});

test('history word counts are computed independently for all four stages', () => {
  assert.deepEqual(countStudyNoteVersionWords({
    sections: { observe: 'one two three', interpret: 'two words', doctrine: '', apply: 'a faithful response' }
  }), {
    observe: { label: 'Observe', words: 3 },
    interpret: { label: 'Interpretation', words: 2 },
    doctrine: { label: 'Doctrine', words: 0 },
    apply: { label: 'Discipleship', words: 3 }
  });
});

test('restore captures current notes first and restores only the four stage bodies and active stage', () => {
  const original = appendStudyNoteVersionSnapshot(draft(), {
    now: Date.parse('2026-11-17T12:00:00.000Z'),
    id: 'original'
  });
  const current = {
    ...original,
    observe: 'Current observation',
    interpret: 'Current interpretation',
    doctrine: 'Current doctrine',
    apply: 'Current application',
    activeStage: 'apply',
    unrelatedExtension: 'preserve me'
  };
  const restored = restoreStudyNoteVersion(current, 'original', {
    now: Date.parse('2026-11-17T12:01:00.000Z'),
    id: 'protect-current'
  });
  assert.equal(restored.restored, true);
  assert.deepEqual({
    observe: restored.draft.observe,
    interpret: restored.draft.interpret,
    doctrine: restored.draft.doctrine,
    apply: restored.draft.apply,
    activeStage: restored.draft.activeStage
  }, {
    observe: 'Observation one',
    interpret: 'Interpretation one',
    doctrine: '',
    apply: '',
    activeStage: 'interpret'
  });
  assert.equal(restored.draft.versionHistory.length, 2);
  assert.equal(restored.draft.versionHistory[0].id, 'protect-current');
  assert.equal(restored.draft.unrelatedExtension, 'preserve me');
});

test('restore safely refuses a missing snapshot without changing stage notes', () => {
  const input = draft();
  const restored = restoreStudyNoteVersion(input, 'missing');
  assert.equal(restored.restored, false);
  assert.equal(restored.draft.observe, input.observe);
  assert.equal(restored.draft.activeStage, input.activeStage);
});

test('invalid or oversized snapshot records are discarded without rejecting the draft', () => {
  const history = normalizeStudyNoteVersionHistory([
    snapshot('valid', '2026-11-17T12:00:00.000Z', { observe: 'A', interpret: '', doctrine: '', apply: '' }),
    snapshot('oversized', '2026-11-17T12:00:00.000Z', { observe: 'x'.repeat(200001), interpret: '', doctrine: '', apply: '' })
  ]);
  assert.deepEqual(history.map(item => item.id), ['valid']);
});
