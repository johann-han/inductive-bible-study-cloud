# IBS Lexicon Source Audit and Upgrade Plan

## Purpose

Upgrade the Strong's word-study modal from a single short lexicon feed to a layered, source-labelled lexical reference. Preserve the existing Strong's identifiers, original-language interlinear data, morphology, TAHOT alignment, study notes, and saved studies.

This is an audit and implementation plan. It does not authorize replacing data until each source has passed format, coverage, alignment, quality, and licensing checks. Project source restriction: Open Scriptures material is explicitly excluded; see the source exclusion section.

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

### Hebrew: BDB Enhanced with an independently verified Strong's mapping

Primary source candidate: Brown–Driver–Briggs (BDB), using the unfoldingWord BDB Enhanced entries for richer sense and stem structure. Strong's-to-BDB mappings must be derived only from the BDB Enhanced project's own documented mapping data or independently verified against its primary entry records. No Open Scriptures mapping, index, corpus, API, or derivative is permitted.

Why this pairing:
- BDB is a fuller scholarly Hebrew lexicon than a brief Strong's gloss.
- The BDB text is public domain; enhancements in the unfoldingWord dataset are CC BY 4.0 and require a link to that repository.

Sources:
- https://github.com/unfoldingWord/Brown-Driver-Briggs-Enhanced

Implementation caution:
- Do not assume Strong's numbers and BDB headwords are one-to-one. Audit the BDB Enhanced project's own mapping file and confirm every mapping against the actual BDB entry; retain multiple mappings only when supported by the entry data.
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
   - Hebrew: independently verified BDB Enhanced Strong's mapping -> BDB Enhanced entry.
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
- [ ] Parse BDB Enhanced data and its own documented mapping into a reproducible local format; do not ingest Open Scriptures data.
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

## Explicit source exclusion

Open Scriptures is prohibited as a source for this project. Do not use, import, link, cite as a data provider, or depend on its scripture resources, lexicons, indexes, mappings, APIs, datasets, or derivative datasets. This exclusion applies even if a particular file is described as public domain or openly licensed. Do not substitute a mirror or repackaging of Open Scriptures material under another provider name. If a candidate dataset's provenance is uncertain, pause and verify its origin before considering it.

## Non-goals

- Do not replace or rewrite existing morphology datasets.
- Do not change Strong's word-level alignment or fabricate Strong's IDs.
- Do not replace Bible translation text providers as part of this lexicon task.
- Do not remove STEPBible until the replacement sources have passed the coverage and regression checks.
- Do not modify `main` directly; use a feature branch and PR.


## Follow-up data and provenance audit (9 November 2026)

### BDB Enhanced: source structure and mapping caution

The upstream BDB Enhanced repository documents that:
- The base lexicon data was taken from `eliranwong/unabridged-BDB-Hebrew-lexicon`.
- Its own enhancement work marks sense/stem boundaries, primary and secondary glosses, subsenses, and related typographic distinctions.
- Individual entry HTML files are intended for quality assurance.
- The original BDB is public domain; repository enhancements are CC BY and require a link to the repository.
- Some ancient-language material remains image placeholders rather than Unicode transcription.

The repository's `bdbToStrongsMapping.csv` must **not** be treated as a direct one-to-one Strong's-to-entry table. It records Strong's references occurring in entry material, including secondary/cross-reference numbers. A check of the raw file found 10,636 rows, 8,619 distinct Strong's IDs, and many Strong's IDs associated with more than one BDB article. For example, H0430 appears in BDB430 (the Elohim article), but also in articles whose primary headwords are Yahweh and halal. Those additional appearances are references, not independent H0430 headword definitions.

Verified sample entry headings:
- BDB430 identifies H430 and its headword אֱלֹהִים.
- BDB108 identifies H120 and H121 under the single headword אָדָם.
- BDB1300 and BDB1303 both identify H1254 but represent distinct homonymous entries (create / be fat).
- BDB2100's primary headword is יהוה and its heading also contains Strong's references such as H430; this demonstrates why all numbers in the mapping CSV cannot be treated as primary mappings.

