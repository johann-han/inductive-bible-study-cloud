# IBS Lexicon Source Audit and Upgrade Plan

## Purpose

Upgrade the Strong's word-study modal from a single short lexicon feed to a layered, source-labelled lexical reference. Preserve the existing Strong's identifiers, original-language interlinear data, morphology, TAHOT alignment, study notes, and saved studies.

This is an audit and implementation plan. It does not authorize replacing data until each source has passed format, coverage, alignment, quality, and licensing checks.

## Findings in the current application

The current production entry point is the root `index.html`.

- `fetchStrongsDataFromDB()` requests `/api/d/stepbible-lexicon/lexicon/{id}.json` from HelloAO.
- The API supplies STEPBible Brief Lexicon senses for Hebrew, Aramaic, and Greek.
- The lookup normalizes Strong's IDs and stores results in a session cache.
- A small embedded SQLite sample is the offline fallback. It is not a comprehensive scholarly lexicon.
- The modal currently displays `entry.usage` and then appends `entry.source` in the same paragraph. The STEPBible result puts a full attribution in both fields, which is why the user sees two nearly identical source notices.
- The modal has fixed STEPBible wording in its source link and footer. These must become provider-neutral and source-specific.
- The BSB interlinear data and KJV Strong's word annotations are separate from this lexicon lookup and must remain untouched by the lexicon upgrade.

## Recommended source architecture

### Hebrew: BDB Enhanced, connected through Open Scriptures

Primary source candidate: Brown–Driver–Briggs (BDB), using the unfoldingWord BDB Enhanced entries for richer sense and stem structure, with the Open Scriptures Hebrew Lexicon's `LexicalIndex.xml` as the Strong's-to-lexical-entry bridge.

Why this pairing:
- BDB is a fuller scholarly Hebrew lexicon than a brief Strong's gloss.
- The Open Scriptures lexical index explicitly connects BDB entries and Strong's numbers.
- The Open Scriptures project describes its index as the bridge between Strong's accessibility and BDB's fuller treatment.
- Open Scriptures data is CC BY 4.0; attribution to the Open Scriptures Hebrew Bible Project is required.
- The BDB text is public domain; enhancements in the unfoldingWord dataset are CC BY 4.0 and require a link to that repository.

Sources:
- https://github.com/openscriptures/HebrewLexicon
- https://github.com/unfoldingWord/Brown-Driver-Briggs-Enhanced

Implementation caution:
- Do not assume Strong's numbers and BDB headwords are one-to-one. Follow the supplied lexical index/mapping and retain multiple mappings where the data supports them.
- Preserve sense boundaries, stem labels, subsenses, and source cross-references when available.
- The Enhanced repository contains placeholder images for some ancient-language material; do not represent those image-only fields as searchable Unicode text.
- Evaluate the BibleAquifer JSON/Markdown BDB edition as an alternative ingestion format, but inspect its documented provenance and known transcription limitations before selecting it as the canonical source.

### Greek: Abbott-Smith, with lemma-based lookup

Primary source candidate: G. Abbott-Smith, *A Manual Greek Lexicon of the New Testament* (1922), using the completed TEI dataset.

Why:
- It is a dedicated New Testament Greek lexicon, not merely a brief Strong's definition list.
- Its TEI project reports the marked-up work complete and its source text/markup as public domain.
- It contains entry-level lexical material suitable for preserving etymology, definitions, and related-entry information.

Sources:
- https://github.com/translatable-exegetical-tools/Abbott-Smith
- https://translatable-exegetical-tools.github.io/Abbott-Smith/

Implementation caution:
- Abbott-Smith is keyed by Greek lemmas, not a guaranteed direct Strong's-number API.
- Resolve a Strong's lookup through verified Greek lemma data available in the relevant interlinear/word record, then look up the Abbott-Smith lemma.
- Do not infer a Greek lemma from an English gloss or assume one Strong's ID always maps to exactly one lexical headword.
- The TEI XML should be parsed/normalized into a small indexed dataset during build or ingestion; do not download and parse the full multi-megabyte XML on every word click.
- Keep the source lemma visible and make ambiguous/missing lemma matches explicit.

### Aramaic: BDB Aramaic coverage first; specialist source as a separately identified supplement

BDB includes Biblical Aramaic material and is the first source to test for Strong's-linked Aramaic entries. Do not label every H-number as Hebrew: language must come from the actual word/interlinear record or verified lexical metadata.

