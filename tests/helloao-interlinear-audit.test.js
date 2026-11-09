'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {addChapterToStats,buildChapterTargets,createStats,extractChapterWords}=require('../lib/helloao-interlinear-audit.cjs');
function word(overrides={}) {
 return {pos:1,bsbPos:1,language:'hebrew',text:'בָּרָא',transliteration:'bara',parsing:'V-QAL-PERF-3MS',parsingFull:'Verb - Qal - Perfect - 3rd Person Masculine Singular',strongs:'H1254',gloss:'create',...overrides};
}
test('builds every chapter target from dataset metadata',()=>{
 assert.deepEqual(buildChapterTargets([{id:'GEN',firstChapterNumber:1,lastChapterNumber:2,numberOfChapters:2},{id:'DAN',firstChapterNumber:2,lastChapterNumber:3,numberOfChapters:2}]),[
  {book:'GEN',chapter:1},{book:'GEN',chapter:2},{book:'DAN',chapter:2},{book:'DAN',chapter:3}
 ]);
});
test('rejects incomplete or inconsistent book metadata',()=>{
 assert.throws(()=>buildChapterTargets([]),/non-empty books array/);
 assert.throws(()=>buildChapterTargets([{id:'GEN',numberOfChapters:2,firstChapterNumber:1,lastChapterNumber:3}]),/range mismatch/);
});
test('extracts the documented chapter.content structure',()=>{
 const result=extractChapterWords({chapter:{content:[{verse:1,words:[word()]}]}},'GEN 1');
 assert.equal(result.verses.length,1); assert.equal(result.words.length,1);
});
test('rejects unexpected chapter shapes and malformed verses',()=>{
 assert.throws(()=>extractChapterWords({chapterContent:[]},'GEN 1'),/expected chapter.content array/);
 assert.throws(()=>extractChapterWords({chapter:{content:[{verse:1}]}},'GEN 1'),/missing its words array/);
});
test('aggregates explicit languages, fields, prefixes and lemma coverage',()=>{
 const stats=createStats();
 addChapterToStats(stats,{chapter:{content:[
  {verse:1,words:[word(),word({pos:2,language:'aramaic',text:'אֱלָהּ',strongs:'H0426'})]},
  {verse:2,words:[word({language:'greek',text:'λόγος',strongs:'G3056',lemma:'λόγος'})]}
 ]}},'TEST 1');
 assert.equal(stats.chaptersSucceeded,1); assert.equal(stats.verses,2); assert.equal(stats.totalWords,3);
 assert.deepEqual(stats.byLanguage,{hebrew:1,aramaic:1,greek:1});
 assert.equal(stats.unknownLanguageCount,0); assert.deepEqual(stats.strongsPrefixes,{H:2,G:1,other:0});
 assert.equal(stats.strongsByLanguage.aramaic.H,1); assert.equal(stats.lemmaField.present,1);
 assert.equal(stats.lemmaField.nullOrMissing,2); assert.equal(stats.fieldStats.gloss.present,3);
});
test('reports unknown language and repeated positions without inferring language',()=>{
 const stats=createStats();
 addChapterToStats(stats,{chapter:{content:[{verse:1,words:[word({language:'unknown-value',strongs:'G0001'}),word({language:'hebrew',strongs:'H0001',bsbPos:2})]}]}},'TEST 2');
 assert.equal(stats.unknownLanguageCount,1); assert.equal(stats.strongsByLanguage.unknown.G,1);
 assert.equal(stats.strongsByLanguage.hebrew.H,1); assert.equal(stats.duplicatePosWithinVerse,1);
 assert.equal(stats.duplicateBsbPosWithinVerse,0);
});
test('separates missing Strong’s values from present nonstandard values by language',()=>{
 const stats=createStats();
 addChapterToStats(stats,{chapter:{content:[{verse:1,words:[
  word({strongs:null}),
  word({pos:2,strongs:'',language:'aramaic'}),
  word({pos:3,strongs:'X123',language:'hebrew'}),
  word({pos:4,strongs:'G123',language:'greek'})
 ]}] }},'TEST 3');
 assert.deepEqual(stats.strongsOtherBreakdown.hebrew,{missing:1,nonstandard:1});
 assert.deepEqual(stats.strongsOtherBreakdown.aramaic,{missing:1,nonstandard:0});
 assert.deepEqual(stats.strongsOtherBreakdown.greek,{missing:0,nonstandard:0});
 assert.equal(stats.missingFieldsByLanguage.hebrew.strongs,1);
 assert.equal(stats.missingFieldsByLanguage.aramaic.strongs,1);
 assert.equal(stats.strongsPrefixes.other,3);
});
