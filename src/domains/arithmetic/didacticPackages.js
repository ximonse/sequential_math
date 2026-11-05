import { decimalMultiplicationPackage, decimalMultiplicationTasks, decimalMultiplicationPack } from './decimalMultiplicationPackage.js'
import { decimalSubtractionPackage, decimalSubtractionTasks, decimalSubtractionPack, decimalSubtractionStructure } from './decimalSubtractionPackage.js'

export const didacticPackages = [
  { pack: decimalMultiplicationPackage, tasks: decimalMultiplicationTasks, bankPack: decimalMultiplicationPack },
  { pack: decimalSubtractionPackage, tasks: decimalSubtractionTasks, bankPack: decimalSubtractionPack },
]
export const didacticDefinition = id => didacticPackages.find(({ pack }) => pack.id === id) ?? null
export const didacticForModel = (modelId, scope) => didacticPackages.find(({ pack }) =>
  pack.scope === scope && (pack.modelIds ?? [pack.modelId]).includes(modelId)) ?? null

export function didacticSupportsProblem(packageId, problem) {
  if (packageId === decimalSubtractionPackage.id) return problem?.type === 'subtraction'
    && decimalSubtractionStructure(problem.values) === 'single_exchange'
  return packageId === decimalMultiplicationPackage.id && problem?.type === 'multiplication'
    && Number.isSafeInteger(problem.values?.a) && problem.values.a >= 0 && /^\d+\.\d$/u.test(String(problem.values?.b))
}
