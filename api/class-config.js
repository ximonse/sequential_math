/**
 * GET /api/class-config?classId=xxx
 * Returns enabledExtras, enabled operations and the active assignment
 * ("Aktivera för alla") for a class. No auth required (non-sensitive config).
 */
import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { resolveClassOperations } from '../src/lib/classOperations.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,OPTIONS',
    headers: 'Content-Type'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const classId = String(req.query?.classId || '').trim()
  if (!classId) {
    return res.status(400).json({ error: 'classId required' })
  }

  try {
    const kvClass = await kv.get(`class:${classId}`)
    if (!kvClass) return res.status(404).json({ error: 'Class not found' })
    const enabledExtras = Array.isArray(kvClass?.enabledExtras) ? kvClass.enabledExtras : []
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      enabledExtras,
      enabledOperations: resolveClassOperations(kvClass),
      activeAssignmentPayload: String(kvClass?.activeAssignmentPayload || '')
    })
  } catch {
    return res.status(503).json({ error: 'Class config unavailable' })
  }
}
