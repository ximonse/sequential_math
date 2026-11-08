import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const repo = new URL('../../../src/domains/', import.meta.url)
const { fractionCandidates } = await import(new URL('predictableErrors/fractions.js', repo))
const dir = process.argv[2]
const tasks = { T01:'2/7 + 3/7',T02:'7/9 − 4/9',T03:'Förenkla: 12/18',T04:'15/5',T05:'1/2 + 1/4',T06:'2/3 + 1/6',T07:'3/4 − 1/2',T08:'5/6 − 1/3',T09:'1/3 + 1/4',T10:'2/5 + 1/3',T11:'3/4 − 1/3',T12:'4/5 − 1/3',T13:'2/3 × 6',T14:'5/6 × 12',T15:'1/2 × 2/3',T16:'3/4 × 2/9',T17:'1/3 + 1/4 + 5/12',T18:'1/2 + 2/3 − 1/4' }
const { pupils } = JSON.parse(readFileSync(dir + '/answers.json', 'utf8'))
const out = []
for (const p of pupils) {
  const perTask = {}, hits = {}, chances = {}
  let wrong = 0, unmatched = [], notApplicable = []
  for (const [t, text] of Object.entries(tasks)) {
    const r = fractionCandidates({ domain: 'fractions', values: { text } }, p.answers[t])
    perTask[t] = { status: r.status, matches: r.matches.map(m => m.modelId) }
    if (r.status === 'not_applicable') { notApplicable.push(t); continue }
    for (const pr of r.predictions) chances[pr.modelId] = (chances[pr.modelId] ?? 0) + 1
    if (r.status !== 'correct') wrong++
    if (r.status === 'matched') for (const m of r.matches) (hits[m.modelId] ??= []).push(t)
    if (r.status === 'unmatched' || r.status === 'uninterpretable') unmatched.push(t)
  }
  // Deterministic summary rule: hypothesis = model matched on >=2 tasks; weak = 1 task.
  const hypotheses = Object.entries(hits).filter(([, ts]) => ts.length >= 2).map(([m, ts]) => ({ model: m, tasks: ts, of: chances[m] }))
  const weak = Object.entries(hits).filter(([, ts]) => ts.length === 1).map(([m, ts]) => ({ model: m, tasks: ts, of: chances[m] }))
  const verdict = hypotheses.length ? 'hypotes' : weak.length ? 'svag_signal' : wrong ? 'fel_utan_förklaring' : 'inga_fel_i_tolkbara_uppgifter'
  out.push({ id: p.id, verdict, hypotheses, weak, wrongInterpretable: wrong, unmatched, notApplicable, perTask })
}
const json = JSON.stringify({ ruleEngine: 'predictable-errors fractions (src/domains/predictableErrors/fractions.js)', assessments: out }, null, 1)
writeFileSync(dir + '/assessment.rerun.json', json)
console.log('assessment sha256', createHash('sha256').update(json).digest('hex'))
for (const a of out) console.log(a.id, a.verdict.padEnd(30), 'H:', a.hypotheses.map(h => `${h.model}(${h.tasks.length}/${h.of})`).join(' ') || '-', '| svag:', a.weak.map(h => `${h.model}[${h.tasks}]`).join(' ') || '-', '| oförklarade fel:', a.unmatched.join(',') || '-')
console.log('Ej tolkbara uppgifter (alla elever):', out[0].notApplicable.join(','))
