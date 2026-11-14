import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  fetchBibleChapter,
  fetchStrongsLexicon,
  getBibleBook,
  getPreviewStageEvidence,
  getPreviewWrittenStages,
  listPreviewDraftEntries,
  readPreviewDrafts,
  readSavedPassage,
  summarizePreviewDraftEntries,
  writePreviewDrafts,
  writeSavedPassage
} from './lib/bible.mjs';
import type { BibleChapter, BibleTranslation, PreviewDraftEntry, PreviewDrafts, PreviewStudyDraft, StrongLexiconEntry, StudyStage, WordAnnotation } from './lib/bible.mjs';
import { readPreviewMarkup, SCRIPTURE_MARKUP_TYPES, toggleVerseMarkup, writePreviewMarkup } from './lib/scripture-markup.mjs';
import { readPreviewWordMarkup, toggleWordMarkup, writePreviewWordMarkup } from './lib/scripture-word-markup.mjs';
import type { WordMarkupRange } from './lib/scripture-word-markup.mjs';
import { addPreviewCrossReference, deletePreviewCrossReference, formatCrossReference, readPreviewCrossReferences, writePreviewCrossReferences } from './lib/cross-references.mjs';
import type { PreviewCrossReference } from './lib/cross-references.mjs';
import { selectVerseRange, toggleVerseSelection } from './lib/verse-selection.mjs';
import { loadStandardCrossReferences, STANDARD_XREF_SOURCE } from './lib/standard-cross-references.mjs';
import type { StandardCrossReferenceRow } from './lib/standard-cross-references.mjs';

type Stage = 'observe' | 'interpret' | 'doctrine' | 'apply';
const stages: { id: Stage; number: string; label: string; question: string; hint: string }[] = [
  { id: 'observe', number: '01', label: 'Observe', question: 'What does the passage say?', hint: 'Notice what is present before deciding what it means.' },
  { id: 'interpret', number: '02', label: 'Interpret', question: 'What does the passage mean?', hint: 'Use context, structure, words and the author’s flow of thought.' },
  { id: 'doctrine', number: '03', label: 'Doctrine', question: 'What does this teach about God and truth?', hint: 'Form theological conclusions from the meaning established in the text.' },
  { id: 'apply', number: '04', label: 'Discipleship', question: 'How should I respond?', hint: 'Move from the meaning of the passage to faithful, specific obedience.' }
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    back: 'M19 12H5m7 7-7-7 7-7',
    book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 4.5v17M8 6h8M8 10h8',
    search: 'm20 20-4.5-4.5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    library: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
    spark: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
    chevron: 'm9 18 6-6-6-6',
    panel: 'M3 4h18v16H3zM14 4v16',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.2l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8-.2l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.5 1l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.1v3.4z'
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] || paths.book} /></svg>;
}

function getSelectedTextOffsets(root: HTMLElement, selection: Selection | null): { start: number; end: number } | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('sup, .verse-markup-tags')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let cursor = 0;
  let start: number | null = null;
  let end: number | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length || 0;
    if (node === range.startContainer) start = cursor + Math.min(range.startOffset, length);
    if (node === range.endContainer) end = cursor + Math.min(range.endOffset, length);
    cursor += length;
  }
  if (start === null || end === null || start === end) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function renderMarkedText(text: string, offset: number, ranges: WordMarkupRange[], onRemove?: (start: number, end: number) => void): React.ReactNode[] {
  const boundaries = new Set<number>([0, text.length]);
  ranges.forEach(range => {
    const start = Math.max(0, Math.min(text.length, range.start - offset));
    const end = Math.max(0, Math.min(text.length, range.end - offset));
    if (end > start) { boundaries.add(start); boundaries.add(end); }
  });
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const value = text.slice(start, end);
    const tags = ranges.filter(range => range.start <= offset + start && range.end >= offset + end).flatMap(range => range.tags);
    if (!tags.length) return <Fragment key={offset + start}>{value}</Fragment>;
    return <mark key={offset + start} className={'word-markup ' + [...new Set(tags)].map(tag => 'word-markup-' + tag).join(' ')} title={'Marked: ' + [...new Set(tags)].join(', ') + ' · Click to remove highlight'} onClick={event => { event.preventDefault(); event.stopPropagation(); onRemove?.(offset + start, offset + end); }}>{value}</mark>;
  });
}

function renderVerseWithAnnotations(
  text: string,
  annotations: WordAnnotation[],
  enabled: boolean,
  onWordClick: (id: string, word: string) => void,
  wordMarks: WordMarkupRange[] = [],
  onRemoveWordMark?: (start: number, end: number) => void
) {
  if (!enabled || !Array.isArray(annotations) || annotations.length === 0) return renderMarkedText(text, 0, wordMarks, onRemoveWordMark);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const valid = annotations
    .filter(item => Array.isArray(item.strongs) && item.strongs.length > 0 &&
      Number.isInteger(item.start) && Number.isInteger(item.end) &&
      item.start >= 0 && item.end > item.start && item.end <= text.length)
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);

  for (const item of valid) {
    if (item.start < cursor) continue;
    const id = item.strongs.find(Boolean);
    if (!id) continue;
    if (item.start > cursor) parts.push(...renderMarkedText(text.slice(cursor, item.start), cursor, wordMarks, onRemoveWordMark));
    const word = text.slice(item.start, item.end);
    const detail = [item.originalText, item.transliteration, item.parsingFull || item.parsing].filter(Boolean).join(' · ');
    parts.push(
      <button className="strongs-token" type="button" key={item.start + '-' + item.end}
        title={detail || ('Open ' + id)} onClick={() => onWordClick(id, word)}>
        {renderMarkedText(word, item.start, wordMarks, onRemoveWordMark)}<sup>{id}</sup>
      </button>
    );
    cursor = item.end;
  }
  if (cursor < text.length) parts.push(...renderMarkedText(text.slice(cursor), cursor, wordMarks, onRemoveWordMark));
  return <>{parts}</>;
}

const initialPassage = readSavedPassage() || { book: 'Genesis', chapter: 1, translation: 'BSB' as BibleTranslation };

