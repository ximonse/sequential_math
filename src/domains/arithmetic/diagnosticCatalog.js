// One task list from the written add/sub manifest and the NCM Diamant screening.
// Callers pass the JSON: the browser imports it, the API reads it with require.
export function buildDiagnosticCatalog({ writtenManifest, writtenPacks, ncmManifest }) {
  const tasks = [...writtenManifest.tasks, ...(ncmManifest?.tasks || [])]
  const packs = [...writtenPacks.packs, ...(ncmManifest?.packs || [])]
  const codes = ncmManifest?.codes || {}
  return {
    tasks,
    packs,
    findTask: taskId => tasks.find(task => task.taskId === taskId) || null,
    // Teacher support for one task: the written guides, or NCM's analysis for its diagnosis.
    guideFor: task => {
      if (!task) return null
      if (task.ncmCode && codes[task.ncmCode]) {
        const code = codes[task.ncmCode]
        return { goalSv: `${task.ncmCode} ${code.titleSv}: ${task.itemFocusSv || code.focusSv}`,
          questionSv: code.followUpSv, sourceSv: ncmManifest.sourceNoteSv }
      }
      return writtenPacks.guides?.[task.intentCode] || null
    }
  }
}
