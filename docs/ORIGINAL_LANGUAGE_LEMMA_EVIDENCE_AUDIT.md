# Original-Language Lemma Evidence Audit

**Status:** research gate; no lexicon ingestion authorized by this document  
**Audit date:** 9 November 2026  
**Scope:** determine whether the existing BSB interlinear integration can independently validate lexical headwords for BDB Enhanced and Abbott-Smith.

## Executive finding

The existing BSB interlinear integration preserves useful token-level original-language evidence, but the fields currently consumed by the application do **not** establish a verified dictionary lemma.

The current annotation record retains:
- language
- text (the original-language token form)
- transliteration
- parsing and parsingFull
- strongs
- the BSB English gloss
- bsbPos (English translation order)
- pos (source/original-language order)

The integration uses bsbPos to align an English gloss phrase to BSB verse text. It does not use pos to identify a lexical headword. The text value is a token form from the verse, not proof of the uninflected lexicon lemma. Parsing may help explain morphology, but it cannot be silently treated as a lemma field.

The current application code and tests do not demonstrate that the API response provides a stable, explicit lemma field. Therefore, do not assume one exists or use a surface token as a dictionary headword without a separate verified normalization step.

## What the current integration proves

The implementation in js/helloao-bsb-interlinear.js:
1. Normalizes the supplied Strong's identifier.
2. orders tokens by bsbPos (with pos as a secondary sort key);
3. matches supplied English gloss phrases against BSB text;
4. retains the original token text, transliteration, parsing, language, Strong's ID, gloss, and positional metadata in the annotation object.

The test fixtures in tests/helloao-bsb-interlinear.test.js demonstrate these fields with representative Hebrew forms. They establish the shape the application currently consumes, not the complete upstream API schema or the correctness of every source mapping.

## What it does not prove

- A Strong's number on an interlinear token does not independently validate that same number's mapping to a BDB article; using it for that purpose would be circular.
- A surface form is not necessarily identical to its dictionary lemma. Prefixes, suffixes, inflection, spelling variants, and orthographic normalization can matter.
- Transliteration is not a unique lexical key.
- English glosses are not safe lemma identifiers.
- Hebrew and Biblical Aramaic must remain distinguishable by verified language metadata; the H prefix alone is not enough.
- pos and bsbPos are ordering/alignment values, not lexical identifiers.
- A successful English gloss alignment does not validate the original-language lemma or the BDB/Greek dictionary mapping.

## Evidence required before a lemma-based lookup can be implemented

For each token, the mapping pipeline must have:
1. The exact upstream dataset version or immutable revision and its documented provenance/licence.
2. An explicit lemma field supplied by the source, **or** a separately reviewed morphological normalization process that maps the surface form to a lemma.
3. Verified language identification (Hebrew, Biblical Aramaic, or Greek).
4. The original token form and parsing retained alongside the lemma, not overwritten by it.
5. A traceable evidence record connecting the token, lemma, language, source record, and lexical entry.
6. Ambiguity handling for homographs, multiple lexical entries, and uncertain normalization. Unresolved records must remain unresolved.

If the upstream payload contains a lemma field, inspect its exact semantics and coverage before adopting it. Do not infer semantics from the field name alone. If the payload does not contain a lemma, identify a source with explicit lemma annotations and independently audit its licence, provenance, language coverage, and alignment to the IBS verse records.

## BDB-specific validation rules

- The BDB Enhanced CSV is a discovery/reference aid only. Its rows are not verified primary mappings.
- HTML heading order is not evidence of a primary Strong's mapping.
- The BDB article's own headword, language, and lexical structure must be preserved.
- A Strong's ID may have multiple candidate article references; keep candidates distinct until the original-language evidence resolves them.
- Homonymous BDB articles must remain separate. For example, the two BDB articles for בָּרָא must not be merged just because both are associated with H1254.
- Biblical Aramaic records must not be classified as Hebrew solely because their identifier begins with H.

PR #173 corrected the parser so it exposes heading identifiers as references only and classifies CSV rows as unverified-reference. This audit retains that rule.

## Greek-specific validation rules

Abbott-Smith is lemma-based. A Strong's number alone is not a sufficient lookup key. The pipeline must obtain a verified Greek lemma from a reliable original-language record, retain the token form and parsing, and then query the pinned Abbott-Smith dataset. Ambiguous or missing lemma matches must not produce an invented dictionary result.

## Recommended next research step

Inspect the exact HelloAO BSB interlinear endpoint payload for a small, representative sample across:
- Hebrew (Genesis 1),
- Biblical Aramaic (Daniel 2 and Ezra),
- Greek (Matthew 1 and John 1).

Record the actual fields, field semantics, source revision, and any explicit lemma coverage. Do not infer missing values. Compare the source's lemma field, if present, against independent morphology/lexicon references. If no explicit lemma is supplied, evaluate a separate, provenance-verified lemma source and design a reviewed normalization layer before writing any dictionary ingestion code.

## Acceptance gate

No BDB or Abbott-Smith mapping implementation may proceed until:
- the source payload schema and provenance are documented;
- lemma and language semantics are verified;
- representative entries from all three language contexts are reviewed;
- ambiguous and homonymous cases have explicit expected outcomes;
- coverage and unresolved counts are measured globally, not chapter by chapter;
- tests demonstrate that missing or ambiguous evidence cannot silently create a lexical mapping;
- existing Strong's annotations, morphology, TAHOT, notes, studies, and Kerygma workflows remain unchanged.

## Existing integration references

- js/helloao-bsb-interlinear.js
- tests/helloao-bsb-interlinear.test.js
- docs/HELLOAO_BSB_INTERLINEAR_INTEGRATION.md
- docs/LEXICON_SOURCE_AUDIT_AND_UPGRADE_PLAN.md

No Open Scriptures material, derivative, mirror, mapping, API, or dataset is permitted as a source for this work.
