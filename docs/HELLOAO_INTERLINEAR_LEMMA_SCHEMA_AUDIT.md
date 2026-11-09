# HelloAO Interlinear and Lemma Schema Audit

**Audit date:** 9 November 2026  
**Status:** schema verified from the published Free Use Bible API documentation; live chapter payload spot-checks across all language groups remain outstanding.  
**Related:** PR #173, PR #174, and docs/ORIGINAL_LANGUAGE_LEMMA_EVIDENCE_AUDIT.md

## Executive finding

The published HelloAO API schema confirms that the BSB interlinear word record does **not** contain a dictionary lemma field.

The InterlinearWord record documents:
- pos
- bsbPos
- language (hebrew, aramaic, or greek)
- text (original-script word form, NFC-normalized)
- transliteration
- parsing
- parsingFull
- strongs
- gloss

There is no lemma or lemmaId field in this interface. The current IBS integration preserves the relevant fields and does not fabricate a lemma. This confirms the limitation identified in the earlier evidence audit.

## Important distinction: the separate STEPBible lexicon endpoint does contain lemmas

HelloAO publishes a separate stepbible-lexicon dataset. Its lexicon sense records contain:
- id (extended Strong's/sense ID)
- language
- lemma
- transliteration
- partOfSpeech
- gloss
- definition

A lexicon entry is retrieved by base Strong's number and can contain multiple senses. The API documentation's H1254 example contains two distinct senses (create and fatten), each with its own sense ID and lemma field.

This means the existing API can supply a lemma candidate through a separate lexicon lookup. It does **not** mean that the interlinear token itself supplies a lemma, nor does it independently verify the Strong's-to-BDB mapping.

The API documentation explicitly states that the Strong's numbers attached to BSB interlinear words are looked up in the stepbible-lexicon dataset. Therefore, using that same Strong's number to retrieve a STEPBible lemma and then treating the result as independent proof that the number maps to a particular BDB article would be circular.

## What can safely be used

1. The interlinear language value is explicit and distinguishes Hebrew, Aramaic, and Greek in the documented schema. Preserve it at token level.
2. text is the original-script token form, not the dictionary lemma.
3. parsing and parsingFull describe grammatical parsing; do not silently convert them into a lemma.
4. strongs is a source-provided identifier. Preserve it as source evidence, but do not treat it as independent verification of another Strong's-keyed resource.
5. A lemma from the separate STEPBible lexicon can be displayed as a STEPBible lemma, with its source and sense ID, or used as a candidate for subsequent independent checking. It must not be relabelled as a BDB or Abbott-Smith lemma without validation.
6. Preserve every sense separately. Do not collapse homonymous or polysemous senses into a single synthetic entry.

## BDB and Abbott-Smith implications

### BDB Enhanced

The BSB interlinear record plus the STEPBible lexicon lookup does not independently establish a BDB primary mapping. A BDB candidate must still be checked against:
- the BDB article's actual lexical headword and language;
- independently verified lemma evidence;
- the token's language and grammatical context;
- homonymous article divisions and ambiguous candidate mappings.

The BDB mapping CSV and HTML heading Strong's references remain discovery/reference aids only, as established in PR #173.

### Abbott-Smith

The STEPBible Greek lemma may be a useful candidate key for Abbott-Smith lookup, but it is not independent confirmation of the mapping. Before automated lookup:
- compare candidate lemmas with an independently sourced Greek morphology/lemma dataset or other documented source;
- verify spelling, accents, and Unicode normalization;
- retain the token form and parsing alongside the lemma;
- preserve multiple candidate lemmas and unresolved cases;
- pin and quality-check the Abbott-Smith TEI release.

### Biblical Aramaic

The interlinear schema explicitly includes language: aramaic. This is preferable to inferring language from an H-prefix Strong's identifier. Keep Aramaic words distinct from Hebrew throughout mapping, candidate selection, caching, and display. BDB's explicitly labelled Aramaic material and CAL must each be evaluated against independently verified Aramaic lemma evidence.

## Coverage and live-payload status

The API documentation identifies the BSB interlinear dataset as covering all 66 books, 1,189 chapters, 31,102 verses, and 443,625 word records. Its documented schema covers Hebrew, Aramaic, and Greek.

The documentation includes a Genesis 1 example and defines the generic chapter endpoint. This audit has verified the published schema and example, but has **not** yet captured and counted live endpoint records for Genesis 1, Daniel 2, Ezra, Matthew 1, and John 1. Do not report language-specific field coverage or actual lemma coverage from those chapters until those payloads are directly inspected.

Next verification should capture those five endpoint responses, count each language value, validate required fields and null rates, and record a retrieval date and dataset metadata. The purpose is schema/coverage verification, not chapter-by-chapter lexical ingestion.

## Provenance and licensing

The HelloAO documentation identifies the BSB interlinear tables as public domain and notes that Strong's numbers are looked up in the STEPBible lexicon. The separate STEPBible lexicon is attributed to STEPBible.org / Tyndale House, Cambridge and licensed CC BY 4.0; retain the attribution and note modifications.

References:
- https://bible.helloao.org/docs/reference/datasets/
- https://berean.bible/
- https://github.com/STEPBible/STEPBible-Data
- https://creativecommons.org/licenses/by/4.0/

## Decision

**Do not add a lemma field to the IBS interlinear annotation model by inference. Do not begin BDB or Abbott-Smith ingestion on the assumption that BSB interlinear words already contain lemmas.**

The safe next step is a read-only live-payload coverage audit, followed by a separate provenance-verified lemma source evaluation. Existing STEPBible lookup remains the secondary lexicon and may be used to show its own lemma/sense records with explicit attribution. It must not be used as circular proof for BDB mapping.

No Open Scriptures material, derivative, mirror, mapping, API, or dataset may be used at any stage.
