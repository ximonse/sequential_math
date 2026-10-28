import { useEffect, useRef, useState } from 'react'
import { diagnosticRequest as request } from './diagnosticRequest.js'
import { emptyScreeningDraft } from '../../../domains/arithmetic/screeningDraft.js'

const endpoint = '/api/teacher-diagnostic-assignments?resource=drafts'
const field = 'rounded border border-slate-400 px-2 py-1'

export default function ScreeningDraftsPanel({ content, onLoad, disabled, onBusy, onDirtyChange }) {
  const [drafts, setDrafts] = useState([]), [draft, setDraft] = useState(null), [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [pendingAction, setPendingAction] = useState(null)
  const [baseline, setBaseline] = useState(() => JSON.stringify(content))
  const pendingSave = useRef(null)
  const dirty = JSON.stringify(content) !== baseline
  useEffect(() => {
    let active = true
    request(endpoint).then(result => {
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte läsa utkasten.')
      if (active) setDrafts(previous => {
        const entries = new Map(result.data.drafts.map(value => [value.draftId, value]))
        for (const value of previous) if (!entries.has(value.draftId) || entries.get(value.draftId).revision < value.revision) entries.set(value.draftId, value)
        return [...entries.values()].sort((a, b) => b.updatedAt - a.updatedAt)
      })
    }).catch(error => { if (active) setMessage(error.message) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    onDirtyChange?.(dirty || pendingSave.current !== null)
    return () => onDirtyChange?.(false)
  }, [dirty, busy, onDirtyChange])
  useEffect(() => {
    if (!dirty && !pendingSave.current) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  async function run(action) {
    setBusy(true); onBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(error instanceof TypeError ? 'Kunde inte nå servern. Din text är kvar.' : error.message || 'Kunde inte nå servern. Din text är kvar.') }
    finally { setBusy(false); onBusy(false) }
  }
  function loadContent(value, number, record) {
    onLoad(structuredClone(value)); setBaseline(JSON.stringify(value)); setVersion(number); setDraft(record); setPendingAction(null)
  }
  function replace(action) {
    if (pendingSave.current) { setMessage('Kontrollera den osäkra sparningen med Försök spara igen innan du byter utkast.'); return }
    if (dirty) setPendingAction(() => action)
    else void action()
  }
  async function open(id) {
    await run(async () => {
      const result = await request(`${endpoint}&draftId=${encodeURIComponent(id)}`)
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna utkastet.')
      const record = result.data.draft, latest = record.versions.at(-1)
      loadContent(latest.content, latest.version, record)
      setMessage('Utkastet är öppnat. Mottagarvalet är oförändrat.')
    })
  }
  async function save(copy = false) {
    await run(async () => {
      if (copy && pendingSave.current) throw new Error('Kontrollera den osäkra sparningen med Försök spara igen först.')
      const command = pendingSave.current || { action: 'save_draft', draftId: !copy && draft ? draft.draftId : crypto.randomUUID(),
        expectedRevision: !copy && draft ? draft.revision : 0, requestId: crypto.randomUUID(), content: structuredClone(content) }
      pendingSave.current = command
      const result = await request(endpoint, { method: 'POST', body: JSON.stringify(command) })
      if (!result.ok) {
        if (result.status >= 400 && result.status < 500) pendingSave.current = null
        throw new Error(result.data.error || 'Sparningen kunde inte bekräftas. Försök spara igen med samma begäran.')
      }
      const record = result.data.draft, latest = record.versions.at(-1)
      const saved = record.versions.find(value => value.requestId === command.requestId)
      if (!saved) throw new Error('Sparningen kunde inte bekräftas. Försök spara igen.')
      pendingSave.current = null; setDraft(record); setVersion(saved.version); setBaseline(JSON.stringify(command.content))
      setDrafts(previous => [{ draftId: record.draftId, revision: record.revision, titleSv: latest.content.titleSv, updatedAt: latest.createdAt },
        ...previous.filter(value => value.draftId !== record.draftId)])
      setMessage(`Utkastet är sparat som version ${saved.version}. Inget har delats ut.${saved.version < record.revision ? ' En nyare version finns också; läs senaste version för att jämföra.' : ''}`)
    })
  }
  return <section aria-label="Screeningutkast" className="my-3 rounded border border-slate-300 bg-slate-50 p-3 text-sm">
    <h3 className="font-semibold">Utkast för genomgång</h3>
    <p>Spara frågorna för att gå igenom och ändra dem senare. Utkastet är privat och delas inte ut.</p>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label>Sparade utkast <select className={field} disabled={busy || disabled} value={draft?.draftId || ''}
        onChange={event => { const id = event.target.value; if (id) replace(() => open(id)) }}>
        <option value="">Välj utkast</option>{drafts.map(value => <option key={value.draftId} value={value.draftId}>{value.titleSv} · version {value.revision}</option>)}
      </select></label>
      <button type="button" className={field} disabled={busy || disabled} onClick={() => replace(() => loadContent(emptyScreeningDraft(), 0, null))}>Nytt utkast</button>
      <button type="button" className={field} disabled={busy || disabled || (!dirty && Boolean(draft) && !pendingSave.current)} onClick={() => { void save() }}>
        {busy ? 'Arbetar…' : pendingSave.current ? 'Försök spara igen' : draft ? 'Spara ny version' : 'Spara utkast'}
      </button>
      {draft && <button type="button" className={field} disabled={busy || disabled} onClick={() => { void save(true) }}>Spara som nytt utkast</button>}
      {draft && <button type="button" className={field} disabled={busy || disabled} onClick={() => replace(() => open(draft.draftId))}>Läs senaste version</button>}
      {draft && <label>Version <select aria-label="Utkastversion" className={field} disabled={busy || disabled} value={version}
        onChange={event => { const selected = draft.versions.find(value => value.version === Number(event.target.value)); replace(() => loadContent(selected.content, selected.version, draft)) }}>
        {draft.versions.map(value => <option key={value.version} value={value.version}>{value.version}{value.version === draft.revision ? ' · senaste' : ''}</option>)}
      </select></label>}
    </div>
    {disabled && <p>Återanvända samlingar delas ut oförändrade. Välj en ny samling för att skapa ett redigerbart utkast.</p>}
    {pendingAction && <div role="alert" className="mt-2">
      <p>Du har osparade ändringar. Vill du lämna dem och öppna det valda utkastet?</p>
      <button type="button" className={field} onClick={() => { const action = pendingAction; setPendingAction(null); void action() }}>Öppna utan att spara</button>{' '}
      <button type="button" className={field} onClick={() => setPendingAction(null)}>Behåll mina ändringar</button>
    </div>}
    <p className="mt-2" role="status">{message || (dirty ? 'Osparade ändringar.' : draft ? `Version ${version} är öppnad.` : 'Inget sparat utkast öppnat.')}</p>
  </section>
}
