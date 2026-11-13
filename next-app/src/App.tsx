import { useEffect, useMemo, useRef, useState } from 'react';
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
import { addPreviewCrossReference, deletePreviewCrossReference, formatCrossReference, readPreviewCrossReferences, writePreviewCrossReferences } from './lib/cross-references.mjs';
import type { PreviewCrossReference } from './lib/cross-references.mjs';

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

function renderVerseWithAnnotations(
  text: string,
  annotations: WordAnnotation[],
  enabled: boolean,
  onWordClick: (id: string, word: string) => void
) {
  if (!enabled || !Array.isArray(annotations) || annotations.length === 0) return text;
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
    if (item.start > cursor) parts.push(text.slice(cursor, item.start));
    const word = text.slice(item.start, item.end);
    const detail = [item.originalText, item.transliteration, item.parsingFull || item.parsing].filter(Boolean).join(' · ');
    parts.push(
      <button className="strongs-token" type="button" key={item.start + '-' + item.end}
        title={detail || ('Open ' + id)} onClick={() => onWordClick(id, word)}>
        {word}<sup>{id}</sup>
      </button>
    );
    cursor = item.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

const initialPassage = readSavedPassage() || { book: 'Genesis', chapter: 1, translation: 'KJV' as BibleTranslation };

export default function App() {
  const [stage, setStage] = useState<Stage>('observe');
  const [draftsByPassage, setDraftsByPassage] = useState<PreviewDrafts>(() => readPreviewDrafts());
  const [previewMarkup, setPreviewMarkup] = useState(() => readPreviewMarkup());
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
  const [readerNotice, setReaderNotice] = useState('');
  const [showStrongs, setShowStrongs] = useState(false);
  const [lexicon, setLexicon] = useState<StrongLexiconEntry | null>(null);
  const [lexiconWord, setLexiconWord] = useState('');
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [lexiconError, setLexiconError] = useState('');
  const lexiconRequestRef = useRef(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);
  const [view, setView] = useState<'overview' | 'library' | 'reader' | 'references'>('overview');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [fontSize, setFontSize] = useState(19);
  const [previewCrossReferences, setPreviewCrossReferences] = useState<PreviewCrossReference[]>(() => readPreviewCrossReferences());
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
  const selectedVerseMarkup = selectedVerse === null ? [] : previewMarkup[passageDraftKey]?.[String(selectedVerse)] || [];
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
    writePreviewMarkup(previewMarkup);
  }, [previewMarkup]);

  useEffect(() => { writePreviewCrossReferences(previewCrossReferences); }, [previewCrossReferences]);

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
    lexiconRequestRef.current += 1;
    setLexicon(null);
    setLexiconError('');
    setLexiconLoading(false);
    setLexiconWord('');
    writeSavedPassage({ book, chapter, translation });

    fetchBibleChapter(book, chapter, translation, { signal: controller.signal })
      .then(result => setBible(result))
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
    setView('reader');
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
  const selectedVerseQuote = selectedVerseRecords.map(item => book + ' ' + chapter + ':' + item.number + ' (' + translation + '): “' + item.text + '”').join('\n');

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
      [targetKey]: { ...(previous[targetKey] || currentDraft), [targetStage]: existing.trim() ? existing + addition : addition.trim(), activeStage: targetStage }
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
      <div className="sidebar-divider"/>
      <div className="workspace-label">RESEARCH</div>
      <button className="nav-item nav-disabled" type="button" disabled title="Research tools are being integrated in a later rebuild phase"><Icon name="search"/>Word studies</button>
      <button className={view === 'references' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('references')}><Icon name="panel"/>Cross-references<span className="nav-count">{previewCrossReferences.length}</span></button>
      <button className="nav-item nav-disabled" type="button" disabled title="AI guidance will be reconnected after the contextual data adapter is complete"><Icon name="spark"/>AI study guide</button>
      <div className="sidebar-bottom"><div className="avatar">J</div><div><strong>Study workspace</strong><span>Preview environment</span></div><button className="icon-button" aria-label="Settings" type="button" disabled><Icon name="settings"/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="crumbs"><span>Workspace</span><Icon name="chevron"/><strong>{view === 'overview' ? 'Overview' : view === 'library' ? 'Study library' : view === 'references' ? 'Cross-references' : book + ' ' + chapter}</strong></div>
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
              <button type="button" onClick={() => resumePreviewDraft(entry)}>Resume this study <Icon name="chevron"/></button>
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
        <div className="library-header"><div><div className="eyebrow">RESEARCH · PASSAGE CONNECTIONS</div><h1>Cross-references</h1><p>Record connections between passages as you study. These are your own preview references, not an imported or verified standard reference database.</p></div><button className="outline-button" type="button" onClick={() => setView('reader')}>Return to Scripture</button></div>
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
        </div><p className="reference-disclaimer">This workspace stores user-created links only. Standard Bible cross-references and the legacy related-passage dataset have not yet been imported into this preview.</p>
      </section> :
      <div className="study-page">
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
        <nav className="stage-nav" aria-label="Study stages">{stages.map(s => <button key={s.id} className={stage===s.id?'stage-tab selected':'stage-tab'} type="button" onClick={() => changeStage(s.id)}><span className="stage-number">{s.number}</span><span>{s.label}</span>{stagesWithNotes.has(s.id) && <span className="stage-done" title="Notes recorded" aria-label="Notes recorded">✓</span>}</button>)}</nav>
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
              <div className="markup-toolbar-heading"><strong>Observation markup</strong><span>{selectedVerse === null ? 'Select a verse to apply observation markup.' : 'Selected verse: ' + book + ' ' + chapter + ':' + selectedVerse}</span></div>
              <div className="markup-options">
                {SCRIPTURE_MARKUP_TYPES.map(type => {
                  const active = selectedVerseMarkup.includes(type.id);
                  return <button key={type.id} type="button" className={active ? 'markup-chip active' : 'markup-chip'} aria-pressed={active} title={type.label + (active ? ' · remove from verse' : ' · add to verse')} disabled={selectedVerseNumbers.length === 0} onClick={() => { if (selectedVerseNumbers.length) setPreviewMarkup(previous => selectedVerseNumbers.reduce((next, verseNumber) => toggleVerseMarkup(next, passageDraftKey, verseNumber, type.id), previous)); }}>
                    <span className="markup-symbol">{type.symbol}</span>{type.label}
                  </button>;
                })}
              </div>
              <p className="markup-storage-note">Tags are saved in this browser preview only.</p>
            </div>
            <div className="verse-list" style={{fontSize}} aria-live="polite">
              {loadingBible && <div className="reader-message" role="status">Loading {book} {chapter}…</div>}
              {!loadingBible && bibleError && <div className="reader-error" role="alert"><strong>Scripture could not be loaded.</strong><p>{bibleError}</p><button className="outline-button" type="button" onClick={() => setReaderReload(value => value + 1)}>Try again</button></div>}
              {!loadingBible && !bibleError && bible?.verses.map(verse => {
                const tags = previewMarkup[passageDraftKey]?.[String(verse.number)] || [];
                return <button key={verse.number} type="button" className={selectedVerseNumbers.includes(verse.number)?'verse selected-verse':'verse'} aria-pressed={selectedVerseNumbers.includes(verse.number)} onClick={()=>{setSelectedVerseNumbers(current => current.includes(verse.number) ? current.filter(number => number !== verse.number) : [...current, verse.number].sort((a,b)=>a-b));setShowAddToStudy(false);setReaderNotice('');}}><span>{verse.number}</span><p>{renderVerseWithAnnotations(verse.text, bible?.annotations?.[String(verse.number)] || [], showStrongs, (id, word) => void openLexicon(id, word))}{tags.length > 0 && <span className="verse-markup-tags" aria-label={'Observation tags: ' + tags.map(tag => SCRIPTURE_MARKUP_TYPES.find(type => type.id === tag)?.label || tag).join(', ')}>{tags.map(tag => { const type = SCRIPTURE_MARKUP_TYPES.find(item => item.id === tag); return <span className="verse-markup-tag" key={tag}>{type?.symbol} {type?.label}</span>; })}</span>}</p></button>;
              })}
              {!loadingBible && !bibleError && !bible?.verses.length && <div className="reader-message">No verse text was returned for this passage.</div>}
            </div>
            {selectedVerseNumbers.length > 0 && selectedVerseRecords.length > 0 && <div className="verse-action-dock" aria-label="Actions for selected verses">
              <div className="verse-action-context"><div className="verse-action-context-heading"><span className="eyebrow">{selectedVerseRecords.length === 1 ? 'SELECTED VERSE' : 'SELECTED VERSES · ' + selectedVerseRecords.length}</span><button type="button" className="text-button clear-verse-selection" onClick={() => {setSelectedVerseNumbers([]);setShowAddToStudy(false);setReaderNotice('Verse selection cleared.');}} aria-label="Clear selected verses">Clear selection ×</button>}</div><strong>{selectedVerseCitation}</strong><span>{selectedVerseRecords.map(item => item.text).join(' ')}</span></div>
              <div className="verse-action-buttons">
                <button type="button" className="verse-action primary" onClick={() => void copySelectedVerse()}><span aria-hidden="true">▢</span>{selectedVerseRecords.length === 1 ? "Copy verse" : "Copy verses"}</button>
                <button type="button" className="verse-action" onClick={() => setShowAddToStudy(value => !value)} disabled={!selectedVerseRecord}><span aria-hidden="true">＋</span>Add to study</button>
                <button type="button" className="verse-action" onClick={openVerseCrossReference} disabled={!selectedVerseRecord}><span aria-hidden="true">↗</span>Link passage</button>
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
