import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  fetchBibleChapter,
  fetchStrongsLexicon,
  getBibleBook,
  readPreviewDrafts,
  readSavedPassage,
  writePreviewDrafts,
  writeSavedPassage
} from './lib/bible.mjs';
import type { BibleChapter, BibleTranslation, PreviewDrafts, StrongLexiconEntry, StudyStage, WordAnnotation } from './lib/bible.mjs';

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
  const [draftSaveStatus, setDraftSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving');
  const [notesFontSize, setNotesFontSize] = useState(17);
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set());
  const [book, setBook] = useState(initialPassage.book);
  const [chapter, setChapter] = useState(initialPassage.chapter);
  const [translation, setTranslation] = useState<BibleTranslation>(initialPassage.translation);
  const [bible, setBible] = useState<BibleChapter | null>(null);
  const [loadingBible, setLoadingBible] = useState(true);
  const [bibleError, setBibleError] = useState('');
  const [readerReload, setReaderReload] = useState(0);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [readerNotice, setReaderNotice] = useState('');
  const [showStrongs, setShowStrongs] = useState(false);
  const [lexicon, setLexicon] = useState<StrongLexiconEntry | null>(null);
  const [lexiconWord, setLexiconWord] = useState('');
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [lexiconError, setLexiconError] = useState('');
  const lexiconRequestRef = useRef(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [fontSize, setFontSize] = useState(19);

  const current = stages.find(s => s.id === stage)!;
  const passageDraftKey = book + '|' + chapter;
  const emptyNotes: Record<Stage, string> = { observe: '', interpret: '', doctrine: '', apply: '' };
  const notesByStage = draftsByPassage[passageDraftKey] || emptyNotes;
  const note = notesByStage[stage];
  const wordCount = useMemo(() => note.trim() ? note.trim().split(/\s+/).length : 0, [note]);
  const bookInfo = getBibleBook(book)!;

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
    setSelectedVerse(1);
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

  const move = (direction: number) => {
    const index = stages.findIndex(s => s.id === stage);
    setStage(stages[Math.max(0, Math.min(3, index + direction))].id);
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

  const copySelectedVerse = async () => {
    const verse = bible?.verses.find(item => item.number === selectedVerse);
    if (!verse) return;
    const text = book + ' ' + chapter + ':' + verse.number + ' (' + translation + ') — ' + verse.text;
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
      <button className="nav-item active" type="button"><Icon name="home"/>Overview</button>
      <button className="nav-item" type="button" onClick={() => setShowLibrary(!showLibrary)}><Icon name="library"/>Study library</button>
      <button className="nav-item" type="button" onClick={() => setShowLibrary(false)}><Icon name="book"/>Bible reader</button>
      <div className="sidebar-divider"/>
      <div className="workspace-label">RESEARCH</div>
      <button className="nav-item nav-disabled" type="button" disabled title="Research tools are being integrated in a later rebuild phase"><Icon name="search"/>Word studies</button>
      <button className="nav-item nav-disabled" type="button" disabled title="Cross-reference integration is planned after the study data adapter"><Icon name="panel"/>Cross-references</button>
      <button className="nav-item nav-disabled" type="button" disabled title="AI guidance will be reconnected after the contextual data adapter is complete"><Icon name="spark"/>AI study guide</button>
      <div className="sidebar-bottom"><div className="avatar">J</div><div><strong>Study workspace</strong><span>Preview environment</span></div><button className="icon-button" aria-label="Settings" type="button" disabled><Icon name="settings"/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="crumbs"><span>My studies</span><Icon name="chevron"/><strong>{book} {chapter}</strong></div>
        <div className="top-actions"><span className="sync-status"><i/> Preview · Scripture read-only</span><button className="soft-button" type="button" disabled title="AI guidance is not connected in this phase"><Icon name="spark"/> AI Guide</button><button className="profile" type="button" disabled>J</button></div>
      </header>
      {showLibrary ? <section className="library-view"><div className="eyebrow">YOUR LIBRARY</div><h1>Study library</h1><p>This preview is not yet connected to saved studies. Your existing library remains safely in the current IBS application.</p><button className="outline-button library-return" type="button" onClick={() => setShowLibrary(false)}>Return to Scripture workspace</button></section> :
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
        <nav className="stage-nav" aria-label="Study stages">{stages.map(s => <button key={s.id} className={stage===s.id?'stage-tab selected':'stage-tab'} type="button" onClick={() => setStage(s.id)}><span className="stage-number">{s.number}</span><span>{s.label}</span>{completedStages.has(s.id) && <span className="stage-done">✓</span>}</button>)}</nav>
        <div className="workspace">
          <section className="scripture-panel">
            <div className="panel-heading"><div><span className="eyebrow">SCRIPTURE</span><h2>{book} {chapter}</h2></div><div className="reader-tools"><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.max(16,v-1))} aria-label="Decrease Scripture text size">A−</button><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.min(25,v+1))} aria-label="Increase Scripture text size">A+</button><button className={showStrongs ? 'tool-button strongs-toggle active' : 'tool-button strongs-toggle'} type="button" aria-pressed={showStrongs} onClick={() => setShowStrongs(value => !value)}>Strong’s {showStrongs ? 'On' : 'Off'}</button></div></div>
            <div className="reading-meta"><span>{translation === 'KJV' ? 'King James Version' : translation === 'BSB' ? 'Berean Standard Bible' : translation}</span><span>{chapter} of {bookInfo.chapters}</span></div>
            <div className="reader-navigation">
              <button type="button" className="outline-button" onClick={() => changeChapter(-1)} disabled={book === BIBLE_BOOKS[0].name && chapter === 1}>← Previous</button>
              <span>{book} {chapter}</span>
              <button type="button" className="outline-button" onClick={() => changeChapter(1)} disabled={book === BIBLE_BOOKS[BIBLE_BOOKS.length - 1].name && chapter === bookInfo.chapters}>Next →</button>
            </div>
            <div className="verse-list" style={{fontSize}} aria-live="polite">
              {loadingBible && <div className="reader-message" role="status">Loading {book} {chapter}…</div>}
              {!loadingBible && bibleError && <div className="reader-error" role="alert"><strong>Scripture could not be loaded.</strong><p>{bibleError}</p><button className="outline-button" type="button" onClick={() => setReaderReload(value => value + 1)}>Try again</button></div>}
              {!loadingBible && !bibleError && bible?.verses.map(verse => <button key={verse.number} type="button" className={selectedVerse===verse.number?'verse selected-verse':'verse'} onClick={()=>{setSelectedVerse(verse.number);setReaderNotice('');}}><span>{verse.number}</span><p>{renderVerseWithAnnotations(verse.text, bible?.annotations?.[String(verse.number)] || [], showStrongs, (id, word) => void openLexicon(id, word))}</p></button>)}
              {!loadingBible && !bibleError && !bible?.verses.length && <div className="reader-message">No verse text was returned for this passage.</div>}
            </div>
            <div className="reader-footer"><span>Selected verse: {book} {chapter}:{selectedVerse}</span><button type="button" className="text-button" onClick={() => void copySelectedVerse()} disabled={!bible?.verses.some(verse => verse.number === selectedVerse)}>Copy verse ↗</button></div>
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
            <div className="evidence-strip"><div><span className="evidence-dot"/> <strong>Evidence from earlier stages</strong></div><span>{stage==='observe'?'No earlier-stage evidence yet':'Available after study integration'}</span></div>
            <div className="editor-heading"><label htmlFor="study-notes">STUDY NOTES</label><div className="editor-tools"><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.max(15,v-1))} aria-label="Decrease notes text size">A−</button><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.min(24,v+1))} aria-label="Increase notes text size">A+</button><span>{wordCount} words</span></div></div>
            <textarea id="study-notes" style={{fontSize: notesFontSize}} value={note} onChange={e=>setDraftsByPassage(prev=>({...prev,[passageDraftKey]:{...emptyNotes,...(prev[passageDraftKey] || {}),[stage]:e.target.value}}))} placeholder={'Begin your '+current.label.toLowerCase()+' notes here…\n\nStudy-note cloud storage will be connected in a later, separately verified phase.'}/>
            <div className="editor-footer"><span>{draftSaveStatus === 'saving' ? 'Saving preview draft…' : draftSaveStatus === 'saved' ? 'Auto-saved in this preview only' : 'Browser storage unavailable · draft not saved'}</span><span>Text size {notesFontSize}px</span></div>
            <div className="stage-footer"><button className="outline-button" type="button" onClick={()=>move(-1)} disabled={stage==='observe'}>Previous stage</button><button className="primary-button" type="button" onClick={()=>{setCompletedStages(prev=>new Set(prev).add(stage));move(1);}} disabled={stage==='apply'}>Continue to next stage <Icon name="chevron"/></button></div>
          </section>
        </div>
      </div>}
    </main>
  </div>;
}
