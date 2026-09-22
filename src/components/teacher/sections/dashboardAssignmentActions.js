import { buildQuickAssignmentPreset } from './dashboardAssignmentRiskHelpers'
import { getPresetConfig } from './dashboardCoreHelpers'
import {
  buildAssignmentLink,
  clearActiveAssignment,
  clearAllAssignments,
  createAssignment,
  deleteAssignment,
  getActiveAssignment,
  getAssignmentById,
  getAssignments,
  setActiveAssignment
} from '../../../lib/assignments'

export function buildDashboardAssignmentActions({
  assignments,
  setAssignments,
  setDashboardStatus,
  setCopiedId,
  setActiveAssignmentId,
  getSelectedClassLoginToken
}) {
  const handleCreatePreset = (presetKey) => {
    const preset = getPresetConfig(presetKey)
    const created = createAssignment(preset)
    if (!created) {
      setDashboardStatus('Kunde inte skapa uppdrag just nu.')
      return
    }
    setAssignments(getAssignments())
    setDashboardStatus(`Nytt uppdrag skapat: ${preset.title}`)
  }

  const handleCopyAssignmentLink = async (assignmentId, classLoginToken = getSelectedClassLoginToken()) => {
    const assignment = assignments.find(item => item.id === assignmentId) || getAssignmentById(assignmentId)
    const link = buildAssignmentLink(assignmentId, assignment, classLoginToken)
    if (!link) {
      setDashboardStatus('Välj exakt en klass ovanför innan du delar uppdraget.')
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(assignmentId)
      window.setTimeout(() => setCopiedId(''), 1200)
      setDashboardStatus('Länk kopierad.')
    } catch {
      setDashboardStatus('Kunde inte kopiera länk just nu.')
    }
  }

  const handleActivateForAll = (assignmentId) => {
    setActiveAssignment(assignmentId)
    setActiveAssignmentId(assignmentId)
    setDashboardStatus(`Aktivt uppdrag ändrat till ${assignmentId}.`)
  }

  const handleClearActiveForAll = () => {
    clearActiveAssignment()
    setActiveAssignmentId('')
    setDashboardStatus('Aktivt uppdrag rensat.')
  }

  const handleDeleteAssignment = (assignmentId) => {
    deleteAssignment(assignmentId)
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setDashboardStatus(`Uppdrag ${assignmentId} borttaget.`)
  }

  const handleClearAllAssignments = () => {
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
    handleCopyAssignmentLink,
    handleActivateForAll,
    handleClearActiveForAll,
    handleDeleteAssignment,
    handleClearAllAssignments,
    handleCreateQuickAssignment
  }
}
