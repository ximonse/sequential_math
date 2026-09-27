import { afterEach, describe, expect, it } from 'vitest'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { createLocalTestClassPlugin } from './vite.config.js'
import * as testDataTransfer from './src/lib/localTestDataTransfer.js'

const servers = new Set()

async function startMiddlewareServer() {
  let middleware
  createLocalTestClassPlugin().configureServer({
    middlewares: { use(handler) { middleware = handler } },
    ssrLoadModule: async () => testDataTransfer
  })
  const server = createHttpServer((req, res) => middleware(req, res, () => {
    res.statusCode = 404
    res.end()
  }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  servers.add(server)
  return `http://127.0.0.1:${server.address().port}`
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { host: `localhost:${new URL(baseUrl).port}`, ...options.headers }
  })
  return { status: response.status, body: await response.json() }
}

async function requestWithHost(baseUrl, path, host) {
  const address = new URL(`${baseUrl}${path}`)
  return new Promise((resolve, reject) => {
    const req = httpRequest(address, { method: 'POST', headers: { host, 'content-type': 'application/json' } }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }))
    })
    req.on('error', reject)
    req.end('{}')
  })
}

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise(resolve => server.close(resolve))))
  servers.clear()
})

describe('localhost test-class middleware', () => {
  it('imports an isolated class and serves its list, class, and full profiles', async () => {
    const baseUrl = await startMiddlewareServer()
    const imported = await request(baseUrl, '/__local-test-class/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        format: 'sequential-math-test-class-v1',
        className: 'Testklass',
        students: [{
          name: 'Verkligt namn som inte ska följa med',
          grade: 6,
          historyComplete: true,
          attempts: [{ timestamp: Date.now() - 86_400_000, correct: true, skill: 'multiplication',
            values: { a: 7, b: 3 }, timeSpent: 4, synthetic: false }],
          completions: [{ table: 7, timestamp: Date.now() - 86_400_000 }]
        }]
      })
    })

    expect(imported.status).toBe(200)
    expect(imported.body).toMatchObject({ ok: true, className: expect.any(String), studentCount: 1 })

    const [studentList, classList] = await Promise.all([
      request(baseUrl, '/api/students'),
      request(baseUrl, '/api/teacher-classes')
    ])
    expect(studentList.status).toBe(200)
    expect(studentList.body.profiles).toHaveLength(1)
    expect(studentList.body.profiles[0].name).not.toContain('Verkligt namn')
    expect(studentList.body.profiles[0].classId).toBe(imported.body.classId)
    expect(studentList.body.profiles[0]).not.toHaveProperty('problemLog')
    expect(studentList.body.profiles[0].auth).not.toHaveProperty('passwordHash')
    expect(classList.body.classes[0].studentIds).toEqual([studentList.body.profiles[0].studentId])

    const detail = await request(baseUrl, `/api/teacher-students/${studentList.body.profiles[0].studentId}`)
    expect(detail.status).toBe(200)
    expect(detail.body.profile.problemLog).toHaveLength(1)
    expect(detail.body.profile.problemLog[0]).toMatchObject({ correct: true, synthetic: false, values: { a: 7, b: 3 } })
    expect(detail.body.profile).not.toHaveProperty('auth.passwordHash')
  })

  it('rejects non-loopback Host headers and unsupported methods', async () => {
    const baseUrl = await startMiddlewareServer()
    const remote = await requestWithHost(baseUrl, '/__local-test-class/import', 'example.test')
    expect(remote.status).toBe(403)

    const wrongMethod = await request(baseUrl, '/__local-test-class/import', { method: 'GET' })
    expect(wrongMethod.status).toBe(405)
  })
})

it('serves group and class counts from the same imported answers', async () => {
  const baseUrl = await startMiddlewareServer()
  const imported = await request(baseUrl, '/__local-test-class/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      format: 'sequential-math-test-class-v1',
      students: [0, 1, 2, 3].map((index) => ({
        grade: 6,
        historyComplete: true,
        attempts: Array.from({ length: index + 1 }, (_, row) => ({
          timestamp: Date.now() - 86_400_000 + row * 1000,
          correct: row % 2 === 0,
          operation: 'multiplication',
          problemType: 'mul_table_drill',
          selectionReason: 'table_drill',
          skillTag: 'mul_table_7',
          values: { a: 7, b: row + 1 }
        })),
        completions: []
      }))
    })
  })
  expect(imported.status).toBe(200)
  const [studentList, classList, groupList] = await Promise.all([
    request(baseUrl, '/api/students'),
    request(baseUrl, '/api/teacher-classes'),
    request(baseUrl, '/api/teacher-groups')
  ])
  const classIds = classList.body.classes[0].studentIds
  const groups = groupList.body.groups
  expect(groups).toHaveLength(2)
  expect([...groups[0].pupilIds, ...groups[1].pupilIds].sort()).toEqual([...classIds].sort())
  const byId = new Map(studentList.body.profiles.map(profile => [profile.studentId, profile]))
  const count = ids => ids.reduce((sum, id) => sum + byId.get(id).stats.lifetimeProblems, 0)
  expect(count(classIds)).toBe(10)
  expect(groups.reduce((sum, group) => sum + count(group.pupilIds), 0)).toBe(count(classIds))
})
