// Source and chance risk per error model (docs/STYRNING_FELFORSTAELSER.md, section 6).
//   node scripts/model-profile.mjs           print the table
//   node scripts/model-profile.mjs --write   update docs/coverage/model-profile.md
import { writeFileSync } from 'node:fs'
import { ERROR_MODELS } from '../src/domains/predictableErrors/catalog.js'
import { CHANCE_NOT_COMPUTED, modelChance, modelSource } from '../src/domains/predictableErrors/modelProfile.js'

const KIND = { misconception: 'felförståelse', observation: 'observation', input: 'inmatning', gave_up: 'ger upp' }
const SOURCE = { source: 'Källa', simon_observation: 'Simons iakttagelse', description: 'Beskrivning' }
export const PROFILE_PATH = new URL('../docs/coverage/model-profile.md', import.meta.url)

export function profileTable() {
  const chance = modelChance()
  const esc = text => String(text).replace(/\|/g, '/')
  const rows = Object.entries(ERROR_MODELS).map(([id, model]) => {
    const c = chance[id], source = modelSource(id)
    return `| ${esc(model.titleSv)} | ${KIND[model.kind]} | ${c ? c.answersPerTask : '–'} | ${c ? c.tasks : CHANCE_NOT_COMPUTED[id] ?? '–'} | ${model.minDistinctTasks ? `${model.minDistinctTasks} uppgifter` : model.needsRepetition ? 'upprepning' : ''} | ${SOURCE[source.kind]}: ${esc(source.textSv)} |`
  })
  return ['# Felmodellernas källa och slumprisk', '',
    'Genereras med `node scripts/model-profile.mjs --write`; testet i `modelProfile.test.js` kräver att den stämmer.',
    'Slumprisk = hur många olika svar modellen förutsäger per uppgift, mätt på bankens uppgifter, NCM-frågorna med struktur och katalogens exempel.',
    'En felförståelse med fler än två svar per uppgift visas bara som mönster (Simons beslut 3, 2026-11-12).', '',
    '| Modell | Slag | Svar per uppgift | Uppgifter | Krav | Källa |', '| --- | --- | ---: | ---: | --- | --- |', ...rows, ''].join('\n')
}

if (process.argv[1]?.endsWith('model-profile.mjs')) {
  const table = profileTable()
  if (process.argv.includes('--write')) { writeFileSync(PROFILE_PATH, table); console.log('Skrev docs/coverage/model-profile.md') }
  else console.log(table)
}
