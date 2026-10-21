const SEEN_KEY = 'mathapp_notebook_tutorial_seen'

// Robots drive the notebook in automated browsers; they open the guide with the button instead.
export function shouldShowNotebookTutorial() {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false
  try { return localStorage.getItem(SEEN_KEY) !== '1' } catch { return false }
}

export function markNotebookTutorialSeen() {
  try { localStorage.setItem(SEEN_KEY, '1') } catch { /* Private mode: the guide may show again. */ }
}
