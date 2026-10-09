import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { loadPlan, savePlan, saveCard, createCard } from './project-map-store.mjs'

export const defaultPlanPath = fileURLToPath(new URL('../docs/screening-map/plan.json', import.meta.url))
const templatePath = fileURLToPath(new URL('../docs/screening-map/preview.template.html', import.meta.url))
const editorPath = fileURLToPath(new URL('../docs/screening-map/editor.js', import.meta.url))
export function createMapServer(planPath = defaultPlanPath, token = randomBytes(32).toString('hex')) {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
    try {
      const port = res.socket.localPort
      const origin = `http://127.0.0.1:${port}`
      if (req.headers.host !== `127.0.0.1:${port}`) return reply(403, { error: 'Otillåten värd' })
      if (req.method === 'GET' && (req.url === '/' || req.url === '/screening-map.html')) {
        const data = await loadPlan(planPath)
        const template = await readFile(templatePath, 'utf8')
        const escape = obj => JSON.stringify(obj).replaceAll('<', '\\u003c')
        const editor = (await readFile(editorPath, 'utf8')).replace('__CONNECTION__', escape({ revision: data.revision, token }))
        const html = template.replace('__PLAN__', escape(data.plan)).replace('__EDITOR__', editor)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html)
      }
      if (req.method === 'GET' && req.url === '/api/plan') return reply(200, await loadPlan(planPath))
      if (req.method === 'POST' && req.url === '/api/plan') {
        if (req.headers.origin !== origin || req.headers['x-plan-token'] !== token || req.headers['content-type'] !== 'application/json') return reply(403, { error: 'Otillåten skrivning' })
        const chunks = []; let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 2_000_000) return reply(413, { error: 'Planen är för stor' })
          chunks.push(chunk)
        }
        const { action, plan, baseRevision, baseCard, card } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (action === 'create_card') return reply(200, await createCard(planPath, card))
        if (baseCard && card) return reply(200, await saveCard(planPath, baseCard, card))
        return reply(200, await savePlan(planPath, plan, baseRevision))
      }
      reply(404, { error: 'Finns inte' })
    } catch (error) { reply(error.status || 400, { error: error.message }) }
  })
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PROJECT_MAP_PORT || 5325)
  createMapServer().listen(port, '127.0.0.1', () => console.log(`Projektkarta: http://127.0.0.1:${port}/screening-map.html\nPlan: ${defaultPlanPath}`))
}
