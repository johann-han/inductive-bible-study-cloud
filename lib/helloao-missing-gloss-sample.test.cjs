'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collectMissingGlossRecords,
  selectMissingGlossRecordsByLanguage,
  createMissingGlossSample,
  summarizeMissingGlossRecords
} = require('./helloao-missing-gloss-sample.cjs');

test('collects only records with missing gloss and preserves source fields', () => {
  const payload = {chapter:{content:[{verse:3,words:[
    {pos:1,bsbPos:2,language:'hebrew',text:'אָב',strongs:'H1',gloss:null},
    {pos:2,bsbPos:3,language:'greek',text:'λόγος',gloss:'word'},
    {pos:3,bsbPos:4,language:'unknown',text:'x',gloss:null}
  ]}]}};
  const records = collectMissingGlossRecords(payload,'Genesis',1);
  assert.equal(records.length,1);
  assert.equal(records[0].verse,3);
  assert.equal(records[0].text,'אָב');
  assert.equal(records[0].strongs,'H1');
  assert.equal(records[0].gloss,null);
});

test('selects every Greek missing-gloss record without applying a sample cap or changing fields', () => {
  const records = Array.from({length:18047},(_,index)=>({
    book:'Matthew',chapter:1,verse:index+1,pos:index+1,bsbPos:index+1,
    language:'greek',text:'λόγος'+index,strongs:'G3056',gloss:null
  }));
  records.push({book:'Genesis',chapter:1,verse:1,pos:1,bsbPos:1,language:'hebrew',text:'אָב',strongs:'H1',gloss:null});
  const selected = selectMissingGlossRecordsByLanguage(records,'greek');
  assert.equal(selected.length,18047);
  assert.equal(selected[0],records[0]);
  assert.equal(selected.at(-1),records[18046]);
  assert.ok(selected.every(record=>record.language==='greek'));
  assert.equal(selected[0].gloss,null);
  assert.throws(()=>selectMissingGlossRecordsByLanguage(records,'unknown'),/language must be one of/);
  assert.throws(()=>selectMissingGlossRecordsByLanguage(null,'greek'),/records must be an array/);
});

test('samples deterministically with a per-book and language cap', () => {
  const records = Array.from({length:20},(_,index)=>({
    book:'Genesis',chapter:1,verse:index+1,pos:index+1,bsbPos:index+1,
    language:'hebrew',text:'word'+index,gloss:null
  }));
  const first = createMissingGlossSample(records,5);
  const second = createMissingGlossSample(records,5);
  assert.deepEqual(first,second);
  assert.equal(first.missingGlossCountsByLanguage.hebrew,20);
  assert.equal(first.sampleCountsByLanguage.hebrew,5);
  assert.equal(first.records.length,5);
});

test('keeps samples from different books and languages in separate strata', () => {
  const records = [
    {book:'Genesis',language:'hebrew',chapter:1,verse:1,pos:1,bsbPos:1,text:'a'},
    {book:'Matthew',language:'greek',chapter:1,verse:1,pos:1,bsbPos:1,text:'b'},
    {book:'Daniel',language:'aramaic',chapter:2,verse:1,pos:1,bsbPos:1,text:'c'}
  ];
  const result = createMissingGlossSample(records,12);
  assert.equal(result.records.length,3);
  assert.equal(result.sampleCountsByLanguage.aramaic,1);
  assert.equal(result.sampleCountsByLanguage.greek,1);
  assert.equal(result.sampleCountsByLanguage.hebrew,1);
});

test('aggregates all missing-gloss records by Greek Strong and morphology', () => {
  const records = [
    {book:'MAT',language:'greek',strongs:'G3588',parsingFull:'Article',text:'ὁ'},
    {book:'MRK',language:'greek',strongs:'G3588',parsingFull:'Article',text:'τοῦ'},
    {book:'LUK',language:'greek',strongs:'G2532',parsingFull:'Conjunction',text:'καὶ'},
    {book:'DAN',language:'aramaic',strongs:null,parsingFull:'Noun',text:'x'},
    {book:'GEN',language:'hebrew',strongs:'H0853',parsingFull:'Direct object marker',text:'אֵת'}
  ];
  const result = summarizeMissingGlossRecords(records);
  assert.equal(result.totalRecords,5);
  assert.equal(result.byLanguage.greek.records,3);
  assert.equal(result.byLanguage.aramaic.missingStrong,1);
  assert.equal(result.byLanguage.hebrew.withStrong,1);
  assert.equal(result.greekStrongEntries[0].strongs,'G3588');
  assert.equal(result.greekStrongEntries[0].occurrences,2);
  assert.deepEqual(result.greekStrongEntries[0].books,['MAT','MRK']);
  assert.equal(result.greekParsingFullCounts.Article,2);
});

test('separates Greek lexical candidates from core function-word categories', () => {
  const records = [
    {book:'MAT',language:'greek',strongs:'G3588',parsingFull:'Article - Nominative Masculine Singular',text:'ὁ'},
    {book:'MRK',language:'greek',strongs:'G2532',parsingFull:'Conjunction',text:'καὶ'},
    {book:'LUK',language:'greek',strongs:'G1510',parsingFull:'Verb - Present Indicative Active - 3rd Person Singular',text:'ἐστιν'},
    {book:'JHN',language:'greek',strongs:'G3739',parsingFull:'Personal / Relative Pronoun - Nominative Masculine Singular',text:'ὅς'},
    {book:'ACT',language:'greek',strongs:'G0435',parsingFull:'Noun - Nominative Masculine Singular',text:'ἀνήρ'}
  ];
  const result = summarizeMissingGlossRecords(records);
  assert.equal(result.greekBeyondCoreFunctionWords.totalRecords,3);
  assert.equal(result.greekBeyondCoreFunctionWords.strongEntries.length,3);
  assert.deepEqual(
    result.greekBeyondCoreFunctionWords.strongEntries.map(entry => entry.strongs).sort(),
    ['G0435','G1510','G3739']
  );
  assert.equal(result.greekBeyondCoreFunctionWords.parsingFullCounts.Conjunction,undefined);
});
