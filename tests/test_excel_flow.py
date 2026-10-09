"""Real XLSX parser + browser/API contract checks; not a live Supabase test."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os, tempfile
BASE=os.environ.get('CAREER_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='career-excel-') as tmp:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(accept_downloads=True);db=[];batches=[];fail_next=[False]
 def api(route):
  req=route.request;path=req.url.split('supabase.co')[1];data=req.post_data_json if req.post_data else None
  if path.startswith('/auth/v1/token'):result={'access_token':'staff','expires_in':3600}
  elif path=='/rest/v1/rpc/is_staff':result=True
  elif path.startswith('/auth/v1/logout'):result={}
  elif path.startswith('/rest/v1/jobs') and req.method=='GET':result=db[:] if 'offset=0&' in path else []
  elif path.startswith('/rest/v1/jobs') and req.method=='POST':
   assert req.headers.get('authorization')=='Bearer staff'
   assert isinstance(data,list),'Expected one bulk INSERT, not sequential writes'
   batches.append(data)
   if fail_next[0]:fail_next[0]=False;route.fulfill(status=400,content_type='application/json',body='{"message":"constraint failure"}');return
   db.extend(data);result=data
  else:raise AssertionError((req.method,path))
  route.fulfill(content_type='application/json',body=json.dumps(result))
 context.route('**://test.supabase.co/**',api)
 context.route('**/assets/config.js*',lambda r:r.fulfill(content_type='application/javascript',body="window.CAREER_CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_test'}"))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/admin.html');page.locator('#email').fill('staff@example.com');page.locator('#password').fill('test');page.locator('#loginForm button').click();page.locator('#adminPanel').wait_for(state='visible')
 with page.expect_download() as d:page.locator('#downloadExcelTemplate').click()
 template=Path(tmp)/'template.xlsx';d.value.save_as(template);assert template.read_bytes().startswith(b'PK')
 # A pristine template is blank and cannot accidentally insert its separate example guide.
 page.locator('#importExcel').set_input_files(str(template));page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('沒有崗位資料')");assert page.locator('#confirmExcelImport').is_disabled();assert not db
 def workbook(name,rows,missing=False):
  raw=page.evaluate('''async ({rows,missing})=>{await CareerExcel.load();const w=new ExcelJS.Workbook();const s=w.addWorksheet('崗位資訊');s.addRow(CareerExcel.columns.map(c=>c[1]));if(missing)s.getCell('J1').value='錯誤欄名';for(const row of rows){const r=s.addRow(row);if(r.getCell(8).value==='EXCEL_DATE'){r.getCell(8).value=new Date('2026-10-09T00:00:00Z');r.getCell(8).numFmt='yyyy-mm-dd';}if(r.getCell(6).value==='FORMULA')r.getCell(6).value={formula:'1+1',result:2};}return Array.from(new Uint8Array(await w.xlsx.writeBuffer()));}''',{'rows':rows,'missing':missing})
  path=Path(tmp)/name;path.write_bytes(bytes(raw));return str(path)
 row=['行政助理','青年服務','氹仔','社會服務','全職','MOP 15000','學士','EXCEL_DATE','','https://example.com/1']
 row2=['活動助理','青年中心','澳門半島','社會服務','兼職','MOP 8000','中學','2026/10/09','2026-10-31','https://example.com/2']
 # Duplicate within the workbook is skipped. Existing database data is untouched until confirm.
 valid=workbook('valid.xlsx',[row,row2,row2,[]])
 page.locator('#importExcel').set_input_files(valid);page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('檢查完成')")
 assert '待新增 2 筆' in page.locator('#excelSummary').inner_text();assert '略過 1 筆' in page.locator('#excelSummary').inner_text();assert not db
 page.once('dialog',lambda d:d.dismiss());page.locator('#confirmExcelImport').click();page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('已取消確認')");assert not db
 page.once('dialog',lambda d:d.accept());page.locator('#confirmExcelImport').click();page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('成功新增 2')")
 assert len(db)==2 and len(batches)==1 and len(batches[0])==2
 assert db[0]['published']=='2026-10-09' and db[0]['deadline'] is None
 assert page.locator('.admin-job').count()==2
 page.locator('#importExcel').set_input_files(valid);page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('所有資料都已存在')");assert page.locator('#confirmExcelImport').is_disabled();assert len(batches)==1
 # A valid row plus an invalid row blocks the ENTIRE batch (no partial success).
 invalid=row2[:];invalid[0]='新活動助理';invalid[9]='javascript:alert(1)'
 bad=workbook('invalid.xlsx',[row,invalid])
 page.locator('#importExcel').set_input_files(bad);page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('有資料錯誤')");assert '第 3 行' in page.locator('#excelErrors').inner_text();assert page.locator('#confirmExcelImport').is_disabled();assert len(db)==2
 formula=row2[:];formula[5]='FORMULA'
 page.locator('#importExcel').set_input_files(workbook('formula.xlsx',[formula]));page.wait_for_function("document.querySelector('#excelErrors').textContent.includes('不支援公式')");assert page.locator('#confirmExcelImport').is_disabled()
 invalid_date=row2[:];invalid_date[7]='2026-02-30'
 page.locator('#importExcel').set_input_files(workbook('date.xlsx',[invalid_date]));page.wait_for_function("document.querySelector('#excelErrors').textContent.includes('有效日期')");assert len(db)==2
 page.locator('#importExcel').set_input_files(workbook('header.xlsx',[row],True));page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('缺少')");assert len(db)==2
 corrupt=Path(tmp)/'corrupt.xlsx';corrupt.write_text('not an XLSX');page.locator('#importExcel').set_input_files(str(corrupt));page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('不是可讀取')")
 # Server rejection must not claim success, retry blindly or discard existing jobs.
 new=row2[:];new[0]='新招聘';new[9]='https://example.com/3';fail_next[0]=True
 page.locator('#importExcel').set_input_files(workbook('server-failure.xlsx',[new]));page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('檢查完成')");page.once('dialog',lambda d:d.accept());page.locator('#confirmExcelImport').click();page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('constraint failure')");assert len(db)==2;assert page.locator('#confirmExcelImport').is_disabled()
 page.locator('#importExcel').set_input_files(valid);page.wait_for_function("document.querySelector('#excelStatus').textContent.includes('所有資料都已存在')")
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#logout').click();assert not page.locator('#excelPreview').is_visible()
 assert not errors,errors
 print('PASS: real XLSX template/download/parser; Excel/string dates; blank deadline; duplicate skipping; preview/cancel; single bulk request; bad rows/headers/formulas/dates/files; server failure; mobile and logout. API fixture only.')
 browser.close()
