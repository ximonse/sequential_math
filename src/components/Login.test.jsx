import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(), resolve: vi.fn(), navigate: vi.fn(), form: null,
  params: new URLSearchParams()
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useSearchParams: () => [mocks.params]
}))
vi.mock('../lib/storage', () => ({
  authenticateStudent: mocks.authenticate,
  normalizeStudentId: value => value.trim().toUpperCase()
}))
vi.mock('../lib/studentLoginClient', () => ({ resolveStudentLogin: mocks.resolve }))
vi.mock('./student/StudentLoginForm', () => ({ default: props => { mocks.form = props; return null } }))
import Login from './Login'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.params = new URLSearchParams()
  mocks.resolve.mockResolvedValue({ ok: true, studentId: 'ANNA_A1B2C3' })
  mocks.authenticate.mockResolvedValue({ ok: true, profile: { studentId: 'ANNA_A1B2C3' } })
})
describe('login identity wiring', () => {
  it('resolves a name before authenticating the canonical pupil ID', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.resolve).toHaveBeenCalledWith('Anna', 'Anna')
    expect(mocks.authenticate).toHaveBeenCalledWith('ANNA_A1B2C3', 'Anna')
    expect(mocks.navigate).toHaveBeenCalledWith('/student/ANNA_A1B2C3')
  })
  it('keeps direct ID login available', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: ' anna_a1b2c3 ', password: 'Anna' })
    expect(mocks.resolve).toHaveBeenCalledWith(' anna_a1b2c3 ', 'Anna')
    expect(mocks.authenticate).toHaveBeenCalledWith('ANNA_A1B2C3', 'Anna')
  })
  it('does not attempt profile login when identity lookup fails or is ambiguous', async () => {
    mocks.resolve.mockResolvedValue({ ok: false, error: 'Använd elev-ID' })
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.authenticate).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
  it('retains shared ticket links after resolving the identity', async () => {
    mocks.params = new URLSearchParams('ticket=ticket-1&ticket_payload=payload')
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.navigate).toHaveBeenCalledWith('/student/ANNA_A1B2C3/ticket?ticket=ticket-1&ticket_payload=payload')
  })
  it('does not navigate when authentication fails after lookup', async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, error: 'Fel lösenord' })
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
