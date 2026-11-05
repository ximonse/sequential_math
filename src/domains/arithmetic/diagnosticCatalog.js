import { geometryTasks, geometryPack } from './screeningImageQuestions.js'
import { decimalMultiplicationTasks, decimalMultiplicationPack, decimalMultiplicationPackage } from './decimalMultiplicationPackage.js'
// One task list from the written add/sub manifest and the NCM Diamant screening.
// Callers pass the JSON: the browser imports it, the API reads it with require.
export function buildDiagnosticCatalog({ writtenManifest, writtenPacks, ncmManifest }) {
  const tasks = [...writtenManifest.tasks, ...decimalMultiplicationTasks, ...geometryTasks, ...(ncmManifest?.tasks || [])]
  const packs = [...writtenPacks.packs, decimalMultiplicationPack, geometryPack, ...(ncmManifest?.packs || [])]
  const codes = ncmManifest?.codes || {}
  return {
    tasks,
    packs,
    findTask: taskId => tasks.find(task => task.taskId === taskId) || null,
    // Teacher support for one task: the written guides, or NCM's analysis for its diagnosis.
    guideFor: task => {
      if (!task) return null
      if (task.didacticPackageId === decimalMultiplicationPackage.id) return {
        goalSv: decimalMultiplicationPackage.labelSv, questionSv: decimalMultiplicationPackage.alternativesSv,
        sourceSv: 'Originaluppgifter och didaktik granskade av Simon 2026-11-05.' }
      if (task.ncmCode && codes[task.ncmCode]) {
        const code = codes[task.ncmCode]
        return { goalSv: `${task.ncmCode} ${code.titleSv}: ${task.itemFocusSv || code.focusSv}`,
          questionSv: code.followUpSv, sourceSv: ncmManifest.sourceNoteSv }
      }
      return task.sourceKind === 'original_geometry' ? { goalSv: 'Känna igen geometriska former och deras egenskaper', questionSv: 'Vilka egenskaper använde du för att välja?' } : writtenPacks.guides?.[task.intentCode] || null
    }
  }
}
