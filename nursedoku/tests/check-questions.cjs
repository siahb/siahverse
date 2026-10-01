const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const questions=JSON.parse(app.split('const BONUS=')[1].split('function normalizeQuestionHistory')[0].trim().replace(/;$/, ''));
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/original-questions.json'),'utf8'));
assert.deepStrictEqual(questions.slice(0,original.length),original,'Existing IDs, indices and answers must stay unchanged');
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/questions-through-2026-09-30.json'),'utf8'));
assert.deepStrictEqual(questions.slice(0,previous.length),previous,'Previously published questions must stay unchanged');
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
 if(q.source)assert(/^https:\/\/(www\.)?(niddk\.nih\.gov|nhlbi\.nih\.gov|nimh\.nih\.gov|ninds\.nih\.gov|nichd\.nih\.gov|safetosleep\.nichd\.nih\.gov|cancer\.gov|fda\.gov|cdc\.gov)\//.test(q.source));
 else assert(/calculation/i.test(q.topic));
}
const reviewDir=path.join(root,'content/question-reviews');
const reviews=fs.readdirSync(reviewDir).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort().map(name=>JSON.parse(fs.readFileSync(path.join(reviewDir,name),'utf8')));
assert.deepStrictEqual(reviews.map(r=>[r.date,r.before,r.added,r.total]),[['2026-09-30',12,22,34],['2026-10-01',34,20,54]]);
for(const review of reviews)for(const r of review.questions){const q=questions.find(q=>q.id===r.id);assert(q);assert.equal(q.source,r.source);assert.equal(r.checkedOn,review.date);}
// Independent numeric expectations also checked with Python Fraction during authoring.
assert.equal(questions[30].a[questions[30].correct],'3 tablets');
assert.equal(questions[31].a[questions[31].correct],'30 gtt/min');
assert.equal(questions[32].a[questions[32].correct],'15 mL/hr');
assert.equal(questions[33].a[questions[33].correct],'5 mL');
assert.equal(questions[49].a[questions[49].correct],'15 mL');
assert.equal(questions[50].a[questions[50].correct],'4 mL');
assert.equal(questions[51].a[questions[51].correct],'42 gtt/min');
assert.equal(questions[52].a[questions[52].correct],'It is within the supplied safe range');
assert.equal(questions[53].a[questions[53].correct],'8.4 mL/hr');
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('NCLEX question'));
console.log(`PASS: ${questions.length} questions; original bank unchanged, valid IDs/answers/sources, review coverage, calculation keys, cap and heading.`);

