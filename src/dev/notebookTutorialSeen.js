const SEEN_KEY = 'mathapp_notebook_tutorial_seen'

// Pupils share iPads, so the flag is kept per pupil; the teacher prototype has no pupil.
const keyFor = scope => (scope ? `${SEEN_KEY}:${scope}` : SEEN_KEY)

// Robots drive the notebook in automated browsers; they open the guide with the button instead.
export function shouldShowNotebookTutorial(scope = '') {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false
  try { return localStorage.getItem(keyFor(scope)) !== '1' } catch { return false }
}

export function markNotebookTutorialSeen(scope = '') {
  try { localStorage.setItem(keyFor(scope), '1') } catch { /* Private mode: the guide may show again. */ }
}
