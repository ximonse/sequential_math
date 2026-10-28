#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { TeacherApiClient } from './api-client.mjs'
import { createMathServer } from './server.mjs'
import { demoDescription, launchDemo } from './demo.mjs'

const screening = process.argv.includes('--demo-screening')
const demo = process.argv.includes('--demo') || screening
const allowReportWrites = process.argv.includes('--allow-report-writes') || process.env.MATH_MCP_ALLOW_REPORT_WRITES === 'true'
const allowMaterialWrites = process.argv.includes('--allow-material-writes') || process.env.MATH_MCP_ALLOW_MATERIAL_WRITES === 'true'
let demoApp, apiPromise
async function getApi() {
  if (!apiPromise) apiPromise = (async () => {
    if (demo) {
      demoApp ||= launchDemo({ screening })
      const config = await demoApp.ready
      return new TeacherApiClient({ baseUrl: config.baseUrl, getCredentials: () => ({ username: config.username, password: config.password }) })
    }
    return new TeacherApiClient({ baseUrl: process.env.MATH_MCP_BASE_URL, mode: process.env.MATH_MCP_DATA_MODE || 'synthetic',
      getCredentials: () => ({ username: process.env.MATH_TEACHER_USER, password: process.env.MATH_TEACHER_PASS }) })
  })().catch(error => { apiPromise = null; throw error })
  return apiPromise
}
const server = createMathServer({ getApi, allowReportWrites, allowMaterialWrites, dataMode: demo ? 'synthetic' : process.env.MATH_MCP_DATA_MODE || 'synthetic',
  demo: demo ? demoDescription(screening) : null })
let closed = false
async function close() {
  if (closed) return
  closed = true
  await demoApp?.close()
  await server.close()
}
process.on('SIGINT', () => close().catch(() => {}))
process.on('SIGTERM', () => close().catch(() => {}))
process.stdin.on('end', () => close().catch(() => {}))
process.on('exit', () => { if (demoApp) demoApp.close().catch(() => {}) })
try { await server.connect(new StdioServerTransport()) }
catch { console.error('Sequential Math MCP could not start. Check the local installation.'); process.exitCode = 1 }
