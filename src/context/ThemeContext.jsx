import { useEffect, useMemo, useState } from 'react'
import { isThemeValid } from '../lib/theme'
import ThemeContext from './themeContextValue'

const STORAGE_KEY = 'mathapp_theme'
const CONTRAST_STORAGE_KEY = 'mathapp_high_contrast'
const DEFAULT_THEME = 'light'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isThemeValid(saved)) {
      setTheme(saved)
    }
    const savedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY)
    if (savedContrast === '1') {
      setHighContrast(true)
    }
  }, [])

  useEffect(() => {
    const root = document.body
    root.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-dark-lime',
      'theme-psychedelic',
      'theme-real-psycadelic'
    )
    root.classList.add(`theme-${theme}`)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const root = document.body
    root.classList.toggle('contrast-high', highContrast)
    localStorage.setItem(CONTRAST_STORAGE_KEY, highContrast ? '1' : '0')
  }, [highContrast])

  const value = useMemo(
    () => ({ theme, setTheme, highContrast, setHighContrast }),
    [theme, highContrast]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
