(function (root) {
  'use strict';

  const DEFAULT_SAMPLE = {
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

  function isDefaultSampleSermon(sermon) {
    if (!sermon || typeof sermon !== 'object' || sermon.inductiveStudySource) return false;
    if (Object.keys(DEFAULT_SAMPLE).some(key => JSON.stringify(sermon[key]) !== JSON.stringify(DEFAULT_SAMPLE[key]))) {
      return false;
    }
    return true;
  }

  function timestamp(value) {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function mergeSermons(localSermons, cloudRows) {
    const rows = Array.isArray(cloudRows) ? cloudRows : [];
    const tombstones = new Set(rows.filter(row => row && row.deleted_at).map(row => String(row.sermon_id || '')));
    const merged = new Map();

    rows.forEach(row => {
      if (!row || row.deleted_at) return;
      const id = String(row.sermon_id || (row.sermon_data && row.sermon_data.id) || '').trim();
      if (!id || !row.sermon_data || typeof row.sermon_data !== 'object' || Array.isArray(row.sermon_data)) return;
      merged.set(id, {
        ...row.sermon_data,
        id,
        updated_at: row.updated_at || row.sermon_data.updated_at || null
      });
    });

    (Array.isArray(localSermons) ? localSermons : []).forEach((record, index) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return;
      const id = String(record.id || '').trim();
      if (!id || tombstones.has(id)) return;
      // A fresh browser creates this built-in sample automatically. Do not append that
      // placeholder to a cloud vault that already contains real records.
      if (rows.length > 0 && isDefaultSampleSermon(record)) return;

      const local = { ...record, id };
      const existing = merged.get(id);
      if (!existing || timestamp(local.updated_at) > timestamp(existing.updated_at)) {
        if (!local.updated_at) local.updated_at = new Date().toISOString();
        merged.set(id, local);
      }
    });

    return Array.from(merged.values()).sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at));
  }

  function buildUpsertRows(sermons, userId) {
    const now = new Date().toISOString();
    return (Array.isArray(sermons) ? sermons : [])
      .filter(sermon => sermon && typeof sermon === 'object' && String(sermon.id || '').trim())
      .map(sermon => ({
        user_id: userId,
        sermon_id: String(sermon.id),
        sermon_data: { ...sermon, id: String(sermon.id) },
        updated_at: sermon.updated_at || now,
        deleted_at: null
      }));
  }

  function buildTombstoneRows(pending, userId, deletedAt) {
    const timestampValue = deletedAt || new Date().toISOString();
    return (Array.isArray(pending) ? pending : [])
      .filter(entry => entry && String(entry.sermon_id || entry.id || '').trim())
      .map(entry => {
        const id = String(entry.sermon_id || entry.id);
        const data = entry.sermon_data && typeof entry.sermon_data === 'object'
          ? entry.sermon_data
          : { id };
        return {
          user_id: userId,
          sermon_id: id,
          sermon_data: { ...data, id },
          updated_at: timestampValue,
          deleted_at: timestampValue
        };
      });
  }

  // Older IBS source packets predate optional collections such as relatedPassages.
  // Return a display-only safe view so opening an existing sermon never mutates its saved data.
  function normalizeSourcePacketForDisplay(packet) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return null;

    const sourceSections = packet.sections && typeof packet.sections === 'object' && !Array.isArray(packet.sections)
      ? packet.sections
      : {};
    const sourceOutline = packet.passageOutline && typeof packet.passageOutline === 'object' && !Array.isArray(packet.passageOutline)
      ? packet.passageOutline
      : {};
    const sourceVerseMaps = packet.verseMaps && typeof packet.verseMaps === 'object' && !Array.isArray(packet.verseMaps)
      ? packet.verseMaps
      : {};
    const sourceStandard = packet.standardCrossReferences && typeof packet.standardCrossReferences === 'object' && !Array.isArray(packet.standardCrossReferences)
      ? packet.standardCrossReferences
      : {};

    const relatedPassages = Array.isArray(packet.relatedPassages)
      ? packet.relatedPassages
          .filter(item => item && typeof item === 'object' && !Array.isArray(item))
          .map(item => ({
            ...item,
            verses: Array.isArray(item.verses)
              ? item.verses.filter(verse => verse && typeof verse === 'object' && !Array.isArray(verse))
              : []
          }))
      : [];

    return {
      ...packet,
      sections: {
        observe: typeof sourceSections.observe === 'string' ? sourceSections.observe : '',
        interpret: typeof sourceSections.interpret === 'string' ? sourceSections.interpret : '',
        doctrine: typeof sourceSections.doctrine === 'string' ? sourceSections.doctrine : '',
        discipleship: typeof sourceSections.discipleship === 'string' ? sourceSections.discipleship : ''
      },
      passageOutline: {
        ...sourceOutline,
        sections: Array.isArray(sourceOutline.sections)
          ? sourceOutline.sections.filter(row => row && typeof row === 'object' && !Array.isArray(row))
          : []
      },
      verseMaps: sourceVerseMaps,
      scriptureMarkups: Array.isArray(packet.scriptureMarkups) ? packet.scriptureMarkups : [],
      customCrossReferences: Array.isArray(packet.customCrossReferences) ? packet.customCrossReferences : [],
      relatedPassages,
      standardCrossReferences: {
        ...sourceStandard,
        entries: Array.isArray(sourceStandard.entries) ? sourceStandard.entries : []
      },
      selectedVerses: Array.isArray(packet.selectedVerses) ? packet.selectedVerses : []
    };
  }

  const api = { isDefaultSampleSermon, mergeSermons, buildUpsertRows, buildTombstoneRows, normalizeSourcePacketForDisplay };
  if (root) root.KerygmaCloudSync = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
