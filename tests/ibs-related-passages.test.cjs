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
    studyRecordKey: (book, chapter) => book + '::' + chapter,
    readStudyTombstones: () => ({}),
    writeStudyTombstones: () => true,
    scheduleCloudStudySync: () => events.push('sync'),
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
  assert.deepEqual(sandbox.crossReferenceStudySource, { book: 'Romans', chapter: 8 });
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
  assert.match(kerygmaHtml, /if\(value\.scope==='study'&&value\.verse==null\)return\{book:refBook,chapter:refChapter,verse:null,scope:'study'\}/);
  assert.match(kerygmaHtml, /ref\.source\.scope === 'study' \? ' \(active study\)'/);
});
