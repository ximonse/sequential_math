import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'

function ThemeSwitcher() {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme()

  return (
    <div className="theme-switcher rounded-lg border px-2 py-1.5 flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
        <span className="text-gray-600">Tema</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border bg-white"
          aria-label="Välj tema"
        >
          {THEMES.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => setHighContrast(!highContrast)}
        aria-pressed={highContrast}
        className={`rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap ${
          highContrast
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Kontrast
      </button>
    </div>
  )
}

export default ThemeSwitcher
