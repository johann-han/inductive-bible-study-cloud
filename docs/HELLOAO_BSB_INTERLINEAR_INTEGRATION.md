# HelloAO BSB Interlinear Integration

## Scope

The Bible Reader continues to load and display the Berean Standard Bible (BSB) from the existing HelloAO translation endpoint. The BSB interlinear is an optional research-data layer loaded separately for the same book and chapter.

The integration does not replace the existing KJV word annotations, Strong's lexicon lookup, Hebrew/Aramaic/Greek morphology audit, TAHOT data, study records, or cross-reference sources.

## Data flow

1. Load BSB chapter text from `/api/BSB/{BOOK}/{CHAPTER}.simple.json`.
2. Load the supplementary interlinear chapter from `/api/d/bsb-interlinear/{BOOK}/{CHAPTER}.json`.
3. Match interlinear words to BSB verse text in ascending `bsbPos` order using the supplied BSB gloss.
4. Create source-offset annotations only for non-empty glosses with a valid Strong's identifier and a conservative phrase match.
5. Render the English phrase and Strong's number through the existing word-level annotation renderer.
6. Preserve original-language text, transliteration, and parsing in annotation metadata; these are exposed in the word's title tooltip.
7. If interlinear retrieval or matching fails, retain the BSB verse text and show it without Strong's annotations. Never infer or fabricate a Strong's number.

## Matching safeguards

- Uses `bsbPos` (BSB English order), not original-language `pos`, to align glosses to English text.
- Uses whole-phrase, case-insensitive matching with word boundaries.
- Advances a cursor after each match to prevent overlapping or reusing the same text.
- Skips null Strong's values, empty glosses, malformed identifiers, and glosses that cannot be found.
- Does not fall back to the legacy word-map guessing path for unannotated BSB text.
- KJV continues to use its own exact-source word offsets and is not modified by this integration.

Phrase matching is intentionally conservative, but it is not a substitute for a reviewed alignment audit. Repeated English glosses and translation-specific phrase differences can still cause omissions or ambiguous matches. Do not treat missing annotations as evidence that the original-language word is absent.

## Files

- `js/helloao-bsb-interlinear.js`: browser/Node-compatible normalization and alignment helper.
- `tests/helloao-bsb-interlinear.test.js`: Node built-in test coverage.
- `index.html`: loads the helper and requests BSB interlinear data alongside BSB chapter text.

## Tests

Run:

```bash
npm test
```

The repository's `node --test` script automatically discovers the integration tests under `tests/`.

## Attribution and licensing

The HelloAO dataset catalogue identifies the Berean Standard Bible interlinear tables as public domain. Strong's lexicon data is derived from STEPBible / Tyndale House, Cambridge and is licensed under CC BY 4.0. Any public-facing source/credits documentation should retain that attribution and identify modifications. See:

- https://bible.helloao.org/docs/reference/datasets/
- https://berean.bible/terms.htm
- https://creativecommons.org/licenses/by/4.0/

## Remaining verification before merge

- Run the full repository test suite and inspect the GitHub checks.
- Verify Genesis 1 and representative New Testament chapters in the live UI.
- Confirm the BSB text remains readable if the interlinear endpoint is unavailable.
- Confirm KJV annotations remain unchanged.
- Compare representative Hebrew, Aramaic, and Greek entries against the existing morphology datasets and TAHOT alignment before expanding the feature.
- Do not merge until the CI checks are green.
