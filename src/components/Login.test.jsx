import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams()] }))
vi.mock('../lib/storage', () => ({ authenticateStudent: vi.fn(), setActiveStudentClass: vi.fn() }))
vi.mock('../lib/studentLoginClient', () => ({ getClassLogin: vi.fn(), resolveStudentLogin: vi.fn() }))
import Login from './Login'
it('asks pupils to use their teacher class link', () => { expect(renderToStaticMarkup(<Login />)).toContain('Hämtar klass…') })