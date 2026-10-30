'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isDefaultSampleSermon,
  mergeSermons,
  buildUpsertRows,
  buildTombstoneRows,
  normalizeSourcePacketForDisplay
} = require('../sermon/cloud-sync');

const sample = {
  id: 'sermon-old-seed',
  title: 'Peace in the Storm',
  passage: 'Mark 4:35-41',
  text: 'On that day, when evening had come, he said to them, "Let us go across to the other side." And leaving the crowd, they took him with them in the boat, just as he was...',
  context: 'Mark sets this story right after parables of kingdom growth. Jesus is establishing his authority over cosmic chaos.',
  keywords: 'Galilee storms (seiche waves), "Cared not" (sigh), Peace! Be still! (phimōthi - silence/muzzle).',
  exeSubject: 'Jesus controlling the wind and waves',
  exeComplement: 'reveals his divine identity and power over fear',
  bigIdea: "When storms make you question God's care, trust the divine authority and presence of Jesus.",
  aim: 'To turn panic into worshipful trust during unexpected life trials.',
  outline: [
    { id: 1, reference: 'v. 35-38', statement: 'The Reality of Severe Storms', notes: 'Faith does not exempt believers from life storms.' },
    { id: 2, reference: 'v. 38b-39', statement: 'The Power of Divine Command', notes: 'Jesus commands creation with sovereign ease.' },
    { id: 3, reference: 'v. 40-41', statement: 'The Call to Fear-Replacing Faith', notes: 'The ultimate question: "Who then is this?"' }
  ],
  illustrations: [
    { id: 1, title: 'The Anchor in the Dark', content: 'Metaphor of ships anchoring not to visible waters, but deep seabed.' }
  ],
  appSeekers: 'Jesus offers genuine rest to those drowning in life beyond control.',
  appBelievers: "Examine where fear exposes a lack of trust in God's goodness.",
  appSuffering: 'He may be silent in your boat, but He is never absent.',
  manuscript: '# Peace in the Storm\n\n**Text:** Mark 4:35-41\n\n## Introduction\nWe all encounter storms...'
};

test('recognises only the unchanged built-in sample', () => {
  assert.equal(isDefaultSampleSermon(sample), true);
  assert.equal(isDefaultSampleSermon({ ...sample, bigIdea: 'A revised big idea' }), false);
  assert.equal(isDefaultSampleSermon({ ...sample, inductiveStudySource: { format: 'ibs' } }), false);
});

test('imports local sermons when the cloud vault is empty', () => {
  const merged = mergeSermons([sample], []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, sample.id);
});

test('does not add the fresh built-in placeholder to an existing cloud vault', () => {
  const cloud = [{
    sermon_id: 'sermon-cloud-1',
    sermon_data: { id: 'sermon-cloud-1', title: 'A saved sermon', passage: 'John 1:1' },
    updated_at: '2026-10-30T10:00:00.000Z',
    deleted_at: null
  }];
  const merged = mergeSermons([sample], cloud);
  assert.deepEqual(merged.map(item => item.id), ['sermon-cloud-1']);
});

test('uses the newest copy when local and cloud records have the same id', () => {
  const local = [{ id: 's1', title: 'Local newer', updated_at: '2026-10-30T12:00:00.000Z' }];
  const cloud = [{
    sermon_id: 's1',
    sermon_data: { id: 's1', title: 'Cloud older' },
    updated_at: '2026-10-30T11:00:00.000Z'
  }];
  assert.equal(mergeSermons(local, cloud)[0].title, 'Local newer');
});

test('a cloud deletion tombstone prevents an old local copy returning', () => {
  const local = [{ id: 's1', title: 'Old local copy', updated_at: '2026-10-30T12:00:00.000Z' }];
  const cloud = [{ sermon_id: 's1', sermon_data: { id: 's1' }, deleted_at: '2026-10-30T13:00:00.000Z' }];
  assert.deepEqual(mergeSermons(local, cloud), []);
});

test('builds per-user upsert and deletion rows', () => {
  const upserts = buildUpsertRows([{ id: 's1', title: 'Sermon' }], 'user-1');
  assert.equal(upserts[0].user_id, 'user-1');
  assert.equal(upserts[0].sermon_id, 's1');
  assert.equal(upserts[0].deleted_at, null);

  const tombstones = buildTombstoneRows([{ sermon_id: 's1', sermon_data: { title: 'Sermon' } }], 'user-1', '2026-10-30T13:00:00.000Z');
  assert.equal(tombstones[0].user_id, 'user-1');
  assert.equal(tombstones[0].sermon_id, 's1');
  assert.equal(tombstones[0].deleted_at, '2026-10-30T13:00:00.000Z');
});

test('renders legacy IBS source packets with missing optional collections safely', () => {
  const packet = normalizeSourcePacketForDisplay({
    sermonPassage: 'Romans 2',
    translation: 'KJV',
    sections: { observe: 'Existing observation notes', interpret: 'Existing interpretation notes' },
    passageOutline: { title: 'Romans 2' },
    verseMaps: { '1': { verseText: 'Therefore...' } }
  });

  assert.equal(packet.sections.observe, 'Existing observation notes');
  assert.equal(packet.sections.interpret, 'Existing interpretation notes');
  assert.equal(packet.sections.doctrine, '');
  assert.deepEqual(packet.passageOutline.sections, []);
  assert.deepEqual(packet.scriptureMarkups, []);
  assert.deepEqual(packet.customCrossReferences, []);
  assert.deepEqual(packet.relatedPassages, []);
  assert.deepEqual(packet.standardCrossReferences.entries, []);
  assert.deepEqual(packet.selectedVerses, []);
});

test('filters malformed optional related-passage verse collections', () => {
  const packet = normalizeSourcePacketForDisplay({
    relatedPassages: [
      { reference: 'Ephesians 2:12', verses: 'not-an-array' },
      null,
      { reference: 'Romans 2:14', verses: [{ number: 14, text: 'For...' }, null] }
    ]
  });

  assert.equal(packet.relatedPassages.length, 2);
  assert.deepEqual(packet.relatedPassages[0].verses, []);
  assert.deepEqual(packet.relatedPassages[1].verses, [{ number: 14, text: 'For...' }]);
});


test('loads the Kerygma cloud helper with a versioned, non-cacheable URL', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'sermon', 'index.html'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(html, /src="\\/sermon\\/cloud-sync\\.js\\?v=298b222"/);
  assert.match(server, /'manifest\\.webmanifest', 'cloud-sync\\.js'/);
});
