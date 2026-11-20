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
        await this.syncCloudSermons({ allowAccountSwitch: true });
        this.bindActivitySync();
        return true;
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
        this.setCloudSyncStatus('Synchronising sermons…', 'normal');

        const deletionOwnerId = this.readStorage(PENDING_OWNER_KEY) || '';
        const pendingDeletionHeldForOwner = Boolean(
          this.pendingCloudDeletions.length && deletionOwnerId && deletionOwnerId !== userId
        );
        // A tombstone is scoped to the account that deleted the sermon. Never discard
        // it or upload it under another account during an account switch.
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

        this.setCloudSyncStatus('Loading your saved sermons…', 'normal');
        const cloudResult = await this.withCloudTimeout(
          this.supabaseClient
            .from('kerygma_sermons')
            .select('sermon_id,sermon_data,updated_at,deleted_at')
            .eq('user_id', userId),
          'Kerygma sermon database request'
        );
        if (cloudResult.error) throw cloudResult.error;

        const storedOwnerId = this.readStorage(OWNER_KEY) || this.localSermonOwnerId || '';
        let localSermonsForMerge = this.getSermons();
        if (storedOwnerId && storedOwnerId !== userId) {
          const backupKey = 'kerygma_sermons_backup_' + storedOwnerId;
          if (!this.writeStorage(backupKey, JSON.stringify(localSermonsForMerge))) {
            throw new Error('Could not back up the previous account’s local sermons. Account switching has been stopped; the existing local cache was retained.');
          }
          localSermonsForMerge = [];
        }
        const merged = this.cloudSync.mergeSermons(localSermonsForMerge, cloudResult.data || []);
        const previousCurrentId = this.getCurrentSermonId();
        const nextCurrentId = merged.some(sermon => String(sermon.id) === String(previousCurrentId))
          ? previousCurrentId
          : (merged[0] ? merged[0].id : null);
        const previousLocalCache = this.readStorage(SERMONS_KEY);
        const previousOwnerMarker = this.readStorage(OWNER_KEY);
        this.isApplyingCloudData = true;
        try {
          if (!this.writeStorage(SERMONS_KEY, JSON.stringify(merged))) {
            throw new Error('Could not save the merged Kerygma sermon cache. Existing local records were retained; cloud sync was stopped.');
          }
          if (!this.writeStorage(OWNER_KEY, userId)) {
            let rollbackFailed = false;
            if (previousLocalCache == null) this.removeStorage(SERMONS_KEY);
            else if (!this.writeStorage(SERMONS_KEY, previousLocalCache)) rollbackFailed = true;
            if (previousOwnerMarker == null) this.removeStorage(OWNER_KEY);
            else if (!this.writeStorage(OWNER_KEY, previousOwnerMarker)) rollbackFailed = true;
            throw new Error(
              'Could not save the Kerygma account-owner marker. ' +
              (rollbackFailed
                ? 'The previous cache rollback was incomplete; use the preserved account backup before retrying.'
                : 'The previous local sermon cache and owner marker were restored.')
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
