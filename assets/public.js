const C = Career;
const search = document.querySelector('#search');
const education = document.querySelector('#educationFilter');
function render() {
  const list=document.querySelector('#jobsList'), empty=document.querySelector('#emptyState');
  list.replaceChildren(); empty.hidden=true;
  let jobs;
  try { jobs=C.read(); } catch(error) { empty.textContent='無法讀取本地招聘資料：'+error.message; empty.hidden=false; document.querySelector('#resultCount').textContent=''; return; }
  const selected=education.value;
  education.replaceChildren(new Option('全部學歷',''));
  [...new Set(jobs.map(j=>j.education))].sort().forEach(v=>education.add(new Option(v,v)));
  education.value=selected;
  const q=search.value.trim().toLocaleLowerCase();
  const filtered=jobs.filter(j=>(!education.value || j.education===education.value) && [j.title,j.company,j.education,j.location].some(v=>v.toLocaleLowerCase().includes(q))).sort((a,b)=>b.published.localeCompare(a.published));
  document.querySelector('#resultCount').textContent=`${filtered.length} 個崗位`;
  if (!filtered.length) { empty.hidden=false; empty.textContent=jobs.length?'沒有符合條件的崗位，請嘗試其他關鍵字。':'目前未有招聘資訊。服務員可登入管理頁新增此瀏覽器的崗位。'; }
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
window.addEventListener('storage',e=>{if(e.key===C.KEY)render();});render();
