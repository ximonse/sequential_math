// Read-only audit over the existing complete NCM inventory; not a rival runtime catalogue.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const hash = text => createHash('sha256').update(text).digest('hex')
const classes = {
  candidate: ['place_value_error', 'operation_swap', 'digit_reversal', 'carry_forget', 'carry_double',
    'ones_digit_only', 'smaller_minus_larger', 'borrow_forget', 'table_off_by_one', 'ones_digits_only',
    'quotient_off_by_one', 'reversed_operands', 'divisor_as_answer', 'dividend_as_answer',
    'forgot_coefficient', 'added_instead_of_multiplied', 'square_as_double'],
  heuristic: ['forgot_constant', 'combined_unlike_terms'],
  property: ['not_simplified', 'did_not_simplify', 'wrong_denominator'],
  input: ['invalid_input', 'no_answer'],
  generic: ['calculation_error', 'wrong_answer', 'wrong_percentage', 'wrong_order_of_operations',
    'simplify_error', 'number_bond_not_recalled', 'double_not_recalled'],
}
const domains = [
  { id: 'arithmetic', state: 'partial-models', nextSv: 'Återanvänd kandidatberäkningar; pröva tillämpningsområde, skalningstolerans, minnessiffrors position och överlapp.',
    limitsSv: 'Första träff väljs i befintlig analys. borrowCount/carryCount kan saknas; platsvärdets kvottolerans är för bred för kausal tolkning.' },
  { id: 'fractions', state: 'property-checks-only', nextSv: 'Bygg särskiljande modeller för bråkkomponenter, storleksjämförelse och likvärdighet mot G4/B1/B7 och RB-områdena.',
    limitsSv: 'wrong_denominator är nämnaravvikelse, inte belägg för en specifik bråkuppfattning. Offlinejämförelsen är ännu separat.' },
  { id: 'percentage', state: 'generic-label-only', nextSv: 'Specificera modellberäkningar för andel/helhet, procentenheter och successiva ändringar enligt B4–B6; pröva strukturerade uppgifter.',
    limitsSv: 'Alla fel får wrong_percentage. Etiketten skiljer inga strategier åt.' },
  { id: 'algebra', state: 'partial-models-and-heuristics', nextSv: 'Bind koefficient-/kvadratmodeller till faktisk uttrycksstruktur och pröva förenklingshypoteser mot exakta feluttryck.',
    limitsSv: 'Koefficient 2/3 gissas delvis från nivå; konstant-/olikatermsregler bygger på svarstextens form. Kräver snävare tillämpning.' },
  { id: 'arithmetic_expressions', state: 'generic-label-only', nextSv: 'Beräkna särskilda felutvärderingar, exempelvis vänster-till-höger, utifrån uttrycksstrukturen; skilj från enstaka beräkningsfel.',
    limitsSv: 'Alla numeriska fel kallas wrong_order_of_operations utan att en felprioritering räknas fram.' },
  { id: 'number_fluency', state: 'generic-label-only', nextSv: 'Separera fel på talpar/dubbla från eventuella förutsägbara svar; behåll osäker metod när en felmodell saknas.',
    limitsSv: 'Fel svar visar inte att eleven saknar återkallning. Dessa signaler saknar ännu verifierad NCM-kodkoppling.' },
]

export function auditRuleReadiness(root = process.cwd()) {
  const read = path => readFileSync(resolve(root, path), 'utf8')
  const sourcePath = 'docs/NCM_DIDACTIC_COVERAGE.json', coverageText = read(sourcePath), coverage = JSON.parse(coverageText)
  if (hash(read(coverage.source.path)) !== coverage.source.sha256) throw Error('NCM reference changed: audit and reconcile before continuing')
  const files = new Map()
  const signals = coverage.codeSignals.map(entry => {
    const text = files.get(entry.file) ?? read(entry.file); files.set(entry.file, text)
    if (!text.includes(`'${entry.signal}'`)) throw Error('Inventoried signal missing from source: ' + entry.signal)
    const kind = Object.keys(classes).find(key => classes[key].includes(entry.signal))
    if (!kind) throw Error('Unclassified signal: ' + entry.signal)
    return { file: entry.file, signal: entry.signal, kind, sourceSha256: hash(text),
      readiness: kind === 'candidate' ? 'needs-scope-and-precision-tests' : 'not-a-specific-method-detector' }
  })
  const groups = ['sections', 'mappings', 'gaps', 'concepts', 'nuances', 'ag6StrategySteps', 'unmappedSignals', 'outsideEngine', 'catalogueCodes', 'additionalCodeGaps']
  const inventory = Object.fromEntries(groups.map(group => [group, coverage[group].map((entry, index) => ({
    ref: `${sourcePath}#/${group}/${index}`, id: entry.id ?? entry.code ?? entry.family ?? entry.heading ?? entry.signals.join('+'),
    status: group === 'mappings' && entry.id === 'M02' ? 'offline-candidates-and-routing; production-unchanged'
      : entry.status ?? 'retained-needs-separate-rule-review',
  }))]))
  return { schemaVersion: 1, kind: 'rule-readiness-audit-not-runtime-catalogue', date: '2026-10-30',
    source: { path: sourcePath, sha256: hash(coverageText), ncmReference: coverage.source },
    interpretation: 'A label or candidate is not a confirmed pupil method. No new source validation or app integration is asserted.',
    domains: domains.map(domain => ({ ...domain, signals: signals.filter(s => s.file.startsWith(`src/domains/${domain.id}/`)) })),
    inventory, offlineAdditions: ['zero_donor_not_decremented', 'zero_intermediate_ten'],
    untouchedProduction: true }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(auditRuleReadiness(), null, 2))
}
