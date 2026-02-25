import { THEMES } from '../../lib/theme'
import { useTheme } from '../../context/useTheme'

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="fixed top-3 right-3 z-50">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="theme-switcher text-xs px-2 py-1 rounded-md border"
        aria-label="Välj tema"
      >
        {THEMES.map(item => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ThemeSwitcher
