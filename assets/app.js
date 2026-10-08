/* 共用崗位讀寫：Supabase REST + Auth。崗位不再存入 localStorage。 */
window.Career = (() => {
 const fields=['title','company','location','industry','job_type','salary','education','published','deadline','url'];
 let jobs=[],token=null,expiresAt=0;
 function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
 function validate(job){
  if(job)job={industry:'',job_type:'',...job};
  if(job && job.location===undefined)job={...job,location:''}; // 相容舊備份，匯入時補齊地點。
  if(!job||fields.some(f=>typeof job[f]!=='string'))throw new Error('崗位資料格式不正確。');
  for(const f of ['title','company','salary','education'])if(!job[f].trim()||job[f].length>200)throw new Error('請填妥崗位、公司、薪酬及學歷（最多 200 字）。');
  if(job.industry.length>100||job.job_type.length>100)throw new Error('行業及崗位類型最多 100 字。');
  if(job.location.length>200)throw new Error('工作地點最多 200 字。');
  if(!validDate(job.published)||(job.deadline&&!validDate(job.deadline)))throw new Error('請輸入有效日期。');
  if(job.deadline&&job.deadline<job.published)throw new Error('截止日期不能早於發佈日期。');
  let url;try{url=new URL(job.url);}catch{throw new Error('請填寫完整招聘連結。');}
  if(!['http:','https:'].includes(url.protocol)||job.url.length>2000)throw new Error('招聘連結須使用 http 或 https，最多 2000 字。');
  return Object.fromEntries(fields.map(f=>[f,job[f].trim()]));
 }
 function config(){const c=window.CAREER_CONFIG||{};if(!c.supabaseUrl || !c.supabaseKey)throw new Error('網站尚未連接共用資料庫：'+(!c.supabaseUrl?'缺少 Project URL':'缺少公開金鑰')+'。請確認最新 GitHub 部署已成功，並強制重新整理頁面。');if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.supabaseUrl))throw new Error('Project URL 格式不正確，應為 https://專案代碼.supabase.co，不包含 /rest/v1/。');
 if(c.supabaseKey.startsWith('sb_secret_'))throw new Error('禁止在前端使用 secret key。');
 if(c.supabaseKey.startsWith('eyJ')){try{if(JSON.parse(atob(c.supabaseKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon')throw new Error();}catch{throw new Error('前端只允許 anon 公開金鑰。');}}
 else if(!c.supabaseKey.startsWith('sb_publishable_'))throw new Error('請使用 Supabase publishable 或 anon 公開金鑰。');return c;}
 async function request(path,{method='GET',body,auth=false,headers={}}={}){
  const c=config();if(auth&&(!token||Date.now()>=expiresAt)){token=null;throw new Error('登入已過期，請登出並重新登入。');}
  const h={apikey:c.supabaseKey,...headers};if(auth)h.Authorization='Bearer '+token;else if(c.supabaseKey.startsWith('eyJ'))h.Authorization='Bearer '+c.supabaseKey;
  if(body!==undefined)h['Content-Type']='application/json';
  const response=await fetch(c.supabaseUrl.replace(/\/$/,'')+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw new Error('資料庫回應格式不正確。');}
  if(!response.ok){if(auth&&response.status===401)token=null;throw new Error(data?.msg||data?.message||data?.error_description||`連線失敗（${response.status}）`);}return data;
 }
 function normalize(j){return {id:j.id,...validate({...j,deadline:j.deadline||''})};}
 async function refresh(){const all=[];for(let offset=0;offset<=2000;offset+=1000){const rows=await request(`/rest/v1/jobs?select=*&order=published.desc,id.asc&offset=${offset}&limit=1000`);if(!Array.isArray(rows))throw new Error('崗位回應格式不正確。');all.push(...rows.map(normalize));if(all.length>2000)throw new Error('招聘資料超過 2000 筆，請管理員整理資料後再載入。');if(rows.length<1000)break;}jobs=all;return read();}
 function read(){return jobs.map(j=>({...j}));}
 async function login(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});token=data.access_token;expiresAt=Date.now()+data.expires_in*1000;
 try{const allowed=await request('/rest/v1/rpc/is_staff',{method:'POST',body:{},auth:true});if(allowed!==true)throw new Error('此帳號未獲授權管理招聘資料。');await refresh();}catch(e){await logout();throw e;}}
 async function logout(){const active=token;token=null;expiresAt=0;if(active){try{const c=config();await fetch(c.supabaseUrl.replace(/\/$/,'')+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:c.supabaseKey,Authorization:'Bearer '+active}});}catch{}}}
 async function save(job,existing=false){const values=validate(job);if(!values.location)throw new Error('請填寫工作地點。');const body={...values,deadline:values.deadline||null};if(!existing)body.id=job.id;
 const rows=await request('/rest/v1/jobs'+(existing?'?id=eq.'+encodeURIComponent(job.id):''),{method:existing?'PATCH':'POST',body,auth:true,headers:{Prefer:'return=representation'}});
 if(!rows?.length)throw new Error('未能修改崗位：資料已刪除或帳號權限已變更。');const saved=normalize(rows[0]);jobs=jobs.filter(j=>j.id!==saved.id).concat(saved);}
 async function remove(id){const rows=await request('/rest/v1/jobs?id=eq.'+encodeURIComponent(id),{method:'DELETE',auth:true,headers:{Prefer:'return=representation'}});if(!rows?.length)throw new Error('刪除未完成：資料已不存在或沒有權限。');jobs=jobs.filter(j=>j.id!==id);}
 async function replaceAll(rows){await request('/rest/v1/rpc/replace_jobs',{method:'POST',body:{items:rows.map(j=>({...validate(j),id:j.id,deadline:j.deadline||null}))},auth:true});jobs=rows.map(j=>({...j}));}
 function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 return {fields,validate,read,refresh,login,logout,save,remove,replaceAll,element,today};
})();
