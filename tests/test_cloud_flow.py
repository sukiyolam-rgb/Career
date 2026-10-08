from playwright.sync_api import sync_playwright
import json,pathlib,os
# Run with a local HTTP server; requires Python Playwright and Chromium.
BASE=os.environ.get('CAREER_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 # Explicit contract fixture: this is not a live Supabase project or RLS verification.
 db=[];calls=[]
 def route(r):
  path=r.request.url.split('supabase.co')[1];method=r.request.method;calls.append((method,path))
  data=r.request.post_data_json if r.request.post_data else None
  status=200;response=[]
  if path.startswith('/auth/v1/token'):
   if data['password']=='wrong':status=400;response={'msg':'Invalid login credentials'}
   else:response={'access_token':('nonstaff' if data['email'].startswith('other') else 'staff'), 'expires_in':3600}
  elif path.startswith('/auth/v1/logout'):response={}
  elif path=='/rest/v1/rpc/is_staff':response=r.request.headers.get('authorization')=='Bearer staff'
  elif path=='/rest/v1/rpc/replace_jobs':db[:]=data['items'];response=None
  elif path.startswith('/rest/v1/jobs'):
   if method=='GET':response=db[:] if 'offset=0&' in path else []
   elif r.request.headers.get('authorization')!='Bearer staff':status=403;response={'message':'denied'}
   elif method=='POST':db.append(data);response=[data]
   elif method=='PATCH':
    id=path.split('eq.')[1];response=[]
    for job in db:
     if job['id']==id:job.update(data);response=[job]
   elif method=='DELETE':
    id=path.split('eq.')[1];response=[j for j in db if j['id']==id];db[:]=[j for j in db if j['id']!=id]
  r.fulfill(status=status,content_type='application/json',body=json.dumps(response))
 def new_context():
  c=b.new_context();c.route('**://test.supabase.co/**',route)
  c.add_init_script("window.CAREER_CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_test'}")
  c.route('**/assets/config.js*',lambda r:r.fulfill(content_type='application/javascript',body="window.CAREER_CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_test'}"))
  return c
 c=new_context();page=c.new_page();page.goto(BASE+'/admin.html');assert not page.locator('#adminPanel').is_visible()
 def login(email,password):page.locator('#email').fill(email);page.locator('#password').fill(password);page.locator('#loginForm button').click()
 login('staff@example.com','wrong');page.wait_for_function("document.querySelector('#loginError').textContent.includes('登入失敗')");assert not page.locator('#adminPanel').is_visible()
 login('other@example.com','ok');page.wait_for_function("document.querySelector('#loginError').textContent.includes('未獲授權')");assert not page.locator('#adminPanel').is_visible()
 login('staff@example.com','ok');page.locator('#adminPanel').wait_for(state='visible')
 job={'title':'行政助理','company':'青年服務','location':'氹仔','salary':'MOP 15000','education':'學士','published':'2026-10-09','deadline':'','url':'https://example.com/jobs/1'}
 for field,v in job.items():page.locator(f'[name={field}]').fill(v)
 page.locator('#jobForm button[type=submit]').click();page.wait_for_function("document.querySelectorAll('.admin-job').length===1")
 assert db[0]['location']=='氹仔' and db[0]['deadline'] is None
 # A completely separate browser storage context reads the same server fixture.
 other=new_context();pub=other.new_page();pub.goto(BASE+'/');pub.locator('.job-card').wait_for();assert '氹仔' in pub.locator('.job-card').inner_text();assert '不設截止' in pub.locator('.job-card').inner_text()
 assert pub.evaluate('localStorage.length')==0
 pub.locator('#search').fill('氹仔');assert pub.locator('.job-card').count()==1
 page.get_by_role('button',name='編輯',exact=True).click();page.locator('[name=location]').fill('路氹城');page.locator('#jobForm button[type=submit]').click();page.wait_for_function("document.querySelector('.admin-job').textContent.includes('路氹城')")
 pub.locator('#clearFilters').click();pub.locator('#refreshJobs').click();pub.wait_for_function("document.querySelector('.job-card').textContent.includes('路氹城')")
 assert page.evaluate("parseRecruitmentText('工作地點：澳門半島').location")=='澳門半島'
 with page.expect_download() as dl:page.locator('#exportData').click()
 backup='/tmp/career-cloud-backup.json';dl.value.save_as(backup);assert json.loads(pathlib.Path(backup).read_text())['jobs'][0]['location']=='路氹城'
 page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='刪除',exact=True).click();page.wait_for_function("document.querySelectorAll('.admin-job').length===0");assert not db
 page.once('dialog',lambda d:d.accept());page.locator('#importData').set_input_files(backup);page.wait_for_function("document.querySelectorAll('.admin-job').length===1");assert len(db)==1
 page.locator('#logout').click();assert not page.locator('#adminPanel').is_visible();page.reload();assert not page.locator('#adminPanel').is_visible()
 pub.set_viewport_size({'width':390,'height':844});assert pub.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Missing project shows a truthful setup error and cannot fall back to browser-local jobs.
 unconfigured=b.new_page();unconfigured.route('**/assets/config.js*',lambda r:r.fulfill(content_type='application/javascript',body="window.CAREER_CONFIG={supabaseUrl:'',supabaseKey:''}"));unconfigured.goto(BASE+'/');unconfigured.wait_for_function("document.querySelector('#emptyState').textContent.includes('尚未連接')");unconfigured.locator('#search').fill('abc');assert '尚未連接' in unconfigured.locator('#emptyState').inner_text()
 # Explicit network failure preserves a visible error rather than claiming a successful update.
 other.unroute('**://test.supabase.co/**');other.route('**://test.supabase.co/**',lambda r:r.fulfill(status=503,content_type='application/json',body='{"message":"unavailable"}'))
 pub.locator('#refreshJobs').click();pub.wait_for_function("document.querySelector('#emptyState').textContent.includes('unavailable')")
 assert not pub.locator('.job-card').count()
 print('PASS (Supabase API contract fixture): login/unauthorized staff gate; cloud CRUD; separate-context read; location filtering + OCR; backup restore; logout; network/setup failure; mobile layout. NOT a live cloud/RLS test.')
 b.close()
