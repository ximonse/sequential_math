import { readFile } from 'node:fs/promises'
import { defaultPlanPath } from './project-map-server.mjs'
import { loadPlan, savePlan, deriveEdges } from './project-map-store.mjs'

// Read revision first, then submit the complete edited plan with that revision.
const [file, revision] = process.argv.slice(2)
if (!file || !revision) throw Error('Usage: node scripts/update-project-map.mjs edited-plan.json expected-sha256-revision')
const plan = JSON.parse(await readFile(file, 'utf8'))
plan.edges = deriveEdges(plan.cards)
await loadPlan(defaultPlanPath)
const result = await savePlan(defaultPlanPath, plan, revision)
console.log(`Saved revision ${result.revision}`)
