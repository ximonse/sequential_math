export const THEMES = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Morkt' },
  { id: 'dark-lime', label: 'Morkt gulgron' },
  { id: 'psychedelic', label: 'Psykadelisk' },
  { id: 'real-psycadelic', label: 'Real psycadelic' }
]

export function isThemeValid(themeId) {
  return THEMES.some(t => t.id === themeId)
}
