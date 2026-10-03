export const FEED='https://raw.githubusercontent.com/siahb/nclexapro/main/generated-questions.json';
export const TOPICS=['Fundamentals','Pharmacology','Adult med-surg','Maternity','Pediatrics','Mental health','Prioritization / delegation','Safety'];
export function topicOf(s){const t=s.toLowerCase();return /fundamental/.test(t)?TOPICS[0]:/pharmac/.test(t)?TOPICS[1]:/adult|med.?surg/.test(t)?TOPICS[2]:/matern/.test(t)?TOPICS[3]:/pediatr/.test(t)?TOPICS[4]:/mental/.test(t)?TOPICS[5]:/prioriti|delegat/.test(t)?TOPICS[6]:/safety/.test(t)?TOPICS[7]:null;}
export function validateFeed(raw){
 if(!Array.isArray(raw))throw Error('The question feed is not a list.');
 const ids=new Set(),prompts=new Set(),questions=[],errors=[];
 for(const q of raw){try{
  if(!q||typeof q!=='object')throw Error('Invalid item');
  for(const k of ['id','topic','question','answer','rationale','rationale_source'])if(typeof q[k]!=='string'||!q[k].trim())throw Error(`Missing ${k}`);
  if(!/^[a-zA-Z0-9_-]{1,160}$/.test(q.id)||['__proto__','constructor','prototype'].includes(q.id)||ids.has(q.id))throw Error('Invalid or duplicate ID');
  ids.add(q.id);
  if(q.status!=='ready'||!/^Original\b/i.test(q.rationale_source))throw Error('Item is not marked ready and original');
  const topic=topicOf(q.topic);if(!topic)throw Error('Unrecognized topic');
  if(!Array.isArray(q.choices)||q.choices.length<2||q.choices.length>8)throw Error('Invalid choices');
  const choices=q.choices.map((s,i)=>{const letter=String.fromCharCode(65+i);if(typeof s!=='string'||!s.startsWith(letter+'. ')||!s.slice(3).trim())throw Error('Choices must have consecutive letters');return {letter,text:s.slice(3)};});
  if(!/^[A-H](?:\s*,\s*[A-H])*$/.test(q.answer.trim()))throw Error('Invalid answer letters');
  const answers=q.answer.split(',').map(s=>s.trim());if(new Set(answers).size!==answers.length||answers.some(a=>!choices.some(c=>c.letter===a)))throw Error('Answer does not match choices');
  const explanations={};const sections=q.rationale.split(/(?:^|\n\s*\n)(?=[A-H]:)/);
  for(const s of sections){const m=s.trim().match(/^([A-H]):\s*([\s\S]+)$/);if(m)explanations[m[1]]=m[2];}
  if(choices.some(c=>!explanations[c.letter]))throw Error('Missing option explanation');
  if(!Array.isArray(q.source_urls)||!q.source_urls.length||q.source_urls.some(s=>{try{const u=new URL(s);return u.protocol!=='https:'||!!u.username||!!u.password;}catch{return true;}}))throw Error('Invalid source links');
  const prompt=q.question.trim().toLowerCase().replace(/\s+/g,' ');if(prompts.has(prompt))throw Error('Duplicate question text');prompts.add(prompt);
  questions.push({...q,topicGroup:topic,choices,answers,explanations});
 }catch(e){errors.push(e.message);}}
 return {questions,errors};
}
export const dayKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function grade(expected,selected){return expected.length===selected.length&&new Set(selected).size===selected.length&&expected.every(a=>selected.includes(a));}
export const fresh=()=>({version:1,seen:[],attempts:{},bookmarks:[],daily:{}});
export const storageKey=user=>'qbanco:v1:'+encodeURIComponent(user||'guest');
export function readProgress(storage,user){const raw=storage.getItem(storageKey(user));if(!raw)return fresh();const p=JSON.parse(raw);if(p.version!==1||!Array.isArray(p.seen)||!Array.isArray(p.bookmarks)||!p.attempts||typeof p.attempts!=='object'||!p.daily||typeof p.daily!=='object'||[...p.seen,...p.bookmarks].some(x=>typeof x!=='string')||Object.values(p.daily).some(x=>!Array.isArray(x)||x.some(id=>typeof id!=='string'))||Object.values(p.attempts).some(x=>!x||typeof x.correct!=='boolean'||!Array.isArray(x.selected)))throw Error('Saved progress is invalid.');return p;}
export function dailySet(bank,p,date=dayKey()){
 if(p.daily[date])return p.daily[date];
 const reserved=new Set([...p.seen,...Object.values(p.daily).flat()]);
 const groups=TOPICS.map(t=>bank.filter(q=>q.topicGroup===t&&!reserved.has(q.id)));
 const result=[];while(result.length<10&&groups.some(g=>g.length))for(const g of groups){if(g.length&&result.length<10)result.push(g.shift().id);}
 p.daily[date]=result;return result;
}
export function record(p,q,selected){const correct=grade(q.answers,selected);p.attempts[q.id]={correct,selected:[...selected],at:new Date().toISOString(),count:(p.attempts[q.id]?.count||0)+1};if(!p.seen.includes(q.id))p.seen.push(q.id);return correct;}
export async function loadFeed(fetcher=fetch){const response=await fetcher(FEED,{cache:'no-store',signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('The question feed is temporarily unavailable.');const text=await response.text();if(text.length>8*1024*1024)throw Error('Question feed is too large.');return validateFeed(JSON.parse(text));}