**Required ingestion rule:** parse each individual BDB entry's own heading and lexical headword, language, and article structure. Treat the CSV as a discovery/cross-reference aid only. Verify each Strong's mapping against the actual entry headword and the word's verified lemma/language from IBS data. Preserve genuine homonyms as separate entries. Do not collapse multiple BDB articles into one definition or map a Strong's ID solely because it occurs anywhere in an article.

Primary source:
- https://github.com/unfoldingWord/Brown-Driver-Briggs-Enhanced
- Base dataset provenance: https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon

### Greek: Abbott-Smith quality gate and supplementary candidates

Abbott-Smith remains a strong candidate for a substantial New Testament Greek lexicon, and its TEI text/markup is declared public domain by its project. However, the project history also warns that errors may remain and that only a small portion of the printed pages had been checked in its earlier completion notes. The project has a 1.1 release with minor corrections. Therefore:
- Pin a release, not the mutable repository head.
- Parse the release TEI and compare representative entries against scans or reliable printed copies before using it as an authoritative primary display.
- Preserve entry divisions, etymology, related entries, and references.
- Do not treat an automated TEI parse as proof that every entry is error-free.

Primary source candidate:
- https://github.com/translatable-exegetical-tools/Abbott-Smith
- https://translatable-exegetical-tools.github.io/Abbott-Smith/

Additional Strong's-keyed Greek candidates for comparison:
- **Thayer's Greek-English Lexicon (1889):** a full public-domain work with 5,521 Strong's-keyed entries in a community digitization. Its own README warns that transcription artifacts may remain. Use only after spot-checking against a reliable scan; do not assume the community digitization is error-free. https://github.com/imbennyhim/Every-Promise-Thayers
- **Dodson Greek Lexicon:** public-domain XML/CSV, Strong's keyed, but intentionally concise and therefore a supplementary quick-gloss source rather than a replacement for a full lexicon. Its CSV includes Greek headword, Strong's number, brief gloss, and longer gloss. https://github.com/biblicalhumanities/Dodson-Greek-Lexicon

Recommended Greek display model after verification: Abbott-Smith as the detailed lemma-based resource; Thayer as a Strong's-keyed supplementary reference after transcription QA; Dodson as an optional concise gloss. Keep each source distinct and credited. Do not merge their definitions into one synthetic paragraph.

### Aramaic: CAL scope and limits

The Comprehensive Aramaic Lexicon (CAL), hosted by Hebrew Union College, describes itself as an ongoing text base covering Aramaic dialects from the earliest period through the 13th century CE, with over 40,000 headwords and millions of lexically parsed words. CAL explicitly says it is a work in progress, not a completed dictionary. The CAL data files published through IDS are CC BY 4.0.

This makes CAL a valuable specialist supplementary resource, but not a ready-made Strong's-keyed Biblical Aramaic lexicon. Before integration:
- Confirm which CAL dictionary and headword records cover Biblical Aramaic in Daniel and Ezra.
- Establish a documented lemma/orthographic mapping from IBS interlinear data to CAL headwords.
- Do not map by English gloss or Strong's number alone.
- Keep CAL corpus attestations and dictionary definitions distinct.
- Show the retrieval date because CAL is an ongoing resource.
- Preserve IDS/CAL attribution and CC BY 4.0 terms.

Sources:
- https://cal.huc.edu/
- https://ids.clld.org/contributors/comprehensivearamaiclexicondatafiles

### Revised recommendation

- **Hebrew:** BDB Enhanced, with entry-level headword/language validation; its CSV is not a direct mapping authority.
- **Biblical Aramaic:** BDB's explicitly labelled Biblical Aramaic entries first; CAL as a separately identified corpus/lexical supplement after lemma mapping and coverage checks.
- **Greek:** Abbott-Smith as the detailed candidate subject to TEI QA; compare Thayer as a Strong's-keyed supplement and Dodson as a concise gloss source.
- **Existing STEPBible:** retain as a clearly labelled secondary source during migration until each language/source has measured coverage and passed verification.

No source listed here is permitted to import Open Scriptures material or derivatives. All source files and dependencies must have independently verified provenance.
