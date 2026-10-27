import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
const root=new URL('../',import.meta.url)
for(const {empty,defaultLocale} of process.argv.includes('--default-locale-only') ? [{empty:'1',defaultLocale:'en'}] : [{empty:'0',defaultLocale:'ja'},{empty:'1',defaultLocale:'ja'},{empty:'1',defaultLocale:'en'}]) {
 const env={...process.env,CONSENT_FIXTURE_EMPTY:empty,CONSENT_FIXTURE_DEFAULT_LOCALE:defaultLocale,NUXT_TELEMETRY_DISABLED:'1'}
 let output='',exit
 const server=spawn(process.execPath,['node_modules/nuxt/bin/nuxt.mjs','dev','test/fixtures/consent','--host','127.0.0.1','--port','3420'],{cwd:root,env,stdio:['ignore','pipe','pipe']})
 const stopped=new Promise(resolve=>server.once('exit',code=>{exit=code;resolve()}))
 server.on('error',e=>{output+=e.message;exit=1})
 for(const stream of [server.stdout,server.stderr])stream.on('data',v=>{output=(output+v).slice(-6000)})
 try {
  let ready=false
  for(let i=0;i<120;i++) {
   if(exit!==undefined)throw Error('Consent fixture stopped: '+output)
   try {const r=await fetch('http://127.0.0.1:3420/',{signal:AbortSignal.timeout(1000)});if(r.ok&&output.includes('3420')){ready=true;break}}catch{}
   await delay(500)
  }
  if(!ready)throw Error('Consent fixture did not start: '+output)
  const test=spawn(process.execPath,[defaultLocale==='en'?'test/consent-default-locale.browser.mjs':'test/consent.browser.mjs'],{cwd:root,env,stdio:'inherit'})
  const code=await new Promise((resolve,reject)=>{test.once('error',reject);test.once('exit',resolve)})
  if(code!==0)throw Error('Consent browser test failed')
 } finally {
  server.kill('SIGTERM')
  await Promise.race([stopped,delay(3000)])
  if(exit===undefined){server.kill('SIGKILL');await stopped}
 }
}
