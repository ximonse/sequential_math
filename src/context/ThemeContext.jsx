import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isThemeValid } from '../lib/theme'

const STORAGE_KEY = 'mathapp_theme'
const DEFAULT_THEME = 'light'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isThemeValid(saved)) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    const root = document.body
    root.classList.remove('theme-light', 'theme-dark', 'theme-dark-lime', 'theme-psychedelic')
    root.classList.add(`theme-${theme}`)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}

