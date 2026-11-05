export const decimalSubtractionPackage = {
  id: 'decimal-single-exchange-subtraction-pilot', version: 1,
  modelIds: ['smaller_minus_larger', 'borrow_forget', 'exchange_not_decremented'],
  scope: 'decimal_subtraction', approvedOn: '2026-11-05',
  labelSv: 'Decimaltal med en växling', operationSv: 'decimalsubtraktion',
  teachingSv: 'Undersök att 3 tiondelar och 2 hundradelar är lika mycket som 2 tiondelar och 12 hundradelar. I 5,32 − 1,18 räknar ni sedan 12 − 8 hundradelar, 2 − 1 tiondelar och 5 − 1 hela. Be eleven förklara varför tiondelen ändras.',
  alternativesSv: 'Skilj större minus mindre i varje kolumn, noll där växling behövs och växling utan minskad tiondel. På 6,42 − 2,17 ger två av reglerna samma felsvar, 4,35. Granska även annat räknesätt, avskrivning och hjälp; slutsvaret fastställer inte metoden.',
  negativeControlSv: '8,64 − 3,21 = 5,43 ger rätt svar med samtliga tre regler. Uppgiften kan inte ensam avfärda misstanken.',
  scopeSv: 'Två decimaler och en växling från tiondelar till hundradelar. Ingen växling genom noll eller över heltalsgränsen; andra strukturer är ännu oprövade.',
}

const definitions = [
  ['source', 6.42, 2.17], ['contrast-a', 7.53, 2.19], ['contrast-b', 8.41, 3.24],
  ['teaching', 5.32, 1.18], ['independent_check', 9.54, 4.28], ['later_check', 6.83, 2.47], ['negative_control', 8.64, 3.21],
]
export const decimalSubtractionTasks = definitions.map(([role, a, b]) => ({
  taskId: `decimal-sub-${role}`, taskVersion: 1, operation: 'subtraction', operands: [a, b],
  answerRule: 'decimal_subtraction', answerType: 'number',
  promptSv: `Räkna ut ${String(a).replace('.', ',')} − ${String(b).replace('.', ',')}.`,
  didacticPackageId: decimalSubtractionPackage.id, didacticPackageVersion: 1,
  didacticRole: role.startsWith('contrast-') ? 'contrast' : role, intentCode: 'decimal_single_exchange_subtraction',
}))
export const decimalSubtractionPack = { id: decimalSubtractionPackage.id,
  labelSv: 'Decimalsubtraktion · två prövningsfrågor',
  taskIds: decimalSubtractionTasks.filter(task => task.didacticRole === 'contrast').map(task => task.taskId) }

export function decimalSubtractionStructure({ a, b } = {}) {
  if (![a, b].every(value => /^\d\.\d{2}$/u.test(String(value))) || b <= 0 || Math.floor(a) < Math.floor(b)) return null
  const aa = Math.round(a * 100), bb = Math.round(b * 100)
  const exchange = aa % 10 < bb % 10
  if (Math.floor(aa / 10) % 10 - (exchange ? 1 : 0) < Math.floor(bb / 10) % 10) return null
  return exchange ? 'single_exchange' : 'no_exchange'
}

export function decimalSubtractionAnswer(task) {
  const operands = task.operands ?? []
  if (operands.length !== 2 || !operands.every(value => /^\d\.\d{2}$/u.test(String(value)))) throw new Error('Invalid decimal subtraction task')
  const [a, b] = operands.map(value => {
    const [whole, decimals] = String(value).split('.')
    return Number(whole) * 100 + Number(decimals)
  })
  if (a < b) throw new Error('Invalid decimal subtraction task')
  return (a - b) / 100
}
