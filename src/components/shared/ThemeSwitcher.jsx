import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'

function ThemeSwitcher() {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme()

  return (
    <div className="relative z-50 flex justify-end p-2 sm:fixed sm:top-3 sm:right-3 sm:block sm:p-0">
      <div className="theme-switcher rounded-md border px-2 py-1.5 flex items-center gap-2">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border"
          aria-label="Välj tema"
        >
          {THEMES.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
            aria-label="Aktivera hög kontrast"
          />
          Kontrast
        </label>
      </div>
    </div>
  )
}

export default ThemeSwitcher
