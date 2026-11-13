import ncmBank from './ncmScreeningTasks.v1.json' with { type: 'json' }
import { checkNcmAnswer } from './ncmAnswerCheck.js'

// Structure and wrong-answer keys for screening tasks (docs/STYRNING_FELFORSTAELSER.md,
// step 3, rule R-B). Kept outside the task banks: a task's frozen snapshot and the
// evidence revision stay unchanged, and the structure is applied when an answer
// is analysed, for old and new dispatches alike.
//
// A structure lets the error models compute the wrong answers (the computed key).
// A task without structure says why. Manual keys name wrong answers the models
// cannot compute, each pointing to a misconception or a reason from the fixed
// set in misconceptions.js. They are didactic content; Simon approved them on 2026-11-13.

const A = (type, a, b) => ({ domain: 'arithmetic', type, skill: type, values: { a, b } })
const T = (domain, type, values) => ({ domain, type, skill: type, values })

// NCM tasks, version 1. A word problem is given the calculation it asks for.
export const NCM_STRUCTURE = {
  'ncm-AG4-4a': A('addition', 84, 9), 'ncm-AG4-4b': A('subtraction', 63, 8), 'ncm-AS1-4': A('addition', 347, 288),
  'ncm-AS2-5': A('subtraction', 703, 256), 'ncm-AS3-6': A('subtraction', 525, 378), 'ncm-AS9-1': A('addition', 3.26, 8.37),
  'ncm-AS9-4': A('subtraction', 6.27, 5.84), 'ncm-AG6-3b': A('multiplication', 7, 8), 'ncm-AG8-2b': A('division', 56, 8),
  'ncm-AG7-1b': T('arithmetic_expressions', 'arithmetic_expressions', { text: '6 * 6 + 7' }), 'ncm-AG7-2b': A('multiplication', 7, 60),
  'ncm-AS4-4': A('multiplication', 8, 67), 'ncm-AS5-3': A('division', 176, 4), 'ncm-AS6-7': A('division', 405, 9),
  'ncm-RD2-2b': A('addition', 1.6, 0.8), 'ncm-RD2-6b': A('subtraction', 1, 0.75), 'ncm-RD3-2b': A('multiplication', 5, 0.25),
  'ncm-RD3-6a': A('division', 1, 0.5), 'ncm-RB3-4d': T('fractions', 'fractions', { text: '3/4 × 8' }),
  'ncm-RP3-5b': T('percentage', 'percentage', { kind: 'percent_of', base: 480, percentage: 25 }),
  'ncm-RP4-1': T('percentage', 'percentage', { kind: 'share', part: 1, total: 4 }),
  'ncm-RP4-4': T('percentage', 'percentage', { kind: 'share', part: 800, total: 2000 }),
  'ncm-TAt3-2b': A('subtraction', 59, 5),
}

// Why the remaining NCM tasks have no computed structure.
export const NCM_WITHOUT_STRUCTURE = {
  'ncm-AG4-1b': 'Saknad term (90 − ? = 50); ingen felmodell för saknade termer i subtraktion.',
  'ncm-AG8-3a': 'Svaret är kvot och rest.', 'ncm-RD1-1d': 'Omvandling bråk till decimaltal.', 'ncm-RD1-2b': 'Omvandling bråk till decimaltal.',
  'ncm-RD1-4c': 'Jämförelse av decimaltal.', 'ncm-RD1-3c': 'Ett tal mellan två decimaltal.', 'ncm-RB1-5a': 'Skriva bråk med siffror.',
  'ncm-RB2-2c': 'Skriva bråk med siffror.', 'ncm-RB3-6': 'Textuppgift i två steg.', 'ncm-RB4-3c': 'Jämförelse av bråk.',
  'ncm-RB4-5c': 'Likvärdiga bråk.', 'ncm-RB5-2c': 'Helt tal minus bråk; bråkmodellerna läser bara bråk minus bråk.',
  'ncm-RB5-5b': 'Division med bråk.', 'ncm-RP1-1a': 'Proportion i text.', 'ncm-RP1-2c': 'Proportion i text.', 'ncm-RP1-4a': 'Fördelning i förhållande.',
  'ncm-RP3-1b': 'Omvandling andel till procent.', 'ncm-RP3-2a': 'Omvandling andel till procent.', 'ncm-TAt1-7': 'Talmönster.',
  'ncm-TAt3-5b': 'Udda eller jämnt.', 'ncm-TAe1-1c': 'Ekvation.', 'ncm-TAe1-2a': 'Ekvation.', 'ncm-TAu2-2a': 'Uttryck med två variabler.',
  'ncm-TAe2-1': 'Ekvation.', 'ncm-TAe2-4': 'Ekvation.',
}

// Manual keys: format and expected as in the bank's answer check.
const K = (format, expected, target, basis, noteSv) => ({ format, expected, ...target, basis, noteSv, status: 'approved' })
const M = id => ({ misconception: id }), R = reason => ({ reason })
export const MANUAL_KEYS = {
  'ncm-AG4-1b': [K('number', [140], M('equal_sign_add_all'), 'agent', 'Adderar talen som syns: 90 + 50.'),
    K('number', [50], M('equal_sign_operational'), 'agent', 'Skriver talet efter likhetstecknet.')],
  'ncm-AS3-6': [K('number', [903], M('word_problem_keywords'), 'source', 'Adderar talen i texten (tabellen: adderar alla tal i en textuppgift).')],
  'ncm-AS6-7': [K('number', [414], M('word_problem_keywords'), 'agent', 'Adderar talen i texten.'),
    K('number', [396], M('word_problem_keywords'), 'agent', 'Subtraherar talen i texten.'),
    K('number', [3645], M('word_problem_keywords'), 'agent', 'Multiplicerar talen i texten.')],
  'ncm-AG8-3a': [K('numbers', [9], R('needs_review'), 'agent', 'Resten saknas.'),
    K('number', [9.2], M('decimal_two_integers'), 'agent', 'Resten skrivs som decimaler: 9,2.')],
  'ncm-RD1-1d': [K('number', [0.3], M('decimal_zero_placeholder'), 'agent', 'Nollan som platshållare saknas.'),
    K('number', [3.1], M('fraction_bar_as_comma'), 'agent', 'Bråkstrecket blir decimalkomma (3,100).')],
  'ncm-RD1-2b': [K('number', [1.4], M('fraction_bar_as_comma'), 'source', 'Bråkstrecket blir decimalkomma (klustret: 1/3 skrivs 1,3).'),
    K('number', [0.4], M('fraction_bar_as_comma'), 'agent', 'Nämnaren skrivs som decimal.'),
    K('number', [0.14], M('fraction_bar_as_comma'), 'agent', 'Täljare och nämnare skrivs efter kommat.')],
  'ncm-RD1-4c': [K('number', [0.19], M('decimal_longer_is_larger'), 'source', 'Klustret: 0,649 bedöms större än 0,87 eftersom 649 > 87.')],
  'ncm-RD1-3c': [K('number', [0.4], M('decimal_density'), 'agent', 'Svarar med en av ändpunkterna; inget tal ryms emellan.'),
    K('number', [0.5], M('decimal_density'), 'agent', 'Svarar med en av ändpunkterna; inget tal ryms emellan.')],
  'ncm-RD3-6a': [K('number', [0.5], M('multiplication_makes_bigger'), 'source', 'Division ska göra mindre (klustret: 4 / (1/2) beräknas till 2).')],
  'ncm-RB1-5a': [K('text', ['3/1'], M('fraction_digit_position'), 'agent', 'Täljare och nämnare byter plats.'),
    K('text', ['1,3'], M('fraction_bar_as_comma'), 'source', 'Klustret: 1/3 skrivs som 1,3.')],
  'ncm-RB2-2c': [K('text', ['4/3'], M('fraction_digit_position'), 'agent', 'Täljare och nämnare byter plats.'),
    K('text', ['3,4'], M('fraction_bar_as_comma'), 'agent', 'Bråkstrecket blir decimalkomma.')],
  'ncm-RB3-6': [K('number', [6], M('word_problem_keywords'), 'agent', 'Bara ett av stegen: hälften av 12.'),
    K('number', [8], M('word_problem_keywords'), 'agent', 'Bara första steget: 12 minus en tredjedel.')],
  'ncm-RB4-3c': [K('fraction', [3, 5], M('fraction_compare_parts'), 'source', 'Större nämnare tros ge större bråk (tabellen, FW1).')],
  'ncm-RB4-5c': [K('number', [14], M('fraction_additive_equivalence'), 'agent', 'Additiv förlängning: 3 + 12 = 15 och då 2 + 12 = 14.'),
    K('numbers', [10, 15], R('input'), 'simon_observation', 'Skriver bråket 10/15 i stället för täljaren (Simon 2026-11-12).')],
  'ncm-RB5-2c': [K('fraction', [2, 3], M('fraction_whole_number_bias'), 'agent', '1 − 3/4 räknat som (3 − 1)/(4 − 1).')],
  'ncm-RB5-5b': [K('fraction', [1, 3], M('multiplication_makes_bigger'), 'agent', 'Division ska göra mindre: svarar en tredjedel.')],
  'ncm-RP1-1a': [K('number', [1], M('wrong_operation'), 'agent', 'Halverar i stället för att dubbla.')],
  'ncm-RP1-2c': [K('number', [408], M('proportion_additive'), 'source', 'Additivt: lägger till skillnaden i portioner (tabellen: additivt tänkande vid proportionalitet).')],
  'ncm-RP1-4a': [K('number', [150], M('proportion_additive'), 'agent', 'Delar lika i stället för i förhållandet 2 : 1.'),
    K('number', [100], R('needs_review'), 'agent', 'Svarar med Amandas del.')],
  'ncm-RP3-1b': [K('number', [3], M('percent_decimal_conversion'), 'agent', 'Täljaren som procent.'),
    K('number', [0.3], M('percent_decimal_conversion'), 'agent', 'Andelen lämnas som decimaltal.')],
  'ncm-RP3-2a': [K('number', [2], R('input'), 'simon_observation', 'Nollan registrerades inte (Simon 2026-11-12: 2 %).'),
    K('number', [5], M('percent_decimal_conversion'), 'agent', 'Nämnaren som procent.'),
    K('number', [0.2], M('percent_decimal_conversion'), 'agent', 'Andelen lämnas som decimaltal.')],
  'ncm-RP4-1': [K('number', [33], M('percent_without_whole'), 'agent', 'Vinäger jämförs med oljan (1 av 3) i stället för med hela blandningen.')],
  'ncm-TAt3-5b': [K('text', ['udda'], M('product_parity'), 'agent', 'Ser inte att en jämn faktor ger jämn produkt.')],
  'ncm-TAe1-1c': [K('number', [3], M('equation_inverse'), 'agent', 'Subtraherar i stället för att dividera: 6 − 3.'),
    K('number', [18], M('equation_inverse'), 'agent', 'Multiplicerar i stället för att dividera.')],
  'ncm-TAe1-2a': [K('number', [2], R('needs_review'), 'agent', '7 − 5 utan hänsyn till a på båda sidor.')],
  'ncm-TAu2-2a': [K('number', [5.7], M('implicit_multiplication'), 'source', '2x läst som 2,5 och 3y som 3,2 (klustret: 2x = 24 när x = 4).')],
  'ncm-TAe2-1': [K('number', [6], M('equation_inverse'), 'agent', 'Subtraherar 4 men dividerar inte med 3.')],
  'ncm-RD2-6b': [K('number', [0.74], M('decimal_point_alignment'), 'simon_observation', 'Simon 2026-11-12: "subtraherade 1 från 4".')],
  'ncm-AG8-2b': [K('number', [8], R('fact_retrieval'), 'simon_observation', 'Simon 2026-11-12: missade ett steg i tabellramsan.')],
}
// Tasks with neither a computed nor a manual key yet, and why.
export const NO_KEY_REASON = {
  'ncm-TAt1-7': 'Talmönster: felsvaren varierar för mycket för en nyckel; byggs efter riktiga svar.',
  'ncm-TAe2-4': 'Ingen typisk felväg i källorna; byggs efter riktiga svar.',
}

const ncmTask = taskId => ncmBank.tasks.find(task => task.taskId === taskId)

// The problem the error models can compute for a screening question, if the
// question is the bank's task in the same version and wording.
export function screeningStructure(question) {
  const q = question ?? {}
  if (q.operation || q.values) return { status: 'in_task' }
  const structure = NCM_STRUCTURE[q.taskId]
  if (!structure) return { status: 'none' }
  const task = ncmTask(q.taskId)
  if (!task || task.taskVersion !== q.taskVersion || task.promptSv !== q.promptSv) return { status: 'task_changed' }
  return { status: 'added', problem: structure }
}

// The manual key entry a wrong answer matches, read with the bank's answer check.
export function manualKeyMatch(question, studentAnswer) {
  const keys = MANUAL_KEYS[question?.taskId]
  const task = ncmTask(question?.taskId)
  if (!keys || !task || task.taskVersion !== question.taskVersion || task.promptSv !== question.promptSv) return null
  return keys.find(key => checkNcmAnswer({ answerFormat: key.format, expected: key.expected }, String(studentAnswer ?? '')) === 'correct') ?? null
}
