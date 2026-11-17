export function buildComparisonPassageImport(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('A Scripture comparison result is required.');
  }
  const reference = typeof result.reference === 'string' ? result.reference.trim() : '';
  const text = typeof result.text === 'string' ? result.text.trim() : '';
  const source = typeof result.source === 'string' ? result.source.trim() : '';
  if (!reference) throw new TypeError('The comparison result must include a Scripture reference.');
  if (!text) throw new TypeError('The comparison result must include Scripture text.');
  return {
    reference,
    context: [text, source ? 'Text source: ' + source : ''].filter(Boolean).join('\n\n')
  };
}
