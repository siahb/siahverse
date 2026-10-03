import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFeed,grade,dayKey,dailySet,fresh,record,readProgress,storageKey,loadFeed,TOPICS} from './core.mjs';
// Synthetic non-clinical fixtures: never included in the app's feed.
const fixture=(id='test-1',topic='Fundamentals')=>({id,topic,question:'Synthetic test prompt '+id,choices:['A. Test option one','B. Test option two','C. Test option three'],answer:'A, C',rationale:'A: Test explanation one.\n\nB: Test explanation two.\n\nC: Test explanation three.',rationale_source:'Original synthetic test fixture',status:'ready',source_urls:['https://example.com/source']});
test('SATA is order-independent exact match; no partial or duplicate credit',()=>{assert.ok(grade(['A','C'],['C','A']));for(const a of [[],['A'],['A','B','C'],['A','A']])assert.equal(grade(['A','C'],a),false);assert.ok(grade(['B'],['B']));assert.equal(grade(['B'],['A']),false);});
test('validates required fields, IDs, choices, letters, provenance, sources and every rationale',()=>{assert.equal(validateFeed([fixture()]).questions.length,1);for(const change of [{id:''},{choices:['B. test','A. test']},{answer:'D'},{answer:'A,A'},{rationale:'A: only A'},{source_urls:['javascript:alert(1)']},{status:'draft'},{rationale_source:'Publisher'},{question:''},{topic:'Unknown'}])assert.equal(validateFeed([{...fixture(),...change}]).questions.length,0);assert.equal(validateFeed([fixture(),fixture()]).questions.length,1);assert.throws(()=>validateFeed({}));assert.equal(validateFeed([]).questions.length,0);});
test('Pacific dates across midnight and DST transitions',()=>{assert.equal(dayKey(new Date('2026-10-03T06:59:00Z')),'2026-10-02');assert.equal(dayKey(new Date('2026-10-03T07:00:00Z')),'2026-10-03');assert.equal(dayKey(new Date('2026-11-01T08:59:00Z')),'2026-11-01');assert.equal(dayKey(new Date('2026-11-01T09:01:00Z')),'2026-11-01');});
test('daily sets are balanced, stable, <=10 and never silently repeat reserved/seen IDs',()=>{const bank=validateFeed(TOPICS.flatMap((topic,i)=>Array.from({length:3},(_,j)=>fixture(`t-${i}-${j}`,topic)))).questions;const p=fresh(),first=dailySet(bank,p,'day1');assert.equal(first.length,10);assert.equal(new Set(first.slice(0,8).map(id=>bank.find(q=>q.id===id).topicGroup)).size,8);assert.deepEqual(dailySet(bank,p,'day1'),first);const second=dailySet(bank,p,'day2');assert.equal(second.some(id=>first.includes(id)),false);assert.equal(dailySet(bank,p,'day3').length,4);assert.equal(dailySet(bank,p,'day4').length,0);});
test('retry updates latest result, seen IDs remain unique; signed-in and guest storage separate',()=>{const p=fresh(),q=validateFeed([fixture()]).questions[0];record(p,q,['A']);assert.equal(p.attempts[q.id].correct,false);record(p,q,['A','C']);assert.equal(p.attempts[q.id].correct,true);assert.equal(p.seen.length,1);assert.equal(p.attempts[q.id].count,2);const data=new Map(),storage={getItem:k=>data.get(k)||null};data.set(storageKey('alice'),JSON.stringify(p));assert.equal(readProgress(storage,'alice').seen.length,1);assert.equal(readProgress(storage,'bob').seen.length,0);assert.equal(readProgress(storage,null).seen.length,0);data.set(storageKey(null),'bad');assert.throws(()=>readProgress(storage,null));});
test('feed network, HTTP, JSON and empty failures are handled without fallback content',async()=>{await assert.rejects(loadFeed(async()=>{throw Error('offline');}));await assert.rejects(loadFeed(async()=>({ok:false})));await assert.rejects(loadFeed(async()=>({ok:true,text:async()=>'invalid'})));assert.deepEqual((await loadFeed(async()=>({ok:true,text:async()=>'[]'}))).questions,[]);});
if(process.env.QBANCO_FEED_FILE)test('current public feed passes strict validation',()=>{const result=validateFeed(JSON.parse(fs.readFileSync(process.env.QBANCO_FEED_FILE,'utf8')));assert.deepEqual(result.errors,[]);assert.ok(result.questions.length);console.log(`Validated ${result.questions.length} public original questions.`);});
test('HESI and NCLEX progress stay separate while legacy NCLEX keys remain compatible',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null};
 const nclex=fresh();nclex.seen=['shared-id'];nclex.bookmarks=['shared-id'];nclex.daily['2026-10-03']=['shared-id'];
 assert.equal(storageKey('alice','NCLEX'),storageKey('alice'));
 values.set(storageKey('alice','NCLEX'),JSON.stringify(nclex));
 assert.deepEqual(readProgress(storage,'alice','HESI'),fresh());
 const hesi=fresh();hesi.seen=['hesi-only'];values.set(storageKey('alice','HESI'),JSON.stringify(hesi));
 assert.deepEqual(readProgress(storage,'alice','NCLEX').seen,['shared-id']);
 assert.deepEqual(readProgress(storage,'alice','HESI').seen,['hesi-only']);
 assert.notEqual(storageKey(null,'HESI'),storageKey(null,'NCLEX'));
 assert.throws(()=>storageKey('alice','UNKNOWN'));
});
test('explicit exam labels are validated and unlabelled original feed questions remain NCLEX',()=>{
 assert.equal(validateFeed([fixture()]).questions[0].exam,'NCLEX');
 assert.equal(validateFeed([{...fixture(),exam:'HESI'}]).questions[0].exam,'HESI');
 assert.equal(validateFeed([{...fixture(),exam:'wrong'}]).questions.length,0);
});
