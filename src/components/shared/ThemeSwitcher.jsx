import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'

function ThemeSwitcher() {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme()

  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="theme-switcher rounded-md border px-2 py-1.5 space-y-1.5">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border w-full"
          aria-label="Välj tema"
        >
          {THEMES.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-medium">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
            aria-label="Aktivera hög kontrast"
          />
          Hög kontrast
        </label>
      </div>
    </div>
  )
}

export default ThemeSwitcher
