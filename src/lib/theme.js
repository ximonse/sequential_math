export const THEMES = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Mörkt' },
  { id: 'dark-lime', label: 'Mörkt gulgrön' },
  { id: 'psychedelic', label: 'Psykadelisk' },
  { id: 'real-psycadelic', label: 'Real psycadelic' }
]

export function isThemeValid(themeId) {
  return THEMES.some(t => t.id === themeId)
}
