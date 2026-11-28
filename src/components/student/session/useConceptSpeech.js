import { useCallback, useEffect, useState } from 'react'

export function useConceptSpeech({ studentId, defaultEnabled, cue, text }) {
  const key = `concept-speech:${String(studentId || '').toUpperCase()}`
  const [override, setOverride] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === 'on' || saved === 'off' ? saved : null
    } catch {
      return null
    }
  })
  const supported = typeof window !== 'undefined' && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  const enabled = override ? override === 'on' : defaultEnabled
  const speak = useCallback(() => {
    if (!supported || !text) return
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'sv-SE'
    synth.speak(utterance)
  }, [supported, text])

  useEffect(() => {
    if (enabled) speak()
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [cue, enabled, speak, supported])

  function setEnabled(value) {
    const setting = value ? 'on' : 'off'
    setOverride(setting)
    try {
      localStorage.setItem(key, setting)
    } catch {
      // The pupil can still change the setting for the current session.
    }
  }

  return { supported, enabled, setEnabled, speak }
}
