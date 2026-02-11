import { kv } from '@vercel/kv'

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  withCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const ids = await kv.smembers('students:index')
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ profiles: [] })
    }

    const profiles = await Promise.all(
      ids.map(async (id) => kv.get(`student:${String(id).toUpperCase()}`))
    )

    return res.status(200).json({
      profiles: profiles.filter(Boolean)
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}

