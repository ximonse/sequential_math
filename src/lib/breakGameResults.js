const REASONS = ['time_limit', 'collision', 'aborted']

export function isValidBreakGameResult(value) {
  return Boolean(value && value.version === 1 && ['pong', 'snake'].includes(value.game)
    && typeof value.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
    && typeof value.gameVersion === 'string' && value.gameVersion.length > 0 && value.gameVersion.length <= 40
    && Number.isFinite(value.startedAt) && value.startedAt > 0
    && Number.isFinite(value.finishedAt) && value.finishedAt >= value.startedAt
    && Number.isFinite(value.durationMs) && value.durationMs >= 0 && value.durationMs <= 90000
    && Number.isInteger(value.score) && value.score >= 0 && value.score <= 10000
    && REASONS.includes(value.reason) && !(value.game === 'pong' && value.reason === 'collision')
    && (value.reason !== 'time_limit' || value.durationMs === 90000)
    && (value.game === 'snake' ? value.playerScore === null && value.computerScore === null
      : [value.playerScore, value.computerScore].every(score => Number.isInteger(score) && score >= 0 && score <= 10000)))
}

// This is a game history, independent of mathematics, mastery and highscores.
export function recordBreakGameResult(profile, result) {
  if (!isValidBreakGameResult(result)) return false
  const history = Array.isArray(profile.breakGameResults) ? profile.breakGameResults : []
  if (history.some(item => item.id === result.id)) return false
  profile.breakGameResults = [...history, Object.fromEntries(['id', 'version', 'game', 'gameVersion', 'startedAt', 'finishedAt', 'durationMs', 'score', 'playerScore', 'computerScore', 'reason', 'classIdAtAttempt'].map(key => [key, result[key]]))]
    .filter(item => item.finishedAt >= result.finishedAt - 30 * 86400000)
    .sort((a, b) => a.finishedAt - b.finishedAt).slice(-1000)
  return true
}

export function summarizeBreakGames(profiles, { from = 0, to = Infinity, classId = null } = {}) {
  const rounds = profiles.flatMap(profile => (profile.breakGameResults || [])
    .filter(result => isValidBreakGameResult(result) && result.finishedAt >= from && result.finishedAt < to
      && (!classId || result.classIdAtAttempt === classId))
    .map(result => ({ ...result, pupil: profile.studentId })))
  const games = {}
  for (const game of ['pong', 'snake']) {
    const rows = rounds.filter(row => row.game === game)
    const completed = rows.filter(row => row.reason !== 'aborted')
    const mean = (items, field) => items.length ? items.reduce((sum, row) => sum + row[field], 0) / items.length : null
    games[game] = {
      rounds: rows.length, pupils: new Set(rows.map(row => row.pupil)).size,
      completed: completed.length, aborted: rows.length - completed.length,
      meanDurationSec: completed.length ? mean(completed, 'durationMs') / 1000 : null,
      meanScore: game === 'snake' ? mean(completed, 'score') : null,
      meanPlayerScore: game === 'pong' ? mean(completed, 'playerScore') : null,
      meanComputerScore: game === 'pong' ? mean(completed, 'computerScore') : null,
      wins: game === 'pong' ? completed.filter(row => row.playerScore > row.computerScore).length : null,
      draws: game === 'pong' ? completed.filter(row => row.playerScore === row.computerScore).length : null,
      losses: game === 'pong' ? completed.filter(row => row.playerScore < row.computerScore).length : null,
      survived: game === 'snake' ? completed.filter(row => row.reason === 'time_limit').length : null,
      collisions: game === 'snake' ? completed.filter(row => row.reason === 'collision').length : null,
      versions: [...new Set(rows.map(row => row.gameVersion))]
    }
  }
  return { coverage: 'recorded_rounds_only', from, to: Number.isFinite(to) ? to : null, games }
}
