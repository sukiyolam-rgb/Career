const C=Career,search=document.querySelector('#search');
const filters=[['education','educationFilter','全部學歷'],['location','locationFilter','全部地點'],['industry','industryFilter','全部行業'],['job_type','jobTypeFilter','全部類型']].map(([field,id,label])=>({field,select:document.getElementById(id),label}));
let dataError=null;
const category=(job,field)=>job[field] || (field==='location'?'未提供':'未分類');
/* 同一地點使用相同色系；文字始終保留，不單靠顏色區分。 */
function locationColor(location){
 if(/路氹/.test(location))return 'location-purple';
 if(/氹仔|凼仔/.test(location))return 'location-blue';
 if(/路環|路环/.test(location))return 'location-gold';
 if(/澳門|澳门/.test(location))return 'location-green';
 let hash=0;for(const char of location)hash=(hash*31+char.charCodeAt(0))>>>0;
 return ['location-green','location-blue','location-purple','location-gold'][hash%4];
}
function render(){
 const list=document.querySelector('#jobsList'),empty=document.querySelector('#emptyState');list.replaceChildren();empty.hidden=true;
 if(dataError){empty.textContent='招聘資訊暫時無法載入：'+dataError.message;empty.hidden=false;document.querySelector('#resultCount').textContent='載入失敗';return;}
 const jobs=C.read();
 for(const {field,select,label} of filters){const selected=select.value;select.replaceChildren(new Option(label,''));[...new Set(jobs.map(j=>category(j,field)))].sort((a,b)=>a.localeCompare(b,'zh-Hant')).forEach(v=>select.add(new Option(v,v)));if(selected&&![...select.options].some(o=>o.value===selected))select.add(new Option(selected,selected));select.value=selected;}
 const q=search.value.trim().toLocaleLowerCase();
 const filtered=jobs.filter(j=>filters.every(({field,select})=>!select.value||category(j,field)===select.value)&&[j.title,j.company,j.education,j.location,j.industry,j.job_type].some(v=>(v||'').toLocaleLowerCase().includes(q))).sort((a,b)=>b.published.localeCompare(a.published));
 document.querySelector('#resultCount').textContent=`${filtered.length} 個崗位`;
 if(!filtered.length){empty.hidden=false;empty.textContent=jobs.length?'沒有符合條件的崗位，請嘗試其他關鍵字或重設篩選。':'目前未有招聘資訊，請稍後再查看。';}
 for(const job of filtered){
  const card=C.element('article',undefined,'job-card');card.append(C.element('h3',job.title),C.element('p',job.company,'company'),C.element('span','工作地點 · '+category(job,'location'),'tag location-tag '+locationColor(job.location)),C.element('p',job.salary,'salary'));
  const tags=C.element('div',undefined,'job-tags');tags.append(C.element('span',job.education,'tag'),C.element('span','行業 · '+category(job,'industry'),'tag'),C.element('span','類型 · '+category(job,'job_type'),'tag'));card.append(tags);
  const dates=C.element('div',undefined,'dates');dates.append(C.element('span','發佈日期 · '+job.published),C.element('span','截止日期 · '+(job.deadline||'不設截止')));
  if(job.deadline&&job.deadline<C.today())dates.append(C.element('span','已截止，請核對原招聘資訊','expired'));
  const link=C.element('a','查看原招聘資訊 ↗','button');link.href=job.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`查看 ${job.company} 的 ${job.title} 原招聘資訊（新視窗）`);card.append(dates,link);list.append(card);
 }
}
search.addEventListener('input',render);filters.forEach(({select})=>select.addEventListener('change',render));
document.querySelector('#clearFilters').addEventListener('click',()=>{search.value='';filters.forEach(({select})=>select.value='');render();});
let loading=false;
async function loadJobs(){if(loading)return;loading=true;document.querySelector('#refreshJobs').disabled=true;document.querySelector('#resultCount').textContent='載入中…';try{await C.refresh();dataError=null;render();}catch(error){dataError=error;render();}finally{loading=false;document.querySelector('#refreshJobs').disabled=false;}}
document.querySelector('#refreshJobs').addEventListener('click',loadJobs);
setInterval(()=>{if(!document.hidden)loadJobs();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadJobs();});loadJobs();
