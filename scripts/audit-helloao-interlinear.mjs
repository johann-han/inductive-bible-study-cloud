#!/usr/bin/env node
/**
 * Read-only global structural audit of every published HelloAO BSB interlinear chapter.
 * Run: node scripts/audit-helloao-interlinear.mjs
 * Optional: HELLOAO_API_BASE, HELLOAO_CONCURRENCY, HELLOAO_RETRIES, HELLOAO_TIMEOUT_MS
 */
import auditModule from '../lib/helloao-interlinear-audit.cjs';
const {addChapterToStats,buildChapterTargets,createStats}=auditModule;
const API_BASE=(process.env.HELLOAO_API_BASE||'https://bible.helloao.org/api').replace(/\/$/,'');
const CONCURRENCY=Math.max(1,Math.min(10,Number.parseInt(process.env.HELLOAO_CONCURRENCY||'4',10)||4));
const RETRIES=Math.max(0,Math.min(5,Number.parseInt(process.env.HELLOAO_RETRIES||'2',10)||0));
const TIMEOUT_MS=Math.max(5000,Number.parseInt(process.env.HELLOAO_TIMEOUT_MS||'30000',10)||30000);
async function fetchJson(url) {
 const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(TIMEOUT_MS)});
 if(!response.ok) throw new Error('HTTP '+response.status+' for '+url);
 return response.json();
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchWithRetry(url) {
 let lastError;
 for(let attempt=0;attempt<=RETRIES;attempt++) {
  try { return await fetchJson(url); }
  catch(error) { lastError=error; if(attempt<RETRIES) await delay(500*(2**attempt)); }
 }
 throw lastError;
}
async function runPool(items,worker,concurrency) {
 let cursor=0,completed=0;
 const results=new Array(items.length);
 async function runWorker() {
  while(true) {
   const index=cursor++;
   if(index>=items.length) return;
   results[index]=await worker(items[index]);
   completed++;
   if(completed%100===0||completed===items.length) process.stderr.write('Audited '+completed+'/'+items.length+' chapters\n');
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},()=>runWorker()));
 return results;
}
const booksPayload=await fetchWithRetry(API_BASE+'/d/bsb-interlinear/books.json');
const books=booksPayload&&booksPayload.books;
const targets=buildChapterTargets(books);
const datasetMeta=booksPayload.dataset||{};
const overall=createStats();
const perBook=new Map(books.map(book=>[book.id,{book:book.id,expectedChapters:book.numberOfChapters,stats:createStats()}]));
const chapterResults=await runPool(targets,async target=>{
 const label=target.book+' '+target.chapter;
 const url=API_BASE+'/d/bsb-interlinear/'+target.book+'/'+target.chapter+'.json';
 try {
  const payload=await fetchWithRetry(url);
  addChapterToStats(overall,payload,label);
  addChapterToStats(perBook.get(target.book).stats,payload,label);
  return {passage:label,success:true};
 } catch(error) {
  return {passage:label,success:false,error:error instanceof Error?error.message:String(error)};
 }
},CONCURRENCY);
const failures=chapterResults.filter(result=>!result.success);
const booksReport=[...perBook.values()].map(({book,expectedChapters,stats})=>({
 book,expectedChapters,chaptersSucceeded:stats.chaptersSucceeded,
 chaptersFailed:expectedChapters-stats.chaptersSucceeded,verses:stats.verses,
 totalWords:stats.totalWords,byLanguage:stats.byLanguage,unknownLanguageCount:stats.unknownLanguageCount
}));
const expectedChapters=Number.isInteger(datasetMeta.totalNumberOfChapters)?datasetMeta.totalNumberOfChapters:targets.length;
const expectedWords=Number.isInteger(datasetMeta.totalNumberOfWords)?datasetMeta.totalNumberOfWords:null;
const report={
 audit:'HelloAO BSB interlinear global structural coverage audit',
 retrievedAt:new Date().toISOString(),apiBase:API_BASE,dataset:'bsb-interlinear',
 datasetMetadata:{numberOfBooks:datasetMeta.numberOfBooks??books.length,expectedChapters,expectedVerses:datasetMeta.totalNumberOfVerses??null,expectedWords},
 requestConfiguration:{concurrency:CONCURRENCY,retries:RETRIES,timeoutMs:TIMEOUT_MS},
 coverage:{booksListed:books.length,chaptersListed:targets.length,chaptersSucceeded:overall.chaptersSucceeded,chaptersFailed:failures.length,versesRetrieved:overall.verses,wordsRetrieved:overall.totalWords,expectedWords,wordCountMatchesDatasetMetadata:expectedWords===null?null:overall.totalWords===expectedWords},
 languageCounts:overall.byLanguage,unknownLanguageCount:overall.unknownLanguageCount,
 requiredFieldCoverage:overall.fieldStats,lemmaField:overall.lemmaField,
 strongsPrefixes:overall.strongsPrefixes,strongsPrefixesByExplicitLanguage:overall.strongsByLanguage,
 alignmentDiagnostics:{duplicatePosWithinVerse:overall.duplicatePosWithinVerse,duplicateBsbPosWithinVerse:overall.duplicateBsbPosWithinVerse,invalidWordRecords:overall.invalidWordRecords},
 perBook:booksReport,failures,
 interpretation:[
  'This is a global structural audit of all chapters listed by the live bsb-interlinear books endpoint.',
  'Language counts use only each word record explicit language field. Strong’s prefixes are reported separately and are not used to infer language.',
  'Strong’s-prefix counts by explicit language are descriptive diagnostics, not proof of lexical or language mappings.',
  'Missing lemma/lemmaId fields are consistent with the currently documented InterlinearWord schema.',
  'No dictionary lemma or Strong’s-to-BDB/Abbott-Smith mapping is inferred or verified.',
  'Duplicate position counts are diagnostics for manual review, not automatic proof of invalid alignment.'
 ]
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(failures.length||overall.chaptersSucceeded!==targets.length) process.exitCode=1;
