const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const kerygmaHtml = fs.readFileSync(path.join(__dirname, '..', 'sermon', 'index.html'), 'utf8');

function extractFunction(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'expected function between markers: ' + startMarker);
  return source.slice(start, end).trim();
}

class FakeElement {
  constructor(id = 'element') {
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.title = '';
    this.listeners = {};
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach(name => this.classList.values.add(name)),
      remove: (...names) => names.forEach(name => this.classList.values.delete(name)),
      contains: name => this.classList.values.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classList.values.has(name) : Boolean(force);
        if (enabled) this.classList.values.add(name);
        else this.classList.values.delete(name);
        return enabled;
      }
    };
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  focus() {
    this.focused = true;
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.listeners = {};
  }

  getElementById(id) {
    if (!this.elements.has(id)) this.elements.set(id, new FakeElement(id));
    return this.elements.get(id);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
}

function makeHarness(selectedVerseValues = []) {
  const document = new FakeDocument();
  const events = [];
  const record = {
    book: 'Romans',
    chapter: 8,
    sections: { observe: 'Existing study observations', interpret: '', doctrine: '', apply: '' },
    activeSection: 'observe',
    crossReferences: [],
    updatedAt: '2026-10-24T08:00:00.000Z'
  };
  const library = { 'Romans::8': record };
  const relations = Object.freeze({
    quotation: 'Quotation or allusion',
    parallel: 'Parallel account',
    prophecy: 'Prophecy or fulfilment',
    theme: 'Shared theme or repeated idea',
    explanation: 'Explanation or teaching',
    other: 'Other connection'
  });
  const sandboxTombstones = {};
  const sandbox = {
    document,
    window: { confirm: () => true },
    appState: {
      currentBook: 'Romans',
      currentChapter: 8,
      activeNotesSection: 'observe',
      selectedVerses: new Set(selectedVerseValues)
    },
    BIBLE_CANON: [
      { name: 'Romans', testament: 'NT', chapters: 16 },
      { name: 'John', testament: 'NT', chapters: 21 },
      { name: 'Psalms', testament: 'OT', chapters: 150 }
    ],
    CROSS_REFERENCE_RELATIONS: relations,
    NOTE_SECTION_LABELS: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', apply: 'Discipleship' },
    crossReferenceListFilter: null,
    crossReferenceStudyLevelMode: false,
    crossReferenceStudySource: null,
    cloudSyncState: { user: null },
    saveActiveStudyNote: () => events.push('save-active-note'),
    readStudyLibrary: () => library,
    writeStudyLibrary: value => {
      Object.entries(value).forEach(([key, item]) => { library[key] = item; });
      return true;
    },
    studyRecordKey: (book, chapter) => (book && chapter) ? book + '::' + chapter : 'Romans::8',
    readStudyTombstones: () => sandboxTombstones,
    writeStudyTombstones: value => { Object.keys(sandboxTombstones).forEach(key => delete sandboxTombstones[key]); Object.assign(sandboxTombstones, value); return true; },
    scheduleCloudStudySync: () => events.push('sync'),
    saveStudyNoteVersionSnapshot: savedRecord => { events.push('snapshot'); savedRecord.versionHistory = [...(savedRecord.versionHistory || []), { createdAt: '2026-10-24T08:30:00.000Z' }]; },
    loadActiveStudyNote: () => events.push('load-active-note'),
    renderCrossReferenceList: () => events.push('render-list'),
    updateChapterCrossReferenceButton: () => events.push('update-chapter-count'),
    updateStudyRelatedPassageButton: () => events.push('update-study-count'),
    renderScripture: () => events.push('render-scripture')
  };

  const parseSource = extractFunction(
    indexHtml,
    '    function parseBibleReference(value) {',
    '    function formatCrossReferenceTarget(target) {'
  );
  sandbox.parseBibleReference = vm.runInNewContext('(' + parseSource + ')', sandbox);

  const targetFormatSource = extractFunction(
    indexHtml,
    '    function formatCrossReferenceTarget(target) {',
    '    function formatCrossReferenceSource(source) {'
  );
  sandbox.formatCrossReferenceTarget = vm.runInNewContext('(' + targetFormatSource + ')', sandbox);

  const sourceFormatSource = extractFunction(
    indexHtml,
    '    function formatCrossReferenceSource(source) {',
    '    function collectCrossReferencesForChapter('
  );
  sandbox.formatCrossReferenceSource = vm.runInNewContext('(' + sourceFormatSource + ')', sandbox);

  const modalSource = extractFunction(
    indexHtml,
    '    function openCrossReferenceModal(options = {}) {',
    '    async function openCrossReferencePassage(entry) {'
  );
  sandbox.openCrossReferenceModal = vm.runInNewContext('(' + modalSource + ')', sandbox);

  const workflowSource = extractFunction(
    indexHtml,
    '    function setupCrossReferenceWorkflow() {',
    '    function formatAnnotatedScriptureText('
  );
  const normalizeSource = extractFunction(
    indexHtml,
    '    function normalizeStudyRelatedPassages(value) {',
    '    function formatStudyRelatedPassageReference(item) {'
  );
  sandbox.normalizeStudyRelatedPassages = vm.runInNewContext('(' + normalizeSource + ')', sandbox);
  const legacySource = extractFunction(
    indexHtml,
    '    function relatedPassageFromCrossReference(ref) {',
    '    function getStudyRelatedPassageState(record) {'
  );
  sandbox.relatedPassageFromCrossReference = vm.runInNewContext('(' + legacySource + ')', sandbox);
  const stateSource = extractFunction(
    indexHtml,
    '    function getStudyRelatedPassageState(record) {',
    '    function saveStudyRelatedPassages(book, chapter, entries) {'
  );
  sandbox.getStudyRelatedPassageState = vm.runInNewContext('(' + stateSource + ')', sandbox);
  const referenceFormatSource = extractFunction(
    indexHtml,
    '    function formatStudyRelatedPassageReference(item) {',
    '    function relatedPassageFromCrossReference(ref) {'
  );
  sandbox.formatStudyRelatedPassageReference = vm.runInNewContext('(' + referenceFormatSource + ')', sandbox);
  const includeNotesSource = extractFunction(
    indexHtml,
    '    function includeStudyRelatedPassageInStageNotes(studyKey, itemId, stageOverride = null, options = {}) {',
    '    function insertStudyRelatedPassageIntoNotes(item) {'
  );
  sandbox.includeStudyRelatedPassageInStageNotes = vm.runInNewContext('(' + includeNotesSource + ')', sandbox);
  const removeRelatedSource = extractFunction(
    indexHtml,
    '    function removeStudyRelatedPassage(item) {',
    '    const STANDARD_CROSS_REFERENCE_TSV_URL'
  );
  sandbox.removeStudyRelatedPassage = vm.runInNewContext('(' + removeRelatedSource + ')', sandbox);

  sandbox.setupCrossReferenceWorkflow = vm.runInNewContext('(' + workflowSource + ')', sandbox);
  sandbox.setupCrossReferenceWorkflow();

  return { sandbox, document, events, library, record };
}

