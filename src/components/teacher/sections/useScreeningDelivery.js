import { useRef, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'

export default function useScreeningDelivery(onChanged) {
  const [delivery, setDelivery] = useState(null)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  async function send(snapshot) {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    const results = { ...snapshot.results }
    setDelivery({ ...snapshot, results })
    try {
      for (const dispatch of snapshot.dispatches) {
        if (results[dispatch.classId]?.ok) continue
        try {
          const response = await diagnosticRequest('/api/teacher-diagnostic-assignments', { method: 'POST', body: JSON.stringify({
            ...snapshot.payload, requestId: snapshot.requestId, classId: dispatch.classId, studentIds: dispatch.studentIds
          }) })
          results[dispatch.classId] = response.ok
            ? { ok: true, count: response.data.assignment.studentIds.length }
            : { ok: false, message: response.data.error || 'Kunde inte bekräfta utdelningen.' }
        } catch {
          results[dispatch.classId] = { ok: false, message: 'Kvittens saknas. Utdelningen kan ha sparats; försök igen för att bekräfta samma utdelning.' }
        }
        setDelivery({ ...snapshot, results: { ...results } })
      }
      onChanged()
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  return { delivery, busy, send }
}
