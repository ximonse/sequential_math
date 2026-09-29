import { buildQuickAssignmentPreset } from './dashboardAssignmentRiskHelpers'
import { getPresetConfig } from './dashboardCoreHelpers'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import {
  buildAssignmentLink,
  clearActiveAssignment,
  clearAllAssignments,
  createAssignment,
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
  getTargetClasses = () => []
}) {
  // "Aktivera för alla" is stored on each class on the server, where pupils'
  // own devices read it. Targets are the selected classes, or all of them.
  const saveClassAssignment = async (assignment) => {
    const targets = getTargetClasses()
    const assignmentPayload = assignment ? encodeAssignmentPayload(assignment) : ''
    const results = await Promise.all(targets.map(async target => {
      try {
        const response = await fetch('/api/teacher-class-assignment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
          body: JSON.stringify({ classId: target.id, assignmentPayload })
        })
        return response.ok
      } catch {
        return false
      }
    }))
    const saved = targets.filter((_, index) => results[index]).map(target => target.name || target.id)
    const failed = targets.length - saved.length
    return { saved, failed }
  }

  const handleCreatePreset = (presetKey, targetCount) => {
    const base = getPresetConfig(presetKey)
    const cap = Math.floor(Number(targetCount))
    const preset = Number.isFinite(cap) && cap > 0 ? { ...base, targetCount: cap } : base
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

  const handleActivateForAll = async (assignmentId) => {
    const assignment = assignments.find(item => item.id === assignmentId) || getAssignmentById(assignmentId)
    setActiveAssignment(assignmentId)
    setActiveAssignmentId(assignmentId)
    const { saved, failed } = await saveClassAssignment(assignment)
    if (saved.length === 0) {
      setDashboardStatus('Kunde inte aktivera uppdraget för eleverna. Försök igen.')
      return
    }
    setDashboardStatus(`${assignment?.title || 'Uppdraget'} är aktivt för ${saved.join(', ')}.${failed ? ` ${failed} klass(er) kunde inte sparas.` : ''}`)
  }

  const handleClearActiveForAll = async () => {
    clearActiveAssignment()
    setActiveAssignmentId('')
    const { saved, failed } = await saveClassAssignment(null)
    setDashboardStatus(failed
      ? `Aktivt uppdrag rensat för ${saved.join(', ') || 'inga klasser'}. ${failed} klass(er) kunde inte sparas.`
      : 'Aktivt uppdrag rensat.')
  }

  const handleDeleteAssignment = (assignmentId) => {
    if (getActiveAssignment()?.id === assignmentId) void saveClassAssignment(null)
    deleteAssignment(assignmentId)
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setDashboardStatus(`Uppdrag ${assignmentId} borttaget.`)
  }

  const handleClearAllAssignments = () => {
    if (getActiveAssignment()) void saveClassAssignment(null)
    clearAllAssignments()
    setAssignments([])
    setActiveAssignmentId('')
    setDashboardStatus('Alla uppdrag rensade.')
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
    handleActivateForAll,
    handleClearActiveForAll,
    handleDeleteAssignment,
    handleClearAllAssignments,
    handleCreateQuickAssignment
  }
}
