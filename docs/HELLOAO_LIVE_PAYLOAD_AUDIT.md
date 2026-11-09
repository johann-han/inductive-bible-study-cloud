# HelloAO global BSB interlinear audit

This read-only audit discovers the books and chapter ranges from the live BSB interlinear dataset, then requests every listed chapter. It does not save Bible content or change IBS runtime code, Supabase data, morphology providers, or lexicon mappings.

## Run

Requires Node.js 18 or later:

\`\`\`powershell
$env:HELLOAO_CONCURRENCY=4
$env:HELLOAO_RETRIES=2
$env:HELLOAO_TIMEOUT_MS=30000
node scripts/audit-helloao-interlinear.mjs
\`\`\`

The script defaults to four concurrent requests and two retries. It uses the dataset books endpoint to discover chapters dynamically.

The published dataset metadata currently documents 66 books, 1,189 chapters, 31,102 verses and 443,625 word records. The script reports the live metadata and compares its retrieved word count when the total is available.

## What it measures

- Chapter, verse and word coverage overall and per book.
- Hebrew, Aramaic and Greek counts from each word's explicit \`language\` field.
- Unknown language values.
- Presence/null counts for documented interlinear fields.
- Token-level \`lemma\` or \`lemmaId\` presence.
- Strong's prefixes, separately and cross-tabulated against explicit language.
- Repeated \`pos\` and \`bsbPos\` values within a verse as diagnostics.

## Safeguards

- Strong's prefixes are not used to infer language.
- Prefix-by-language counts are descriptive diagnostics, not proof of lexical mappings.
- The documented interlinear word schema does not include a lemma field.
- A Strong's number is not independently verified as a BDB or Abbott-Smith entry mapping by this audit.
- Repeated position values are flagged for review, not automatically classified as errors.
- No Open Scriptures material, data, mappings, derivatives or repackaging are used.

A non-zero exit code means at least one chapter failed or the audit did not cover every discovered chapter. Preserve the failure list and investigate before drawing corpus-wide conclusions.
