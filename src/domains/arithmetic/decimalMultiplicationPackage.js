export const decimalMultiplicationPackage = {
  id: 'decimal-component-multiplication-pilot', version: 1,
  modelId: 'decimal_parts_multiplied_separately', approvedOn: '2026-11-05',
  scope: 'multiplication', operationSv: 'decimalmultiplikation',
  labelSv: 'Heltal gånger decimaltal',
  teachingSv: 'Samtala om heltal och tiondelar. Exempel: 4 × 2,5 = 4 × (2 + 0,5) = 8 + 2. Be eleven förklara vad delarna betyder.',
  alternativesSv: 'Undersök också decimalförskjutning, annat räknesätt, avskrivning, hjälp och avbrott. Ett matchande slutsvar fastställer inte metoden.',
  negativeControlSv: '2 × 3,4 = 6,8 skiljer inte komponentmodellen från rätt svar. Använd det inte som bevis för att misstanken är avfärdad.',
}

const definitions = [
  ['source', 7, 6.7], ['contrast-a', 3, 2.4], ['contrast-b', 5, 3.6],
  ['teaching', 4, 2.5], ['independent_check', 6, 4.7], ['later_check', 8, 3.6], ['negative_control', 2, 3.4],
]
export const decimalMultiplicationTasks = definitions.map(([role, a, b]) => ({
  taskId: `decimal-mul-${role}`, taskVersion: 1, operation: 'multiplication', operands: [a, b],
  answerRule: 'decimal_multiplication', answerType: 'number',
  promptSv: `Räkna ut ${a} × ${String(b).replace('.', ',')}.`,
  didacticPackageId: decimalMultiplicationPackage.id, didacticPackageVersion: 1,
  didacticRole: role.startsWith('contrast-') ? 'contrast' : role, intentCode: 'decimal_component_multiplication',
}))
export const decimalMultiplicationPack = { id: decimalMultiplicationPackage.id,
  labelSv: 'Decimalmultiplikation · två prövningsfrågor',
  taskIds: decimalMultiplicationTasks.filter(task => task.didacticRole === 'contrast').map(task => task.taskId) }

export function decimalMultiplicationAnswer(task) {
  const [a, b] = task.operands ?? [], match = /^(\d+)\.(\d)$/u.exec(String(b))
  const tenths = match && Number(match[1]) * 10 + Number(match[2])
  if (!Number.isSafeInteger(a) || a < 0 || !match || !Number.isSafeInteger(a * tenths)) throw new Error('Invalid decimal multiplication task')
  return a * tenths / 10
}
