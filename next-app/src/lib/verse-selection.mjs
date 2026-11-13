export function toggleVerseSelection(current, verseNumber) {
  const selected = new Set(current);
  if (selected.has(verseNumber)) selected.delete(verseNumber);
  else selected.add(verseNumber);
  return [...selected].sort((a, b) => a - b);
}

export function selectVerseRange(anchorVerse, targetVerse) {
  const start = Math.min(anchorVerse, targetVerse);
  const end = Math.max(anchorVerse, targetVerse);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
