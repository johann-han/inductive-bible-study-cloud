const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function loadStudyLibrarySearchTextBuilder() {
  const startMarker = '    function buildStudyLibrarySearchText(record) {';
  const endMarker = '    function renderStudyLibrary() {';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'the Study Library search builder should exist before renderStudyLibrary');

  const source = html.slice(start, end).trim();
  const sandbox = {
    VERSE_MAP_FIELDS: ['verseText', 'translation', 'context', 'keyWords', 'wordStudies', 'translationComparison', 'crossReferences', 'meaningSummary', 'response'],
    normalizeVerseMaps(value) {
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    },
    normalizePassageOutline(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      return {
        ...value,
        sections: Array.isArray(value.sections) ? value.sections : []
      };
    }
  };
  return vm.runInNewContext('(' + source + ')', sandbox);
}

test('Study Library search includes Doctrine notes as well as the other three stages', () => {
  const buildSearchText = loadStudyLibrarySearchTextBuilder();
  const record = {
    book: 'Romans',
    chapter: 2,
    sections: {
      observe: 'Paul identifies the audience.',
      interpret: 'The argument exposes partiality.',
      doctrine: 'God judges impartially according to truth.',
      apply: 'Practice sincere self-examination.'
    }
  };
  const searchableText = buildSearchText(record);

  for (const expected of [
    'paul identifies the audience.',
    'the argument exposes partiality.',
    'god judges impartially according to truth.',
    'practice sincere self-examination.'
  ]) {
    assert.ok(searchableText.includes(expected), 'missing search content: ' + expected);
  }
  assert.match(html, /coverageFilteredEntries\.filter\(record => buildStudyLibrarySearchText\(record\)\.includes\(query\)\)/,
    'the library search should use the tested builder');
});

test('Study Library search includes saved verse maps and passage-outline text', () => {
  const buildSearchText = loadStudyLibrarySearchTextBuilder();
  const record = {
    book: 'John',
    chapter: 3,
    sections: {},
    verseMaps: {
      '16': {
        context: 'God demonstrates covenant love.',
        keyWords: 'only begotten son',
        wordStudies: 'agapao',
        translationComparison: 'wording across translations'
      }
    },
    passageOutline: {
      title: 'God’s love and the Son',
      sections: [
        {
          heading: 'The Gift',
          verseRange: '3:16',
          majorIdea: 'God gives his Son',
          supportingDetails: 'The gift leads to eternal life'
        }
      ]
    }
  };
  const searchableText = buildSearchText(record);

  for (const expected of [
    'god demonstrates covenant love.',
    'only begotten son',
    'agapao',
    'wording across translations',
    'god’s love and the son',
    'the gift',
    '3:16',
    'god gives his son',
    'the gift leads to eternal life'
  ]) {
    assert.ok(searchableText.includes(expected), 'missing searchable content: ' + expected);
  }
});

test('Study Library search is case-insensitive and handles incomplete records safely', () => {
  const buildSearchText = loadStudyLibrarySearchTextBuilder();

  assert.ok(buildSearchText({ book: 'Romans', chapter: 2, sections: { doctrine: 'Grace and Truth' } }).includes('grace and truth'));
  assert.equal(typeof buildSearchText(null), 'string');
});