test('Study panel exposes a related-passage action and the form supports whole-study sources', () => {
  assert.match(indexHtml, /id="openStudyRelatedPassagesBtn"/);
  assert.match(indexHtml, /openStudyRelatedPassagesBtn[^]*openCrossReferenceModal\(\{ studyLevel: true \}\)/);
  assert.match(indexHtml, /source\.scope === 'study' && source\.verse == null/);
  assert.match(indexHtml, /Related passages for ' \+ source\.book \+ ' ' \+ source\.chapter/);

  const { sandbox, document } = makeHarness();
  document.getElementById('openStudyRelatedPassagesBtn').listeners.click();

  assert.equal(sandbox.crossReferenceStudyLevelMode, true);
  assert.equal(sandbox.crossReferenceStudySource.book, 'Romans');
  assert.equal(sandbox.crossReferenceStudySource.chapter, 8);
  assert.equal(document.getElementById('crossReferenceSourceLabel').textContent, 'Romans 8 (active study)');
  assert.equal(document.getElementById('crossReferenceForm').classList.contains('hidden'), false);
  assert.equal(document.getElementById('crossReferenceModal').classList.contains('hidden'), false);
});

test('Saving a related verse attaches it to the active study, with relation and explanation, without selecting a source verse', () => {
  const { document, library, record, events } = makeHarness();
  document.getElementById('openStudyRelatedPassagesBtn').listeners.click();

  const target = document.getElementById('crossReferenceTargetInput');
  const relation = document.getElementById('crossReferenceRelationSelect');
  const note = document.getElementById('crossReferenceNoteInput');
  const form = document.getElementById('crossReferenceForm');
  target.value = 'John 3:16-18';
  relation.value = 'theme';
  note.value = 'Both passages describe the scope of God’s saving love.';

  form.listeners.submit({ preventDefault() {} });

  assert.equal(library['Romans::8'], record);
  assert.equal(record.sections.observe, 'Existing study observations');
  assert.equal(record.crossReferences.length, 1);
  assert.equal(record.relatedPassages.length, 1);
  assert.equal(record.relatedPassages[0].book, 'John');
  assert.equal(record.relatedPassages[0].chapter, 3);
  assert.equal(record.relatedPassages[0].stage, 'observe');
  assert.equal(record.relatedPassages[0].verses.length, 0, 'verse text is populated asynchronously from the Bible source');
  const saved = record.crossReferences[0];
  assert.equal(saved.source.book, 'Romans');
  assert.equal(saved.source.chapter, 8);
  assert.equal(saved.source.verse, null);
  assert.equal(saved.source.scope, 'study');
  assert.equal(saved.target.book, 'John');
  assert.equal(saved.target.chapter, 3);
  assert.equal(saved.target.startVerse, 16);
  assert.equal(saved.target.endVerse, 18);
  assert.equal(saved.relation, 'theme');
  assert.equal(saved.note, 'Both passages describe the scope of God’s saving love.');
  assert.ok(events.includes('sync'));
  assert.equal(document.getElementById('crossReferenceFormStatus').textContent, 'Related passage saved to this study.');
});

test('Study-level related passages reject a duplicate link but allow a distinct target', () => {
  const { document, record } = makeHarness();
  document.getElementById('openStudyRelatedPassagesBtn').listeners.click();

  const target = document.getElementById('crossReferenceTargetInput');
  const relation = document.getElementById('crossReferenceRelationSelect');
  const note = document.getElementById('crossReferenceNoteInput');
  const form = document.getElementById('crossReferenceForm');
  target.value = 'John 3:16';
  relation.value = 'theme';
  note.value = '';
  form.listeners.submit({ preventDefault() {} });
  assert.equal(record.crossReferences.length, 1);

  target.value = 'John 3:16';
  relation.value = 'theme';
  form.listeners.submit({ preventDefault() {} });
  assert.equal(record.crossReferences.length, 1);
  assert.match(document.getElementById('crossReferenceFormStatus').textContent, /already saved for this study/);

  target.value = 'John 3:17';
  form.listeners.submit({ preventDefault() {} });
  assert.equal(record.crossReferences.length, 2);
});

test('Existing verse-to-verse linking still saves a verse source without study scope', () => {
  const { sandbox, document, record } = makeHarness(['Romans 8:1']);
  document.getElementById('btnOpenCrossReferenceModal').listeners.click();

  assert.equal(sandbox.crossReferenceStudyLevelMode, false);
  assert.equal(document.getElementById('crossReferenceSourceLabel').textContent, 'Romans 8:1');
  document.getElementById('crossReferenceTargetInput').value = 'John 3:16';
  document.getElementById('crossReferenceRelationSelect').value = 'quotation';
  document.getElementById('crossReferenceForm').listeners.submit({ preventDefault() {} });

  assert.equal(record.crossReferences.length, 1);
  assert.equal(record.crossReferences[0].source.verse, 1);
  assert.equal(record.crossReferences[0].source.scope, undefined);
});

test('Study-level related links are included in IBS exports and retained by Kerygma import', () => {
  assert.match(indexHtml, /const studyLevelSource = ref\?\.source\?\.scope === 'study' && ref\.source\.verse == null/);
  assert.match(indexHtml, /source: \{[\s\S]*?scope: 'study'[\s\S]*?\}/);
  assert.match(indexHtml, /relatedPassagesHtml/);
  assert.match(indexHtml, /relatedPassages: getStudyRelatedPassageState\(record\)\.entries\.map/);
  assert.match(indexHtml, /_relatedPassages: relatedPassages/);
  assert.match(kerygmaHtml, /if\(value\.scope==='study'&&value\.verse==null\)return\{book:refBook,chapter:refChapter,verse:null,scope:'study'\}/);
  assert.match(kerygmaHtml, /ref\.source\.scope === 'study' \? ' \(active study\)'/);
  assert.match(kerygmaHtml, /RELATED VERSES INCLUDED IN THE SAVED IBS STUDY/);
});


test('Related verse text is inserted into the saved active-stage note, preserving existing notes and preventing duplicates', () => {
  const { sandbox, record, events } = makeHarness();
  record.relatedPassages = [{
    id: 'related-john-3-16',
    crossReferenceId: 'xref-related-1',
    book: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 17,
    reference: 'John 3:16-17',
    translation: 'KJV',
    verses: [
      { number: 16, text: 'For God so loved the world.' },
      { number: 17, text: 'For God sent not his Son to condemn the world.' }
    ],
    relation: 'theme',
    note: 'Both passages speak about God’s saving purpose.',
    stage: 'observe',
    includedInStageNotes: false,
    createdAt: '2026-10-24T08:20:00.000Z'
  }];

  const inserted = sandbox.includeStudyRelatedPassageInStageNotes('Romans::8', 'related-john-3-16');
  assert.equal(inserted, true);
  assert.match(record.sections.observe, /Existing study observations/);
  assert.match(record.sections.observe, /\[Related passage: John 3:16-17\]/);
  assert.match(record.sections.observe, /16\. For God so loved the world\./);
  assert.match(record.sections.observe, /17\. For God sent not his Son to condemn the world\./);
  assert.match(record.sections.observe, /Why it matters: Both passages speak about God’s saving purpose\./);
  assert.equal(record.relatedPassages[0].includedInStageNotes, true);
  assert.equal(record.relatedPassages[0].stage, 'observe');
  assert.ok(events.includes('snapshot'));
  assert.ok(events.includes('sync'));

  const before = record.sections.observe;
  sandbox.includeStudyRelatedPassageInStageNotes('Romans::8', 'related-john-3-16');
  assert.equal(record.sections.observe, before, 'a second insert must not duplicate the passage block');
  assert.equal((record.sections.observe.match(/\[Related passage: John 3:16-17\]/g) || []).length, 1);
});

test('A related verse can also be included in a different active stage without replacing the original stage notes', () => {
  const { sandbox, record } = makeHarness();
  record.relatedPassages = [{
    id: 'related-psalm-23',
    crossReferenceId: 'xref-related-2',
    book: 'Psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    reference: 'Psalms 23:1',
    translation: 'KJV',
    verses: [{ number: 1, text: 'The LORD is my shepherd; I shall not want.' }],
    relation: 'theme',
    note: 'God’s shepherd care.',
    stage: 'observe',
    includedInStageNotes: false,
    createdAt: '2026-10-24T08:20:00.000Z'
  }];

  sandbox.appState.activeNotesSection = 'interpret';
  sandbox.includeStudyRelatedPassageInStageNotes('Romans::8', 'related-psalm-23', 'interpret');
  assert.match(record.sections.observe, /Existing study observations/);
  assert.equal(record.sections.interpret.includes('[Related passage: Psalms 23:1]'), true);
  assert.equal(record.relatedPassages[0].stage, 'interpret');
  assert.equal(record.relatedPassages[0].includedInStageNotes, true);
});

test('Existing study-level links are migrated into full related passage items without losing the link metadata', () => {
  const { sandbox } = makeHarness();
  sandbox.appState.activeNotesSection = 'interpret';
  const state = sandbox.getStudyRelatedPassageState({
    relatedPassages: [],
    crossReferences: [{
      id: 'xref-legacy',
      source: { book: 'Romans', chapter: 8, verse: null, scope: 'study' },
      target: { book: 'John', chapter: 3, startVerse: 16, endVerse: 17 },
      relation: 'theme',
      note: 'Shared theme.',
      createdAt: '2026-10-24T08:00:00.000Z'
    }]
  });
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].book, 'John');
  assert.equal(state.entries[0].stage, 'interpret');
  assert.equal(state.entries[0].note, 'Shared theme.');
  assert.equal(state.entries[0].verses.length, 0);
  assert.equal(state.changed, true);
});

