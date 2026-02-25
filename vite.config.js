import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const BACKUP_PATH = path.resolve(
  'C:/Users/ximon/Kodprojekt/sequential_math_original/backups/studentdata_20260223_203428/cloud_export_20260223_195714/cloud_student_profiles_full.json'
)

const devDataImport = {
  name: 'dev-data-import',
  configureServer(server) {
    server.middlewares.use('/dev-import-students', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }
      try {
        const MAX_PROBLEMS_PER_STUDENT = 150
        const PROBLEM_FIELDS = ['problemType','correct','errorCategory','patterns','timestamp','timeSpent','speedTimeSec','skillTag','targetLevel','difficulty','values','result']
        const raw = fs.readFileSync(BACKUP_PATH, 'utf8')
        const profiles = JSON.parse(raw)
        const storageEntries = {}
        const studentsList = []
        for (const [studentId, profile] of Object.entries(profiles)) {
          const recentProblems = (Array.isArray(profile.recentProblems) ? profile.recentProblems : [])
            .slice(-MAX_PROBLEMS_PER_STUDENT)
            .map(p => Object.fromEntries(PROBLEM_FIELDS.filter(f => f in p).map(f => [f, p[f]])))
          const trimmed = { ...profile, recentProblems }
          storageEntries[`mathapp_student_${studentId}`] = trimmed
          studentsList.push({
            studentId,
            name: profile.name || studentId,
            lastActive: profile.recentProblems?.slice(-1)[0]?.timestamp || Date.now()
          })
        }
        res.end(JSON.stringify({ storageEntries, studentsList }))
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: String(err.message) }))
      }
    })
  }
}

const devApiMock = {
  name: 'dev-api-mock',
  configureServer(server) {
    server.middlewares.use('/api/teacher-auth', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method === 'GET') {
        res.end(JSON.stringify({ configured: true }))
      } else if (req.method === 'POST') {
        res.end(JSON.stringify({ ok: true, token: 'dev-token', expiresAt: null }))
      } else {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      }
    })
  }
}

export default defineConfig({
  plugins: [react(), devApiMock, devDataImport],
  build: {
    chunkSizeWarningLimit: 700
  }
})
