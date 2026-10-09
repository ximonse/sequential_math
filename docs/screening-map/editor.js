// The local server embeds this controller; standalone copies remain read-only.
const connection = __CONNECTION__;
let draft = null, baseCard = null, currentCardId = null, dirty = false, saving = false, creating = false;
const allStatuses = ['Beslutat','Byggt','Föreslaget','Planerat','Saknas','Lokalt klart','Beslut behövs','Senare'];
const notice = document.createElement('p');
notice.id = 'save-state'; notice.setAttribute('role','status');
notice.textContent = connection ? 'Ansluten till planfilen · ändringar sparas endast med Spara kort.' : 'Läsande kopia. Starta npm run plan:dev för att redigera och spara.';
document.querySelector('header').append(notice);
const reloadButton = document.createElement('button');
reloadButton.textContent='Läs senaste plan'; reloadButton.disabled=!connection;
document.querySelector('.tools').append(reloadButton);
const newCardButton = document.createElement('button');
newCardButton.textContent='Nytt kort / idé';newCardButton.disabled=!connection;
document.querySelector('.tools').prepend(newCardButton);
newCardButton.onclick=()=>{
  if(!allowLeave())return;
  creating=true;currentCardId='idea-'+crypto.randomUUID();baseCard=null;dirty=false;opener=newCardButton;
  draft={id:currentCardId,area:'Idéer',title:'',status:'Föreslaget',purpose:'',next:'',acceptance:'',decision:'',evidence:'',issue:'',kind:'idé',requires:[],affects:[],tasks:[]};
  editCard();$('edit-form').elements.title.focus();
};
const updateDirty = () => { dirty=true; $('edit-state').textContent='Osparade ändringar'; };
const allowLeave = () => !saving && (!dirty || confirm('Kortet har osparade ändringar. Lämna utan att spara?'));
function acceptPlan(data) {
  Object.assign(plan,data.plan); connection.revision=data.revision;
  for(const [id,field] of [['status','status'],['area','area']]){
    const select=$(id),selected=select.value;
    select.replaceChildren(new Option(id==='area'?'Alla områden':'Alla statusar',''));
    for(const value of new Set(plan.cards.map(c=>c[field])))select.add(new Option(value,value));
    select.value=selected;
  }
  byId.clear(); plan.cards.forEach(c=>byId.set(c.id,c)); render();
}
function tasksHtml() {
  return `<h3>Deluppgifter</h3><div id="task-list">${(draft.tasks||[]).map((t,i)=>`<label class="task"><input type="checkbox" data-task="${i}" ${t.done?'checked':''} ${connection?'':'disabled'}><span>${esc(t.text)}</span></label>`).join('')||'<p>Inga deluppgifter ännu.</p>'}</div>${connection?'<div class="add-task"><input id="new-task" aria-label="Ny deluppgift" placeholder="Skriv en deluppgift"><button id="add-task" type="button">Lägg till</button></div>':''}`;
}
function bindTasks() {
  for(const checkbox of $('task-list').querySelectorAll('[data-task]')) checkbox.onchange=()=>{draft.tasks[Number(checkbox.dataset.task)].done=checkbox.checked;updateDirty()};
  if($('add-task')) $('add-task').onclick=()=>{
    const text=$('new-task').value.trim();if(!text)return;
    draft.tasks ||= [];draft.tasks.push({id:crypto.randomUUID(),text,done:false});
    $('tasks').innerHTML=tasksHtml();bindTasks();updateDirty();$('new-task').focus();
  };
  if($('new-task')) $('new-task').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();$('add-task').click()}};
}
open = function(id) {
  if(!allowLeave())return;
  creating=false;currentCardId=id;baseCard=structuredClone(byId.get(id));draft=structuredClone(baseCard);dirty=false;
  editCard();
};
function editCard() {
  const c=draft;
  $('detail-title').textContent=creating?'Nytt kort / idé':c.title;
  const fields=[['purpose','Syfte'],['next','Nästa deluppgift'],['acceptance','Klart när'],['decision','Beslut / tanketråd'],['evidence','Gjort, belägg och publicering'],['issue','GitHub-issue']];
  $('detail-body').innerHTML=`<form id="edit-form"><label class="field">Rubrik<input name="title" value="${esc(c.title)}" ${connection?'':'readonly'} required pattern=".*\\S.*"></label>${creating?`<label class="field">Område<input name="area" value="${esc(c.area)}" required pattern=".*\\S.*" list="card-areas"><datalist id="card-areas">${[...new Set(plan.cards.map(card=>card.area))].map(area=>`<option value="${esc(area)}"></option>`).join('')}</datalist></label><label class="field">Idé / beskrivning<textarea name="purpose" rows="4">${esc(c.purpose)}</textarea></label>`:''}<label class="field">Status<select name="status" ${connection?'':'disabled'}>${allStatuses.map(s=>`<option ${s===c.status?'selected':''}>${esc(s)}</option>`).join('')}</select></label><div id="tasks">${tasksHtml()}</div><details><summary>Redigera text och anteckningar</summary>${fields.filter(([key])=>!creating||key!=='purpose').map(([key,label])=>`<label class="field">${label}<textarea name="${key}" rows="${key==='issue'?1:3}" ${connection?'':'readonly'}>${esc(c[key])}</textarea></label>`).join('')}</details><div class="save-row"><button id="save-card" type="submit" ${connection?'':'disabled'}>Spara kort till planfil</button><span id="edit-state" role="status">${creating?'Inte sparat ännu':'Inga osparade ändringar'}</span></div></form>${linked('Kräver först',c.requires)}${linked('Andra delar som kräver detta',plan.cards.filter(x=>x.requires.includes(currentCardId)).map(x=>x.id))}${linked('Påverkar',c.affects)}${linked('Påverkas av',plan.edges.filter(e=>e.target===currentCardId&&e.kind==='påverkar').map(e=>e.source))}${c.issue?`<p><a href="${esc(c.issue)}" target="_blank" rel="noopener">Öppna issue ↗</a></p>`:''}<p class="note">${esc(plan.note)}</p>`;
  for(const field of $('edit-form').querySelectorAll('[name]'))field.oninput=()=>{draft[field.name]=field.value;updateDirty()};
  bindTasks();
  $('edit-form').onsubmit=async event=>{
    event.preventDefault();if(saving||!connection)return;
    saving=true;$('save-card').disabled=true;$('edit-state').textContent='Sparar…';
    // Freeze the submitted draft; late edits are prevented while awaiting ack.
    const controls=[...$('edit-form').querySelectorAll('input,textarea,select,button')];controls.forEach(el=>el.disabled=true);
    const submitted=structuredClone(draft);
    try {
      const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json','X-Plan-Token':connection.token},body:JSON.stringify(creating?{action:'create_card',card:submitted}:{baseCard,card:submitted})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Sparandet misslyckades');
      if(creating){$('search').value=$('status').value=$('area').value='';nextOnly=false;$('recommend').setAttribute('aria-pressed','false');}
      acceptPlan(data);creating=false;dirty=false;$('edit-state').textContent='Sparat i planfilen';notice.textContent='Sparat i planfilen · '+new Date().toLocaleTimeString('sv-SE');
      baseCard=structuredClone(byId.get(currentCardId));draft=structuredClone(baseCard);
      for(const field of $('edit-form').querySelectorAll('[name]'))field.value=draft[field.name];
      $('tasks').innerHTML=tasksHtml();bindTasks();
      $('detail-title').textContent=submitted.title;
    } catch(error) {$('edit-state').textContent=error.message;notice.textContent='Inte sparat. Ditt utkast ligger kvar i kortet.'}
    finally {saving=false;controls.forEach(el=>el.disabled=false)}
  };
  for(const button of $('detail-body').querySelectorAll('[data-card]'))button.onclick=()=>open(button.dataset.card);
  if(!$('detail').open)$('detail').showModal();else $('close').focus();
  $('detail').scrollTop=0;
}
$('close').onclick=()=>{if(allowLeave()){$('detail').close();dirty=false}};
$('detail').addEventListener('cancel',event=>{if(!allowLeave())event.preventDefault();else dirty=false});
window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue=''}});
reloadButton.onclick=async()=>{
  if(!allowLeave())return;
  try {const response=await fetch('/api/plan');const data=await response.json();if(!response.ok)throw Error(data.error);acceptPlan(data);dirty=false;$('detail').close();notice.textContent='Senaste plan läst. Öppna kortet för att redigera.'}
  catch(error){notice.textContent='Kunde inte läsa senaste plan: '+error.message}
};
