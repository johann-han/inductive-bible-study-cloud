(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KerygmaArchive = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  const FORMAT = 'kerygma-sermon-workspace';
  const VERSION = 1;
  const STORAGE_KEY = 'kerygma_sermons';
  const CLAIM_REVIEW_KEY = 'kerygma_claim_review_status_v1';
  const OWNER_KEY = 'kerygma_local_owner_id';
  const PENDING_KEY = 'kerygma_pending_cloud_deletions';
  const PENDING_OWNER_KEY = 'kerygma_pending_cloud_deletions_owner_id';
  const MAX_SERMONS = 5000;
  const MAX_ID_LENGTH = 256;

  function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function cloneJson(value, label) {
    let serialized;
    try { serialized = JSON.stringify(value); }
    catch (_) { throw new Error((label || 'Data') + ' contains values that cannot be exported as JSON.'); }
    if (typeof serialized !== 'string') throw new Error((label || 'Data') + ' could not be serialized.');
    try { return JSON.parse(serialized); }
    catch (_) { throw new Error((label || 'Data') + ' could not be copied safely.'); }
  }

  function validateSermons(rows, label) {
    if (!Array.isArray(rows)) throw new Error((label || 'Archive') + ' must contain a sermon array.');
    if (rows.length > MAX_SERMONS) throw new Error('The archive exceeds the limit of ' + MAX_SERMONS + ' sermons.');
    const ids = new Set();
    return rows.map((row, index) => {
      if (!isObject(row) || typeof row.id !== 'string' || !row.id.trim() || row.id.length > MAX_ID_LENGTH) {
        throw new Error((label || 'Archive') + ' contains a sermon with a missing or invalid ID at position ' + (index + 1) + '.');
      }
      if (ids.has(row.id)) throw new Error((label || 'Archive') + ' contains the duplicate sermon ID "' + row.id + '".');
      ids.add(row.id);
      return cloneJson(row, 'Sermon "' + row.id + '"');
    });
  }

  function validateStatuses(value, label) {
    if (value == null) return {};
    if (!isObject(value)) throw new Error((label || 'Archive') + ' claim-review statuses must be an object.');
    const ids = Object.keys(value);
    if (ids.length > MAX_SERMONS) throw new Error('The archive contains too many claim-review status groups.');
    for (const id of ids) {
      if (!id || id.length > MAX_ID_LENGTH || !isObject(value[id])) {
        throw new Error('The archive contains an invalid claim-review status group.');
      }
    }
    return cloneJson(value, 'Claim-review statuses');
  }

  function validatePendingDeletions(value, label) {
    if (value == null) return [];
    if (!Array.isArray(value)) throw new Error((label || 'Archive') + ' pending deletion queue must be an array.');
    if (value.length > MAX_SERMONS) throw new Error('The archive contains too many pending deletion records.');
    const ids = new Set();
    return value.map((entry, index) => {
      if (!isObject(entry)) throw new Error('The archive contains an invalid pending deletion at position ' + (index + 1) + '.');
      const rawId = entry.sermon_id || entry.id;
      const id = typeof rawId === 'string' ? rawId : String(rawId == null ? '' : rawId);
      if (!id.trim() || id.length > MAX_ID_LENGTH) throw new Error('The archive contains a pending deletion without a valid sermon ID.');
      if (ids.has(id)) throw new Error('The archive contains duplicate pending deletion ID "' + id + '".');
      ids.add(id);
      const safe = cloneJson(entry, 'Pending deletion "' + id + '"');
      safe.sermon_id = id;
      safe.sermon_data = isObject(entry.sermon_data) ? cloneJson(entry.sermon_data, 'Pending deletion data') : { id };
      return safe;
    });
  }

  function createWorkspaceArchive(sermons, statuses, ownerId, exportedAt, pendingDeletions, pendingDeletionOwnerId) {
    const records = validateSermons(sermons, 'Workspace backup');
    const reviewStatuses = validateStatuses(statuses, 'Workspace backup');
    const pending = validatePendingDeletions(pendingDeletions, 'Workspace backup');
    const pendingOwner = typeof pendingDeletionOwnerId === 'string' && pendingDeletionOwnerId.trim()
      ? pendingDeletionOwnerId
      : (pending.length && typeof ownerId === 'string' ? ownerId : null);
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: typeof exportedAt === 'string' ? exportedAt : new Date().toISOString(),
      sourceApplication: 'Kerygma Expository Sermon Studio',
      ownerId: typeof ownerId === 'string' && ownerId.trim() ? ownerId : null,
      sermonCount: records.length,
      sermons: records,
      claimReviewStatuses: reviewStatuses,
      pendingCloudDeletions: pending,
      pendingCloudDeletionsOwnerId: pendingOwner
    };
  }

  function parseWorkspaceArchive(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); }
      catch (_) { throw new Error('The selected file is not valid JSON. No local data was changed.'); }
    }
    if (!isObject(parsed)) throw new Error('The selected file must contain a Kerygma workspace archive object.');
    if (parsed.format !== FORMAT || parsed.version !== VERSION) {
      throw new Error('This is not a supported Kerygma workspace archive (version 1).');
    }
    const sermons = validateSermons(parsed.sermons, 'Workspace archive');
    if (Number.isInteger(parsed.sermonCount) && parsed.sermonCount !== sermons.length) {
      throw new Error('The archive sermon count does not match its contents.');
    }
    const statuses = validateStatuses(parsed.claimReviewStatuses, 'Workspace archive');
    const pending = validatePendingDeletions(parsed.pendingCloudDeletions, 'Workspace archive');
    const ownerId = typeof parsed.ownerId === 'string' && parsed.ownerId.trim() ? parsed.ownerId : null;
    const pendingOwner = typeof parsed.pendingCloudDeletionsOwnerId === 'string' && parsed.pendingCloudDeletionsOwnerId.trim()
      ? parsed.pendingCloudDeletionsOwnerId : (pending.length ? ownerId : null);
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      sourceApplication: typeof parsed.sourceApplication === 'string' ? parsed.sourceApplication : 'Kerygma Expository Sermon Studio',
      ownerId,
      sermonCount: sermons.length,
      sermons,
      claimReviewStatuses: statuses,
      pendingCloudDeletions: pending,
      pendingCloudDeletionsOwnerId: pendingOwner
    };
  }

  function readRawSermonRecords(storage) {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Browser storage is unavailable.');
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch (_) { throw new Error('The existing sermon cache could not be read. No backup or restore was attempted.'); }
    if (raw == null || raw === '') return [];
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (_) { throw new Error('The existing sermon cache contains invalid JSON. Export or repair it in the Current Studio before restoring.'); }
    return validateSermons(parsed, 'Existing sermon cache');
  }

  function readRawClaimReviewStatuses(storage) {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Browser storage is unavailable.');
    let raw;
    try { raw = storage.getItem(CLAIM_REVIEW_KEY); }
    catch (_) { throw new Error('The existing claim-review status store could not be read.'); }
    if (raw == null || raw === '') return {};
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (_) { throw new Error('The existing claim-review status store contains invalid JSON.'); }
    return validateStatuses(parsed, 'Existing claim-review status store');
  }

  function readRawPendingCloudDeletions(storage) {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Browser storage is unavailable.');
    let raw;
    try { raw = storage.getItem(PENDING_KEY); }
    catch (_) { throw new Error('The pending cloud-deletion queue could not be read.'); }
    if (raw == null || raw === '') return [];
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (_) { throw new Error('The pending cloud-deletion queue contains invalid JSON.'); }
    return validatePendingDeletions(parsed, 'Existing pending cloud-deletion queue');
  }

  function readPendingDeletionOwnerId(storage) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    try {
      const value = storage.getItem(PENDING_OWNER_KEY);
      return typeof value === 'string' && value.trim() ? value : null;
    } catch (_) { return null; }
  }

  function readOwnerId(storage) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    try {
      const value = storage.getItem(OWNER_KEY);
      return typeof value === 'string' && value.trim() ? value : null;
    } catch (_) { return null; }
  }

  function buildRestorePlan(existingRows, archiveInput, strategy, currentStatusInput, currentPendingInput, currentPendingOwnerId) {
    const archive = parseWorkspaceArchive(archiveInput);
    const existing = validateSermons(existingRows, 'Current workspace');
    const mode = strategy === 'replace-conflicts' ? 'replace-conflicts' : 'skip-conflicts';
    const existingIds = new Set(existing.map(row => row.id));
    const incomingIds = new Set(archive.sermons.map(row => row.id));
    const rows = existing.slice();
    const indexById = new Map(rows.map((row, index) => [row.id, index]));
    let added = 0;
    let replaced = 0;
    let skipped = 0;

    archive.sermons.forEach(row => {
      if (indexById.has(row.id)) {
        if (mode === 'replace-conflicts') {
          rows[indexById.get(row.id)] = cloneJson(row, 'Sermon "' + row.id + '"');
          replaced += 1;
        } else {
          skipped += 1;
        }
      } else {
        indexById.set(row.id, rows.length);
        rows.push(cloneJson(row, 'Sermon "' + row.id + '"'));
        added += 1;
      }
    });

    const currentStatuses = validateStatuses(currentStatusInput || {}, 'Current claim-review status store');
    const nextStatuses = cloneJson(currentStatuses, 'Current claim-review statuses');
    Object.keys(archive.claimReviewStatuses).forEach(id => {
      if (!incomingIds.has(id)) return;
      const incoming = archive.claimReviewStatuses[id];
      const current = isObject(nextStatuses[id]) ? nextStatuses[id] : null;
      if (!current || !existingIds.has(id) || mode === 'replace-conflicts') {
        nextStatuses[id] = cloneJson(incoming, 'Claim-review statuses for "' + id + '"');
      } else {
        nextStatuses[id] = { ...cloneJson(incoming, 'Imported claim-review statuses'), ...current };
      }
    });

    const currentPending = validatePendingDeletions(currentPendingInput || [], 'Current pending deletion queue');
    const currentPendingIds = new Set(currentPending.map(entry => entry.sermon_id));
    const pending = currentPending.slice();
    archive.pendingCloudDeletions.forEach(entry => {
      if (!currentPendingIds.has(entry.sermon_id)) {
        currentPendingIds.add(entry.sermon_id);
        pending.push(cloneJson(entry, 'Pending deletion "' + entry.sermon_id + '"'));
      }
    });
    if (currentPending.length && archive.pendingCloudDeletions.length &&
        currentPendingOwnerId && archive.pendingCloudDeletionsOwnerId &&
        currentPendingOwnerId !== archive.pendingCloudDeletionsOwnerId) {
      throw new Error('Pending deletion queues belong to different accounts. Switch to the matching account before restoring.');
    }
    const pendingOwner = pending.length
      ? (currentPending.length ? (currentPendingOwnerId || archive.pendingCloudDeletionsOwnerId || archive.ownerId || null)
        : (archive.pendingCloudDeletionsOwnerId || archive.ownerId || null))
      : null;

    return {
      sermons: rows,
      claimReviewStatuses: nextStatuses,
      pendingCloudDeletions: pending,
      pendingCloudDeletionsOwnerId: pendingOwner,
      added,
      replaced,
      skipped,
      incoming: archive.sermons.length,
      strategy: mode
    };
  }

  function restoreWorkspaceArchive(storage, plan) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('Browser storage is unavailable. No workspace data was changed.');
    }
    if (!plan || !Array.isArray(plan.sermons) || !isObject(plan.claimReviewStatuses) ||
        !Array.isArray(plan.pendingCloudDeletions)) {
      throw new Error('The restore plan is invalid. No workspace data was changed.');
    }

    const writes = [
      [STORAGE_KEY, JSON.stringify(validateSermons(plan.sermons, 'Restore plan'))],
      [CLAIM_REVIEW_KEY, JSON.stringify(validateStatuses(plan.claimReviewStatuses, 'Restore plan'))],
      [PENDING_KEY, JSON.stringify(validatePendingDeletions(plan.pendingCloudDeletions, 'Restore plan'))],
      [PENDING_OWNER_KEY, plan.pendingCloudDeletions.length
        ? String(plan.pendingCloudDeletionsOwnerId || '') : null]
    ];
    const snapshots = new Map();
    try {
      writes.forEach(([key]) => snapshots.set(key, storage.getItem(key)));
    } catch (_) {
      throw new Error('The current workspace could not be backed up before restore. No data was changed.');
    }

    const written = [];
    try {
      writes.forEach(([key, value]) => {
        if (value === null) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, value);
        }
        written.push(key);
      });
      return true;
    } catch (error) {
      let rollbackError = null;
      for (const key of written.reverse()) {
        try {
          const previous = snapshots.get(key);
          if (previous == null) storage.removeItem(key);
          else storage.setItem(key, previous);
        } catch (rollbackFailure) { rollbackError = rollbackFailure; }
      }
      const detail = rollbackError
        ? ' The browser also prevented complete rollback; use the downloaded workspace backup to recover.'
        : ' The previous workspace stores were restored.';
      throw new Error('Workspace restore failed: ' + (error && error.message ? error.message : 'Browser storage rejected the write.') + '.' + detail);
    }
  }

  function countStatusGroups(statuses) {
    return Object.keys(validateStatuses(statuses, 'Claim-review statuses')).length;
  }

  return {
    FORMAT, VERSION, STORAGE_KEY, CLAIM_REVIEW_KEY, OWNER_KEY, PENDING_KEY, PENDING_OWNER_KEY, MAX_SERMONS,
    createWorkspaceArchive, parseWorkspaceArchive, readRawSermonRecords,
    readRawClaimReviewStatuses, readRawPendingCloudDeletions, readPendingDeletionOwnerId,
    readOwnerId, buildRestorePlan, restoreWorkspaceArchive, countStatusGroups
  };
});
