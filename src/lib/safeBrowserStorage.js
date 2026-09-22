export function readBrowserPreference(key, fallback = null) {
  try { return window.localStorage.getItem(key) ?? fallback } catch { return fallback }
}

export function writeBrowserPreference(key, value) {
  try { window.localStorage.setItem(key, String(value)); return true }
  catch (error) { console.warn('Could not save browser preference', { key, error }); return false }
}

export function removeBrowserPreference(key) {
  try { window.localStorage.removeItem(key) } catch { /* preference removal is best effort */ }
}
