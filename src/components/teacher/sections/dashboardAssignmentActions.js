import { buildQuickAssignmentPreset } from './dashboardAssignmentRiskHelpers'
import { getPresetConfig } from './dashboardCoreHelpers'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import {
  buildAssignmentLink,
  clearAllAssignments,
  createAssignment,
  decodeAssignmentPayload,
  deleteAssignment,
  encodeAssignmentPayload,
  getActiveAssignment,
  getAssignmentById,
  getAssignments,
  setActiveAssignment
} from '../../../lib/assignments'

async function copyTextToClipboard(text) {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => setTimeout(reject, 1500))
    ])
    return true
  } catch {
    // Some browsers reject or never settle; fall through to the legacy path.
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}

export function buildDashboardAssignmentActions({
  assignments,
  setAssignments,
  setDashboardStatus,
  setCopiedId,
  setActiveAssignmentId,
  getSelectedClassLoginToken,
  getTargets = () => [],
  getActiveTargets = () => [],
  onTargetActiveChange = () => {}
}) {
  // Active assignments are stored on each class or group on the server, where
  // pupils' own devices read them. Targets are { type, id, name }.
  // Returns the target's active assignments after the change, or null on failure.
  const putTarget = async (target, change) => {
    try {
      const response = await fetch('/api/teacher-class-assignment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
        body: JSON.stringify({ targetType: target.type, targetId: target.id, ...change })
      })
      if (!response.ok) return null
      const activeAssignments = (await response.json()).activeAssignments || []
      onTargetActiveChange(target, activeAssignments)
      return activeAssignments
    } catch {
      return null
    }
  }
  const saveTargets = async (targets, change) => {
    const results = await Promise.all(targets.map(async target => Boolean(await putTarget(target, change))))
    const saved = targets.filter((_, index) => results[index]).map(target => target.name || target.id)
    return { saved, failed: targets.length - saved.length }
  }
  const deactivateEverywhere = assignmentId => {
    const targets = getActiveTargets(assignmentId)
    if (targets.length) void saveTargets(targets, { action: 'deactivate', assignmentId })
  }

  const handleCreatePreset = (presetKey, targetCount, breakGames = false, workspaces) => {
    const base = getPresetConfig(presetKey)
    const cap = Math.floor(Number(targetCount))
    const preset = { ...base, breakGames, ...(workspaces ? { workspaces } : {}), ...(Number.isFinite(cap) && cap > 0 ? { targetCount: cap } : {}) }
    const created = createAssignment(preset)
    if (!created) {
      setDashboardStatus('Kunde inte skapa uppdrag just nu.')
      return
    }
    setAssignments(getAssignments())
    setDashboardStatus(`Nytt uppdrag skapat: ${preset.title}`)
  }

  const handleCreateMathPractice = (assignment) => {
    if (!assignment) {
      setDashboardStatus('Kunde inte skapa matematikövning just nu.')
      return
    }
    setAssignments(getAssignments())
    setDashboardStatus(`Matematikövning skapad: ${assignment.title}`)
  }

  const handleCopyAssignmentLink = async (assignmentId, classLoginToken = getSelectedClassLoginToken()) => {
    const assignment = assignments.find(item => item.id === assignmentId) || getAssignmentById(assignmentId)
    const link = buildAssignmentLink(assignmentId, assignment, classLoginToken)
    if (!link) {
      setDashboardStatus('Välj exakt en klass ovanför innan du delar uppdraget.')
      return
    }
    if (await copyTextToClipboard(link)) {
      setCopiedId(assignmentId)
      window.setTimeout(() => setCopiedId(''), 1200)
      setDashboardStatus('Länk kopierad.')
      return
    }
    setDashboardStatus('Kunde inte kopiera länk automatiskt.')
    window.prompt('Kopiera länken manuellt (Ctrl+C):', link)
  }

  const handleActivateAssignment = async (assignmentId) => {
    const assignment = assignments.find(item => item.id === assignmentId) || getAssignmentById(assignmentId)
    const targets = getTargets()
    if (!assignment || targets.length === 0) {
      setDashboardStatus('Det finns ingen klass eller grupp att aktivera uppdraget för.')
      return
    }
    const { saved, failed } = await saveTargets(targets, { action: 'activate', assignmentPayload: encodeAssignmentPayload(assignment) })
    if (saved.length === 0) {
      setDashboardStatus('Kunde inte aktivera uppdraget för eleverna. Försök igen.')
      return
    }
    setDashboardStatus(`${assignment.title || 'Uppdraget'} är aktivt för ${saved.join(', ')}.${failed ? ` ${failed} klass(er) eller grupp(er) kunde inte sparas.` : ''}`)
  }

  // Ends the assignment for the selected classes and groups, or everywhere with none selected.
  const handleDeactivateAssignment = async (assignmentId) => {
    const assignment = assignments.find(item => item.id === assignmentId) || getAssignmentById(assignmentId)
    const active = getActiveTargets(assignmentId)
    const selected = getTargets({ selectedOnly: true })
    const targets = selected.length ? active.filter(target => selected.some(item => item.type === target.type && item.id === target.id)) : active
    const { saved, failed } = await saveTargets(targets, { action: 'deactivate', assignmentId })
    setDashboardStatus(failed
      ? `${assignment?.title || 'Uppdraget'} avaktiverades för ${saved.join(', ') || 'inga'}. ${failed} kunde inte sparas.`
      : `${assignment?.title || 'Uppdraget'} är avaktiverat för ${saved.join(', ') || 'inga'}.`)
  }

  const handleDeleteAssignment = (assignmentId) => {
    deactivateEverywhere(assignmentId)
    deleteAssignment(assignmentId)
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setDashboardStatus(`Uppdrag ${assignmentId} borttaget.`)
  }

  const handleClearAllAssignments = () => {
    for (const assignment of assignments) deactivateEverywhere(assignment.id)
    clearAllAssignments()
    setAssignments([])
    setActiveAssignmentId('')
    setDashboardStatus('Alla uppdrag rensade.')
  }

  // A quick assignment goes straight onto that pupil's start page. It replaces only
  // the pupil's previous quick assignment of the same kind in the same operations;
  // a focus on subtraction stays when a focus on addition is added.
  const activateForPupil = async (row, assignment) => {
    const target = { type: 'student', id: String(row.studentId), name: row.name || String(row.studentId) }
    const active = await putTarget(target, { action: 'activate', assignmentPayload: encodeAssignmentPayload(assignment) })
    if (!active) return false
    const prefix = `${String(assignment.title).split('|')[0].trim()} |`
    const operations = item => [...(item.problemTypes || [])].sort().join(',')
    const older = active.map(item => decodeAssignmentPayload(item.payload))
      .filter(item => item && item.id !== assignment.id && String(item.title).startsWith(prefix)
        && operations(item) === operations(assignment))
    for (const item of older) await putTarget(target, { action: 'deactivate', assignmentId: item.id })
    return true
  }

  const handleCreateQuickAssignment = async (row, variant) => {
    const preset = buildQuickAssignmentPreset(row, variant)
    const assignment = createAssignment(preset)
    if (!assignment) {
      setDashboardStatus('Kunde inte skapa snabbuppdrag just nu.')
      return
    }

    setAssignments(getAssignments())
    setActiveAssignment(assignment.id)
    setActiveAssignmentId(assignment.id)

    if (row?.studentId) {
      setDashboardStatus(await activateForPupil(row, assignment)
        ? `${assignment.title} ligger nu på ${row.name || 'elevens'} startsida.`
        : `${assignment.title} skapades men kunde inte läggas på elevens startsida. Försök igen.`)
      return
    }

    const link = buildAssignmentLink(assignment.id, assignment, getSelectedClassLoginToken())
    if (!link) {
      setDashboardStatus(`Nytt uppdrag skapat och aktiverat: ${assignment.title}. Välj exakt en klass innan du delar det.`)
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(assignment.id)
      window.setTimeout(() => setCopiedId(''), 1200)
      setDashboardStatus(`Nytt uppdrag skapat och aktiverat: ${assignment.title}. Länk kopierad.`)
    } catch {
      setDashboardStatus(`Nytt uppdrag skapat och aktiverat: ${assignment.title}.`)
    }
  }
  return {
    handleCreatePreset,
    handleCreateMathPractice,
    handleCopyAssignmentLink,
    handleActivateAssignment,
    handleDeactivateAssignment,
    handleDeleteAssignment,
    handleClearAllAssignments,
    handleCreateQuickAssignment
  }
}
