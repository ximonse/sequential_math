import { expect, it } from 'vitest'
import { isValidBreakGameResult, recordBreakGameResult, summarizeBreakGames } from './breakGameResults'

export const gameRound = overrides => ({ id: 'round-1', version: 1, game: 'pong', gameVersion: 'pong-90s-v1',
  startedAt: 1000, finishedAt: 91000, durationMs: 90000, score: 90, playerScore: 3, computerScore: 2,
  reason: 'time_limit', classIdAtAttempt: 'class-a', ...overrides })

it('records losses, collisions and aborted rounds without changing mathematics or keeping arbitrary fields', () => {
  const profile = { stats: { correctAnswers: 12 }, problemLog: [{ correct: true }] }
  expect(recordBreakGameResult(profile, gameRound({ unexpected: 'discard' }))).toBe(true)
  expect(recordBreakGameResult(profile, gameRound())).toBe(false)
  expect(profile.breakGameResults[0].unexpected).toBeUndefined()
  expect(profile.stats.correctAnswers).toBe(12)
  expect(profile.problemLog).toEqual([{ correct: true }])
  for (const invalid of [{ durationMs: 90001 }, { playerScore: -1 }, { reason: 'wall' }, { reason: 'collision' }]) {
    expect(isValidBreakGameResult(gameRound(invalid))).toBe(false)
  }
})

it('summarizes the period and exact class, with aborted rounds outside the completed-game denominator', () => {
  const snake = { game: 'snake', gameVersion: 'snake-90s-v1', playerScore: null, computerScore: null, score: 4 }
  const profiles = [{ studentId: 'PUPIL', breakGameResults: [gameRound(), gameRound({ id: 'loss', playerScore: 0 }),
    gameRound({ id: 'abort', reason: 'aborted', durationMs: 2000 }),
    gameRound({ id: 'collision', ...snake, reason: 'collision', durationMs: 8000 }),
    gameRound({ id: 'survived', ...snake, reason: 'time_limit' }),
    gameRound({ id: 'other-class', classIdAtAttempt: 'class-b' })] }]
  const summary = summarizeBreakGames(profiles, { classId: 'class-a', from: 0, to: 92000 })
  expect(summary.games.pong).toMatchObject({ rounds: 3, completed: 2, aborted: 1, wins: 1, losses: 1, draws: 0, meanDurationSec: 90, meanScore: null, meanPlayerScore: 1.5, meanComputerScore: 2, pupils: 1 })
  expect(summary.games.snake).toMatchObject({ rounds: 2, survived: 1, collisions: 1, meanDurationSec: 49 })
  expect(summarizeBreakGames(profiles, { from: 92000 }).games.pong.meanScore).toBeNull()
})
