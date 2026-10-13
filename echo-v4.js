/* ECHO v4 — stream-to-content workflows and production insights.
   Works entirely with ECHO's existing local state, with optional cloud sync. */
(() => {
  'use strict';
  const app=window.ECHO;
  const $=id=>document.getElementById(id);
  if(!app) return;
  const nextId=()=>Date.now()+'-'+Math.random().toString(36).slice(2);
  const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
  const launchpad=el('section','card echo-launchpad');
  launchpad.innerHTML=`
    <div class="card-head"><h2>Plan a broadcast</h2><span class="subtle">One plan → stream + promotion</span></div>
    <p class="quiet">Schedule your next stream and ECHO creates its production card and a linked promotional campaign. Posting is still done through the platform.</p>
    <form class="launchpad-form" id="planStreamForm">
      <input class="input" name="title" aria-label="Stream title" maxlength="150" required placeholder="Stream title (e.g. Sunday round at the course)">
      <div class="form-columns">
        <label>Content theme<select class="input" name="topic"><option>Gaming</option><option>Golf</option><option>Cooking</option><option>Worldbuilding</option><option>Other</option></select></label>
        <label>Stream platform<select class="input" name="platform"><option>Twitch</option><option>YouTube</option><option>Multi-platform</option></select></label>
        <label>Date<input class="input" name="date" aria-label="Planned stream date" type="date" required></label>
        <label>Time (optional)<input class="input" name="time" aria-label="Planned local time" type="time"></label>
      </div>
      <button class="button primary" type="submit">+ Plan stream and promotion</button>
    </form>
    <div id="upcomingStreamPlans" style="margin-top:14px"></div>`;
  const home=$('page-home');
  if(home)home.insertBefore(launchpad,home.children[1]||null);
  const form=$('planStreamForm');
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const fd=new FormData(form),title=String(fd.get('title')||'').trim(),due=String(fd.get('date')||'');
    if(!title||!due)return;
    const topic=String(fd.get('topic')),platform=String(fd.get('platform')),time=String(fd.get('time')||'');
    const planId=nextId();
    app.modify(s=>{
      if(!Array.isArray(s.contentItems))s.contentItems=[];
      if(!Array.isArray(s.promoItems))s.promoItems=[];
      s.contentItems.push({id:planId,title,platform,format:'Live',topic,due,time,stage:'Idea',source:'Stream plan'});
      s.promoItems.push({id:nextId(),planId,title:'Promote: '+title,goal:'Announce '+topic.toLowerCase()+' broadcast and invite viewers',platform:'Multi-platform',due,stage:'Planning'});
    });
    form.reset();
    updateAll();
    app.navigate('content');
  });
  const PLATFORMS=['YouTube','Instagram','TikTok','Twitch','Multi-platform'];
  app.repurpose=id=>{
    const source=(app.snapshot().contentItems||[]).find(x=>String(x.id)===String(id));
    if(!source)return;
    const answer=prompt('Repurpose this content for which platform?\nYouTube, Instagram, TikTok, or Twitch',source.platform==='YouTube'?'Instagram':'YouTube');
    if(answer===null)return;
    const dest=PLATFORMS.find(p=>p.toLowerCase()===answer.trim().toLowerCase());
    if(!dest){alert('Choose YouTube, Instagram, TikTok, Twitch, or Multi-platform.');return}
    if(dest===source.platform){alert('Choose a different platform to create a separate content task.');return}
    app.modify(s=>{
      const item=s.contentItems.find(x=>String(x.id)===String(id));if(!item)return;
      s.contentItems.push({...item,id:nextId(),platform:dest,stage:'Idea',format:dest==='TikTok'||dest==='Instagram'?'Short / Reel':item.format,title:item.title.replace(/^Clip: /,'Clip: ')});
    });
    updateAll();
  };
  app.editItem=(id,type)=>{
    const list=type==='promotion'?'promoItems':'contentItems';
    const current=(app.snapshot()[list]||[]).find(x=>String(x.id)===String(id));
    if(!current)return;
    const title=prompt(type==='promotion'?'Edit promotion name':'Edit content title',current.title);
    if(title===null)return;
    const trimmed=title.trim();
    if(!trimmed){alert('A title is required.');return}
    const date=prompt('Target date (YYYY-MM-DD), or blank for no date',current.due||'');
    if(date===null)return;
    if(date.trim()&&!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())){alert('Use the date format YYYY-MM-DD.');return}
    app.modify(s=>{const item=(s[list]||[]).find(x=>String(x.id)===String(id));if(item){item.title=trimmed;item.due=date.trim()}});
    updateAll();
  };
  function planPreview(){
    const root=$('upcomingStreamPlans');if(!root)return;
    root.replaceChildren();
    const planned=(app.snapshot().contentItems||[])
      .filter(x=>x.format==='Live'&&x.stage!=='Published')
      .sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,3);
    if(!planned.length){root.append(el('p','quiet','No upcoming streams in ECHO yet. Plan one above.'));return}
    root.append(el('div','subtle','UPCOMING STREAM PLANS'));
    for(const stream of planned){
      const row=el('div','board-item');
      const body=el('div','board-copy');
      body.append(el('div','board-title',stream.title),el('div','board-details',
        [stream.topic,stream.platform,stream.due,stream.time].filter(Boolean).join(' · ')));
      const view=el('button','button small','Open in Studio');view.type='button';view.onclick=()=>app.navigate('content');
      row.append(body,view);root.append(row);
    }
  }
  function stat(label,value,detail){
    const box=el('div','stat');
    box.append(el('div','label',label),el('div','value',String(value)),el('div','caption',detail));
    return box;
  }
  function bars(target,items){
    target.replaceChildren();
    if(!items.length){target.append(el('p','quiet','Nothing recorded yet. Schedule and publish content to see activity.'));return}
    const max=Math.max(1,...items.map(x=>x[1]));
    for(const [label,count] of items){
      const wrapper=el('div','');
      const headline=el('div','insight-row');headline.append(el('span','',label),el('strong','',String(count)));
      const track=el('div','insight-bar'),bar=el('span');bar.style.width=(count/max*100)+'%';
      track.append(bar);wrapper.append(headline,track);target.append(wrapper);
    }
  }
  function insights(){
    const data=app.snapshot(),content=Array.isArray(data.contentItems)?data.contentItems:[],promos=Array.isArray(data.promoItems)?data.promoItems:[];
    const root=$('insightStats');if(!root)return;
    root.replaceChildren(
      stat('Published items',content.filter(x=>x.stage==='Published').length,'Marked published in ECHO'),
      stat('In production',content.filter(x=>x.stage!=='Published').length,'All platforms'),
      stat('Highlights captured',(data.moments||[]).length,'Timestamped during LIVE'),
      stat('Campaigns active',promos.filter(x=>x.stage==='Active').length,'Tracked promotions')
    );
    const platforms=new Map(),stages=new Map();
    for(const item of content){const p=item.platform||'Other';platforms.set(p,(platforms.get(p)||0)+1);const st=item.stage||'Idea';stages.set(st,(stages.get(st)||0)+1)}
    bars($('insightPlatforms'),[...platforms].sort((a,b)=>b[1]-a[1]));
    bars($('insightStages'),[...stages].sort((a,b)=>b[1]-a[1]));
  }
  function updateAll(){planPreview();insights()}
  window.addEventListener('echo:render',updateAll);
  window.addEventListener('echo:changed',updateAll);
  updateAll();
})();
