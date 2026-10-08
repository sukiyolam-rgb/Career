const C = Career;
const search = document.querySelector('#search');
const education = document.querySelector('#educationFilter');
let dataError=null;
function render() {
  const list=document.querySelector('#jobsList'), empty=document.querySelector('#emptyState');
  list.replaceChildren(); empty.hidden=true;
  if(dataError){empty.textContent='招聘資訊暫時無法載入：'+dataError.message;empty.hidden=false;document.querySelector('#resultCount').textContent='載入失敗';return;}
  let jobs;
  try { jobs=C.read(); } catch(error) { empty.textContent='無法讀取招聘資料：'+error.message; empty.hidden=false; document.querySelector('#resultCount').textContent=''; return; }
  const selected=education.value;
  education.replaceChildren(new Option('全部學歷',''));
  [...new Set(jobs.map(j=>j.education))].sort().forEach(v=>education.add(new Option(v,v)));
  education.value=selected;
  const q=search.value.trim().toLocaleLowerCase();
  const filtered=jobs.filter(j=>(!education.value || j.education===education.value) && [j.title,j.company,j.education,j.location].some(v=>v.toLocaleLowerCase().includes(q))).sort((a,b)=>b.published.localeCompare(a.published));
  document.querySelector('#resultCount').textContent=`${filtered.length} 個崗位`;
  if (!filtered.length) { empty.hidden=false; empty.textContent=jobs.length?'沒有符合條件的崗位，請嘗試其他關鍵字。':'目前未有招聘資訊，請稍後再查看。'; }
  filtered.forEach(job=>{
    const card=C.element('article',undefined,'job-card');
    card.append(C.element('h3',job.title),C.element('p',job.company,'company'),C.element('p','工作地點 · '+(job.location || '未提供'),'muted'),C.element('p',job.salary,'salary'),C.element('span',job.education,'tag'));
    const dates=C.element('div',undefined,'dates'); dates.append(C.element('span','發佈日期 · '+job.published),C.element('span','截止日期 · '+(job.deadline || '不設截止')));
    if(job.deadline && job.deadline<C.today()) dates.append(C.element('span','已截止，請核對原招聘資訊','expired'));
    const link=C.element('a','查看原招聘資訊 ↗','button'); link.href=job.url; link.target='_blank'; link.rel='noopener noreferrer'; link.setAttribute('aria-label',`查看 ${job.company} 的 ${job.title} 原招聘資訊（新視窗）`);
    card.append(dates,link);list.append(card);
  });
}
search.addEventListener('input',render);education.addEventListener('change',render);
document.querySelector('#clearFilters').addEventListener('click',()=>{search.value='';education.value='';render();});
let loading=false;
async function loadJobs(){
 if(loading)return;loading=true;document.querySelector('#refreshJobs').disabled=true;document.querySelector('#resultCount').textContent='載入中…';
 try{await C.refresh();dataError=null;render();}catch(error){dataError=error;document.querySelector('#jobsList').replaceChildren();const empty=document.querySelector('#emptyState');empty.hidden=false;empty.textContent='招聘資訊暫時無法載入：'+error.message;document.querySelector('#resultCount').textContent='載入失敗';}
 finally{loading=false;document.querySelector('#refreshJobs').disabled=false;}
}
document.querySelector('#refreshJobs').addEventListener('click',loadJobs);
setInterval(()=>{if(!document.hidden)loadJobs();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadJobs();});loadJobs();
