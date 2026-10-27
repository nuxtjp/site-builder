import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
let checks=0
try {
 for(const scenario of process.env.CONSENT_FIXTURE_EMPTY === '1' ? ['empty'] : ['reject','accept-revoke','individual','stale','storage-blocked']) {
  console.log('Scenario:',scenario)
  const context=await browser.newContext()
  let scripts=0,pings=0
  await context.route('https://metrics.example/**',async route=>{
   const url=route.request().url()
   if(url.endsWith('/analytics.js')){scripts++;await route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:`document.cookie='metrics_id=fixture; path=/';window.metricsLoaded=true;setInterval(()=>fetch('https://metrics.example/ping',{credentials:'omit'}),100);`})}
   else {pings++;await route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}})}
  })
  if(scenario==='storage-blocked')await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('nuxtjp_consent'))throw new DOMException('Storage unavailable','SecurityError');return original.call(this,key,value)}})
  if(scenario==='stale')await context.addInitScript(()=>{if(!localStorage.getItem('nuxtjp_consent'))localStorage.setItem('nuxtjp_consent',JSON.stringify({revision:1,consentId:'old-fixture',categories:['necessary','analytics'],services:{necessary:[],analytics:['metrics']},consentTimestamp:new Date().toISOString(),lastConsentTimestamp:new Date().toISOString(),expirationTime:Date.now()+86400000}))})
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);await page.goto('http://127.0.0.1:3420/',{waitUntil:'networkidle'})
  const settings=page.getByRole('button',{name:'プライバシー設定',exact:true})
  await settings.waitFor();assert.equal(scripts,0);assert.equal(pings,0);checks++
  if(scenario==='storage-blocked') {
   await page.getByRole('status').filter({hasText:'設定を保存できないため'}).waitFor()
   assert.equal(await settings.isDisabled(),true);assert.equal(scripts,0);assert.equal(pings,0);checks++;await context.close();continue
  }
  if(scenario==='empty') {
   assert.equal(await page.locator('.show--consent').count(),0)
   assert.equal(await page.evaluate(()=>localStorage.getItem('nuxtjp_consent')),null)
   await settings.click();await page.getByText('追加サービスの登録はありません',{exact:true}).waitFor()
   assert.ok(await page.getByRole('link',{name:'共通プライバシーポリシー'}).count())
   checks++;await context.close();continue
  }
  const banner=page.getByRole('dialog',{name:'プライバシーの選択',exact:true})
  await banner.waitFor()
  if(scenario==='reject'||scenario==='stale') {
   await banner.getByRole('button',{name:'任意のサービスを拒否',exact:true}).click()
   await page.reload({waitUntil:'networkidle'});assert.equal(scripts,0);assert.equal(pings,0)
   assert.equal(await page.locator('.show--consent').count(),0);checks++
  } else {
   if(scenario==='individual') {
    await banner.getByRole('button',{name:'個別に設定',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'プライバシー設定',exact:true})
    await dialog.getByRole('button',{name:'アクセス解析',exact:true}).click()
    await dialog.getByRole('checkbox',{name:'Test metrics',exact:true}).check()
    await dialog.getByRole('button',{name:'選択を保存',exact:true}).click()
   } else await banner.getByRole('button',{name:'すべて許可',exact:true}).click()
   await page.waitForFunction(()=>window.metricsLoaded===true)
   assert.equal(scripts,1)
   await page.waitForFunction(()=>document.cookie.includes('metrics_id='));checks++
   await settings.click()
   const dialog=page.getByRole('dialog',{name:'プライバシー設定',exact:true})
   const navigation=page.waitForEvent('load')
   await dialog.getByRole('button',{name:'任意のサービスを拒否',exact:true}).click();await navigation
   await page.waitForLoadState('networkidle')
   assert.equal(scripts,1);assert.equal(await page.evaluate(()=>Boolean(window.metricsLoaded)),false)
   assert.equal((await context.cookies()).some(c=>c.name==='metrics_id'),false)
   const n=pings;await page.waitForTimeout(400);assert.equal(pings,n);checks++
  }
  await page.getByRole('link',{name:'English',exact:true}).click()
  await page.getByRole('button',{name:'Privacy settings',exact:true}).waitFor();checks++
  const stored=JSON.parse(await page.evaluate(()=>localStorage.getItem('nuxtjp_consent')))
  assert.equal(stored.categories.includes('analytics'),false)
  assert.ok(stored.expirationTime>Date.now());checks++
  await context.close()
 }
 console.log(`Passed ${checks} browser consent admission, rejection, persistence, revision, withdrawal and language checks; no real tracking.`)
} finally {await browser.close()}
