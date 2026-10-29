#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

// Read existing user-scoped credentials when a desktop client was started
// before setx. Keep secrets out of MCP configuration, arguments and logs.
try {
  const expectedUser = process.env.MATH_MCP_EXPECTED_USERNAME
  if (process.platform !== 'win32' || !expectedUser || !process.env.MATH_MCP_EXPECTED_TEACHER_ID) throw Error()
  const encoded = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "$u=[Environment]::GetEnvironmentVariable('MATH_TEACHER_USER','User'); $p=[Environment]::GetEnvironmentVariable('MATH_TEACHER_PASS','User'); $j=@{username=$u;password=$p}|ConvertTo-Json -Compress; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))"],
  { encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
  if (typeof credentials.username !== 'string' || credentials.username.toLowerCase() !== expectedUser.toLowerCase()
    || typeof credentials.password !== 'string' || !credentials.password) throw Error()
  process.env.MATH_TEACHER_USER = credentials.username
  process.env.MATH_TEACHER_PASS = credentials.password
} catch {
  console.error('Sequential Math: configure the selected Windows user credentials and exact expected teacher identity. No app request was made.')
  process.exit(1)
}

await import('./stdio.mjs')
