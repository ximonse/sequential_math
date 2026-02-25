import { useCallback, useEffect } from 'react'
import { saveProfile } from '../../../lib/storage'
import {
  markStudentPresence,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SAVE_THROTTLE_MS
} from '../../../lib/studentPresence'
import { beginHiddenTracking, endHiddenTracking } from './sessionUtils'

export function usePracticeUiEffects({
  profile,
  currentProblem,
  feedback,
  inputRef,
  coarsePointer,
  goToNextProblem,
  showBreakSuggestion,
  tableMilestone,
  advancePrompt,
  levelFocusMilestone,
  attentionRef,
  presenceSyncRef,
  autoContinueDelay = 3000
}) {
  const updatePresence = useCallback((options = {}) => {
    if (!profile) return
    const now = Date.now()
    markStudentPresence(profile, {
      now,
      page: 'practice',
      interaction: options.interaction === true,
      inFocus: typeof options.inFocus === 'boolean' ? options.inFocus : undefined
    })

    const force = options.force === true
    if (!force && (now - presenceSyncRef.current.lastSavedAt) < PRESENCE_SAVE_THROTTLE_MS) {
      return
    }
    saveProfile(profile)
    presenceSyncRef.current.lastSavedAt = now
  }, [profile, presenceSyncRef])

  useEffect(() => {
    if (!profile) return undefined

    updatePresence({ force: true, interaction: true })

    const onVisibilityChange = () => updatePresence({ force: true })
    const onFocus = () => updatePresence({ force: true })
    const onBlur = () => updatePresence({ force: true, inFocus: false })
    const onInteraction = () => updatePresence({ interaction: true })

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('touchstart', onInteraction)

    const heartbeat = setInterval(() => {
      updatePresence()
    }, PRESENCE_HEARTBEAT_MS)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
      updatePresence({ force: true, inFocus: false })
    }
  }, [profile, updatePresence])

  useEffect(() => {
    const handlePageHide = () => {
      if (profile) saveProfile(profile, { forceSync: true })
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [profile])

  useEffect(() => {
    if (currentProblem && !feedback && inputRef.current && !coarsePointer) {
      inputRef.current.focus()
    }
  }, [currentProblem, feedback, coarsePointer, inputRef])

  useEffect(() => {
    const tracker = attentionRef.current

    const onVisibilityChange = () => {
      if (!currentProblem || feedback) return
      if (document.hidden) {
        beginHiddenTracking(tracker)
      } else {
        endHiddenTracking(tracker)
      }
    }

    const onBlur = () => {
      if (!currentProblem || feedback) return
      tracker.blurCount += 1
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      endHiddenTracking(tracker)
    }
  }, [currentProblem, feedback, attentionRef])

  useEffect(() => {
    if (!feedback || !feedback.correct || showBreakSuggestion || tableMilestone || advancePrompt || levelFocusMilestone) return

    const timer = setTimeout(() => {
      goToNextProblem()
    }, autoContinueDelay)

    return () => clearTimeout(timer)
  }, [feedback, showBreakSuggestion, tableMilestone, advancePrompt, levelFocusMilestone, goToNextProblem, autoContinueDelay])

  useEffect(() => {
    if (!feedback || showBreakSuggestion || tableMilestone || advancePrompt || levelFocusMilestone) return

    let handleKeyDown = null

    const activateTimer = setTimeout(() => {
      handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          goToNextProblem()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
    }, 100)

    return () => {
      clearTimeout(activateTimer)
      if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [feedback, showBreakSuggestion, tableMilestone, advancePrompt, levelFocusMilestone, goToNextProblem])
}
