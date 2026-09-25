// Starts the real app (Vite) together with the real /api handlers, backed by
// an in-memory database. Nothing here talks to production or Vercel.
import { build, createServer, preview } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = path.join(root, 'api')

function resolveApiRoute(urlPath) {
  const segments = urlPath.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const query = {}
  let dir = apiDir
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const last = i === segments.length - 1
    if (last && fs.existsSync(path.join(dir, `${segment}.js`))) return { file: path.join(dir, `${segment}.js`), query }
    if (fs.existsSync(path.join(dir, segment)) && fs.statSync(path.join(dir, segment)).isDirectory()) { dir = path.join(dir, segment); continue }
    const entries = fs.readdirSync(dir)
    const dynamicDir = entries.find(name => /^\[.+\]$/.test(name) && fs.statSync(path.join(dir, name)).isDirectory())
    const dynamicFile = entries.find(name => /^\[.+\]\.js$/.test(name))
    if (last && dynamicFile) { query[dynamicFile.slice(1, -4)] = segment; return { file: path.join(dir, dynamicFile), query } }
    if (dynamicDir) { query[dynamicDir.slice(1, -1)] = segment; dir = path.join(dir, dynamicDir); continue }
    if (last && dynamicDir === undefined && dynamicFile === undefined) return null
  }
  return null
}

function readBody(req) {
  return new Promise(resolve => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve(raw) } })
  })
}

function decorate(res) {
  res.status = code => { res.statusCode = code; return res }
  res.json = data => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return res }
  res.send = data => { res.end(typeof data === 'string' ? data : JSON.stringify(data)); return res }
  return res
}

function robotApiMiddleware(server) {
  return async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        try {
          if (url.pathname.startsWith('/__robot/')) {
            const control = await server.ssrLoadModule(path.join(root, 'robots/seed.js'))
            const body = req.method === 'POST' ? await readBody(req) : {}
            const result = await control.handleControl(url.pathname.slice('/__robot/'.length), body)
            decorate(res).status(200).json(result)
            return
          }
          if (!url.pathname.startsWith('/api/')) return next()
          const route = resolveApiRoute(url.pathname)
          if (!route) { decorate(res).status(404).json({ error: 'No robot route' }); return }
          const mod = await server.ssrLoadModule(route.file)
          req.query = { ...Object.fromEntries(url.searchParams), ...route.query }
          req.body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : undefined
          await mod.default(req, decorate(res))
        } catch (error) {
          console.error('[robot-api]', req.method, url.pathname, error)
          if (!res.headersSent) decorate(res).status(500).json({ error: String(error?.message || error) })
        }
  }
}

function robotApi(ssrServer) {
  return {
    name: 'robot-api',
    configureServer(server) { server.middlewares.use(robotApiMiddleware(ssrServer || server)) },
    configurePreviewServer(server) { server.middlewares.use(robotApiMiddleware(ssrServer)) }
  }
}

const alias = { '@vercel/kv': path.join(root, 'robots/memoryKv.js') }

// By default the robots test the production bundle, which is what pupils get
// (no React StrictMode double effects). ROBOT_DEV=1 uses the dev server
// instead: faster to start, but StrictMode can show dev-only faults.
export async function startRobotServer({ port = 5288, production = process.env.ROBOT_DEV !== '1' } = {}) {
  process.env.APP_ORIGIN = `http://localhost:${port}`
  process.env.PILOT_ENROLLMENT_SECRET ||= 'robot-enrollment-secret'
  process.env.TEACHER_API_PASSWORD_ROTATION_SECRET ||= 'robot-teacher-token-secret'
  if (!production) {
    const server = await createServer({
      root, configFile: false, logLevel: 'warn',
      plugins: [react(), robotApi()],
      resolve: { alias },
      server: { port, strictPort: true, host: 'localhost' }
    })
    await server.listen()
    return { url: `http://localhost:${port}`, close: () => server.close() }
  }
  const outDir = path.join(root, 'robots/.build')
  await build({ root, configFile: false, logLevel: 'warn', plugins: [react()], build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 2000 } })
  const ssrServer = await createServer({ root, configFile: false, logLevel: 'warn', resolve: { alias }, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  const server = await preview({
    root, configFile: false, logLevel: 'warn',
    plugins: [robotApi(ssrServer)],
    build: { outDir },
    preview: { port, strictPort: true, host: 'localhost' }
  })
  return { url: `http://localhost:${port}`, close: async () => { await server.close(); await ssrServer.close() } }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startRobotServer({ port: Number(process.env.ROBOT_PORT || 5288) })
  console.log(`Robot server: ${url}`)
}
