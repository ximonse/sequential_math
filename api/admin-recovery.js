import { createHash } from 'node:crypto'
import { kv } from '@vercel/kv'
import { hashTeacherPassword, secureCompare, withCors } from './_helpers.js'

const RECOVERY_TOKEN_ENV = 'ADMIN_RECOVERY_TOKEN_HASH'
const RECOVERY_EXPIRY_ENV = 'ADMIN_RECOVERY_EXPIRES_AT'

function hashToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}

function recoveryConfig() {
  const tokenHash = String(process.env[RECOVERY_TOKEN_ENV] || '').trim()
  const expiresAt = Number(process.env[RECOVERY_EXPIRY_ENV] || 0)
  if (!/^[a-f0-9]{64}$/i.test(tokenHash) || !Number.isFinite(expiresAt)) return null
  return { tokenHash, expiresAt }
}

function recoveryPage(accounts) {
  const options = accounts.map(account => `<option value="${String(account.id).replace(/"/g, '&quot;')}">${String(account.displayName || account.username || account.id).replace(/[<>&]/g, '')}</option>`).join('')
  const accountPicker = accounts.length > 1
    ? `<label>Lärarkonto <select id="adminId" required>${options}</select></label>`
    : `<input id="adminId" type="hidden" value="${String(accounts[0]?.id || '').replace(/"/g, '&quot;')}">`
  return `<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Återställ adminåtkomst</title><body><main><h1>Återställ adminåtkomst</h1><p>Välj ditt lärarkonto. Länken återställer lösenordet och adminbehörigheten en gång och gäller i fem minuter.</p><form id="form">${accountPicker}<label>Nytt lösenord <input id="password" type="password" minlength="6" required autocomplete="new-password"></label><button>Byt lösenord</button><p id="status" role="status"></p></form></main><script>const f=document.querySelector('#form'),s=document.querySelector('#status');f.addEventListener('submit',async e=>{e.preventDefault();s.textContent='Sparar…';const r=await fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value,adminId:document.querySelector('#adminId').value})});const d=await r.json();s.textContent=d.message||d.error||'Kunde inte återställa lösenordet.';if(r.ok)f.remove()})</script></body></html>`
}

async function getRecoverableAccounts() {
  const ids = await kv.smembers('teacher_accounts:index')
  const accounts = await Promise.all((ids || []).map(id => kv.get(`teacher_account:${id}`)))
  return accounts.filter(account => account?.disabled !== true)
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const config = recoveryConfig()
  const token = String(req.query?.token || '')
  if (!config || Date.now() > config.expiresAt || !secureCompare(hashToken(token), config?.tokenHash || '')) {
    return res.status(410).json({ error: 'Återställningslänken har gått ut eller är ogiltig.' })
  }

  if (req.method === 'GET') {
    const accounts = await getRecoverableAccounts()
    if (accounts.length === 0) return res.status(409).json({ error: 'Hittade inget aktivt lärarkonto.' })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(recoveryPage(accounts))
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const password = String(req.body?.password || '')
  if (password.length < 6) return res.status(400).json({ error: 'Lösenordet måste vara minst 6 tecken.' })

  const claimKey = `admin_recovery_claim:${config.tokenHash}`
  const remainingMs = Math.max(1, config.expiresAt - Date.now())
  const claimed = await kv.set(claimKey, 'used', { nx: true, px: remainingMs })
  if (!claimed) return res.status(410).json({ error: 'Återställningslänken är redan använd.' })

  try {
    const accounts = await getRecoverableAccounts()
    const requestedAdminId = String(req.body?.adminId || '')
    const account = accounts.find(item => item.id === requestedAdminId)
    if (!account) {
      await kv.del(claimKey)
      return res.status(409).json({ error: 'Välj ett aktivt lärarkonto.' })
    }

    const { hash, salt, scheme } = hashTeacherPassword(password)
    await kv.set(`teacher_account:${account.id}`, {
      ...account,
      passwordHash: hash,
      passwordSalt: salt,
      passwordScheme: scheme,
      isAdmin: true,
      sessionVersion: Math.max(1, Number(account.sessionVersion) || 1) + 1,
      updatedAt: Date.now()
    })
    return res.status(200).json({ ok: true, message: 'Lösenordet är bytt och adminbehörigheten är återställd. Logga nu in som lärare.' })
  } catch {
    await kv.del(claimKey)
    return res.status(500).json({ error: 'Kunde inte återställa lösenordet. Försök igen.' })
  }
}
