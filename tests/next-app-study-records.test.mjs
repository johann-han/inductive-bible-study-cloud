import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_ACTIVE_SECTION_KEYS,
  DOCTRINE_ACTIVE_STAGE_MARKER,
  cloudRowToStudyRecord,
  normalizeLocalStudyRecord,
  studyRecordKey,
  studyRecordToCloudRow,
  STUDY_STAGE_KEYS
} from '../next-app/src/lib/study-records.mjs';

const USER_ID = 'c2c3f02d-0b3c-4e50-94b1-8e50ebc1e099';

test('study adapter exposes four stable stage keys while respecting the current cloud constraint', () => {
  assert.deepEqual(STUDY_STAGE_KEYS, ['observe', 'interpret', 'doctrine', 'apply']);
  assert.deepEqual(CLOUD_ACTIVE_SECTION_KEYS, ['observe', 'interpret', 'apply']);
});

test('legacy cloud row maps all four stage bodies and known metadata into the local record shape', () => {
  const row = {
    user_id: USER_ID,
    book: 'Genesis',
    chapter: 1,
    sections: {
      observe: 'Observation text',
      interpret: 'Interpretation text',
      doctrine: 'Doctrine text',
      apply: 'Discipleship text',
      _scriptureMarkups: [{ id: 'm1', type: 'repeated' }],
      _crossReferences: [{ id: 'x1', target: { book: 'John', chapter: 1 } }],
      _relatedPassages: [{ book: 'John', chapter: 1 }],
      _verseMaps: { '1': { symbols: ['key-word'] } },
      _passageOutline: { title: 'Creation' },
      _versionHistory: [{ version: 2 }],
      _evidenceLinks: [{ id: 'e1', sourceId: 'src-1' }],
      _studyClaims: [{ id: 'c1', text: 'Claim' }],
      _stageReviews: { observe: { reviewed: true } }
    },
    active_section: 'interpret',
    updated_at: '2026-11-10T12:00:00.000Z',
    deleted_at: null
  };
  const record = cloudRowToStudyRecord(row);
  assert.deepEqual(record.sections, {
    observe: 'Observation text',
    interpret: 'Interpretation text',
    doctrine: 'Doctrine text',
    apply: 'Discipleship text'
  });
  assert.deepEqual(record.scriptureMarkups, row.sections._scriptureMarkups);
  assert.deepEqual(record.crossReferences, row.sections._crossReferences);
  assert.deepEqual(record.relatedPassages, row.sections._relatedPassages);
  assert.deepEqual(record.verseMaps, row.sections._verseMaps);
  assert.deepEqual(record.passageOutline, row.sections._passageOutline);
  assert.deepEqual(record.versionHistory, row.sections._versionHistory);
  assert.deepEqual(record.evidenceLinks, row.sections._evidenceLinks);
  assert.deepEqual(record.studyClaims, row.sections._studyClaims);
  assert.deepEqual(record.stageReviews, row.sections._stageReviews);
  assert.equal(record.activeSection, 'interpret');
});

test('Doctrine active stage uses a constrained fallback plus a round-trip marker', () => {
  const local = {
    book: 'Genesis',
    chapter: 1,
    sections: {
      observe: 'Observe',
      interpret: 'Interpret',
      doctrine: 'God is Creator',
      apply: 'Respond'
    },
    activeSection: 'doctrine',
    updatedAt: '2026-11-13T08:00:00.000Z'
  };
  const cloud = studyRecordToCloudRow(local, USER_ID);
  assert.equal(cloud.active_section, 'interpret');
  assert.equal(cloud.sections[DOCTRINE_ACTIVE_STAGE_MARKER], 'doctrine');
  assert.ok(CLOUD_ACTIVE_SECTION_KEYS.includes(cloud.active_section));
  const restored = cloudRowToStudyRecord(cloud);
  assert.equal(restored.activeSection, 'doctrine');
  assert.equal(restored.sections.doctrine, 'God is Creator');
});

