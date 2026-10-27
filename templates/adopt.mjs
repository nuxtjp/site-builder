import { cpSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadSiteDocuments } from '../documents/index.mjs'
import { validateContent } from './service-site/check.mjs'

// Current document input only. Owner customizations are never overwritten.
export async function adopt(directory, sourceDirectory) {
  const source = resolve(sourceDirectory)
  const receipt = validateContent(await loadSiteDocuments(pathToFileURL(source + '/')))
  const target = resolve(directory)
  if (existsSync(target)) throw Error('Choose a new scaffold directory; existing site files are owner-managed')
  mkdirSync(target)
  cpSync(new URL('./service-site/', import.meta.url), target, { recursive: true, errorOnExist: true })
  copyFileSync(join(source, 'site.json'), join(target, 'site.json'))
  cpSync(join(source, 'documents'), join(target, 'documents'), { recursive: true, errorOnExist: true })
  for (const name of ['LICENSE', 'NOTICE']) copyFileSync(new URL('../' + name, import.meta.url), join(target, name))
  return receipt
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw Error('Usage: node templates/adopt.mjs NEW_DIRECTORY REVIEWED_DOCUMENT_DIRECTORY')
  console.log(JSON.stringify(await adopt(process.argv[2], process.argv[3])))
}
