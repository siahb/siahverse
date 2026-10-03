const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const apps = JSON.parse(fs.readFileSync(path.join(root,'changelog/history.json'),'utf8'));
const escape = value => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const intro = 'Selected changes from GitHub commits, using the dates recorded in each source repository. These are code-history dates, not confirmed launch or deployment dates. Older work outside GitHub may not be recorded here.';
function groups(app) {
 const result = new Map();
 [...app.entries].sort((a,b)=>b.date.localeCompare(a.date)).forEach(entry=>{if(!result.has(entry.date))result.set(entry.date,[]);result.get(entry.date).push(entry);});
 return result;
}
const sections = apps.map(app=>`<section id="${app.id}" class="release"><h2>${escape(app.name)}</h2>${app.note?`<p class="state">${escape(app.note)}</p>`:''}<p><a href="https://github.com/siahb/${app.repo}/commits/main/${app.path||''}">View GitHub history</a></p>${[...groups(app)].map(([date,entries])=>`<h3><time datetime="${date}">${new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})}</time></h3><ul>${entries.map(e=>`<li>${escape(e.text)} <a href="${e.url}" aria-label="Source commit: ${escape(e.text)}">Commit</a></li>`).join('')}</ul>`).join('')}</section>`).join('\n');
const current = fs.readFileSync(path.join(root,'changelog/index.html'),'utf8');
const head = current.slice(0,current.indexOf('<h1>'));
const html = head+`<h1>Release history</h1><p class="intro">${intro}</p><nav aria-label="Choose an app">${apps.map(a=>`<a href="#${a.id}">${escape(a.name)}</a>`).join('')}</nav>`+sections+'</main></body></html>\n';
fs.writeFileSync(path.join(root,'changelog/index.html'),html);
for (const app of apps) {
 if (!app.file) continue;
 const md = `# ${app.name} release history\n\n[Public history](https://siahverse.cc/changelog/#${app.id}) · [GitHub history](https://github.com/siahb/${app.repo}/commits/main/${app.path||''})\n\n${intro}\n${app.note?'\n'+app.note+'\n':''}\n`+[...groups(app)].map(([date,entries])=>`## ${date}\n\n${entries.map(e=>`- ${e.text} ([commit](${e.url}))`).join('\n')}\n`).join('\n');
 fs.writeFileSync(path.join(root,app.file),md);
}
console.log(`Generated ${apps.length} app histories with ${apps.reduce((n,a)=>n+a.entries.length,0)} commit references.`);
