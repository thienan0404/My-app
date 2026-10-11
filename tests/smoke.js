/** Offline smoke tests: node tests/smoke.js — no external deps. */
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const els={};const events={};const classes={add(){},remove(){},toggle(){}};
const get=(id)=>els[id]||(els[id]={innerHTML:'',textContent:'',value:'',open:false,style:{},classList:classes,setAttribute(name,value){this[name]=value},showModal(){this.open=true},close(){this.open=false;events[id+':close']?.()},addEventListener(type,cb){events[id+':'+type]=cb}});
const storage=new Map();
const context={
  document:{hidden:false,body:{dataset:{},append(){}},getElementById:get,querySelector:sel=>get(sel),addEventListener(type,cb){(events[type]??=[]).push(cb)}},
  window:{addEventListener(){},dispatchEvent(){},scrollTo(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},
  location:{protocol:'file:'},navigator:{},console,setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},Event:function(){},Intl,Date,Math,Object,Array,Number,String
};
context.globalThis=context;vm.createContext(context);vm.runInContext(code,context);
assert.match(get('app').innerHTML,/xp-banner/);assert.match(get('side-nav').innerHTML,/motivation/);
function click(action,extra={}){const node={dataset:{action,...extra},value:extra.value};for(const fn of events.click||[])fn({target:{closest:sel=>sel==='[data-action]'?node:null}})}
assert.match(get('mobile-nav').innerHTML,/data-action="mobile-more"/);
assert.match(get('mobile-more-links').innerHTML,/data-view="journal"/);
click('mobile-more');assert.equal(get('mobile-more').open,true);
click('nav',{view:'journal'});assert.equal(get('mobile-more').open,false);assert.match(get('app').innerHTML,/journal-text/);
click('mobile-more');click('close-mobile-more');assert.equal(get('mobile-more').open,false);
console.log('PASS: mobile menu opens, journal is reachable, navigation and dismissal close the dialog.');
click('nav',{view:'motivation'});assert.match(get('app').innerHTML,/badge-grid/);assert.match(get('app').innerHTML,/plant-visual/);
click('energy-mode',{mode:'discipline'});assert.equal(JSON.parse(storage.get('thienan-growth-v1')).settings.mode,'discipline');
click('nav',{view:'focus'});assert.match(get('app').innerHTML,/focus-clock/);
click('nav',{view:'settings'});assert.match(get('app').innerHTML,/cloud-url/);
for(const fn of events.change||[])fn({target:{dataset:{action:'toggle-setting',setting:'sound'},checked:true}});
assert.equal(JSON.parse(storage.get('thienan-growth-v1')).settings.sound,true);
click('nav',{view:'planner'});assert.match(get('app').innerHTML,/Checklist cá nhân/);
console.log('PASS: app initialization, navigation, motivation UI, focus UI, settings persistence, planner.');
// Pure engine: prevent XP abuse on repeated completion/undo.
const marker=code.indexOf("document.addEventListener('click',ev=>");assert(marker>=0);
const coreScript=code.slice(0,marker).replace('const TODAY=getToday();','const TODAY=START;')+'globalThis.__t={TODAY,START,END,dayDiff,tasksAt,xpTotal,taskXP,unlocked,mark:(s,id,yes)=>{data.completed[s+\':\'+id]=yes},persist,read:()=>data};})();';
const core={...context};core.document=context.document;core.localStorage=context.localStorage;core.globalThis=core;vm.createContext(core);vm.runInContext(coreScript,core);
const t=core.__t;assert.equal(t.dayDiff(t.END,t.START)+1,183);
const day=t.START,task=t.tasksAt(day)[0],xp=t.taskXP(task),before=t.xpTotal();t.mark(day,task.id,true);assert.equal(t.xpTotal(),before+xp);t.mark(day,task.id,true);assert.equal(t.xpTotal(),before+xp);t.mark(day,task.id,false);assert.equal(t.xpTotal(),before);
console.log('PASS: 183-day plan, XP awarded once, undo XP.');
