export const THEMES = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Morkt' },
  { id: 'dark-lime', label: 'Morkt gulgron' },
  { id: 'psychedelic', label: 'Psykadelisk' }
]

export function isThemeValid(themeId) {
  return THEMES.some(t => t.id === themeId)
}
