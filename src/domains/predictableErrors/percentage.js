import { candidateResult, prediction, unavailable } from './core.js'

export function percentageCandidates(problem, answer) {
  const v = problem?.values ?? {}, predictions = []
  const bounded = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e6
  let correct
  if (['percent_of', 'discount', 'increase'].includes(v.kind) && bounded(v.base) && v.base > 0
    && bounded(v.percentage) && v.percentage <= 100) {
    const { base, percentage: p } = v, amount = base * p / 100
    correct = v.kind === 'percent_of' ? amount : v.kind === 'discount' ? base - amount : base + amount
    if (v.kind === 'percent_of') {
      predictions.push(prediction('percentage_number_as_amount', p, 'Procenttalet har använts som ett belopp utan hänsyn till helheten.'),
        prediction('percentage_missing_division_100', base * p, 'Svaret matchar multiplikation med procenttalet utan division med hundra.'))
      if (p > 0) predictions.push(prediction('percentage_divide_by_percent_number', base / p, 'Svaret matchar helheten dividerad med procenttalet.'))
    } else {
      predictions.push(prediction('percentage_change_amount_only', amount, 'Förändringsbeloppet kan ha lämnats i stället för det nya priset.'),
        prediction('percentage_number_as_amount', v.kind === 'discount' ? base - p : base + p, 'Procenttalet kan ha behandlats som ett fast belopp.'),
        prediction('percentage_change_reversed', v.kind === 'discount' ? base + amount : base - amount, 'Svaret matchar motsatt förändringsriktning.'))
    }
  } else if (v.kind === 'share' && bounded(v.part) && bounded(v.total) && v.total > 0 && v.part <= v.total) {
    correct = v.part / v.total * 100
    predictions.push(prediction('percentage_ratio_not_converted', v.part / v.total, 'Andelen kan ha lämnats utan omvandling till procent.'))
    if (v.part > 0) predictions.push(prediction('percentage_part_whole_reversed', v.total / v.part * 100, 'Svaret matchar omvänd relation mellan del och helhet.'))
  } else return unavailable('percentage', 'structured_percentage_context_required')
  return candidateResult({ domain: 'percentage', scope: v.kind, correct, answer, predictions,
    coverageIds: v.kind === 'share' ? ['M16', 'M17'] : v.kind === 'percent_of' ? ['M17'] : ['M18'] })
}
