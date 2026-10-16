import { isComparableAttentionPass, mergeAttentionHistory } from './attentionHistory'

export const attentionPercent = rate => rate.percent === null ? '–' : `${Math.round(rate.percent)} %`
export const attentionNumber = value => value === null ? '–' : value.toLocaleString('sv-SE', { maximumFractionDigits: 1 })

export function attentionRate(correct, total) {
  return { correct, total, percent: total > 0 ? 100 * correct / total : null }
}

export function attentionPassStatistics(result) {
  const s = result.summary
  if (result.mode === 'multi') return {
    accuracy: attentionRate(s.correct, s.total),
    repeat: attentionRate(s.repeat.correct, s.repeat.total),
    switch: attentionRate(s.switch.correct, s.switch.total),
    switchTimeDifference: s.repeat.median !== null && s.switch.median !== null ? s.switch.median - s.repeat.median : null
  }
  return {
    go: attentionRate(s.hits, s.hits + s.misses),
    stop: attentionRate(s.withheld, s.withheld + s.wrong),
    earlyPerMinute: result.activeMs > 0 ? s.early * 60000 / result.activeMs : null
  }
}

export function filterAttentionResults(history, { mode = 'all', days = 'all', now = Date.now() } = {}) {
  const cutoff = days === 'all' ? null : now - Number(days) * 86400000
  return mergeAttentionHistory(history).filter(result => (mode === 'all' || result.mode === mode)
    && (cutoff === null || (result.finishedAt >= cutoff && result.finishedAt <= now)))
}

// Pool counts, never average percentages or pass medians. Aborted passes are
// visible in the history but cannot change the completed-pass comparison.
export function summarizeAttentionResults(results) {
  return ['discover', 'choose', 'multi'].map(mode => {
    const passes = results.filter(result => result.mode === mode)
    const complete = passes.filter(isComparableAttentionPass)
    const sum = field => complete.reduce((total, result) => total + field(result.summary), 0)
    const activeMs = complete.reduce((total, result) => total + result.activeMs, 0)
    const early = mode === 'multi' ? null : sum(s => s.early)
    return {
      mode, completed: complete.length, aborted: passes.filter(result => result.aborted).length,
      legacy: passes.filter(result => result.mode === 'discover' && result.version === 1).length, activeMs,
      ...(mode === 'multi' ? {
        accuracy: attentionRate(sum(s => s.correct), sum(s => s.total)),
        repeat: attentionRate(sum(s => s.repeat.correct), sum(s => s.repeat.total)),
        switch: attentionRate(sum(s => s.switch.correct), sum(s => s.switch.total))
      } : {
        go: attentionRate(sum(s => s.hits), sum(s => s.hits + s.misses)),
        stop: attentionRate(sum(s => s.withheld), sum(s => s.withheld + s.wrong)),
        early, earlyPerMinute: activeMs > 0 ? early * 60000 / activeMs : null
      })
    }
  }).filter(group => group.completed + group.aborted + group.legacy > 0)
}
