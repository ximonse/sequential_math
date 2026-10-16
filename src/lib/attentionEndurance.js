export const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2)
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null
}

// Descriptive within-pass observations, never a diagnosis or an inferred motive.
export function attentionEndurance(pass) {
  if (!Array.isArray(pass.trials)) return null
  const kinds = pass.mode === 'multi' ? ['repeat', 'switch'] : ['go']
  const series = kinds.map(kind => {
    const trials = pass.trials.filter(trial => trial.kind === kind)
    const bins = Array.from({ length: 4 }, (_, index) => {
      const start = index * 30000
      const samples = trials.filter(trial => trial.at >= start && trial.at < start + 30000)
      const hits = samples.filter(trial => trial.outcome === 'hit')
      return { start, total: samples.length, misses: samples.filter(trial => trial.outcome === 'miss').length,
        hits: hits.length, median: median(hits.map(trial => trial.responseMs)) }
    })
    const baseline = bins[0]
    const slower = bin => baseline.hits >= 3 && bin.hits >= 2
      && bin.median >= baseline.median * 1.5 && bin.median - baseline.median >= 300
    const sustained = bins.find((bin, i) => i > 0 && i < 3 && slower(bin) && slower(bins[i + 1]))
    const canAssess = baseline.hits >= 3 && bins.some((bin, i) => i > 0 && i < 3 && bin.hits >= 2 && bins[i + 1].hits >= 2)
    return { kind, bins, canAssess, slowerFrom: sustained?.start ?? null }
  })
  const required = pass.trials.filter(trial => trial.kind !== 'stop')
  const missedPair = required.find((trial, i) => trial.outcome === 'miss' && required[i + 1]?.outcome === 'miss')
  return { series, unansweredFrom: pass.completionReason === 'no_response' ? pass.activeMs - 5000 : missedPair?.at ?? null }
}