test('Kerygma normalizes and retains verse text as study content, not only cross-reference metadata', () => {
  const normalizerSource = extractFunction(
    kerygmaHtml,
    '            normalizeInductiveStudyPacket(raw) {',
    '            async handleInductiveStudyFile(file) {'
  );
  const normalizedFunctionSource = normalizerSource.replace(
    /^normalizeInductiveStudyPacket\(raw\)\s*\{/,
    'function normalizeInductiveStudyPacket(raw) {'
  );
  const normalize = vm.runInNewContext('(' + normalizedFunctionSource + ')', {});
  const packet = normalize({
    format: 'inductive-bible-study-sermon-source',
    version: 1,
    studyReference: { book: 'Romans', chapter: 8, display: 'Romans 8' },
    sermonPassage: 'Romans 8',
    translation: 'KJV',
    sections: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', discipleship: 'Discipleship' },
    relatedPassages: [{
      id: 'related-john-3-16',
      book: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 17,
      reference: 'John 3:16-17',
      translation: 'KJV',
      stage: 'observe',
      includedInStageNotes: true,
      relation: 'Shared theme',
      note: 'God’s saving purpose.',
      verses: [
        { number: 16, text: 'For God so loved the world.' },
        { number: 17, text: 'For God sent not his Son to condemn the world.' }
      ]
    }]
  });
  assert.equal(packet.relatedPassages.length, 1);
  assert.equal(packet.relatedPassages[0].reference, 'John 3:16-17');
  assert.equal(packet.relatedPassages[0].verses.length, 2);
  assert.equal(packet.relatedPassages[0].verses[0].text, 'For God so loved the world.');
  assert.equal(packet.relatedPassages[0].includedInStageNotes, true);
  assert.match(kerygmaHtml, /RELATED PASSAGES INCLUDED IN THE ACTIVE IBS STUDY/);
  assert.match(kerygmaHtml, /IBS related passages included in the active study/);
});


test('Removing a related passage removes its included stage-note block while preserving other notes', () => {
  const { sandbox, record, events } = makeHarness();
  const item = {
    id: 'related-john-3-16',
    crossReferenceId: 'xref-related-1',
    book: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 17,
    translation: 'KJV',
    verses: [{ number: 16, text: 'For God so loved the world.' }],
    relation: 'theme',
    note: 'God’s saving purpose.',
    stage: 'observe',
    includedInStageNotes: true,
    createdAt: '2026-10-24T08:20:00.000Z'
  };
  record.sections.observe = 'Existing study observations.\n\n[Related passage: John 3:16-17]\nTranslation: KJV\nConnection: Shared theme or repeated idea\n16. For God so loved the world.\nWhy it matters: God’s saving purpose.\n\n';
  record.relatedPassages = [item];
  record.crossReferences = [{
    id: 'xref-related-1',
    source: { book: 'Romans', chapter: 8, verse: null, scope: 'study' },
    target: { book: 'John', chapter: 3, startVerse: 16, endVerse: 17 },
    relation: 'theme',
    note: 'God’s saving purpose.',
    createdAt: item.createdAt
  }];

  sandbox.removeStudyRelatedPassage(item);
  assert.match(record.sections.observe, /Existing study observations\./);
  assert.doesNotMatch(record.sections.observe, /\[Related passage: John 3:16-17\]/);
  assert.equal(record.relatedPassages.length, 0);
  assert.equal(record.crossReferences.length, 0);
  assert.ok(events.includes('snapshot'));
  assert.ok(events.includes('sync'));
});

test('Both IBS and Kerygma inline application scripts remain syntactically valid', () => {
  const check = (source, filename) => {
    const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(match => !/\bsrc\s*=/.test(match[1]) &&
        !/\btype\s*=\s*["']?(?:application\/json|application\/ld\+json)/i.test(match[1]));
    assert.ok(scripts.length > 0, filename + ' should include an inline application script');
    scripts.forEach((match, index) => {
      new vm.Script(match[2], { filename: filename + '-inline-' + index });
    });
  };
  check(indexHtml, 'IBS');
  check(kerygmaHtml, 'Kerygma');
});


test('selected verse copy action copies the reference, translation, and verse text', () => {
  assert.match(indexHtml, /id="btnCopySelectedVerse"/);
  assert.match(indexHtml, /Select exactly one verse to copy its reference and text/);
  const copySource = extractFunction(
    indexHtml,
    '    async function copySelectedVerse() {',
    '    function setupVerseMappingWorkflow() {'
  );
  assert.match(copySource, /appState\.selectedVerses\.size !== 1/);
  assert.match(copySource, /appState\.currentTranslationAbbr/);
  assert.ok(copySource.includes("const match = /^(.*) (\\d+):(\\d+)$/.exec(selectedKey);"), 'copy handler must parse book chapter and verse');
  assert.ok(copySource.includes("appState.currentTranslationAbbr + ')\\n' + verseText;"), 'copied reference and verse should be separated by a newline');
  assert.match(copySource, /navigator\.clipboard\?\.writeText/);
  assert.match(copySource, /document\.execCommand\('copy'\)/);
  assert.match(indexHtml, /btnCopySelectedVerse'\)\?\.addEventListener\('click', copySelectedVerse\)/);
});


test('Study panel close clears inline transform so translate-x-full can hide it', () => {
  const panelWorkflow = extractFunction(
    indexHtml,
    '    function openStudyWorkspacePanel() {',
    '    function openDashboardStudy('
  );
  assert.match(panelWorkflow, /\['display', 'position', 'inset-block', 'right', 'left', 'transform', 'z-index'\]/);
  assert.match(panelWorkflow, /panel\.style\.removeProperty\(property\)/);
  assert.match(panelWorkflow, /'hidden', 'translate-x-full', 'workspace-expanded',\s*'workspace-mobile-open', 'workspace-mobile-closed'/);
  assert.doesNotMatch(panelWorkflow, /panel\.style\.transform\s*=\s*'translateX\(0\)'/);
});

test('Study panel never opens the blurred mobile navigation backdrop', () => {
  const panelWorkflow = extractFunction(
    indexHtml,
    '    function openStudyWorkspacePanel() {',
    '    function openDashboardStudy('
  );
  assert.match(panelWorkflow, /backdrop\?\.classList\.add\('hidden'\)/);
  assert.doesNotMatch(panelWorkflow, /backdrop\?\.classList\.remove\('hidden'\)/);

  const closeWorkflow = extractFunction(
    indexHtml,
    '      const setWorkspaceOpen = (show) => {',
    '      if (toggleWorkspaceMobile) {'
  );
  assert.match(closeWorkflow, /clearWorkspacePanelInlinePosition\(workspacePanel\)/);
  assert.match(closeWorkflow, /workspacePanel\.classList\.add\('translate-x-full'\)/);
  assert.match(closeWorkflow, /document\.getElementById\('mobileBackdrop'\)\?\.classList\.add\('hidden'\)/);
  assert.doesNotMatch(closeWorkflow, /mobileBackdrop\?\.classList\.toggle/);
});


test('Resume Observe Study forces the active study panel into view on phones', () => {
  assert.match(indexHtml, /#workspacePanel\.workspace-mobile-open\s*\{[\s\S]*?position: fixed !important;[\s\S]*?width: 100vw !important;[\s\S]*?height: 100dvh !important;[\s\S]*?transform: translateX\(0\) !important;[\s\S]*?z-index: 70 !important;/);
  assert.match(indexHtml, /#workspacePanel\.workspace-mobile-closed\s*\{\s*transform: translateX\(100%\) !important;/);

  const openWorkflow = extractFunction(
    indexHtml,
    '    function openStudyWorkspacePanel() {',
    '    function openDashboardStudy('
  );
  assert.match(openWorkflow, /document\.body\.classList\.contains\('reader-fullscreen-mode'\)[\s\S]*?setReaderFullscreenMode\(false\)/,
    'opening Notes must exit reader fullscreen, which otherwise forcibly hides the panel');
  assert.match(openWorkflow, /window\.innerWidth <= 767/);
  assert.match(openWorkflow, /if \(isMobile && panel\.parentElement !== document\.body\)\s*\{\s*document\.body\.appendChild\(panel\);\s*\}/,
    'on phones the panel must escape the reader container that clips fixed drawers');
  assert.match(openWorkflow, /panel\.classList\.add\('workspace-mobile-open'\)/);
  assert.match(openWorkflow, /backdrop\?\.classList\.add\('hidden'\)/);

  const resumeHandler = indexHtml.slice(
    indexHtml.indexOf("document.getElementById('dashboardContinueBtn')?.addEventListener('click'"),
    indexHtml.indexOf("document.getElementById('dashboardOpenLibraryBtn')?.addEventListener('click'")
  );
  assert.match(resumeHandler, /openDashboardStudy\(resumeEntry\.book, resumeEntry\.chapter, 'observe', \{ openStudyPanel: true \}\)/);
});


test('Phone Notes link explicitly opens the panel instead of toggling from stale CSS state', () => {
  const toggleStart = indexHtml.indexOf('toggleWorkspaceMobile.onclick = () => {');
  const toggleEnd = indexHtml.indexOf('// Strongs Modal Copy to Notes Button', toggleStart);
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'Notes click handler should be present');
  const toggleSource = indexHtml.slice(toggleStart, toggleEnd);

  assert.match(toggleSource, /const isMobile = typeof window !== 'undefined' && window\.innerWidth <= 767/);
  assert.match(toggleSource, /workspacePanel\.getAttribute\('aria-hidden'\) === 'false'/);
  assert.match(toggleSource, /workspace-mobile-closed/);
  assert.match(toggleSource, /setWorkspaceOpen\(isMobile \? true : !isOpen\)/,
    'phone taps must always request the panel open; the close button handles closing');
  assert.doesNotMatch(toggleSource, /setWorkspaceOpen\(!isOpen\)/,
    'do not let stale transform state turn a phone tap into a close');

  assert.doesNotMatch(indexHtml, /workspacePanel\?\.classList\.remove\('translate-x-full'\)/,
    'study workflows should use the shared panel opener instead of partial class changes');
  assert.match(indexHtml, /openStudyWorkspacePanel\(\);\s*setAIDrawerOpen\(false\)/);
});


test('AI Study Guide drawer has reliable explicit mobile open and close states', () => {
  const helperStart = indexHtml.indexOf('function setAIDrawerOpen(open) {');
  const helperEnd = indexHtml.indexOf('function setReaderFullscreenMode(enabled) {', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'shared AI drawer state helper should exist');
  const helper = indexHtml.slice(helperStart, helperEnd);

  assert.match(helper, /const isMobileLayout = typeof window !== 'undefined' && window\.innerWidth <= 1024/);
  assert.match(helper, /document\.body\.appendChild\(drawer\)/,
    'mobile AI drawer must escape the reader overflow container');
  assert.match(helper, /drawer\.classList\.add\('ai-drawer-open'\)/);
  assert.match(helper, /drawer\.classList\.add\('translate-x-full', 'ai-drawer-closed'\)/);
  assert.match(helper, /drawer\.setAttribute\('aria-hidden', 'false'\)/);
  assert.match(helper, /drawer\.setAttribute\('aria-hidden', 'true'\)/);

  assert.match(indexHtml, /#aiDrawer\.ai-drawer-closed\s*\{[\s\S]*?transform: translateX\(110%\) !important;[\s\S]*?pointer-events: none !important;/);
  assert.match(indexHtml, /#aiDrawer\.ai-drawer-open\s*\{[\s\S]*?transform: translateX\(0\) !important;[\s\S]*?pointer-events: auto !important;/);
  assert.match(indexHtml, /#aiDrawer\.ai-drawer-mobile\s*\{[\s\S]*?position: fixed !important;[\s\S]*?width: 100vw !important;[\s\S]*?z-index: 100 !important;/);

  const handlers = indexHtml.slice(
    indexHtml.indexOf('// AI Drawer Toggles'),
    indexHtml.indexOf('// AI Study Mentor: requests go to the local backend')
  );
  assert.match(handlers, /toggleAiBtn\.onclick = \(\) => setAIDrawerOpen\(true\)/);
  assert.match(handlers, /closeAiDrawerBtn\.type = 'button'/);
  assert.match(handlers, /event\.stopPropagation\(\)/);
  assert.match(handlers, /setAIDrawerOpen\(false\)/);
  assert.doesNotMatch(indexHtml, /drawer\?\.classList\.(?:add|remove)\('translate-x-full'\)/,
    'AI drawer workflows should use the shared state handler rather than partial transform updates');
});
