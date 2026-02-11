import { kv } from '@vercel/kv'

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  withCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  try {
    const key = `student:${studentId}`

    if (req.method === 'GET') {
      const profile = await kv.get(key)
      return res.status(200).json({ profile: profile || null })
    }

    if (req.method === 'POST') {
      const profile = req.body?.profile
      if (!profile || typeof profile !== 'object') {
        return res.status(400).json({ error: 'Missing profile in body' })
      }

      const normalized = {
        ...profile,
        studentId
      }

      await kv.set(key, normalized)

      const indexKey = 'students:index'
      await kv.sadd(indexKey, studentId)

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}

