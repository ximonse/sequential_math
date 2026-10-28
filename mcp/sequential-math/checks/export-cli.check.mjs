import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { readFile, mkdir } from 'node:fs/promises'
import { launchDemo, demoDescription } from '../src/demo.mjs'

test('the export CLI resolves exact authorized classes and clock periods against real synthetic handlers', async () => {
  const demo = launchDemo(), meta = demoDescription()
  try {
    const config = await demo.ready
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const out = fileURLToPath(new URL('../../../robots/test-results/export-cli/', import.meta.url))
    await mkdir(out, { recursive: true })
    const env = { PATH: process.env.PATH, ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
      MATH_TEACHER_USER: config.username, MATH_TEACHER_PASS: config.password }
    const run = args => promisify(execFile)(process.execPath, ['scripts/teacher-data.mjs', '--base', config.baseUrl,
      '--out', out, ...args], { cwd: root, env, windowsHide: true, timeout: 20000 })
    const listing = await run(['--list-classes'])
    assert.match(listing.stdout, /mcp-demo\s+MCP-demoklass/u)
    assert.doesNotMatch(listing.stdout, /mcp-other|password|loginToken/u)
    const pupil = '4D43502044656D6F204F6E6500000000'
    const result = await run(['--class-id', 'mcp-demo', '--pupil', pupil, '--evidence', '--from', `${meta.from}T00:00`, '--to', meta.to])
    const path = result.stdout.trim().split(/\r?\n/u).at(-1)
    const saved = JSON.parse(await readFile(path, 'utf8'))
    assert.equal(saved.total, 4)
    assert.equal(saved.classId, 'mcp-demo')
    assert.equal(saved.period.from, `${meta.from}T00:00`)
    assert.doesNotMatch(JSON.stringify(saved), /password|loginToken/u)
    const named = await run(['--class-exact', 'MCP-demoklass', '--from', meta.from, '--to', meta.to])
    assert.match(named.stdout, /2 elev\(er\), 10 uppgifter/u)
    await assert.rejects(run(['--class-id', 'mcp-other']), /Klass-ID saknas/u)
  } finally { await demo.close() }
})
