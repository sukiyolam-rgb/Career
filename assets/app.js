/* 共用資料模型；localStorage 僅在同一來源、同一瀏覽器內共享。 */
window.Career = (() => {
  const KEY = 'macau-youth-jobs-v1';
  const fields = ['title','company','salary','education','published','deadline','url'];
  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function validate(job) {
    if (!job || fields.some(f => typeof job[f] !== 'string')) throw new Error('崗位資料格式不正確。');
    for (const field of ['title','company','salary','education']) if (!job[field].trim() || job[field].length > 200) throw new Error('請填妥崗位、公司、薪酬及學歷（最多 200 字）。');
    if (!validDate(job.published) || (job.deadline && !validDate(job.deadline))) throw new Error('請輸入有效日期。');
    if (job.deadline && job.deadline < job.published) throw new Error('截止日期不能早於發佈日期。');
    let url; try { url = new URL(job.url); } catch { throw new Error('請填寫完整招聘連結。'); }
    if (!['https:','http:'].includes(url.protocol)) throw new Error('招聘連結必須使用 http 或 https。');
    return Object.fromEntries(fields.map(f => [f,job[f].trim()]));
  }
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > 2000) throw new Error('本地資料格式不正確，請在管理頁匯入有效備份。');
    const ids = new Set();
    return data.map(j => {
      if (typeof j.id !== 'string' || !j.id || ids.has(j.id)) throw new Error('崗位編號重複或無效。');
      ids.add(j.id); return {id:j.id,...validate(j)};
    });
  }
  function write(jobs) { localStorage.setItem(KEY, JSON.stringify(jobs)); }
  function element(tag,text,className) { const el=document.createElement(tag); if(text !== undefined) el.textContent=text; if(className) el.className=className; return el; }
  function today() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  return {KEY,fields,read,write,validate,element,today};
})();
