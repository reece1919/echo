/* ECHO v4.1 — production calendar.
 * Operates on the same ECHO state used by LIVE, STUDIO and PROMOTE.
 * Does not contact or pretend to schedule posts on third-party services.
 */
(() => {
  'use strict';
  const app=window.ECHO;
  const $=id=>document.getElementById(id);
  if(!app||!$('calMonth'))return;
  const today=()=>{
    const d=new Date();
    return dateKey(d);
  };
  const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const dateFrom=s=>{
    if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
    const [y,m,d]=s.split('-').map(Number),when=new Date(y,m-1,d);
    return when.getFullYear()===y&&when.getMonth()===m-1&&when.getDate()===d?when:null;
  };
  const addDays=(s,n)=>{const d=dateFrom(s);if(!d)return s;d.setDate(d.getDate()+n);return dateKey(d)};
  const shortDate=s=>dateFrom(s)?.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})||'Unscheduled';
  const uid=()=>Date.now()+'-'+Math.random().toString(36).slice(2);
  const make=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
  const snapshotItems=()=>{
    const state=app.snapshot(),list=[];
    for(const c of (state.contentItems||[])){
      const kind=c.format==='Live'?'live':'studio';
      list.push({...c,kind});
    }
    for(const p of (state.promoItems||[]))list.push({...p,kind:'promote'});
    return list;
  };
  const targetTab=kind=>kind==='promote'?'promos':kind==='live'?'command':'content';
  const finished=x=>x.stage==='Published'||x.stage==='Complete';
  const filterItems=items=>{
    const filter=$('calFilter').value;
    return items.filter(x=>filter==='all'||x.kind===filter);
  };
  const ordered=items=>items.slice().sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))||String(a.title).localeCompare(String(b.title)));
  let shown=new Date();
  shown.setDate(1);shown.setHours(12,0,0,0);
  let selected=null;
  const statusFor=kind=>kind==='promote'?['Planning','Active','Complete']:['Idea','Drafting','Ready','Scheduled','Published'];
  function openEditor(item){
    selected={kind:item.kind,id:item.id};
    $('calEditTitle').textContent=item.kind==='live'?'Edit planned stream':item.kind==='promote'?'Edit promotion':'Edit content';
    $('calEditContext').textContent=[item.platform,item.format,item.topic,item.source,item.originTimestamp?'Highlight at '+item.originTimestamp:''].filter(Boolean).join(' · ');
    $('calEditName').value=item.title||'';
    $('calEditDate').value=dateFrom(item.due)?item.due:'';
    $('calEditTime').value=/^\d{2}:\d{2}$/.test(item.time||'')?item.time:'';
    $('calEditHelp').textContent=item.kind==='live'?'Rescheduling a stream also moves its linked promotion. Clear the date to put it in Needs scheduling.':'Changes here update the item everywhere inside ECHO, but do not schedule anything on an external platform.';
    const stage=$('calEditStatus');stage.replaceChildren();
    for(const s of statusFor(item.kind)){
      const opt=make('option','',s);opt.value=s;stage.append(opt);
    }
    stage.value=item.stage||statusFor(item.kind)[0];
    $('calEditDialog').showModal();
  }
  const resolveSelected=()=>{
    if(!selected)return null;
    return snapshotItems().find(x=>x.kind===selected.kind&&String(x.id)===String(selected.id))||null;
  };
  $('calEditCancel').onclick=()=>$('calEditDialog').close();
  $('calEditOpen').onclick=()=>{
    const item=resolveSelected();
    $('calEditDialog').close();
    if(item)app.navigate(targetTab(item.kind));
  };
  $('calEditForm').onsubmit=e=>{
    e.preventDefault();
    const item=resolveSelected();if(!item)return;
    const title=$('calEditName').value.trim(),due=$('calEditDate').value,time=$('calEditTime').value,stage=$('calEditStatus').value;
    if(!title||due&&!dateFrom(due))return;
    if(!statusFor(item.kind).includes(stage))return;
    app.modify(s=>{
      const arr=item.kind==='promote'?s.promoItems:s.contentItems;
      const row=arr.find(x=>String(x.id)===String(item.id));
      if(!row)return;
      row.title=title;row.due=due;row.time=time;row.stage=stage;
      if(item.kind==='live'&&item.due!==due){
        for(const campaign of s.promoItems||[]){
          if(String(campaign.planId)===String(item.id)) campaign.due=due;
        }
      }
    });
    $('calEditDialog').close();
    render();
  };
  function itemButton(item,compact=false){
    const pill=make('button',compact?'cal-pill '+item.kind:'button small','');
    pill.type='button';
    if(compact){
      pill.textContent=(item.time?item.time+' ':'')+item.title;
      pill.title=[item.title,item.platform,item.stage,item.due||'Unscheduled'].filter(Boolean).join(' · ');
    }else{
      pill.textContent='Edit';
      pill.title='Edit '+item.title;
    }
    pill.onclick=()=>openEditor(item);
    return pill;
  }
  function agendaRow(item,showDate=true){
    const row=make('div','cal-agenda-row');
    const dot=make('i','cal-dot '+item.kind),body=make('div','cal-agenda-body');
    body.append(make('div','cal-agenda-title',item.title));
    const details=[item.kind.toUpperCase(),item.platform,item.stage,item.due&&showDate?shortDate(item.due):'',
      item.time||'',item.due&&item.due<today()&&!finished(item)?'OVERDUE':''].filter(Boolean).join(' · ');
    body.append(make('div','cal-agenda-detail',details));
    row.append(dot,body,itemButton(item));return row;
  }
  function renderAgenda(items){
    const next=$('calUpcoming'),unscheduled=$('calUnscheduled');
    next.replaceChildren();unscheduled.replaceChildren();
    const selectedItems=ordered(filterItems(items));
    const boundary=addDays(today(),30);
    const upcoming=selectedItems.filter(x=>dateFrom(x.due)&&x.due<=boundary&&!finished(x));
    const noDate=selectedItems.filter(x=>!dateFrom(x.due)&&!finished(x));
    $('calUpcomingCount').textContent=upcoming.length+' scheduled / overdue';
    $('calUnscheduledCount').textContent=noDate.length+' items';
    if(!upcoming.length)next.append(make('p','cal-agenda-empty','Nothing scheduled in the next 30 days.'));
    for(const item of upcoming.slice(0,20))next.append(agendaRow(item));
    if(upcoming.length>20)next.append(make('p','cal-agenda-empty','Showing the first 20 items.'));
    if(!noDate.length)unscheduled.append(make('p','cal-agenda-empty','Everything in progress has a date.'));
    for(const item of noDate.slice(0,20))unscheduled.append(agendaRow(item,false));
    if(noDate.length>20)unscheduled.append(make('p','cal-agenda-empty','Showing the first 20 items.'));
  }
  function renderMonth(items){
    const grid=$('calMonth');grid.replaceChildren();
    const title=shown.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    $('calTitle').textContent=title;
    const year=shown.getFullYear(),month=shown.getMonth(),firstWeekDay=new Date(year,month,1).getDay();
    const first=new Date(year,month,1-firstWeekDay,12);
    const byDate=new Map();
    for(const item of filterItems(items)){
      if(!dateFrom(item.due))continue;
      const arr=byDate.get(item.due)||[];arr.push(item);byDate.set(item.due,arr);
    }
    for(let i=0;i<42;i++){
      const date=new Date(first);date.setDate(first.getDate()+i);
      const day=dateKey(date);
      const outside=date.getMonth()!==month;
      const cell=make('div','cal-day'+(outside?' muted':'')+(day===today()?' today':''));
      const head=make('div','cal-day-head');
      head.append(make('span','',String(date.getDate())));
      const plus=make('button','cal-add-day','+');plus.type='button';
      plus.setAttribute('aria-label','Schedule an item on '+shortDate(day));
      plus.onclick=()=>{
        const picker=$('calAddForm').elements.namedItem('due');
        picker.value=day;
        $('calAddForm').scrollIntoView({behavior:'smooth',block:'nearest'});
        $('calAddForm').elements.namedItem('title').focus();
      };
      head.append(plus);cell.append(head);
      const inDay=(byDate.get(day)||[]).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
      for(const item of inDay.slice(0,3))cell.append(itemButton(item,true));
      if(inDay.length>3)cell.append(make('span','cal-more','+'+(inDay.length-3)+' more'));
      grid.append(cell);
    }
  }
  function render(){
    const items=snapshotItems();
    renderMonth(items);renderAgenda(items);
  }
  $('calPrev').onclick=()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1,12);render()};
  $('calNext').onclick=()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1,12);render()};
  $('calToday').onclick=()=>{shown=new Date();shown.setDate(1);shown.setHours(12,0,0,0);render()};
  $('calFilter').onchange=render;
  $('calAddForm').onsubmit=e=>{
    e.preventDefault();
    const form=e.currentTarget,data=new FormData(form);
    const title=String(data.get('title')||'').trim(),kind=data.get('kind'),due=String(data.get('due')||''),
      platform=String(data.get('platform')||'Twitch'),time=String(data.get('time')||'');
    if(!title||!dateFrom(due)||!['live','studio','promote'].includes(kind))return;
    const id=uid();
    app.modify(s=>{
      if(kind==='promote'){
        s.promoItems.push({id,title,platform,goal:'',stage:'Planning',due,time});
      }else{
        s.contentItems.push({id,title,platform,format:kind==='live'?'Live':'Video',stage:'Idea',due,time,source:'Calendar'});
        if(kind==='live'&&data.get('linkedPromo')){
          s.promoItems.push({id:uid(),planId:id,title:'Promote: '+title,goal:'Announce the broadcast and invite viewers',platform:'Multi-platform',stage:'Planning',due,time});
        }
      }
    });
    shown=new Date(dateFrom(due).getFullYear(),dateFrom(due).getMonth(),1,12);
    form.reset();render();
  };
  window.addEventListener('echo:render',render);
  window.addEventListener('echo:changed',render);
  render();
})();
