import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { randomBytes } from 'node:crypto'
import { toTeacherListProfile } from './src/lib/teacherListProfile.js'

const LOCAL_TEST_IMPORT_PATH = '/__local-test-class/import'
const MAX_IMPORT_BYTES = 100 * 1024 * 1024

function isLoopbackRequest(req) {
  const host = String(req.headers?.host || '').trim().toLowerCase()
  let hostname = ''
  try {
    hostname = new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, '')
  } catch {
    return false
  }
  const address = String(req.socket?.remoteAddress || '').toLowerCase().replace(/^::ffff:/, '')
  const loopbackHost = hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(hostname)
  const loopbackClient = address === '::1' || /^127(?:\.\d{1,3}){3}$/.test(address)
  return loopbackHost && loopbackClient
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function withoutCredentialMaterial(profile) {
  const safe = { ...profile }
  for (const field of ['passwordHash', 'passwordSalt', 'passwordScheme', 'password']) delete safe[field]
  if (safe.auth && typeof safe.auth === 'object') {
    safe.auth = { ...safe.auth }
    for (const field of ['passwordHash', 'passwordSalt', 'passwordScheme', 'password']) delete safe.auth[field]
  }
  return safe
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_IMPORT_BYTES) throw Object.assign(new Error('Importfilen är för stor.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Filen innehåller inte giltig JSON.'), { status: 400 })
  }
}

export function createLocalTestClassPlugin() {
  const importedClasses = new Map()
  const importedProfiles = new Map()
  const importedGroups = new Map()
  let importerPromise = null

  return {
    name: 'local-test-class',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        const isImport = pathname === LOCAL_TEST_IMPORT_PATH
        const isMockApi = pathname === '/api/students'
          || pathname === '/api/teacher-classes'
          || pathname === '/api/teacher-groups'
          || /^\/api\/teacher-students\/[^/]+\/?$/.test(pathname)
        if (!isImport && !isMockApi) return next()
        if (!isLoopbackRequest(req)) return sendJson(res, 403, { error: 'Endast lokal åtkomst är tillåten.' })

        if (isImport) {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
          try {
            const data = await readJsonBody(req)
            const classId = `local-test-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
            importerPromise ||= server.ssrLoadModule('/src/lib/localTestDataTransfer.js')
            const { createImportedTestClass } = await importerPromise
            const created = createImportedTestClass(data, classId)
            if (!created?.classRecord || !Array.isArray(created.profiles)) {
              return sendJson(res, 400, { error: 'Testdatafilen kunde inte importeras.' })
            }
            importedClasses.set(created.classRecord.id, created.classRecord)
            for (const profile of created.profiles) importedProfiles.set(String(profile.studentId).toUpperCase(), profile)
            if (created.profiles.length >= 2) {
              for (const [index, letter] of ['A', 'B'].entries()) {
                importedGroups.set(`${classId}-group-${letter.toLowerCase()}`, {
                  id: `${classId}-group-${letter.toLowerCase()}`,
                  name: `Testgrupp ${letter} (${created.classRecord.name})`,
                  pupilIds: created.profiles.filter((_, pupilIndex) => pupilIndex % 2 === index).map(profile => profile.studentId),
                  teacherIds: ['local-teacher'],
                  schoolId: null
                })
              }
            }
            return sendJson(res, 200, {
              ok: true,
              classId: created.classRecord.id,
              className: created.classRecord.name,
              studentCount: created.profiles.length
            })
          } catch (error) {
            return sendJson(res, error.status || 400, { error: error.message || 'Kunde inte läsa testdatafilen.' })
          }
        }

        if (pathname === '/api/students') {
          return sendJson(res, 200, { profiles: [...importedProfiles.values()].map(toTeacherListProfile).filter(Boolean) })
        }
        if (pathname === '/api/teacher-classes') {
          return sendJson(res, 200, { classes: [...importedClasses.values()] })
        }
        if (pathname === '/api/teacher-groups') {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'Testgrupper kan inte ändras här.' })
          return sendJson(res, 200, { groups: [...importedGroups.values()], teachers: [] })
        }

        const studentId = decodeURIComponent(pathname.split('/').at(-1)).toUpperCase()
        const profile = importedProfiles.get(studentId)
        if (!profile) return sendJson(res, 404, { error: 'Student not found' })
        return sendJson(res, 200, { profile: withoutCredentialMaterial(profile) })
      })
    }
  }
}

const devApiMock = {
  name: 'dev-api-mock',
  configureServer(server) {
    const respondToTeacherLogin = (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }
      res.end(JSON.stringify({
        token: 'dev-token',
        teacherId: 'local-teacher',
        displayName: 'Lokal lärare',
        classIds: [],
        isAdmin: true,
        isPrimaryAdmin: true
      }))
    }

    server.middlewares.use('/api/teacher-login', respondToTeacherLogin)
    server.middlewares.use('/api/teacher-auth', (req, res) => {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ configured: true }))
        return
      }
      respondToTeacherLogin(req, res)
    })
  }
}

export default defineConfig({
  plugins: [react(), devApiMock, createLocalTestClassPlugin()],
  build: {
    chunkSizeWarningLimit: 700
  }
})
