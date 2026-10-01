import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validTask} from '../server/task-validation.js';
const source=readFileSync(new URL('../public/todo.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function escapeTaskHTML'),source.indexOf('  const todoInput'));
const context=vm.createContext({});vm.runInContext(helpers,context);
assert.equal(context.escapeTaskHTML('" <b> & \' '),'&quot; &lt;b&gt; &amp; &#39; ');
const tasks=[{text:'a'},{text:'hidden'},{text:'b'},{text:'done',done:true}];
assert.deepEqual(Array.from(context.reorderedTasks(tasks,[2,0])),[tasks[2],tasks[1],tasks[0],tasks[3]]);
assert.throws(()=>context.reorderedTasks(tasks,[0,0]),/Invalid/);
assert.deepEqual(Array.from(context.reorderedTasks(tasks,[])),tasks);
for(const task of [null,[],{text:''},{text:'x',done:'yes'},{text:'x',tags:'tag'},{text:'x',tags:[{}]},{text:'x',due:'2026-02-30'},{text:'x',repeat:{freq:'daily',interval:0}},{text:'x',repeat:{freq:'weekly',interval:1,byWeekday:[7]}}])assert.equal(validTask(task),false);
assert.equal(validTask({text:'x',done:false,tags:['work'],due:'2026-10-01',priority:'H',repeat:{freq:'weekly',interval:2,byWeekday:[0,3]}}),true);
// Existing fixtures represent real task shapes and must remain writable.
assert.equal(validTask({text:'x',due:null,repeat:null,nextDue:null,priority:null,lastDone:null}),true);
console.log('PASS: literal text escaping, filtered full-list reorder, invalid order rejection, and task field validation.');
