/**
 * GET /api/class-config?classId=xxx
 * Returns enabledExtras for a class. No auth required (non-sensitive config).
 */
import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const classId = String(req.query?.classId || '').trim()
  if (!classId) {
    return res.status(200).json({ enabledExtras: [] })
  }

  try {
    const classRecord = await kv.get(`class:${classId}`)
    const enabledExtras = Array.isArray(classRecord?.enabledExtras)
      ? classRecord.enabledExtras
      : []
    return res.status(200).json({ enabledExtras })
  } catch {
    return res.status(200).json({ enabledExtras: [] })
  }
}
