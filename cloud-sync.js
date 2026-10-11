(function(root){
  'use strict';
  const fields=['completed','custom','mood','journal','weekly','goals','settings','routines','userRoutines','celebrations','focusSessions','carryLog','autoLog'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const safe=k=>!['__proto__','constructor','prototype'].includes(k);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  // Lists use stable item IDs on the wire, so two devices can add/remove independently.
  function pack(data){
    const result={};
    for(const k of fields)result[k]=clone(data[k]||(k==='focusSessions'?[]:{}));
    for(const day of Object.keys(result.custom)){
      if(Array.isArray(result.custom[day]))result.custom[day]=Object.fromEntries(result.custom[day].filter(t=>t.id&&safe(t.id)).map(t=>[t.id,t]));
    }
    if(Array.isArray(result.focusSessions))result.focusSessions=Object.fromEntries(result.focusSessions.filter(t=>t.at).map(t=>[t.at,t]));
    return result;
  }
  function unpack(wire,local){
    const result=clone(local),normalized=pack(wire);
    for(const k of fields)result[k]=normalized[k];
    for(const day of Object.keys(result.custom))result.custom[day]=Object.values(result.custom[day]);
    result.focusSessions=Object.values(result.focusSessions).sort((a,b)=>a.at.localeCompare(b.at));
    return result;
  }
  function diff(before,after,path=[],out=[]){
    if(equal(before,after))return out;
    if(object(before)&&object(after)){
      for(const k of new Set([...Object.keys(before),...Object.keys(after)]))if(safe(k))diff(before[k],after[k],[...path,k],out);
    }else if(object(after)&&before===undefined){
      for(const k of Object.keys(after))if(safe(k))diff(undefined,after[k],[...path,k],out);
    }else out.push(after===undefined?{path,remove:true}:{path,value:clone(after)});
    return out;
  }
  function apply(wire,ops){
    const result=clone(wire);
    for(const op of ops){
      if(!op.path.length||op.path.some(k=>!safe(k)))continue;
      let target=result;
      for(const k of op.path.slice(0,-1)){if(!object(target[k]))target[k]={};target=target[k];}
      const k=op.path.at(-1);
      if(op.remove)delete target[k];else target[k]=clone(op.value);
    }
    return result;
  }
  class Sync{
    constructor({initial,defaults,saved,save,read,write,receive,status}){
      this.current=pack(initial);this.defaults=pack(defaults);this.pending=new Map();this.save=save;this.read=read;this.write=write;this.receive=receive;this.status=status;this.closed=false;this.busy=null;
      const ops=saved?.pending||diff(pack(defaults),this.current);
      for(const op of ops)this.pending.set(JSON.stringify(op.path),op);
      // A reload while the SDK is offline can still change local data before
      // authentication resumes. Compare with the last observed local snapshot.
      if(saved?.current)for(const op of diff(saved.current,this.current))this.queue(op);
      this.store();
    }
    store(){this.save({pending:[...this.pending.values()],current:this.current});}
    queue(op){
      for(const [key,old] of this.pending)if(old.path.length>op.path.length&&op.path.every((k,i)=>old.path[i]===k))this.pending.delete(key);
      this.pending.set(JSON.stringify(op.path),op);
    }
    capture(data){
      const next=pack(data);
      for(const op of diff(this.current,next)){
        // Removing a parent must supersede previously queued children.
        this.queue(op);
      }
      this.current=next;this.store();
      if(this.pending.size)this.status('pending');
    }
    async sync(){
      if(this.closed)return;
      if(this.busy)return this.busy;
      this.busy=this.run().finally(()=>{this.busy=null;});
      return this.busy;
    }
    async run(){
      this.status('syncing');
      try{
        let remote=await this.read();
        for(let attempt=0;attempt<5&&!this.closed;attempt++){
          const sent=[...this.pending.values()].map(clone);
          const base=pack(remote.payload);base.settings={...this.defaults.settings,...base.settings};
          const merged=apply(base,sent);
          // Use CAS, rather than overwriting a snapshot that changed while reading.
          if(sent.length){
            const response=await this.write(remote.revision,merged);
            if(this.closed)return;
            if(!response.applied){remote=response;continue;}
            remote=response;
            for(const op of sent){const key=JSON.stringify(op.path);if(equal(this.pending.get(key),op))this.pending.delete(key);}
          }
          if(this.closed)return;
          const accepted=pack(remote.payload);accepted.settings={...this.defaults.settings,...accepted.settings};
          this.current=apply(accepted,[...this.pending.values()]);
          this.store();this.receive(clone(this.current));
          this.status(this.pending.size?'pending':'synced');
          return;
        }
        if(!this.closed)throw new Error('Có thay đổi đồng thời; app sẽ thử đồng bộ lại.');
      }catch(error){if(!this.closed)this.status('error',error);}
    }
    close(){this.closed=true;}
  }
  const api={Sync,pack,unpack,diff,apply};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthCloud=api;
})(globalThis);
