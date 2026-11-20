(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KerygmaRebuildData = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  const STORAGE_KEY = 'kerygma_sermons';
  const WORKFLOW_STAGES = [
    { id: 'passage', label: 'Text & Exegesis', shortLabel: 'Exegesis' },
    { id: 'bigIdea', label: 'Big Idea & Proposition', shortLabel: 'Big Idea' },
    { id: 'outline', label: 'Homiletical Outline', shortLabel: 'Outline' },
    { id: 'illustrations', label: 'Illustrations & Application', shortLabel: 'Application' },
    { id: 'manuscript', label: 'Manuscript / Notes', shortLabel: 'Manuscript' }
  ];

  function asText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function asArray(value) {
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
  }

  function hasObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function normalizeSermonForDisplay(record) {
    if (!hasObject(record)) return null;
    const id = asText(record.id);
    if (!id) return null;

    const outline = asArray(record.outline);
    const illustrations = asArray(record.illustrations);
    const source = hasObject(record.inductiveStudySource) ? record.inductiveStudySource : null;
    const updatedAt = asText(record.updated_at) || asText(record.updatedAt) || asText(record.updated);
    const createdAt = asText(record.created_at) || asText(record.createdAt);

    return {
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
      outline,
      illustrations,
      appSeekers: asText(record.appSeekers),
      appBelievers: asText(record.appBelievers),
      appSuffering: asText(record.appSuffering),
      manuscript: asText(record.manuscript),
      inductiveStudySource: source,
      updatedAt,
      createdAt
    };
  }

  function parseStoredSermons(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        return [];
      }
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
    if (!row) return WORKFLOW_STAGES.map(stage => ({ ...stage, state: 'not-started' }));

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
      return {
        ...stage,
        state: populated === 0 ? 'not-started' : populated === values.length ? 'complete' : 'in-progress'
      };
    });
  }

  function getSourceSummary(sermon) {
    const row = normalizeSermonForDisplay(sermon);
    if (!row || !row.inductiveStudySource) return { attached: false, stageCount: 0, passage: '' };
    const source = row.inductiveStudySource;
    const sections = hasObject(source.sections) ? source.sections : {};
    const stageCount = ['observe', 'interpret', 'doctrine', 'discipleship']
      .filter(key => asText(sections[key])).length;
    const reference = hasObject(source.studyReference) ? source.studyReference : {};
    const passage = asText(source.sermonPassage) || asText(reference.display) ||
      [asText(reference.book), Number.isInteger(Number(reference.chapter)) ? String(reference.chapter) : ''].filter(Boolean).join(' ');
    return { attached: true, stageCount, passage };
  }

  function sortRecentSermons(sermons) {
    return (Array.isArray(sermons) ? sermons : []).slice().sort((a, b) => {
      const timeA = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const timeB = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return timeB - timeA;
    });
  }

  function deriveDashboardStats(sermons) {
    const rows = Array.isArray(sermons) ? sermons : [];
    return {
      total: rows.length,
      withInductiveSource: rows.filter(row => getSourceSummary(row).attached).length,
      withOutline: rows.filter(row => row.outline.length > 0).length,
      withManuscript: rows.filter(row => asText(row.manuscript)).length
    };
  }

  return {
    STORAGE_KEY,
    WORKFLOW_STAGES,
    normalizeSermonForDisplay,
    parseStoredSermons,
    readLocalSermons,
    sermonSearchText,
    filterSermons,
    getStageProgress,
    getSourceSummary,
    sortRecentSermons,
    deriveDashboardStats
  };
});
