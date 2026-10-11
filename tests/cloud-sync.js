'use strict';
const assert=require('node:assert/strict');
const {Sync,pack,unpack}=require('../cloud-sync.js');
const defaults=()=>({completed:{},custom:{},journal:{},settings:{sound:false},focusSessions:[],snapshots:{},reminderLog:{}});
const copy=x=>JSON.parse(JSON.stringify(x));
let server={payload:{},revision:0};
let fail=false;
const read=async()=>{if(fail)throw Error('offline');return copy(server);};
const write=async(revision,payload)=>{
  if(fail)throw Error('offline');
  if(revision!==server.revision)return {...copy(server),applied:false};
  server={payload:copy(payload),revision:revision+1};return {...copy(server),applied:true};
};
function device(initial=defaults(),saved){
  const d={data:copy(initial),saved,state:null};
  d.engine=new Sync({initial,defaults:defaults(),saved,read,write,
    save:value=>d.saved=copy(value),receive:wire=>d.data=unpack(wire,d.data),status:state=>d.state=state});
  d.edit=fn=>{fn(d.data);d.engine.capture(d.data);};return d;
}
(async()=>{
  const a=device(),b=device();await Promise.all([a.engine.sync(),b.engine.sync()]);
  a.edit(x=>x.completed.gym=true);b.edit(x=>x.completed.code=true);
  await Promise.all([a.engine.sync(),b.engine.sync()]);await a.engine.sync();
  assert.deepEqual(a.data.completed,{gym:true,code:true});
  a.edit(x=>x.completed.gym=false);await a.engine.sync();await b.engine.sync();assert.equal(b.data.completed.gym,false);
  console.log('PASS: concurrent devices merge independent ticks, undo propagates.');
  a.edit(x=>x.custom.today=[{id:'a',title:'Task A'}]);b.edit(x=>x.custom.today=[{id:'b',title:'Task B'}]);
  await Promise.all([a.engine.sync(),b.engine.sync()]);await a.engine.sync();assert.equal(a.data.custom.today.length,2);
  a.edit(x=>x.custom.today=x.custom.today.filter(t=>t.id!=='b'));await a.engine.sync();await b.engine.sync();assert.deepEqual(b.data.custom.today.map(x=>x.id),['a']);
  a.edit(x=>x.focusSessions.push({at:'2026-10-12T09:00:00Z',complete:true}));
  b.edit(x=>x.focusSessions.push({at:'2026-10-12T09:01:00Z',complete:true}));
  await Promise.all([a.engine.sync(),b.engine.sync()]);await a.engine.sync();assert.equal(a.data.focusSessions.length,2);
  console.log('PASS: custom task additions/deletions and focus sessions merge by stable IDs.');
  fail=true;a.edit(x=>x.journal.today='Offline entry');await a.engine.sync();assert.equal(a.state,'error');assert.ok(a.saved.pending.length);
  a.engine.close();const restored=device(a.data,a.saved);fail=false;await restored.engine.sync();await b.engine.sync();assert.equal(b.data.journal.today,'Offline entry');assert.equal(restored.saved.pending.length,0);
  console.log('PASS: offline edits survive reload and retry without losing remote data.');
  restored.engine.close();restored.data.journal.tomorrow='Edited before authentication recovered';
  const delayed=device(restored.data,restored.saved);await delayed.engine.sync();assert.equal(server.payload.journal.tomorrow,'Edited before authentication recovered');
  console.log('PASS: edits made after an offline reload are detected when authentication resumes.');
  const inflight=device();await inflight.engine.sync();inflight.edit(x=>x.completed.gym=true);
  const originalWrite=inflight.engine.write;let release;
  inflight.engine.write=async(...args)=>{await new Promise(r=>release=r);return originalWrite(...args);};
  const sending=inflight.engine.sync();await new Promise(r=>setImmediate(r));inflight.edit(x=>x.completed.gym=false);release();await sending;
  assert.equal(inflight.data.completed.gym,false);assert.ok(inflight.saved.pending.length);
  inflight.engine.write=originalWrite;await inflight.engine.sync();assert.equal(server.payload.completed.gym,false);
  console.log('PASS: an edit made during upload stays queued; an old acknowledgement cannot discard it.');
  const stopped=device();await stopped.engine.sync();stopped.edit(x=>x.journal.today='Do not apply to next account');
  let done;stopped.engine.write=async()=>new Promise(resolve=>done=resolve);const upload=stopped.engine.sync();await new Promise(r=>setImmediate(r));stopped.engine.close();const snapshot=copy(stopped.data);done({...copy(server),applied:true});await upload;assert.deepEqual(stopped.data,snapshot);
  assert.equal(pack({snapshots:{today:'private local backup'},reminderLog:{x:true}}).snapshots,undefined);
  console.log('PASS: closed account ignores in-flight responses; local snapshots and reminders stay local.');
})().catch(error=>{console.error(error);process.exitCode=1;});
