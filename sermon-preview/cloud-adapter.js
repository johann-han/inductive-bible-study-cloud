(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KerygmaCloudAdapter = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  const SERMONS_KEY = 'kerygma_sermons';
  const OWNER_KEY = 'kerygma_local_owner_id';
  const PENDING_KEY = 'kerygma_pending_cloud_deletions';
  const PENDING_OWNER_KEY = 'kerygma_pending_cloud_deletions_owner_id';
  const CLAIM_REVIEW_KEY = 'kerygma_claim_review_status_v1';
  const CLAIM_REVIEW_BACKUP_PREFIX = 'kerygma_claim_review_status_backup_';

  class KerygmaCloudAdapter {
    constructor(options = {}) {
      this.storage = options.storage || (root && root.localStorage) || null;
      this.ensureClient = typeof options.ensureSupabaseClient === 'function' ? options.ensureSupabaseClient : async () => null;
      this.getClient = typeof options.getSupabaseClient === 'function' ? options.getSupabaseClient : () => null;
      this.getSermons = typeof options.getSermons === 'function' ? options.getSermons : () => [];
      this.getCurrentSermonId = typeof options.getCurrentSermonId === 'function' ? options.getCurrentSermonId : () => null;
      this.onSermonsChanged = typeof options.onSermonsChanged === 'function' ? options.onSermonsChanged : () => {};
      this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
      this.cloudSync = options.cloudSync || (root && root.KerygmaCloudSync) || null;
      this.supabaseClient = null;
      this.pendingCloudDeletions = this.loadPendingCloudDeletions();
      this.localSermonOwnerId = this.readStorage(OWNER_KEY) || '';
      this.cloudUserId = null;
      this.cloudSyncReady = false;
      this.cloudSyncInFlight = null;
      this.cloudSyncQueued = false;
      this.cloudSyncTimer = null;
      this.cloudAuthSubscription = null;
      this.isApplyingCloudData = false;
      this.activityBound = false;
    }

    readStorage(key) {
      try { return this.storage && this.storage.getItem(key); } catch (_) { return null; }
    }

    writeStorage(key, value) {
      try {
        if (!this.storage || typeof this.storage.setItem !== 'function') return false;
        this.storage.setItem(key, value);
        return true;
      } catch (_) { return false; }
    }

    removeStorage(key) {
      try {
        if (this.storage && typeof this.storage.removeItem === 'function') this.storage.removeItem(key);
      } catch (_) {}
    }

    async withCloudTimeout(operation, label, timeoutMs = 15000) {
      let timeoutId;
      try {
        return await Promise.race([
          operation,
          new Promise((_, reject) => {
            timeoutId = root.setTimeout(() => {
              reject(new Error(label + ' timed out after ' + Math.round(timeoutMs / 1000) + ' seconds. Refresh Kerygma and try again.'));
            }, timeoutMs);
          })
        ]);
      } finally {
        if (timeoutId) root.clearTimeout(timeoutId);
      }
    }

    async ensureSupabaseClient() {
      await this.ensureClient();
      this.supabaseClient = this.getClient();
      if (!this.supabaseClient || !this.supabaseClient.auth || typeof this.supabaseClient.auth.getSession !== 'function') {
        throw new Error('The Supabase client is not ready for Kerygma cloud storage.');
      }
      if (!this.cloudSync || typeof this.cloudSync.mergeSermons !== 'function') {
        throw new Error('The Kerygma cloud merge helper could not be loaded. Local sermon data remains safe.');
      }
      return this.supabaseClient;
    }

    async previewCloudSermons() {
      await this.ensureSupabaseClient();
      const sessionResult = await this.withCloudTimeout(
        this.supabaseClient.auth.getSession(),
        'Supabase sign-in check'
      );
      if (sessionResult.error) throw new Error('Could not read the IBS sign-in session.');
      const session = sessionResult.data && sessionResult.data.session;
      if (!session || !session.user || !session.user.id) {
        throw new Error('Sign in through IBS before previewing the cloud sermon library.');
      }

      const userId = session.user.id;
      const cloudResult = await this.withCloudTimeout(
        this.supabaseClient
          .from('kerygma_sermons')
          .select('sermon_id,sermon_data,updated_at,deleted_at')
          .eq('user_id', userId),
        'Kerygma sermon database preview'
      );
      if (cloudResult.error) throw cloudResult.error;

      const storedOwnerId = this.readStorage(OWNER_KEY) || this.localSermonOwnerId || '';
      const accountSwitch = Boolean(storedOwnerId && storedOwnerId !== userId);
      const localRecords = accountSwitch ? [] : this.getSermons();
      const rows = Array.isArray(cloudResult.data) ? cloudResult.data : [];
      const cloudRecords = rows.filter(row => row && !row.deleted_at && row.sermon_data && typeof row.sermon_data === 'object');
      const deletionOwnerId = this.readStorage(PENDING_OWNER_KEY) || '';
      const pendingDeletesForThisAccount = deletionOwnerId && deletionOwnerId !== userId
        ? 0
        : this.pendingCloudDeletions.length;
      const localSermonPreviews = localRecords.slice(0, 8).map(record => ({
        sermonId: String(record && record.id || ''),
        title: String(record && record.title || 'Untitled sermon').slice(0, 120),
        passage: String(record && record.passage || 'Passage not recorded').slice(0, 80)
      }));
      const pendingDeletionPreviews = pendingDeletesForThisAccount
        ? this.pendingCloudDeletions.map(entry => {
          const sermon = entry && entry.sermon_data && typeof entry.sermon_data === 'object'
            ? entry.sermon_data
            : {};
          const sermonId = String((entry && (entry.sermon_id || entry.id)) || sermon.id || '');
          const matchesLocalSermon = localRecords.some(record => String(record && record.id || '') === sermonId);
          const matchingCloudRow = rows.find(row => String(row && (row.sermon_id || (row.sermon_data && row.sermon_data.id)) || '') === sermonId);
          return {
            sermonId,
            title: String(sermon.title || 'Untitled sermon').slice(0, 120),
            passage: String(sermon.passage || 'Passage not recorded').slice(0, 80),
            matchesLocalSermon,
            matchesCloudSermon: cloudRecords.some(row => String(row && (row.sermon_id || (row.sermon_data && row.sermon_data.id)) || '') === sermonId),
            matchesCloudRecord: Boolean(matchingCloudRow),
            alreadyDeletedInCloud: Boolean(matchingCloudRow && matchingCloudRow.deleted_at)
          };
        })
        : [];
      const unmatchedPendingDeletionCount = pendingDeletionPreviews.filter(item =>
        !item.matchesLocalSermon && !item.matchesCloudRecord
      ).length;
      // Mirror the actual sync order: apply owned tombstones in memory before
      // calculating the post-sync library. The preview remains strictly read-only.
      const projectedTombstones = pendingDeletesForThisAccount
        ? this.cloudSync.buildTombstoneRows(this.pendingCloudDeletions, userId, new Date().toISOString())
        : [];
      const merged = this.cloudSync.mergeSermons(localRecords, rows.concat(projectedTombstones));

      // This method is deliberately read-only: it does not write localStorage,
      // upload sermons, send deletion tombstones, or change the active owner.
      return {
        readOnly: true,
        userId,
        email: String(session.user.email || ''),
        localSermonCount: localRecords.length,
        localSermonPreviews,
        previousAccountLocalSermonCount: accountSwitch ? this.getSermons().length : 0,
        cloudSermonCount: cloudRecords.length,
        mergedSermonCount: merged.length,
        cloudSermonPreviews: cloudRecords.slice(0, 8).map(row => ({
          title: String(row.sermon_data.title || 'Untitled sermon').slice(0, 120),
          passage: String(row.sermon_data.passage || 'Passage not recorded').slice(0, 80)
        })),
        accountSwitch,
        pendingDeletesForThisAccount,
        pendingDeletionPreviews,
        unmatchedPendingDeletionCount,
        pendingDeletesHeldForAnotherAccount: Math.max(0, this.pendingCloudDeletions.length - pendingDeletesForThisAccount)
      };
    }

    setCloudSyncStatus(message, tone = 'normal') {
      this.onStatus(String(message || ''), tone);
    }

    loadPendingCloudDeletions() {
      try {
        const parsed = JSON.parse(this.readStorage(PENDING_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }

    persistPendingCloudDeletions() {
      return this.writeStorage(PENDING_KEY, JSON.stringify(this.pendingCloudDeletions || []));
    }

    queueCloudDeletion(sermon) {
      if (!sermon || !sermon.id) return false;
      const id = String(sermon.id);
      const previous = this.pendingCloudDeletions.slice();
      const priorOwner = this.readStorage(PENDING_OWNER_KEY) || '';
      const owner = this.cloudUserId || this.localSermonOwnerId || this.readStorage(OWNER_KEY) || '';
      if (previous.length && priorOwner && owner && priorOwner !== owner) return false;
      this.pendingCloudDeletions = previous.filter(entry => String(entry.sermon_id || entry.id || '') !== id);
      this.pendingCloudDeletions.push({ sermon_id: id, sermon_data: sermon });
      if (!this.writeStorage(PENDING_OWNER_KEY, owner) || !this.persistPendingCloudDeletions()) {
        this.pendingCloudDeletions = previous;
        if (priorOwner === null || priorOwner === undefined) this.removeStorage(PENDING_OWNER_KEY);
        else this.writeStorage(PENDING_OWNER_KEY, priorOwner);
        return false;
      }
      return true;
    }

    cancelCloudDeletion(sermonId) {
      const id = String(sermonId || '');
      if (!id) return false;
      const previous = this.pendingCloudDeletions.slice();
      this.pendingCloudDeletions = previous.filter(entry => String(entry.sermon_id || entry.id || '') !== id);
      if (this.pendingCloudDeletions.length === previous.length) return true;
      if (!this.persistPendingCloudDeletions()) {
        this.pendingCloudDeletions = previous;
        return false;
      }
      if (!this.pendingCloudDeletions.length) this.removeStorage(PENDING_OWNER_KEY);
      return true;
    }

    scheduleCloudSync(delay = 700) {
      if (!this.cloudSyncReady || this.isApplyingCloudData) return;
      if (this.cloudSyncTimer) root.clearTimeout(this.cloudSyncTimer);
      this.cloudSyncTimer = root.setTimeout(() => {
        this.cloudSyncTimer = null;
        this.syncCloudSermons({ allowAccountSwitch: false }).catch(error => this.setCloudSyncStatus(error.message || 'Cloud sync failed; local data is safe.', 'error'));
      }, delay);
    }

    async initializeCloudSermons() {
      this.setCloudSyncStatus('Connecting to Supabase…', 'normal');
      try {
        await this.ensureSupabaseClient();
        if (!this.cloudAuthSubscription && typeof this.supabaseClient.auth.onAuthStateChange === 'function') {
          const authResult = this.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              // Authentication alone is not consent to merge or write sermon records.
              this.cloudSyncReady = false;
              this.cloudUserId = null;
              this.setCloudSyncStatus('Signed in — select Sync to load this account’s sermons', 'warning');
            } else if (event === 'SIGNED_OUT') {
              this.cloudSyncReady = false;
              this.cloudUserId = null;
              this.setCloudSyncStatus('Signed out — local copy retained', 'warning');
            }
          });
          this.cloudAuthSubscription = authResult && authResult.data ? authResult.data.subscription : null;
        }
        const synced = await this.syncCloudSermons({ allowAccountSwitch: true });
        this.bindActivitySync();
        return synced;
      } catch (error) {
        const message = error && error.message ? error.message : 'Unknown cloud initialisation error.';
        this.setCloudSyncStatus('Cloud connection failed: ' + message, 'error');
        return false;
      }
    }

    bindActivitySync() {
      if (this.activityBound || !root || typeof root.addEventListener !== 'function') return;
      this.activityBound = true;
      root.addEventListener('focus', () => {
        if (this.cloudSyncReady) this.syncCloudSermons({ allowAccountSwitch: false }).catch(error => this.setCloudSyncStatus(error.message || 'Cloud sync failed.', 'error'));
      });
      if (root.document && typeof root.document.addEventListener === 'function') {
        root.document.addEventListener('visibilitychange', () => {
          if (root.document.visibilityState === 'visible' && this.cloudSyncReady) {
            this.syncCloudSermons({ allowAccountSwitch: false }).catch(error => this.setCloudSyncStatus(error.message || 'Cloud sync failed.', 'error'));
          }
        });
      }
    }

    async syncCloudSermons(options = {}) {
      const allowAccountSwitch = options.allowAccountSwitch !== false;
      if (this.cloudSyncInFlight) {
        this.cloudSyncQueued = true;
        return this.cloudSyncInFlight;
      }

      this.cloudSyncInFlight = (async () => {
        await this.ensureSupabaseClient();
        this.setCloudSyncStatus('Checking your IBS sign-in…', 'normal');
        const sessionResult = await this.withCloudTimeout(
          this.supabaseClient.auth.getSession(),
          'Supabase sign-in check'
        );
        if (sessionResult.error) throw new Error('Could not read the IBS sign-in session.');
        const session = sessionResult.data && sessionResult.data.session;
        if (!session || !session.user || !session.user.id) {
          this.cloudSyncReady = false;
          this.cloudUserId = null;
          this.setCloudSyncStatus('Sign in through IBS to sync sermons', 'warning');
          return false;
        }

        const userId = session.user.id;
        const activeOwnerId = this.readStorage(OWNER_KEY) || this.localSermonOwnerId || '';
        if (activeOwnerId && activeOwnerId !== userId && !allowAccountSwitch) {
          this.cloudSyncReady = false;
          this.cloudUserId = null;
          this.setCloudSyncStatus('A different IBS account is signed in. Use Sync in Account & Sync to switch accounts safely.', 'warning');
          return false;
        }
        this.setCloudSyncStatus('Loading your saved sermons for a safe merge check…', 'normal');
        // Fetch the account-scoped cloud rows before sending any deletion tombstones.
        // This lets the adapter reject an orphaned deletion request without writing
        // a soft-delete marker for an ID that exists in neither active library.
        const cloudResult = await this.withCloudTimeout(
          this.supabaseClient
            .from('kerygma_sermons')
            .select('sermon_id,sermon_data,updated_at,deleted_at')
            .eq('user_id', userId),
          'Kerygma sermon database request'
        );
        if (cloudResult.error) throw cloudResult.error;
        const cloudRows = Array.isArray(cloudResult.data) ? cloudResult.data : [];

        const deletionOwnerId = this.readStorage(PENDING_OWNER_KEY) || '';
        const pendingDeletionHeldForOwner = Boolean(
          this.pendingCloudDeletions.length && deletionOwnerId && deletionOwnerId !== userId
        );
        // A tombstone is scoped to the account that deleted the sermon. Never discard
        // it or upload it under another account during an account switch.
        const localRecordsForDeletionCheck = activeOwnerId && activeOwnerId !== userId
          ? []
          : this.getSermons();
        const unmatchedDeletionIds = pendingDeletionHeldForOwner ? [] : this.pendingCloudDeletions.filter(entry => {
          const sermon = entry && entry.sermon_data && typeof entry.sermon_data === 'object'
            ? entry.sermon_data
            : {};
          const sermonId = String((entry && (entry.sermon_id || entry.id)) || sermon.id || '');
          if (!sermonId) return true;
          const matchesLocal = localRecordsForDeletionCheck.some(record => String(record && record.id || '') === sermonId);
          const matchesCloud = cloudRows.some(row => String(row && (row.sermon_id || (row.sermon_data && row.sermon_data.id)) || '') === sermonId);
          return !matchesLocal && !matchesCloud;
        });
        if (unmatchedDeletionIds.length) {
          const names = unmatchedDeletionIds.map(entry => {
            const sermon = entry && entry.sermon_data && typeof entry.sermon_data === 'object' ? entry.sermon_data : {};
            return String(sermon.title || entry.sermon_id || entry.id || 'Unknown sermon');
          });
          throw new Error(
            'Cloud sync was blocked because a pending deletion does not match any local sermon or cloud record: ' +
            names.join(', ') +
            '. Refresh the read-only preview and remove the obsolete deletion request before syncing.'
          );
        }

        this.setCloudSyncStatus('Synchronising sermons…', 'normal');
        const pendingRows = pendingDeletionHeldForOwner ? [] : this.cloudSync.buildTombstoneRows(
          this.pendingCloudDeletions, userId, new Date().toISOString()
        );
        if (pendingRows.length) {
          const deletionResult = await this.supabaseClient
            .from('kerygma_sermons')
            .upsert(pendingRows, { onConflict: 'user_id,sermon_id' });
          if (deletionResult.error) throw deletionResult.error;
          const previousPending = this.pendingCloudDeletions.slice();
          this.pendingCloudDeletions = [];
          if (!this.persistPendingCloudDeletions()) {
            this.pendingCloudDeletions = previousPending;
            throw new Error('Supabase recorded the deletion, but the local deletion queue could not be cleared. Keep this account selected and retry; the queued deletion has been retained safely.');
          }
          this.removeStorage(PENDING_OWNER_KEY);
        }

        const storedOwnerId = this.readStorage(OWNER_KEY) || this.localSermonOwnerId || '';
        let localSermonsForMerge = this.getSermons();
        if (storedOwnerId && storedOwnerId !== userId) {
          const backupKey = 'kerygma_sermons_backup_' + storedOwnerId;
          if (!this.writeStorage(backupKey, JSON.stringify(localSermonsForMerge))) {
            throw new Error('Could not back up the previous account’s local sermons. Account switching has been stopped; the existing local cache was retained.');
          }
          localSermonsForMerge = [];
        }
        const mergeRows = pendingRows.length ? cloudRows.concat(pendingRows) : cloudRows;
        const merged = this.cloudSync.mergeSermons(localSermonsForMerge, mergeRows);
        const previousCurrentId = this.getCurrentSermonId();
        const nextCurrentId = merged.some(sermon => String(sermon.id) === String(previousCurrentId))
          ? previousCurrentId
          : (merged[0] ? merged[0].id : null);
        const previousLocalCache = this.readStorage(SERMONS_KEY);
        const previousOwnerMarker = this.readStorage(OWNER_KEY);
        const previousClaimStatuses = this.readStorage(CLAIM_REVIEW_KEY);
        const accountChanged = Boolean(storedOwnerId && storedOwnerId !== userId);
        const previousClaimBackupKey = accountChanged ? CLAIM_REVIEW_BACKUP_PREFIX + storedOwnerId : '';
        const nextClaimBackupKey = CLAIM_REVIEW_BACKUP_PREFIX + userId;
        const previousClaimBackup = previousClaimBackupKey ? this.readStorage(previousClaimBackupKey) : null;
        const targetClaimStatuses = accountChanged ? (this.readStorage(nextClaimBackupKey) || '{}') : previousClaimStatuses;
        const restoreStorageValue = (key, value) => {
          if (value == null) this.removeStorage(key);
          else if (!this.writeStorage(key, value)) return false;
          return true;
        };
        this.isApplyingCloudData = true;
        try {
          // Claim-review decisions are device-local in the established format.
          // Keep them account-scoped on this device so another account never inherits
          // statuses for a coincidentally matching sermon ID.
          if (accountChanged) {
            if (!this.writeStorage(previousClaimBackupKey, previousClaimStatuses || '{}')) {
              throw new Error('Could not back up the previous account’s separate Claim Review statuses. Account switching has been stopped; the existing local data was retained.');
            }
            if (!this.writeStorage(CLAIM_REVIEW_KEY, targetClaimStatuses)) {
              restoreStorageValue(previousClaimBackupKey, previousClaimBackup);
              throw new Error('Could not load the new account’s separate Claim Review statuses. The previous account remains active.');
            }
          }
          if (!this.writeStorage(SERMONS_KEY, JSON.stringify(merged))) {
            if (accountChanged) {
              restoreStorageValue(CLAIM_REVIEW_KEY, previousClaimStatuses);
              restoreStorageValue(previousClaimBackupKey, previousClaimBackup);
            }
            throw new Error('Could not save the merged Kerygma sermon cache. Existing local records were retained; cloud sync was stopped.');
          }
          if (!this.writeStorage(OWNER_KEY, userId)) {
            let rollbackFailed = false;
            if (!restoreStorageValue(SERMONS_KEY, previousLocalCache)) rollbackFailed = true;
            if (!restoreStorageValue(OWNER_KEY, previousOwnerMarker)) rollbackFailed = true;
            if (accountChanged) {
              if (!restoreStorageValue(CLAIM_REVIEW_KEY, previousClaimStatuses)) rollbackFailed = true;
              if (!restoreStorageValue(previousClaimBackupKey, previousClaimBackup)) rollbackFailed = true;
            }
            throw new Error(
              'Could not save the Kerygma account-owner marker. ' +
              (rollbackFailed
                ? 'The previous cache/status rollback was incomplete; use the preserved account backups before retrying.'
                : 'The previous local sermon cache, Claim Review statuses and owner marker were restored.')
            );
          }
          this.localSermonOwnerId = userId;
          this.onSermonsChanged(merged, nextCurrentId);
        } finally {
          this.isApplyingCloudData = false;
        }

        const upsertRows = this.cloudSync.buildUpsertRows(merged, userId);
        if (upsertRows.length) {
          const saveResult = await this.supabaseClient
            .from('kerygma_sermons')
            .upsert(upsertRows, { onConflict: 'user_id,sermon_id' });
          if (saveResult.error) throw saveResult.error;
        }

        this.cloudUserId = userId;
        this.cloudSyncReady = true;
        this.setCloudSyncStatus(
          pendingDeletionHeldForOwner
            ? 'Cloud synced · ' + merged.length + ' sermon(s) · deletion queue retained for its original account'
            : 'Cloud synced · ' + merged.length + ' sermon(s)',
          pendingDeletionHeldForOwner ? 'warning' : 'success'
        );
        return true;
      })();

      try {
        return await this.cloudSyncInFlight;
      } finally {
        this.cloudSyncInFlight = null;
        if (this.cloudSyncQueued) {
          this.cloudSyncQueued = false;
          this.scheduleCloudSync(100);
        }
      }
    }

    destroy() {
      if (this.cloudSyncTimer) root.clearTimeout(this.cloudSyncTimer);
      this.cloudSyncTimer = null;
      this.cloudSyncReady = false;
      if (this.cloudAuthSubscription && typeof this.cloudAuthSubscription.unsubscribe === 'function') {
        this.cloudAuthSubscription.unsubscribe();
      }
      this.cloudAuthSubscription = null;
    }
  }

  return { KerygmaCloudAdapter };
});
