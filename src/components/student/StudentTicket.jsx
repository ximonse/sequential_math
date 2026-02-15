import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  clearActiveStudentSession,
  getOrCreateProfileWithSync,
  isStudentSessionActive,
  saveProfile
} from '../../lib/storage'
import {
  decodeTicketPayload,
  getTicketDispatchById,
  getTicketResponseForDispatch,
  isTicketCorrectnessVisible,
  recordTicketResponse
} from '../../lib/tickets'
import {
  markStudentPresence,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SAVE_THROTTLE_MS
} from '../../lib/studentPresence'
import {
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../lib/telemetry'

function StudentTicket() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [answer, setAnswer] = useState('')
  const [savedResponse, setSavedResponse] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const openedDispatchRef = useRef('')
  const openedAtRef = useRef(0)
  const presenceSyncRef = useRef({
    lastSavedAt: 0
  })

  const dispatchIdFromQuery = String(searchParams.get('ticket') || '')
  const payloadFromQuery = useMemo(
    () => decodeTicketPayload(searchParams.get('ticket_payload')),
    [searchParams]
  )

  useEffect(() => {
    if (!isStudentSessionActive(studentId)) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`/?redirect=${redirect}`, { replace: true })
      return undefined
    }

    let active = true
    ;(async () => {
      const loadedProfile = await getOrCreateProfileWithSync(studentId, null, 4, { createIfMissing: false })
      if (!active) return
      if (!loadedProfile) {
        clearActiveStudentSession()
        navigate('/', { replace: true })
        return
      }
      setProfile(loadedProfile)
    })()

    return () => { active = false }
  }, [studentId, navigate, location.pathname, location.search])

  const resolvedTicket = useMemo(() => {
    if (payloadFromQuery) return payloadFromQuery

    const inboxPayload = profile?.ticketInbox?.activePayload
    if (inboxPayload && typeof inboxPayload === 'object') {
      if (!dispatchIdFromQuery || dispatchIdFromQuery === inboxPayload.dispatchId) {
        return inboxPayload
      }
    }

    if (dispatchIdFromQuery) {
      const localDispatch = getTicketDispatchById(dispatchIdFromQuery)
      if (localDispatch) {
        return {
          dispatchId: localDispatch.id,
          ticketId: localDispatch.ticketId || '',
          title: localDispatch.title || '',
          kind: localDispatch.kind || 'start',
          question: localDispatch.question || '',
          answer: localDispatch.answer || '',
          showCorrectnessOnSubmit: localDispatch.showCorrectnessOnSubmit !== false
        }
      }
    }

    return null
  }, [payloadFromQuery, profile, dispatchIdFromQuery])

  useEffect(() => {
    if (!profile || !resolvedTicket?.dispatchId) return
    const existing = getTicketResponseForDispatch(profile, resolvedTicket.dispatchId)
    setSavedResponse(existing)
    setAnswer(existing?.studentAnswer || '')
    openedAtRef.current = Date.now()
  }, [profile, resolvedTicket])

  useEffect(() => {
    if (!profile || !resolvedTicket?.dispatchId) return
    if (openedDispatchRef.current === resolvedTicket.dispatchId) return
    const now = Date.now()
    openedDispatchRef.current = resolvedTicket.dispatchId
    recordTelemetryEvent(profile, 'ticket_opened', {
      dispatchId: resolvedTicket.dispatchId,
      kind: resolvedTicket.kind || 'start'
    }, now)
    incrementTelemetryDailyMetric(profile, 'ticket_opened', 1, now)
    saveProfile(profile)
  }, [profile, resolvedTicket])

  const updateTicketPresence = useCallback((options = {}) => {
    if (!profile) return
    const now = Date.now()
    markStudentPresence(profile, {
      now,
      page: 'ticket',
      interaction: options.interaction === true,
      inFocus: typeof options.inFocus === 'boolean' ? options.inFocus : undefined
    })

    const force = options.force === true
    if (!force && (now - presenceSyncRef.current.lastSavedAt) < PRESENCE_SAVE_THROTTLE_MS) {
      return
    }
    saveProfile(profile)
    presenceSyncRef.current.lastSavedAt = now
  }, [profile])

  useEffect(() => {
    if (!profile) return undefined

    updateTicketPresence({ force: true, interaction: true })

    const onVisibilityChange = () => updateTicketPresence({ force: true })
    const onFocus = () => updateTicketPresence({ force: true })
    const onBlur = () => updateTicketPresence({ force: true, inFocus: false })
    const onInteraction = () => updateTicketPresence({ interaction: true })

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('touchstart', onInteraction)

    const heartbeat = setInterval(() => {
      updateTicketPresence()
    }, PRESENCE_HEARTBEAT_MS)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
      updateTicketPresence({ force: true, inFocus: false })
    }
  }, [profile, updateTicketPresence])

  const shouldShowCorrectness = isTicketCorrectnessVisible(profile, savedResponse, resolvedTicket)

  useEffect(() => {
    if (!profile || !resolvedTicket?.dispatchId || !savedResponse || shouldShowCorrectness) return undefined
    let active = true
    const timer = setInterval(() => {
      void (async () => {
        const latest = await getOrCreateProfileWithSync(studentId, null, 4, { createIfMissing: false })
        if (!active || !latest) return
        setProfile(latest)
        const latestResponse = getTicketResponseForDispatch(latest, resolvedTicket.dispatchId)
        if (latestResponse) setSavedResponse(latestResponse)
      })()
    }, 10000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [profile, studentId, resolvedTicket, savedResponse, shouldShowCorrectness])

  const handleSubmit = () => {
    if (!profile || !resolvedTicket || answer.trim() === '') return
    if (isSubmitting) return
    setIsSubmitting(true)

    const response = recordTicketResponse(profile, {
      dispatchId: resolvedTicket.dispatchId,
      ticketId: resolvedTicket.ticketId,
      title: resolvedTicket.title,
      kind: resolvedTicket.kind,
      question: resolvedTicket.question,
      answer: resolvedTicket.answer,
      studentAnswer: answer,
      responseTimeSec: openedAtRef.current > 0
        ? (Date.now() - openedAtRef.current) / 1000
        : null,
      showCorrectnessOnSubmit: resolvedTicket.showCorrectnessOnSubmit !== false
    })

    const now = Date.now()
    recordTelemetryEvent(profile, 'ticket_submitted', {
      dispatchId: resolvedTicket.dispatchId,
      kind: resolvedTicket.kind || 'start',
      correct: response?.isCorrect === true,
      responseTimeSec: Number.isFinite(Number(response?.responseTimeSec))
        ? Number(Number(response.responseTimeSec).toFixed(2))
        : null
    }, now)
    incrementTelemetryDailyMetric(profile, 'ticket_submitted', 1, now)
    incrementTelemetryDailyMetric(profile, response?.isCorrect ? 'ticket_correct' : 'ticket_wrong', 1, now)

    saveProfile(profile)
    setProfile({ ...profile })
    setSavedResponse(response)
    setStatusMessage('Svar registrerat.')
    setIsSubmitting(false)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar ticket...</p>
      </div>
    )
  }

  if (!resolvedTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 py-10 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Ticket hittades inte</h1>
          <p className="text-gray-600 mb-5">Länken är ogiltig eller ticketen är inte aktiv längre.</p>
          <button
            onClick={() => navigate(`/student/${studentId}`)}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            Till startsidan
          </button>
        </div>
      </div>
    )
  }

  const title = resolvedTicket.title || (resolvedTicket.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket')

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-cyan-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/95 border border-amber-200 rounded-2xl shadow-xl p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Ticket</p>
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
              <p className="text-sm text-gray-500">{profile.name}</p>
            </div>
            <button
              onClick={() => navigate(`/student/${studentId}`)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Till startsidan
            </button>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 mb-4">
            <p className="text-lg md:text-xl font-semibold text-gray-800 whitespace-pre-wrap">
              {resolvedTicket.question}
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="ticketAnswer">
            Ditt svar
          </label>
          <textarea
            id="ticketAnswer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:border-amber-500 focus:outline-none"
            placeholder="Skriv ditt svar här..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <button
              onClick={handleSubmit}
              disabled={answer.trim() === '' || isSubmitting}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-semibold"
            >
              {isSubmitting ? 'Sparar...' : 'Skicka svar'}
            </button>
            <p className="text-xs text-gray-500">{statusMessage || ' '}</p>
          </div>

          {savedResponse && (
            <div className="mt-5">
              {shouldShowCorrectness ? (
                <div className={`rounded-xl border px-4 py-3 ${
                  savedResponse.isCorrect
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="font-semibold">
                    {savedResponse.isCorrect ? 'Rätt svar' : 'Inte rätt svar'}
                  </p>
                  {!savedResponse.isCorrect && (
                    <p className="text-sm mt-1">
                      Du svarade: <span className="font-medium">{savedResponse.studentAnswer || '-'}</span>
                    </p>
                  )}
                  <p className="text-sm mt-1">
                    Facit: <span className="font-medium">{resolvedTicket.answer}</span>
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  <p className="font-medium">Svar sparat.</p>
                  <p className="text-sm text-gray-500">
                    Läraren kan visa facit senare.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentTicket
