import { MODEL_DESCRIPTIONS } from './modelDescriptions.js'

// The single catalogue of computed error models (docs/STYRNING_FELFORSTAELSER.md,
// rule R-A). Every model the engine can emit has one entry here. Titles, the
// slip/input sorting, rival families and the speed-training exceptions are
// derived from it; no other file may classify a model. The teacher-facing
// description of the thinking lives in modelDescriptions.js under the same id.
//
// kind: 'misconception' is a way of thinking, 'observation' describes the
// answer without claiming a method, 'input' is a typing or copying slip and
// 'gave_up' an answer that shows no attempt at the task.
// family: models that compete for the same answers and are tested against
// each other. Order within a family is the order of the entries below.
// yieldsToSpecific: hidden when a more specific model explains the same answer.
// speedSlip: a single occurrence in speed training is summarised, not shown.
// needsRepetition: shown only when it repeats and outnumbers comparable right answers.
// minDistinctTasks: a suspicion only when the same kind of error shows on this
//   many different tasks (Simon 2026-11-12: a pattern across facts, not one fact
//   repeated). Below that the answers count as observations.
// notRival: never used as a rival in contrast questions.
// noFollowUp: the card offers no contrast questions or Fråga igen.
// screeningShowsSingle: in a screening's results a single answer is shown on its
//   misconception card, marked as one occurrence (Simon 2026-11-14: a wrong
//   operation is clear even once). Pupil reports keep minDistinctTasks.
const model = (titleSv, domains, options = {}) => ({ titleSv, domains, kind: 'misconception', ...options })
// Models added while the follow-up chain is frozen (docs/STYRNING_FELFORSTAELSER.md,
// section 4) stay out of contrast questions until it is unfrozen.
const OUTSIDE_FROZEN_CHAIN = { notRival: true, noFollowUp: true }
const A = ['arithmetic'], F = ['fractions'], P = ['percentage'], G = ['algebra'], E = ['arithmetic_expressions'], N = ['number_fluency']

export const ERROR_MODELS = {
  // Answer observations and input slips
  // Simon 2026-11-12: a misunderstanding of when to use which operation, not a slip.
  // Kept out of the contrast questions until that follow-up is designed.
  operation_swap: model('Annat räknesätt', A, { yieldsToSpecific: true, minDistinctTasks: 3, notRival: true, noFollowUp: true, screeningShowsSingle: true }),
  place_value_scaling: model('Svaret är skalat med en tiopotens', A, { kind: 'observation', yieldsToSpecific: true }),
  answer_off_by_one: model('Ett ifrån facit', [...A, ...N], { kind: 'observation', speedSlip: true }),
  partial_answer_entry: model('Bara första siffran inskriven', [...A, ...N], { kind: 'input', yieldsToSpecific: true, speedSlip: true }),
  last_two_digits_swapped: model('Facits två sista siffror omkastade', A, { kind: 'input', yieldsToSpecific: true, speedSlip: true }),
  notebook_answer_mismatch: model('Olika svar i räknehäftet och svarsfältet', A, { kind: 'input' }),

  // Giving up or clicking past (Simon 2026-11-12): a signal to the teacher, not a calculation error.
  answer_zero: model('Svarar 0', [...A, ...N], { kind: 'gave_up', minDistinctTasks: 3, noFollowUp: true }),
  answer_55: model('Svarar 55', [...A, ...N], { kind: 'gave_up', minDistinctTasks: 3, noFollowUp: true }),

  // Written subtraction
  smaller_minus_larger: model('Större minus mindre i varje kolumn', A, { family: 'column_subtraction' }),
  exchange_not_decremented: model('Växlar men minskar inte kolumnen till vänster', A, { family: 'column_subtraction' }),
  borrow_forget: model('Skriver 0 där växling behövs', A, { family: 'column_subtraction' }),
  second_exchange_inverted: model('Klarar första växlingen men vänder nästa (0 − x = x)', A, { family: 'column_subtraction' }),
  sub_left_to_right: model('Räknar från vänster, växlar från höger', A, { family: 'column_subtraction' }),
  zero_donor_not_decremented: model('Växling genom noll: hundratalet minskas inte', A),
  zero_intermediate_ten: model('Växling genom noll: tio tiotal behålls', A),
  unnecessary_exchange: model('Minskar en kolumn trots att ingen växling behövs', A),

  // Written addition
  carry_forget: model('Minnessiffran glöms', A),
  column_sums_concatenated: model('Kolumnsummor skrivs efter varandra', A),
  one_carry_forgotten: model('En av flera minnessiffror glöms', A),
  phantom_carry: model('Lägger till minnessiffra som inte behövs', A),
  add_left_to_right: model('Räknar från vänster, minnessiffran åt höger', A),
  add_multiplied: model('Multiplicerar i stället för att addera', [...A, ...N], { minDistinctTasks: 3, notRival: true, noFollowUp: true, screeningShowsSingle: true }),

  // Decimals (Simon 2026-11-12)
  decimal_tenths_as_hundredths: model('Tiondelar blir hundradelar', A, OUTSIDE_FROZEN_CHAIN),
  decimal_only_fraction_added: model('Lägger bara till decimaldelen av ena talet', A, OUTSIDE_FROZEN_CHAIN),
  decimal_whole_under_last_decimal: model('Heltalet ställs under sista decimalen', A, OUTSIDE_FROZEN_CHAIN),
  // Simon 2026-11-14: 3 × 2,4 = 6,2 (forgotten carry) and 7 × 6,7 = 91 (7 + 6 · 7 from the left).
  decimal_mul_carry_forgotten: model('Minnessiffran glöms när decimaltal multipliceras', A, OUTSIDE_FROZEN_CHAIN),
  decimal_mul_carry_added_before: model('Minnessiffran läggs till före multiplikationen i decimaltal', A, OUTSIDE_FROZEN_CHAIN),
  decimal_factor_split_left_to_right: model('Decimaltalet delas upp och räknas från vänster', A, OUTSIDE_FROZEN_CHAIN),
  decimal_point_missing_with_error: model('Tappar växlingen och decimaltecknet', A, OUTSIDE_FROZEN_CHAIN),

  // Multiplication
  mul_carry_forgotten: model('Minnessiffran glöms i multiplikationen', A, { family: 'written_multiplication' }),
  mul_carry_added_before: model('Minnessiffran läggs till före multiplikationen', A, { family: 'written_multiplication' }),
  mul_carry_always_one: model('Minnessiffran blir alltid 1', A, { family: 'written_multiplication' }),
  mul_partials_concatenated: model('Delprodukterna skrivs efter varandra', A, { family: 'written_multiplication' }),
  mul_columnwise: model('Multiplicerar kolumnvis som vid addition', A, { family: 'written_multiplication' }),
  mul_no_row_shift: model('Andra delprodukten flyttas inte', A, { family: 'written_multiplication' }),
  ones_digits_only: model('Bara entalen multipliceras', A, { family: 'written_multiplication' }),
  table_off_by_one: model('Angränsande produkt', A, { minDistinctTasks: 3 }),
  decimal_parts_multiplied_separately: model('Heltal och decimaldel multipliceras var för sig', A),

  // Division
  div_remainder_ignored: model('Resten förs inte vidare', A, { family: 'short_division' }),
  div_remainder_as_ones: model('Resten läggs till som ental', A, { family: 'short_division' }),
  div_zero_dropped: model('Nollan i kvoten tappas', A, { family: 'short_division' }),
  quotient_off_by_one: model('Kvoten blir ett fel', A, { family: 'short_division', needsRepetition: true }),
  dividend_as_answer: model('Täljaren lämnas som svar', A),
  divisor_as_answer: model('Nämnaren lämnas som svar', A),
  reversed_operands: model('Divisionens tal har bytt plats', A),

  // Fractions
  fraction_components_separately: model('Täljare och nämnare räknas var för sig', F),
  fraction_keep_first_denominator: model('Ingen gemensam nämnare; första nämnaren behålls', F),
  fraction_integer_in_denominator: model('Heltalet multipliceras in i nämnaren', F),
  fraction_add_instead_of_multiply: model('Adderar i stället för att multiplicera', F),
  fraction_numerators_only: model('Adderar bara täljarna', F, OUTSIDE_FROZEN_CHAIN),
  fraction_inverted: model('Täljare och nämnare byter plats', F, OUTSIDE_FROZEN_CHAIN),
  fraction_mul_components_added: model('Adderar täljare och nämnare vid multiplikation', F, OUTSIDE_FROZEN_CHAIN),
  fraction_mul_numerators_add_denominators: model('Multiplicerar täljarna men adderar nämnarna', F, OUTSIDE_FROZEN_CHAIN),

  // Percentage
  percentage_number_as_amount: model('Använder procenttalet som ett belopp', P),
  percentage_missing_division_100: model('Multiplicerar med procenttalet utan att dela med 100', P),
  percentage_divide_by_percent_number: model('Dividerar med procenttalet', P),
  percentage_change_amount_only: model('Svarar med förändringen, inte det nya värdet', P),
  percentage_change_reversed: model('Räknar förändringen åt fel håll', P),
  percentage_ratio_not_converted: model('Lämnar andelen utan att göra om till procent', P),
  percentage_part_whole_reversed: model('Vänder på del och helhet', P),

  // Algebra
  algebra_constant_dropped: model('Konstanten faller bort', G),
  algebra_unlike_terms_combined: model('Slår ihop variabelterm och konstant', G),
  algebra_variable_dropped: model('Variabeln faller bort', G),
  algebra_coefficient_dropped: model('Koefficienten faller bort', G),
  algebra_coefficient_added: model('Adderar koefficienten i stället för att multiplicera', G),
  algebra_square_as_double: model('Kvadrat räknas som dubbelt', G),

  // Order of operations
  expression_left_to_right: model('Räknar från vänster till höger utan prioritering', E),
  expression_parentheses_ignored: model('Bortser från parenteserna', E),
  expression_left_to_right_no_parentheses: model('Räknar från vänster och bortser från parenteserna', E),

  // Number bonds and doubles
  bond_sum_instead_of_missing: model('Adderar i stället för att söka saknad term', N),
  bond_known_term_returned: model('Svarar med den kända termen', N),
  bond_target_returned: model('Svarar med måltalet', N),
  bond_ten_friend: model('Använder 10-kompisen fast måltalet är ett annat', N, OUTSIDE_FROZEN_CHAIN),
  double_no_carry: model('Dubblar utan minnessiffra', N),
  double_ten_too_many: model('Tio för mycket i dubbeln', N, OUTSIDE_FROZEN_CHAIN),
  double_original_returned: model('Svarar med talet utan att dubbla', N),
  double_known_product_returned: model('Svarar med det givna talet i stället för hälften', N),
  double_instead_of_half: model('Dubblar i stället för att halvera', N),
}

// Titles added 2026-11-12 and not yet read by Simon. They replace a fallback
// that showed the first sentence of the computed reason.
export const TITLES_AWAITING_REVIEW = ['percentage_number_as_amount', 'percentage_missing_division_100',
  'percentage_divide_by_percent_number', 'percentage_change_amount_only', 'percentage_change_reversed',
  'percentage_ratio_not_converted', 'percentage_part_whole_reversed', 'algebra_constant_dropped',
  'algebra_unlike_terms_combined', 'algebra_variable_dropped', 'algebra_coefficient_dropped', 'algebra_coefficient_added',
  'algebra_square_as_double', 'expression_left_to_right', 'expression_parentheses_ignored',
  'expression_left_to_right_no_parentheses', 'bond_sum_instead_of_missing', 'bond_known_term_returned',
  'bond_target_returned', 'double_no_carry', 'double_original_returned', 'double_known_product_returned', 'double_instead_of_half']

// Models that still lack a teacher-facing description of the thinking. The
// list is open debt: a description is added through the routine in section 9
// of the governance document, and the id leaves this list in the same change.
export const DESCRIPTIONS_PENDING = ['answer_zero', 'answer_55', 'operation_swap', 'place_value_scaling', 'answer_off_by_one', 'partial_answer_entry',
  'last_two_digits_swapped', 'notebook_answer_mismatch', 'ones_digits_only', 'table_off_by_one',
  'decimal_parts_multiplied_separately', 'quotient_off_by_one', 'dividend_as_answer', 'divisor_as_answer', 'reversed_operands',
  'fraction_components_separately', 'fraction_keep_first_denominator', 'fraction_integer_in_denominator',
  'fraction_add_instead_of_multiply', 'percentage_number_as_amount', 'percentage_missing_division_100',
  'percentage_divide_by_percent_number', 'percentage_change_amount_only', 'percentage_change_reversed',
  'percentage_ratio_not_converted', 'percentage_part_whole_reversed', 'algebra_constant_dropped',
  'algebra_unlike_terms_combined', 'algebra_variable_dropped', 'algebra_coefficient_dropped', 'algebra_coefficient_added',
  'algebra_square_as_double', 'expression_left_to_right', 'expression_parentheses_ignored',
  'expression_left_to_right_no_parentheses', 'bond_sum_instead_of_missing', 'bond_known_term_returned',
  'bond_target_returned', 'double_no_carry', 'double_original_returned', 'double_known_product_returned', 'double_instead_of_half']
export const hasDescription = id => Boolean(MODEL_DESCRIPTIONS[id])

const ids = Object.keys(ERROR_MODELS)
const where = test => new Set(ids.filter(id => test(ERROR_MODELS[id])))

export const MODEL_TITLES_SV = Object.fromEntries(ids.map(id => [id, ERROR_MODELS[id].titleSv]))
// Observations and input slips are not method explanations.
export const NOT_METHOD_MODELS = where(m => m.kind !== 'misconception')
export const NOT_RIVAL_MODELS = where(m => m.kind !== 'misconception' || m.notRival)
export const NO_FOLLOW_UP_MODELS = where(m => m.noFollowUp)
export const SCREENING_SINGLE_MODELS = where(m => m.screeningShowsSingle)
export const GAVE_UP_MODELS = where(m => m.kind === 'gave_up')
export const INPUT_MODELS = where(m => m.kind === 'input')
export const YIELDS_TO_SPECIFIC_MODELS = where(m => m.yieldsToSpecific)
export const SPEED_SLIP_MODEL_IDS = where(m => m.speedSlip)
export const NEEDS_REPETITION_MODELS = where(m => m.needsRepetition)
export const MODEL_FAMILIES = [...new Set(ids.map(id => ERROR_MODELS[id].family).filter(Boolean))]
  .map(family => ids.filter(id => ERROR_MODELS[id].family === family))
// In decimal addition the two carry models compete only with each other.
export const DECIMAL_ADDITION_CARRY_FAMILY = ['carry_forget', 'one_carry_forgotten']
