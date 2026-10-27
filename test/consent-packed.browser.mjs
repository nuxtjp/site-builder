import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const base=process.argv[3]
const browser=await chromium.launch()
try {
 const context=await browser.newContext()
 const external=[]
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin){external.push(u.origin);await route.abort()}else await route.continue()})
 const page=await context.newPage()
 for(const [path,label,title]of[['/','プライバシー設定','追加サービスの登録はありません'],['/en','Privacy settings','No additional services configured']]) {
  await page.goto(base+path,{waitUntil:'networkidle'})
  assert.equal(await page.evaluate(()=>localStorage.getItem('nuxtjp_consent')),null)
  await page.getByRole('button',{name:label,exact:true}).click()
  await page.getByText(title,{exact:true}).waitFor()
  assert.equal(await page.getByRole('link',{name:path==='/'?'共通プライバシーポリシー':'Privacy policy'}).first().getAttribute('href'),'https://hat-tech.co.jp/privacy')
 }
 assert.deepEqual(external,[])
 console.log('Packed consumer: bilingual settings, common policy, no optional storage/network before choice passed.')
}finally{await browser.close()}
