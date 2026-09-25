import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isThemeValid } from '../lib/theme'
import { themeRoleForPath } from './themeRole'
import ThemeContext from './themeContextValue'

const THEME_CLASSES = [
  'theme-light',
  'theme-dark',
  'theme-dark-lime',
  'theme-psychedelic',
  'theme-real-psycadelic'
]
const DEFAULT_THEME = 'light'

function themeStorageKey(role) {
  return `mathapp_theme_${role}`
}

function contrastStorageKey(role) {
  return `mathapp_high_contrast_${role}`
}

function readStoredTheme(role) {
  try {
    const saved = localStorage.getItem(themeStorageKey(role))
      // Fall back to the single key used before themes were split per role.
      ?? localStorage.getItem('mathapp_theme')
    return saved && isThemeValid(saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function readStoredContrast(role) {
  try {
    const saved = localStorage.getItem(contrastStorageKey(role))
      ?? localStorage.getItem('mathapp_high_contrast')
    return saved === '1'
  } catch {
    return false
  }
}

export function ThemeProvider({ children }) {
  const location = useLocation()
  const role = themeRoleForPath(location.pathname)
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    setTheme(readStoredTheme(role))
    setHighContrast(readStoredContrast(role))
  }, [role])

  useEffect(() => {
    const root = document.body
    root.classList.remove(...THEME_CLASSES)
    root.classList.add(`theme-${theme}`)
    try {
      localStorage.setItem(themeStorageKey(role), theme)
    } catch {
      // A full quota must not break the page.
    }
  }, [theme, role])

  useEffect(() => {
    const root = document.body
    root.classList.toggle('contrast-high', highContrast)
    try {
      localStorage.setItem(contrastStorageKey(role), highContrast ? '1' : '0')
    } catch {
      // A full quota must not break the page.
    }
  }, [highContrast, role])

  const value = useMemo(
    () => ({ theme, setTheme, highContrast, setHighContrast }),
    [theme, highContrast]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
