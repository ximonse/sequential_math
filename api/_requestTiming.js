// Request-local diagnostics. No URLs, keys, identities, answers or credentials.
// Symbols also survive the internal request copies used by evidence readers.
const timing = Symbol('requestTiming')

export function beginRequestTiming(req, res) {
  if (!req || req[timing] || typeof res?.end !== 'function') return
  const state = { started: performance.now(), steps: new Map() }
  req[timing] = state
  const end = res.end
  res.end = function (...args) {
    if (!res.headersSent) {
      const steps = [...state.steps].map(([name, value]) =>
        `${name};dur=${value.ms.toFixed(1)};desc="${value.calls} calls"`)
      res.setHeader('Server-Timing', [`total;dur=${(performance.now() - state.started).toFixed(1)}`, ...steps].join(', '))
    }
    return end.apply(this, args)
  }
}

export async function measureRequestStep(req, name, work) {
  const state = req?.[timing]
  if (!state) return work()
  if (!/^[a-z-]{1,32}$/.test(name)) throw Error('Timing labels must be static phase names')
  const started = performance.now()
  try { return await work() }
  finally {
    if (state.steps.has(name) || state.steps.size < 12) {
      const value = state.steps.get(name) || { ms: 0, calls: 0 }
      state.steps.set(name, { ms: value.ms + performance.now() - started, calls: value.calls + 1 })
    }
  }
}
