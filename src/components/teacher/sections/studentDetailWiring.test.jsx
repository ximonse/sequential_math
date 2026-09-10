import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { useDashboardViewData } from './useDashboardViewData'
import DashboardLayout from './DashboardLayout'
import { createStudentProfile } from '../../../lib/studentProfile'
import { toTeacherListProfile } from '../../../lib/teacherListProfile'

vi.mock('./DashboardHeaderBar', () => ({ default: () => null }))
vi.mock('./CloudSyncStatusPanel', () => ({ default: () => null }))
vi.mock('./ClassFilterPanel', () => ({ default: () => null }))
vi.mock('./StudentDetailPanel', () => ({ default: () => <p>Student detail is visible</p> }))
vi.mock('../../../lib/teacherAuth', () => ({ isTeacherAdmin: () => false }))

afterEach(() => vi.unstubAllGlobals())

describe('student detail wiring', () => {
  it('opens a direct student view despite the saved collapsed preference', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ detail: true, overview: true, support: true }) })
    const html = renderToStaticMarkup(<DashboardLayout
      isDirectStudentView detailStudentId="QA01" students={[]} filteredStudents={[]}
      selectedClassIds={[]} supportRows={[]} classStats={{}} classFilterOptions={[]}
    />)
    expect(html).toContain('Student detail is visible')
  })

  it('preserves the collapsed preference in the ordinary dashboard', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ detail: true, overview: true, support: true }) })
    const html = renderToStaticMarkup(<DashboardLayout
      isDirectStudentView={false} students={[]} filteredStudents={[]}
      selectedClassIds={[]} supportRows={[]} classStats={{}} classFilterOptions={[]}
    />)
    expect(html).not.toContain('Student detail is visible')
  })

  it('uses the loaded full profile for the detail row and trend, leaving list rows separate', () => {
    const fullProfile = createStudentProfile('QA01', 'Full profile')
    fullProfile.problemLog = Array.from({ length: 12 }, (_, index) => ({
      timestamp: Date.now() - index * 1000, correct: true, skill: 'addition', level: 1
    }))
    fullProfile.recentProblems = fullProfile.problemLog
    fullProfile.stats.lifetimeProblems = 12
    const listProfile = toTeacherListProfile({ ...fullProfile, name: 'List snapshot', recentProblems: fullProfile.problemLog.slice(-1) })
    let result
    function Harness({ detailStudentProfile }) {
      result = useDashboardViewData({
        students: [listProfile], filteredStudents: [listProfile], classes: [], selectedClassIds: [],
        isDirectStudentView: true, detailStudentId: 'QA01', activeAssignment: null,
        classNameById: new Map(), detailStudentProfile, detailStudentSource: [listProfile],
        tableSelectedStudentIds: [], tableStudentSearch: '', passwordResetSearch: '',
        detailLevelErrorMinAttempts: 8, defaultWeeklyGoal: 30
      })
      return null
    }
    renderToStaticMarkup(<Harness detailStudentProfile={fullProfile} />)
    expect(result.detailStudentRow.name).toBe('Full profile')
    expect(result.filteredRows[0].name).toBe('List snapshot')
    expect(result.detailStudentViewData.dailyTrend.days.reduce((sum, day) => sum + day.attempts, 0)).toBe(12)
    renderToStaticMarkup(<Harness detailStudentProfile={null} />)
    expect(result.detailStudentRow).toBeNull()
    renderToStaticMarkup(<Harness detailStudentProfile={{ ...fullProfile, studentId: 'OTHER' }} />)
    expect(result.detailStudentRow).toBeNull()
  })
})
