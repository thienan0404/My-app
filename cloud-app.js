(function(root){
  'use strict';
  root.createGrowthCloudController=function({getData,setData,defaults,notify,loadClient=()=>import('https://esm.sh/@supabase/supabase-js@2.57.0')}){
    const storage=localStorage;
    const readJSON=key=>{try{return JSON.parse(storage.getItem(key));}catch{return null;}};
    let client=null,engine=null,user=null,timer=null,subscription=null,starting=null,epoch=0;
    let state='local',detail='',lastSync=null;
    const config=()=>({url:root.GROWTH_CLOUD_CONFIG?.url||storage.getItem('tg-cloud-url')||'',key:root.GROWTH_CLOUD_CONFIG?.key||storage.getItem('tg-cloud-key')||''});
    const ready=()=>{const c=config();return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url)&&!!c.key;};
    const ownerKey=()=>`tg-cloud-owner:${config().url}`;
    const accountKey=id=>`tg-cloud-account:${config().url}:${id}`;
    const pendingKey=id=>`tg-cloud-pending:${config().url}:${id}`;
    const labels={local:'Đã lưu trên thiết bị',login:'Chưa đăng nhập',syncing:'Đang đồng bộ…',pending:'Đã lưu · chờ đồng bộ',synced:'Đã đồng bộ',error:'Đã lưu · cần thử lại'};
    const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function status(next,error){
      state=next;detail=error?.message||'';
      if(next==='synced')lastSync=new Date();
      for(const id of ['cloud-status','cloud-header-status']){const el=document.getElementById(id);if(el){el.textContent=labels[state];el.dataset.state=state;if(id==='cloud-header-status'){el.parentElement.setAttribute('aria-label','Đồng bộ: '+labels[state]);el.parentElement.title=labels[state];}}}
      const message=document.getElementById('cloud-message');
      if(message)message.textContent=detail||(lastSync?`Lần đồng bộ gần nhất: ${lastSync.toLocaleTimeString('vi-VN')}`:'Kết quả được lưu trên thiết bị ngay khi bạn bấm.');
    }
    function html(){
      const configured=ready(),c=config();
      return `<section class="card cloud-card"><div class="card-heading"><h2>Đồng bộ giữa các thiết bị</h2><span class="badge" id="cloud-status" role="status">${labels[state]}</span></div><p>Đăng nhập cùng một email trên điện thoại và máy tính. Checklist, nhật ký, mục tiêu và phiên tập trung sẽ tự đồng bộ khi có mạng.</p>${!configured?'<p class="notice">Đồng bộ đang chờ kết nối dịch vụ lưu dữ liệu.</p>':''}<div class="cloud-form">${!root.GROWTH_CLOUD_CONFIG?.url?`<details class="cloud-advanced"><summary>Cấu hình kết nối</summary><label for="cloud-url">Project URL</label><input class="field" id="cloud-url" type="url" placeholder="https://xxxx.supabase.co" value="${escape(c.url)}"><label for="cloud-key">Publishable key</label><input class="field" id="cloud-key" type="password" placeholder="Supabase publishable / anon key" value="${escape(c.key)}"><button class="btn secondary" data-action="cloud-connect">Lưu kết nối</button></details>`:''}${user?`<div class="cloud-account"><span>Đang đăng nhập: <strong>${escape(user.email)}</strong></span><div class="settings-buttons"><button class="btn" data-action="cloud-sync">Đồng bộ ngay</button><button class="btn secondary" data-action="cloud-logout">Đăng xuất</button></div></div>`:`<label for="cloud-email">Email của bạn</label><input class="field" id="cloud-email" placeholder="Email đăng nhập" type="email" autocomplete="email"><button class="btn" data-action="cloud-login" ${configured?'':'disabled'}>Gửi link đăng nhập</button><p class="mood-caption">Mở link trong email bằng trình duyệt bạn dùng app. Mỗi thiết bị chỉ cần đăng nhập một lần.</p>`}<p class="mood-caption" id="cloud-message" role="status">${escape(detail)||(lastSync?`Lần đồng bộ gần nhất: ${lastSync.toLocaleTimeString('vi-VN')}`:'Kết quả được lưu trên thiết bị ngay khi bạn bấm.')}</p></div></section>`;
    }
    function schedule(){clearTimeout(timer);if(engine)timer=setTimeout(()=>engine?.sync(),650);}
    function capture(){
      if(user){storage.setItem(accountKey(user.id),JSON.stringify(getData()));engine?.capture(getData());schedule();}
    }
    function stop(){epoch++;engine?.close();engine=null;clearTimeout(timer);user=null;}
    function attach(next){
      if(next?.id===user?.id){if(!next)status(ready()?'login':'local');return;}
      const previous=user;if(previous)storage.setItem(accountKey(previous.id),JSON.stringify(getData()));
      stop();user=next;
      if(!next){if(previous){storage.setItem(ownerKey(),'');setData(defaults());}status(ready()?'login':'local');return;}
      const oldOwner=storage.getItem(ownerKey());
      const hadAccount=storage.getItem('tg-cloud-had-account')==='true';
      if(oldOwner!==next.id&&(oldOwner||hadAccount))setData(readJSON(accountKey(next.id))||defaults());
      storage.setItem(ownerKey(),next.id);storage.setItem('tg-cloud-had-account','true');
      const generation=epoch,id=next.id;
      engine=new root.GrowthCloud.Sync({initial:getData(),defaults:defaults(),saved:readJSON(pendingKey(id)),
        save:value=>storage.setItem(pendingKey(id),JSON.stringify(value)),
        read:async()=>{const {data,error}=await client.rpc('sync_growth_profile',{expected_revision:null,next_payload:null});if(error)throw error;return data;},
        write:async(revision,payload)=>{const {data,error}=await client.rpc('sync_growth_profile',{expected_revision:revision,next_payload:payload});if(error)throw error;return data;},
        receive:wire=>{if(generation!==epoch)return;setData(root.GrowthCloud.unpack(wire,getData()));storage.setItem(accountKey(id),JSON.stringify(getData()));},
        status:(next,error)=>{if(generation===epoch)status(next,error);}
      });
      setData(getData());engine.sync();
    }
    async function init(){
      if(location.protocol==='file:'||!ready()){status('local');return;}
      if(starting)return starting;
      starting=(async()=>{
        if(!client){
          const {createClient}=await loadClient();
          const c=config();client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
          subscription=client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>attach(session?.user||null),0)).data.subscription;
        }
        const {data,error}=await client.auth.getSession();if(error)throw error;
        attach(data.session?.user||null);
      })().catch(error=>status('error',error)).finally(()=>{starting=null;});
      return starting;
    }
    async function action(action){
      try{
        if(action==='cloud-connect'){
          if(root.GROWTH_CLOUD_CONFIG?.url)return;
          const url=document.getElementById('cloud-url').value.trim().replace(/\/$/,''),key=document.getElementById('cloud-key').value.trim();
          if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key)throw Error('Nhập Project URL và publishable key hợp lệ.');
          if(!key.startsWith('sb_publishable_')){
            try{const claims=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.role!=='anon')throw Error();}
            catch{throw Error('Chỉ dùng publishable / anon key.');}
          }
          stop();subscription?.unsubscribe();client=null;storage.setItem('tg-cloud-url',url);storage.setItem('tg-cloud-key',key);await init();setData(getData());notify('Đã lưu kết nối.');return;
        }
        if(!ready())throw Error('Dịch vụ đồng bộ chưa được kết nối.');
        await init();if(!client)throw Error('Không kết nối được dịch vụ. Hãy thử lại khi có mạng.');
        if(action==='cloud-login'){
          const email=document.getElementById('cloud-email').value.trim();
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Nhập email hợp lệ.');
          const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
          notify('Đã gửi link đăng nhập. Kiểm tra hộp thư email.');return;
        }
        if(action==='cloud-logout'){
          if(engine?.pending.size&&!confirm('Một số thay đổi chưa lên cloud. App giữ bản lưu riêng của tài khoản trên thiết bị này. Đăng xuất?'))return;
          const {error}=await client.auth.signOut();if(error)throw error;
          if(user)storage.setItem(accountKey(user.id),JSON.stringify(getData()));
          stop();storage.setItem(ownerKey(),'');setData(defaults());status('login');notify('Đã đăng xuất.');return;
        }
        if(!engine)throw Error('Bạn cần đăng nhập qua email trước.');
        capture();await engine.sync();if(state==='error')throw Error(detail);notify(state==='synced'?'Đã đồng bộ kết quả.':'Thay đổi đã được lưu, đang chờ đồng bộ.');
      }catch(error){status('error',error);notify(error.message||'Chưa đồng bộ được; dữ liệu vẫn lưu trên thiết bị.');}
    }
    window.addEventListener('online',()=>{if(engine)engine.sync();else init();});
    window.addEventListener('focus',()=>{if(engine)engine.sync();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)engine?.sync();});
    setInterval(()=>{if(!document.hidden&&navigator.onLine!==false)engine?.sync();},20000);
    return {html,init,capture,action,status:()=>status(state)};
  };
})(globalThis);
