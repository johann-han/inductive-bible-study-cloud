(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KerygmaRebuildData = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  const STORAGE_KEY = 'kerygma_sermons';
  const CLAIM_REVIEW_KEY = 'kerygma_claim_review_status_v1';
  const WORKFLOW_STAGES = [
    { id: 'passage', number: '01', label: 'Text & Exegesis', shortLabel: 'Exegesis', question: 'What does the passage say and mean?', description: 'Establish the biblical text, its setting, and the evidence that governs interpretation.' },
    { id: 'bigIdea', number: '02', label: 'Big Idea & Proposition', shortLabel: 'Big Idea', question: 'What is the central claim of the passage?', description: 'Move from the exegetical subject and complement to one text-grounded homiletical proposition.' },
    { id: 'outline', number: '03', label: 'Homiletical Outline', shortLabel: 'Outline', question: 'How does the text develop its message?', description: 'Build sermon movements that follow the passage without confusing the literary and homiletical outlines.' },
    { id: 'illustrations', number: '04', label: 'Illustrations & Application', shortLabel: 'Application', question: 'How should hearers respond?', description: 'Develop illustrations and specific applications under the theological guardrails of the passage.' },
    { id: 'manuscript', number: '05', label: 'Manuscript / Notes', shortLabel: 'Manuscript', question: 'How will the message be communicated?', description: 'Bring the approved Big Idea, outline and applications together in a coherent exposition.' }
  ];
  const BOOK_CHAPTERS = {
    Genesis:50, Exodus:40, Leviticus:27, Numbers:36, Deuteronomy:34, Joshua:24, Judges:21, Ruth:4,
    '1 Samuel':31, '2 Samuel':24, '1 Kings':22, '2 Kings':25, '1 Chronicles':29, '2 Chronicles':36,
    Ezra:10, Nehemiah:13, Esther:10, Job:42, Psalms:150, Proverbs:31, Ecclesiastes:12,
    'Song of Solomon':8, Isaiah:66, Jeremiah:52, Lamentations:5, Ezekiel:48, Daniel:12, Hosea:14,
    Joel:3, Amos:9, Obadiah:1, Jonah:4, Micah:7, Nahum:3, Habakkuk:3, Zephaniah:3, Haggai:2,
    Zechariah:14, Malachi:4, Matthew:28, Mark:16, Luke:24, John:21, Acts:28, Romans:16,
    '1 Corinthians':16, '2 Corinthians':13, Galatians:6, Ephesians:6, Philippians:4, Colossians:4,
    '1 Thessalonians':5, '2 Thessalonians':3, '1 Timothy':6, '2 Timothy':4, Titus:3, Philemon:1,
    Hebrews:13, James:5, '1 Peter':5, '2 Peter':3, '1 John':5, '2 John':1, '3 John':1, Jude:1, Revelation:22
  };

  function asText(value) { return typeof value === 'string' ? value.trim() : ''; }
  function asArray(value) { return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []; }
  function hasObject(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clip(value, max) { return typeof value === 'string' ? value.slice(0, max) : ''; }
  function makeId(prefix) {
    const random = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return prefix + '-' + random;
  }

  function normalizeSermonForDisplay(record) {
    if (!hasObject(record)) return null;
    const id = asText(record.id);
    if (!id) return null;
    return {
      ...record,
      id,
      title: asText(record.title) || 'Untitled sermon',
      passage: asText(record.passage),
      text: asText(record.text),
      context: asText(record.context),
      keywords: asText(record.keywords),
      exeSubject: asText(record.exeSubject),
      exeComplement: asText(record.exeComplement),
      bigIdea: asText(record.bigIdea),
      aim: asText(record.aim),
      outline: asArray(record.outline),
      illustrations: asArray(record.illustrations),
      appSeekers: asText(record.appSeekers),
      appBelievers: asText(record.appBelievers),
      appSuffering: asText(record.appSuffering),
      manuscript: asText(record.manuscript),
      inductiveStudySource: hasObject(record.inductiveStudySource) ? record.inductiveStudySource : null,
      updated_at: asText(record.updated_at) || asText(record.updatedAt),
      created_at: asText(record.created_at) || asText(record.createdAt)
    };
  }

  function parseStoredSermons(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (_) { return []; }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSermonForDisplay).filter(Boolean);
  }

  function readLocalSermons(storage) {
    try {
      const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!target || typeof target.getItem !== 'function') return [];
      return parseStoredSermons(target.getItem(STORAGE_KEY));
    } catch (_) {
      return [];
    }
  }

  function writeLocalSermons(storage, sermons) {
    try {
      const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!target || typeof target.setItem !== 'function') return false;
      const rows = Array.isArray(sermons) ? sermons.filter(item => hasObject(item) && asText(item.id)) : [];
      target.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (_) {
      return false;
    }
  }

  function createSermonRecord() {
    return {
      id: makeId('sermon'),
      title: 'New Expository Sermon',
      passage: '',
      text: '',
      context: '',
      keywords: '',
      exeSubject: '',
      exeComplement: '',
      bigIdea: '',
      aim: '',
      outline: [{ id: Date.now(), reference: '', statement: '', notes: '' }],
      illustrations: [],
      appSeekers: '',
      appBelievers: '',
      appSuffering: '',
      manuscript: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function sermonSearchText(sermon) {
    const row = normalizeSermonForDisplay(sermon);
    if (!row) return '';
    const outlineText = row.outline.map(item => [item.reference, item.statement, item.notes].map(asText).join(' ')).join(' ');
    const illustrationText = row.illustrations.map(item => [item.title, item.content].map(asText).join(' ')).join(' ');
    return [
      row.title, row.passage, row.text, row.context, row.keywords, row.exeSubject,
      row.exeComplement, row.bigIdea, row.aim, outlineText, illustrationText,
      row.appSeekers, row.appBelievers, row.appSuffering, row.manuscript
    ].join(' ').toLocaleLowerCase();
  }

  function filterSermons(sermons, query) {
    const rows = Array.isArray(sermons) ? sermons : [];
    const term = asText(query).toLocaleLowerCase();
    if (!term) return rows.slice();
    return rows.filter(sermon => sermonSearchText(sermon).includes(term));
  }

  function getStageProgress(sermon) {
    const row = normalizeSermonForDisplay(sermon);
    if (!row) return WORKFLOW_STAGES.map(stage => ({ ...stage, state: 'not-started', ratio: 0 }));
    const checks = {
      passage: [row.text, row.context, row.keywords],
      bigIdea: [row.exeSubject, row.exeComplement, row.bigIdea, row.aim],
      outline: row.outline.map(item => [item.reference, item.statement, item.notes].join(' ')),
      illustrations: [...row.illustrations.map(item => [item.title, item.content].join(' ')), row.appSeekers, row.appBelievers, row.appSuffering],
      manuscript: [row.manuscript]
    };
    return WORKFLOW_STAGES.map(stage => {
      const values = checks[stage.id] || [];
      const populated = values.filter(value => asText(value)).length;
      const denominator = Math.max(1, values.length);
      return {
        ...stage,
        state: populated === 0 ? 'not-started' : populated === values.length ? 'complete' : 'in-progress',
        ratio: Math.min(1, populated / denominator)
      };
    });
  }

  function getSourceSummary(sermon) {
    const row = normalizeSermonForDisplay(sermon);
    if (!row || !row.inductiveStudySource) return { attached: false, stageCount: 0, passage: '', translation: '' };
    const source = row.inductiveStudySource;
    const sections = hasObject(source.sections) ? source.sections : {};
    const stageCount = ['observe', 'interpret', 'doctrine', 'discipleship']
      .filter(key => asText(sections[key])).length;
    const reference = hasObject(source.studyReference) ? source.studyReference : {};
    const passage = asText(source.sermonPassage) || asText(reference.display) ||
      [asText(reference.book), Number.isInteger(Number(reference.chapter)) ? String(reference.chapter) : ''].filter(Boolean).join(' ');
    return { attached: true, stageCount, passage, translation: asText(source.translation) || 'Unknown' };
  }

  function sortRecentSermons(sermons) {
    return (Array.isArray(sermons) ? sermons : []).slice().sort((a, b) => {
      const timeA = Date.parse(a.updated_at || a.updatedAt || a.created_at || '') || 0;
      const timeB = Date.parse(b.updated_at || b.updatedAt || b.created_at || '') || 0;
      return timeB - timeA;
    });
  }

  function deriveDashboardStats(sermons) {
    const rows = Array.isArray(sermons) ? sermons : [];
    return {
      total: rows.length,
      withInductiveSource: rows.filter(row => getSourceSummary(row).attached).length,
      withOutline: rows.filter(row => row.outline.length > 0 && row.outline.some(item => asText(item.statement))).length,
      withManuscript: rows.filter(row => asText(row.manuscript)).length
    };
  }

  function normalizeSourcePacket(raw) {
    if (!hasObject(raw)) throw new Error('The selected file must contain a JSON object.');
    if (raw.format !== 'inductive-bible-study-sermon-source' || raw.version !== 1) throw new Error('This is not a supported version 1 IBS sermon-source packet.');
    const studyRef = hasObject(raw.studyReference) ? raw.studyReference : {};
    const book = clip(studyRef.book, 80).trim();
    const chapter = Number(studyRef.chapter);
    if (!Object.prototype.hasOwnProperty.call(BOOK_CHAPTERS, book) || !Number.isInteger(chapter) || chapter < 1 || chapter > BOOK_CHAPTERS[book]) {
      throw new Error('The packet has an invalid Bible book or chapter.');
    }
    const sermonPassage = clip(raw.sermonPassage, 160).trim();
    const referencePattern = /^(.+?)\s+(\d{1,3})(?::(\d{1,3})(?:[-–—](\d{1,3}))?)?$/;
    const match = sermonPassage.match(referencePattern);
    if (!match || match[1] !== book || Number(match[2]) !== chapter) {
      throw new Error('The sermon passage must be inside ' + book + ' ' + chapter + '.');
    }
    const startVerse = match[3] ? Number(match[3]) : null;
    const endVerse = match[4] ? Number(match[4]) : startVerse;
    if (startVerse !== null && (!Number.isInteger(startVerse) || startVerse < 1 || endVerse < startVerse || endVerse > 250)) {
      throw new Error('The sermon passage has an invalid verse range.');
    }
    const sections = hasObject(raw.sections) ? raw.sections : {};
    const keys = ['observe', 'interpret', 'doctrine', 'discipleship'];
    if (keys.some(key => typeof sections[key] !== 'string')) throw new Error('The packet must include all four IBS study stages.');
    const normalizedSections = {};
    keys.forEach(key => { normalizedSections[key] = clip(sections[key], 100000); });
    const outlineRaw = hasObject(raw.passageOutline) ? raw.passageOutline : {};
    const outlineSections = asArray(outlineRaw.sections).slice(0, 300).map(row => ({
      id: clip(row.id, 120),
      heading: clip(row.heading, 1000),
      verseRange: clip(row.verseRange, 160),
      majorIdea: clip(row.majorIdea, 10000),
      supportingDetails: clip(row.supportingDetails, 20000)
    }));
    const verseMaps = {};
    if (hasObject(raw.verseMaps)) {
      Object.entries(raw.verseMaps).slice(0, 250).forEach(([key, value]) => {
        if (!/^\d{1,3}$/.test(key) || !hasObject(value)) return;
        const safe = {};
        Object.entries(value).slice(0, 40).forEach(([field, fieldValue]) => {
          if (typeof fieldValue === 'string') safe[field] = clip(fieldValue, field === 'verseText' ? 12000 : 5000);
          else if (Array.isArray(fieldValue)) safe[field] = fieldValue.slice(0, 40).map(item => typeof item === 'string' ? clip(item, 1000) : item && typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item);
          else if (typeof fieldValue === 'number' || typeof fieldValue === 'boolean' || fieldValue === null) safe[field] = fieldValue;
        });
        verseMaps[key] = safe;
      });
    }
    const safeRows = (value, max) => asArray(value).slice(0, max).map(item => JSON.parse(JSON.stringify(item)));
    const standard = hasObject(raw.standardCrossReferences) ? raw.standardCrossReferences : {};
    return {
      format: 'inductive-bible-study-sermon-source',
      version: 1,
      exportedAt: clip(raw.exportedAt, 80),
      studyReference: { book, chapter, display: book + ' ' + chapter },
      sermonPassage,
      translation: clip(raw.translation, 40) || 'Unknown',
      sourceUpdatedAt: clip(raw.sourceUpdatedAt, 80),
      passageText: clip(raw.passageText, 150000),
      passageTextIncluded: raw.passageTextIncluded === true && Boolean(clip(raw.passageText, 150000).trim()),
      sections: normalizedSections,
      passageOutline: { title: clip(outlineRaw.title, 500), sections: outlineSections },
      verseMaps,
      scriptureMarkups: safeRows(raw.scriptureMarkups, 1000),
      customCrossReferences: safeRows(raw.customCrossReferences, 1000),
      relatedPassages: safeRows(raw.relatedPassages, 100),
      standardCrossReferences: {
        dataset: clip(standard.dataset, 300),
        license: clip(standard.license, 100),
        available: standard.available === true,
        note: clip(standard.note, 1000),
        entries: safeRows(standard.entries, 250)
      },
      selectedVerses: Array.isArray(raw.selectedVerses) ? raw.selectedVerses.slice(0, 250).map(value => clip(value, 160)).filter(Boolean) : []
    };
  }

  function readClaimReviewStatuses(storage) {
    try {
      const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      const raw = target && target.getItem(CLAIM_REVIEW_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return hasObject(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeClaimReviewStatus(storage, sermonId, reviewKey, status) {
    const validStatuses = ['not-reviewed', 'reviewed', 'needs-research', 'requires-revision'];
    if (!sermonId || !reviewKey || String(reviewKey).length > 180 || !validStatuses.includes(status)) return false;
    try {
      const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!target || typeof target.setItem !== 'function') return false;
      const all = readClaimReviewStatuses(target);
      const existing = hasObject(all[String(sermonId)]) ? all[String(sermonId)] : {};
      all[String(sermonId)] = { ...existing, [String(reviewKey)]: status };
      target.setItem(CLAIM_REVIEW_KEY, JSON.stringify(all));
      return true;
    } catch (_) { return false; }
  }

  return {
    STORAGE_KEY, CLAIM_REVIEW_KEY, WORKFLOW_STAGES, BOOK_CHAPTERS,
    normalizeSermonForDisplay, parseStoredSermons, readLocalSermons, writeLocalSermons,
    createSermonRecord, sermonSearchText, filterSermons, getStageProgress, getSourceSummary,
    sortRecentSermons, deriveDashboardStats, normalizeSourcePacket, readClaimReviewStatuses, writeClaimReviewStatus
  };
});
