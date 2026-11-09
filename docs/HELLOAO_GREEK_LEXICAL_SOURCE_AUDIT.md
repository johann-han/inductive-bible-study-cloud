# HelloAO Greek Missing-Gloss Audit: Abbott-Smith and Strong's Provenance

**Status:** read-only source audit; no Bible records or glosses changed  
**Scope:** high-frequency Greek Strong's groups among the 2,411 missing-gloss records outside the four dominant function-word parsing categories  
**Audit date:** 2026-11-09

## Purpose

This document records what can and cannot be established from Abbott-Smith's *A Manual Greek Lexicon of the New Testament* and the original Strong's numbering scheme. It is not a gloss-recovery file and does not authorize automatic gloss insertion.

## Source provenance

### Abbott-Smith

- Work: George Abbott-Smith, *A Manual Greek Lexicon of the New Testament*, 1922.
- Original scan/catalogue: https://archive.org/details/manualgreeklexic00abborich
- Scanned copy and public-domain status: https://commons.wikimedia.org/wiki/File:A_manual_Greek_lexicon_of_the_New_Testament_(IA_manualgreeklexic00abborich).pdf
- TEI digitisation project: https://github.com/translatable-exegetical-tools/Abbott-Smith
- The digitisation project states that the marked-up lexicon is public domain, and warns against using the raw OCR working file; use a release instead.
- The TEI contributor instructions specify that each entry's `@n` identifier contains the Greek lemma followed by one or more Strong's numbers separated by pipes. Those Strong's identifiers are therefore digital editorial metadata, not proof that the printed 1922 book itself contained Strong's numbers.

### Strong's numbering

- Work: James Strong, *A Concise Dictionary of the Words in the Greek Testament*, part of *The Exhaustive Concordance*, 1890.
- Text transcription consulted for this preliminary cross-check: https://vbsa.ca/wp-content/uploads/2016/07/StrongGreekConcordance.pdf
- The 1890 dictionary explains that original Greek words are numbered and that each number identifies a Greek entry. The number-to-headword association can therefore be checked independently of Abbott-Smith's TEI markup.
- Final page-image verification against the 1890 scan remains outstanding; this audit records a text-level cross-check, not a completed facsimile collation.

### Mapping-file distinction

The Abbott-Smith repository's `gnt2asLookups.js` describes itself as MorphGNT lookups in Abbott-Smith. It maps MorphGNT Greek lemmas to Abbott-Smith headwords. It does **not** document the process by which Strong's numbers were attached to the TEI entries. It must not be treated as the provenance for those Strong's identifiers.

## Preliminary high-frequency cross-check

The following nine Strong's identifiers were selected from the Greek full-population missing-gloss ranking. The Strong's 1890 text transcription gives the listed Greek headword, and the Abbott-Smith v0.11 TEI release contains the corresponding entry/identifier association.

| Strong's | Strong's 1890 headword | Abbott-Smith TEI entry | Preliminary result |
|---|---|---|---|
| G0846 | αὐτός | `αὐτός|G846` | Headword agreement |
| G3739 | ὅς | `ὅς|G3739` | Headword agreement |
| G1510 | εἰμί | `εἰμί|...|G1510|...` | Headword included in grouped entry |
| G3778 | οὗτος | `οὗτος|G3778` | Headword agreement |
| G3004 | λέγω | `λέγω|G2046|G3004|G4483|G2343` | Headword included in grouped entry |
| G4771 | σύ | `σύ|G4771` | Headword agreement |
| G3956 | πᾶς | `πᾶς|G3956` | Headword agreement |
| G1096 | γίνομαι | `γίνομαι|G1096` | Headword agreement |
| G2192 | ἔχω | `ἔχω|G2192` | Headword agreement |

This is a preliminary cross-source check of the number-to-headword association and the existence of an Abbott-Smith entry. It is not a token-level lemma validation for every HelloAO word carrying that Strong's number. In particular, Abbott-Smith groups several Strong's numbers under some headwords; that grouping must be preserved and not flattened into a one-number/one-token assumption.

## What this establishes

1. Abbott-Smith is a viable public-domain source candidate for consulting Greek headwords and lexical descriptions, subject to jurisdictional review and page-level source checking.
2. Strong's 1890 dictionary provides a separate historical source for checking Strong's number-to-Greek-headword associations.
3. For the nine high-frequency groups listed above, the preliminary text-level comparison shows agreement between Strong's headwords and the Abbott-Smith TEI entry headwords.
4. The Abbott-Smith TEI Strong's annotations are editorial metadata; their provenance should be described accurately rather than attributed to the printed lexicon.

## What this does not establish

- It does not prove that every HelloAO token assigned one of these Strong's numbers has been assigned correctly.
- It does not establish a unique lemma for every inflected Greek surface form.
- It does not prove that a missing gloss is accidental rather than intentionally omitted.
- It does not authorise copying an entire lexicon entry into a word-level gloss field.
- It does not establish that Strong's dictionary glosses are suitable as context-sensitive translations.
- It does not validate any Hebrew or Aramaic mapping.

## Required next checks

1. Collate the nine Strong's entries against page images of the original 1890 Strong dictionary.
2. Collate the corresponding Abbott-Smith headwords and lexical content against the 1922 scan, recording printed page numbers.
3. Validate each candidate token-to-lemma association independently; do not infer lemma identity from morphology category or from a Strong's number alone.
4. Review the remaining 2,411 records by frequency and parsing category, keeping grammatical words separate from lexical words.
5. Record intentional omissions, uncertain mappings, and true missing lexical data as distinct outcomes.

## Non-negotiable safeguards

- No glosses are generated or inserted by this audit.
- No application runtime, Bible source records, lexicons, mappings, or Supabase records are modified.
- No Open Scriptures data, lexicons, mappings, APIs, mirrors, derivatives, or repackagings are used.
- Any future gloss-recovery proposal must retain source attribution, licensing, original headword, mapping evidence, and human-review status.
