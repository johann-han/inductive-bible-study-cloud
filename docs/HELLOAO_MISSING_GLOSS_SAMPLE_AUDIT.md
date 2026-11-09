# HelloAO Missing-Gloss Sample Audit

## Purpose

Inspect actual published BSB interlinear word records whose `gloss` field is absent, null or empty. Aggregate counts reveal the scale of the omissions; the record-level sample helps inspect individual examples.

## Scope and safeguards

- Read-only requests to the HelloAO `bsb-interlinear` dataset.
- Scans all chapters listed by the dataset metadata.
- Produces an exact full-population summary for successfully retrieved missing-gloss records, including language totals, Greek Strong's occurrence counts, Greek morphology counts, and associated book/text examples.
- Also samples records separately by explicit language (Hebrew, Aramaic and Greek) and book.
- Keeps at most 12 deterministically selected records per book/language stratum.
- Preserves source values for passage, positions, language, text, transliteration, parsing, parsingFull, Strong's and gloss.
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

The process exits non-zero if any chapter fails. Review `coverage` and `failures` before interpreting the report. `fullPopulationSummary` aggregates every missing-gloss record from successfully retrieved chapters; `sampling.records` contains the capped sample, not every record.

## Interpreting the Greek summary

- `fullPopulationSummary.greekStrongEntries` lists each Greek Strong's value represented among missing-gloss records, sorted by occurrence count. It includes morphology counts and book/text examples to support source verification.
- `fullPopulationSummary.greekParsingFullCounts` gives the exact morphology distribution for those records.
- `fullPopulationSummary.greekBeyondCoreFunctionWords` separately aggregates records whose `parsingFull` is not Article, Conjunction, Adverb or Preposition. Its `strongEntries` retain occurrence counts, morphology, books and representative source text for prioritising manual lexical review.
- This separation is a triage aid only: morphology labels do not establish lexical meaning, lemma identity or the correctness of a Strong's-to-lemma mapping.
- `fullPopulationSummary.byLanguage` distinguishes records with and without Strong's identifiers.
- A Strong's identifier is an index for investigation, not proof that a separate lexicon's entry is the correct gloss for every token.
- Treat patterns as hypotheses requiring source-level verification. A missing gloss is not automatically a defect, and no missing value should be filled from another lexicon without an independently verified mapping and attribution.
