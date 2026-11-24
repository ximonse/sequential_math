// The shared settings in "Uppdrag & tickets" — Arbetsytor and Pausspel — sit
// above every creator in the panel, so a teacher reads them as applying to all
// of them (R1: what I pick is what I get).
//
// Not every pupil view can honour them. Räknehäfte and Rityta are rendered by
// the ordinary practice session, which standard, table and math_practice
// assignments run through. A focus exercise opens on the pupil's start page and
// talbild runs its own session; neither has a workspace, and a drawing surface
// would change what those exercises measure. Pause games are honoured by the
// practice session and by talbild, but not by the focus view.
//
// Rather than let a ticked box quietly do nothing, the panel reads this table:
// a setting a kind cannot carry is shown as not applying there.
export const ASSIGNMENT_SETTING_SUPPORT = {
  standard: { workspaces: true, breakGames: true },
  table: { workspaces: true, breakGames: true },
  math_practice: { workspaces: true, breakGames: true },
  ncm: { workspaces: true, breakGames: true },
  subitizing: { workspaces: false, breakGames: true },
  focus: { workspaces: false, breakGames: false }
}

export function assignmentSettingSupport(kind) {
  return ASSIGNMENT_SETTING_SUPPORT[kind] || ASSIGNMENT_SETTING_SUPPORT.standard
}

export function supportsWorkspaces(kind) {
  return assignmentSettingSupport(kind).workspaces
}

export function supportsBreakGames(kind) {
  return assignmentSettingSupport(kind).breakGames
}

/**
 * The shared settings an assignment of this kind should be created with.
 * Settings the kind cannot carry are left out instead of stored as a promise
 * the pupil view never keeps.
 */
export function sharedAssignmentSettings(kind, { workspaces, breakGames } = {}) {
  const support = assignmentSettingSupport(kind)
  return {
    ...(support.breakGames ? { breakGames: breakGames === true } : {}),
    ...(support.workspaces && workspaces ? { workspaces } : {})
  }
}

const WORKSPACE_LABELS = { notebook: 'räknehäfte', drawing: 'rityta' }

export function workspaceSummary(workspaces) {
  if (!workspaces) return 'inga'
  const picked = Object.entries(WORKSPACE_LABELS)
    .filter(([key]) => workspaces[key])
    .map(([, label]) => label)
  return picked.join(', ') || 'inga'
}