test('supported active stages use their existing database values and need no marker', () => {
  for (const stage of ['observe', 'interpret', 'apply']) {
    const cloud = studyRecordToCloudRow({
      book: 'John', chapter: 1, sections: { observe: '', interpret: '', doctrine: '', apply: '' },
      activeSection: stage
    }, USER_ID);
    assert.equal(cloud.active_section, stage);
    assert.equal(cloud.sections[DOCTRINE_ACTIVE_STAGE_MARKER], undefined);
    assert.equal(cloudRowToStudyRecord(cloud).activeSection, stage);
  }
});

test('unknown JSONB fields survive cloud-to-local-to-cloud conversion', () => {
  const original = {
    book: 'Romans', chapter: 8,
    sections: {
      observe: 'O', interpret: 'I', doctrine: 'D', apply: 'A',
      _futureResearchPayload: { provider: 'future', values: [1, 2, 3] },
      _customFlag: true
    },
    active_section: 'apply',
    updated_at: '2026-11-01T00:00:00.000Z',
    deleted_at: null,
    future_top_level: { preserved: true }
  };
  const record = cloudRowToStudyRecord(original);
  const roundTrip = studyRecordToCloudRow(record, USER_ID);
  assert.deepEqual(roundTrip.sections._futureResearchPayload, original.sections._futureResearchPayload);
  assert.equal(roundTrip.sections._customFlag, true);
  assert.deepEqual(roundTrip.future_top_level, original.future_top_level);
});

test('unknown local record fields and cloud section extras are preserved', () => {
  const local = normalizeLocalStudyRecord({
    book: 'Matthew',
    chapter: 5,
    sections: { observe: 'Notice', interpret: 'Explain', doctrine: 'Teach', apply: 'Live' },
    activeSection: 'interpret',
    updatedAt: '2026-11-03T10:00:00Z',
    customLocalFeature: { retained: ['a', 'b'] },
    cloudSectionExtras: { _customResearch: { revision: 3 } }
  });
  const cloud = studyRecordToCloudRow(local, USER_ID);
  assert.deepEqual(local.customLocalFeature, { retained: ['a', 'b'] });
  assert.deepEqual(cloud.sections._customResearch, { revision: 3 });
});

test('legacy cloud rows without Doctrine marker retain their valid active_section', () => {
  const record = cloudRowToStudyRecord({
    book: 'Mark', chapter: 1, sections: { observe: '', interpret: '', doctrine: '', apply: '' },
    active_section: 'apply', updated_at: '2026-11-01T00:00:00Z', deleted_at: null
  });
  assert.equal(record.activeSection, 'apply');
});

test('invalid cloud rows and missing owner IDs fail closed', () => {
  assert.throws(() => cloudRowToStudyRecord({ book: 'Genesis', chapter: 0 }), /positive integer chapter/);
  assert.throws(() => studyRecordToCloudRow({ book: 'Genesis', chapter: 1, sections: {} }, ''), /user ID is required/);
  assert.throws(() => normalizeLocalStudyRecord({ book: 'Genesis', chapter: -1 }), /positive integer chapter/);
});

test('study record keys retain the existing book::chapter contract', () => {
  assert.equal(studyRecordKey('Genesis', 1), 'Genesis::1');
  assert.throws(() => studyRecordKey('Genesis', 0), /valid book and chapter/);
});

test('timestamps are normalized and invalid timestamp values do not break record loading', () => {
  const record = cloudRowToStudyRecord({
    book: 'Psalms', chapter: 23,
    sections: {},
    active_section: 'not-a-section',
    updated_at: 'invalid',
    deleted_at: '2026-11-02T00:00:00.000Z'
  });
  assert.equal(record.activeSection, 'observe');
  assert.equal(record.updatedAt, '2026-11-02T00:00:00.000Z');
  assert.equal(record.deletedAt, '2026-11-02T00:00:00.000Z');
});
