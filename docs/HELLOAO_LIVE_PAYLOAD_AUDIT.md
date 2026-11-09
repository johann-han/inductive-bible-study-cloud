# Running the HelloAO live interlinear payload audit

This audit is read-only. It requests the public BSB interlinear chapter JSON and prints aggregate structural statistics; it does not save Bible text or alter the application, database, or API configuration.

## Run

Requires Node.js 18 or later:

```bash
node scripts/audit-helloao-interlinear.mjs
```

Optional API base override:

```bash
HELLOAO_API_BASE=https://bible.helloao.org/api node scripts/audit-helloao-interlinear.mjs
```

The script checks these representative passages:

| Passage | Purpose |
|---|---|
| Genesis 1 | Hebrew |
| Daniel 2 | Aramaic sample |
| Ezra 4–7 | Biblical Aramaic material |
| Matthew 1 | Greek |
| John 1 | Greek |

It reports per-passage token counts, explicit language counts, unknown language values, presence/null counts for the documented interlinear fields, Strong's prefix counts, and whether a token-level `lemma` or `lemmaId` appears in the live payload.

## Interpretation safeguards

- Language is counted only from each token's explicit `language` field. Strong's prefixes are reported separately and are not used to infer language.
- A Strong's number is not an independently verified mapping to BDB or Abbott-Smith.
- The separate STEPBible lexicon response must remain attributed to STEPBible; it must not be treated as independent proof of a Strong's-to-BDB mapping.
- Missing `lemma`/`lemmaId` is consistent with the currently published HelloAO `InterlinearWord` schema. If a future payload adds either field, inspect its documentation and provenance before relying on it.
- A non-zero exit code means at least one requested passage could not be retrieved or did not match the expected response shape. Preserve the error details and investigate before interpreting partial results.

## Scope

This is a schema/coverage spot check, not a chapter-by-chapter lexical ingestion task. Do not add lemma mappings, change the current interlinear model, or replace existing lexicon/morphology providers based solely on this report. Existing IBS functionality remains unchanged.

No Open Scriptures material or derivatives are permitted in this project.