export default function App() {
  const [stage, setStage] = useState<Stage>('observe');
  const [draftsByPassage, setDraftsByPassage] = useState<PreviewDrafts>(() => readPreviewDrafts());
  const [previewMarkup, setPreviewMarkup] = useState(() => readPreviewMarkup());
  const [previewWordMarkup, setPreviewWordMarkup] = useState(() => readPreviewWordMarkup());
  const [showMarkupReview, setShowMarkupReview] = useState(false);
  const [showObservationIndex, setShowObservationIndex] = useState(false);
  const [observationIndexChapters, setObservationIndexChapters] = useState<Record<string, BibleChapter>>({});
  const [observationIndexStatus, setObservationIndexStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [observationIndexSearch, setObservationIndexSearch] = useState('');
  const [observationIndexCategory, setObservationIndexCategory] = useState('all');
  const [markupSearch, setMarkupSearch] = useState('');
  const [markupColors, setMarkupColors] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = { 'key-word':'#f5e7b9', 'repeated-idea':'#dcece0', contrast:'#f3dfd7', command:'#e6e1f1', promise:'#f6edc9', question:'#dce9f2' };
    try { return { ...defaults, ...JSON.parse(window.localStorage.getItem('ibs-preview-markup-colors-v1') || '{}') }; } catch { return defaults; }
  });
  const [selectedTextMarkup, setSelectedTextMarkup] = useState<{ verse: number; start: number; end: number; text: string } | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
  const [notesFontSize, setNotesFontSize] = useState(17);
  const [book, setBook] = useState(initialPassage.book);
  const [chapter, setChapter] = useState(initialPassage.chapter);
  const [translation, setTranslation] = useState<BibleTranslation>(initialPassage.translation);
  const [bible, setBible] = useState<BibleChapter | null>(null);
  const [loadingBible, setLoadingBible] = useState(true);
  const [bibleError, setBibleError] = useState('');
  const [readerReload, setReaderReload] = useState(0);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
  const verseSelectionAnchorRef = useRef<number | null>(null);
  const [readerNotice, setReaderNotice] = useState('');
  const [showStrongs, setShowStrongs] = useState(false);
  const [lexicon, setLexicon] = useState<StrongLexiconEntry | null>(null);
  const [lexiconWord, setLexiconWord] = useState('');
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [lexiconError, setLexiconError] = useState('');
  const lexiconRequestRef = useRef(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);
  const [view, setView] = useState<'overview' | 'library' | 'reader' | 'study' | 'references'>('overview');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [fontSize, setFontSize] = useState(19);
  const [previewCrossReferences, setPreviewCrossReferences] = useState<PreviewCrossReference[]>(() => readPreviewCrossReferences());
  const [standardCrossReferences, setStandardCrossReferences] = useState<StandardCrossReferenceRow[]>([]);
  const [standardReferencesStatus, setStandardReferencesStatus] = useState<'idle'|'loading'|'loaded'|'error'>('idle');
  const [standardReferencesError, setStandardReferencesError] = useState('');
  const [referencePreview, setReferencePreview] = useState<{ key: string; book: string; chapter: number; verse: number | null; endVerse: number | null } | null>(null);
  const [referencePreviewBible, setReferencePreviewBible] = useState<BibleChapter | null>(null);
  const [referencePreviewStatus, setReferencePreviewStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [referencePreviewError, setReferencePreviewError] = useState('');
  const referenceNavigationRef = useRef<{ book: string; chapter: number; start: number; end: number } | null>(null);
  const [referenceTargetBook, setReferenceTargetBook] = useState('John');
  const [referenceTargetChapter, setReferenceTargetChapter] = useState(1);
  const [referenceSourceVerse, setReferenceSourceVerse] = useState<number | ''>('');
  const [referenceTargetVerse, setReferenceTargetVerse] = useState<number | ''>('');
  const [referenceNote, setReferenceNote] = useState('');
  const [referenceNotice, setReferenceNotice] = useState('');
  const [showAddToStudy, setShowAddToStudy] = useState(false);
  const [addToStudyTarget, setAddToStudyTarget] = useState('current');


  const current = stages.find(s => s.id === stage)!;
  const passageDraftKey = book + '|' + chapter;
  const emptyNotes: PreviewStudyDraft = { observe: '', interpret: '', doctrine: '', apply: '', activeStage: 'observe' };
  const notesByStage = draftsByPassage[passageDraftKey] || emptyNotes;
  const note = notesByStage[stage];
  const selectedVerse = selectedVerseNumbers.length ? selectedVerseNumbers[selectedVerseNumbers.length - 1] : null;
  const earlierStageEvidence = useMemo(() => getPreviewStageEvidence(notesByStage, stage), [notesByStage, stage]);
  const stagesWithNotes = useMemo(() => new Set(getPreviewWrittenStages(notesByStage)), [notesByStage]);
  const wordCount = useMemo(() => note.trim() ? note.trim().split(/\s+/).length : 0, [note]);
  const bookInfo = getBibleBook(book)!;
  const allPreviewLibraryEntries = useMemo(() => listPreviewDraftEntries(draftsByPassage), [draftsByPassage]);
  const dashboardStats = useMemo(() => summarizePreviewDraftEntries(allPreviewLibraryEntries), [allPreviewLibraryEntries]);
  const visiblePreviewLibraryEntries = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase();
    if (!query) return allPreviewLibraryEntries;
    return allPreviewLibraryEntries.filter(entry =>
      (entry.book + ' ' + entry.chapter).toLocaleLowerCase().includes(query) ||
      entry.preview.toLocaleLowerCase().includes(query) ||
      entry.writtenStages.some(item => stages.find(candidate => candidate.id === item)?.label.toLocaleLowerCase().includes(query))
    );
  }, [allPreviewLibraryEntries, libraryQuery]);


  useEffect(() => {
    setStage(draftsByPassage[passageDraftKey]?.activeStage || 'observe');
  }, [passageDraftKey]);

  useEffect(() => {
    if (!showObservationIndex) return;
    const passageKeys = Array.from(new Set([
      ...Object.keys(previewWordMarkup),
      ...Object.keys(previewMarkup)
    ])).filter(key => key !== passageDraftKey && !observationIndexChapters[key]);
    if (!passageKeys.length) {
      setObservationIndexStatus('ready');
      return;
    }
    const controller = new AbortController();
    setObservationIndexStatus('loading');
    Promise.all(passageKeys.map(async key => {
      const [targetBook, chapterText] = key.split('|');
      const result = await fetchBibleChapter(targetBook, Number(chapterText), translation, { signal: controller.signal });
      return [key, result] as const;
    })).then(results => {
      if (controller.signal.aborted) return;
      setObservationIndexChapters(previous => ({ ...previous, ...Object.fromEntries(results) }));
      setObservationIndexStatus('ready');
    }).catch(() => {
      if (!controller.signal.aborted) setObservationIndexStatus('ready');
    });
    return () => controller.abort();
  }, [showObservationIndex, previewWordMarkup, previewMarkup, passageDraftKey, translation, observationIndexChapters]);

  useEffect(() => {
    writePreviewMarkup(previewMarkup);
  }, [previewMarkup]);

  useEffect(() => {
    writePreviewWordMarkup(previewWordMarkup);
  }, [previewWordMarkup]);
  useEffect(() => {
    try { window.localStorage.setItem('ibs-preview-markup-colors-v1', JSON.stringify(markupColors)); } catch { /* Optional preview preference. */ }
  }, [markupColors]);

  useEffect(() => {
    setSelectedTextMarkup(null);
  }, [passageDraftKey]);

  useEffect(() => { writePreviewCrossReferences(previewCrossReferences); }, [previewCrossReferences]);
  useEffect(() => {
    if (view !== 'references') return;
    const controller = new AbortController();
    const sourceTranslation = translation === 'KJV' ? 'KJV' : 'BSB';
    setStandardReferencesStatus('loading');
    setStandardReferencesError('');
    loadStandardCrossReferences(sourceTranslation, { signal: controller.signal, book, chapter })
      .then(rows => {
        if (controller.signal.aborted) return;
        setStandardCrossReferences(rows);
        setStandardReferencesStatus('loaded');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStandardReferencesError(error instanceof Error ? error.message : 'Unable to load standard cross-references.');
        setStandardReferencesStatus('error');
      });
    return () => controller.abort();
  }, [view, book, chapter, translation]);


  useEffect(() => {
    if (!referencePreview) {
      setReferencePreviewBible(null);
      setReferencePreviewStatus('idle');
      setReferencePreviewError('');
      return;
    }
    const controller = new AbortController();
    setReferencePreviewBible(null);
    setReferencePreviewStatus('loading');
    setReferencePreviewError('');
    fetchBibleChapter(referencePreview.book, referencePreview.chapter, translation, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setReferencePreviewBible(result);
        setReferencePreviewStatus('loaded');
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setReferencePreviewError(error instanceof Error ? error.message : 'The referenced passage could not be loaded.');
        setReferencePreviewStatus('error');
      });
    return () => controller.abort();
  }, [referencePreview, translation]);

  useEffect(() => {
    setDraftSaveStatus('saving');
    const timer = window.setTimeout(() => {
      setDraftSaveStatus(writePreviewDrafts(draftsByPassage) ? 'saved' : 'unavailable');
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftsByPassage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingBible(true);
    setBibleError('');
    setReaderNotice('');
    setSelectedVerseNumbers([]);
    verseSelectionAnchorRef.current = null;
    lexiconRequestRef.current += 1;
    setLexicon(null);
    setLexiconError('');
    setLexiconLoading(false);
    setLexiconWord('');
    writeSavedPassage({ book, chapter, translation });

    fetchBibleChapter(book, chapter, translation, { signal: controller.signal })
      .then(result => {
        setBible(result);
        const pending = referenceNavigationRef.current;
        if (pending && pending.book === result.book && pending.chapter === result.chapter) {
          setSelectedVerseNumbers(selectVerseRange(pending.start, pending.end));
          verseSelectionAnchorRef.current = pending.start;
          referenceNavigationRef.current = null;
        }
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setBible(null);
        setBibleError(error instanceof Error ? error.message : 'The Scripture chapter could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingBible(false);
      });

    return () => controller.abort();
  }, [book, chapter, translation, readerReload]);

  const changeStage = (nextStage: Stage) => {
    setShowEvidence(false);
    setStage(nextStage);
    setDraftsByPassage(previous => ({
      ...previous,
      [passageDraftKey]: {
        ...emptyNotes,
        ...(previous[passageDraftKey] || {}),
        activeStage: nextStage
      }
    }));
  };

  const move = (direction: number) => {
    const index = stages.findIndex(s => s.id === stage);
    changeStage(stages[Math.max(0, Math.min(3, index + direction))].id);
  };

  const resumePreviewDraft = (entry: PreviewDraftEntry) => {
    setBook(entry.book);
    setChapter(entry.chapter);
    setStage(entry.activeStage);
    setView('study');
  };

  const changeChapter = (direction: number) => {
    const bookIndex = BIBLE_BOOKS.findIndex(entry => entry.name === book);
    let nextBook = book;
    let nextChapter = chapter + direction;
    if (nextChapter < 1 && bookIndex > 0) {
      nextBook = BIBLE_BOOKS[bookIndex - 1].name;
      nextChapter = BIBLE_BOOKS[bookIndex - 1].chapters;
    } else if (nextChapter > bookInfo.chapters && bookIndex < BIBLE_BOOKS.length - 1) {
      nextBook = BIBLE_BOOKS[bookIndex + 1].name;
      nextChapter = 1;
    }
    if (nextBook !== book || nextChapter !== chapter) {
      setBook(nextBook);
      setChapter(nextChapter);
    }
  };

  const openLexicon = async (id: string, word: string) => {
    const requestId = ++lexiconRequestRef.current;
    setLexicon(null);
    setLexiconWord(word);
    setLexiconError('');
    setLexiconLoading(true);
    try {
      const entry = await fetchStrongsLexicon(id);
      if (requestId === lexiconRequestRef.current) setLexicon(entry);
    } catch (error) {
      if (requestId === lexiconRequestRef.current) {
        setLexiconError(error instanceof Error ? error.message : 'The lexicon entry could not be loaded.');
      }
    } finally {
      if (requestId === lexiconRequestRef.current) setLexiconLoading(false);
    }
  };

  const selectedVerseRecords = bible?.verses.filter(item => selectedVerseNumbers.includes(item.number)).sort((a, b) => a.number - b.number) || [];
  const selectedVerseRecord = selectedVerseRecords.find(item => item.number === selectedVerse) || selectedVerseRecords[selectedVerseRecords.length - 1];
  const selectedVerseCitation = selectedVerseRecords.length ? book + ' ' + chapter + ':' + selectedVerseRecords.map(item => item.number).join(', ') : '';

  const appendVerseToStudy = (targetKey: string, targetStage: Stage = 'observe') => {
    if (!selectedVerseRecords.length) return;
    const [targetBook, targetChapterText] = targetKey.split('|');
    const targetChapter = Number(targetChapterText);
    const currentDraft = draftsByPassage[targetKey] || { observe: '', interpret: '', doctrine: '', apply: '', activeStage: 'observe' as const };
    const existing = currentDraft[targetStage] || '';
    const additions = selectedVerseRecords.filter(item => !existing.includes(book + ' ' + chapter + ':' + item.number + ' — ' + translation));
    if (!additions.length) {
      setReaderNotice('The selected verses are already included in that study stage.');
      return;
    }
    const addition = additions.map(item => book + ' ' + chapter + ':' + item.number + ' — ' + translation + '\n' + item.text).join('\n\n');
    setDraftsByPassage(previous => ({
      ...previous,
      [targetKey]: { ...(previous[targetKey] || currentDraft), [targetStage]: existing.trim() ? existing + '\n\n' + addition : addition.trim(), activeStage: targetStage }
    }));
    setStage(targetStage);
    if (targetBook !== book || targetChapter !== chapter) {
      setBook(targetBook);
      setChapter(targetChapter);
    }
    setShowAddToStudy(false);
    setReaderNotice(additions.length + ' selected verse' + (additions.length === 1 ? '' : 's') + ' added to ' + targetBook + ' ' + targetChapter + ' · ' + targetStage + '.');
  };

  const addVerseAsObservation = () => {
    if (!selectedVerseRecords.length) return;
    const existing = notesByStage.observe || '';
    const additions = selectedVerseRecords.filter(item => !existing.includes(book + ' ' + chapter + ':' + item.number + ' — ' + translation));
    if (!additions.length) {
      setReaderNotice('The selected verses are already included in your observations.');
      return;
    }
    const addition = additions.map(item => book + ' ' + chapter + ':' + item.number + ' — ' + translation + '\n' + item.text).join('\n\n');
    setDraftsByPassage(previous => ({
      ...previous,
      [passageDraftKey]: { ...(previous[passageDraftKey] || emptyNotes), observe: existing.trim() ? existing + '\n\n' + addition : addition, activeStage: 'observe' }
    }));
    setStage('observe');
    setReaderNotice(additions.length + ' selected verse' + (additions.length === 1 ? '' : 's') + ' added to your Observation notes.');
  };

  const openVerseCrossReference = () => {
    if (selectedVerse === null) return;
    setReferenceSourceVerse(selectedVerse);
    setReferenceNotice('');
    setView('references');
  };

  const copySelectedVerse = async () => {
    if (!selectedVerseRecords.length) return;
    const text = selectedVerseRecords.map(verse => book + ' ' + chapter + ':' + verse.number + ' (' + translation + ') — ' + verse.text).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setReaderNotice('Verse copied.');
    } catch {
      setReaderNotice('Copy is unavailable in this browser. Select the verse text to copy it manually.');
    }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div><strong>IBS</strong><span>WORD OF LIFE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className={view === 'overview' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('overview')}><Icon name="home"/>Overview</button>
      <button className={view === 'library' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('library')}><Icon name="library"/>Study library</button>
      <button className={view === 'reader' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('reader')}><Icon name="book"/>Bible reader</button>
      <button className={view === 'study' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('study')}><Icon name="library"/>Active study</button>
      <div className="sidebar-divider"/>
      <div className="workspace-label">RESEARCH</div>
      <button className="nav-item nav-disabled" type="button" disabled title="Research tools are being integrated in a later rebuild phase"><Icon name="search"/>Word studies</button>
      <button className={view === 'references' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('references')}><Icon name="panel"/>Cross-references<span className="nav-count">{previewCrossReferences.length}</span></button>
      <button className="nav-item nav-disabled" type="button" disabled title="AI guidance will be reconnected after the contextual data adapter is complete"><Icon name="spark"/>AI study guide</button>
      <div className="sidebar-bottom"><div className="avatar">J</div><div><strong>Study workspace</strong><span>Preview environment</span></div><button className="icon-button" aria-label="Settings" type="button" disabled><Icon name="settings"/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        {view !== 'overview' && <button className="back-home-button" type="button" onClick={() => setView('overview')} aria-label="Back to start screen" title="Back to start screen"><Icon name="back"/><span>Home</span></button>}
        <div className="crumbs"><span>Workspace</span><Icon name="chevron"/><strong>{view === 'overview' ? 'Overview' : view === 'library' ? 'Study library' : view === 'references' ? 'Cross-references' : view === 'study' ? 'Active study' : book + ' ' + chapter}</strong></div>
        <div className="top-actions"><span className="sync-status"><i/> Preview · local drafts only</span><button className="soft-button" type="button" disabled title="AI guidance is not connected in this phase"><Icon name="spark"/> AI Guide</button><button className="profile" type="button" disabled>J</button></div>
      </header>
      {view === 'overview' ? <section className="dashboard-view">
        <div className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <div className="dashboard-eyebrow">INDUCTIVE BIBLE STUDY · PREVIEW WORKSPACE</div>
            <h1>Study the text.<br/><em>Follow the evidence.</em></h1>
            <p>A focused place to read Scripture, record observations, examine meaning, establish doctrine and respond faithfully.</p>
            <div className="dashboard-actions">
              <button className="dashboard-primary" type="button" onClick={() => setView('reader')}>Open Bible reader <Icon name="chevron"/></button>
              <button className="dashboard-secondary" type="button" onClick={() => setView('library')}>Browse study library</button>
            </div>
          </div>
          <aside className="dashboard-passage-card">
            <span className="dashboard-card-kicker">LAST OPENED PASSAGE</span>
            <strong>{book} {chapter}</strong>
            <span>{translation} · Your reading position is saved in this browser</span>
            <button type="button" onClick={() => setView('reader')}>Continue reading <Icon name="chevron"/></button>
          </aside>
        </div>

        <div className="dashboard-stat-grid" aria-label="Preview study summary">
          <article className="dashboard-stat"><span>Draft studies</span><strong>{dashboardStats.studyCount}</strong><small>Passages with saved notes</small></article>
          <article className="dashboard-stat"><span>Stage notes</span><strong>{dashboardStats.stageNoteCount}</strong><small>Across the four study stages</small></article>
          <article className="dashboard-stat"><span>Words recorded</span><strong>{dashboardStats.wordCount.toLocaleString()}</strong><small>In this browser preview</small></article>
          <article className="dashboard-stat stage-stat">
            <span>Stage coverage</span>
            <div className="dashboard-stage-counts">
              {stages.map(item => <div key={item.id}><b>{dashboardStats.stageCounts[item.id]}</b><small>{item.label}</small></div>)}
            </div>
          </article>
        </div>

        <section className="dashboard-studies">
          <div className="dashboard-section-heading">
            <div><span className="eyebrow">YOUR WORKSPACE</span><h2>Saved preview drafts</h2><p>These notes are stored only in this browser preview—not in your production Study Library.</p></div>
            <button className="dashboard-link" type="button" onClick={() => setView('library')}>View all drafts <Icon name="chevron"/></button>
          </div>
          {allPreviewLibraryEntries.length > 0 ? <div className="dashboard-draft-grid">
            {allPreviewLibraryEntries.slice(0, 3).map(entry => <article className="dashboard-draft-card" key={entry.book + '|' + entry.chapter}>
              <div className="dashboard-draft-top"><span>LOCAL PREVIEW DRAFT</span><span>{entry.wordCount} words</span></div>
              <h3>{entry.book} {entry.chapter}</h3>
              <p>{entry.stageCount} of 4 stages with notes · Continue in {stages.find(item => item.id === entry.activeStage)?.label || 'Observe'}</p>
              <div className="dashboard-draft-chips">{entry.writtenStages.map(item => <span key={item}>{stages.find(candidate => candidate.id === item)?.label}</span>)}</div>
              <button type="button" onClick={() => resumePreviewDraft(entry)}>Open study workspace <Icon name="chevron"/></button>
            </article>)}
          </div> : <div className="dashboard-empty">
            <div className="dashboard-empty-mark"><Icon name="book"/></div>
            <div><h3>Begin your first study</h3><p>Choose a passage in the Bible reader and start recording notes. Your preview draft will appear here as soon as you write in a study stage.</p></div>
            <button type="button" onClick={() => setView('reader')}>Choose a passage <Icon name="chevron"/></button>
          </div>}
        </section>
        <p className="dashboard-preview-note"><strong>Preview environment:</strong> dashboard figures and study drafts are local to this browser. Account sign-in, cloud sync and the existing production library are not connected here.</p>
      </section> : view === 'library' ? <section className="library-view">
        <div className="library-header"><div><div className="eyebrow">YOUR WORKSPACE · PREVIEW DRAFTS</div><h1>Study library</h1><p>Studies saved in this browser preview. These drafts are separate from your existing production library and are not synced to the cloud.</p></div><button className="outline-button" type="button" onClick={() => setView('reader')}>Return to study</button></div>
        <div className="library-toolbar"><div className="library-result-count"><strong>{allPreviewLibraryEntries.length}</strong> {allPreviewLibraryEntries.length === 1 ? 'draft study' : 'draft studies'}</div><input className="library-search" type="search" value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)} placeholder="Search passage, stage or notes…" aria-label="Search preview studies"/></div>
        {visiblePreviewLibraryEntries.length > 0 ? <div className="preview-study-list">
          {visiblePreviewLibraryEntries.map(entry => <article className="preview-study-card" key={entry.book + '|' + entry.chapter}>
            <div className="preview-study-content"><div className="preview-study-meta"><span className="tag">LOCAL PREVIEW DRAFT</span><span>{entry.wordCount} words</span></div><h2>{entry.book} {entry.chapter}</h2><p className="preview-study-progress">{entry.stageCount} of 4 stages have notes · Current stage: {stages.find(item => item.id === entry.activeStage)?.label || 'Observe'}</p><p className="preview-study-excerpt">{entry.preview}</p><div className="preview-stage-chips">{entry.writtenStages.map(item => <span key={item}>{stages.find(candidate => candidate.id === item)?.label}</span>)}</div></div>
            <button className="primary-button preview-resume" type="button" onClick={() => resumePreviewDraft(entry)}>Resume study <Icon name="chevron"/></button>
          </article>)}
        </div> : <div className="library-empty"><div className="library-empty-mark"><Icon name="library"/></div><h2>{allPreviewLibraryEntries.length ? 'No matching studies' : 'Your preview library is ready'}</h2><p>{allPreviewLibraryEntries.length ? 'Try a different passage, stage or note keyword.' : 'Choose a Bible passage and begin recording notes. Your preview drafts will appear here automatically as you work.'}</p>{allPreviewLibraryEntries.length ? <button className="text-button" type="button" onClick={() => setLibraryQuery('')}>Clear search</button> : <button className="primary-button" type="button" onClick={() => setView('reader')}>Open Bible reader <Icon name="chevron"/></button>}</div>}
      </section> : view === 'references' ? <section className="references-view">
        <div className="library-header"><div><div className="eyebrow">RESEARCH · PASSAGE CONNECTIONS</div><h1>Cross-references</h1><p>Explore standard Scripture connections alongside the links you have recorded in your own studies.</p></div><button className="outline-button" type="button" onClick={() => setView('reader')}>Return to Scripture</button></div>
        
        <section className="reference-list-card standard-reference-card">
          <div className="reference-list-heading"><div><span className="eyebrow">STANDARD BIBLE REFERENCES · {translation === 'KJV' ? 'KJV' : 'BSB'} ANCHORS</span><h2>{book} {chapter}</h2></div><strong>{standardReferencesStatus === 'loaded' ? standardCrossReferences.length : '—'}</strong></div>
          {standardReferencesStatus === 'loading' ? <p className="reference-help">Loading the licensed standard cross-reference collection…</p> : standardReferencesStatus === 'error' ? <p className="reference-help" role="alert">{standardReferencesError} You can still use your saved study links below.</p> : standardCrossReferences.length ? <div className="reference-list">{standardCrossReferences.map(row => <article className="reference-item" key={row.id}><div className="reference-pair"><strong>{row.book} {row.chapter}:{row.verse}</strong><span>{row.anchor}</span></div><div className="standard-reference-links">{row.references.map((ref,index)=>{const previewKey=row.id+'-'+index;const isPreviewOpen=referencePreview?.key===previewKey;return <button type="button" key={previewKey} className={isPreviewOpen?'standard-reference-link active':''} aria-expanded={isPreviewOpen} onClick={()=>setReferencePreview(current=>current?.key===previewKey?null:{key:previewKey,book:ref.book,chapter:ref.chapter,verse:ref.verse,endVerse:ref.endVerse})}>{ref.label}</button>;})}</div>{referencePreview?.key.startsWith(row.id+'-') && <div className="reference-verse-popover" role="region" aria-label={'Preview of '+referencePreview.book+' '+referencePreview.chapter}><div className="reference-verse-popover-heading"><div><span className="eyebrow">SCRIPTURE PREVIEW · {translation}</span><strong>{referencePreview.book} {referencePreview.chapter}{referencePreview.verse ? ':'+referencePreview.verse+(referencePreview.endVerse && referencePreview.endVerse!==referencePreview.verse?'-'+referencePreview.endVerse:'') : ''}</strong></div><button type="button" className="tool-button" onClick={()=>setReferencePreview(null)} aria-label="Close verse preview">×</button></div>{referencePreviewStatus==='loading' && <p className="reference-preview-status" role="status">Loading Scripture…</p>}{referencePreviewStatus==='error' && <p className="reference-preview-error" role="alert">{referencePreviewError}</p>}{referencePreviewStatus==='loaded' && referencePreviewBible && <div className="reference-preview-verses">{referencePreviewBible.verses.filter(item=>referencePreview.verse===null || (item.number>=referencePreview.verse && item.number<=(referencePreview.endVerse || referencePreview.verse))).map(item=><button type="button" className="reference-preview-verse" key={item.number} onClick={()=>{if(book===referencePreview.book&&chapter===referencePreview.chapter){setSelectedVerseNumbers([item.number]);verseSelectionAnchorRef.current=item.number;}else{referenceNavigationRef.current={book:referencePreview.book,chapter:referencePreview.chapter,start:item.number,end:item.number};setBook(referencePreview.book);setChapter(referencePreview.chapter);}setView('reader');setReferencePreview(null);}}><span>{item.number}</span><span>{item.text}</span><span className="reference-preview-open">Open <Icon name="chevron"/></span></button>)}</div>}{referencePreviewStatus==='loaded' && <p className="reference-preview-hint">Select a verse to open it in the Bible Reader.</p>}</div>}<div className="reference-item-footer"><span>STANDARD REFERENCE · {STANDARD_XREF_SOURCE.name}</span></div></article>)}</div> : <div className="library-empty"><h2>No standard references listed for this chapter</h2><p>Try a different chapter or translation.</p></div>}
          <p className="reference-storage-note">Source: {STANDARD_XREF_SOURCE.attribution} <a href={STANDARD_XREF_SOURCE.url} target="_blank" rel="noreferrer">Dataset and licence details</a>.</p>
        </section>
        <div className="reference-workspace">
          <section className="reference-form-card"><span className="tag">CREATE A PASSAGE LINK</span><h2>Connect two passages</h2><p className="reference-help">The source passage is taken from your current Bible Reader location.</p>
            <div className="reference-source"><span>FROM</span><strong>{book} {chapter}</strong><label htmlFor="reference-source-verse">Verse (optional)</label><input id="reference-source-verse" type="number" min="1" max="300" value={referenceSourceVerse} onChange={event => setReferenceSourceVerse(event.target.value ? Number(event.target.value) : '')} placeholder="Whole chapter"/></div>
            <div className="reference-target"><span>TO</span><label htmlFor="reference-target-book">Book</label><select id="reference-target-book" className="reading-select" value={referenceTargetBook} onChange={event => {setReferenceTargetBook(event.target.value);setReferenceTargetChapter(1);}}>{BIBLE_BOOKS.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select><label htmlFor="reference-target-chapter">Chapter</label><select id="reference-target-chapter" className="reading-select" value={referenceTargetChapter} onChange={event => setReferenceTargetChapter(Number(event.target.value))}>{Array.from({length:getBibleBook(referenceTargetBook)?.chapters || 1},(_,index)=>index+1).map(value=><option key={value} value={value}>{value}</option>)}</select><label htmlFor="reference-target-verse">Verse (optional)</label><input id="reference-target-verse" type="number" min="1" max="300" value={referenceTargetVerse} onChange={event => setReferenceTargetVerse(event.target.value ? Number(event.target.value) : '')} placeholder="Whole chapter"/></div>
            <label className="reference-note-label" htmlFor="reference-note">Why are these passages connected? (optional)</label><textarea id="reference-note" value={referenceNote} onChange={event=>setReferenceNote(event.target.value)} maxLength={1200} placeholder="Record the shared theme, quotation, parallel, fulfilment or other textual connection…"/>
            <button className="primary-button" type="button" onClick={()=>{const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'ref-' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);const created = addPreviewCrossReference(previewCrossReferences,{id,sourceBook:book,sourceChapter:chapter,sourceVerse:referenceSourceVerse || null,targetBook:referenceTargetBook,targetChapter:referenceTargetChapter,targetVerse:referenceTargetVerse || null,note:referenceNote.trim(),createdAt:new Date().toISOString()});if(created.length === previewCrossReferences.length){setReferenceNotice('This reference could not be saved. Check the passage details.');return;}setPreviewCrossReferences(created);setReferenceSourceVerse('');setReferenceTargetVerse('');setReferenceNote('');setReferenceNotice('Passage connection saved in this browser preview.');}}>Save cross-reference</button><p className="reference-storage-note" role="status">{referenceNotice || 'Saved locally in this browser preview only.'}</p>
          </section>
          <section className="reference-list-card"><div className="reference-list-heading"><div><span className="eyebrow">YOUR RESEARCH</span><h2>Saved connections</h2></div><strong>{previewCrossReferences.length}</strong></div>
            {previewCrossReferences.length ? <div className="reference-list">{previewCrossReferences.map(item=>{const names=formatCrossReference(item);return <article className="reference-item" key={item.id}><div className="reference-pair"><button type="button" onClick={()=>{setBook(item.sourceBook);setChapter(item.sourceChapter);setView('reader');}}>{names.source}</button><span aria-hidden="true">↔</span><button type="button" onClick={()=>{setBook(item.targetBook);setChapter(item.targetChapter);setView('reader');}}>{names.target}</button></div>{item.note ? <p>{item.note}</p> : <p className="reference-muted">No connection note recorded.</p>}<div className="reference-item-footer"><span>USER-CREATED PREVIEW REFERENCE</span><button type="button" className="text-button" onClick={()=>setPreviewCrossReferences(previous=>deletePreviewCrossReference(previous,item.id))}>Remove</button></div></article>})}</div> : <div className="library-empty"><div className="library-empty-mark"><Icon name="panel"/></div><h2>No saved connections yet</h2><p>Create a link between the current passage and another Scripture reference. You can return to either passage from your saved list.</p><button className="primary-button" type="button" onClick={()=>setView('reader')}>Open Bible reader <Icon name="chevron"/></button></div>}
          </section>
        </div><p className="reference-disclaimer">Standard references and user-created study connections are shown separately. Standard references are sourced from the licensed Treasury of Scripture Knowledge dataset; your own links remain local to this browser preview.</p>
      </section> :
      {view === 'study' ? <section className="active-study-view">
        <div className="active-study-header"><div><div className="eyebrow">ACTIVE INDUCTIVE STUDY</div><h1>{book} <em>{chapter}</em></h1><p>Work through the passage systematically. Your notes remain attached to this passage and stage.</p></div><button className="outline-button" type="button" onClick={() => setView('reader')}><Icon name="book"/> Open Bible reader</button></div>
        <div className="active-study-progress"><div><strong>Study progress</strong><span>{stagesWithNotes.size} of 4 stages have notes</span></div><div className="active-study-progress-track">{stages.map(item => <i key={item.id} className={stagesWithNotes.has(item.id) ? 'complete' : ''}/>)}</div></div>
        <nav className="stage-nav" aria-label="Study stages">{stages.map(item => <button key={item.id} className={stage===item.id?'stage-tab selected':'stage-tab'} type="button" onClick={() => changeStage(item.id)}><span className="stage-number">{item.number}</span><span>{item.label}</span>{stagesWithNotes.has(item.id) && <span className="stage-done">✓</span>}</button>)}</nav>
        <div className="active-study-grid"><section className="active-study-editor"><div className="notes-topline"><div><span className="stage-counter">STAGE {current.number} OF 04</span><h2>{current.label}</h2></div><span className="draft-status">{draftSaveStatus === 'saved' ? 'Saved locally' : draftSaveStatus === 'saving' ? 'Saving…' : 'Local save unavailable'}</span></div><div className="question-copy"><strong>{current.question}</strong><p>{current.hint}</p></div>
          {showGuidance && <div className="guidance-content"><p>Work from the passage itself. Record what the text supports, keep observations distinct from conclusions, and refer to specific verses wherever possible.</p></div>}
          {earlierStageEvidence.length > 0 && <div className="evidence-strip"><div><i className="evidence-dot"/>Earlier-stage notes available</div><button className="text-button" type="button" onClick={() => setShowEvidence(v=>!v)}>{showEvidence ? 'Hide' : 'Review'}</button></div>}
          {showEvidence && <div className="guidance-content">{earlierStageEvidence.map(item => <p key={item.stage}><strong>{item.label}:</strong> {item.text}</p>)}</div>}
          <label className="active-study-notes-label" htmlFor="active-study-notes">YOUR {current.label.toUpperCase()} NOTES</label><textarea id="active-study-notes" value={note} onChange={event => setDraftsByPassage(previous => ({...previous,[passageDraftKey]:{...emptyNotes,...(previous[passageDraftKey]||{}),[stage]:event.target.value}}))} placeholder={'Record your '+current.label.toLowerCase()+' notes for '+book+' '+chapter+'…'}/><div className="active-study-editor-footer"><span>{wordCount} words</span><span>Auto-saved in this preview</span></div>
          <div className="stage-footer"><button className="outline-button" type="button" onClick={() => move(-1)} disabled={stage==='observe'}>Previous stage</button><button className="primary-button" type="button" onClick={() => move(1)} disabled={stage==='apply'}>Next stage <Icon name="chevron"/></button></div>
        </section><aside className="active-study-source"><span className="eyebrow">SOURCE SCRIPTURE</span><h2>{book} {chapter}</h2><p>{translation} · {bible?.verses.length || 0} verses</p><div className="active-study-source-preview">{bible?.verses.slice(0,3).map(verse => <p key={verse.number}><b>{verse.number}</b> {verse.text}</p>) || <p>Scripture passage loading…</p>}</div><button className="primary-button" type="button" onClick={() => setView('reader')}>Read and mark passage <Icon name="chevron"/></button></aside></div>
      </section> : <div className="study-page">
        <section className="study-heading">
          <div><div className="eyebrow">INDUCTIVE STUDY <span>•</span> {bookInfo.testament === 'OT' ? 'OLD TESTAMENT' : 'NEW TESTAMENT'}</div><h1>{book} <em>{chapter}</em></h1><p>{book === 'Genesis' && chapter === 1 ? 'Creation · The beginning of all things' : 'Read the passage carefully before recording your study.'}</p></div>
          <div className="heading-actions">
            <label className="control-label" htmlFor="translation-select">TRANSLATION</label>
            <select id="translation-select" className="reading-select" value={translation} onChange={event => setTranslation(event.target.value as BibleTranslation)}>
              {BIBLE_TRANSLATIONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="control-label" htmlFor="book-select">BOOK</label>
            <select id="book-select" className="reading-select book-select" value={book} onChange={event => { setBook(event.target.value); setChapter(1); }}>
              <optgroup label="Old Testament">{BIBLE_BOOKS.filter(item => item.testament === 'OT').map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</optgroup>
              <optgroup label="New Testament">{BIBLE_BOOKS.filter(item => item.testament === 'NT').map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</optgroup>
            </select>
            <label className="control-label" htmlFor="chapter-select">CHAPTER</label>
            <select id="chapter-select" className="reading-select chapter-select" value={chapter} onChange={event => setChapter(Number(event.target.value))}>
              {Array.from({ length: bookInfo.chapters }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </section>
        <div className="workspace">
          <section className="scripture-panel">
            <div className="panel-heading"><div><span className="eyebrow">SCRIPTURE</span><h2>{book} {chapter}</h2></div><div className="reader-tools"><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.max(16,v-1))} aria-label="Decrease Scripture text size">A−</button><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.min(25,v+1))} aria-label="Increase Scripture text size">A+</button><button className={showStrongs ? 'tool-button strongs-toggle active' : 'tool-button strongs-toggle'} type="button" aria-pressed={showStrongs} onClick={() => setShowStrongs(value => !value)}>Strong’s {showStrongs ? 'On' : 'Off'}</button></div></div>
            <div className="reading-meta"><span>{translation === 'KJV' ? 'King James Version' : translation === 'BSB' ? 'Berean Standard Bible' : translation}</span><span>{chapter} of {bookInfo.chapters}</span></div>
            <div className="reader-navigation">
              <button type="button" className="outline-button" onClick={() => changeChapter(-1)} disabled={book === BIBLE_BOOKS[0].name && chapter === 1}>← Previous</button>
              <span>{book} {chapter}</span>
              <button type="button" className="outline-button" onClick={() => changeChapter(1)} disabled={book === BIBLE_BOOKS[BIBLE_BOOKS.length - 1].name && chapter === bookInfo.chapters}>Next →</button>
            </div>
            <div className="markup-toolbar" aria-label="Scripture observation markup">
              <div className="markup-toolbar-heading"><strong>Observation markup</strong><span>{selectedTextMarkup ? 'Selected text: “' + selectedTextMarkup.text + '”' : selectedVerse === null ? 'Select a verse or highlight words in the text.' : 'Selected verse: ' + book + ' ' + chapter + ':' + selectedVerse}</span></div>
              <div className="markup-options">
                {SCRIPTURE_MARKUP_TYPES.map(type => {
                  const active = selectedTextMarkup ? (previewWordMarkup[passageDraftKey]?.[String(selectedTextMarkup.verse)] || []).some(range => range.start === selectedTextMarkup.start && range.end === selectedTextMarkup.end && range.tags.includes(type.id)) : selectedVerseNumbers.length > 0 && selectedVerseNumbers.every(verseNumber => (previewMarkup[passageDraftKey]?.[String(verseNumber)] || []).includes(type.id));
                  return <button key={type.id} type="button" className={active ? 'markup-chip active' : 'markup-chip'} aria-pressed={active} title={type.label + (active ? ' · remove from verse' : ' · add to verse')} disabled={selectedTextMarkup === null && selectedVerseNumbers.length === 0} onClick={() => { if (selectedTextMarkup) setPreviewWordMarkup(previous => toggleWordMarkup(previous, passageDraftKey, selectedTextMarkup.verse, selectedTextMarkup.start, selectedTextMarkup.end, type.id)); else if (selectedVerseNumbers.length) setPreviewMarkup(previous => selectedVerseNumbers.reduce((next, verseNumber) => toggleVerseMarkup(next, passageDraftKey, verseNumber, type.id), previous)); }}>
                    <span className="markup-symbol">{type.symbol}</span>{type.label}
                  </button>;
                })}
              </div>
              <p className="markup-storage-note">{selectedTextMarkup ? 'These markings apply to the highlighted words or phrase. Clear the text selection to mark whole verses.' : 'Highlight a word or phrase to mark only that text, or select whole verses to mark the complete verses. Markings are saved in this browser preview only.'}</p>
              <div className="markup-tools-row">
                <button className="text-button" type="button" onClick={() => setShowObservationIndex(value => !value)} aria-expanded={showObservationIndex}>{showObservationIndex ? 'Hide observation index' : 'Open observation index'}</button>
                <div className="markup-legend" aria-label="Observation markup legend">{SCRIPTURE_MARKUP_TYPES.map(type => <span key={type.id}><i style={{backgroundColor:markupColors[type.id]}} />{type.label}</span>)}</div>
                <button className="text-button" type="button" onClick={() => setShowMarkupReview(value => !value)} aria-expanded={showMarkupReview}>{showMarkupReview ? 'Hide markup review' : 'Review passage markings'}</button>
              </div>
              <div className="markup-color-settings"><strong>Category colours</strong>{SCRIPTURE_MARKUP_TYPES.map(type => <label key={type.id}>{type.label}<input aria-label={type.label + ' markup colour'} type="color" value={markupColors[type.id]} onChange={event => setMarkupColors(previous => ({...previous,[type.id]:event.target.value}))} /></label>)}</div>
              {showObservationIndex && <section className="markup-review observation-index" aria-label="Study observation index">
                <div className="markup-review-heading"><strong>Observation index · All saved passages</strong><span>Review, search and revisit observations across your study</span></div>
                {(() => {
                  const entries = Object.entries(previewWordMarkup).flatMap(([passage, verses]) => Object.entries(verses).flatMap(([verse, ranges]) => ranges.map((range,index) => {
                    const chapterData = passage === passageDraftKey ? bible : observationIndexChapters[passage];
                    const verseText = chapterData?.verses.find(item => item.number === Number(verse))?.text || '';
                    return { passage, verse:Number(verse), text:verseText ? verseText.slice(range.start,range.end) : 'Scripture text unavailable', tags:range.tags, key:'w-'+passage+'-'+verse+'-'+index, kind:'Phrase' };
                  }))).concat(Object.entries(previewMarkup).flatMap(([passage, verses]) => Object.entries(verses).map(([verse,tags]) => {
                    const chapterData = passage === passageDraftKey ? bible : observationIndexChapters[passage];
                    const verseText = chapterData?.verses.find(item => item.number === Number(verse))?.text || '';
                    return {passage,verse:Number(verse),text:verseText || 'Scripture text unavailable',tags,key:'v-'+passage+'-'+verse,kind:'Verse'};
                  })));
                  const query = observationIndexSearch.trim().toLocaleLowerCase();
                  const filtered = entries.filter(entry =>
                    (observationIndexCategory === 'all' || entry.tags.includes(observationIndexCategory)) &&
                    (!query || (entry.passage.replace('|',' ') + ':' + entry.verse + ' ' + entry.text + ' ' + entry.tags.join(' ') + ' ' + entry.kind).toLocaleLowerCase().includes(query))
                  ).sort((a,b) => {
                    const [ab,ac] = a.passage.split('|'); const [bb,bc] = b.passage.split('|');
                    return ab.localeCompare(bb) || Number(ac)-Number(bc) || a.verse-b.verse || a.kind.localeCompare(b.kind);
                  });
                  const uniqueVerses = new Set(filtered.map(entry => entry.passage+'|'+entry.verse)).size;
                  const groups = filtered.reduce((map,entry) => {
                    const existing = map.get(entry.passage);
                    if (existing) existing.push(entry);
                    else map.set(entry.passage,[entry]);
                    return map;
                  }, new Map<string, typeof filtered>());
                  return <>
                    <div className="observation-index-summary"><span><strong>{filtered.length}</strong> markings</span><span><strong>{uniqueVerses}</strong> verses</span><span><strong>{groups.size}</strong> chapters</span></div>
                    <div className="observation-index-controls">
                      <label className="markup-search-label">Search observations<input type="search" value={observationIndexSearch} onChange={event => setObservationIndexSearch(event.target.value)} placeholder="Search words, verses or passages…" /></label>
                      <label className="markup-search-label">Observation category<select value={observationIndexCategory} onChange={event => setObservationIndexCategory(event.target.value)}><option value="all">All categories</option>{SCRIPTURE_MARKUP_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
                    </div>
                    {observationIndexStatus === 'loading' && <p className="markup-review-empty">Loading Scripture text for marked passages…</p>}
                    {groups.size ? <div className="observation-index-groups">{Array.from(groups.entries()).map(([passage,groupEntries]) => <section className="observation-index-group" key={passage}>
                      <div className="observation-index-group-heading"><strong>{passage.replace('|',' ')}</strong><span>{groupEntries.length} {groupEntries.length===1?'marking':'markings'}</span></div>
                      <ul className="markup-review-list">{groupEntries.map(entry => <li key={entry.key}><button type="button" onClick={() => {const [targetBook,targetChapter]=entry.passage.split('|');setBook(targetBook);setChapter(Number(targetChapter));setView('reader');setSelectedVerseNumbers([entry.verse]);verseSelectionAnchorRef.current=entry.verse;setShowObservationIndex(false);}}><strong>{entry.verse} <small>{entry.kind}</small></strong><span>{entry.text}</span><small>{entry.tags.map(tag=>SCRIPTURE_MARKUP_TYPES.find(type=>type.id===tag)?.label||tag).join(' · ')}</small></button></li>)}</ul>
                    </section>)}</div> : <p className="markup-review-empty">{entries.length ? 'No observations match these filters.' : 'No observations have been marked in your saved preview studies yet.'}</p>}
                  </>;
                })()}
              </section>}
              {showMarkupReview && <section className="markup-review" aria-label="Passage markup review">
                <div className="markup-review-heading"><strong>{book} {chapter} · Markup review</strong><span>Find occurrences and revisit marked verses</span></div>
                <label className="markup-search-label">Find a marked word or phrase<input type="search" value={markupSearch} onChange={event => setMarkupSearch(event.target.value)} placeholder="Search within this chapter…" /></label>
                {(() => {
                  const rows = (bible?.verses || []).flatMap(verse => {
                    const wholeTags = previewMarkup[passageDraftKey]?.[String(verse.number)] || [];
                    const ranges = previewWordMarkup[passageDraftKey]?.[String(verse.number)] || [];
                    const snippets = ranges.map(range => ({text:verse.text.slice(range.start,range.end),tags:range.tags}));
                    const matches = snippets.filter(item => !markupSearch.trim() || item.text.toLocaleLowerCase().includes(markupSearch.trim().toLocaleLowerCase()));
                    const wholeMatch = wholeTags.length && (!markupSearch.trim() || verse.text.toLocaleLowerCase().includes(markupSearch.trim().toLocaleLowerCase()));
                    return [...matches.map(item => ({verse:verse.number,text:item.text,tags:item.tags})), ...(wholeMatch ? [{verse:verse.number,text:verse.text,tags:wholeTags}] : [])];
                  });
                  return rows.length ? <ul className="markup-review-list">{rows.map((row,index)=><li key={row.verse+'-'+index}><button type="button" onClick={() => {setSelectedVerseNumbers([row.verse]);verseSelectionAnchorRef.current=row.verse;setShowMarkupReview(false);}}><strong>{book} {chapter}:{row.verse}</strong><span>{row.text}</span><small>{row.tags.map(tag => SCRIPTURE_MARKUP_TYPES.find(type => type.id===tag)?.label || tag).join(' · ')}</small></button></li>)}</ul> : <p className="markup-review-empty">No markings match this search in the current chapter.</p>;
                })()}
              </section>}
            </div>
            <p className="verse-selection-hint">Click verses to add or remove them. Hold Shift and click another verse to select the entire passage between them.</p>
            <div className="verse-list" style={{fontSize, ...Object.fromEntries(SCRIPTURE_MARKUP_TYPES.map(type => ['--markup-'+type.id, markupColors[type.id]])) as React.CSSProperties}} aria-live="polite" aria-label="Bible verses. Click to select individual verses; Shift-click another verse to select a continuous passage.">
              {loadingBible && <div className="reader-message" role="status">Loading {book} {chapter}…</div>}
              {!loadingBible && bibleError && <div className="reader-error" role="alert"><strong>Scripture could not be loaded.</strong><p>{bibleError}</p><button className="outline-button" type="button" onClick={() => setReaderReload(value => value + 1)}>Try again</button></div>}
              {!loadingBible && !bibleError && bible?.verses.map(verse => {
                const tags = previewMarkup[passageDraftKey]?.[String(verse.number)] || [];
                return <button key={verse.number} type="button" className={selectedVerseNumbers.includes(verse.number)?'verse selected-verse':'verse'} aria-pressed={selectedVerseNumbers.includes(verse.number)} onClick={(event)=>{if(event.shiftKey && verseSelectionAnchorRef.current !== null){setSelectedVerseNumbers(selectVerseRange(verseSelectionAnchorRef.current,verse.number));}else{setSelectedVerseNumbers(current => toggleVerseSelection(current,verse.number));verseSelectionAnchorRef.current=verse.number;}setShowAddToStudy(false);setReaderNotice('');}}><span>{verse.number}</span><p onMouseUp={event=>{const offsets=getSelectedTextOffsets(event.currentTarget, window.getSelection());if(offsets){const selected=window.getSelection()?.toString().trim();if(selected)setSelectedTextMarkup({verse:verse.number,...offsets,text:selected});}}} onKeyUp={event=>{const offsets=getSelectedTextOffsets(event.currentTarget, window.getSelection());if(offsets){const selected=window.getSelection()?.toString().trim();if(selected)setSelectedTextMarkup({verse:verse.number,...offsets,text:selected});}}}>{renderVerseWithAnnotations(verse.text, bible?.annotations?.[String(verse.number)] || [], showStrongs, (id, word) => void openLexicon(id, word), previewWordMarkup[passageDraftKey]?.[String(verse.number)] || [], (start, end) => {
                  setPreviewWordMarkup(previous => {
                    const passage = { ...(previous[passageDraftKey] || {}) };
                    const remaining = (passage[String(verse.number)] || []).filter(range => range.end <= start || range.start >= end);
                    if (remaining.length) passage[String(verse.number)] = remaining; else delete passage[String(verse.number)];
                    const next = { ...previous };
                    if (Object.keys(passage).length) next[passageDraftKey] = passage; else delete next[passageDraftKey];
                    return next;
                  });
                  setSelectedTextMarkup(null);
                  setReaderNotice('Highlight removed.');
                })}{tags.length > 0 && <span className="verse-markup-tags" aria-label={'Observation tags: ' + tags.map(tag => SCRIPTURE_MARKUP_TYPES.find(type => type.id === tag)?.label || tag).join(', ')}>{tags.map(tag => { const type = SCRIPTURE_MARKUP_TYPES.find(item => item.id === tag); return <span className="verse-markup-tag" key={tag}>{type?.symbol} {type?.label}</span>; })}</span>}</p></button>;
              })}
              {!loadingBible && !bibleError && !bible?.verses.length && <div className="reader-message">No verse text was returned for this passage.</div>}
            </div>
            {selectedVerseNumbers.length > 0 && selectedVerseRecords.length > 0 && <div className="verse-action-dock" aria-label="Actions for selected verses">
              <div className="verse-action-context"><div className="verse-action-context-heading"><span className="eyebrow">{selectedVerseRecords.length === 1 ? 'SELECTED VERSE' : 'SELECTED VERSES · ' + selectedVerseRecords.length}</span><button type="button" className="text-button clear-verse-selection" onClick={() => {setSelectedVerseNumbers([]);verseSelectionAnchorRef.current=null;setShowAddToStudy(false);setReaderNotice('Verse selection cleared.');}} aria-label="Clear selected verses">Clear selection ×</button></div><strong>{selectedVerseCitation}</strong><span>{selectedVerseRecords.map(item => item.text).join(' ')}</span></div>
              <div className="verse-action-buttons">
                <button type="button" className="verse-action primary" onClick={() => void copySelectedVerse()}><span aria-hidden="true">▢</span>{selectedVerseRecords.length === 1 ? "Copy verse" : "Copy verses"}</button>
                <button type="button" className="verse-action" onClick={() => setShowAddToStudy(value => !value)} disabled={!selectedVerseRecord}><span aria-hidden="true">＋</span>Add to study</button>
                <button type="button" className="verse-action" onClick={openVerseCrossReference} disabled={!selectedVerseRecord || selectedVerseRecords.length > 1} title={selectedVerseRecords.length > 1 ? "Link passage is available when one verse is selected." : "Link selected verse to another passage"}><span aria-hidden="true">↗</span>{selectedVerseRecords.length > 1 ? "Link one verse" : "Link passage"}</button>
                <button type="button" className="verse-action" onClick={addVerseAsObservation} disabled={!selectedVerseRecord}><span aria-hidden="true">✎</span>Add observation</button>
              </div>
              {showAddToStudy && <div className="add-to-study-panel">
                <div><strong>Add {selectedVerseRecords.length === 1 ? 'verse' : selectedVerseRecords.length + ' verses'} · {selectedVerseCitation} to a study</strong><button type="button" className="text-button" onClick={() => setShowAddToStudy(false)}>Close</button></div>
                <label htmlFor="add-verse-study-target">Choose a study</label>
                <select id="add-verse-study-target" className="reading-select" value={addToStudyTarget} onChange={event => setAddToStudyTarget(event.target.value)}>
                  <option value="current">Current study · {book} {chapter}</option>
                  {allPreviewLibraryEntries.filter(entry => entry.book + '|' + entry.chapter !== passageDraftKey).map(entry => <option key={entry.book + '|' + entry.chapter} value={entry.book + '|' + entry.chapter}>{entry.book} {entry.chapter}</option>)}
                </select>
                <div className="add-to-study-actions"><button type="button" className="primary-button" onClick={() => appendVerseToStudy(addToStudyTarget === 'current' ? passageDraftKey : addToStudyTarget)}>Add to selected study</button><button type="button" className="outline-button" onClick={() => appendVerseToStudy(passageDraftKey)}>Create study for this passage</button></div>
                <p>Preview studies are saved in this browser only. The verse will be added to the Observation stage.</p>
              </div>}
              {readerNotice && <p className="verse-action-notice" role="status">{readerNotice}</p>}
            </div>}
            <div className="reader-footer"><span>Text source: {bible?.source || 'Bible text provider'} · Strong’s annotations are {showStrongs ? 'on' : 'off'}.</span></div>
            {lexiconLoading || lexiconError || lexicon ? <section className="lexicon-panel" aria-live="polite" aria-label="Strong's lexicon entry">
              <div className="lexicon-heading"><div><span className="eyebrow">WORD STUDY · {lexicon?.id || 'LOADING'}</span><h3>{lexiconWord}</h3></div><button className="tool-button" type="button" onClick={() => { lexiconRequestRef.current += 1; setLexicon(null); setLexiconError(''); setLexiconWord(''); setLexiconLoading(false); }} aria-label="Close lexicon entry">×</button></div>
              {lexiconLoading && <p className="lexicon-status">Loading verified lexicon data…</p>}
              {lexiconError && <p className="lexicon-error" role="alert">{lexiconError}</p>}
              {lexicon && <><div className="lexicon-meta"><strong>{lexicon.lemma}</strong><span>{lexicon.transliteration}</span><span>{lexicon.partOfSpeech}</span></div><p className="lexicon-gloss">{lexicon.gloss}</p>{lexicon.senses.map((sense,index)=><div className="lexicon-sense" key={index}><strong>{sense.gloss}</strong><p>{sense.definition}</p></div>)}<a href={lexicon.sourceUrl} target="_blank" rel="noopener noreferrer">{lexicon.source} · Open source record</a></>}
            </section> : null}

            <div className="reader-notice" role="status" aria-live="polite">{readerNotice}</div>
            <div className="reader-source">Text source: {bible?.source || 'Awaiting Scripture source'}. {showStrongs ? 'Showing only source-verified Strong’s annotations; unmatched words remain untagged.' : 'Strong’s annotations are switched off.'}</div>
          </section>
          <section className="notes-panel">
            <div className="notes-topline"><div><span className="eyebrow">YOUR STUDY</span><h2>{current.label}</h2></div><span className="stage-counter">STAGE {current.number} / 04</span></div>
            <div className="stage-question"><div className="question-icon">?</div><div className="question-copy"><strong>{current.question}</strong><p>{current.hint}</p></div><button className="collapse-button" type="button" onClick={()=>setShowGuidance(!showGuidance)}>{showGuidance?'Hide':'Show'} guidance</button></div>
            {showGuidance && <div className="guidance-content"><p>{stage==='observe'?'Record what the text explicitly states. Trace repeated words, people, places, time markers, contrasts, commands and linking words. Avoid explaining meaning or moving to application.':stage==='interpret'?'Examine context, structure, grammar, keywords and linking words. Explain how the author develops the thought and support conclusions from the text.':stage==='doctrine'?'Synthesize what the passage teaches about God, humanity, creation and the wider biblical witness. Distinguish explicit teaching from inference.':'Identify a faithful response grounded in the passage. Make it specific, considered and connected to the meaning established in the earlier stages.'}</p></div>}
            <section className="evidence-handoff" aria-label="Earlier-stage study evidence">
              <div className="evidence-strip">
                <div><span className="evidence-dot"/> <strong>Earlier-stage notes</strong></div>
                <button className="evidence-toggle" type="button" onClick={() => setShowEvidence(value => !value)} aria-expanded={showEvidence} disabled={stage === 'observe' || earlierStageEvidence.length === 0}>
                  {stage === 'observe' ? 'First stage' : earlierStageEvidence.length === 0 ? 'No earlier notes yet' : earlierStageEvidence.length + ' stage' + (earlierStageEvidence.length === 1 ? '' : 's') + ' available'}
                  {earlierStageEvidence.length > 0 ? <span aria-hidden="true">{showEvidence ? '−' : '+'}</span> : null}
                </button>
              </div>
              {showEvidence && earlierStageEvidence.length > 0 ? <div className="evidence-handoff-content">
                {earlierStageEvidence.map(item => <article className="evidence-note" key={item.stage}>
                  <div><strong>{stages.find(candidate => candidate.id === item.stage)?.label}</strong><span>{item.wordCount} words · earlier-stage notes</span></div>
                  <p>{item.text}</p>
                </article>)}
                <p className="evidence-handoff-caption">These are your saved notes from earlier stages of this passage. They are shown as study context; source-linked claims and evidence references will be reconnected in a later integration phase.</p>
              </div> : null}
            </section>
            <div className="editor-heading"><label htmlFor="study-notes">STUDY NOTES</label><div className="editor-tools"><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.max(15,v-1))} aria-label="Decrease notes text size">A−</button><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.min(24,v+1))} aria-label="Increase notes text size">A+</button><span>{wordCount} words</span></div></div>
            <textarea id="study-notes" style={{fontSize: notesFontSize}} value={note} onChange={e=>setDraftsByPassage(prev=>({...prev,[passageDraftKey]:{...emptyNotes,...(prev[passageDraftKey] || {}),activeStage:stage,[stage]:e.target.value}}))} placeholder={'Begin your '+current.label.toLowerCase()+' notes here…\n\nStudy-note cloud storage will be connected in a later, separately verified phase.'}/>
            <div className="editor-footer"><span>{draftSaveStatus === 'saving' ? 'Saving preview draft…' : draftSaveStatus === 'saved' ? 'Auto-saved in this preview only' : 'Browser storage unavailable · draft not saved'}</span><span>Text size {notesFontSize}px</span></div>
            <div className="stage-footer"><button className="outline-button" type="button" onClick={()=>move(-1)} disabled={stage==='observe'}>Previous stage</button><button className="primary-button" type="button" onClick={()=>move(1)} disabled={stage==='apply'}>Continue to next stage <Icon name="chevron"/></button></div>
          </section>
        </div>
      </div>}
    </main>
  </div>;
}
