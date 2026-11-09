'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {collectMissingGlossRecords,createMissingGlossSample} = require('./helloao-missing-gloss-sample.cjs');

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
