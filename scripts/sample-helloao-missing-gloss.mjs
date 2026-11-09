#!/usr/bin/env node
/**
 * Read-only, deterministic sample and full aggregation of HelloAO BSB interlinear
 * records missing glosses.
 * Run: node scripts/sample-helloao-missing-gloss.mjs
 * Optional: HELLOAO_API_BASE, HELLOAO_CONCURRENCY, HELLOAO_RETRIES, HELLOAO_TIMEOUT_MS
 * Output: helloao-missing-gloss-sample.json
 */
import auditModule from '../lib/helloao-interlinear-audit.cjs';
import sampleModule from '../lib/helloao-missing-gloss-sample.cjs';

const {buildChapterTargets,extractChapterWords}=auditModule;
const {collectMissingGlossRecords,createMissingGlossSample,summarizeMissingGlossRecords}=sampleModule;
const API_BASE=(process.env.HELLOAO_API_BASE||'https://bible.helloao.org/api').replace(/\/$/,'');
const CONCURRENCY=Math.max(1,Math.min(10,Number.parseInt(process.env.HELLOAO_CONCURRENCY||'4',10)||4));
const RETRIES=Math.max(0,Math.min(5,Number.parseInt(process.env.HELLOAO_RETRIES||'2',10)||0));
const TIMEOUT_MS=Math.max(5000,Number.parseInt(process.env.HELLOAO_TIMEOUT_MS||'30000',10)||30000);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function fetchJson(url) {
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(TIMEOUT_MS)});
  if(!response.ok) throw new Error('HTTP '+response.status+' for '+url);
  return response.json();
}
async function fetchWithRetry(url) {
  let lastError;
  for(let attempt=0;attempt<=RETRIES;attempt++) {
    try { return await fetchJson(url); }
    catch(error) { lastError=error; if(attempt<RETRIES) await delay(500*(2**attempt)); }
  }
  throw lastError;
}
async function runPool(items,worker) {
  let cursor=0,completed=0;
  const results=new Array(items.length),errors=[];
  async function runWorker() {
    while(true) {
      const index=cursor++;
      if(index>=items.length) return;
      try { results[index]=await worker(items[index]); }
      catch(error) { errors.push({passage:items[index].book+' '+items[index].chapter,error:error instanceof Error?error.message:String(error)}); }
      completed++;
      if(completed%100===0||completed===items.length) process.stderr.write('Scanned '+completed+'/'+items.length+' chapters\n');
    }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,items.length)},()=>runWorker()));
  return {results:results.filter(Boolean),errors};
}

const booksPayload=await fetchWithRetry(API_BASE+'/d/bsb-interlinear/books.json');
const books=booksPayload&&booksPayload.books;
const targets=buildChapterTargets(books);
const {results,errors}=await runPool(targets,async target=>{
  const url=API_BASE+'/d/bsb-interlinear/'+target.book+'/'+target.chapter+'.json';
  const payload=await fetchWithRetry(url);
  extractChapterWords(payload,target.book+' '+target.chapter);
  return collectMissingGlossRecords(payload,target.book,target.chapter);
});
const allMissing=results.flat();
const sample=createMissingGlossSample(allMissing);
const summary=summarizeMissingGlossRecords(allMissing);
const report={
  audit:'Read-only stratified sample and full aggregation of HelloAO BSB interlinear words with missing gloss',
  retrievedAt:new Date().toISOString(),
  dataset:'bsb-interlinear',
  sourceApi:API_BASE,
  coverage:{booksListed:books.length,chaptersListed:targets.length,chaptersRetrieved:results.length,chaptersFailed:errors.length},
  totalMissingGlossRecords:allMissing.length,
  fullPopulationSummary:summary,
  sampling:sample,
  failures:errors,
  interpretation:[
    'Full-population summary counts cover all missing-gloss records from successfully retrieved chapters.',
    'The deterministic sample is capped at 12 records per book and explicit language.',
    'All word fields are copied as published. No gloss, lemma, morphology or Strong’s value is inferred.',
    'A missing gloss is not automatically evidence of an error in the source.'
  ]
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(errors.length||results.length!==targets.length) process.exitCode=1;
