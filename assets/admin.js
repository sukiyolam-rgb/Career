const C=Career, form=document.querySelector('#jobForm');
let authenticated=false, editingId=null;
function message(text) { const el=document.querySelector('#message'); el.textContent=text;el.hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>el.hidden=true,6000); }
function requireLogin() { if(!authenticated) throw new Error('請先登入。'); }
function clearForm() { editingId=null;form.reset();form.elements.published.value=C.today();document.querySelector('#formTitle').textContent='新增崗位'; }
function logout() { window.resetExcelImport?.();window.resetResourceAdmin?.();C.logout();authenticated=false;document.querySelector('#adminPanel').hidden=true;document.querySelector('#logout').hidden=true;document.querySelector('#loginPanel').hidden=false;document.querySelector('#adminJobs').replaceChildren();clearForm();document.querySelector('#password').value='';}
document.querySelector('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;document.querySelector('#loginError').textContent='正在驗證帳號…';
 try{await C.login(document.querySelector('#email').value.trim(),document.querySelector('#password').value);authenticated=true;document.querySelector('#password').value='';document.querySelector('#loginError').textContent='';document.querySelector('#loginPanel').hidden=true;document.querySelector('#adminPanel').hidden=false;document.querySelector('#logout').hidden=false;clearForm();renderAdmin();}
 catch(error){document.querySelector('#loginError').textContent='登入失敗：'+error.message;}
 finally{button.disabled=false;}
});
document.querySelector('#logout').addEventListener('click',logout);
function renderAdmin() {
  if(!authenticated)return;
  const list=document.querySelector('#adminJobs');list.replaceChildren();
  let jobs;try{jobs=C.read();}catch(error){message(error.message);document.querySelector('#adminCount').textContent='讀取失敗';return;}
  document.querySelector('#adminCount').textContent=`${jobs.length} 個崗位`;
  if(!jobs.length){list.append(C.element('p','尚未新增崗位。請填寫左側表單或匯入 Excel。','muted'));return;}
  jobs.sort((a,b)=>b.published.localeCompare(a.published)).forEach(job=>{
    const item=C.element('article',undefined,'admin-job');item.append(C.element('h3',job.title),C.element('p',`${job.company} · ${job.salary}`,'muted'),C.element('p',`${job.location || '地點未提供'} · ${job.industry || '未分類'} · ${job.job_type || '未分類'} · ${job.role_category || '未分類'} · ${job.education} · ${job.published} · 截止：${job.deadline || '不設截止'}`,'muted'));
    const actions=C.element('div',undefined,'actions');const edit=C.element('button','編輯','secondary'),del=C.element('button','刪除','danger');
    edit.addEventListener('click',()=>{if(!authenticated)return;editingId=job.id;C.fields.forEach(f=>form.elements[f].value=job[f]);document.querySelector('#formTitle').textContent='編輯崗位';form.scrollIntoView({behavior:'smooth',block:'start'});});
    del.addEventListener('click',async()=>{if(!authenticated || !confirm(`確定刪除「${job.title}」？此操作不能復原。`))return;try{del.disabled=true;await C.remove(job.id);if(editingId===job.id)clearForm();renderAdmin();message('已刪除崗位。');}catch(error){message('刪除失敗：'+error.message);}finally{del.disabled=false;}});
    actions.append(edit,del);item.append(actions);list.append(item);
  });
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;
 try{requireLogin();const values=C.validate(Object.fromEntries(new FormData(form)));await C.save({id:editingId||crypto.randomUUID(),...values},!!editingId);if(!authenticated)return;clearForm();renderAdmin();message('崗位已儲存至共用資料庫，所有訪客可讀取。');}
 catch(error){message('未能儲存：'+error.message);}finally{button.disabled=false;}
});
document.querySelector('#cancelEdit').addEventListener('click',clearForm);document.querySelector('#newJob').addEventListener('click',()=>{clearForm();form.elements.title.focus();});

/* 備份不包含登入密碼；匯入採整批驗證，成功後才寫入。 */
document.querySelector('#exportData').addEventListener('click',async()=>{try{requireLogin();await C.refresh();requireLogin();const blob=new Blob([JSON.stringify({version:1,jobs:C.read()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=C.element('a');a.href=url;a.download=`macau-jobs-${C.today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){message(error.message);}});
document.querySelector('#importData').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{requireLogin();if(file.size>5*1024*1024)throw new Error('備份大小不可超過 5 MB。');const data=JSON.parse(await file.text());requireLogin();if(data.version!==1 || !Array.isArray(data.jobs) || data.jobs.length>2000)throw new Error('不支援的備份格式。');const ids=new Set();const jobs=data.jobs.map(j=>{if(typeof j.id!=='string'||!j.id||ids.has(j.id))throw new Error('崗位編號無效或重複。');ids.add(j.id);return {id:j.id,...C.validate(j)};});
 if(!confirm(`匯入 ${jobs.length} 個崗位並取代共用全部資料？建議先匯出備份。`))return;if(jobs.some(j=>!j.location))throw new Error('請先在 JSON 備份中補齊每個崗位的 location 工作地點。');await C.replaceAll(jobs);clearForm();renderAdmin();message('備份已匯入。');
 }catch(error){message('匯入失敗：'+error.message);}finally{e.target.value='';}
});
