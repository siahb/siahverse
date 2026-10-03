const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const questions=JSON.parse(app.split('const BONUS=')[1].split('function normalizeQuestionHistory')[0].trim().replace(/;$/, ''));
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/original-questions.json'),'utf8'));
assert.deepStrictEqual(questions.slice(0,original.length),original,'Existing IDs, indices and answers must stay unchanged');
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/questions-through-2026-09-30.json'),'utf8'));
assert.deepStrictEqual(questions.slice(0,previous.length),previous,'Previously published questions must stay unchanged');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(questions.slice(0,54))).digest('hex'),'876ffcb5faea542723c22086b713d75b9c4d5de950065f9936330ed30d065ce9','Questions published through October 1 must stay unchanged');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(questions.slice(0,74))).digest('hex'),'556799c20af5a1ffed7a3a2a6a7cc7bb3a7b823a4ac0b89eb2bc0d1f2e92734b','All 74 questions published through October 2 must stay unchanged');
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
 if(q.source)assert(/^https:\/\/(www\.)?(niams\.nih\.gov|medlineplus\.gov|niddk\.nih\.gov|nhlbi\.nih\.gov|nimh\.nih\.gov|ninds\.nih\.gov|nichd\.nih\.gov|safetosleep\.nichd\.nih\.gov|cancer\.gov|fda\.gov|cdc\.gov|pmc\.ncbi\.nlm\.nih\.gov|dailymed\.nlm\.nih\.gov)\//.test(q.source));
 else assert(/calculation/i.test(q.topic));
}
const reviewDir=path.join(root,'content/question-reviews');
const reviews=fs.readdirSync(reviewDir).filter(name=>/^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort().map(name=>JSON.parse(fs.readFileSync(path.join(reviewDir,name),'utf8')));
assert.deepStrictEqual(reviews.slice(0,3).map(r=>[r.date,r.before,r.added,r.total]),[['2026-09-30',12,22,34],['2026-10-01',34,20,54],['2026-10-02',54,20,74]]);
const audited=new Set();let priorTotal=original.length,priorDate='';
for(const review of reviews){
 assert(review.date>priorDate,'Review dates must advance');
 assert.equal(review.before,priorTotal,'Review batches must be contiguous');
 assert(review.added>0&&review.added<=100,'Each batch must respect the per-run limit');
 assert.equal(review.total,review.before+review.added);
 assert.equal(review.questions.length,review.added);
 assert.deepStrictEqual(review.questions.map(r=>r.id),questions.slice(review.before,review.total).map(q=>q.id));
 for(const r of review.questions){assert(!audited.has(r.id),'An item must have one batch review');audited.add(r.id);}
 priorTotal=review.total;priorDate=review.date;
}
assert.equal(priorTotal,questions.length,'All appended questions must be covered by batch reviews');
const october3=reviews.find(r=>r.date==='2026-10-03');
assert.deepStrictEqual([october3.before,october3.added,october3.total],[74,24,98]);
assert.equal(october3.questions.filter(r=>r.source).length,20);
for(const r of october3.questions){assert(r.objective&&r.method);if(r.source)assert(r.support&&r.retrievalRef);else assert(r.calculation);}

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
assert.equal(questions[69].a[questions[69].correct],'125 mL/hr');
assert.equal(questions[70].a[questions[70].correct],'3 mL');
assert.equal(questions[71].a[questions[71].correct],'20 mL/hr');
assert.equal(questions[72].a[questions[72].correct],'7.5 mL');
assert.equal(questions[73].a[questions[73].correct],'6 tablets');
// Four distinct nursing calculation objectives, separately checked with Python Fraction.
const calcChecks=[
 [94,108/(18*4),1.5,'1.5 mL/kg/hr'],
 [95,(600+800+100)-(950+150),400,'+400 mL'],
 [96,10*100+10*50+(26-20)*20,1620,'1,620 mL/day'],
 [97,14*60+10+(300/80)*60,17*60+55,'17:55']
];
for(const [index,computed,expected,label] of calcChecks){
 assert.equal(computed,expected,'Independent calculation failed');
 assert.equal(questions[index].a[questions[index].correct],label,'Calculation answer key changed');
 assert.equal(october3.questions.find(r=>r.id===questions[index].id).calculation.expected,label);
}
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('NCLEX question'));
console.log(`PASS: ${questions.length} questions; original bank unchanged, valid IDs/answers/sources, review coverage, calculation keys, cap and heading.`);

