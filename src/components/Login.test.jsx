import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), params: new URLSearchParams(), pilotLogin: vi.fn(), bootstrap: vi.fn(), pilotForm: null
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useSearchParams: () => [mocks.params] }))
vi.mock('../lib/storage', () => ({ authenticateStudent: vi.fn(), setActiveStudentClass: vi.fn() }))
vi.mock('../lib/studentLoginClient', () => ({ getClassLogin: vi.fn(), resolveStudentLogin: vi.fn() }))
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

describe('integrated login identity wiring', () => {
  it('uses personal card login as the primary route', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.pilotForm.onLogin({ loginCode: 'Gul Fyr Katt', pin: '1234' })
    expect(mocks.pilotLogin).toHaveBeenCalledWith({ loginCode: 'Gul Fyr Katt', pin: '1234' })
    expect(mocks.bootstrap).toHaveBeenCalledWith('A'.repeat(32))
  })

  it('recognizes an optional teacher class link without replacing card login', () => {
    mocks.params = new URLSearchParams('class=class-token')
    const html = renderToStaticMarkup(<Login />)
    expect(html).toContain('Logga in till din klass')
    expect(html).toContain('Hämtar klass')
  })
})
