import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
try {
 const context=await browser.newContext();const external=[]
 await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort()}return route.continue()})
 const page=await context.newPage();page.setDefaultTimeout(10000)
 await page.goto('http://127.0.0.1:3420/',{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'Privacy settings',exact:true}).waitFor()
 await page.getByRole('link',{name:'日本語',exact:true}).click()
 await page.getByRole('button',{name:'プライバシー設定',exact:true}).waitFor()
 await page.getByRole('link',{name:'English',exact:true}).click()
 await page.getByRole('button',{name:'Privacy settings',exact:true}).waitFor()
 await page.getByRole('link',{name:'Default',exact:true}).click()
 await page.getByRole('button',{name:'Privacy settings',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>localStorage.getItem('nuxtjp_consent')),null)
 assert.deepEqual(external,[])
 console.log('Passed English default, explicit Japanese/English and return to default through client navigation; no optional storage or external requests.')
}finally{await browser.close()}
