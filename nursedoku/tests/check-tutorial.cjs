const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
class Element {constructor(){this.listeners={};this.children=[];this.attrs={};this.classList={add:()=>{}};}addEventListener(k,f){this.listeners[k]=f;}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}replaceChildren(){this.children=[];}append(e){this.children.push(e);}focus(){this.focused=true;}click(){this.listeners.click();}}
const ids={};const document={getElementById:id=>ids[id]||(ids[id]=new Element()),createElement:()=>new Element()};let now=1000;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../tutorial.js'),'utf8'),{document,Date:{now:()=>now}});
const board=()=>ids.tutorialBoard.children,next=()=>ids.tutorialNext.click();
assert.equal(board().filter(x=>x.textContent==='RN').length,4);assert(ids.tutorialBack.hidden);
next();board()[0].click();assert(ids.tutorialFeedback.textContent.includes('gold'));board()[1].click();assert.equal(board()[1].textContent,'X');now+=100;board()[1].click();assert.equal(board()[1].textContent,'RN');assert(ids.tutorialFeedback.textContent.includes('Correct'));
next();board()[2].click();assert.equal(board()[2].textContent,'X');assert(ids.tutorialFeedback.textContent.includes('Correct'));
next();assert.equal(board()[1].textContent,'RN');assert.equal(board()[6].textContent,'X');assert.equal(board()[7].textContent,'');assert.equal(board()[13].textContent,'X');
next();assert(ids.tutorialBoard.hidden);assert(ids.tutorialNext.hidden);assert(!ids.startBtn.hidden);ids.howToBtn.click();assert.equal(ids.tutorialProgress.textContent,'Step 1 of 5');next();board()[1].listeners.keydown({key:'r',preventDefault(){}});assert.equal(board()[1].textContent,'RN');ids.tutorialBack.click();assert.equal(ids.tutorialProgress.textContent,'Step 1 of 5');
console.log('PASS: solved example, wrong-square guidance, single/double tap, keyboard RN, exclusion diagram, navigation and replay.');
