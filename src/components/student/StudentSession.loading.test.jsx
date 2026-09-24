import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// The practice view renders once before the profile has loaded. Reading the
// profile without a guard there blanks the screen for every pupil.
const mocks = vi.hoisted(() => ({ params: new URLSearchParams() }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/student/x/practice', search: '' }),
  useParams: () => ({ studentId: 'A'.repeat(32) }),
  useSearchParams: () => [mocks.params, vi.fn()]
}))
vi.mock('../../lib/pilotStudentRuntime', () => ({
  getPilotStudentRuntime: () => ({
    bootstrap: vi.fn().mockResolvedValue({ ok: false }),
    persistCheckpoint: vi.fn(),
    getSyncStatus: () => ({ state: 'idle', pendingCount: 0 }),
    subscribeSyncStatus: () => () => {}
  })
}))

import StudentSession from './StudentSession'

beforeEach(() => {
  mocks.params = new URLSearchParams()
})

describe('StudentSession innan profilen laddats', () => {
  it('renderar laddningsläget utan att krascha', () => {
    expect(() => renderToStaticMarkup(<StudentSession />)).not.toThrow()
  })
})
