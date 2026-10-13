/* ECHO v4.3: version-checked cloud sync with shared GAIA / ORBIT login.
   Public API key + Supabase RLS; never put secret API keys in the frontend. */
(() => {
 'use strict';
 const KEY='controlled-drift-command-v2';
 const $=id=>document.getElementById(id);
 const app=window.ECHO;
 const status=$('cloudState'), signIn=$('cloudSignInActions'), account=$('cloudAccountActions');
 const recheckButton=$('cloudRecheck'),uploadButton=$('cloudUpload'),downloadButton=$('cloudDownload');
 const pauseButton=$('cloudPause'),undoButton=$('cloudUndo'),logoutButton=$('cloudSignOut'),lastSync=$('cloudLastSync');
 const buttons=[recheckButton,uploadButton,downloadButton,pauseButton,undoButton,logoutButton].filter(Boolean);
 if(!app||!status||!signIn||!account)return;
 function report(text){status.textContent=text}
 if(!window.supabase?.createClient){report('Cloud library could not load. ECHO still saves locally.');return}
 const db=window.supabase.createClient('https://zdurujqwhxqrwbhwzzxg.supabase.co',
  "sb_publishable_Xa0DTx_PbvtynbiQN6_xNQ_l1D55vzK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
 window.ECHO.cloudClient=db; // Reuse one Supabase Auth instance for owner-scoped integrations.
 let user=null,enabled=false,checking=false,writing=false,busy=false,dirty=false,version=null,baseline=null,pendingTimer=null,lastUserId=null;
 const modeKey=id=>'echo-cloud-auto:'+id;
 const metaKey=id=>'echo-cloud-meta:'+id;
 const unsyncedKey=id=>'echo-cloud-unsynced:'+id;
 const safetyKey=id=>'echo-cloud-safety-backup:'+id;
 const snapshot=()=>app.syncSnapshot();
 const serialized=()=>JSON.stringify(snapshot());
 const readMeta=id=>{try{return JSON.parse(localStorage.getItem(metaKey(id))||'null')}catch{return null}};
 function setBusy(v){busy=!!v;for(const b of buttons)b.disabled=busy}
 function writeMeta(){
   if(!user||version===null||baseline===null)return;
   localStorage.setItem(metaKey(user.id),JSON.stringify({revision:version,baseline}));
 }
 function timeStamp(msg){
   const text=msg+' · '+new Date().toLocaleString();
   lastSync.textContent=text;localStorage.setItem('echo-last-cloud-operation',text);
 }
 function showUI(){
   signIn.hidden=!!user;account.hidden=!user;
   if(undoButton)undoButton.disabled=!user||!localStorage.getItem(safetyKey(user.id));
   if(pauseButton){pauseButton.textContent=enabled?'Pause auto-sync':'Resume after manual transfer';
     pauseButton.disabled=!user||(!enabled&&version===null)}
   if(user){report(enabled?'Signed in with ORBIT / GAIA — cloud sync is on.':'Signed in with ORBIT / GAIA as '+(user.email||'account')+'. Choose Upload or Restore to start syncing.')}
   else report('Sign in to ORBIT on this browser, then return to ECHO. Your local ECHO data remains available.');
   lastSync.textContent=localStorage.getItem('echo-last-cloud-operation')||'';
 }
 async function getRow(){
   const {data,error}=await db.from('echo_workspaces').select('data,revision,updated_at')
      .eq('user_id',user.id).maybeSingle();
   if(error)throw error;
   return data;
 }
 function halt(reason){
   enabled=false;dirty=false;clearTimeout(pendingTimer);pendingTimer=null;
   if(user){
     localStorage.setItem(modeKey(user.id),'off');
     localStorage.setItem(unsyncedKey(user.id),JSON.stringify({savedAt:new Date().toISOString(),data:snapshot()}));
     localStorage.setItem(safetyKey(user.id),JSON.stringify({savedAt:new Date().toISOString(),data:snapshot()}));
   }
   report(reason+' Local changes have been preserved. Use Upload or Restore to resolve the conflict.');
   if(pauseButton)pauseButton.textContent='Resume after manual transfer';
 }
 function saveBaseline(rev){
   version=Number(rev);baseline=serialized();dirty=false;
   writeMeta();
   if(user)localStorage.removeItem(unsyncedKey(user.id));
 }
 function enable(rev,message){
   saveBaseline(rev);enabled=true;
   localStorage.setItem(modeKey(user.id),'on');
   showUI();report(message||'Cloud connected — automatic sync is on.');
 }
 function applyRemote(row){
   if(!row || !row.data || typeof row.data!=='object'||Array.isArray(row.data))
     throw new Error('Cloud data has an unexpected format');
   // Never import session runtime, timers, or credentials from the cloud.
   app.restore(row.data);
   saveBaseline(row.revision);
 }
 async function reconcile(){
   if(!user||!enabled||checking||writing)return;
   checking=true;
   try{
     const row=await getRow();
     if(!row){halt('Cloud workspace was not found.');return}
     const current=serialized();
     if(version===null){halt('No local sync version found.');return}
     if(Number(row.revision)!==version){
       if(current!==baseline||dirty){halt('Sync conflict: another device updated ECHO while this one had changes.');return}
       applyRemote(row);timeStamp('Updated from another device');report('Cloud updates received automatically.');
     }else if(current!==baseline){dirty=true;scheduleSave()}
     else if(!dirty)report('Cloud connected — changes are synchronized.');
   }catch(err){report('Cloud check unavailable: '+err.message+'. Your local work remains saved.')}
   finally{checking=false}
 }
 function scheduleSave(){
   if(!enabled||!user)return;
   dirty=true;
   clearTimeout(pendingTimer);
   pendingTimer=setTimeout(()=>{pendingTimer=null;saveChanges()},1600);
 }
 async function saveChanges(){
   if(!enabled||!user||writing)return;
   if(version===null){halt('Cannot write without a cloud revision.');return}
   const payload=snapshot(),source=JSON.stringify(payload);
   if(source===baseline){dirty=false;return}
   writing=true;
   try{
     const {data,error}=await db.from('echo_workspaces')
       .update({data:payload,revision:version+1,updated_at:new Date().toISOString()})
       .eq('user_id',user.id).eq('revision',version)
       .select('revision').maybeSingle();
     if(error)throw error;
     if(!data){halt('Sync conflict: another device saved a newer revision.');return}
     version=Number(data.revision);
     baseline=source;writeMeta();
     timeStamp('Auto-saved to cloud');
     if(serialized()!==source){dirty=true;scheduleSave()}
     else{dirty=false;report('Cloud connected — changes are synchronized.')}
   }catch(err){
     dirty=true;
     report('Cloud temporarily unreachable. Changes remain on this device. Retrying when connected.');
   }finally{writing=false}
 }
 function setupUser(member){
   const changed=!user||user.id!==member.id;
   user=member;
   if(!changed){showUI();return}
   enabled=false;dirty=false;version=null;baseline=null;clearTimeout(pendingTimer);pendingTimer=null;
   lastUserId=member.id;
   const meta=readMeta(member.id);
   if(localStorage.getItem(modeKey(member.id))==='on'&&meta&&Number.isFinite(Number(meta.revision))&&typeof meta.baseline==='string'){
     version=Number(meta.revision);baseline=meta.baseline;enabled=true;
     if(serialized()!==baseline){dirty=true}
     showUI();
     reconcile();
   }else showUI();
 }
 async function checkSharedSession() {
   try{
     const {data,error}=await db.auth.getUser();
     if(error && !/session missing|auth session missing/i.test(error.message||''))throw error;
     if(data?.user)setupUser(data.user);
     else {
       user=null;enabled=false;version=null;baseline=null;
       clearTimeout(pendingTimer);pendingTimer=null;showUI();
       report('No ORBIT / GAIA session found yet. Sign in on ORBIT, then return and check again.');
     }
   }catch(err){report('Cannot check ORBIT session: '+err.message)}
 }
 if(recheckButton)recheckButton.addEventListener('click',()=>{
   if(busy||writing)return;setBusy(true);
   checkSharedSession().finally(()=>setBusy(false));
 });
 uploadButton.addEventListener('click',async()=>{
   if(!user||writing)return;
   setBusy(true);
   try{
     const row=await getRow(),here=snapshot();
     const question=row?'Cloud revision '+row.revision+' exists. Uploading this device will REPLACE that cloud copy. Continue?':
       'Create your private cloud workspace from the data on this device?';
     if(!confirm(question)){report('Upload canceled. No data changed.');return}
     if(row){
       const {data,error}=await db.from('echo_workspaces')
         .update({data:here,revision:Number(row.revision)+1,updated_at:new Date().toISOString()})
         .eq('user_id',user.id).eq('revision',row.revision)
         .select('revision').maybeSingle();
       if(error)throw error;if(!data)throw Error('Someone updated the cloud before upload completed. Review and try again.');
       enable(data.revision,'Uploaded this device. Automatic sync is now enabled.');
     }else{
       const {data,error}=await db.from('echo_workspaces')
         .insert({user_id:user.id,data:here,revision:1}).select('revision').single();
       if(error)throw error;enable(data.revision,'New cloud workspace created. Automatic sync is enabled.');
     }
     timeStamp('Device uploaded to cloud');
   }catch(err){report('Upload failed: '+err.message+'. Your local copy is unchanged.')}
   finally{setBusy(false)}
 });
 downloadButton.addEventListener('click',async()=>{
   if(!user||writing)return;
   setBusy(true);
   try{
     const row=await getRow();
     if(!row){report('No cloud copy exists. Upload from the device containing your work first.');return}
     if(!confirm('Restore cloud revision '+row.revision+'? This REPLACES local notes, content, campaigns, highlights and rundown. The stream timer stays local. A safety copy will be kept in this browser.'))return;
     localStorage.setItem(safetyKey(user.id),JSON.stringify({savedAt:new Date().toISOString(),data:snapshot()}));
     applyRemote(row);
     enable(row.revision,'Restored cloud copy. Automatic sync is enabled.');
     timeStamp('Cloud restored to this device');
   }catch(err){report('Restore failed: '+err.message+'. Existing local data was kept.')}
   finally{setBusy(false)}
 });
 if(pauseButton)pauseButton.addEventListener('click',()=>{
   if(!user)return;
   if(enabled){
     // Do not erase unsaved local work.
     enabled=false;clearTimeout(pendingTimer);pendingTimer=null;
     localStorage.setItem(modeKey(user.id),'off');
     showUI();report('Automatic sync paused. ECHO still saves locally.');
   }else{
     report('Choose Upload or Restore to reconcile the two copies before restarting automatic sync.');
   }
 });
 if(undoButton)undoButton.addEventListener('click',()=>{
   if(!user)return;
   let backup=null;
   try{backup=JSON.parse(localStorage.getItem(safetyKey(user.id))||'null')}catch{}
   if(!backup||!backup.data){report('There is no local safety copy to restore.');return}
   if(!confirm('Restore the local safety copy saved '+new Date(backup.savedAt).toLocaleString()+'? Your current device data will be replaced, and automatic cloud syncing will pause until you choose Upload or Restore.'))return;
   enabled=false;dirty=false;clearTimeout(pendingTimer);pendingTimer=null;
   localStorage.setItem(modeKey(user.id),'off');
   app.restore(backup.data);showUI();
   report('Previous local copy restored. Cloud syncing is paused until you reconcile your copies.');
 });
 logoutButton.addEventListener('click',async()=>{
   if(!confirm('Sign out of the shared ORBIT / GAIA account on this browser? Other dashboards using the same session will also be signed out.'))return;
   clearTimeout(pendingTimer);pendingTimer=null;
   enabled=false;setBusy(true);
   try{const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;
     user=null;version=null;baseline=null;showUI();
   }catch(err){report('Sign-out failed: '+err.message)}
   finally{setBusy(false)}
 });
 window.addEventListener('echo:changed',()=>{if(enabled) scheduleSave()});
 window.addEventListener('online',()=>{if(enabled){if(dirty)scheduleSave();else reconcile()}});
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden)return;
   void checkSharedSession();
   if(enabled){if(dirty)scheduleSave();else reconcile()}
 });
 window.addEventListener('focus',()=>{void checkSharedSession()});
 setInterval(()=>{if(enabled){if(dirty){if(!writing&&!pendingTimer)scheduleSave()}else reconcile()}},30000);
 db.auth.onAuthStateChange((_event,session)=>{
   Promise.resolve().then(()=>{
     if(session?.user)setupUser(session.user);
     else{user=null;enabled=false;version=null;baseline=null;clearTimeout(pendingTimer);showUI()}
   });
 });
 db.auth.getSession().then(({data,error})=>{
   if(error){report('Could not restore session: '+error.message);return}
   if(data.session?.user)setupUser(data.session.user);else showUI();
 }).catch(err=>report('Cloud initialization failed: '+err.message));
})();
