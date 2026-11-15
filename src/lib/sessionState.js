import { useEffect, useState } from 'react'

// A view choice that survives a reload in the same tab (rule R2), while a new
// tab or a new login starts from the default. `isValid` drops stale values.
export function readSessionChoice(key, isValid = () => true) {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return undefined
    const value = JSON.parse(raw)
    return isValid(value) ? value : undefined
  } catch { return undefined }
}

export function useSessionState(key, initial, isValid) {
  const [value, setValue] = useState(() => {
    const saved = readSessionChoice(key, isValid)
    return saved === undefined ? (typeof initial === 'function' ? initial() : initial) : saved
  })
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* Preferences are optional. */ }
  }, [key, value])
  return [value, setValue]
}
