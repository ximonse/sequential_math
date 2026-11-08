import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'
import { themeRoleForPath } from '../../context/themeRole'

function ThemeControls() {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme()
  return <>
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="rounded border px-1 py-0 text-[11px]"
      aria-label="Välj tema"
    >
      {THEMES.map(item => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
    <label className="inline-flex items-center gap-0.5 text-[10px] font-medium whitespace-nowrap">
      <input
        type="checkbox"
        checked={highContrast}
        onChange={(event) => setHighContrast(event.target.checked)}
        aria-label="Aktivera hög kontrast"
      />
      Kontrast
    </label>
  </>
}

// Pupil pages get a small floating fold-out in the top right corner, so the theme
// choice keeps out of the way (Simon 2026-11-08). Teacher pages keep the open picker.
function ThemeSwitcher() {
  const { pathname } = useLocation()
  if (themeRoleForPath(pathname) === 'teacher') {
    return (
      <div className="relative z-50 flex justify-end p-1 sm:fixed sm:top-2 sm:right-2 sm:block sm:p-0">
        <div className="theme-switcher flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm"><ThemeControls /></div>
      </div>
    )
  }
  return <PupilThemeSwitcher />
}

function PupilThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <div ref={rootRef} className="fixed right-1 top-1 z-50">
      <button type="button" aria-label="Tema och kontrast" aria-expanded={open} title="Tema och kontrast"
        onClick={() => setOpen(value => !value)}
        className="theme-switcher flex h-6 w-7 items-center justify-center rounded-md border text-xs opacity-80 shadow-sm hover:opacity-100">
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="theme-switcher absolute right-0 top-7 flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm">
          <ThemeControls />
        </div>
      )}
    </div>
  )
}

export default ThemeSwitcher
