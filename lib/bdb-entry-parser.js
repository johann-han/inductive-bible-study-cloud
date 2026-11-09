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

function parseBdbEntryJson(entryId, json) {
  const id = String(entryId || '').trim().toUpperCase();
  if (!/^BDB\d+$/.test(id)) return null;
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return {
    entryId: id,
    lemma: String(data.head_word || '').trim(),
    partOfSpeech: String(data.pos || '').trim(),
    primaryGloss: String(data.primary || '').trim(),
    description: String(data.description || '').trim(),
    senses: Array.isArray(data.senses) ? data.senses.map(sense => ({
      number: Number.isInteger(sense && sense.number) ? sense.number : null,
      primary: String(sense && sense.primary || '').trim(),
      description: String(sense && sense.description || '').trim()
    })) : []
  };
}

function parseBdbMappingCsv(csv) {
  const lines = String(csv || '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parseRow = line => {
    const fields = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) {
        fields.push(value); value = '';
      } else value += char;
    }
    fields.push(value);
    return fields;
  };
  const header = parseRow(lines[0]).map(value => value.trim().toLowerCase());
  const entryIndex = header.indexOf('bdb');
  const strongsIndex = header.indexOf('strongs');
  const lemmaIndex = header.indexOf('lemmaguess');
  if (entryIndex < 0 || strongsIndex < 0 || lemmaIndex < 0) return [];
  return lines.slice(1).map(parseRow).map(fields => ({
    entryId: String(fields[entryIndex] || '').trim().toUpperCase(),
    strongsId: normalizeBdbStrongs(fields[strongsIndex]),
    lemmaGuess: String(fields[lemmaIndex] || '').normalize('NFC').trim(),
    classification: 'unverified-reference'
  })).filter(row => /^BDB\d+$/.test(row.entryId) && row.strongsId && row.lemmaGuess);
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
    needsEditorialCheck: /<checkingNeeded\s*\/?\s*>/i.test(source)
  };
}

module.exports = Object.freeze({
  decodeHtmlText,
  normalizeBdbStrongs,
  parseBdbEntryHtml,
  parseBdbEntryJson,
  parseBdbMappingCsv
});
