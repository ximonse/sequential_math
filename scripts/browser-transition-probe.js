// Paste/install through a browser debugging tool. This is not app runtime code.
// Only timings and redacted resource paths leave the browser, never pupil data.
export function installTransitionProbe() {
  const samples = []
  const ready = {
    practice: () => location.pathname.endsWith('/practice') && Boolean(document.querySelector('input[placeholder="?"]:not(:disabled)')),
    home: () => /^\/student\/[^/]+$/.test(location.pathname) && [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Fortsätt träna' && !b.disabled),
    notebook: () => location.pathname.endsWith('/diagnostic') && Boolean(document.querySelector('[aria-label="Mitt svar"]')),
  }
  let cancel = () => {}
  window.transitionProbe = {
    samples,
    arm(name, kind) {
      if (!ready[kind]) throw Error('Unknown readiness contract')
      cancel()
      const start = () => {
        const at = performance.now()
        let frame
        const finish = timedOut => {
          clearTimeout(timeout)
          cancelAnimationFrame(frame)
          samples.push({ name, ms: Math.round(performance.now() - at), timedOut,
            resources: performance.getEntriesByType('resource').filter(e => e.startTime >= at && e.initiatorType === 'fetch')
              .map(e => ({ path: new URL(e.name).pathname.replace(/[A-F0-9]{32}/g, ':pupil'), ms: Math.round(e.duration) })) })
        }
        const check = () => { if (ready[kind]()) finish(false); else frame = requestAnimationFrame(check) }
        const timeout = setTimeout(() => finish(true), 45000)
        frame = requestAnimationFrame(check)
        cancel = () => { clearTimeout(timeout); cancelAnimationFrame(frame) }
      }
      document.addEventListener('click', start, { capture: true, once: true })
      cancel = () => document.removeEventListener('click', start, true)
      return { armed: name, kind }
    },
  }
  return { installed: true }
}
