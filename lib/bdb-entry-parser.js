'use strict';

function decodeHtmlText(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBdbStrongs(value) {
  const match = String(value || '').trim().toUpperCase().match(/^([HG])(\d{1,5})[A-Z]?$/);
  return match ? match[1] + match[2].padStart(4, '0') : null;
}

function parseBdbEntryHtml(html) {
  const source = String(html || '');
  if (!source) return null;

  const heading = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const entryMatch = heading && heading[1].match(/\b(BDB\d+)\b/i);
  if (!entryMatch) return null;

  const headingHtml = heading[1];
  const strongsMatches = [...headingHtml.matchAll(/onclick\s*=\s*["'][^"']*sn\(\s*["']?([HG]\d{1,5}[A-Z]?)["']?\s*\)/gi)];
  const headingStrongIds = [...new Set(strongsMatches.map(match => normalizeBdbStrongs(match[1])).filter(Boolean))];

  const languageMatch = source.match(/<language\b[^>]*>([\s\S]*?)<\/language>/i);
  const languageText = decodeHtmlText(languageMatch && languageMatch[1]).toLowerCase();
  const language = languageText.includes('aramaic')
    ? 'aramaic'
    : languageText.includes('hebrew')
      ? 'hebrew'
      : 'unknown';

  const firstParagraph = source.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const lexicalHtml = firstParagraph ? firstParagraph[1] : '';
  const lemmaMatch = lexicalHtml.match(/<(bdbheb|bdbarc)\b[^>]*>([\s\S]*?)<\/\1>/i);
  const posMatch = lexicalHtml.match(/<pos\b[^>]*>([\s\S]*?)<\/pos>/i);
  const glossMatch = lexicalHtml.match(/<primary\b[^>]*>([\s\S]*?)<\/primary>/i);

  return {
    entryId: entryMatch[1].toUpperCase(),
    language,
    lemma: decodeHtmlText(lemmaMatch && lemmaMatch[2]),
    partOfSpeech: decodeHtmlText(posMatch && posMatch[1]),
    primaryGloss: decodeHtmlText(glossMatch && glossMatch[1]),
    headingStrongIds,
    primaryStrongId: headingStrongIds[0] || null,
    additionalStrongIds: headingStrongIds.slice(1),
    needsEditorialCheck: /<checkingNeeded\s*\/?\s*>/i.test(source)
  };
}

module.exports = Object.freeze({
  decodeHtmlText,
  normalizeBdbStrongs,
  parseBdbEntryHtml
});
