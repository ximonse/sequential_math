import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'

function ThemeSwitcher() {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme()

  return (
    <div className="relative z-50 flex justify-end p-1 sm:fixed sm:top-2 sm:right-2 sm:block sm:p-0">
      <div className="theme-switcher flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm">
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
      </div>
    </div>
  )
}

export default ThemeSwitcher
