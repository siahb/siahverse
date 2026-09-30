const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/todo.js'), 'utf8');
const helpers = source.slice(source.indexOf('function computeNextDue'), source.indexOf('// Pretty pills'));
for (const timezone of ['America/Los_Angeles', 'America/New_York', 'UTC']) {
  process.env.TZ = timezone;
  const context = vm.createContext({
    todayISO: () => '2026-09-30',
    toISO: d => !d ? null : typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
  });
  vm.runInContext(helpers, context);
  assert.equal(context.computeNextDue({repeat:{freq:'daily',interval:1}}, '2026-03-08'), '2026-03-09');
  assert.equal(context.computeNextDue({repeat:{freq:'weekly',interval:1,byWeekday:[0,3,6]}}, '2026-03-08'), '2026-03-11');
  const task = {due:'2026-03-01',repeat:{freq:'daily',interval:1}};
  assert.equal(context.rollForwardIfMissed(task), true);
  assert.equal(task.due, '2026-09-30');
  assert.equal(context.rollForwardIfMissed({due:'2026-03-01',repeat:{freq:'invalid'}}), false);
}
console.log('Recurrence regression checks passed in three timezones.');
