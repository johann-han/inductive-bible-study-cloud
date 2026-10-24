const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'expected function between markers: ' + startMarker);
  return html.slice(start, end).trim();
}

class FakeElement {
  constructor(name = 'div') {
    this.name = name;
    this.children = [];
    this.textContent = '';
    this.className = '';
    this.style = {};
    this.listeners = {};
    this.attributes = {};
    this.classList = {
      values: new Set(),
      add: (...items) => items.forEach(item => this.classList.values.add(item)),
      remove: (...items) => items.forEach(item => this.classList.values.delete(item)),
      contains: item => this.classList.values.has(item),
      toggle: (item, force) => {
        const shouldAdd = force === undefined ? !this.classList.values.has(item) : Boolean(force);
        if (shouldAdd) this.classList.values.add(item);
        else this.classList.values.delete(item);
        return shouldAdd;
      }
    };
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  appendChild(node) {
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  get options() {
    return this.children;
  }

  focus() {
    this.focused = true;
  }

  scrollIntoView() {
    this.scrolled = true;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.listeners = {};
    this.body = new FakeElement('body');
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  getElementById(id) {
    if (!this.elements.has(id)) this.elements.set(id, new FakeElement(id));
    return this.elements.get(id);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

function flattenText(element) {
  return [element.textContent, ...element.children.map(flattenText)].filter(Boolean).join(' ');
}

function makeLibrary() {
  return {
    'Romans::2': {
      book: 'Romans',
      chapter: 2,
      updatedAt: '2026-10-20T10:00:00.000Z',
      sections: {
        observe: 'Paul identifies the audience.',
        interpret: 'The argument exposes partiality.',
        doctrine: 'God judges impartially.',
        apply: 'Practice sincere self-examination.'
      }
    },
    '1 Corinthians::7': {
      book: '1 Corinthians',
      chapter: 7,
      updatedAt: '2026-10-23T10:00:00.000Z',
      sections: { observe: 'Paul addresses a question.' }
    },
    'Ephesians::1': {
      book: 'Ephesians',
      chapter: 1,
      updatedAt: '2026-10-22T10:00:00.000Z',
      sections: {},
      verseMaps: { '1': { context: 'Opening greeting.' } }
    },
    'Romans::1': {
      book: 'Romans',
      chapter: 1,
      updatedAt: '2026-10-21T10:00:00.000Z',
      sections: {},
      versionHistory: [{ savedAt: '2026-10-21T09:00:00.000Z' }]
    },
    'John::3': {
      book: 'John',
      chapter: 3,
      updatedAt: '2026-10-24T10:00:00.000Z',
      sections: {}
    },
    'Genesis::0': {
      book: 'Genesis',
      chapter: 0,
      sections: { observe: 'Invalid chapter should be excluded.' }
    },
    'invalid-record': null
  };
}

function createDashboardHarness(library, appState, activePointer = null) {
  const document = new FakeDocument();
  const sandbox = {
    appState,
    document,
    NOTE_SECTION_LABELS: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', apply: 'Discipleship' },
    readStudyLibrary: () => library,
    readLastActiveStudy: () => activePointer,
    normalizeVerseMaps(value) {
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    },
    hasSavedPassageOutline(value) {
      return Boolean(value && Array.isArray(value.sections) && value.sections.length);
    }
  };

  const entriesSource = extractFunction(
    '    function getDashboardStudyEntries() {',
    '    function openDashboardStudy(book, chapter, suggestedSection = null) {'
  );
  sandbox.getDashboardStudyEntries = vm.runInNewContext('(' + entriesSource + ')', sandbox);
  const completeSource = extractFunction(
    '    function isDashboardStudyComplete(record) {',
    '    function preferredDashboardStudySection(record, suggestedSection) {'
  );
  sandbox.isDashboardStudyComplete = vm.runInNewContext('(' + completeSource + ')', sandbox);
  const preferredSource = extractFunction(
    '    function preferredDashboardStudySection(record, suggestedSection) {',
    '    function readLastActiveStudy() {'
  );
  sandbox.preferredDashboardStudySection = vm.runInNewContext('(' + preferredSource + ')', sandbox);

  const renderSource = extractFunction(
    '    function renderStudyDashboard() {',
    '    function setupStudyDashboard() {'
  );
  sandbox.renderStudyDashboard = vm.runInNewContext('(' + renderSource + ')', sandbox);
  return { sandbox, document };
}

test('dashboard entries include saved study evidence, exclude empty/invalid records, and sort newest first', () => {
  const library = makeLibrary();
  const before = JSON.stringify(library);
  const { sandbox } = createDashboardHarness(library, {
    currentBook: 'Romans',
    currentChapter: 5,
    currentTranslationAbbr: 'WEB'
  });

  const entries = sandbox.getDashboardStudyEntries();
  assert.deepEqual(
    Array.from(entries, record => record.book + ' ' + record.chapter),
    ['1 Corinthians 7', 'Ephesians 1', 'Romans 1', 'Romans 2']
  );
  assert.equal(JSON.stringify(library), before, 'reading and sorting dashboard entries must not mutate saved records');
});

test('dashboard counts actual filled inductive stages and reflects the current passage', () => {
  const { sandbox, document } = createDashboardHarness(makeLibrary(), {
    currentBook: 'Romans',
    currentChapter: 5,
    currentTranslationAbbr: 'WEB'
  });

  sandbox.renderStudyDashboard();

  assert.equal(document.getElementById('dashboardSavedCount').textContent, '4');
  assert.equal(document.getElementById('dashboardSectionsCount').textContent, '5 / 16');
  assert.equal(document.getElementById('dashboardCompleteCount').textContent, '1');
  assert.equal(document.getElementById('dashboardCurrentPassage').textContent, 'Romans 5');
  assert.equal(document.getElementById('dashboardCurrentTranslation').textContent, 'Translation: WEB');
  assert.equal(document.getElementById('dashboardResumeTitle').textContent, '1 Corinthians 7');
  assert.equal(document.getElementById('dashboardResumeStage').textContent, 'Unfinished study · resume at Interpret.');
  assert.equal(document.getElementById('dashboardContinueBtn').textContent, 'Resume Interpret study');

  const progress = document.getElementById('dashboardStageProgress').children;
  assert.equal(progress.length, 4);
  assert.match(flattenText(progress[0]), /Observe.*2 of 4 passages/);
  assert.match(flattenText(progress[1]), /Interpret.*1 of 4 passages/);
  assert.match(flattenText(progress[2]), /Doctrine.*1 of 4 passages/);
  assert.match(flattenText(progress[3]), /Discipleship.*1 of 4 passages/);
});

test('dashboard limits recent passages to five and renders passage names as text', () => {
  const library = {};
  for (let index = 1; index <= 7; index += 1) {
    const book = index === 1 ? '<img src=x onerror=alert(1)>' : 'Book ' + index;
    library['record-' + index] = {
      book,
      chapter: index,
      updatedAt: '2026-10-' + String(24 - index).padStart(2, '0') + 'T10:00:00.000Z',
      sections: { observe: 'Note ' + index }
    };
  }
  const { sandbox, document } = createDashboardHarness(library, {
    currentBook: 'Genesis',
    currentChapter: 1,
    currentTranslationAbbr: 'KJV'
  });

  sandbox.renderStudyDashboard();

  const recent = document.getElementById('dashboardRecentStudies');
  assert.equal(recent.children.length, 5);
  const rendered = recent.children.map(card => flattenText(card));
  assert.ok(rendered[0].includes('<img src=x onerror=alert(1)> 1'));
  assert.ok(rendered.some(text => text.includes('<img src=x onerror=alert(1)> 1')));
  assert.ok(!rendered.some(text => text.includes('Book 6 6')));
  assert.ok(!rendered.some(text => text.includes('Book 7 7')));
});

test('dashboard shows a helpful empty state when no studies have been saved', () => {
  const { sandbox, document } = createDashboardHarness({}, {
    currentBook: 'Genesis',
    currentChapter: 1,
    currentTranslationAbbr: 'KJV'
  });

  sandbox.renderStudyDashboard();

  assert.equal(document.getElementById('dashboardSavedCount').textContent, '0');
  assert.equal(document.getElementById('dashboardSectionsCount').textContent, '0 / 0');
  assert.equal(document.getElementById('dashboardCompleteCount').textContent, '0');
  assert.match(flattenText(document.getElementById('dashboardRecentStudies')), /No saved passages yet/);
  assert.match(flattenText(document.getElementById('dashboardStageProgress')), /0 of 0 passages/);
});

test('dashboard home is the initial view and its inline book/chapter chooser is present', () => {
  assert.match(html, /<body class="ibs-home-view/);
  assert.match(html, /id="studyDashboardHome"/);
  assert.match(html, /id="readerWorkspace"[^>]*style="display:none"/);
  assert.match(html, /id="openDashboardBtn"[^>]*title="Return to IBS Home"/);
  assert.match(html, /id="dashboardBookSelect"/);
  assert.match(html, /id="dashboardChapterSelect"/);
  assert.match(html, /id="dashboardOpenSelectedPassageBtn"/);
  assert.match(html, /id="dashboardChoosePassageBtn"/);
  assert.match(html, /id="dashboardOpenLibraryBtn"/);
  assert.match(html, /button\.addEventListener\('click', \(\) => openDashboardStudy\(record\.book, record\.chapter\)\)/);
  assert.match(html, /restoreLastActiveStudy\(\);/);
  assert.match(html, /saveLastActiveStudy\(\);/);
});


function createDashboardSetupHarness({ entries = [], pointer = null } = {}) {
  const document = new FakeDocument();
  const events = [];
  const sandbox = {
    document,
    BIBLE_CANON: [
      { name: 'Genesis', testament: 'OT', chapters: 50 },
      { name: 'Romans', testament: 'NT', chapters: 16 },
      { name: 'John', testament: 'NT', chapters: 21 }
    ],
    NOTE_SECTION_LABELS: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', apply: 'Discipleship' },
    appState: { currentBook: 'Genesis', currentChapter: 1, activeNotesSection: 'observe' },
    saveActiveStudyNote: () => events.push('save-active-note'),
    showDashboardHome: () => events.push('show-home'),
    showBibleReader: () => events.push('show-reader'),
    renderStudyDashboard: () => events.push('render-dashboard'),
    renderStudyLibrary: () => events.push('render-library'),
    getDashboardStudyEntries: () => entries,
    isDashboardStudyComplete: record => ['observe', 'interpret', 'doctrine', 'apply'].every(key => String(record?.sections?.[key] || '').trim()),
    readLastActiveStudy: () => pointer,
    preferredDashboardStudySection: (record, suggested) => suggested || record?.activeSection || 'observe',
    openDashboardStudy: (book, chapter, section) => events.push('open:' + book + ':' + chapter + (section ? ':' + section : '')),
  };
  const chapterSource = extractFunction(
    '    function populateDashboardChapterChooser(bookName, preferredChapter = null) {',
    '    function populateDashboardPassageChooser() {'
  );
  sandbox.populateDashboardChapterChooser = vm.runInNewContext('(' + chapterSource + ')', sandbox);
  const chooserSource = extractFunction(
    '    function populateDashboardPassageChooser() {',
    '    function renderStudyDashboard() {'
  );
  sandbox.populateDashboardPassageChooser = vm.runInNewContext('(' + chooserSource + ')', sandbox);
  const source = extractFunction(
    '    function setupStudyDashboard() {',
    '    function setupStudyLibrary() {'
  );
  sandbox.setupStudyDashboard = vm.runInNewContext('(' + source + ')', sandbox);
  sandbox.setupStudyDashboard();
  return { document, events };
}

test('Home and reader controls switch views without treating the dashboard as a dismissible modal', () => {
  const { document, events } = createDashboardSetupHarness();

  document.getElementById('openDashboardBtn').listeners.click();
  assert.ok(events.includes('show-home'));
  document.getElementById('dashboardOpenReaderBtn').listeners.click();
  assert.equal(events.at(-1), 'show-reader');
  document.getElementById('dashboardCloseFooterBtn').listeners.click();
  assert.equal(events.at(-1), 'show-reader');
});

test('Choose Passage stays on the dashboard until a valid book and chapter are confirmed', () => {
  const { document, events } = createDashboardSetupHarness();
  const chooser = document.getElementById('dashboardPassageChooser');
  const book = document.getElementById('dashboardBookSelect');
  const chapter = document.getElementById('dashboardChapterSelect');

  document.getElementById('dashboardChoosePassageBtn').listeners.click();
  assert.equal(chooser.classList.contains('hidden'), false);
  assert.ok(book.options.length > 0);
  assert.ok(chapter.options.length > 0);
  assert.ok(!events.includes('show-reader'));

  book.value = 'Romans';
  book.onchange();
  chapter.value = '2';
  document.getElementById('dashboardOpenSelectedPassageBtn').listeners.click();
  assert.equal(events.at(-1), 'open:Romans:2');
  assert.ok(!events.includes('show-reader'), 'selection itself must not route to the reader before confirmation');

  document.getElementById('dashboardCancelPassageBtn').listeners.click();
  assert.equal(chooser.classList.contains('hidden'), true);
});

test('Resume action chooses the last active unfinished study and restores its stage', () => {
  const incomplete = {
    book: 'Romans',
    chapter: 2,
    activeSection: 'observe',
    sections: { observe: 'Text notes', interpret: '', doctrine: '', apply: '' }
  };
  const pointer = { book: 'Romans', chapter: 2, section: 'interpret' };
  const { document, events } = createDashboardSetupHarness({ entries: [incomplete], pointer });

  document.getElementById('dashboardContinueBtn').listeners.click();
  assert.equal(events.at(-1), 'open:Romans:2:interpret');
});

test('startup restoration returns an unfinished study to its last active passage and stage', () => {
  const library = {
    'Romans::2': {
      book: 'Romans',
      chapter: 2,
      activeSection: 'observe',
      updatedAt: '2026-10-23T10:00:00.000Z',
      sections: { observe: 'Saved observations', interpret: '', doctrine: '', apply: '' }
    },
    'John::3': {
      book: 'John',
      chapter: 3,
      activeSection: 'doctrine',
      updatedAt: '2026-10-22T10:00:00.000Z',
      sections: { observe: 'Observation', interpret: 'Interpretation', doctrine: '', apply: '' }
    }
  };
  const original = JSON.stringify(library);
  const pointer = { book: 'Romans', chapter: 2, section: 'interpret' };
  const { sandbox } = createRestoreStudyHarness(library, pointer);

  assert.equal(sandbox.restoreLastActiveStudy(), true);
  assert.equal(sandbox.appState.currentBook, 'Romans');
  assert.equal(sandbox.appState.currentChapter, 2);
  assert.equal(sandbox.appState.activeNotesSection, 'interpret');
  assert.equal(JSON.stringify(library), original, 'startup restoration must not mutate saved study records');
});

test('startup falls back to the newest unfinished study when no valid last-study pointer exists', () => {
  const library = {
    'Romans::2': {
      book: 'Romans',
      chapter: 2,
      activeSection: 'observe',
      updatedAt: '2026-10-21T10:00:00.000Z',
      sections: { observe: 'Saved observations', interpret: '', doctrine: '', apply: '' }
    },
    'John::3': {
      book: 'John',
      chapter: 3,
      activeSection: 'doctrine',
      updatedAt: '2026-10-23T10:00:00.000Z',
      sections: { observe: 'Observation', interpret: 'Interpretation', doctrine: '', apply: '' }
    }
  };
  const { sandbox } = createRestoreStudyHarness(library, null);

  assert.equal(sandbox.restoreLastActiveStudy(), true);
  assert.equal(sandbox.appState.currentBook, 'John');
  assert.equal(sandbox.appState.currentChapter, 3);
  assert.equal(sandbox.appState.activeNotesSection, 'doctrine');
});

function createRestoreStudyHarness(library, pointer) {
  const document = new FakeDocument();
  const store = new Map();
  if (pointer) store.set('inductive-bible-study-last-active-study-v1', JSON.stringify(pointer));
  const sandbox = {
    document,
    appState: { currentBook: 'Genesis', currentChapter: 1, activeTab: 'OT', activeNotesSection: 'observe' },
    BIBLE_CANON: [
      { name: 'Genesis', testament: 'OT', chapters: 50 },
      { name: 'Romans', testament: 'NT', chapters: 16 },
      { name: 'John', testament: 'NT', chapters: 21 }
    ],
    NOTE_SECTION_LABELS: { observe: 'Observe', interpret: 'Interpret', doctrine: 'Doctrine', apply: 'Discipleship' },
    LAST_ACTIVE_STUDY_STORAGE_KEY: 'inductive-bible-study-last-active-study-v1',
    localStorage: {
      getItem: key => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value))
    },
    readStudyLibrary: () => library,
    normalizeVerseMaps(value) {
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    },
    hasSavedPassageOutline(value) {
      return Boolean(value && Array.isArray(value.sections) && value.sections.length);
    }
  };
  const entriesSource = extractFunction(
    '    function getDashboardStudyEntries() {',
    '    function openDashboardStudy(book, chapter, suggestedSection = null) {'
  );
  sandbox.getDashboardStudyEntries = vm.runInNewContext('(' + entriesSource + ')', sandbox);
  for (const [start, end, key] of [
    ['    function isDashboardStudyComplete(record) {', '    function preferredDashboardStudySection(record, suggestedSection) {', 'isDashboardStudyComplete'],
    ['    function preferredDashboardStudySection(record, suggestedSection) {', '    function readLastActiveStudy() {', 'preferredDashboardStudySection'],
    ['    function readLastActiveStudy() {', '    function saveLastActiveStudy() {', 'readLastActiveStudy'],
    ['    function saveLastActiveStudy() {', '    function restoreLastActiveStudy() {', 'saveLastActiveStudy'],
    ['    function restoreLastActiveStudy() {', '    const scriptureChapterCache = new Map();', 'restoreLastActiveStudy']
  ]) {
    sandbox[key] = vm.runInNewContext('(' + extractFunction(start, end) + ')', sandbox);
  }
  return { sandbox, document };
}
