const C=Career, form=document.querySelector('#jobForm');
let authenticated=false, editingId=null, imageFile=null, previewUrl=null, busy=false;
function message(text) { const el=document.querySelector('#message'); el.textContent=text;el.hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>el.hidden=true,6000); }
function requireLogin() { if(!authenticated) throw new Error('請先登入。'); }
function clearForm() { editingId=null;form.reset();form.elements.published.value=C.today();document.querySelector('#formTitle').textContent='新增崗位'; }
function logout() { C.logout(); authenticated=false;document.querySelector('#adminPanel').hidden=true;document.querySelector('#logout').hidden=true;document.querySelector('#loginPanel').hidden=false;document.querySelector('#adminJobs').replaceChildren();clearForm();document.querySelector('#password').value='';document.querySelector('#ocrText').value='';document.querySelector('#recruitmentText').value='';document.querySelector('#ocrDetails').hidden=true;document.querySelector('#imageUpload').value='';imageFile=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;document.querySelector('#imagePreview').hidden=true;document.querySelector('#recognize').disabled=true;document.querySelector('#ocrStatus').textContent=''; }
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
  if(!jobs.length){list.append(C.element('p','尚未新增崗位。請填寫左側表單或上傳截圖。','muted'));return;}
  jobs.sort((a,b)=>b.published.localeCompare(a.published)).forEach(job=>{
    const item=C.element('article',undefined,'admin-job');item.append(C.element('h3',job.title),C.element('p',`${job.company} · ${job.salary}`,'muted'),C.element('p',`${job.location || '地點未提供'} · ${job.industry || '未分類'} · ${job.job_type || '未分類'} · ${job.education} · ${job.published} · 截止：${job.deadline || '不設截止'}`,'muted'));
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
/* OCR 在瀏覽器本機執行，圖片不會傳往 AI API。引擎及語言模型由本網站提供。 */
document.querySelector('#imageUpload').addEventListener('change',e=>{
 imageFile=null;document.querySelector('#recognize').disabled=true;document.querySelector('#imagePreview').hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;
 const file=e.target.files[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp','image/bmp'].includes(file.type)||file.size>10*1024*1024){message('請選擇不超過 10 MB 的 PNG、JPEG、WebP 或 BMP 圖片。');e.target.value='';return;}
 imageFile=file;previewUrl=URL.createObjectURL(file);const img=document.querySelector('#imagePreview');img.src=previewUrl;img.hidden=false;document.querySelector('#recognize').disabled=busy;document.querySelector('#ocrStatus').textContent='圖片已準備好，識別後請人工核對。';
});
let enginePromise;
function loadEngine(){if(window.Tesseract)return Promise.resolve();if(!enginePromise)enginePromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/vendor/ocr/tesseract.min.js';s.onload=resolve;s.onerror=()=>{s.remove();enginePromise=null;reject(new Error('OCR 引擎載入失敗，請檢查網絡或稍後重試。'));};document.head.append(s);});return enginePromise;}
/* 保守的欄位提取：無標籤的值留空，絕不自動提交。 */
function parseRecruitmentText(text){
 const result={};
 // 將同一行中用分隔符隔開的明確標籤拆開，不猜測公司或行業。
 text=text.replace(/(?:[，,；;|]|[ \t]+)(?=(?:公司(?:名稱|名字)?|職位(?:名稱)?|崗位(?:名稱|名字)?|工作地點|行業|崗位類型|薪酬|學歷(?:要求)?|發佈日期|截止日期|招聘連結)\s*[:：])/g,'\n');
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const patterns={industry:/^(?:行業|行业|產業|产业|industry)\s*[:：]\s*(.+)$/i,job_type:/^(?:崗位類型|岗位类型|職位類型|职位类型|工作類型|工作类型|僱用形式|雇用形式|employment\s*type|job\s*type)\s*[:：]\s*(.+)$/i,location:/^(?:工作地點|工作地点|工作地址|上班地點|上班地点|地點|地点|location|work(?:place|\s*location))\s*[:：]\s*(.+)$/i,title:/^(?:崗位(?:名(?:字|稱))?|岗位(?:名(?:字|称))?|職位(?:名稱)?|职位(?:名称)?|招聘職位|job\s*title|position)\s*[:：]\s*(.+)$/i,company:/^(?:公司(?:名(?:字|稱|称))?|企業名稱|企业名称|僱主|雇主|company|employer)\s*[:：]\s*(.+)$/i,salary:/^(?:薪酬|薪資|薪资|工資|工资|待遇|月薪|salary)\s*[:：]\s*(.+)$/i,education:/^(?:學歷(?:要求)?|学历(?:要求)?|education)\s*[:：]\s*(.+)$/i};
 for(const [field,pattern] of Object.entries(patterns)){const line=lines.find(l=>pattern.test(l));if(line)result[field]=line.match(pattern)[1].trim();}
 if(!result.salary){const salary=text.match(/(?:MOP|HKD|澳門元|澳门元|港幣|港币)\s*[\d,]+(?:\s*[-–至]\s*[\d,]+)?(?:\s*[／/]\s*(?:月|年|小時|小时))?/i);if(salary)result.salary=salary[0];}
 if(!result.education){const ed=text.match(/(?:學歷不限|学历不限|不限學歷|不限学历|博士|碩士|硕士|本科|學士|学士|大專|大专|高中|中學|中学|初中)/);if(ed)result.education=ed[0];}
 if(!result.job_type){const type=text.match(/(?:全職|全职|兼職|兼职|實習|实习|臨時|临时)/);if(type)result.job_type=({'全职':'全職','兼职':'兼職','实习':'實習','临时':'臨時'})[type[0]]||type[0];}
 const url=text.match(/https?:\/\/[^\s<>"）)]+/i);if(url)result.url=url[0].replace(/[。，；,;]+$/,'');
 for(const [field,label] of [['published',/(?:發佈日期|發布日期|发布日期|刊登日期|posted|published)/i],['deadline',/(?:截止(?:日期)?|closing|deadline)/i]]){const line=lines.find(l=>label.test(l));if(!line)continue;const date=line.match(/(\d{4})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?/);if(date){const value=`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`;try{if(new Date(value).toISOString().slice(0,10)===value)result[field]=value;}catch{}}}
 return result;
}
function applyText(text=document.querySelector('#ocrText').value){requireLogin();if(!text.trim()){message('請先貼上招聘文案或識別圖片。');return;}const values=parseRecruitmentText(text);if(!Object.keys(values).length){message('未能提取欄位，請加上職位、公司、工作地點等標籤，或手動填寫。');return;}if(!confirm('將識別到的欄位填入表單（會取代這些欄位的現有內容）？'))return;Object.entries(values).forEach(([f,v])=>form.elements[f].value=v);message(`已填入 ${Object.keys(values).length} 個欄位；請核對並補齊後再儲存。`);}
document.querySelector('#applyRecruitmentText').addEventListener('click',()=>{try{applyText(document.querySelector('#recruitmentText').value);}catch(error){message(error.message);}});
document.querySelector('#applyOcr').addEventListener('click',()=>{try{applyText();}catch(error){message(error.message);}});
document.querySelector('#recognize').addEventListener('click',async()=>{
 if(busy||!imageFile||!authenticated)return;busy=true;const file=imageFile;document.querySelector('#recognize').disabled=true;document.querySelector('#imageUpload').disabled=true;const status=document.querySelector('#ocrStatus');let worker;
 try{status.textContent='正在載入 OCR 引擎及中英語言模型，首次使用可能需較長時間…';await loadEngine();worker=await Tesseract.createWorker('chi_tra+chi_sim+eng',1,{workerPath:new URL('assets/vendor/ocr/worker.min.js',location.href).href,corePath:new URL('assets/vendor/ocr/core',location.href).href,langPath:new URL('assets/vendor/ocr/lang',location.href).href,gzip:false,logger:m=>{if(authenticated && m.status==='recognizing text')status.textContent=`正在識別：${Math.round(m.progress*100)}%`;}});const {data}=await worker.recognize(file);if(!authenticated)return;document.querySelector('#ocrText').value=data.text;document.querySelector('#ocrDetails').hidden=false;document.querySelector('#ocrDetails').open=true;status.textContent='識別完成。請核對原圖及文字；系統不會自動新增崗位。';applyText();
 }catch(error){if(authenticated){status.textContent='識別失敗。可重試或使用手動表單。';message(error.message);}}finally{if(worker)await worker.terminate().catch(()=>{});busy=false;document.querySelector('#imageUpload').disabled=false;document.querySelector('#recognize').disabled=!imageFile;}
});
