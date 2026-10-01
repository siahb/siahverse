export function validTask(task) {
  if(!task||typeof task!=='object'||Array.isArray(task))return false;
  if(typeof task.text!=='string'||!task.text.trim()||task.text.length>10000)return false;
  if(task.done!==undefined&&typeof task.done!=='boolean')return false;
  if(task.tags!==undefined&&(!Array.isArray(task.tags)||task.tags.some(tag=>typeof tag!=='string')))return false;
  // E is a historical priority present in the migrated list.
  if(task.priority!=null&&!['','H','M','L','E'].includes(task.priority))return false;
  for(const key of ['due','nextDue','lastDone']){
    const date=task[key];
    if(date!=null&&date!==''&&(
      typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
      !Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date
    ))return false;
  }
  if(task.repeat!=null){
    const repeat=task.repeat;
    if(!repeat||typeof repeat!=='object'||!['daily','weekly'].includes(repeat.freq))return false;
    if(!Number.isInteger(repeat.interval)||repeat.interval<1||repeat.interval>10000)return false;
    if(repeat.byWeekday!==undefined&&(!Array.isArray(repeat.byWeekday)||repeat.byWeekday.some(day=>!Number.isInteger(day)||day<0||day>6)))return false;
  }
  return true;
}
