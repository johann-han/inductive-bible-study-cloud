# Validated IBS workspace archives

The archive module is preview-only and has no browser-storage or network side effects.

## Formats

- `ibs-workspace-archive` version 1 contains selected preview stores as a portable JSON envelope with per-store record counts.
- Existing `ibs-theological-dossier-archive` version 1 files are accepted and mapped to the dossier-version store.

## Safety model

1. Parse JSON and enforce a 25 MB input limit.
2. Reject unsupported formats/versions, unsupported stores, altered counts and invalid schema fields.
3. Validate passage bounds, allowed stage/status/assessment values, markup ranges, IDs and history checkpoints.
4. Build a preflight report distinguishing new, byte-equivalent and conflicting records.
5. Merge by default: existing local data wins unless a conflict decision is supplied.
6. Support explicit replace or duplicate decisions. Duplicate decisions generate a fresh ID; original history, timestamps and dossier snapshots remain intact.
7. Replace mode requires an explicit decision for every differing duplicate.
8. No write to localStorage occurs in this module. The application must persist the complete planned state only after researcher confirmation.

Unknown extension fields inside supported records are preserved. This matters for forward compatibility and research provenance.
