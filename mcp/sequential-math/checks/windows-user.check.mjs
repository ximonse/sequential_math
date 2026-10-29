import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('Windows credential launcher refuses incomplete account binding without disclosing inherited secrets', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/windows-user.mjs', import.meta.url))], {
    env: { ...process.env, MATH_MCP_EXPECTED_USERNAME: 'adminperson', MATH_MCP_EXPECTED_TEACHER_ID: '',
      MATH_TEACHER_USER: 'inherited-user-sentinel', MATH_TEACHER_PASS: 'inherited-secret-sentinel' },
    encoding: 'utf8', timeout: 10000, windowsHide: true
  })
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /No app request was made/u)
  assert.doesNotMatch(result.stderr, /inherited-user-sentinel|inherited-secret-sentinel/u)
})
