import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: new URLSearchParams(),
  pilotLogin: vi.fn(), bootstrap: vi.fn(), pilotForm: null
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useSearchParams: () => [mocks.params]
}))
vi.mock('../lib/studentSessionClient', () => ({ loginStudentSession: mocks.pilotLogin }))
vi.mock('../lib/pilotStudentRuntime', () => ({ getPilotStudentRuntime: () => ({ bootstrap: mocks.bootstrap }) }))
vi.mock('./student/PilotStudentLoginForm', () => ({ default: props => { mocks.pilotForm = props; return null } }))
import Login from './Login'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.params = new URLSearchParams()
  mocks.pilotLogin.mockResolvedValue({ ok: true, student: { studentId: 'A'.repeat(32) } })
  mocks.bootstrap.mockResolvedValue({ ok: true, profile: { studentId: 'A'.repeat(32) } })
})
describe('login identity wiring', () => {
  it('uses card login only and starts a secure session from a QR or code credential', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.pilotForm.onLogin({ loginCode: 'Gul Fyr Katt', pin: '1234' })
    expect(mocks.pilotLogin).toHaveBeenCalledWith({ loginCode: 'Gul Fyr Katt', pin: '1234' })
    expect(mocks.bootstrap).toHaveBeenCalledWith('A'.repeat(32))
  })
})
