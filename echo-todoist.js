/* ECHO: Todoist production workflow connector.
   Reuses ORBIT's existing encrypted Todoist OAuth bridge and the GAIA session.
   No Todoist tokens, OAuth client secrets or Supabase service keys in this file. */
(() => {
  'use strict';
  const app = window.ECHO;
  const host = document.getElementById('page-content');
  if(!app || !host)return;

  const BRIDGE = 'https://zdurujqwhxqrwbhwzzxg.supabase.co/functions/v1/orbit-todoist';
  const ORBIT_URL = 'https://reece1919.github.io/orbit/';
  const css = document.createElement('style');
  css.textContent = [
    '.echo-todoist{margin:0 0 14px}.echo-todoist-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}',
    '.echo-todoist-status{font-size:12px;color:var(--muted);margin:8px 0}.echo-todoist-columns{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:13px}',
    '.echo-todoist-steps{display:grid;gap:7px;margin:12px 0}.echo-todoist-step{display:flex;align-items:flex-start;gap:9px;padding:9px;border:1px solid var(--outline);border-radius:9px;background:var(--surface-alt);font-size:12px}',
    '.echo-todoist-step small{display:block;font-size:11px;color:var(--muted);margin-top:2px}.echo-todoist-step input{accent-color:var(--teal);margin-top:3px}',
    '.echo-todoist-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.echo-todoist-actions .quiet{margin:0}',
    '.echo-todoist-result{margin:9px 0 0;font-size:12px;min-height:18px}.echo-todoist-status[data-state="connected"]{color:var(--teal)}',
    '.echo-todoist-status[data-state="warning"]{color:var(--yellow)}',
    '@media(max-width:640px){.echo-todoist-columns{grid-template-columns:1fr}.echo-todoist-columns button{width:100%}}'
  ].join('');
  document.head.append(css);

  const panel=document.createElement('section'); panel.className='card echo-todoist';panel.id='echoTodoistPanel';
  panel.innerHTML=
    '<div class="echo-todoist-head"><div><h2>Todoist production workflow</h2><p class="quiet">Prepare, promote and repurpose content using your existing ORBIT Todoist connection.</p></div>'+
    '<a class="button small" href="'+ORBIT_URL+'" target="_blank" rel="noopener noreferrer">Open ORBIT</a></div>'+
    '<p class="echo-todoist-status" id="echoTodoistStatus" role="status" aria-live="polite">Checking your Todoist connection…</p>'+
    '<div class="echo-todoist-actions"><button class="button small" type="button" id="echoTodoistCheck">Check connection</button>'+
    '<a class="button small ghost" href="https://app.todoist.com/app/today" target="_blank" rel="noopener noreferrer">Open Todoist</a></div>'+
    '<div class="echo-todoist-columns"><label>Choose an ECHO item<select class="input" id="echoTodoistSource" aria-label="Choose source content for Todoist workflow"></select></label>'+
    '<button class="button small" id="echoTodoistPreview" type="button">Preview tasks</button></div>'+
    '<div id="echoTodoistTasks" class="echo-todoist-steps" aria-label="Todoist task preview"></div>'+
    '<div class="echo-todoist-actions"><button class="button primary" id="echoTodoistCreate" type="button">Create selected tasks in Todoist</button>'+
    '<p class="quiet">Nothing is sent until you confirm. Repeat attempts check for existing tasks.</p></div>'+
    '<p id="echoTodoistResult" class="echo-todoist-result" role="status" aria-live="polite"></p>';
  host.insertBefore(panel,host.firstChild);
  const $=id=>document.getElementById(id);
  const source=$('echoTodoistSource'),status=$('echoTodoistStatus'),preview=$('echoTodoistTasks'),
    create=$('echoTodoistCreate'),result=$('echoTodoistResult'),check=$('echoTodoistCheck');
  const make=(tag,cls,text)=>{const elem=document.createElement(tag);if(cls)elem.className=cls;if(text!==undefined)elem.textContent=text;return elem};
  let connected=false,busy=false,ownerId=null,checkedAt=0,selectedKey='',selectedTasks=new Set(),previewInitializedFor='';
  const currentSnapshot=()=>app.snapshot();
  function setStatus(text,kind='neutral'){status.textContent=text;status.dataset.state=kind;}
  function setResult(text){result.textContent=text;}
  function getClient(){return app.cloudClient||null;}
  function resolveSelection(value){
    if(!value)return null;
    const data=currentSnapshot(),colon=value.indexOf(':');if(colon<0)return null;
    const kind=value.slice(0,colon),id=value.slice(colon+1);
    const arr=kind==='promo'?data.promoItems:data.contentItems;
    if(!Array.isArray(arr))return null;
    const item=arr.find(x=>String(x.id)===id);
    return item?{kind,id,key:value,item}:null;
  }
  function fullLabel(record){
    const item=record.item;
    return (record.kind==='promo'?'Promotion':item.format==='Live'?'Livestream':'Content')+' · '+(item.title||'Untitled')+(item.due?' · '+item.due:'');
  }
  function renderSources(){
    const data=currentSnapshot(),old=source.value||selectedKey;
    const entries=[];
    for(const x of (data.contentItems||[])){if(x&&x.id!=null)entries.push({kind:'content',item:x,key:'content:'+x.id})}
    for(const x of (data.promoItems||[])){if(x&&x.id!=null)entries.push({kind:'promo',item:x,key:'promo:'+x.id})}
    entries.sort((a,b)=>String(a.item.due||'9999-12-31').localeCompare(String(b.item.due||'9999-12-31')));
    source.replaceChildren();
    if(!entries.length){source.append(make('option','','Schedule a stream or add content first'));source.disabled=true;selectedKey='';previewInitializedFor='';return}
    source.disabled=false;
    for(const entry of entries){
      const opt=make('option','',fullLabel(entry));opt.value=entry.key;source.append(opt);
    }
    const match=entries.find(x=>x.key===old)||entries[0];source.value=match.key;
    const changed=selectedKey!==match.key;selectedKey=match.key;
    if(changed){selectedTasks=new Set();previewInitializedFor='';}
  }
  function isoDate(str){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(str||'')))return null;
    const [y,m,d]=str.split('-').map(Number),day=new Date(y,m-1,d,12);
    return day.getFullYear()===y&&day.getMonth()===m-1&&day.getDate()===d?day:null;
  }
  function dayKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
  function planDate(target,offset){
    const base=isoDate(target);if(!base)return '';
    base.setDate(base.getDate()+offset);
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    if(base<today)return dayKey(today);
    return dayKey(base);
  }
  function template(record){
    const x=record.item,title=String(x.title||'Untitled').trim().slice(0,140);
    if(record.kind==='promo')return [
      {key:'creative',label:'Prepare promotional creative',offset:-2},
      {key:'launch',label:'Publish and review the promotion',offset:0}
    ].map(x=>({...x,title}));
    if(x.format==='Live')return [
      {key:'prepare',label:'Prepare stream and test setup',offset:-2},
      {key:'announce',label:'Promote upcoming stream',offset:-1},
      {key:'broadcast',label:'Go live and capture highlights',offset:0},
      {key:'clips',label:'Review highlights and prepare clips',offset:1},
      {key:'publish',label:'Publish clips and follow-up posts',offset:3}
    ].map(x=>({...x,title}));
    return [
      {key:'draft',label:'Produce and edit content',offset:-2},
      {key:'assets',label:'Prepare title, thumbnail and captions',offset:-1},
      {key:'publish',label:'Publish and promote content',offset:0}
    ].map(x=>({...x,title}));
  }
  function taskMarker(sourceKey,taskKey){return 'ECHO-TODOIST:'+encodeURIComponent(sourceKey)+':'+taskKey}
  function taskPayload(record,step){
    const title=String(record.item.title||'Untitled').trim().slice(0,140);
    const where=[record.item.platform,record.item.topic,record.item.format].filter(Boolean).join(' · ');
    const description=['Controlled Drift workflow generated from ECHO','Source: '+title,
      where?'Platform / topic: '+where:'',
      record.item.due?'ECHO target: '+record.item.due:'',
      'Source marker: '+taskMarker(record.key,step.key)].filter(Boolean).join('\n');
    const payload={content:'[Controlled Drift] '+step.label+': '+title,description,priority:1};
    const due=planDate(record.item.due,step.offset);if(due)payload.due_date=due;
    return payload;
  }
  const linked=(key,stepKey)=>{
    const data=currentSnapshot();const record=data.todoistLinks?.[key];
    return record&&record[stepKey]||null;
  };
  function renderPreview(){
    renderSources();
    preview.replaceChildren();
    const entry=resolveSelection(source.value);
    if(!entry){preview.append(make('p','quiet','No stream or content items yet.'));create.disabled=true;return}
    const steps=template(entry);
    if(previewInitializedFor!==entry.key){
      selectedTasks=new Set(steps.map(x=>x.key).filter(k=>!linked(entry.key,k)));
      previewInitializedFor=entry.key;
    }
    let active=0;
    for(const step of steps){
      const previous=linked(entry.key,step.key);
      const row=make('label','echo-todoist-step');
      const input=make('input');input.type='checkbox';input.value=step.key;
      input.disabled=Boolean(previous)||busy;input.checked=previous?true:selectedTasks.has(step.key);
      input.addEventListener('change',()=>{if(input.checked)selectedTasks.add(step.key);else selectedTasks.delete(step.key);updateCreate()});
      const box=make('div');
      box.append(make('strong','',step.label));
      const due=planDate(entry.item.due,step.offset);
      box.append(make('small','',previous?'Already recorded in ECHO as Todoist task #'+previous.taskId:
        due?'Due '+due+' · '+(entry.item.due?'From content deadline':''):'No due date — set an ECHO target first'));
      row.append(input,box);preview.append(row);
      if(!previous && input.checked)active++;
    }
    updateCreate();
  }
  function updateCreate(){
    const rec=resolveSelection(source.value);
    const steps=rec?template(rec):[];
    const needed=steps.filter(x=>selectedTasks.has(x.key)&&!linked(rec.key,x.key));
    create.disabled=busy||!connected||!needed.length;
    create.textContent=busy?'Sending tasks…':needed.length?'Create '+needed.length+' selected Todoist task'+(needed.length===1?'':'s'):'No new tasks selected';
  }
  async function request(action,extras={}){
    const db=getClient();
    if(!db)throw Error('ECHO cloud login is unavailable. Refresh ECHO and sign in to ORBIT.');
    const {data,error}=await db.auth.getSession();
    if(error||!data?.session?.access_token)throw Error('Sign in to ORBIT first; then return to ECHO.');
    const response=await fetch(BRIDGE,{method:'POST',cache:'no-store',headers:{
      'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token
    },body:JSON.stringify({action,...extras})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok){
      const msg=String(body?.error||'Todoist connector error ('+response.status+').');
      if(msg.includes('MFA_REQUIRED'))throw Error('Verify your authenticator in ORBIT before using Todoist from ECHO.');
      if(response.status===409)throw Error('Connect Todoist in ORBIT first, then return to ECHO.');
      throw Error(msg);
    }
    return body;
  }
  async function checkConnection(){
    if(busy)return;
    busy=true;connected=false;setStatus('Checking ORBIT Todoist connection…');updateCreate();check.disabled=true;
    try{
      const db=getClient();
      if(!db)throw Error('ECHO cloud connection is still loading.');
      const {data,error}=await db.auth.getUser();
      if(error||!data?.user)throw Error('Sign in to ORBIT to use the existing Todoist connection.');
      if(ownerId&&ownerId!==data.user.id)selectedTasks=new Set();
      ownerId=data.user.id;
      const state=await request('status');
      connected=Boolean(state?.connected);
      checkedAt=Date.now();
      setStatus(connected?'Todoist connected through ORBIT — ready to create tasks.':
        'Todoist is not connected. Open ORBIT → Todoist and approve the connection.',connected?'connected':'warning');
    }catch(error){connected=false;setStatus(error.message,'warning')}
    finally{busy=false;check.disabled=false;updateCreate()}
  }
  async function openTaskIndex(){
    const found=new Map();let cursor=null;
    for(let page=0;page<10;page++){
      const path='/tasks?limit=200'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
      const result=await request('api',{path,method:'GET'});
      if(!Array.isArray(result?.results))throw Error('Could not verify existing Todoist tasks; no new tasks were sent.');
      for(const task of result.results){
        if(typeof task?.description!=='string')continue;
        const mark=task.description.match(/ECHO-TODOIST:[^\s]+/);
        if(mark&&task.id)found.set(mark[0],String(task.id));
      }
      cursor=typeof result.next_cursor==='string'&&result.next_cursor?result.next_cursor:null;
      if(!cursor)return found;
    }
    throw Error('Todoist task list is too large to verify safely. No new tasks were sent.');
  }
  function recordLink(sourceKey,stepKey,taskId){
    app.modify(s=>{
      if(!s.todoistLinks||typeof s.todoistLinks!=='object')s.todoistLinks={};
      if(!s.todoistLinks[sourceKey]||typeof s.todoistLinks[sourceKey]!=='object')s.todoistLinks[sourceKey]={};
      s.todoistLinks[sourceKey][stepKey]={taskId:String(taskId),createdAt:new Date().toISOString()};
    });
  }
  async function createSelected(){
    const rec=resolveSelection(source.value);if(!rec||busy||!connected)return;
    const jobs=template(rec).filter(step=>selectedTasks.has(step.key)&&!linked(rec.key,step.key));
    if(!jobs.length){setResult('These tasks have already been recorded.');return}
    const msg='Create '+jobs.length+' Controlled Drift task'+(jobs.length===1?'':'s')+' in your existing Todoist account for "'+rec.item.title+'"?';
    if(!window.confirm(msg))return;
    busy=true;check.disabled=true;setResult('Checking Todoist for duplicates…');updateCreate();
    let created=0,reused=0;
    try{
      const existing=await openTaskIndex();
      for(const step of jobs){
        const marker=taskMarker(rec.key,step.key);
        const previous=linked(rec.key,step.key);
        if(previous)continue;
        const match=existing.get(marker);
        if(match){recordLink(rec.key,step.key,match);reused++;continue}
        setResult('Creating task '+(created+reused+1)+' of '+jobs.length+'…');
        const task=await request('api',{path:'/tasks',method:'POST',body:JSON.stringify(taskPayload(rec,step))});
        if(!task?.id)throw Error('Todoist did not confirm a task ID. Check Todoist before retrying.');
        recordLink(rec.key,step.key,String(task.id));existing.set(marker,String(task.id));created++;
      }
      setResult(created+' new Todoist task'+(created===1?'':'s')+' created'+(reused?' · '+reused+' existing task'+(reused===1?'':'s')+' reused':'')+'.');
      for(const task of jobs)selectedTasks.delete(task.key);
    }catch(error){setResult('Todoist workflow stopped: '+error.message+' Successfully created tasks were retained.');}
    finally{busy=false;check.disabled=false;renderPreview()}
  }
  $('echoTodoistPreview').addEventListener('click',renderPreview);
  source.addEventListener('change',()=>{selectedKey=source.value;selectedTasks=new Set();previewInitializedFor='';renderPreview()});
  check.addEventListener('click',checkConnection);
  create.addEventListener('click',createSelected);
  window.addEventListener('echo:render',renderPreview);
  window.addEventListener('focus',()=>{
    if(Date.now()-checkedAt>120000 && !busy)void checkConnection();
  });
  renderPreview();
  void checkConnection();
  window.ECHOTodoist=Object.freeze({refresh:checkConnection,render:renderPreview});
})();