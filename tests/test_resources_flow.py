"""Browser integration checks for sharing, training and policy CRUD (API fixture only)."""
from playwright.sync_api import sync_playwright
import os,json
BASE=os.environ.get('CAREER_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context();errors=[]
 db={'jobs':[{'id':'job','title':'行政助理','company':'青年服務','location':'氹仔','industry':'社會服務','job_type':'全職','role_category':'行政','salary':'MOP 15000','education':'學士','published':'2026-10-09','deadline':None,'url':'https://example.com/job'}],'trainings':[],'policies':[]}
 def api(r):
  req=r.request;path=req.url.split('supabase.co')[1];data=req.post_data_json if req.post_data else None
  if path.startswith('/auth/v1/token'):result={'access_token':'staff','expires_in':3600}
  elif path=='/rest/v1/rpc/is_staff':result=True
  elif path.startswith('/auth/v1/logout'):result={}
  else:
   table=path.split('/')[3].split('?')[0];assert table in db
   if req.method=='GET':result=db[table][:] if 'offset=0&' in path else []
   else:
    assert req.headers.get('authorization')=='Bearer staff'
    if req.method=='POST':db[table].append(data);result=[data]
    elif req.method=='PATCH':
     id=path.split('eq.')[1];result=[]
     for row in db[table]:
      if row['id']==id:row.update(data);result=[row]
    elif req.method=='DELETE':
     id=path.split('eq.')[1];result=[row for row in db[table] if row['id']==id];db[table][:]=[row for row in db[table] if row['id']!=id]
  r.fulfill(content_type='application/json',body=json.dumps(result))
 c.route('**://test.supabase.co/**',api);c.route('**/assets/config.js*',lambda r:r.fulfill(content_type='application/javascript',body="window.CAREER_CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_test'}"))
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/');page.locator('.job-card').wait_for()
 page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text}},configurable:true})")
 page.get_by_role('button',name='複製 行政助理 的招聘資訊').click();page.wait_for_function("window.__copied?.includes('崗位類別：行政')")
 copied=page.evaluate('window.__copied');assert '公司：青年服務' in copied and '聘用形式：全職' in copied and '截止日期：不設截止' in copied and 'https://example.com/job' in copied
 page.locator('#roleCategoryFilter').select_option('行政');assert page.locator('.job-card').count()==1
 page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}},configurable:true});document.execCommand=()=>false")
 page.evaluate("CareerShare.copy('手動複製測試')");assert page.locator('#manualCopy').is_visible();assert page.locator('#manualCopy textarea').input_value()=='手動複製測試';page.locator('#manualCopy button').click()
 page.goto(BASE+'/admin.html');page.locator('#email').fill('staff@example.com');page.locator('#password').fill('ok');page.locator('#loginForm button').click();page.locator('#adminPanel').wait_for(state='visible');assert page.locator('#imageUpload').count()==0 and page.locator('#recruitmentText').count()==0
 page.locator('[data-admin-tab=trainings]').click();page.wait_for_function("document.querySelector('#resourceStatus').textContent==='' && !document.querySelector('#trainingForm').hidden")
 for name in ['青年中心','培訓協會']:page.locator('#newOrganizer').fill(name);page.locator('#addOrganizer').click()
 values={'title':'青年職業技能培訓','registration_start':'2026-10-13','registration_end':'2026-11-01','url':'https://example.com/course','industries':'社會服務、教育','roles':'行政、傳媒'}
 for field,v in values.items():page.locator(f'#trainingForm [name={field}]').fill(v)
 page.locator('#trainingForm button[type=submit]').click();page.wait_for_function("document.querySelectorAll('#resourceList .admin-job').length===1")
 assert db['trainings'][0]['organizers']==['培訓協會','青年中心'] or set(db['trainings'][0]['organizers'])=={'青年中心','培訓協會'}
 assert db['trainings'][0]['industries']==['社會服務','教育'] and db['trainings'][0]['roles']==['行政','傳媒']
 public=c.new_page();public.goto(BASE+'/training.html');public.locator('.job-card').wait_for();assert '青年中心' in public.locator('.job-card').inner_text() and '培訓協會' in public.locator('.job-card').inner_text()
 public.locator('#resourceRole').select_option('傳媒');public.locator('#resourceIndustry').select_option('教育');assert public.locator('.job-card').count()==1
 public.locator('#resourceSearch').fill('不存在');assert public.locator('.job-card').count()==0;public.locator('#resetResources').click();assert public.locator('.job-card').count()==1
 page.locator('#resourceList button').filter(has_text='編輯').click();page.locator('#trainingForm [name=title]').fill('更新培訓名稱');page.locator('#trainingForm button[type=submit]').click();page.wait_for_function("document.querySelector('#resourceList').textContent.includes('更新培訓名稱')")
 page.locator('[data-admin-tab=policies]').click();page.wait_for_function("document.querySelector('#resourceStatus').textContent==='' && !document.querySelector('#policyForm').hidden")
 for expected,category in enumerate(['gba','hengqin','macau'],1):
  for field,value in {'title':'政策 '+category,'summary':'以官方資訊為準','url':'https://example.com/'+category,'published':'2026-10-13'}.items():page.locator(f'#policyForm [name={field}]').fill(value)
  page.locator('#policyForm [name=category]').select_option(category);page.locator('#policyForm button[type=submit]').click();page.wait_for_function('(count)=>document.querySelectorAll("#resourceList .admin-job").length===count',arg=expected)
 assert len(db['policies'])==3
 public.goto(BASE+'/policies.html');public.wait_for_function("document.querySelectorAll('.job-card').length===3");assert public.locator('.policy-group').count()==3
 public.locator('#resourceCategory').select_option('hengqin');assert public.locator('.job-card').count()==1 and '政策 hengqin' in public.locator('.job-card').inner_text()
 page.locator('#resourceList button').filter(has_text='編輯').first.click();page.locator('#policyForm [name=summary]').fill('<script>alert(1)</script>');page.locator('#policyForm button[type=submit]').click();page.wait_for_function("document.querySelector('#message').textContent.includes('已儲存')")
 public.locator('#resetResources').click();public.locator('#refreshResources').click();public.wait_for_function("document.querySelectorAll('.job-card').length===3")
 assert public.locator('.policy-summary script').count()==0
 page.once('dialog',lambda d:d.accept());page.locator('#resourceList button').filter(has_text='刪除').first.click();page.wait_for_function("document.querySelectorAll('#resourceList .admin-job').length===2");assert len(db['policies'])==2
 page.locator('[data-admin-tab=trainings]').click();page.wait_for_function("document.querySelector('#resourceList').textContent.includes('更新培訓名稱')");page.once('dialog',lambda d:d.accept());page.locator('#resourceList button').filter(has_text='刪除').click();page.wait_for_function("document.querySelectorAll('#resourceList .admin-job').length===0");assert not db['trainings']
 # Client rejects bad registration ranges and unsafe links before sending.
 for data in [{**values,'registration_end':'2026-10-01','organizers':['中心']},{**values,'url':'javascript:alert(1)','organizers':['中心']}]:
  assert page.evaluate('(v)=>{try{ResourceClient.validate("trainings",v);return false}catch{return true}}',data)
 for target in ['/', '/training.html','/policies.html','/admin.html']:
  public.set_viewport_size({'width':390,'height':844});public.goto(BASE+target);assert public.evaluate('document.documentElement.scrollWidth<=innerWidth')
 c.route('**://test.supabase.co/rest/v1/trainings?*',lambda r:r.fulfill(status=404,content_type='application/json',body=json.dumps({'message':'training table not configured'})))
 public.goto(BASE+'/training.html');public.locator('#resourceError').wait_for(state='visible');assert 'training table not configured' in public.locator('#resourceError').inner_text();public.locator('#resourceSearch').fill('test');assert public.locator('.job-card').count()==0
 page.locator('#logout').click();assert not page.locator('#resourceManagement').is_visible()
 assert not errors,errors
 print('PASS: sharing + manual fallback; occupational filter; removed OCR; multi-organizer training CRUD/filter; three policy categories CRUD; safe text, dates/URLs, mobile and logout. API fixture only.')
 b.close()
