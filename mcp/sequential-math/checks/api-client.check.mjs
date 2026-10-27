import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TeacherApiClient, validateTarget } from '../src/api-client.mjs'

const credentials = () => ({ username: 'synthetic-user', password: 'NEVER_OUTPUT_PASSWORD' })
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const marker = { synthetic: true, storage: 'memory', service: 'sequential-math-robots' }

test('target configuration blocks implicit production, URL credentials, query injection and remote HTTP', () => {
  for (const url of [undefined, 'https://matematik.ximon.se', 'http://localhost:123/a', 'http://user:secret@localhost:123', 'http://localhost:123?token=secret']) {
    assert.throws(() => validateTarget(url), { name: 'Error' })
  }
  assert.throws(() => validateTarget('http://example.com', 'approved'))
  assert.equal(validateTarget('https://example.com', 'approved'), 'https://example.com')
  assert.equal(validateTarget('http://localhost:5391'), 'http://localhost:5391')
})

test('synthetic mode verifies memory storage before reading credentials or logging in', async () => {
  let reads = 0, requests = 0
  const api = new TeacherApiClient({ baseUrl: 'http://localhost:5391', getCredentials: () => { reads++; return credentials() },
    fetchImpl: async () => { requests++; return json({ synthetic: false }) } })
  await assert.rejects(api.request('/api/students'), { code: 'synthetic_target_required' })
  assert.equal(reads, 0)
  assert.equal(requests, 1)
})

test('concurrent reads share login and never expose login fields to their caller', async () => {
  let logins = 0
  const api = new TeacherApiClient({ baseUrl: 'http://localhost:5391', getCredentials: credentials,
    fetchImpl: async (url, options) => {
      assert.equal(options.redirect, 'error')
      if (url.endsWith('/mcp-info')) return json(marker)
      if (url.endsWith('/teacher-login')) { logins++; return json({ token: 'NEVER_OUTPUT_TOKEN' }) }
      assert.equal(options.headers['x-teacher-token'], 'NEVER_OUTPUT_TOKEN')
      return json({ profiles: [] })
    } })
  const results = await Promise.all([api.request('/api/students'), api.request('/api/students')])
  assert.equal(logins, 1)
  assert.doesNotMatch(JSON.stringify(results), /NEVER_OUTPUT|synthetic-user/u)
})

test('expired reads can reauthenticate, but report writes are never retried automatically', async () => {
  let logins = 0, calls = 0
  const api = new TeacherApiClient({ baseUrl: 'http://localhost:5391', getCredentials: credentials,
    fetchImpl: async url => {
      if (url.endsWith('/mcp-info')) return json(marker)
      if (url.endsWith('/teacher-login')) { logins++; return json({ token: `token-${logins}` }) }
      calls++; return calls === 1 || calls === 3 ? json({}, 401) : json({ profiles: [] })
    } })
  await api.request('/api/students')
  assert.equal(logins, 2)
  await assert.rejects(api.request('/api/teacher-students/PUPIL?resource=analysis', { body: { action: 'create_report' } }), { code: 'authentication_required' })
  assert.equal(logins, 2)
  assert.equal(calls, 3)
})

test('errors and unknown routes do not echo credentials, raw API failures, redirects or request bodies', async () => {
  let calls = 0
  const api = new TeacherApiClient({ baseUrl: 'http://localhost:5391', getCredentials: credentials,
    fetchImpl: async url => {
      calls++
      if (url.endsWith('/mcp-info')) return json(marker)
      if (url.endsWith('/teacher-login')) return json({ token: 'NEVER_OUTPUT_TOKEN' })
      return json({ error: 'NEVER_OUTPUT_PASSWORD NEVER_OUTPUT_TOKEN synthetic-user' }, 500)
    } })
  await assert.rejects(api.request('/api/admin/delete-everything'), { code: 'unsupported_route' })
  assert.equal(calls, 0)
  try { await api.request('/api/students'); assert.fail('Expected error') }
  catch (error) { assert.equal(error.code, 'app_unavailable'); assert.doesNotMatch(error.message, /NEVER_OUTPUT|synthetic-user/u) }
  api.fetch = async () => { throw new Error('NEVER_OUTPUT_PASSWORD') }
  await assert.rejects(api.request('/api/students'), error => error.code === 'connection_failed' && !error.message.includes('NEVER_OUTPUT'))
})
