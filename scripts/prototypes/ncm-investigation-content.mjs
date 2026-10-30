// Own examples for an offline design experiment, not a new pupil question bank.
import { tasks } from './ncm-screening-pilot.mjs'

const subtract = (id, phase, a, b, context = 'calculation') => ({ id, phase,
  prompt: context === 'transfer' ? `Du har ${a} kr och betalar ${b} kr. Hur mycket har du kvar?` : `${a} − ${b}`,
  operands: [a, b], answer: a - b, context, discriminates: ['column_difference', 'unreduced_tens'] })
const fraction = (id, phase, left, right, discriminates, context = 'calculation') => ({ id, phase,
  prompt: context === 'transfer'
    ? `Två lika stora flaskor är fyllda till ${left.join('/')} respektive ${right.join('/')}. Vilken innehåller mest?`
    : `Vilket är störst: ${left.join('/')} eller ${right.join('/')}?`,
  fractions: [left, right], context, discriminates,
  answer: left[0] * right[1] > right[0] * left[1] ? 'left' : 'right' })

export const investigationProfiles = {
  through_zero: {
    coverageIds: ['M02'], diagnosticReference: 'AS2', prerequisiteReference: 'AG3',
    hypothesisIds: ['zero_donor_not_decremented', 'zero_intermediate_ten'],
    goalSv: 'Bevara talvärdet genom hela växlingen från hundratal via tiotal till ental.',
    instructionSv: 'Knyt 402 = 300 + 100 + 2 = 300 + 90 + 12 till uppställningen. Eleven förklarar var tiotal och ental kommer ifrån.',
    tasks: [
      ...tasks.filter(t => ['baseline', 'through_zero', 'prerequisite'].includes(t.role)).map(t => ({ ...t,
        phase: 'investigate', context: 'calculation', discriminates: t.role === 'through_zero'
          ? ['zero_donor_not_decremented', 'zero_intermediate_ten'] : [] })),
      subtract('check-zero-a', 'independent', 804, 376), subtract('check-zero-b', 'independent', 906, 458),
      subtract('later-zero-a', 'followup', 702, 385), subtract('later-zero-transfer', 'followup', 602, 275, 'transfer'),
    ].map(t => t.phase === 'investigate' ? t : { ...t, discriminates: ['zero_donor_not_decremented', 'zero_intermediate_ten'] }),
  },
  single_exchange: {
    coverageIds: ['M02', 'N2'], diagnosticReference: 'AS2', prerequisiteReference: 'AG3',
    hypothesisIds: ['column_difference', 'unreduced_tens'],
    goalSv: 'Omgruppera ett tiotal till tio ental med oförändrat talvärde och förklara båda positionernas förändring.',
    instructionSv: 'Knyt 32 = 30 + 2 = 20 + 12 till 32 − 17 = 15. Låt eleven förklara och minska stödet successivt.',
    tasks: [
      ...tasks.filter(t => ['baseline', 'single_exchange', 'prerequisite'].includes(t.role)).map(t => ({
        ...t, phase: 'investigate', context: 'calculation', discriminates: t.role === 'single_exchange'
          ? ['column_difference', 'unreduced_tens'] : [] })),
      subtract('check-sub-a', 'independent', 831, 416), subtract('check-sub-b', 'independent', 972, 548),
      subtract('later-sub-a', 'followup', 752, 436), subtract('later-sub-transfer', 'followup', 83, 46, 'transfer'),
    ],
  },
  fraction_comparison: {
    // RB4 is an area anchor. No dedicated NCM code is asserted for missing-parts counting.
    coverageIds: ['M14'], diagnosticReference: 'RB4', prerequisiteReference: 'RB2',
    hypothesisIds: ['missing_parts_count'],
    goalSv: 'Jämföra bråk av samma helhet utifrån delarnas storlek, inte bara antalet delar som saknas.',
    instructionSv: 'Jämför 3/4 och 7/9 av samma helhet: 27/36 och 28/36. Förklara varför en saknad fjärdedel är mer än två saknade niondelar.',
    tasks: [
      fraction('fraction-baseline', 'investigate', [4, 7], [4, 9], ['larger_denominator']),
      fraction('fraction-gap-a', 'investigate', [3, 4], [7, 9], ['missing_parts_count']),
      fraction('fraction-gap-b', 'investigate', [9, 11], [4, 5], ['missing_parts_count']),
      fraction('check-fraction-a', 'independent', [5, 6], [11, 13], ['missing_parts_count']),
      fraction('check-fraction-b', 'independent', [13, 15], [6, 7], ['missing_parts_count']),
      fraction('later-fraction-a', 'followup', [8, 9], [17, 19], ['missing_parts_count']),
      fraction('later-fraction-transfer', 'followup', [19, 21], [9, 10], ['missing_parts_count'], 'transfer'),
    ],
  },
}

export function getInvestigationProfile(scope) {
  const profile = investigationProfiles[scope]
  if (!profile) throw Error('Unsupported investigation scope')
  return profile
}

export function evaluateInvestigationAnswer(task, answer) {
  if (task.fractions) return ['left', 'right'].includes(answer) ? answer === task.answer : null
  const numeric = typeof answer === 'number' ? answer
    : typeof answer === 'string' && /^-?\d+(?:[.,]\d+)?$/.test(answer.trim())
      ? Number(answer.trim().replace(',', '.')) : NaN
  return Number.isFinite(numeric) ? numeric === task.answer : null
}
