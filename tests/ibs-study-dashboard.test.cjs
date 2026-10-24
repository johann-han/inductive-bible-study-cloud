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

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
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

function createDashboardHarness(library, appState) {
  const document = new FakeDocument();
  const sandbox = {
    appState,
    document,
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
    '    function openDashboardStudy(book, chapter) {'
  );
  sandbox.getDashboardStudyEntries = vm.runInNewContext('(' + entriesSource + ')', sandbox);

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
    entries.map(record => record.book + ' ' + record.chapter),
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
  assert.equal(document.getElementById('dashboardResumeTitle').textContent, 'Romans 5');

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

test('dashboard entry point and responsive dialog markup remain present', () => {
  assert.match(html, /id="openDashboardBtn"[^>]*title="Open your Bible study dashboard"/);
  assert.match(html, /id="studyDashboardModal"[^>]*role="dialog" aria-modal="true"/);
  assert.match(html, /max-h-\[96dvh\] sm:max-h-\[92vh\]/);
  assert.match(html, /id="dashboardChoosePassageBtn"/);
  assert.match(html, /id="dashboardOpenLibraryBtn"/);
  assert.match(html, /button\.addEventListener\('click', \(\) => openDashboardStudy\(record\.book, record\.chapter\)\)/);
});
