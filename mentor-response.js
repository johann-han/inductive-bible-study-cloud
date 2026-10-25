function removeNonConnectorEntries(answer) {
  if (typeof answer !== 'string' || !answer) return answer;

  const lines = answer.split('\n');
  let inLinkingWords = false;
  let removingEntry = false;
  const output = [];
  const headingPattern = /^\s{0,3}#{1,6}\s*([^#].*?)\s*#*\s*$/;
  const boldHeadingPattern = /^\s*\*\*([^*]+)\*\*\s*:?\s*$/;
  const numberedEntryPattern = /^\s*(?:[-*]\s*)?(?:\*\*)?\s*\d+[.)]\s*/;

  for (const line of lines) {
    const heading = line.match(headingPattern) || line.match(boldHeadingPattern);
    if (heading) {
      const headingName = heading[1].replace(/[*_]/g, '').replace(/:$/, '').trim().toLowerCase();
      if (inLinkingWords && headingName !== 'linking words') {
        inLinkingWords = false;
        removingEntry = false;
      } else if (headingName === 'linking words') {
        inLinkingWords = true;
        removingEntry = false;
      }
      if (!removingEntry) output.push(line);
      continue;
    }

    if (inLinkingWords && numberedEntryPattern.test(line)) {
      const entryTitle = line
        .replace(/^\s*(?:[-*]\s*)?/, '')
        .replace(/^\*\*/, '')
        .replace(/^\s*\d+[.)]\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/^[“”"'‘’*_\s]+/, '');
      removingEntry = /^not(?:\b|\s*["'”’*])/i.test(entryTitle);
      if (removingEntry) continue;
    } else if (removingEntry) {
      if (numberedEntryPattern.test(line)) removingEntry = false;
      else continue;
    }

    output.push(line);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = { removeNonConnectorEntries };
