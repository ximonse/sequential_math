import { expect, it } from 'vitest'
import { beginRequestTiming, measureRequestStep } from './_requestTiming.js'

it('reports overlapping request-local phases and failures without keys or pupil values', async () => {
  const headers = {}, req = {}, res = { headersSent: false, setHeader: (k, v) => { headers[k] = v }, end() { return 'ended' } }
  beginRequestTiming(req, res)
  const copied = { ...req }
  await measureRequestStep(req, 'teacher-auth', async () => true)
  await expect(measureRequestStep(copied, 'teacher-auth', async () => { throw Error('private failure') })).rejects.toThrow()
  expect(res.end()).toBe('ended')
  expect(headers['Server-Timing']).toMatch(/total;dur=\d+\.\d, teacher-auth;dur=\d+\.\d;desc="2 calls"/)
  expect(headers['Server-Timing']).not.toContain('private failure')
  const other = {}, otherHeaders = {}, otherRes = { ...res, setHeader: (k, v) => { otherHeaders[k] = v }, end() {} }
  beginRequestTiming(other, otherRes); otherRes.end()
  expect(otherHeaders['Server-Timing']).not.toContain('teacher-auth')
})
