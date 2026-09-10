import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(), resolve: vi.fn(), navigate: vi.fn(), form: null,
  params: new URLSearchParams(), setActiveClass: vi.fn(), clearSession: vi.fn()
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useSearchParams: () => [mocks.params]
}))
vi.mock('../lib/storage', () => ({
  authenticateStudent: mocks.authenticate,
  clearActiveStudentSession: mocks.clearSession,
  setActiveStudentClass: mocks.setActiveClass
}))
vi.mock('../lib/studentLoginClient', () => ({ resolveStudentLogin: mocks.resolve }))
vi.mock('./student/StudentLoginForm', () => ({ default: props => { mocks.form = props; return null } }))
vi.mock('./student/AssignedClassPicker', () => ({ default: () => null }))
import Login from './Login'

const assignments = [{ classId: 'class-a', className: '6A', schoolName: 'Ribbaskolan' }]
beforeEach(() => {
  vi.clearAllMocks()
  mocks.params = new URLSearchParams()
  mocks.resolve.mockResolvedValue({ ok: true, studentId: 'ANNA_A1B2C3', assignments })
  mocks.authenticate.mockResolvedValue({ ok: true, profile: { studentId: 'ANNA_A1B2C3' } })
})
describe('login identity wiring', () => {
  it('authenticates the canonical ID before showing only assigned groups', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.resolve).toHaveBeenCalledWith('Anna', 'Anna')
    expect(mocks.authenticate).toHaveBeenCalledWith('ANNA_A1B2C3', 'Anna')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
  it('keeps direct ID login available', async () => {
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: ' anna_a1b2c3 ', password: 'Anna' })
    expect(mocks.resolve).toHaveBeenCalledWith(' anna_a1b2c3 ', 'Anna')
    expect(mocks.authenticate).toHaveBeenCalledWith('ANNA_A1B2C3', 'Anna')
  })
  it('does not attempt profile login when identity lookup fails or is ambiguous', async () => {
    mocks.resolve.mockResolvedValue({ ok: false, error: 'Use ID' })
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.authenticate).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
  it('does not continue when profile authentication fails after lookup', async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, error: 'Wrong password' })
    renderToStaticMarkup(<Login />)
    await mocks.form.onLogin({ name: 'Anna', password: 'Anna' })
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
