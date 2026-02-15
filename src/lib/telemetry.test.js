import { describe, expect, it } from 'vitest'
import {
  addTelemetryDurationMs,
  ensureTelemetry,
  incrementTelemetryDailyMetric,
  recordTelemetryEvent,
  summarizeTelemetryWindow
} from './telemetry'

describe('telemetry', () => {
  it('aggregates daily metrics in today/week', () => {
    const profile = {}
    const now = new Date('2026-02-15T12:00:00').getTime()
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)

    incrementTelemetryDailyMetric(profile, 'practice_answers', 5, now)
    addTelemetryDurationMs(profile, 'engaged_ms', 180000, now)
    incrementTelemetryDailyMetric(profile, 'practice_answers', 3, twoDaysAgo)

    const summary = summarizeTelemetryWindow(profile, { now })
    expect(summary.today.practice_answers).toBe(5)
    expect(summary.today.engaged_ms).toBe(180000)
    expect(summary.week.practice_answers).toBe(8)
  })

  it('trims event list to max cap', () => {
    const profile = {}
    ensureTelemetry(profile)
    for (let i = 0; i < 1300; i += 1) {
      recordTelemetryEvent(profile, 'practice_answer', { index: i }, 1000 + i)
    }

    expect(profile.telemetry.events.length).toBe(1200)
    expect(profile.telemetry.events[0].payload.index).toBe(100)
  })
})
