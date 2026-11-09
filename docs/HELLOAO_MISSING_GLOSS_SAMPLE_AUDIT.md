# HelloAO Missing-Gloss Sample Audit

## Purpose

Inspect actual published BSB interlinear word records whose `gloss` field is absent, null or empty. The global audit found substantial missing-gloss counts, but aggregate counts alone cannot explain why those fields are absent.

## Scope and safeguards

- Read-only requests to the HelloAO `bsb-interlinear` dataset.
- Scans all chapters listed by the dataset metadata.
- Samples records separately by explicit language (Hebrew, Aramaic and Greek) and book.
- Keeps at most 12 deterministically selected records per book/language stratum.
- Preserves the source values for passage, positions, language, text, transliteration, parsing, parsingFull, Strong's and gloss.
- Does not infer, fill, normalize or repair any source field.
- Does not modify application code, Bible text, morphology, lexicons, mappings or Supabase.
- Does not use Open Scriptures data or derivatives.

## Run

```sh
node scripts/sample-helloao-missing-gloss.mjs > helloao-missing-gloss-sample.json
```

On Windows PowerShell, use:

```powershell
cmd /c "node scripts/sample-helloao-missing-gloss.mjs > helloao-missing-gloss-sample.json"
Test-Path .\helloao-missing-gloss-sample.json
```

Optional environment variables: `HELLOAO_API_BASE`, `HELLOAO_CONCURRENCY` (default 4), `HELLOAO_RETRIES` (default 2), and `HELLOAO_TIMEOUT_MS` (default 30000).

The process exits non-zero if any chapter fails. Review `coverage` and `failures` before interpreting the sample. Counts in `missingGlossCountsByLanguage` cover successfully retrieved chapters; `records` contains the capped sample, not every missing-gloss record.

## Interpretation

Review samples for recurring patterns in text, transliteration, morphology and Strong's presence. Treat any pattern as a hypothesis requiring source-level verification. A missing gloss is not automatically a defect, and no missing value should be filled from another lexicon without an independently verified mapping and attribution.
