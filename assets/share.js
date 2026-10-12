/* 只複製崗位文字，不替使用者發送訊息。 */
window.CareerShare={
 formatJob(job){return ['【澳門青年就業導航｜招聘資訊】','',`崗位：${job.title}`,`公司：${job.company}`,`工作地點：${job.location||'未提供'}`,`行業：${job.industry||'未分類'}`,`崗位類別：${job.role_category||'未分類'}`,`聘用形式：${job.job_type||'未分類'}`,`薪酬：${job.salary}`,`學歷要求：${job.education}`,`發佈日期：${job.published}`,`截止日期：${job.deadline||'不設截止'}`,'原招聘連結：'+job.url,...(job.deadline&&job.deadline<Career.today()?['','注意：截止日期已過，請核對原招聘資訊。']:[]),'','招聘資訊以原招聘頁面為準。'].join('\n');},
 async copy(text){try{if(navigator.clipboard){await navigator.clipboard.writeText(text);return true;}}catch{}
 const input=document.createElement('textarea');input.value=text;input.className='sr-only';document.body.append(input);input.select();let copied=false;try{copied=document.execCommand('copy');}catch{}input.remove();if(copied)return true;
 let dialog=document.querySelector('#manualCopy');if(!dialog){dialog=document.createElement('dialog');dialog.id='manualCopy';const title=Career.element('h2','複製崗位資訊');const note=Career.element('p','瀏覽器未允許自動複製，請選取下方文字並手動複製。');const field=document.createElement('textarea');field.rows=15;field.readOnly=true;field.setAttribute('aria-label','待複製的崗位資訊');const close=Career.element('button','關閉','secondary');close.addEventListener('click',()=>dialog.close());dialog.append(title,note,field,close);document.body.append(dialog);}dialog.querySelector('textarea').value=text;dialog.showModal();dialog.querySelector('textarea').select();return false;
 }
};
