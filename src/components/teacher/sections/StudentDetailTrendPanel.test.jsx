import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentDetailTrendPanel from './StudentDetailTrendPanel'
import StudentDetailPanel from './StudentDetailPanel'
import { buildStudentDailyTrend } from '../../../lib/studentDailyTrend'
import { buildTeacherStudentViewData } from './dashboardStudentDetailViewHelpers'

const now = Date.parse('2026-09-09T12:00:00Z')
afterEach(() => vi.useRealTimers())

function makeTrend(counts) {
  const problemLog = counts.flatMap((count, index) => Array.from({ length: count }, (_, n) => ({
    timestamp: now - (counts.length - 1 - index) * 86400000,
    correct: n % 2 === 0
  })))
  return buildStudentDailyTrend({ problemLog }, now)
}

describe('student trend presentation', () => {
  it('keeps count bars and percentage points on separate labelled scales and retains a table', () => {
    const html = renderToStaticMarkup(<StudentDetailTrendPanel trend={makeTrend([5, 6, 8])} />)
    expect(html.match(/<svg /g)).toHaveLength(2)
    expect(html).toContain('Antal svar · staplar')
    expect(html).toContain('0–100 %')
    expect(html).toContain('Litet underlag')
    expect(html).toContain('2026-09-09 (idag)')
    expect(html).toContain('<table')
    expect(html).toContain('19 sparade svar')
    expect(html).not.toMatch(/text-green|text-red|↑|↓|förbättring|försämring/)
  })

  it('does not connect across small samples or missing days and preserves zero percent', () => {
    const trend = makeTrend([6, 6, 5, 6, 0, 6])
    trend.days.at(-1).accuracy = 0
    trend.days.at(-1).correct = 0
    const html = renderToStaticMarkup(<StudentDetailTrendPanel trend={trend} />)
    const accuracyChart = html.split('<svg ')[2].split('</svg>')[0]
    expect(accuracyChart.match(/<circle /g)).toHaveLength(5)
    expect(accuracyChart.match(/<line /g)).toHaveLength(4) // Three axis guides and one adjacent pair.
    expect(accuracyChart).toContain('fill="white"')
    expect(html).toContain('0 %')
  })

  it('shows limited-history and empty states without treating missing answers as zero percent', () => {
    const trend = buildStudentDailyTrend({ recentProblems: [], stats: { totalProblems: 9 } }, now)
    const html = renderToStaticMarkup(<StudentDetailTrendPanel trend={trend} />)
    expect(html).toContain('Begränsad historik.')
    expect(html).toContain('En tom dag betyder inte säkert')
    expect(html).toContain('Inga sparade svar under perioden.')
    expect(html).not.toContain('<circle')
    expect(html.match(/>—<\/td>/g)).toHaveLength(14)
  })

  it('renders through the actual student detail panel and view-data builder', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const profile = { studentId: 'QA01', name: 'Test', problemLog: [{ timestamp: now, correct: true, skill: 'addition', level: 1 }] }
    const viewData = buildTeacherStudentViewData(profile)
    const html = renderToStaticMarkup(<StudentDetailPanel
      detailStudentId="QA01" detailStudentOptions={[]} detailStudentProfile={profile}
      detailStudentRow={{ attempts: 1, operationAbilities: {} }} detailStudentViewData={viewData}
      trainingPriorityList={[]} toPercent={() => '100 %'} formatDuration={() => '0 s'}
      ActivityBadgeComponent={() => null}
      tableMasteryPanelProps={{ tables: [], levels: [], classTableBenchmarks: {}, getOperationLabel: value => value }}
      historyPanelProps={{ dailyActivityBreakdown: [], detailLevelErrorMinAttempts: 8 }}
    />)
    expect(html).toContain('Elevprofil')
    expect(html).toContain('Träning över 14 dagar')
    expect(html).toContain('1 sparade svar')
    expect(html).toContain('Visa siffror för alla 14 dagar')
  })
})
