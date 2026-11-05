export const decimalAdditionPackage = {
  id: 'decimal-two-carry-addition-pilot', version: 1,
  modelIds: ['carry_forget', 'one_carry_forgotten'], scope: 'decimal_addition', approvedOn: '2026-11-05',
  labelSv: 'Decimaladdition med två minnessiffror', operationSv: 'decimaladdition',
  teachingSv: 'I 2,68 + 1,57 blir 8 + 7 = 15 hundradelar: fem hundradelar och en tiondel. Sedan blir 6 + 5 + 1 = 12 tiondelar: två tiondelar och en hel. Till sist 2 + 1 + 1 = 4 hela. Be eleven förklara vad de två minnesettorna är värda och varför värdet bevaras.',
  alternativesSv: 'Jämför alla uteblivna minnessiffror med en tappad minnessiffra på var och en av de två positionerna. Båda möjliga modellsvaren behövs. Granska också andra räknesätt, hjälp, avbrott och inmatning; slutsvaret bevisar inte metoden.',
  negativeControlSv: '2,13 + 3,24 = 5,37 kräver ingen minnessiffra och kan inte avfärda misstanken. På 3,48 + 2,57 passar 5,95 både alla uteblivna minnessiffror och en tappad minnessiffra; den beroende kedjan skiljer inte förklaringarna åt.',
  scopeSv: 'Två decimaler, facit under tio och minst tio i båda decimalkolumnsummorna före överföring. Beroende kedjor, olika decimalantal och större resultat ligger utanför paketets första prövningar.',
}

const definitions = [
  ['source', 3.48, 2.67], ['contrast-a', 1.76, 2.58], ['contrast-b', 4.67, 1.85],
  ['teaching', 2.68, 1.57], ['independent_check', 3.86, 2.47], ['later_check', 1.78, 3.66], ['negative_control', 2.13, 3.24],
]
export const decimalAdditionTasks = definitions.map(([role, a, b]) => ({
  taskId: `decimal-add-${role}`, taskVersion: 1, operation: 'addition', operands: [a, b],
  answerRule: 'decimal_addition', answerType: 'number',
  promptSv: `Räkna ut ${String(a).replace('.', ',')} + ${String(b).replace('.', ',')}.`,
  didacticPackageId: decimalAdditionPackage.id, didacticPackageVersion: 1,
  didacticRole: role.startsWith('contrast-') ? 'contrast' : role, intentCode: 'decimal_two_carry_addition',
}))
export const decimalAdditionPack = { id: decimalAdditionPackage.id,
  labelSv: 'Decimaladdition · två prövningsfrågor',
  taskIds: decimalAdditionTasks.filter(task => task.didacticRole === 'contrast').map(task => task.taskId) }

function operandCents({ a, b } = {}) {
  if (![a, b].every(value => /^\d\.\d{2}$/u.test(String(value))) || a <= 0 || b <= 0) return null
  const values = [a, b].map(value => {
    const [whole, decimals] = String(value).split('.')
    return Number(whole) * 100 + Number(decimals)
  })
  return values[0] + values[1] < 1000 ? values : null
}
export function decimalAdditionStructure(values) {
  const operands = operandCents(values)
  if (!operands) return null
  const [a, b] = operands, hundredths = a % 10 + b % 10
  const tenths = Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10
  if (hundredths >= 10 && tenths >= 10) return 'independent_carries'
  if (hundredths >= 10 && tenths === 9) return 'dependent_carries'
  return hundredths < 10 && tenths < 10 ? 'no_carry' : 'single_carry'
}
export function decimalAdditionAnswer(task) {
  if (task.operands?.length !== 2) throw new Error('Invalid decimal addition task')
  const operands = operandCents({ a: task.operands[0], b: task.operands[1] })
  if (!operands) throw new Error('Invalid decimal addition task')
  return (operands[0] + operands[1]) / 100
}