A specialist Aramaic corpus such as the Comprehensive Aramaic Lexicon may be useful as an advanced supplementary resource, but its wider corpus scope and its own data/licensing conditions must be audited before integration. It should not be presented as a drop-in Strong's dictionary.

Source:
- https://cal.huc.edu/

For any Strong's number whose language cannot be established reliably, retain the existing verified fallback and label the language/source uncertainty rather than guessing.

### Existing STEPBible data: retain as a secondary source during migration

Do not delete the HelloAO STEPBible Brief Lexicon integration immediately. Keep it available as a clearly labelled secondary/legacy entry while coverage and mappings are audited. It may be useful for entries absent from a selected primary lexicon.

Source:
- https://bible.helloao.org/docs/reference/datasets/
- https://creativecommons.org/licenses/by/4.0/

## Proposed lookup behaviour

1. Receive a validated Strong's ID and any verified word-level context (language, lemma, transliteration, morphology, passage).
2. Resolve the language from reliable metadata. Never infer language from the H/G prefix alone when Aramaic/Hebrew distinctions are material.
3. Query the language-appropriate primary lexicon:
   - Hebrew: Open Scriptures lexical index -> BDB Enhanced entry.
   - Biblical Aramaic: verified Aramaic BDB entry; specialist Aramaic resource only when a sound mapping exists.
   - Greek: verified Greek lemma -> Abbott-Smith entry.
4. If the primary source has no verified match, query the secondary STEPBible brief entry and label it as secondary.
5. If neither source returns a verified entry, show an unavailable state. Never synthesize a scholarly definition.
6. Preserve all source fields and source URLs in the normalized result.
7. Cache by source + lexical entry ID (and language), not Strong's ID alone, because a Strong's ID can have multiple lexical mappings.
8. Keep original-language morphology/parsing separate from dictionary part of speech. A lexicon's general POS must not overwrite the inflected form's morphology.

## Modal and attribution changes required

- Make the interface provider-neutral: remove fixed "STEPBible Lexicon" and "Open STEPBible source record" wording where the active provider may differ.
- Show the selected source name, edition, licence, and a direct source link once.
- Separate a short contextual usage note from the attribution. The current code concatenates `entry.usage` and `entry.source`; both STEPBible values contain attribution, causing duplicated credit. Attribution must be rendered from one normalized source-metadata object.
- Show multiple available lexical sources as distinct entries/tabs or clearly separated sections, never silently merge their definitions.
- Include an explicit note that a lexicon describes attested lexical senses; passage meaning must still be established from grammar, discourse, and immediate/literary context.
- Ensure Copy Lexicon Entry to Notes includes the source and licence attribution for every copied definition.
- Keep the original Strong's number visible, but identify the lexicon's own headword/entry ID separately.

## Audit and acceptance checklist before data integration

- [ ] Confirm source file versions/commits and record pinned upstream revisions.
- [ ] Parse BDB Enhanced and Open Scriptures XML/index into a reproducible local format.
- [ ] Measure Strong's-to-BDB mapping coverage, including multiple mappings and unmapped entries.
- [ ] Verify representative Hebrew entries (e.g. H0430, H0120, H0121) against upstream source records.
- [ ] Verify Biblical Aramaic entries from Daniel and Ezra separately from Hebrew entries.
- [ ] Parse Abbott-Smith TEI and build a lemma index.
- [ ] Measure Greek interlinear lemma coverage and Strong's-to-lemma ambiguity; inspect representative entries (e.g. G0026, G2316, G3056).
- [ ] Verify diacritics, Unicode normalization, right-to-left text, and safe rendering of markup.
- [ ] Preserve entry divisions, senses, sub-senses, etymology, and cross-references where source data provides them.
- [ ] Record attribution/licensing per dataset and include it in the app and documentation.
- [ ] Add automated tests for normalization, mappings, ambiguous entries, missing entries, source fallback, and attribution uniqueness.
- [ ] Confirm KJV annotations, BSB interlinear annotations, morphology, TAHOT alignment, saved studies, and notes remain unchanged.
- [ ] Run the complete repository test suite and require green CI before merge.
- [ ] Verify the deployed modal in Genesis 1, Daniel 2, Matthew 1, and John 1.

## Non-goals

- Do not replace or rewrite existing morphology datasets.
- Do not change Strong's word-level alignment or fabricate Strong's IDs.
- Do not replace Bible translation text providers as part of this lexicon task.
- Do not remove STEPBible until the replacement sources have passed the coverage and regression checks.
- Do not modify `main` directly; use a feature branch and PR.
