import { useMemo, useState } from 'react';
import './styles.css';

type Stage = 'observe' | 'interpret' | 'doctrine' | 'apply';
const stages: { id: Stage; number: string; label: string; question: string; hint: string }[] = [
  { id: 'observe', number: '01', label: 'Observe', question: 'What does the passage say?', hint: 'Notice what is present before deciding what it means.' },
  { id: 'interpret', number: '02', label: 'Interpret', question: 'What does the passage mean?', hint: 'Use context, structure, words and the author’s flow of thought.' },
  { id: 'doctrine', number: '03', label: 'Doctrine', question: 'What does this teach about God and truth?', hint: 'Form theological conclusions from the meaning established in the text.' },
  { id: 'apply', number: '04', label: 'Discipleship', question: 'How should I respond?', hint: 'Move from the meaning of the passage to faithful, specific obedience.' }
];
const verses = [
  ['1', 'In the beginning God created the heaven and the earth.'],
  ['2', 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.'],
  ['3', 'And God said, Let there be light: and there was light.'],
  ['4', 'And God saw the light, that it was good: and God divided the light from the darkness.'],
  ['5', 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.'],
  ['6', 'And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.'],
  ['7', 'And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.'],
  ['8', 'And God called the firmament Heaven. And the evening and the morning were the second day.']
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
export default function App() {
  const [stage, setStage] = useState<Stage>('observe');
  const [notesByStage, setNotesByStage] = useState<Record<Stage, string>>({ observe: '', interpret: '', doctrine: '', apply: '' });
  const [notesFontSize, setNotesFontSize] = useState(17);
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set());
  const note = notesByStage[stage];
  const [selected, setSelected] = useState('1');
  const [showGuidance, setShowGuidance] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [fontSize, setFontSize] = useState(19);
  const current = stages.find(s => s.id === stage)!;
  const wordCount = useMemo(() => note.trim() ? note.trim().split(/\s+/).length : 0, [note]);
  const move = (direction: number) => {
    const index = stages.findIndex(s => s.id === stage);
    setStage(stages[Math.max(0, Math.min(3, index + direction))].id);
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div><strong>IBS</strong><span>WORD OF LIFE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="nav-item active"><Icon name="home"/>Overview</button>
      <button className="nav-item" onClick={() => setShowLibrary(!showLibrary)}><Icon name="library"/>Study library<span className="nav-count">12</span></button>
      <button className="nav-item"><Icon name="book"/>Bible reader</button>
      <div className="sidebar-divider"/>
      <div className="workspace-label">RESEARCH</div>
      <button className="nav-item"><Icon name="search"/>Word studies</button>
      <button className="nav-item"><Icon name="panel"/>Cross-references</button>
      <button className="nav-item"><Icon name="spark"/>AI study guide</button>
      <div className="sidebar-bottom"><div className="avatar">J</div><div><strong>Study workspace</strong><span>Personal library</span></div><button className="icon-button" aria-label="Settings"><Icon name="settings"/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="crumbs"><span>My studies</span><Icon name="chevron"/><strong>Genesis 1</strong></div>
        <div className="top-actions"><span className="sync-status"><i/> Preview · local draft</span><button className="soft-button"><Icon name="spark"/> AI Guide</button><button className="profile">J</button></div>
      </header>
      {showLibrary ? <section className="library-view"><div className="eyebrow">YOUR LIBRARY</div><h1>Study library</h1><p>Return to a study or begin a new passage.</p><div className="study-card"><div><span className="tag">IN PROGRESS</span><h3>Genesis 1 — Creation</h3><p>Last studied today · Observation</p></div><button className="primary-button" onClick={() => setShowLibrary(false)}>Resume study</button></div></section> :
      <div className="study-page">
        <section className="study-heading"><div><div className="eyebrow">INDUCTIVE STUDY <span>•</span> OLD TESTAMENT</div><h1>Genesis <em>1</em></h1><p>Creation · The beginning of all things</p></div><div className="heading-actions"><button className="soft-button">KJV <span>⌄</span></button><button className="outline-button">Passage options</button></div></section>
        <nav className="stage-nav" aria-label="Study stages">{stages.map((s,i) => <button key={s.id} className={stage===s.id?'stage-tab selected':'stage-tab'} onClick={() => setStage(s.id)}><span className="stage-number">{s.number}</span><span>{s.label}</span>{completedStages.has(s.id) && <span className="stage-done">✓</span>}</button>)}</nav>
        <div className="workspace">
          <section className="scripture-panel">
            <div className="panel-heading"><div><span className="eyebrow">SCRIPTURE</span><h2>Genesis 1</h2></div><div className="reader-tools"><button className="tool-button" onClick={() => setFontSize(v=>Math.max(16,v-1))}>A−</button><button className="tool-button" onClick={() => setFontSize(v=>Math.min(25,v+1))}>A+</button><button className="tool-button">KJV</button></div></div>
            <div className="reading-meta"><span>King James Version</span><span>Chapter 1 of 50</span></div>
            <div className="verse-list" style={{fontSize}}>{verses.map(([n,t])=><button key={n} className={selected===n?'verse selected-verse':'verse'} onClick={()=>setSelected(n)}><span>{n}</span><p>{t}</p></button>)}</div>
            <div className="reader-footer"><span>Selected verse: Genesis 1:{selected}</span><button className="text-button">Copy verse ↗</button></div>
          </section>
          <section className="notes-panel">
            <div className="notes-topline"><div><span className="eyebrow">YOUR STUDY</span><h2>{current.label}</h2></div><span className="stage-counter">STAGE {current.number} / 04</span></div>
            <div className="stage-question"><div className="question-icon">?</div><div className="question-copy"><strong>{current.question}</strong><p>{current.hint}</p></div><button className="collapse-button" onClick={()=>setShowGuidance(!showGuidance)}>{showGuidance?'Hide':'Show'} guidance</button></div>
            {showGuidance && <div className="guidance-content"><p>{stage==='observe'?'Record what the text explicitly states. Trace repeated words, people, places, time markers, contrasts, commands and linking words. Avoid explaining meaning or moving to application.':stage==='interpret'?'Examine context, structure, grammar, keywords and linking words. Explain how the author develops the thought and support conclusions from the text.':stage==='doctrine'?'Synthesize what the passage teaches about God, humanity, creation and the wider biblical witness. Distinguish explicit teaching from inference.':'Identify a faithful response grounded in the passage. Make it specific, considered and connected to the meaning established in the earlier stages.'}</p></div>}
            <div className="evidence-strip"><div><span className="evidence-dot"/> <strong>Evidence from earlier stages</strong></div><span>{stage==='observe'?'No earlier-stage evidence yet':'Available when linked'}</span></div>
            <div className="editor-heading"><label htmlFor="study-notes">STUDY NOTES</label><div className="editor-tools"><button className="tool-button" onClick={()=>setNotesFontSize(v=>Math.max(15,v-1))} aria-label="Decrease notes text size">A−</button><button className="tool-button" onClick={()=>setNotesFontSize(v=>Math.min(24,v+1))} aria-label="Increase notes text size">A+</button><span>{wordCount} words</span></div></div>
            <textarea id="study-notes" style={{fontSize: notesFontSize}} value={note} onChange={e=>setNotesByStage(prev=>({...prev,[stage]:e.target.value}))} placeholder={'Begin your '+current.label.toLowerCase()+' notes here…\n\nRecord your observations and connect each conclusion to the passage.'}/>
            <div className="editor-footer"><span>Draft stays in this preview only</span><span>Text size {fontSize}px</span></div>
            <div className="stage-footer"><button className="outline-button" onClick={()=>move(-1)} disabled={stage==='observe'}>Previous stage</button><button className="primary-button" onClick={()=>{setCompletedStages(prev=>new Set(prev).add(stage));move(1);}} disabled={stage==='apply'}>Continue to next stage <Icon name="chevron"/></button></div>
          </section>
        </div>
      </div>}
    </main>
  </div>;
}
