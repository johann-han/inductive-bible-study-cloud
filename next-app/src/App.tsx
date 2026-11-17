import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import './evidence-manager.css';
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
import { explainMorphology } from './lib/morphology-explainer.mjs';
import { addPreviewCrossReference, deletePreviewCrossReference, formatCrossReference, readPreviewCrossReferences, writePreviewCrossReferences } from './lib/cross-references.mjs';
import type { PreviewCrossReference } from './lib/cross-references.mjs';
import { selectVerseRange, toggleVerseSelection } from './lib/verse-selection.mjs';
import { loadStandardCrossReferences, STANDARD_XREF_SOURCE, parseStandardReference } from './lib/standard-cross-references.mjs';
import type { StandardCrossReferenceRow } from './lib/standard-cross-references.mjs';
import { buildComparisonPassageImport, filterTheologicalTensionRecords, listTheologicalTensionRecords } from './lib/theological-tensions.mjs';
import { appendTheologicalTensionHistory, buildTheologicalTensionDossier } from './lib/theological-tensions.mjs';
import type { IndexedTheologicalTension, TensionHistoryEventType, TheologicalTensionHistoryEntry } from './lib/theological-tensions.mjs';

type Stage = 'observe' | 'interpret' | 'doctrine' | 'apply';
type EvidenceKind = 'Scripture' | 'Cross-reference' | 'Lexicon / Strong’s' | 'Original-language research' | 'Historical / contextual source';
type EvidenceRelationship = 'supports' | 'challenges' | 'qualifies' | 'context';
type EvidenceQuality = 'unassessed' | 'strong' | 'moderate' | 'limited';
type EvidenceVerification = 'not_checked' | 'source_opened' | 'content_checked' | 'corroborated';
type ClaimSynthesisStatus = 'under_review' | 'provisional' | 'ready_for_doctrine' | 'revisit';
type ClaimSynthesis = { status: ClaimSynthesisStatus; conclusion: string; reasoning: string; updatedAt: string };
type DoctrineReview = { claimLevel: 'explicit' | 'necessary_implication' | 'broader_inference' | ''; supportingPassages: string; tensions: string; formulation: string; unresolved: string; approved: boolean; updatedAt: string };
type TheologicalTension = { id: string; passageA: string; contextA: string; passageB: string; contextB: string; issue: string; analysis: string; uncertainty: string; resolution?: string; resolutionRationale?: string; assessment: 'unclassified' | 'apparent_tension' | 'complementary' | 'unresolved' | 'perceived_contradiction'; status: 'open' | 'under_review' | 'provisionally_addressed' | 'researcher_resolved'; history?: TheologicalTensionHistoryEntry[]; updatedAt: string };
type TensionHistoryDraft = { eventType: TensionHistoryEventType; researcherPosition: string; rationale: string; evidenceConsidered: string };
const THEOLOGICAL_TENSION_STORAGE_KEY = 'ibs-next-generation-preview-theological-tensions-v1';
function readTheologicalTensions(): Record<string, TheologicalTension[]> { try { const parsed = JSON.parse(window.localStorage.getItem(THEOLOGICAL_TENSION_STORAGE_KEY) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
const DOCTRINE_REVIEW_STORAGE_KEY = 'ibs-next-generation-preview-doctrine-reviews-v1';
function readDoctrineReviews(): Record<string, DoctrineReview> { try { const parsed = JSON.parse(window.localStorage.getItem(DOCTRINE_REVIEW_STORAGE_KEY) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
const CLAIM_SYNTHESIS_STORAGE_KEY = 'ibs-next-generation-preview-claim-synthesis-v1';
function readClaimSynthesis(): Record<string, ClaimSynthesis> {
  try { const parsed = JSON.parse(window.localStorage.getItem(CLAIM_SYNTHESIS_STORAGE_KEY) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
function claimSynthesisKey(passage: string, claim: string) { return passage + '::' + claim.trim().toLocaleLowerCase(); }
type EvidenceRecord = { id: string; passageKey: string; stage: Stage; claim: string; relationship?: EvidenceRelationship; sourceQuality?: EvidenceQuality; sourceQualityRationale?: string; verificationStatus?: EvidenceVerification; verificationRationale?: string; assessmentRationale?: string; kind: EvidenceKind; reference: string; detail: string; source: string; sourceUrl?: string; sourceId?: string; createdAt: string };
const EVIDENCE_STORAGE_KEY = 'ibs-next-generation-preview-evidence-v1';
function readPreviewEvidence(): EvidenceRecord[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EVIDENCE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is EvidenceRecord => item && typeof item.id === 'string' && typeof item.passageKey === 'string' && ['observe','interpret','doctrine','apply'].includes(item.stage) && typeof item.claim === 'string' && typeof item.reference === 'string' && typeof item.detail === 'string');
  } catch { return []; }
}

const stages: { id: Stage; number: string; label: string; question: string; hint: string }[] = [
  { id: 'observe', number: '01', label: 'Observe', question: 'What does the passage say?', hint: 'Notice what is present before deciding what it means.' },
  { id: 'interpret', number: '02', label: 'Interpret', question: 'What does the passage mean?', hint: 'Use context, structure, words and the author’s flow of thought.' },
  { id: 'doctrine', number: '03', label: 'Doctrine', question: 'What does this teach about God and truth?', hint: 'Form theological conclusions from the meaning established in the text.' },
  { id: 'apply', number: '04', label: 'Discipleship', question: 'How should I respond?', hint: 'Move from the meaning of the passage to faithful, specific obedience.' }
];

const stageMethod: Record<Stage, { title: string; steps: string[]; review: string[] }> = {
  observe: {
    title: 'Read closely before explaining',
    steps: ['Read the whole passage in its paragraph and chapter context.', 'Record what is actually present: people, actions, places, time, repeated words, contrasts and commands.', 'Notice connecting words and the relationships they signal without deciding their full meaning yet.'],
    review: ['Can each observation be located in a specific verse?', 'Have I kept observation separate from interpretation and application?']
  },
  interpret: {
    title: 'Follow the author’s line of thought',
    steps: ['Establish the immediate context, speaker, audience, occasion and place in the book.', 'Trace the sentence and paragraph structure. Identify the main assertion and how supporting clauses develop it.', 'Examine linking words in context: “for/because” may give a reason; “therefore/so” may draw a conclusion; “but/however” may introduce contrast; “so that/in order that” may express purpose or result; “if” may introduce a condition; “then/after” may mark sequence.', 'Identify what each connector links. Do not assign a fixed meaning to a word without checking how the sentence uses it.', 'Examine key terms, grammar and relevant cross-references; explain the meaning that best accounts for the whole passage.'],
    review: ['Have I explained how the clauses and paragraphs relate, rather than merely listing linking words?', 'Does my interpretation fit the immediate and wider context?', 'Can I show the textual reasons for each major conclusion?', 'Have I avoided moving prematurely into doctrinal conclusions or personal application?']
  },
  doctrine: {
    title: 'Draw theological conclusions from established meaning',
    steps: ['Begin with the meaning established in Interpretation, not an isolated phrase.', 'State what the passage explicitly teaches about God, humanity, sin, salvation, the people of God or faithful living, where relevant.', 'Distinguish direct statements from necessary implications and broader theological inferences.', 'Compare with relevant Scripture in context; do not use a cross-reference to override the passage being studied.', 'Form a concise doctrinal statement and record the verses that support it.'],
    review: ['Is this conclusion grounded in the passage’s meaning?', 'Have I distinguished explicit teaching from inference?', 'Do the supporting texts genuinely address the same subject in context?', 'Have I avoided claiming more than the evidence establishes?']
  },
  apply: {
    title: 'Respond faithfully to the meaning of the passage',
    steps: ['Identify the enduring truth or principle established through Interpretation and Doctrine.', 'Consider the original audience and the difference between their situation and yours.', 'Name a specific response: belief to embrace, action to take, attitude to change, relationship to address or practice to continue.', 'Make the response concrete and proportionate to what the passage teaches.', 'Express the response in prayer and, where appropriate, consider how it is lived within the Christian community.'],
    review: ['Does this response arise from the passage rather than personal preference?', 'Is it specific enough to put into practice?', 'Have I avoided turning a descriptive detail into a command without textual warrant?']
  }
};

const stagePromptTemplates: Record<Stage, { label: string; text: string }[]> = {
  observe: [
    { label: 'Repeated words', text: 'Repeated words and phrases:\n' },
    { label: 'Commands', text: 'Commands and instructions:\n' },
    { label: 'Contrasts', text: 'Contrasts and comparisons:\n' },
    { label: 'Connections', text: 'Connecting words (therefore, for, but, so that):\n' },
    { label: 'People and actions', text: 'People, actions and responses:\n' },
    { label: 'Structure', text: 'Paragraph structure and flow:\n' }
  ],
  interpret: [
    { label: 'Context', text: 'Immediate and wider context:\n' },
    { label: 'Key words', text: 'Key words and phrases:\n' },
    { label: 'Grammar', text: 'Grammar and sentence relationships:\n' },
    { label: 'Author’s purpose', text: 'Author’s purpose and line of thought:\n' },
    { label: 'Cross-references', text: 'Relevant cross-references:\n' },
    { label: 'Meaning', text: 'Meaning supported by the text:\n' }
  ],
  doctrine: [
    { label: 'Truth about God', text: 'What this passage reveals about God:\n' },
    { label: 'Truth about people', text: 'What this passage teaches about humanity:\n' },
    { label: 'Biblical principles', text: 'Biblical principles established by the passage:\n' },
    { label: 'Supporting texts', text: 'Supporting Scripture passages:\n' },
    { label: 'Conclusion', text: 'Doctrinal conclusion grounded in the text:\n' }
  ],
  apply: [
    { label: 'Personal response', text: 'Personal response:\n' },
    { label: 'Obedience', text: 'A specific step of obedience:\n' },
    { label: 'Character', text: 'Attitudes or character to cultivate or change:\n' },
    { label: 'Relationships', text: 'Implications for relationships and community:\n' },
    { label: 'Prayer', text: 'Prayer in response to this passage:\n' }
  ]
};

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
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.book} /></svg>;
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
  wordMarks: WordMarkupRange[] = [],
  onRemoveWordMark?: (start: number, end: number) => void,
  onWordClick?: (id: string, word: string, annotation: WordAnnotation) => void
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
    const researchAction = item.parsingFull || item.parsing
      ? 'Open Strong’s word study and grammar explanation'
      : 'Open Strong’s word study';
    parts.push(
      <button className="strongs-token" type="button" key={item.start + '-' + item.end}
        data-strongs-id={id} data-word={word} data-start={item.start} data-end={item.end}
        data-original-text={item.originalText} data-transliteration={item.transliteration}
        data-parsing={item.parsing} data-parsing-full={item.parsingFull}
        data-language={item.language} data-gloss={item.gloss}
        onClickCapture={event => { event.preventDefault(); event.stopPropagation(); onWordClick?.(id, word, item); }}
        title={(detail ? detail + ' · ' : '') + researchAction} aria-label={researchAction + ' for ' + word + ', ' + id}>
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
  const [observationIndexKind, setObservationIndexKind] = useState<'all' | 'Phrase' | 'Verse'>('all');
  const [observationIndexNotice, setObservationIndexNotice] = useState('');
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
  const [selectedMorphology, setSelectedMorphology] = useState<WordAnnotation | null>(null);
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [lexiconExpanded, setLexiconExpanded] = useState(false);
  const [lexiconError, setLexiconError] = useState('');
  const lexiconRequestRef = useRef(0);
  const [showGuidance, setShowGuidance] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>(() => typeof window === 'undefined' ? [] : readPreviewEvidence());
  const [claimSyntheses, setClaimSyntheses] = useState<Record<string, ClaimSynthesis>>(() => typeof window === 'undefined' ? {} : readClaimSynthesis());
  const [doctrineReviews, setDoctrineReviews] = useState<Record<string, DoctrineReview>>(() => typeof window === 'undefined' ? {} : readDoctrineReviews());
  const [theologicalTensions, setTheologicalTensions] = useState<Record<string, TheologicalTension[]>>(() => typeof window === 'undefined' ? {} : readTheologicalTensions());
  const [tensionImportSelections, setTensionImportSelections] = useState<Record<string, { a: string; b: string }>>({});
  const [tensionHistoryDrafts, setTensionHistoryDrafts] = useState<Record<string, TensionHistoryDraft>>({});
  const [tensionHistoryErrors, setTensionHistoryErrors] = useState<Record<string, string>>({});
  const [selectedTensionDossierKey, setSelectedTensionDossierKey] = useState('');
  const [dossierGeneratedAt, setDossierGeneratedAt] = useState('');
  const [tensionSearch, setTensionSearch] = useState('');
  const [tensionAssessmentFilter, setTensionAssessmentFilter] = useState<TheologicalTension['assessment'] | 'all'>('all');
  const [tensionStatusFilter, setTensionStatusFilter] = useState<TheologicalTension['status'] | 'all'>('all');
  const [pendingTensionFocusId, setPendingTensionFocusId] = useState<string | null>(null);
  const [doctrineCompareInput, setDoctrineCompareInput] = useState('');
  const [doctrineCompareResults, setDoctrineCompareResults] = useState<{ reference: string; text: string; related: string[]; source: string }[]>([]);
  const [doctrineCompareStatus, setDoctrineCompareStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [doctrineCompareError, setDoctrineCompareError] = useState('');
  const [evidenceClaim, setEvidenceClaim] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('Scripture');
  const [evidenceRelationship, setEvidenceRelationship] = useState<EvidenceRelationship>('context');
  const [evidenceSourceQuality, setEvidenceSourceQuality] = useState<EvidenceQuality>('unassessed');
  const [evidenceSourceQualityRationale, setEvidenceSourceQualityRationale] = useState('');
  const [evidenceVerification, setEvidenceVerification] = useState<EvidenceVerification>('not_checked');
  const [evidenceVerificationRationale, setEvidenceVerificationRationale] = useState('');
  const [evidenceAssessmentRationale, setEvidenceAssessmentRationale] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [evidenceDetail, setEvidenceDetail] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');
  const [evidenceNotice, setEvidenceNotice] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'needs_review' | EvidenceRelationship>('all');
  const [evidenceSourceUrl, setEvidenceSourceUrl] = useState('');
  const [evidenceSourceId, setEvidenceSourceId] = useState('');
  const [view, setView] = useState<'overview' | 'library' | 'reader' | 'study' | 'references' | 'tensions'>('overview');
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
  const [observationCategory, setObservationCategory] = useState('General observation');


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
    if (view !== 'study' || stage !== 'doctrine' || !pendingTensionFocusId) return;
    const record = Array.from(document.querySelectorAll<HTMLElement>('[data-tension-record-id]'))
      .find(element => element.dataset.tensionRecordId === pendingTensionFocusId);
    if (!record) return;
    record.scrollIntoView({ behavior: 'smooth', block: 'center' });
    record.focus({ preventScroll: true });
    setPendingTensionFocusId(null);
  }, [view, stage, passageDraftKey, pendingTensionFocusId, theologicalTensions]);

  useEffect(() => {
    setObservationIndexChapters({});
    setObservationIndexStatus('idle');
  }, [translation]);

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

  useEffect(() => { try { window.localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(evidenceRecords)); } catch { setEvidenceNotice('Evidence could not be saved in this browser.'); } }, [evidenceRecords]);
  useEffect(() => { try { window.localStorage.setItem(CLAIM_SYNTHESIS_STORAGE_KEY, JSON.stringify(claimSyntheses)); } catch { setEvidenceNotice('Claim synthesis could not be saved in this browser.'); } }, [claimSyntheses]);
  useEffect(() => { try { window.localStorage.setItem(DOCTRINE_REVIEW_STORAGE_KEY, JSON.stringify(doctrineReviews)); } catch { setEvidenceNotice('Doctrine review could not be saved in this browser.'); } }, [doctrineReviews]);
  useEffect(() => { try { window.localStorage.setItem(THEOLOGICAL_TENSION_STORAGE_KEY, JSON.stringify(theologicalTensions)); } catch { setEvidenceNotice('Theological tension register could not be saved in this browser.'); } }, [theologicalTensions]);
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

  const openLexicon = async (id: string, word: string, annotation: WordAnnotation) => {
    const requestId = ++lexiconRequestRef.current;
    setLexicon(null);
    setSelectedMorphology(annotation);
    setLexiconExpanded(false);
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
  const selectedMorphologyLabel = selectedMorphology?.parsingFull || selectedMorphology?.parsing || '';
  const selectedMorphologyExplanation = selectedMorphologyLabel
    ? explainMorphology(selectedMorphologyLabel, selectedMorphology?.language)
    : [];


  const prepareEvidenceRecord = (input: { kind: EvidenceKind; reference: string; detail: string; source: string; sourceUrl?: string; sourceId?: string }) => {
    setEvidenceKind(input.kind);
    setEvidenceReference(input.reference);
    setEvidenceDetail(input.detail);
    setEvidenceSource(input.source);
    setEvidenceSourceUrl(input.sourceUrl || '');
    setEvidenceSourceId(input.sourceId || '');
    setEvidenceNotice('Research attached to the form. Add or revise the claim, then save the evidence record.');
    setShowEvidence(true);
    setView('study');
  };

  const attachLexiconEvidence = () => {
    if (!lexicon) return;
    const context = [
      'Selected English rendering: ' + lexiconWord,
      'Lemma: ' + lexicon.lemma,
      'Transliteration: ' + lexicon.transliteration,
      'Part of speech: ' + lexicon.partOfSpeech,
      'Lexicon glosses: ' + lexicon.gloss,
      ...lexicon.senses.map((sense, index) => 'Sense ' + (index + 1) + ' — ' + sense.gloss + ': ' + sense.definition)
    ].join('\\n');
    prepareEvidenceRecord({
      kind: 'Lexicon / Strong’s',
      reference: lexicon.id + ' · ' + book + ' ' + chapter + (selectedVerse ? ':' + selectedVerse : '') + ' · ' + lexiconWord,
      detail: context,
      source: lexicon.source,
      sourceUrl: lexicon.sourceUrl,
      sourceId: lexicon.id
    });
  };

  const attachStandardCrossReference = (row: StandardCrossReferenceRow, ref: StandardCrossReferenceRow['references'][number]) => {
    const sourceReference = row.book + ' ' + row.chapter + ':' + row.verse;
    prepareEvidenceRecord({
      kind: 'Cross-reference',
      reference: sourceReference + ' → ' + ref.label,
      detail: 'Source passage anchor: “' + row.anchor + '”\\nTarget Scripture reference: ' + ref.label + '\\nThe cross-reference dataset records this textual connection; inspect both passages in context before treating it as support for the claim.',
      source: STANDARD_XREF_SOURCE.name + ' · ' + STANDARD_XREF_SOURCE.license + ' · revision ' + STANDARD_XREF_SOURCE.revision,
      sourceUrl: STANDARD_XREF_SOURCE.url,
      sourceId: row.id
    });
  };

  const attachUserCrossReference = (item: PreviewCrossReference) => {
    const names = formatCrossReference(item);
    prepareEvidenceRecord({
      kind: 'Cross-reference',
      reference: names.source + ' → ' + names.target,
      detail: item.note || 'User-created Scripture connection. No explanatory rationale was recorded; review both passages before relying on this link.',
      source: 'User-created cross-reference · browser preview',
      sourceId: item.id
    });
  };

  const addEvidenceRecord = () => {
    if (!evidenceClaim.trim() || !evidenceReference.trim() || !evidenceDetail.trim()) {
      setEvidenceNotice('Add a claim, a source reference and supporting evidence before saving.');
      return;
    }
    const record: EvidenceRecord = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      passageKey: passageDraftKey, stage, claim: evidenceClaim.trim(), relationship: evidenceRelationship, sourceQuality: evidenceSourceQuality, verificationStatus: evidenceVerification, ...(evidenceVerificationRationale.trim() ? { verificationRationale: evidenceVerificationRationale.trim() } : {}), ...(evidenceSourceQualityRationale.trim() ? { sourceQualityRationale: evidenceSourceQualityRationale.trim() } : {}), ...(evidenceAssessmentRationale.trim()? { assessmentRationale: evidenceAssessmentRationale.trim() } : {}), kind: evidenceKind,
      reference: evidenceReference.trim(), detail: evidenceDetail.trim(), source: evidenceSource.trim(),
      ...(evidenceSourceUrl.trim() ? { sourceUrl: evidenceSourceUrl.trim() } : {}),
      ...(evidenceSourceId.trim() ? { sourceId: evidenceSourceId.trim() } : {}),
      createdAt: new Date().toISOString()
    };
    setEvidenceRecords(previous => [record, ...previous]);
    setEvidenceClaim(''); setEvidenceReference(''); setEvidenceDetail(''); setEvidenceSource(''); setEvidenceSourceUrl(''); setEvidenceSourceId(''); setEvidenceRelationship('context'); setEvidenceSourceQuality('unassessed'); setEvidenceSourceQualityRationale(''); setEvidenceVerification('not_checked'); setEvidenceVerificationRationale(''); setEvidenceAssessmentRationale('');
    setEvidenceNotice('Evidence record saved in this browser preview.');
  };
  const currentPassageEvidence = evidenceRecords.filter(item => item.passageKey === passageDraftKey);
  const evidenceVerifiedCount = currentPassageEvidence.filter(item => item.verificationStatus === 'content_checked' || item.verificationStatus === 'corroborated').length;
  const evidenceNeedsReviewCount = currentPassageEvidence.length - evidenceVerifiedCount;
  const visibleEvidenceRecords = currentPassageEvidence.filter(item => evidenceFilter === 'all'
    || (evidenceFilter === 'needs_review' && item.verificationStatus !== 'content_checked' && item.verificationStatus !== 'corroborated')
    || (['supports', 'challenges', 'qualifies', 'context'].includes(evidenceFilter) && (item.relationship || 'context') === evidenceFilter));

  const evidenceByClaim = currentPassageEvidence.reduce((groups, item) => {
    const key = item.claim.trim().toLocaleLowerCase();
    const group = groups.get(key) || { claim: item.claim, records: [] as EvidenceRecord[] };
    group.records.push(item);
    groups.set(key, group);
    return groups;
  }, new Map<string, { claim: string; records: EvidenceRecord[] }>());
  const claimEvidenceGroups = [...evidenceByClaim.values()].map(group => ({
    ...group,
    supports: group.records.filter(item => item.relationship === 'supports').length,
    challenges: group.records.filter(item => item.relationship === 'challenges').length,
    qualifies: group.records.filter(item => item.relationship === 'qualifies').length,
    context: group.records.filter(item => !item.relationship || item.relationship === 'context').length,
    qualityUnassessed: group.records.filter(item => !item.sourceQuality || item.sourceQuality === 'unassessed').length,
    qualityStrong: group.records.filter(item => item.sourceQuality === 'strong').length,
    qualityModerate: group.records.filter(item => item.sourceQuality === 'moderate').length,
    qualityLimited: group.records.filter(item => item.sourceQuality === 'limited').length,
    verificationNotChecked: group.records.filter(item => !item.verificationStatus || item.verificationStatus === 'not_checked').length,
    verificationOpened: group.records.filter(item => item.verificationStatus === 'source_opened').length,
    verificationContent: group.records.filter(item => item.verificationStatus === 'content_checked').length,
    verificationCorroborated: group.records.filter(item => item.verificationStatus === 'corroborated').length
  }));

  const doctrineReviewGroups = claimEvidenceGroups.filter(group => {
    const key = claimSynthesisKey(passageDraftKey, group.claim);
    const isReady = (claimSyntheses[key]?.status || 'under_review') === 'ready_for_doctrine';
    return isReady || (theologicalTensions[key] || []).length > 0;
  });
  const indexedTheologicalTensions = useMemo(() => listTheologicalTensionRecords(theologicalTensions).map(record => ({
    ...record,
    claimDisplay: evidenceRecords.find(item =>
      item.passageKey === record.studyKey &&
      item.claim.trim().toLocaleLowerCase() === record.claimKey
    )?.claim || record.claimKey
  })), [theologicalTensions, evidenceRecords]);
  const visibleTheologicalTensions = useMemo(() => filterTheologicalTensionRecords(indexedTheologicalTensions, {
    search: tensionSearch,
    assessment: tensionAssessmentFilter,
    status: tensionStatusFilter
  }), [indexedTheologicalTensions, tensionSearch, tensionAssessmentFilter, tensionStatusFilter]);
  const tensionOpenCount = indexedTheologicalTensions.filter(item => item.status === 'open' || item.status === 'under_review').length;
  const tensionUnresolvedCount = indexedTheologicalTensions.filter(item => item.assessment === 'unresolved' || item.assessment === 'perceived_contradiction').length;
  const tensionResolvedCount = indexedTheologicalTensions.filter(item => item.status === 'researcher_resolved').length;

  const selectedDossierRecord = indexedTheologicalTensions.find(record => record.reviewKey + '::' + record.id === selectedTensionDossierKey) || null;
  const selectedTensionDossier = useMemo(() => {
    if (!selectedDossierRecord) return null;
    const linkedEvidence = evidenceRecords.filter(item =>
      item.passageKey === selectedDossierRecord.studyKey &&
      item.claim.trim().toLocaleLowerCase() === selectedDossierRecord.claimKey
    );
    return buildTheologicalTensionDossier(selectedDossierRecord, {
      generatedAt: dossierGeneratedAt,
      doctrineReview: doctrineReviews[selectedDossierRecord.reviewKey],
      claimSynthesis: claimSyntheses[selectedDossierRecord.reviewKey],
      evidenceRecords: linkedEvidence
    });
  }, [selectedDossierRecord, evidenceRecords, doctrineReviews, claimSyntheses, dossierGeneratedAt]);

  const prepareTheologicalDossier = (record: IndexedTheologicalTension) => {
    setSelectedTensionDossierKey(record.reviewKey + '::' + record.id);
    setDossierGeneratedAt(new Date().toISOString());
    setView('dossier');
  };


  const openTheologicalTension = (record: IndexedTheologicalTension) => {
    const [targetBook, chapterText] = record.studyKey.split('|');
    const targetChapter = Number(chapterText);
    const targetBookInfo = getBibleBook(targetBook);
    if (!targetBookInfo || !Number.isInteger(targetChapter) || targetChapter < 1 || targetChapter > targetBookInfo.chapters) return;
    setPendingTensionFocusId(record.id);
    setDraftsByPassage(previous => ({
      ...previous,
      [record.studyKey]: {
        ...emptyNotes,
        ...(previous[record.studyKey] || {}),
        activeStage: 'doctrine'
      }
    }));
    setBook(targetBook);
    setChapter(targetChapter);
    setStage('doctrine');
    setView('study');
  };

  const compareDoctrinePassages = async () => {
    const raw = doctrineCompareInput.split(/[;,\n]+/).map(value => value.trim()).filter(Boolean);
    const parsed = raw.map(parseStandardReference);
    const invalid = raw.filter((value,index) => !parsed[index]);
    if (!raw.length || invalid.length) {
      setDoctrineCompareStatus('error');
      setDoctrineCompareError(invalid.length ? 'Check these references: ' + invalid.join(', ') + '. Use formats such as John 1:1-5 or Romans 8.' : 'Enter at least one Scripture reference.');
      return;
    }
    const unique = [...new Map(parsed.filter(Boolean).map(item => [item!.book + '|' + item!.chapter + '|' + item!.verse + '|' + item!.endVerse, item!])).values()];
    if (unique.length > 8) {
      setDoctrineCompareStatus('error');
      setDoctrineCompareError('Compare up to eight references at a time so each passage can be examined carefully.');
      return;
    }
    setDoctrineCompareStatus('loading');
    setDoctrineCompareError('');
    try {
      const results = await Promise.all(unique.map(async reference => {
        const chapterData = await fetchBibleChapter(reference.book, reference.chapter, translation);
        const verses = chapterData.verses.filter(item => reference.verse === null || (item.number >= reference.verse! && item.number <= (reference.endVerse || reference.verse!)));
        const rows = await loadStandardCrossReferences('BSB', { book: reference.book, chapter: reference.chapter });
        const related = rows.filter(row => reference.verse === null || (row.verse >= reference.verse! && row.verse <= (reference.endVerse || reference.verse!)))
          .flatMap(row => row.references.map(item => item.label)).slice(0, 12);
        return { reference: reference.label, text: verses.map(item => item.number + '. ' + item.text).join(' '), related: [...new Set(related)], source: chapterData.source };
      }));
      setDoctrineCompareResults(results);
      setDoctrineCompareStatus('ready');
    } catch (error) {
      setDoctrineCompareStatus('error');
      setDoctrineCompareError(error instanceof Error ? error.message : 'Could not load one or more Scripture passages.');
    }
  };

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
    const addition = additions.map(item => '[' + observationCategory + '] ' + book + ' ' + chapter + ':' + item.number + ' — ' + translation + '\n' + item.text).join('\n\n');
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
      <button className={view === 'tensions' ? 'nav-item active' : 'nav-item'} type="button" onClick={() => setView('tensions')}><Icon name="panel"/>Theological tensions<span className="nav-count">{indexedTheologicalTensions.length}</span></button>
      <button className="nav-item nav-disabled" type="button" disabled title="AI guidance will be reconnected after the contextual data adapter is complete"><Icon name="spark"/>AI study guide</button>
      <div className="sidebar-bottom"><div className="avatar">J</div><div><strong>Study workspace</strong><span>Preview environment</span></div><button className="icon-button" aria-label="Settings" type="button" disabled><Icon name="settings"/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        {view !== 'overview' && <button className="back-home-button" type="button" onClick={() => setView('overview')} aria-label="Back to start screen" title="Back to start screen"><Icon name="back"/><span>Home</span></button>}
        <div className="crumbs"><span>Workspace</span><Icon name="chevron"/><strong>{view === 'overview' ? 'Overview' : view === 'library' ? 'Study library' : view === 'references' ? 'Cross-references' : view === 'tensions' ? 'Theological tensions' : view === 'dossier' ? 'Research dossier' : view === 'study' ? 'Active study' : book + ' ' + chapter}</strong></div>
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
          {standardReferencesStatus === 'loading' ? <p className="reference-help">Loading the licensed standard cross-reference collection…</p> : standardReferencesStatus === 'error' ? <p className="reference-help" role="alert">{standardReferencesError} You can still use your saved study links below.</p> : standardCrossReferences.length ? <div className="reference-list">{standardCrossReferences.map(row => <article className="reference-item" key={row.id}><div className="reference-pair"><strong>{row.book} {row.chapter}:{row.verse}</strong><span>{row.anchor}</span></div><div className="standard-reference-links">{row.references.map((ref,index)=>{const previewKey=row.id+'-'+index;const isPreviewOpen=referencePreview?.key===previewKey;return <span className="standard-reference-action" key={previewKey}><button type="button" className={isPreviewOpen?'standard-reference-link active':''} aria-expanded={isPreviewOpen} onClick={()=>setReferencePreview(current=>current?.key===previewKey?null:{key:previewKey,book:ref.book,chapter:ref.chapter,verse:ref.verse,endVerse:ref.endVerse})}>{ref.label}</button><button type="button" className="reference-attach-button" onClick={()=>attachStandardCrossReference(row,ref)} aria-label={'Attach '+row.book+' '+row.chapter+':'+row.verse+' to '+ref.label+' as evidence'} title="Attach this reference pair to Evidence Manager">＋ Evidence</button></span>;})}</div>{referencePreview?.key.startsWith(row.id+'-') && <div className="reference-verse-popover" role="region" aria-label={'Preview of '+referencePreview.book+' '+referencePreview.chapter}><div className="reference-verse-popover-heading"><div><span className="eyebrow">SCRIPTURE PREVIEW · {translation}</span><strong>{referencePreview.book} {referencePreview.chapter}{referencePreview.verse ? ':'+referencePreview.verse+(referencePreview.endVerse && referencePreview.endVerse!==referencePreview.verse?'-'+referencePreview.endVerse:'') : ''}</strong></div><button type="button" className="tool-button" onClick={()=>setReferencePreview(null)} aria-label="Close verse preview">×</button></div>{referencePreviewStatus==='loading' && <p className="reference-preview-status" role="status">Loading Scripture…</p>}{referencePreviewStatus==='error' && <p className="reference-preview-error" role="alert">{referencePreviewError}</p>}{referencePreviewStatus==='loaded' && referencePreviewBible && <div className="reference-preview-verses">{referencePreviewBible.verses.filter(item=>referencePreview.verse===null || (item.number>=referencePreview.verse && item.number<=(referencePreview.endVerse || referencePreview.verse))).map(item=><button type="button" className="reference-preview-verse" key={item.number} onClick={()=>{if(book===referencePreview.book&&chapter===referencePreview.chapter){setSelectedVerseNumbers([item.number]);verseSelectionAnchorRef.current=item.number;}else{referenceNavigationRef.current={book:referencePreview.book,chapter:referencePreview.chapter,start:item.number,end:item.number};setBook(referencePreview.book);setChapter(referencePreview.chapter);}setView('reader');setReferencePreview(null);}}><span>{item.number}</span><span>{item.text}</span><span className="reference-preview-open">Open <Icon name="chevron"/></span></button>)}</div>}{referencePreviewStatus==='loaded' && <p className="reference-preview-hint">Select a verse to open it in the Bible Reader.</p>}</div>}<div className="reference-item-footer"><span>STANDARD REFERENCE · {STANDARD_XREF_SOURCE.name}</span></div></article>)}</div> : <div className="library-empty"><h2>No standard references listed for this chapter</h2><p>Try a different chapter or translation.</p></div>}
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
            {previewCrossReferences.length ? <div className="reference-list">{previewCrossReferences.map(item=>{const names=formatCrossReference(item);return <article className="reference-item" key={item.id}><div className="reference-pair"><button type="button" onClick={()=>{setBook(item.sourceBook);setChapter(item.sourceChapter);setView('reader');}}>{names.source}</button><span aria-hidden="true">↔</span><button type="button" onClick={()=>{setBook(item.targetBook);setChapter(item.targetChapter);setView('reader');}}>{names.target}</button></div>{item.note ? <p>{item.note}</p> : <p className="reference-muted">No connection note recorded.</p>}<div className="reference-item-footer"><span>USER-CREATED PREVIEW REFERENCE</span><div className="reference-item-actions"><button type="button" className="text-button" onClick={()=>attachUserCrossReference(item)}>＋ Attach evidence</button><button type="button" className="text-button" onClick={()=>setPreviewCrossReferences(previous=>deletePreviewCrossReference(previous,item.id))}>Remove</button></div></div></article>})}</div> : <div className="library-empty"><div className="library-empty-mark"><Icon name="panel"/></div><h2>No saved connections yet</h2><p>Create a link between the current passage and another Scripture reference. You can return to either passage from your saved list.</p><button className="primary-button" type="button" onClick={()=>setView('reader')}>Open Bible reader <Icon name="chevron"/></button></div>}
          </section>
        </div><p className="reference-disclaimer">Standard references and user-created study connections are shown separately. Standard references are sourced from the licensed Treasury of Scripture Knowledge dataset; your own links remain local to this browser preview.</p>
      </section> : view === 'tensions' ? <section className="tensions-overview-view">
        <div className="library-header"><div><div className="eyebrow">RESEARCH · THEOLOGICAL CONSISTENCY</div><h1>Theological Tension Register</h1><p>Review apparent tensions recorded across your preview studies. This register organises researcher assessments; it does not decide whether passages agree or contradict.</p></div><button className="outline-button" type="button" onClick={() => setView('study')}>Return to active study</button></div>
        <div className="tension-overview-stat-grid" aria-label="Tension register summary">
          <article><span>Total records</span><strong>{indexedTheologicalTensions.length}</strong><small>Across saved preview studies</small></article>
          <article><span>Open / under review</span><strong>{tensionOpenCount}</strong><small>Still requiring examination</small></article>
          <article><span>Unresolved assessments</span><strong>{tensionUnresolvedCount}</strong><small>Includes perceived contradictions</small></article>
          <article><span>Resolved by researcher</span><strong>{tensionResolvedCount}</strong><small>Recorded researcher judgement</small></article>
        </div>
        <div className="tension-overview-toolbar">
          <label className="tension-overview-search">Search register<input type="search" value={tensionSearch} onChange={event=>setTensionSearch(event.target.value)} placeholder="Search passage, claim, issue or analysis…"/></label>
          <label>Research assessment<select value={tensionAssessmentFilter} onChange={event=>setTensionAssessmentFilter(event.target.value as typeof tensionAssessmentFilter)}>
            <option value="all">All assessments</option>
            <option value="unclassified">Not yet classified</option>
            <option value="apparent_tension">Apparent tension</option>
            <option value="complementary">Complementary perspectives</option>
            <option value="unresolved">Unresolved relationship</option>
            <option value="perceived_contradiction">Perceived contradiction</option>
          </select></label>
          <label>Research status<select value={tensionStatusFilter} onChange={event=>setTensionStatusFilter(event.target.value as typeof tensionStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="provisionally_addressed">Provisionally addressed</option>
            <option value="researcher_resolved">Resolved by researcher</option>
          </select></label>
          <button className="text-button tension-clear-filters" type="button" onClick={()=>{setTensionSearch('');setTensionAssessmentFilter('all');setTensionStatusFilter('all');}}>Clear filters</button>
        </div>
        <div className="tension-overview-results-heading"><strong>{visibleTheologicalTensions.length}</strong> {visibleTheologicalTensions.length === 1 ? 'record' : 'records'} shown <span>Sorted by most recently updated</span></div>
        {visibleTheologicalTensions.length ? <div className="tension-overview-list">
          {visibleTheologicalTensions.map(record=><article className="tension-overview-card" key={record.reviewKey + '::' + record.id}>
            <div className="tension-overview-card-top"><div><span className="eyebrow">{record.studyPassage} · DOCTRINE REVIEW</span><h2>{record.claimDisplay}</h2></div><div className="tension-overview-badges"><span>{record.assessment.replaceAll('_',' ')}</span><span>{record.status.replaceAll('_',' ')}</span></div></div>
            <div className="tension-overview-passage-pair"><div><small>PASSAGE A</small><strong>{record.passageA || 'Reference not recorded'}</strong><p>{record.contextA || 'Context not yet recorded'}</p></div><div><small>PASSAGE B</small><strong>{record.passageB || 'Reference not recorded'}</strong><p>{record.contextB || 'Context not yet recorded'}</p></div></div>
            {record.issue && <p className="tension-overview-issue"><strong>Issue examined:</strong> {record.issue}</p>}
            {record.analysis && <p className="tension-overview-analysis">{record.analysis}</p>}
            {record.uncertainty && <p className="tension-overview-uncertainty"><strong>Remaining uncertainty:</strong> {record.uncertainty}</p>}
            <div className="tension-overview-card-footer"><small>Updated {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'date not recorded'} · {(record.history || []).length} history {(record.history || []).length === 1 ? 'checkpoint' : 'checkpoints'}</small><button className="primary-button" type="button" onClick={()=>openTheologicalTension(record)}>Open Doctrine review <Icon name="chevron"/></button></div>
          </article>)}
        </div> : <div className="library-empty"><div className="library-empty-mark"><Icon name="panel"/></div><h2>{indexedTheologicalTensions.length ? 'No matching tension records' : 'No theological tensions recorded yet'}</h2><p>{indexedTheologicalTensions.length ? 'Adjust or clear your filters to see other records.' : 'Open a study, move to Doctrine review and add a record when two passages or interpretations appear to be in tension.'}</p>{indexedTheologicalTensions.length > 0 && <button className="text-button" type="button" onClick={()=>{setTensionSearch('');setTensionAssessmentFilter('all');setTensionStatusFilter('all');}}>Clear filters</button>}</div>}
        <p className="tension-overview-disclaimer">The register is a research index, not an automated judgement. “Resolved by researcher” records the researcher’s conclusion and does not independently establish that a perceived contradiction has been disproved. All entries remain in this browser preview.</p>
      </section> :
      view === 'study' ? <section className="active-study-view">
        <div className="active-study-header"><div><div className="eyebrow">ACTIVE INDUCTIVE STUDY</div><h1>{book} <em>{chapter}</em></h1><p>Work through the passage systematically. Your notes remain attached to this passage and stage.</p></div><button className="outline-button" type="button" onClick={() => setView('reader')}><Icon name="book"/> Open Bible reader</button></div>
        <div className="active-study-progress"><div><strong>Study progress</strong><span>{stagesWithNotes.size} of 4 stages have notes</span></div><div className="active-study-progress-track">{stages.map(item => <i key={item.id} className={stagesWithNotes.has(item.id) ? 'complete' : ''}/>)}</div></div>
        <nav className="stage-nav" aria-label="Study stages">{stages.map(item => <button key={item.id} className={stage===item.id?'stage-tab selected':'stage-tab'} type="button" onClick={() => changeStage(item.id)}><span className="stage-number">{item.number}</span><span>{item.label}</span>{stagesWithNotes.has(item.id) && <span className="stage-done">✓</span>}</button>)}</nav>
        <div className="active-study-grid"><section className={notesExpanded ? "active-study-editor notes-expanded" : "active-study-editor"}><div className="notes-topline"><div><span className="stage-counter">STAGE {current.number} OF 04</span><h2>{current.label}</h2></div><span className="draft-status">{draftSaveStatus === 'saved' ? 'Saved locally' : draftSaveStatus === 'saving' ? 'Saving…' : 'Local save unavailable'}</span></div><div className="question-copy"><strong>{current.question}</strong><p>{current.hint}</p></div>
          {showGuidance && <div className="guidance-content"><p>Work from the passage itself. Record what the text supports, keep observations distinct from conclusions, and refer to specific verses wherever possible.</p></div>}
          {earlierStageEvidence.length > 0 && <div className="evidence-strip"><div><i className="evidence-dot"/>Earlier-stage notes available</div><button className="text-button" type="button" onClick={() => setShowEvidence(v=>!v)}>{showEvidence ? 'Hide' : 'Review'}</button></div>}
          {showEvidence && <div className="guidance-content">{earlierStageEvidence.map(item => <p key={item.stage}><strong>{stages.find(stageItem => stageItem.id === item.stage)?.label || item.stage}:</strong> {item.text}</p>)}</div>}
          <section className="evidence-manager" aria-label="Evidence manager">
            <div className="evidence-manager-heading"><div><strong>Evidence manager</strong><p>Connect a statement in your study to the Scripture or research that supports it.</p></div><span>{currentPassageEvidence.length} saved</span></div>
            <div className="evidence-manager-form">
              <label>Claim or statement<input value={evidenceClaim} onChange={event=>setEvidenceClaim(event.target.value)} placeholder="What statement are you evaluating?"/></label>
              <div className="evidence-manager-row">
                <label>Evidence relationship<select value={evidenceRelationship} onChange={event=>setEvidenceRelationship(event.target.value as EvidenceRelationship)}><option value="context">Context / background</option><option value="supports">Supports the claim</option><option value="challenges">Challenges the claim</option><option value="qualifies">Qualifies the claim</option></select></label>
                <label>Source quality<select value={evidenceSourceQuality} onChange={event=>setEvidenceSourceQuality(event.target.value as EvidenceQuality)}><option value="unassessed">Not assessed</option><option value="strong">Strong</option><option value="moderate">Moderate</option><option value="limited">Limited</option></select></label>
                <label>Evidence type<select value={evidenceKind} onChange={event=>setEvidenceKind(event.target.value as EvidenceKind)}><option>Scripture</option><option>Cross-reference</option><option>Lexicon / Strong’s</option><option>Original-language research</option><option>Historical / contextual source</option></select></label>
              </div>
              <label>Reference<input value={evidenceReference} onChange={event=>setEvidenceReference(event.target.value)} placeholder="e.g. Leviticus 26:3–5"/></label>
              <label>Supporting evidence<textarea rows={3} value={evidenceDetail} onChange={event=>setEvidenceDetail(event.target.value)} placeholder="Record the relevant wording, lexical detail, grammatical observation or source finding."/></label>
              <label>Source verification<select value={evidenceVerification} onChange={event=>setEvidenceVerification(event.target.value as EvidenceVerification)}><option value="not_checked">Not checked</option><option value="source_opened">Source opened</option><option value="content_checked">Content checked against the cited claim</option><option value="corroborated">Independently corroborated</option></select></label>
              <label>Verification notes<textarea rows={2} value={evidenceVerificationRationale} onChange={event=>setEvidenceVerificationRationale(event.target.value)} placeholder="Record what you checked, where, and any independent source used."/></label>
              <label>Reason for source-quality assessment<textarea rows={2} value={evidenceSourceQualityRationale} onChange={event=>setEvidenceSourceQualityRationale(event.target.value)} placeholder="Consider expertise, proximity to the evidence, method, date and corroboration."/></label>
              <label>Reason for this assessment<textarea rows={2} value={evidenceAssessmentRationale} onChange={event=>setEvidenceAssessmentRationale(event.target.value)} placeholder="Explain briefly why this source supports, challenges, qualifies or contextualises the claim."/></label>
              <label>Source / provenance<input value={evidenceSource} onChange={event=>setEvidenceSource(event.target.value)} placeholder="e.g. BSB · STEPBible lexicon · publication details"/></label>
              {evidenceSourceUrl && <div className="evidence-source-provenance"><span>Source record</span><a href={evidenceSourceUrl} target="_blank" rel="noopener noreferrer">Open original source ↗</a>{evidenceSourceId && <code>{evidenceSourceId}</code>}</div>}
              {selectedVerseRecords.length>0 && <button type="button" className="text-button" onClick={()=>{setEvidenceKind('Scripture');setEvidenceReference(selectedVerseCitation+' · '+translation);setEvidenceDetail(selectedVerseRecords.map(item=>item.number+'. '+item.text).join('\n'));setEvidenceSource('Bible text displayed in this preview · '+translation);}}>Use selected verses from Reader</button>}
              <div className="evidence-manager-actions"><button type="button" className="primary-button" onClick={addEvidenceRecord}>Save evidence record</button><span role="status">{evidenceNotice}</span></div>
            </div>
            <section className="claim-synthesis-workspace" aria-label="Claim synthesis workspace">
              <div className="claim-synthesis-heading"><div><span className="eyebrow">RESEARCH SYNTHESIS</span><h3>Claim synthesis</h3><p>Bring the evidence together, weigh competing readings and record a reasoned conclusion before carrying it into Doctrine.</p></div><span>{claimEvidenceGroups.length} claim{claimEvidenceGroups.length===1?'':'s'}</span></div>
              {claimEvidenceGroups.length===0 ? <p className="evidence-manager-empty">Save at least one evidence record linked to a clearly worded claim. Its supporting, challenging and qualifying material will appear here.</p> : claimEvidenceGroups.map(group => {
                const synthesisKey = claimSynthesisKey(passageDraftKey, group.claim);
                const synthesis = claimSyntheses[synthesisKey] || { status: 'under_review' as ClaimSynthesisStatus, conclusion: '', reasoning: '', updatedAt: '' };
                const updateSynthesis = (patch: Partial<ClaimSynthesis>) => setClaimSyntheses(previous => ({ ...previous, [synthesisKey]: { ...synthesis, ...patch, updatedAt: new Date().toISOString() } }));
                const hasChallenge = group.challenges > 0;
                const hasQualification = group.qualifies > 0;
                const unresolvedVerification = group.verificationNotChecked + group.verificationOpened > 0;
                const handoff = () => {
                  setDraftsByPassage(previous => {
                    const existing = (previous[passageDraftKey] || emptyNotes).doctrine;
                    const block = '[Claim synthesis · ' + group.claim + ']\\n' + synthesis.conclusion.trim() + (synthesis.reasoning.trim() ? '\\nReasoning: ' + synthesis.reasoning.trim() : '') + '\\nResearch status: Ready for Doctrine review';
                    return { ...previous, [passageDraftKey]: { ...emptyNotes, ...(previous[passageDraftKey] || {}), activeStage: 'doctrine', doctrine: existing.trimEnd() + (existing.trim() ? '\\n\\n' : '') + block } };
                  });
                  setStage('doctrine');
                };
                return <article className="claim-synthesis-card" key={synthesisKey}>
                  <div className="claim-synthesis-card-top"><strong>{group.claim}</strong><span>{group.records.length} linked source{group.records.length===1?'':'s'}</span></div>
                  <div className="claim-synthesis-evidence-grid">
                    <div className="synthesis-support"><strong>{group.supports} Supporting</strong><small>{group.supports ? 'Evidence recorded as supporting this claim' : 'No supporting evidence recorded'}</small></div>
                    <div className="synthesis-challenge"><strong>{group.challenges} Challenging</strong><small>{group.challenges ? 'Counter-evidence requires a response' : 'No challenging evidence recorded'}</small></div>
                    <div className="synthesis-qualify"><strong>{group.qualifies} Qualifying</strong><small>{group.qualifies ? 'Evidence limits or refines the claim' : 'No qualifying evidence recorded'}</small></div>
                    <div className="synthesis-context"><strong>{group.context} Context</strong><small>Contextual material, not counted as direct support</small></div>
                  </div>
                  {(hasChallenge || hasQualification || unresolvedVerification) && <p className="claim-synthesis-caution">{hasChallenge ? 'Counter-evidence is present. Address it explicitly rather than treating the supporting count as decisive. ' : ''}{hasQualification ? 'Qualifying evidence may require narrowing or refining the wording of the claim. ' : ''}{unresolvedVerification ? 'Some sources have not yet been checked at content level or independently corroborated.' : ''}</p>}
                  <div className="claim-synthesis-quality"><span>Researcher-assessed source quality: {group.qualityStrong} strong · {group.qualityModerate} moderate · {group.qualityLimited} limited · {group.qualityUnassessed} unassessed</span><span>Verification: {group.verificationContent} content checked · {group.verificationCorroborated} corroborated · {group.verificationOpened} opened · {group.verificationNotChecked} unchecked</span></div>
                  <div className="claim-synthesis-source-list">
                    <strong>Evidence considered</strong>
                    {group.records.map(record => <div className="claim-synthesis-source" key={record.id}>
                      <div className="claim-synthesis-source-heading"><b>{record.reference}</b><span className={'evidence-relationship-label relationship-'+(record.relationship || 'context')}>{record.relationship || 'context'}</span></div>
                      <p>{record.detail}</p>
                      <small>{record.kind} · {record.sourceQuality || 'unassessed'} quality · {record.verificationStatus || 'not_checked'}{record.assessmentRationale ? ' · '+record.assessmentRationale : ''}</small>
                      {record.sourceUrl && <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">Open cited source ↗</a>}
                    </div>)}
                  </div>
                  <label className="claim-synthesis-field">Synthesis / reasoned conclusion<textarea rows={3} value={synthesis.conclusion} onChange={event=>updateSynthesis({conclusion:event.target.value})} placeholder="State what the evidence, considered together, warrants. Distinguish what is explicit, what is inferred, and what remains uncertain."/></label>
                  <label className="claim-synthesis-field">Reasoning and treatment of counter-evidence<textarea rows={3} value={synthesis.reasoning} onChange={event=>updateSynthesis({reasoning:event.target.value})} placeholder="Explain why the evidence is weighed this way. Address challenging or qualifying material and note any unresolved questions."/></label>
                  <div className="claim-synthesis-footer">
                    <label>Research assessment<select value={synthesis.status} onChange={event=>updateSynthesis({status:event.target.value as ClaimSynthesisStatus})}><option value="under_review">Under review</option><option value="provisional">Provisional conclusion</option><option value="ready_for_doctrine">Ready for Doctrine review</option><option value="revisit">Revisit / insufficient evidence</option></select></label>
                    <button type="button" className="outline-button" disabled={!synthesis.conclusion.trim() || synthesis.status!=='ready_for_doctrine'} onClick={handoff}>Add to Doctrine notes</button>
                  </div>
                  <small className="claim-synthesis-saved">{synthesis.updatedAt ? 'Saved in this browser preview · '+new Date(synthesis.updatedAt).toLocaleString() : 'Not yet assessed'} · This is your research judgement, not an automated verdict.</small>
                </article>;
              })}
            </section>
            <div className="evidence-claim-register">
              <div className="evidence-claim-register-heading"><strong>Evidence balance</strong><span>{claimEvidenceGroups.length} claim{claimEvidenceGroups.length===1?'':'s'} · {currentPassageEvidence.length} evidence records</span></div>
              {claimEvidenceGroups.length===0 ? <p className="evidence-manager-empty">Claim evidence summaries will appear when you add source records.</p> : claimEvidenceGroups.map(group=><article className="evidence-claim-summary" key={group.claim.toLocaleLowerCase()}>
                <strong>{group.claim}</strong>
                <div className="evidence-relationship-counts"><span className="relationship-supports">{group.supports} supports</span><span className="relationship-challenges">{group.challenges} challenges</span><span className="relationship-qualifies">{group.qualifies} qualifies</span><span className="relationship-context">{group.context} context</span></div>
                <small>{group.records.length} linked sources · Counts describe how you classified the records; they are not a measure of proof.</small>
              </article>)}
            </div>
            <div className="evidence-audit-summary" role="status">
              <div><strong>Source verification</strong><span>{evidenceVerifiedCount} of {currentPassageEvidence.length} checked against the claim</span></div>
              <p>{evidenceNeedsReviewCount ? evidenceNeedsReviewCount + ' source record(s) still need content-level review or independent corroboration.' : currentPassageEvidence.length ? 'Every saved source has been marked as content-checked or corroborated by the researcher.' : 'Verification progress will appear when you add evidence.'} Opening a source alone does not establish that it supports the claim.</p>
            </div>
            <div className="evidence-filter-bar" aria-label="Filter evidence records">
              <span>Show</span>
              <button type="button" className={evidenceFilter==='all'?'active':''} aria-pressed={evidenceFilter==='all'} onClick={()=>setEvidenceFilter('all')}>All ({currentPassageEvidence.length})</button>
              <button type="button" className={evidenceFilter==='needs_review'?'active':''} aria-pressed={evidenceFilter==='needs_review'} onClick={()=>setEvidenceFilter('needs_review')}>Needs review ({evidenceNeedsReviewCount})</button>
              <button type="button" className={evidenceFilter==='supports'?'active':''} aria-pressed={evidenceFilter==='supports'} onClick={()=>setEvidenceFilter('supports')}>Supports</button>
              <button type="button" className={evidenceFilter==='challenges'?'active':''} aria-pressed={evidenceFilter==='challenges'} onClick={()=>setEvidenceFilter('challenges')}>Challenges</button>
              <button type="button" className={evidenceFilter==='qualifies'?'active':''} aria-pressed={evidenceFilter==='qualifies'} onClick={()=>setEvidenceFilter('qualifies')}>Qualifies</button>
              <button type="button" className={evidenceFilter==='context'?'active':''} aria-pressed={evidenceFilter==='context'} onClick={()=>setEvidenceFilter('context')}>Context</button>
            </div>
            <div className="evidence-manager-list" aria-live="polite">
              {currentPassageEvidence.length===0 ? <p className="evidence-manager-empty">No evidence records yet. Add a claim and connect it to its supporting source.</p> : visibleEvidenceRecords.length===0 ? <p className="evidence-manager-empty">No records match this filter. Choose another filter to see the remaining evidence.</p> : visibleEvidenceRecords.map(item=><article className="evidence-manager-item" key={item.id}>
                <div className="evidence-manager-item-top"><span>{stages.find(value=>value.id===item.stage)?.label} · {item.kind}</span><div className="evidence-manager-item-controls"><label className="evidence-record-relationship">Source quality<select aria-label={'Assess source quality for '+item.reference} value={item.sourceQuality||'unassessed'} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,sourceQuality:event.target.value as EvidenceQuality}:record))}><option value="unassessed">Not assessed</option><option value="strong">Strong</option><option value="moderate">Moderate</option><option value="limited">Limited</option></select></label><label className="evidence-record-relationship">Verification<select aria-label={'Set source verification for '+item.reference} value={item.verificationStatus||'not_checked'} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,verificationStatus:event.target.value as EvidenceVerification}:record))}><option value="not_checked">Not checked</option><option value="source_opened">Source opened</option><option value="content_checked">Content checked</option><option value="corroborated">Corroborated</option></select></label><label className="evidence-record-relationship">Claim relationship<select aria-label={'Classify evidence relationship for '+item.reference} value={item.relationship||'context'} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,relationship:event.target.value as EvidenceRelationship}:record))}><option value="context">Context / background</option><option value="supports">Supports claim</option><option value="challenges">Challenges claim</option><option value="qualifies">Qualifies claim</option></select></label><button type="button" className="text-button" onClick={()=>setEvidenceRecords(previous=>previous.filter(record=>record.id!==item.id))} aria-label={'Delete evidence record '+item.reference}>Remove</button></div></div>
                <strong>{item.claim}</strong><b>{item.reference}</b><p>{item.detail}</p><label className="evidence-record-rationale">Assessment rationale<textarea rows={2} aria-label={'Assessment rationale for '+item.reference} value={item.assessmentRationale||''} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,assessmentRationale:event.target.value}:record))} placeholder="Explain why this source has this relationship to the claim."/></label><label className="evidence-record-rationale">Source-quality rationale<textarea rows={2} aria-label={'Source-quality rationale for '+item.reference} value={item.sourceQualityRationale||''} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,sourceQualityRationale:event.target.value}:record))} placeholder="Explain the basis for this source-quality judgement."/></label><label className="evidence-record-rationale">Verification notes<textarea rows={2} aria-label={'Verification notes for '+item.reference} value={item.verificationRationale||''} onChange={event=>setEvidenceRecords(previous=>previous.map(record=>record.id===item.id?{...record,verificationRationale:event.target.value}:record))} placeholder="What did you check, and against which source?"/></label>{item.source && <small>Source: {item.source}</small>}{item.sourceUrl && <a className="evidence-record-source" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Open source record ↗</a>}{item.sourceId && <small>Source identifier: {item.sourceId}</small>}
              </article>)}
            </div>
            <small className="evidence-manager-disclaimer">Preview only: records are stored in this browser, separately from production study data. Source accuracy and interpretation remain the researcher’s responsibility.</small>
          </section>
          <div className="active-study-notes-toolbar">
            <label className="active-study-notes-label" htmlFor="active-study-notes">YOUR {current.label.toUpperCase()} NOTES</label>
            <div className="active-study-note-controls">
              <button className="tool-button" type="button" onClick={() => setNotesFontSize(value => Math.max(15,value-1))} aria-label="Decrease notes text size" title="Decrease text size">A−</button>
              <button className="tool-button" type="button" onClick={() => setNotesFontSize(value => Math.min(26,value+1))} aria-label="Increase notes text size" title="Increase text size">A+</button>
              <button className="outline-button notes-expand-button" type="button" onClick={() => setNotesExpanded(value => !value)} aria-expanded={notesExpanded}>{notesExpanded ? 'Collapse editor' : 'Expand editor'}</button>
            </div>
          </div><details className="study-prompt-picker"><summary>Insert a structured study prompt</summary><div className="study-prompt-options">{stagePromptTemplates[stage].map(prompt => <button key={prompt.label} type="button" onClick={() => setDraftsByPassage(previous => { const existing = (previous[passageDraftKey] || emptyNotes)[stage]; const separator = existing.trim() ? (existing.endsWith('\n') ? '\n' : '\n\n') : ''; return {...previous,[passageDraftKey]:{...emptyNotes,...(previous[passageDraftKey]||{}),[stage]:existing+separator+prompt.text}}; })}>{prompt.label}</button>)}</div></details>
          <textarea id="active-study-notes" className={notesExpanded ? 'active-study-notes-expanded' : ''} style={{fontSize:notesFontSize}} value={note} onChange={event => setDraftsByPassage(previous => ({...previous,[passageDraftKey]:{...emptyNotes,...(previous[passageDraftKey]||{}),[stage]:event.target.value}}))} placeholder={'Record your '+current.label.toLowerCase()+' notes for '+book+' '+chapter+'…'}/><div className="active-study-editor-footer"><span>{wordCount} words</span><span>Auto-saved in this preview · {notesFontSize}px</span></div>
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
            <button className="primary-button open-study-workspace" type="button" onClick={() => setView('study')}>Open study workspace <Icon name="chevron"/></button>
          </div>
        </section>
        <div className="workspace">
          <section className="scripture-panel">
            <div className="panel-heading"><div><span className="eyebrow">SCRIPTURE</span><h2>{book} {chapter}</h2></div><div className="reader-tools"><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.max(16,v-1))} aria-label="Decrease Scripture text size">A−</button><button className="tool-button" type="button" onClick={() => setFontSize(v=>Math.min(25,v+1))} aria-label="Increase Scripture text size">A+</button><button className={showStrongs ? 'tool-button strongs-toggle active' : 'tool-button strongs-toggle'} type="button" aria-pressed={showStrongs} onClick={() => setShowStrongs(value => !value)}>Strong’s {showStrongs ? 'On' : 'Off'}</button></div></div>
            <div className="reading-meta"><span>{translation === 'KJV' ? 'King James Version' : translation === 'BSB' ? 'Berean Standard Bible' : translation}</span><span>{chapter} of {bookInfo.chapters}</span></div>{showStrongs && <p className="strongs-instruction">Click an underlined Strong’s word in the passage to open its dictionary entry and plain-language grammar explanation.</p>}
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
                  const phraseEntries = Object.entries(previewWordMarkup).flatMap(([passage, verses]) => Object.entries(verses).flatMap(([verse, ranges]) => ranges.map((range,index) => {
                    const chapterData = passage === passageDraftKey ? bible : observationIndexChapters[passage];
                    const verseText = chapterData?.verses.find(item => item.number === Number(verse))?.text || '';
                    return { passage, verse:Number(verse), start:range.start, end:range.end, text:verseText ? verseText.slice(range.start,range.end) : 'Scripture text unavailable', tags:range.tags, key:'w-'+passage+'-'+verse+'-'+index, kind:'Phrase' as const };
                  })));
                  const verseEntries = Object.entries(previewMarkup).flatMap(([passage, verses]) => Object.entries(verses).map(([verse,tags]) => {
                    const chapterData = passage === passageDraftKey ? bible : observationIndexChapters[passage];
                    const verseText = chapterData?.verses.find(item => item.number === Number(verse))?.text || '';
                    return {passage,verse:Number(verse),text:verseText || 'Scripture text unavailable',tags,key:'v-'+passage+'-'+verse,kind:'Verse' as const};
                  }));
                  const entries = [...phraseEntries,...verseEntries];
                  const bibleBookOrder = new Map(BIBLE_BOOKS.map((book,index) => [book.name,index]));
                  const query = observationIndexSearch.trim().toLocaleLowerCase();
                  const categoryCounts = SCRIPTURE_MARKUP_TYPES.reduce((counts,type) => {
                    counts[type.id] = entries.filter(entry => entry.tags.includes(type.id)).length;
                    return counts;
                  }, {} as Record<string,number>);
                  const filtered = entries.filter(entry =>
                    (observationIndexKind === 'all' || entry.kind === observationIndexKind) &&
                    (observationIndexCategory === 'all' || entry.tags.includes(observationIndexCategory as WordMarkupRange['tags'][number])) &&
                    (!query || (entry.passage.replace('|',' ') + ':' + entry.verse + ' ' + entry.text + ' ' + entry.tags.join(' ') + ' ' + entry.kind).toLocaleLowerCase().includes(query))
                  ).sort((a,b) => {
                    const [ab,ac] = a.passage.split('|'); const [bb,bc] = b.passage.split('|');
                    const aPosition = a.kind === 'Phrase' ? a.start : Number.MAX_SAFE_INTEGER;
                    const bPosition = b.kind === 'Phrase' ? b.start : Number.MAX_SAFE_INTEGER;
                    return (bibleBookOrder.get(ab) ?? Number.MAX_SAFE_INTEGER) - (bibleBookOrder.get(bb) ?? Number.MAX_SAFE_INTEGER) || Number(ac)-Number(bc) || a.verse-b.verse || aPosition-bPosition || a.kind.localeCompare(b.kind);
                  });
                  const uniqueVerses = new Set(filtered.map(entry => entry.passage+'|'+entry.verse)).size;
                   const phraseCount = filtered.filter(entry => entry.kind === 'Phrase').length;
                   const wholeVerseCount = filtered.length - phraseCount;
                  const groups = filtered.reduce((map,entry) => {
                    const existing = map.get(entry.passage);
                    if (existing) existing.push(entry);
                    else map.set(entry.passage,[entry]);
                    return map;
                  }, new Map<string, typeof filtered>());
                  return <>
                    <div className="observation-index-summary"><span><strong>{filtered.length}</strong> markings</span><span><strong>{phraseCount}</strong> phrases</span><span><strong>{wholeVerseCount}</strong> whole verses</span><span><strong>{uniqueVerses}</strong> verses</span><span><strong>{groups.size}</strong> chapters</span></div>
                    <div className="observation-index-controls">
                      <label className="markup-search-label">Search observations<input type="search" value={observationIndexSearch} onChange={event => setObservationIndexSearch(event.target.value)} placeholder="Search words, verses or passages…" /></label>
                      <label className="markup-search-label">Observation category<select value={observationIndexCategory} onChange={event => setObservationIndexCategory(event.target.value)}><option value="all">All categories</option>{SCRIPTURE_MARKUP_TYPES.map(type => <option key={type.id} value={type.id}>{type.label} ({categoryCounts[type.id] || 0})</option>)}</select></label>
                      <label className="markup-search-label">Marking type<select value={observationIndexKind} onChange={event => setObservationIndexKind(event.target.value as typeof observationIndexKind)}><option value="all">Phrases and whole verses</option><option value="Phrase">Highlighted phrases</option><option value="Verse">Whole-verse markings</option></select></label>
                    </div>
                    {(observationIndexSearch || observationIndexCategory !== 'all' || observationIndexKind !== 'all') && <div className="observation-index-clear-row"><button type="button" onClick={() => {setObservationIndexSearch('');setObservationIndexCategory('all');setObservationIndexKind('all');}}>Clear search and filters</button></div>}
                    <div className="observation-index-export-row"><button type="button" className="text-button" disabled={!filtered.length} onClick={() => {const content=filtered.map(entry => entry.passage.replace('|',' ') + ':' + entry.verse + ' (' + translation + ') · ' + entry.kind + ' · ' + entry.text + ' · ' + entry.tags.map(tag=>SCRIPTURE_MARKUP_TYPES.find(type=>type.id===tag)?.label||tag).join(', ')).join('\n\n');void (async()=>{try{await navigator.clipboard.writeText(content);setObservationIndexNotice(filtered.length+' observation '+(filtered.length===1?'copied':'entries copied')+'.');}catch{setObservationIndexNotice('Copy is unavailable in this browser.');}})();}}>Copy {filtered.length} filtered {filtered.length===1?'observation':'observations'}</button>{observationIndexNotice && <span role="status">{observationIndexNotice}</span>}</div>
                    {observationIndexStatus === 'loading' && <p className="markup-review-empty">Loading Scripture text for marked passages…</p>}
                    {groups.size ? <div className="observation-index-groups">{Array.from(groups.entries()).map(([passage,groupEntries]) => <section className="observation-index-group" key={passage}>
                      <div className="observation-index-group-heading"><strong>{passage.replace('|',' ')}</strong><span>{groupEntries.length} {groupEntries.length===1?'marking':'markings'}</span></div>
                      <ul className="markup-review-list observation-index-list">{groupEntries.map(entry => <li key={entry.key}><button type="button" className="observation-index-entry" onClick={() => {const [targetBook,targetChapter]=entry.passage.split('|');setBook(targetBook);setChapter(Number(targetChapter));setView('reader');setSelectedVerseNumbers([entry.verse]);verseSelectionAnchorRef.current=entry.verse;setShowObservationIndex(false);}}><strong>{entry.verse} <small>{entry.kind}</small></strong><span>{entry.text}</span><small>{entry.tags.map(tag=>SCRIPTURE_MARKUP_TYPES.find(type=>type.id===tag)?.label||tag).join(' · ')}</small></button><button type="button" className="observation-index-remove" aria-label={'Remove '+entry.kind.toLowerCase()+' marking from '+entry.passage.replace('|',' ')+':'+entry.verse} onClick={() => {if(entry.kind==='Phrase'){setPreviewWordMarkup(previous=>{const verses={...(previous[entry.passage]||{})};const remaining=(verses[String(entry.verse)]||[]).filter(range=>range.start!==entry.start||range.end!==entry.end);if(remaining.length)verses[String(entry.verse)]=remaining;else delete verses[String(entry.verse)];const next={...previous};if(Object.keys(verses).length)next[entry.passage]=verses;else delete next[entry.passage];return next;});}else{setPreviewMarkup(previous=>{const verses={...(previous[entry.passage]||{})};delete verses[String(entry.verse)];const next={...previous};if(Object.keys(verses).length)next[entry.passage]=verses;else delete next[entry.passage];return next;});}setReaderNotice('Observation marking removed.');}} title="Remove this marking">×</button>{entry.tags.length > 1 && <div className="observation-index-tag-actions" aria-label="Remove individual observation categories">{entry.tags.map(tag => {const type=SCRIPTURE_MARKUP_TYPES.find(item=>item.id===tag);return <button key={tag} type="button" title={'Remove '+(type?.label||tag)+' only'} aria-label={'Remove only '+(type?.label||tag)+' from '+entry.kind.toLowerCase()+' marking at '+entry.passage.replace('|',' ')+':'+entry.verse} onClick={() => {if(entry.kind==='Phrase'){setPreviewWordMarkup(previous=>{const verses={...(previous[entry.passage]||{})};const ranges=(verses[String(entry.verse)]||[]).flatMap(range=>{if(range.start!==entry.start||range.end!==entry.end)return [range];const tags=range.tags.filter(item=>item!==tag);return tags.length?[{...range,tags}]:[];});if(ranges.length)verses[String(entry.verse)]=ranges;else delete verses[String(entry.verse)];const next={...previous};if(Object.keys(verses).length)next[entry.passage]=verses;else delete next[entry.passage];return next;});}else{setPreviewMarkup(previous=>{const verses={...(previous[entry.passage]||{})};const tags=(verses[String(entry.verse)]||[]).filter(item=>item!==tag);if(tags.length)verses[String(entry.verse)]=tags;else delete verses[String(entry.verse)];const next={...previous};if(Object.keys(verses).length)next[entry.passage]=verses;else delete next[entry.passage];return next;});}setReaderNotice((type?.label||'Category')+' removed.');}}>{type?.label||tag} ×</button>;})}</div>}</li>)}</ul>
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
                return <div key={verse.number} role="button" tabIndex={0} className={selectedVerseNumbers.includes(verse.number)?'verse selected-verse':'verse'} aria-pressed={selectedVerseNumbers.includes(verse.number)} onKeyDown={event=>{if((event.target as HTMLElement).closest('.strongs-token'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();if(event.shiftKey && verseSelectionAnchorRef.current !== null){setSelectedVerseNumbers(selectVerseRange(verseSelectionAnchorRef.current,verse.number));}else{setSelectedVerseNumbers(current => toggleVerseSelection(current,verse.number));verseSelectionAnchorRef.current=verse.number;}setShowAddToStudy(false);setReaderNotice('');}}} onClick={(event)=>{if((event.target as HTMLElement).closest('.strongs-token'))return;if(event.shiftKey && verseSelectionAnchorRef.current !== null){setSelectedVerseNumbers(selectVerseRange(verseSelectionAnchorRef.current,verse.number));}else{setSelectedVerseNumbers(current => toggleVerseSelection(current,verse.number));verseSelectionAnchorRef.current=verse.number;}setShowAddToStudy(false);setReaderNotice('');}}><span>{verse.number}</span><p onMouseUp={event=>{const offsets=getSelectedTextOffsets(event.currentTarget, window.getSelection());if(offsets){const selected=window.getSelection()?.toString().trim();if(selected)setSelectedTextMarkup({verse:verse.number,...offsets,text:selected});}}} onKeyUp={event=>{const offsets=getSelectedTextOffsets(event.currentTarget, window.getSelection());if(offsets){const selected=window.getSelection()?.toString().trim();if(selected)setSelectedTextMarkup({verse:verse.number,...offsets,text:selected});}}}>{renderVerseWithAnnotations(verse.text, bible?.annotations?.[String(verse.number)] || [], showStrongs, previewWordMarkup[passageDraftKey]?.[String(verse.number)] || [], (start, end) => {
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
                }, (id, word, annotation) => { void openLexicon(id, word, annotation); })}{tags.length > 0 && <span className="verse-markup-tags" aria-label={'Observation tags: ' + tags.map(tag => SCRIPTURE_MARKUP_TYPES.find(type => type.id === tag)?.label || tag).join(', ')}>{tags.map(tag => { const type = SCRIPTURE_MARKUP_TYPES.find(item => item.id === tag); return <span className="verse-markup-tag" key={tag}>{type?.symbol} {type?.label}</span>; })}</span>}</p></div>;
              })}
              {!loadingBible && !bibleError && !bible?.verses.length && <div className="reader-message">No verse text was returned for this passage.</div>}
            </div>
            {selectedVerseNumbers.length > 0 && selectedVerseRecords.length > 0 && <div className="verse-action-dock" aria-label="Actions for selected verses">
              <div className="verse-action-context"><div className="verse-action-context-heading"><span className="eyebrow">{selectedVerseRecords.length === 1 ? 'SELECTED VERSE' : 'SELECTED VERSES · ' + selectedVerseRecords.length}</span><button type="button" className="text-button clear-verse-selection" onClick={() => {setSelectedVerseNumbers([]);verseSelectionAnchorRef.current=null;setShowAddToStudy(false);setReaderNotice('Verse selection cleared.');}} aria-label="Clear selected verses">Clear selection ×</button></div><strong>{selectedVerseCitation}</strong><span>{selectedVerseRecords.map(item => item.text).join(' ')}</span></div>
              <div className="verse-action-buttons">
                <button type="button" className="verse-action primary" onClick={() => void copySelectedVerse()}><span aria-hidden="true">▢</span>{selectedVerseRecords.length === 1 ? "Copy verse" : "Copy verses"}</button>
                <button type="button" className="verse-action" onClick={() => setShowAddToStudy(value => !value)} disabled={!selectedVerseRecord}><span aria-hidden="true">＋</span>Add to study</button>
                <button type="button" className="verse-action" onClick={openVerseCrossReference} disabled={!selectedVerseRecord || selectedVerseRecords.length > 1} title={selectedVerseRecords.length > 1 ? "Link passage is available when one verse is selected." : "Link selected verse to another passage"}><span aria-hidden="true">↗</span>{selectedVerseRecords.length > 1 ? "Link one verse" : "Link passage"}</button>
                <label className="observation-category-control">Observation type<select className="reading-select" value={observationCategory} onChange={event => setObservationCategory(event.target.value)}><option>General observation</option><option>Repeated word or phrase</option><option>Command or instruction</option><option>Promise</option><option>Contrast or comparison</option><option>Question</option><option>Cause and effect</option><option>Connecting word</option><option>Person, action or response</option><option>Structure</option></select></label><button type="button" className="verse-action" onClick={addVerseAsObservation} disabled={!selectedVerseRecord}><span aria-hidden="true">✎</span>Add observation</button>
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
            {selectedMorphology || lexiconLoading || lexiconError || lexicon ? <section className={lexiconExpanded ? 'lexicon-panel word-study-sheet expanded' : 'lexicon-panel word-study-sheet'} aria-live="polite" aria-label="Strong's lexicon entry">
              <button type="button" className="word-study-handle" onClick={() => setLexiconExpanded(value => !value)} aria-expanded={lexiconExpanded}><span aria-hidden="true"/><span>{lexiconExpanded ? 'Show less' : 'Expand word study'}</span></button>
              <div className="lexicon-heading"><div><span className="eyebrow">WORD STUDY · {lexicon?.id || 'LOADING'}</span><h3>{lexiconWord}</h3></div><div className="word-study-heading-actions"><button className="word-study-expand-button" type="button" onClick={() => setLexiconExpanded(value => !value)} aria-expanded={lexiconExpanded}>{lexiconExpanded ? 'Collapse' : 'Expand'}</button><button className="tool-button" type="button" onClick={() => { lexiconRequestRef.current += 1; setLexicon(null); setSelectedMorphology(null); setLexiconError(''); setLexiconWord(''); setLexiconLoading(false); setLexiconExpanded(false); }} aria-label="Close lexicon entry">×</button></div></div>
              {lexiconLoading && <p className="lexicon-status">Loading verified lexicon data…</p>}
              {lexiconError && <p className="lexicon-error" role="alert">{lexiconError}</p>}
              {selectedMorphologyLabel && <section className="morphology-explainer" aria-label="Grammar and morphology explanation"><div className="morphology-explainer-heading"><div><span className="eyebrow">WORD FORM · PLAIN-LANGUAGE GUIDE</span><h4>Understanding the grammar</h4></div><span className="morphology-language">{selectedMorphology?.language || 'Original language'}</span></div><p className="morphology-raw">{selectedMorphologyLabel}</p>{selectedMorphologyExplanation.length ? <div className="morphology-term-list">{selectedMorphologyExplanation.map((item,index)=><article className="morphology-term" key={item.title + index}><strong>{item.term} <span>— {item.title}</span></strong><p>{item.explanation}</p></article>)}</div> : <p className="morphology-unavailable">A plain-language explanation is not yet available for this particular parsing label. The original morphology label is shown above.</p>}<p className="morphology-caution">Grammar identifies the form; it does not by itself settle the meaning of the verse. Check the verb, clause, author’s argument and wider context before drawing an interpretation.</p></section>}{selectedMorphology && !selectedMorphologyLabel && <div className="morphology-unavailable">This KJV source provides a Strong’s number for the selected word, but not its occurrence morphology. <button type="button" className="text-button" onClick={() => { lexiconRequestRef.current += 1; setTranslation('BSB'); setLexicon(null); setSelectedMorphology(null); setLexiconWord(''); setLexiconError(''); setLexiconLoading(false); }}>Open this passage in BSB interlinear</button> to inspect source-backed word morphology.</div>}{lexicon && <><div className="lexicon-meta"><strong>{lexicon.lemma}</strong><span>{lexicon.transliteration}</span><span>{lexicon.partOfSpeech}</span></div><p className="lexicon-gloss">{lexicon.gloss}</p>{lexicon.senses.map((sense,index)=><div className="lexicon-sense" key={index}><strong>{sense.gloss}</strong><p>{sense.definition}</p></div>)}<div className="lexicon-evidence-actions"><a href={lexicon.sourceUrl} target="_blank" rel="noopener noreferrer">{lexicon.source} · Open source record</a><button type="button" className="outline-button" onClick={attachLexiconEvidence}>Attach to Evidence Manager</button></div></>}
            </section> : null}

            <div className="reader-notice" role="status" aria-live="polite">{readerNotice}</div>
            <div className="reader-source">Text source: {bible?.source || 'Awaiting Scripture source'}. {showStrongs ? 'Showing only source-verified Strong’s annotations; unmatched words remain untagged.' : 'Strong’s annotations are switched off.'}</div>
          </section>
          <section className={notesExpanded ? "notes-panel notes-expanded" : "notes-panel"}>
            <div className="notes-topline"><div><span className="eyebrow">YOUR STUDY</span><h2>{current.label}</h2></div><span className="stage-counter">STAGE {current.number} / 04</span></div>
            <div className="stage-question"><div className="question-icon">?</div><div className="question-copy"><strong>{current.question}</strong><p>{current.hint}</p></div><button className="collapse-button" type="button" onClick={()=>setShowGuidance(!showGuidance)}>{showGuidance?'Hide':'Show'} guidance</button></div>
            {showGuidance && <div className="guidance-content"><p>{stage==='observe'?'Record what the text explicitly states. Trace repeated words, people, places, time markers, contrasts, commands and linking words. Avoid explaining meaning or moving to application.':stage==='interpret'?'Examine context, structure, grammar, keywords and linking words. Explain how the author develops the thought and support conclusions from the text.':stage==='doctrine'?'Synthesize what the passage teaches about God, humanity, creation and the wider biblical witness. Distinguish explicit teaching from inference.':'Identify a faithful response grounded in the passage. Make it specific, considered and connected to the meaning established in the earlier stages.'}</p></div>}
            <details className="stage-method">
              <summary>Stage method · {stageMethod[stage].title}</summary>
              <div className="stage-method-content">
                <strong>Work through these steps</strong>
                <ol>{stageMethod[stage].steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
                <strong>Review your work before moving on</strong>
                <ul>{stageMethod[stage].review.map((question,index)=><li key={index}>{question}</li>)}</ul>
              </div>
            </details>
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
            {stage === 'doctrine' && <section className="doctrine-review-workspace" aria-label="Doctrine review and theological consistency">
              <div className="doctrine-review-heading"><div><span className="eyebrow">THEOLOGICAL REVIEW</span><h3>Doctrine review &amp; consistency</h3><p>Review conclusions marked ready for Doctrine. Preserve the original research, classify the level of claim, compare Scripture in context and record unresolved tensions before approval.</p></div><span>{doctrineReviewGroups.length} ready</span></div>
              <div className="doctrine-canonical-compare">
                <div><strong>Scripture-wide comparison</strong><p>Examine relevant passages alongside the current claim. Enter up to eight references, separated by commas or new lines. Chapter references and verse ranges are supported.</p></div>
                <label htmlFor="doctrine-compare-references">Passages to compare</label>
                <textarea id="doctrine-compare-references" rows={2} value={doctrineCompareInput} onChange={event=>setDoctrineCompareInput(event.target.value)} placeholder="e.g. John 1:1-5, Colossians 1:15-20, Hebrews 1:1-4"/>
                <div className="doctrine-compare-actions"><button type="button" className="outline-button" disabled={doctrineCompareStatus==='loading' || !doctrineCompareInput.trim()} onClick={compareDoctrinePassages}>{doctrineCompareStatus==='loading'?'Loading Scripture…':'Compare Scripture passages'}</button><span>Translation: {translation} · Cross-reference index: BSB / Treasury of Scripture Knowledge</span></div>
                {doctrineCompareStatus==='error' && <p className="doctrine-compare-error" role="alert">{doctrineCompareError}</p>}
                {doctrineCompareResults.length>0 && <div className="doctrine-compare-results">{doctrineCompareResults.map(item=><article key={item.reference}><strong>{item.reference}</strong><p>{item.text}</p><small>Text source: {item.source}</small>{item.related.length>0 && <div><b>Associated cross-references</b><span>{item.related.join(' · ')}</span></div>}<small>Cross-reference links indicate possible textual connections, not proof of doctrinal agreement. Read each passage in its own context.</small></article>)}</div>}
              </div>
              {doctrineReviewGroups.length === 0 ? <p className="evidence-manager-empty">No claim synthesis is ready for Doctrine review and no saved tension records are attached to this passage. Complete the research assessment in the Evidence Manager or add evidence to a claim first.</p> : doctrineReviewGroups.map(group => {
                const key = claimSynthesisKey(passageDraftKey, group.claim);
                const synthesis = claimSyntheses[key] || { status: 'under_review' as ClaimSynthesisStatus, conclusion: '', reasoning: '', updatedAt: '' };
                const review = doctrineReviews[key] || { claimLevel: '', supportingPassages: '', tensions: '', formulation: synthesis.conclusion, unresolved: '', approved: false, updatedAt: '' } as DoctrineReview;
                const tensionRecords = theologicalTensions[key] || [];
                const resetApprovalIfNeeded = () => setDoctrineReviews(previous => {
                  const currentReview = previous[key];
                  if (!currentReview?.approved) return previous;
                  return { ...previous, [key]: { ...currentReview, approved: false, updatedAt: new Date().toISOString() } };
                });
                const updateReview = (patch: Partial<DoctrineReview>) => setDoctrineReviews(previous => ({ ...previous, [key]: { ...review, ...patch, approved: patch.approved ?? false, updatedAt: new Date().toISOString() } }));
                const approve = () => {
                  const finalText = review.formulation.trim();
                  if (!finalText || !review.claimLevel || review.approved) return;
                  setDraftsByPassage(previous => {
                    const existing = (previous[passageDraftKey] || emptyNotes).doctrine;
                    const marker = '[Approved doctrinal formulation · ' + group.claim + ' · ' + new Date().toISOString() + ']';
                    const historyNotes = tensionRecords.flatMap((record, index) => {
                      const entries = Array.isArray(record.history) ? record.history : [];
                      if (!entries.length) return [];
                      return ['Research question ' + (index + 1) + ' — interpretation and resolution history', ...entries.map((entry, entryIndex) => [
                        'Checkpoint ' + (entryIndex + 1) + ' · ' + entry.recordedAt,
                        'Event: ' + entry.eventType.replaceAll('_', ' '),
                        'Assessment: ' + (entry.previousAssessment ? entry.previousAssessment.replaceAll('_', ' ') + ' → ' : '') + entry.assessment.replaceAll('_', ' '),
                        'Status: ' + (entry.previousStatus ? entry.previousStatus.replaceAll('_', ' ') + ' → ' : '') + entry.status.replaceAll('_', ' '),
                        'Previous recorded position: ' + (entry.previousResearcherPosition || 'No earlier checkpoint'),
                        'Researcher position: ' + entry.researcherPosition,
                        'Passage A: ' + (entry.passageA || 'Not recorded'),
                        'Passage A context: ' + (entry.contextA || 'Not recorded'),
                        'Passage B: ' + (entry.passageB || 'Not recorded'),
                        'Passage B context: ' + (entry.contextB || 'Not recorded'),
                        'Issue: ' + (entry.issue || 'Not recorded'),
                        'Reason for recording: ' + entry.rationale,
                        'Evidence considered: ' + (entry.evidenceConsidered || 'Not recorded'),
                        'Previous analysis: ' + (entry.previousAnalysisSnapshot || 'No earlier checkpoint'),
                        'Analysis at checkpoint: ' + (entry.analysisSnapshot || 'Not recorded'),
                        'Previous uncertainty: ' + (entry.previousUncertaintySnapshot || 'No earlier checkpoint'),
                        'Remaining uncertainty: ' + (entry.uncertaintySnapshot || 'None recorded')
                      ].join('\n'))].join('\n');
                    });
                    const tensionNotes = tensionRecords.map((record, index) => [
                      'Research question ' + (index + 1),
                      'Passage A: ' + (record.passageA || 'Not recorded'),
                      'Passage A context and meaning: ' + (record.contextA || 'Not recorded'),
                      'Passage B: ' + (record.passageB || 'Not recorded'),
                      'Passage B context and meaning: ' + (record.contextB || 'Not recorded'),
                      'Issue examined: ' + (record.issue || 'Not recorded'),
                      'Interpretive analysis: ' + (record.analysis || 'Not recorded'),
                      'Remaining uncertainty: ' + (record.uncertainty || 'None recorded'),
                      'Research assessment: ' + record.assessment.replaceAll('_', ' '),
                      'Research status: ' + record.status.replaceAll('_', ' ')
                    ].join('\n')).join('\n\n');
                    const block = marker + '\n' + finalText + '\nClaim level: ' + review.claimLevel.replaceAll('_', ' ') + '\nSupporting passages reviewed: ' + (review.supportingPassages.trim() || 'Not recorded') + (review.tensions.trim() ? '\nTensions / qualifications: ' + review.tensions.trim() : '') + (tensionNotes ? '\n\nTheological tension analysis register:\n' + tensionNotes : '') + (historyNotes.length ? '\n\nInterpretation and resolution history:\n' + historyNotes.join('\n\n') : '') + (review.unresolved.trim() ? '\nOpen questions: ' + review.unresolved.trim() : '');
                    return { ...previous, [passageDraftKey]: { ...emptyNotes, ...(previous[passageDraftKey] || {}), activeStage: 'doctrine', doctrine: existing.trimEnd() + (existing.trim() ? '\\n\\n' : '') + block } };
                  });
                  updateReview({ approved: true });
                };
                return <article className="doctrine-review-card" key={key}>
                  <div className="doctrine-review-source"><span className="eyebrow">ORIGINAL RESEARCH CLAIM</span><strong>{group.claim}</strong><p>{synthesis.conclusion}</p>{synthesis.reasoning && <small>Research reasoning: {synthesis.reasoning}</small>}<span className="doctrine-review-preserve">Original synthesis and linked evidence remain unchanged.</span></div>
                  <label>What level of claim is warranted?
                    <select value={review.claimLevel} onChange={event=>updateReview({claimLevel:event.target.value as DoctrineReview['claimLevel']})}>
                      <option value="">Select classification</option><option value="explicit">Explicit biblical teaching — directly stated in the passage</option><option value="necessary_implication">Necessary implication — follows from the text’s teaching</option><option value="broader_inference">Broader theological inference — synthesis beyond a single explicit statement</option>
                    </select>
                  </label>
                  <label>Supporting Scripture passages<textarea rows={2} value={review.supportingPassages} onChange={event=>updateReview({supportingPassages:event.target.value})} placeholder="List references and briefly explain how each passage contributes. Check each in its own literary and historical context."/></label>
                  <label>Apparent tensions, counter-texts or qualifications<textarea rows={3} value={review.tensions} onChange={event=>updateReview({tensions:event.target.value})} placeholder="Record passages or teachings that appear to challenge, qualify or create tension with this formulation. Explain rather than harmonise prematurely."/></label>
                  <section className="tension-register" aria-label="Theological tension analysis register">
                    <div className="tension-register-heading"><div><strong>Theological tension analysis register</strong><p>Record each apparent tension as a separate research question. Examine both passages in context before assessing their relationship.</p><small className="tension-register-summary">{tensionRecords.length} record{tensionRecords.length === 1 ? '' : 's'} · {tensionRecords.filter(record => record.status === 'open' || record.status === 'under_review').length} open / under review</small></div><button type="button" className="outline-button" onClick={() => { resetApprovalIfNeeded(); setTheologicalTensions(previous => ({ ...previous, [key]: [...(previous[key] || []), { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2), passageA: '', contextA: '', passageB: '', contextB: '', issue: '', analysis: '', uncertainty: '', assessment: 'unclassified', status: 'open', updatedAt: new Date().toISOString() }] })); }}>Add tension record</button></div>
                    {(theologicalTensions[key] || []).length === 0 ? <p className="tension-register-empty">No tension records have been added to this doctrinal claim.</p> : (theologicalTensions[key] || []).map((item, index) => {
                      const updateTension = (patch: Partial<TheologicalTension>) => { setTheologicalTensions(previous => ({ ...previous, [key]: (previous[key] || []).map(record => record.id === item.id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record) })); resetApprovalIfNeeded(); };
                      const tensionHistory = Array.isArray(item.history) ? item.history : [];
                      const historyDraft = tensionHistoryDrafts[item.id] || {
                        eventType: (tensionHistory.length ? 'interpretive_revision' : 'initial_position') as TensionHistoryEventType,
                        researcherPosition: item.analysis || '',
                        rationale: '',
                        evidenceConsidered: ''
                      };
                      const saveHistoryCheckpoint = () => {
                        try {
                          const updated = appendTheologicalTensionHistory(item, historyDraft, {
                            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'history-' + Date.now().toString(36) + Math.random().toString(36).slice(2,8),
                            recordedAt: new Date().toISOString()
                          });
                          setTheologicalTensions(previous => ({
                            ...previous,
                            [key]: (previous[key] || []).map(record => record.id === item.id ? updated : record)
                          }));
                          setTensionHistoryDrafts(previous => ({
                            ...previous,
                            [item.id]: {
                              eventType: 'interpretive_revision',
                              researcherPosition: historyDraft.researcherPosition,
                              rationale: '',
                              evidenceConsidered: ''
                            }
                          }));
                          setTensionHistoryErrors(previous => ({ ...previous, [item.id]: '' }));
                          resetApprovalIfNeeded();
                        } catch (error) {
                          setTensionHistoryErrors(previous => ({
                            ...previous,
                            [item.id]: error instanceof Error ? error.message : 'The history checkpoint could not be saved.'
                          }));
                        }
                      };
                      return <article className="tension-register-card" key={item.id} data-tension-record-id={item.id} tabIndex={-1}>
                        <div className="tension-register-card-heading"><strong>Research question {index + 1}</strong><button type="button" className="text-button" onClick={() => { resetApprovalIfNeeded(); setTheologicalTensions(previous => ({ ...previous, [key]: (previous[key] || []).filter(record => record.id !== item.id) })); }}>Remove</button></div>
                        <div className="tension-register-passages">
                          <label>Passage A reference<input value={item.passageA} onChange={event=>updateTension({passageA:event.target.value})} placeholder="e.g. Romans 3:28"/></label>
                          <label>Passage B reference<input value={item.passageB} onChange={event=>updateTension({passageB:event.target.value})} placeholder="e.g. James 2:24"/></label>
                        </div>
                        <div className="tension-register-imports">
                          <p>Bring in text already examined above. Import is explicit and will replace the selected side’s reference and context fields.</p>
                          <div className="tension-register-import-grid">
                            <label>Comparison result for Passage A
                              <select value={(tensionImportSelections[item.id] || {a:'',b:''}).a} onChange={event=>setTensionImportSelections(previous=>({...previous,[item.id]:{...(previous[item.id] || {a:'',b:''}),a:event.target.value}}))}>
                                <option value="">Choose a loaded comparison passage</option>
                                {doctrineCompareResults.map(result=><option key={result.reference} value={result.reference}>{result.reference}</option>)}
                              </select>
                              <button type="button" className="outline-button" disabled={!(tensionImportSelections[item.id] || {a:'',b:''}).a} onClick={() => {
                                const selected = doctrineCompareResults.find(result => result.reference === (tensionImportSelections[item.id] || {a:'',b:''}).a);
                                if (!selected) return;
                                const imported = buildComparisonPassageImport(selected);
                                updateTension({passageA: imported.reference, contextA: imported.context});
                              }}>Import into Passage A</button>
                            </label>
                            <label>Comparison result for Passage B
                              <select value={(tensionImportSelections[item.id] || {a:'',b:''}).b} onChange={event=>setTensionImportSelections(previous=>({...previous,[item.id]:{...(previous[item.id] || {a:'',b:''}),b:event.target.value}}))}>
                                <option value="">Choose a loaded comparison passage</option>
                                {doctrineCompareResults.map(result=><option key={result.reference} value={result.reference}>{result.reference}</option>)}
                              </select>
                              <button type="button" className="outline-button" disabled={!(tensionImportSelections[item.id] || {a:'',b:''}).b} onClick={() => {
                                const selected = doctrineCompareResults.find(result => result.reference === (tensionImportSelections[item.id] || {a:'',b:''}).b);
                                if (!selected) return;
                                const imported = buildComparisonPassageImport(selected);
                                updateTension({passageB: imported.reference, contextB: imported.context});
                              }}>Import into Passage B</button>
                            </label>
                          </div>
                          {doctrineCompareResults.length === 0 ? <small>Load passages with Scripture-wide comparison above to enable direct import.</small> : <small>Imported wording retains the comparison translation/source label. It does not classify the relationship between the passages.</small>}
                        </div>
                        <label>Passage A — context and meaning<textarea rows={2} value={item.contextA} onChange={event=>updateTension({contextA:event.target.value})} placeholder="Record speaker, audience, literary setting, argument and what this passage asserts."/></label>
                        <label>Passage B — context and meaning<textarea rows={2} value={item.contextB} onChange={event=>updateTension({contextB:event.target.value})} placeholder="Examine the second passage independently in its own context."/></label>
                        <label>What exactly appears to be in tension?<textarea rows={2} value={item.issue} onChange={event=>updateTension({issue:event.target.value})} placeholder="State the precise propositions or interpretive claims being compared."/></label>
                        <label>Interpretive analysis and reasoning<textarea rows={3} value={item.analysis} onChange={event=>updateTension({analysis:event.target.value})} placeholder="Explain similarities, differences, genre, context, terminology and the reasoning for your assessment. Do not force a resolution."/></label>
                        <label>Remaining uncertainty<textarea rows={2} value={item.uncertainty} onChange={event=>updateTension({uncertainty:event.target.value})} placeholder="What evidence, context or interpretive question remains unresolved?"/></label>
                        <label>Research conclusion / proposed resolution<textarea rows={3} value={item.resolution || ''} onChange={event=>updateTension({resolution:event.target.value})} placeholder="State the conclusion you currently judge the evidence to support. Mark it as provisional where appropriate; do not claim more certainty than the research warrants."/></label>
                        <label>Rationale for the conclusion<textarea rows={2} value={item.resolutionRationale || ''} onChange={event=>updateTension({resolutionRationale:event.target.value})} placeholder="Explain how the contextual readings, evidence and interpretive reasoning support this conclusion."/></label>
                        <div className="tension-register-classification">
                          <label>Research assessment<select value={item.assessment} onChange={event=>updateTension({assessment:event.target.value as TheologicalTension['assessment']})}><option value="unclassified">Not yet classified</option><option value="apparent_tension">Apparent tension</option><option value="complementary">Complementary perspectives</option><option value="unresolved">Unresolved relationship</option><option value="perceived_contradiction">Perceived contradiction — further examination required</option></select></label>
                          <label>Research status<select value={item.status} onChange={event=>updateTension({status:event.target.value as TheologicalTension['status']})}><option value="open">Open</option><option value="under_review">Under review</option><option value="provisionally_addressed">Provisionally addressed</option><option value="researcher_resolved">Resolved by researcher</option></select></label>
                        </div>
                        <section className="tension-history" aria-label="Interpretation and resolution history">
                          <div className="tension-history-heading"><div><strong>Interpretation &amp; resolution history</strong><p>Save a dated checkpoint when your interpretation, assessment or resolution changes. Earlier checkpoints are retained and cannot be edited or removed.</p></div><span>{tensionHistory.length} {tensionHistory.length === 1 ? 'checkpoint' : 'checkpoints'}</span></div>
                          <div className="tension-history-form">
                            <label>Checkpoint type<select value={historyDraft.eventType} onChange={event=>setTensionHistoryDrafts(previous=>({...previous,[item.id]:{...historyDraft,eventType:event.target.value as TensionHistoryEventType}}))}>
                              <option value="initial_position">Initial research position</option>
                              <option value="interpretive_revision">Revised interpretation</option>
                              <option value="assessment_change">Changed assessment</option>
                              <option value="resolution_proposed">Proposed resolution</option>
                              <option value="resolution_revised">Revised resolution</option>
                              <option value="reopened">Reopened for further study</option>
                              <option value="other">Other research development</option>
                            </select></label>
                            <label>Current interpretive position<textarea rows={3} value={historyDraft.researcherPosition} onChange={event=>setTensionHistoryDrafts(previous=>({...previous,[item.id]:{...historyDraft,researcherPosition:event.target.value}}))} placeholder="State your current understanding of how the two passages relate. Be precise about what is established and what remains tentative."/></label>
                            <label>Why is this checkpoint being recorded?<textarea rows={2} value={historyDraft.rationale} onChange={event=>setTensionHistoryDrafts(previous=>({...previous,[item.id]:{...historyDraft,rationale:event.target.value}}))} placeholder="Explain what changed, what prompted a review, or why this position needs to be preserved."/></label>
                            <label>New evidence or considerations examined<textarea rows={2} value={historyDraft.evidenceConsidered} onChange={event=>setTensionHistoryDrafts(previous=>({...previous,[item.id]:{...historyDraft,evidenceConsidered:event.target.value}}))} placeholder="Record passages, context, language findings, historical sources or arguments considered since the previous checkpoint."/></label>
                            {tensionHistoryErrors[item.id] && <p className="tension-history-error" role="alert">{tensionHistoryErrors[item.id]}</p>}
                            <button type="button" className="outline-button" disabled={!historyDraft.researcherPosition.trim() || !historyDraft.rationale.trim()} onClick={saveHistoryCheckpoint}>Save dated history checkpoint</button>
                          </div>
                          <div className="tension-history-timeline">
                            <strong>Recorded history</strong>
                            {tensionHistory.length ? [...tensionHistory].reverse().map((entry, entryIndex) => <details className="tension-history-entry" key={entry.id}>
                              <summary><span>Checkpoint {tensionHistory.length - entryIndex} · {entry.eventType.replaceAll('_',' ')}</span><time dateTime={entry.recordedAt}>{new Date(entry.recordedAt).toLocaleString()}</time></summary>
                              <div className="tension-history-entry-body">
                                <p><b>Assessment:</b> {entry.previousAssessment ? entry.previousAssessment.replaceAll('_',' ') + ' → ' : 'Initial position → '}{entry.assessment.replaceAll('_',' ')}</p>
                                <p><b>Status:</b> {entry.previousStatus ? entry.previousStatus.replaceAll('_',' ') + ' → ' : 'Initial position → '}{entry.status.replaceAll('_',' ')}</p>
                                {entry.previousResearcherPosition && <p><b>Previous recorded position:</b> {entry.previousResearcherPosition}</p>}
                                <p><b>Interpretive position:</b> {entry.researcherPosition}</p>
                                <p><b>Reason recorded:</b> {entry.rationale}</p>
                                {entry.evidenceConsidered && <p><b>Evidence considered:</b> {entry.evidenceConsidered}</p>}
                                {entry.previousAnalysisSnapshot && <p><b>Previous analysis:</b> {entry.previousAnalysisSnapshot}</p>}
                                {entry.analysisSnapshot && <p><b>Analysis at checkpoint:</b> {entry.analysisSnapshot}</p>}
                                {entry.previousUncertaintySnapshot && <p><b>Previous uncertainty:</b> {entry.previousUncertaintySnapshot}</p>}
                                {entry.uncertaintySnapshot && <p><b>Remaining uncertainty:</b> {entry.uncertaintySnapshot}</p>}
                                <div className="tension-history-passage-snapshot"><small>PASSAGE A · {entry.passageA || 'Reference not recorded'}</small><p>{entry.contextA || 'Context not recorded'}</p><small>PASSAGE B · {entry.passageB || 'Reference not recorded'}</small><p>{entry.contextB || 'Context not recorded'}</p></div>
                              </div>
                            </details>) : <p className="tension-history-empty">No formal history checkpoints yet. Save the initial research position to begin the record.</p>}
                          </div>
                          <p className="tension-history-caution">A checkpoint is a dated snapshot of the research record at this point in time. Editing the live fields does not rewrite earlier checkpoints; save a new checkpoint to document a significant change.</p>
                        </section>
                        <small>Saved in this browser · {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Not yet saved'}. “Resolved by researcher” records your assessment; it does not certify that a contradiction has been disproved.</small>
                        <div className="tension-record-dossier-action"><button type="button" className="outline-button" onClick={() => prepareTheologicalDossier({
                          ...item,
                          reviewKey: key,
                          studyKey: passageDraftKey,
                          claimKey: group.claim.trim().toLocaleLowerCase(),
                          claimDisplay: group.claim,
                          studyPassage: book + ' ' + chapter
                        })}>Prepare research dossier</button></div>
                      </article>;
                    })}
                    <p className="tension-register-caution">Methodological safeguard: do not assume that every difference is a contradiction, and do not assume that every apparent tension has an easy harmonisation. Preserve unresolved evidence and explain the grounds for any conclusion.</p>
                  </section>
                  <label>Unresolved questions<textarea rows={2} value={review.unresolved} onChange={event=>updateReview({unresolved:event.target.value})} placeholder="What still requires examination? Leave genuine uncertainties visible."/></label>
                  <label>Refined doctrinal formulation<textarea rows={3} value={review.formulation} onChange={event=>updateReview({formulation:event.target.value})} placeholder="Write a concise statement no broader than the textual and canonical evidence warrants."/></label>
                  <div className="doctrine-review-actions"><span>{review.approved ? 'Approved and added to Doctrine notes' : review.updatedAt ? 'Review saved in this browser' : 'Awaiting theological review'}</span><button type="button" className="primary-button" disabled={!review.claimLevel || !review.formulation.trim() || review.approved} onClick={approve}>{review.approved ? 'Approved' : 'Approve formulation & add to notes'}</button></div>
                  <small className="doctrine-review-caution">Approval records your judgement; it is not an automated doctrinal verdict. Counts, source ratings and cross-reference links do not establish theological truth by themselves.</small>
                </article>;
              })}
            </section>}
            <section className="research-evidence-panel" aria-label="Research and Scripture evidence">
              <div><strong>Research &amp; Scripture evidence</strong><span>Attach the selected Bible text to support the notes you are recording.</span></div>
              <div className="research-evidence-actions">
                <button type="button" className="outline-button" disabled={!selectedVerseRecords.length} onClick={() => {
                  const citation = selectedVerseCitation;
                  const source = selectedVerseRecords.map(item => citation + ' · ' + translation + '\n' + item.text).join('\n\n');
                  const heading = '\n\n[Scripture evidence — ' + citation + ']\n' + source;
                  setDraftsByPassage(previous => ({...previous,[passageDraftKey]:{...emptyNotes,...(previous[passageDraftKey] || {}),activeStage:stage,[stage]:(previous[passageDraftKey] || emptyNotes)[stage].trimEnd()+heading}}));
                }}>＋ Insert selected verse evidence</button>
                <button type="button" className="outline-button" onClick={() => {setView('reader');setShowStrongs(true);}}>Open word research</button>
                <button type="button" className="outline-button" onClick={() => setView('references')}>Explore cross-references</button>
              </div>
              <small>{selectedVerseRecords.length ? selectedVerseCitation + ' · ' + selectedVerseRecords.length + ' selected verse' + (selectedVerseRecords.length===1?'':'s') : 'Select one or more verses in the Bible Reader to attach their wording here.'} Scripture text is inserted with its reference and current translation.</small>
            </section>
            <div className="editor-heading"><label htmlFor="study-notes">STUDY NOTES</label><div className="editor-tools"><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.max(15,v-1))} aria-label="Decrease notes text size">A−</button><button className="tool-button" type="button" onClick={()=>setNotesFontSize(v=>Math.min(24,v+1))} aria-label="Increase notes text size">A+</button><button className="tool-button notes-expand-button" type="button" onClick={()=>setNotesExpanded(value=>!value)} aria-expanded={notesExpanded}>{notesExpanded?'Collapse editor':'Expand editor'}</button><span>{wordCount} words</span></div></div>
            <textarea id="study-notes" className={notesExpanded?'notes-textarea-expanded':''} style={{fontSize: notesFontSize}} value={note} onChange={e=>setDraftsByPassage(prev=>({...prev,[passageDraftKey]:{...emptyNotes,...(prev[passageDraftKey] || {}),activeStage:stage,[stage]:e.target.value}}))} placeholder={'Begin your '+current.label.toLowerCase()+' notes here…\n\nStudy-note cloud storage will be connected in a later, separately verified phase.'}/>
            <div className="editor-footer"><span>{draftSaveStatus === 'saving' ? 'Saving preview draft…' : draftSaveStatus === 'saved' ? 'Auto-saved in this preview only' : 'Browser storage unavailable · draft not saved'}</span><span>Text size {notesFontSize}px</span></div>
            <div className="stage-footer"><button className="outline-button" type="button" onClick={()=>move(-1)} disabled={stage==='observe'}>Previous stage</button><button className="primary-button" type="button" onClick={()=>move(1)} disabled={stage==='apply'}>Continue to next stage <Icon name="chevron"/></button></div>
          </section>
        </div>
      </div>}
    </main>
  </div>;
}
