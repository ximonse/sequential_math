import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { validatePlan } from './project-map-store.mjs'

const mapPath = 'docs/screening-map/plan.json'
const root = fileURLToPath(new URL('../', import.meta.url))
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const staged = process.argv.includes('--staged')
const baseIndex = process.argv.indexOf('--base')
const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : null
if (baseIndex >= 0 && (!base || !/^[a-zA-Z0-9._/-]+$/.test(base))) throw Error('Expected --base git-ref')
const content = staged ? git(['show', `:${mapPath}`]) : await readFile(new URL(`../${mapPath}`, import.meta.url), 'utf8')
const plan = validatePlan(JSON.parse(content))
if (staged || base) {
  const args = ['diff', '--name-only', '-z', ...(staged ? ['--cached'] : [base, 'HEAD']), '--']
  const paths = git(args).split('\0').filter(Boolean)
  const code = paths.filter(path => /^(src|api|robots)\/.+\.(js|jsx|ts|tsx|mjs|cjs|css)$/.test(path)
    || /^scripts\/(project-map|update-project-map)/.test(path)
    || path === 'docs/screening-map/editor.js' || path === 'docs/screening-map/preview.template.html')
  if (code.length && !paths.includes(mapPath)) {
    console.error(`Projektkartan saknar uppdatering för:\n${code.join('\n')}\nUppdatera relevant kort (eller lägg till ett område) och inkludera ${mapPath} i samma ändring.`)
    process.exit(1)
  }
}
console.log(`Project map OK: ${plan.cards.length} cards, valid relations and task checkboxes${staged || base ? ', change coverage checked' : ''}.`)
