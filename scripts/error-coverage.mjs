import { readFileSync, writeFileSync } from 'node:fs'
import { errorCoverage, mergeCoverage, WRONG_BUCKETS } from '../src/lib/errorCoverage.js'
import { syntheticCoverageEntries } from '../src/lib/errorCoverageFixture.js'
import { buildPupilAnalysisDraft, validatePupilAnalysis } from '../src/lib/pupilAnalysis.js'

// Coverage of pupils' wrong answers (docs/STYRNING_FELFORSTAELSER.md, R-D).
//
//   node scripts/error-coverage.mjs --synthetic           print the synthetic report
//   node scripts/error-coverage.mjs --synthetic --write   update docs/coverage/synthetic.json
//   node scripts/error-coverage.mjs --evidence FILE       report on exported real answers
//
// FILE is a JSON array of { group, id, entries, hiddenSlips } read from the
// evidence API. Real answers stay outside the repo; never commit them or the
// report on them, and never point --write at them.
export const SNAPSHOT = 'docs/coverage/synthetic.json'
const argument = name => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? null : process.argv[i + 1] }
const percent = (part, whole) => whole ? `${Math.round(100 * part / whole)} %` : '–'

// The part of a summary that is compared in CI and stored per version.
export function syntheticSnapshot() {
  const s = errorCoverage({ entries: syntheticCoverageEntries().map(({ expectedModel: _m, expectedReason: _r, ...e }) => e) })
  return { noteSv: 'Täckning på syntetiskt underlag ur katalogens exempel. Uppdateras med --write när en ändring i felmodellerna är avsiktlig; diffen visar vad som ändrades.',
    total: s.total, statuses: s.statuses, wrong: s.wrong, areas: Object.fromEntries(Object.entries(s.areas).sort(([a], [b]) => a.localeCompare(b))),
    models: Object.fromEntries(Object.entries(s.models).sort(([a], [b]) => a.localeCompare(b))) }
}

// Wrong answers the current pupil report shows: cards (at most 8, at most 20
// answers each) and unexplained answers among the period's first 20.
function visibleInReport(entries) {
  const evidence = { entries, snapshotRevision: 'local', period: {}, source: 'all', coverage: {} }
  const report = validatePupilAnalysis(buildPupilAnalysisDraft(evidence), evidence)
  const shown = new Set([...report.hypotheses.flatMap(item => item.supportRefs), ...report.exampleRefs])
  return entries.filter(entry => entry.answer?.status === 'incorrect' && shown.has(entry.ref)).length
}

function print(label, s) {
  const w = s.wrong
  console.log(`\n== ${label}`)
  console.log(`Svar ${s.total}: rätt ${s.statuses.correct}, fel ${s.statuses.incorrect}, obesvarade ${s.statuses.unanswered} (med uträkning ${s.unansweredWithWork}), delvis ${s.statuses.partial}, övrigt ${s.statuses.other}.`)
  if (s.visibleInReport !== undefined) console.log(`Syns i elevrapporten: ${s.visibleInReport} av ${s.statuses.incorrect} fel (${percent(s.visibleInReport, s.statuses.incorrect)}).`)
  console.log(`Lärarbedömda ${s.teacherAssessed} (ändrad status ${s.teacherChangedStatus}). Dolda som slarv ${s.hiddenSlips}.`)
  console.log(`Fel: ${WRONG_BUCKETS.map(b => `${b} ${w[b]} (${percent(w[b], w.incorrect)})`).join(', ')}.`)
  console.log(`Oförklarade: ingen modell ${w.unexplainedNoModel}, når aldrig modellerna ${w.unexplainedNotAnalysed} ${JSON.stringify(w.reasons)}. I snabbhetsträning ${w.speedTraining}.`)
  console.log('Område | fel | felförståelse | observation | inmatning | oförklarat')
  for (const [area, a] of Object.entries(s.areas).sort((x, y) => y[1].incorrect - x[1].incorrect)) {
    console.log(`${area} | ${a.incorrect} | ${a.misconception} | ${a.observation} | ${a.input} | ${a.unexplained} (${percent(a.unexplained, a.incorrect)})`)
  }
  console.log('Vanligaste oförklarade svar:')
  for (const row of s.unexplained.slice(0, 15)) console.log(`  ${row.count}× ${row.question} → ${row.answer} (facit ${row.correctAnswer}) [${row.area}]${row.pupils ? `, ${row.pupils} elever` : ''}`)
}

if (process.argv[1]?.endsWith('error-coverage.mjs')) {
  if (process.argv.includes('--synthetic')) {
    const snapshot = syntheticSnapshot()
    if (process.argv.includes('--write')) {
      writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`)
      console.log(`Skrev ${SNAPSHOT}`)
    } else print('Syntetiskt underlag', errorCoverage({ entries: syntheticCoverageEntries() }))
  } else if (argument('evidence')) {
    const pupils = JSON.parse(readFileSync(argument('evidence'), 'utf8'))
    const groups = new Map()
    for (const pupil of pupils) {
      const summary = { ...errorCoverage({ entries: pupil.entries, hiddenSlips: pupil.hiddenSlips ?? [] }), visibleInReport: visibleInReport(pupil.entries) }
      const group = pupil.group ?? pupil.classId ?? 'okänd grupp'
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(summary)
    }
    const merge = summaries => ({ ...mergeCoverage(summaries), visibleInReport: summaries.reduce((sum, s) => sum + s.visibleInReport, 0) })
    for (const [group, summaries] of groups) print(`${group}: ${summaries.length} elever`, merge(summaries))
    print(`Totalt: ${pupils.length} elever`, merge([...groups.values()].flat()))
  } else {
    console.error('Ange --synthetic eller --evidence FILE.')
    process.exitCode = 2
  }
}
