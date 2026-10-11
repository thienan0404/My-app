'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const GrowthCloud=require('../cloud-sync.js');
const storage=new Map();let local={completed:{gym:true},journal:{today:'My existing diary'},settings:{sound:false},custom:{},focusSessions:[]};
const defaults=()=>({completed:{},journal:{},settings:{sound:false},custom:{},focusSessions:[]});
let authUser={id:'account-a',email:'a@example.test'},callback;
const profiles=new Map();
const client={auth:{
  getSession:async()=>({data:{session:authUser?{user:authUser}:null}}),
  onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};},
  signOut:async()=>{authUser=null;callback('SIGNED_OUT',null);return {};}
},rpc:async(_name,{expected_revision,next_payload})=>{
  assert.ok(authUser);const id=authUser.id;
  let row=profiles.get(id)||{payload:{},revision:0};let applied=false;
  if(next_payload&&expected_revision===row.revision){row={payload:next_payload,revision:row.revision+1};applied=true;profiles.set(id,row);}
  return {data:{...JSON.parse(JSON.stringify(row)),applied}};
}};
const ctx={GrowthCloud,GROWTH_CLOUD_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},location:{protocol:'https:'},navigator:{onLine:true},setInterval:()=>1,setTimeout,clearTimeout,Date,console,confirm:()=>true};
ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../cloud-app.js'),'utf8'),ctx);
const controller=ctx.createGrowthCloudController({getData:()=>local,setData:data=>local=data,defaults,notify(){},loadClient:async()=>({createClient:()=>client})});
const tick=()=>new Promise(r=>setTimeout(r,5));
(async()=>{
  await controller.init();await tick();assert.equal(profiles.get('account-a').payload.journal.today,'My existing diary');
  local.completed.code=true;controller.capture();await controller.action('cloud-sync');assert.equal(profiles.get('account-a').payload.completed.code,true);
  await controller.action('cloud-logout');await tick();assert.equal(local.journal.today,undefined);
  authUser={id:'account-b',email:'b@example.test'};callback('SIGNED_IN',{user:authUser});await tick();
  assert.equal(local.journal.today,undefined);assert.equal(local.completed.gym,undefined);assert.equal(profiles.get('account-b')?.payload.journal.today,undefined);
  await controller.action('cloud-logout');await tick();authUser={id:'account-a',email:'a@example.test'};callback('SIGNED_IN',{user:authUser});await tick();
  assert.equal(local.journal.today,'My existing diary');assert.equal(local.completed.code,true);
  await controller.action('cloud-logout');
  console.log('PASS: first login imports local progress; logout/account switch isolates data; returning account restores its data.');
})().catch(error=>{console.error(error);process.exitCode=1;});
