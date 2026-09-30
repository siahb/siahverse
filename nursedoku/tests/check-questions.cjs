const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const questions=JSON.parse(app.split('const BONUS=')[1].split(';\nfunction normalizeQuestionHistory')[0]);
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/original-questions.json'),'utf8'));
assert.deepStrictEqual(questions.slice(0,original.length),original,'Existing IDs, indices and answers must stay unchanged');
assert(app.includes("const QUIZ_VERSION='nclex-2026-09-29';"),'Append-only additions must preserve saved answers');
assert(questions.length>original.length&&questions.length<=5000);
const seen=new Set(),stems=new Set();
for(const [i,q] of questions.entries()){
 assert.equal(q.id,'nclex-'+String(i+1).padStart(5,'0'));
 assert(!seen.has(q.id));seen.add(q.id);
 const stem=q.q.toLowerCase().replace(/[^a-z0-9]+/g,' ');assert(!stems.has(stem),'Duplicate question');stems.add(stem);
 assert(q.topic&&q.q.length>40&&q.why.length>80);
 assert.equal(q.a.length,4);assert.equal(new Set(q.a).size,4);assert(q.a.every(a=>typeof a==='string'&&a.length));
 assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);
 if(q.source)assert(/^https:\/\/(www\.)?(niddk\.nih\.gov|nhlbi\.nih\.gov|nimh\.nih\.gov|nichd\.nih\.gov|safetosleep\.nichd\.nih\.gov|cancer\.gov|fda\.gov|cdc\.gov)\//.test(q.source));
 else assert(/calculation/i.test(q.topic));
}
const review=JSON.parse(fs.readFileSync(path.join(root,'content/question-reviews/2026-09-30.json'),'utf8'));
assert.equal(review.added,22);assert.equal(review.total,34);
for(const r of review.questions){const q=questions.find(q=>q.id===r.id);assert(q);assert.equal(q.source,r.source);assert.equal(r.checkedOn,'2026-09-30');}
// Independent numeric expectations also checked with Python Fraction during authoring.
assert.equal(questions[30].a[questions[30].correct],'3 tablets');
assert.equal(questions[31].a[questions[31].correct],'30 gtt/min');
assert.equal(questions[32].a[questions[32].correct],'15 mL/hr');
assert.equal(questions[33].a[questions[33].correct],'5 mL');
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('NCLEX question'));
console.log(`PASS: ${questions.length} questions; original bank unchanged, valid IDs/answers/sources, review coverage, calculation keys, cap and heading.`);
