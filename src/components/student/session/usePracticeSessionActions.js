import { usePracticeBreakActions } from './usePracticeBreakActions'
import { usePracticeCoreActions } from './usePracticeCoreActions'

export function usePracticeSessionActions(params) {
  const coreActions = usePracticeCoreActions(params)
  const breakActions = usePracticeBreakActions({
    ...params,
    goToNextProblem: coreActions.goToNextProblem
  })

  return {
    ...coreActions,
    ...breakActions
  }
}
