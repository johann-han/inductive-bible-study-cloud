export function buildWordStudyEvidenceDraft(record) {
  if (!record || typeof record !== 'object' || !record.reference || !record.strongsId) {
    throw new TypeError('A saved word study record is required.');
  }
  const reference = record.reference;
  const passage = reference.book + ' ' + reference.chapter + ':' + reference.verse;
  const occurrence = Number.isInteger(record.wordStart) && Number.isInteger(record.wordEnd)
    ? 'Word offsets in source verse: ' + record.wordStart + '–' + record.wordEnd
    : '';
  const detail = [
    'Saved word study · source occurrence',
    'Selected English rendering: ' + (record.englishWord || 'Not supplied'),
    'Scripture occurrence: ' + passage + ' · ' + reference.translation,
    'Strong’s number: ' + record.strongsId,
    'Lemma: ' + (record.lemma || 'Not supplied'),
    'Transliteration: ' + (record.transliteration || 'Not supplied'),
    'Part of speech: ' + (record.partOfSpeech || 'Not supplied'),
    'Original-language form: ' + (record.originalText || 'Not supplied'),
    'Language: ' + (record.language || 'Not supplied'),
    'Occurrence morphology: ' + (record.parsingFull || record.parsing || 'Not supplied'),
    'Lexicon gloss: ' + (record.gloss || 'Not supplied'),
    ...((record.senses || []).map((sense, index) =>
      'Sense ' + (index + 1) + ' — ' + sense.gloss + ': ' + sense.definition)),
    'Translation: ' + reference.translation,
    'Verse text: ' + (record.verseText || 'Not captured'),
    occurrence,
    record.notes ? 'Researcher’s contextual notes: ' + record.notes : ''
  ].filter(Boolean).join('\n');
  return {
    kind: 'Lexicon / Strong’s',
    reference: record.strongsId + ' · ' + passage + ' · ' + (record.englishWord || record.lemma),
    detail,
    source: record.source || 'Source not recorded',
    ...(record.sourceUrl ? { sourceUrl: record.sourceUrl } : {}),
    ...(record.strongsId ? { sourceId: record.strongsId } : {})
  };
}
