# Validated IBS workspace archives

The archive validation and import-planning module is pure: it has no browser-storage or network side effects. A separate storage adapter is invoked only by the explicit Restore button after the user has reviewed the archive and confirmed the operation.

## Formats

- ibs-workspace-archive version 1 contains selected preview stores as a portable JSON envelope with per-store record counts.
- Existing ibs-theological-dossier-archive version 1 files are accepted and mapped to the dossier-version store.

## Safety model

1. Parse JSON and enforce a 25 MB input limit.
2. Reject unsupported formats/versions, unsupported stores, altered counts and invalid schema fields.
3. Validate passage bounds, allowed stage/status/assessment values, markup ranges, unique IDs, safe object keys and history checkpoints.
4. Build a preflight report distinguishing new, byte-equivalent and conflicting records.
5. Merge by default: existing local data wins unless a conflict decision is supplied.
6. Support explicit Keep / Replace / Duplicate decisions only where a separate copy has a well-defined representation. Single-value draft, claim and doctrine records support Keep or Replace.
7. Replace mode requires an explicit decision for every differing duplicate.
8. The storage adapter snapshots every affected key before the first write, then commits the reviewed values. If a write fails, attempted writes are rolled back in reverse order.
9. If rollback also fails, restoration reports that it was incomplete rather than claiming success. This is covered by an injected-storage failure test.

Unknown extension fields inside supported records are preserved. This matters for forward compatibility and research provenance.

## Scope

- The archive covers the eleven preview stores listed in WORKSPACE_ARCHIVE_STORES, including saved source-attributed word studies (Strong’s ID, occurrence reference, translation, morphology, lexicon senses, source and researcher notes). Word-study records participate in preflight conflict review and Keep / Replace / Duplicate restore decisions.
- It does not export or migrate Supabase records, production data, account/authentication state, or the live application.
- Browser-based acceptance on the PR preview remains a separate release gate.
