import { useCallback, useEffect, useRef, useState } from 'react'
import './practiceSpeech.css'

const HOLD_MS = 1000
const MOVE_PX = 8

function readableTarget(event) {
  const target = event.target.closest?.('[data-practice-speech]')
  return target && event.currentTarget.contains(target) ? target : null
}

export function usePracticeSpeech({ studentId, mode, cue, text }) {
  const key = 'concept-speech:' + String(studentId || '').toUpperCase()
  const [autoOff, setAutoOff] = useState(() => {
    try { return localStorage.getItem(key) === 'off' } catch { return false }
  })
  const gesture = useRef(null)
  const consumedTarget = useRef(null)
  const warmed = useRef(false)
  const available = mode !== 'off' && typeof window !== 'undefined' && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  const canToggleAutomatic = available && mode === 'automatic'
  const automatic = canToggleAutomatic && !autoOff

  const speak = useCallback(value => {
    if (!available || !value) return
    window.speechSynthesis.cancel()
    const utterance = new window.SpeechSynthesisUtterance(value)
    utterance.lang = 'sv-SE'
    window.speechSynthesis.speak(utterance)
  }, [available])

  useEffect(() => {
    if (automatic) speak(text)
    return () => { if (available) window.speechSynthesis.cancel() }
  }, [available, automatic, cue, speak, text])

  const clearGesture = useCallback(() => {
    clearTimeout(gesture.current?.timer)
    gesture.current = null
  }, [])

  useEffect(() => () => {
    clearGesture()
    consumedTarget.current = null
  }, [clearGesture, cue, available])

  function toggleAutomatic() {
    setAutoOff(automatic)
    try { localStorage.setItem(key, automatic ? 'off' : 'on') } catch { /* Keep the session choice. */ }
  }

  function onPointerDownCapture(event) {
    if (!event.isPrimary || event.button !== 0) return
    consumedTarget.current = null
    clearGesture()
    const target = readableTarget(event)
    if (!target) return
    if (!warmed.current && event.pointerType === 'touch') {
      // Give mobile speech engines an activation before the hold timer fires.
      warmed.current = true
      const silent = new window.SpeechSynthesisUtterance(' ')
      silent.volume = 0
      window.speechSynthesis.speak(silent)
    }
    const current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, spoke: false }
    current.timer = setTimeout(() => {
      if (!target.isConnected) return
      current.spoke = true
      consumedTarget.current = target
      speak(target.dataset.practiceSpeech)
    }, HOLD_MS)
    gesture.current = current
  }

  function onPointerMoveCapture(event) {
    const current = gesture.current
    if (current?.pointerId === event.pointerId && !current.spoke &&
      Math.hypot(event.clientX - current.x, event.clientY - current.y) > MOVE_PX) clearGesture()
  }

  function onPointerUpCapture(event) {
    const current = gesture.current
    if (current?.pointerId !== event.pointerId) return
    clearTimeout(current.timer)
    if (!current.spoke) clearGesture()
  }

  function onClickCapture(event) {
    // Touch can leave or cancel the pointer before dispatching its final click.
    const suppress = consumedTarget.current && consumedTarget.current === readableTarget(event)
    consumedTarget.current = null
    clearGesture()
    if (suppress) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function onKeyDownCapture(event) {
    consumedTarget.current = null
    clearGesture()
    if (!event.altKey || event.key.toLowerCase() !== 'l') return
    const target = readableTarget(event)
    if (!target) return
    event.preventDefault()
    speak(target.dataset.practiceSpeech)
  }

  return {
    available, canToggleAutomatic, automatic, toggleAutomatic,
    readable: (value, focusable = false) => available && value
      ? { 'data-practice-speech': value, 'aria-keyshortcuts': 'Alt+L', ...(focusable ? { tabIndex: 0 } : {}) }
      : {},
    gestureProps: available ? {
      onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture, onClickCapture, onKeyDownCapture,
      onPointerCancelCapture: clearGesture,
      onPointerLeave: clearGesture,
      onContextMenuCapture: event => { if (readableTarget(event)) event.preventDefault() }
    } : {}
  }
}
