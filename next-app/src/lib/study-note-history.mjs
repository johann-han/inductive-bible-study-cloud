export const STUDY_NOTE_VERSION_LIMIT = 8;
export const STUDY_NOTE_VERSION_INTERVAL_MS = 2 * 60 * 1000;
export const STUDY_NOTE_VERSION_STAGES = Object.freeze([
  { key: 'observe', label: 'Observe' },
  { key: 'interpret', label: 'Interpretation' },
  { key: 'doctrine', label: 'Doctrine' },
  { key: 'apply', label: 'Discipleship' }
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneSections(value) {
  const sections = isObject(value) ? value : {};
  return Object.fromEntries(STUDY_NOTE_VERSION_STAGES.map(({ key }) => [
    key,
    typeof sections[key] === 'string' ? sections[key] : ''
  ]));
}

function signature(sections) {
  return JSON.stringify(cloneSections(sections));
}

function makeId(nowMs) {
  return 'note-v' + nowMs.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/**
 * Validate, de-duplicate, sort and bound a stored study-note version history.
 * Unknown snapshot fields are intentionally not carried into the normalized
 * representation; the four note bodies and active stage are the history contract.
 */
export function normalizeStudyNoteVersionHistory(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  return value.filter(entry => {
    if (!isObject(entry) ||
        typeof entry.id !== 'string' || entry.id.length < 1 || entry.id.length > 100 ||
        typeof entry.savedAt !== 'string' || !Number.isFinite(Date.parse(entry.savedAt)) ||
        !isObject(entry.sections)) return false;
    if (!STUDY_NOTE_VERSION_STAGES.every(({ key }) =>
      typeof entry.sections[key] === 'string' && entry.sections[key].length <= 200000)) return false;
    if (entry.activeStage !== undefined &&
        !STUDY_NOTE_VERSION_STAGES.some(({ key }) => key === entry.activeStage)) return false;
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  }).map(entry => ({
    id: entry.id,
    savedAt: entry.savedAt,
    activeStage: STUDY_NOTE_VERSION_STAGES.some(({ key }) => key === entry.activeStage)
      ? entry.activeStage
      : 'observe',
    sections: cloneSections(entry.sections)
  })).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, STUDY_NOTE_VERSION_LIMIT);
}

/**
 * Capture the draft's four stage bodies before an edit or restore.
 * Identical snapshots are skipped. Automatic snapshots are throttled to one
 * per two minutes; explicit restore protection may pass force=true.
 */
export function appendStudyNoteVersionSnapshot(draft, options = {}) {
  if (!isObject(draft)) return { ...(draft || {}) };
  const history = normalizeStudyNoteVersionHistory(draft.versionHistory);
  const sections = cloneSections(draft);
  const latest = history[0];

  if (latest && signature(latest.sections) === signature(sections)) {
    return { ...draft, versionHistory: history };
  }

  const nowMs = Number.isFinite(options.now) ? options.now : Date.now();
  const latestTime = Date.parse(latest?.savedAt || '');
  if (!options.force && latest && Number.isFinite(latestTime) &&
      nowMs - latestTime < STUDY_NOTE_VERSION_INTERVAL_MS) {
    return { ...draft, versionHistory: history };
  }

  const activeStage = STUDY_NOTE_VERSION_STAGES.some(({ key }) => key === draft.activeStage)
    ? draft.activeStage
    : 'observe';
  const snapshot = {
    id: typeof options.id === 'string' && options.id ? options.id : makeId(nowMs),
    savedAt: new Date(nowMs).toISOString(),
    activeStage,
    sections
  };
  return {
    ...draft,
    versionHistory: [snapshot, ...history].slice(0, STUDY_NOTE_VERSION_LIMIT)
  };
}

export function countStudyNoteVersionWords(snapshot) {
  const sections = cloneSections(snapshot?.sections);
  return Object.fromEntries(STUDY_NOTE_VERSION_STAGES.map(({ key, label }) => {
    const text = sections[key].trim();
    return [key, { label, words: text ? text.split(/\\s+/).length : 0 }];
  }));
}

/**
 * Restore just the four note sections and active stage from a saved snapshot.
 * A forced snapshot of the current draft is retained first, so the restore is
 * reversible. All other draft extension fields remain untouched.
 */
export function restoreStudyNoteVersion(draft, snapshotId, options = {}) {
  if (!isObject(draft)) return { restored: false, draft };
  const history = normalizeStudyNoteVersionHistory(draft.versionHistory);
  const target = history.find(snapshot => snapshot.id === snapshotId);
  if (!target) return { restored: false, draft: { ...draft, versionHistory: history } };

  const protectedDraft = appendStudyNoteVersionSnapshot(
    { ...draft, versionHistory: history },
    { ...options, force: true }
  );
  const restoredDraft = {
    ...protectedDraft,
    ...cloneSections(target.sections),
    activeStage: target.activeStage
  };
  return {
    restored: true,
    snapshot: target,
    draft: restoredDraft
  };
}
