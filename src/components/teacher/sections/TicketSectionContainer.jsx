import { useEffect, useMemo, useState } from 'react'
import { saveProfile } from '../../../lib/storage'
import {
  buildTicketLink,
  createTicketDispatch,
  createTicketTemplate,
  deleteTicketDispatch,
  deleteTicketTemplate,
  encodeTicketPayload,
  getTicketDispatches,
  getTicketTemplates,
  importTicketTemplatesFromCsv,
  normalizeTags,
  recordTicketDispatchTargets,
  setTicketDispatchReveal,
  setTicketRevealAllForProfile
} from '../../../lib/tickets'
import TicketSectionPanel from './TicketSectionPanel'
import {
  buildTicketDispatchMap,
  buildTicketHistoryRows,
  buildTicketHistoryStudentOptions,
  buildTicketHistorySummary,
  buildTicketResponseMeta,
  buildTicketResponseRows,
  buildTicketResolvedTargetStudentIds,
  buildTicketStudentOptions,
  buildTicketTagOptions,
  buildTicketTemplateRows,
  filterTicketStudentOptions,
  getSelectedTicketDispatch
} from './ticketSectionDataHelpers'
import { buildTicketSectionPanelProps } from './ticketSectionPanelPropsBuilder'
import {
  applyTicketRevealForAllStudents,
  clearTicketFromHomeForTargets,
  publishTicketToHomeForTargets
} from './ticketSectionPublishHelpers'

export default function TicketSectionContainer({
  students,
  filteredStudents,
  classFilterOptions,
  selectedClassIds,
  classNameById,
  recordMatchesClassFilter,
  onSetStudents,
  onStatusChange,
  onOpenStudentDetail,
  formatTimeAgo
}) {
  const [ticketTemplates, setTicketTemplates] = useState(() => getTicketTemplates())
  const [ticketDispatches, setTicketDispatches] = useState(() => getTicketDispatches())
  const [ticketQuestionInput, setTicketQuestionInput] = useState('')
  const [ticketAnswerInput, setTicketAnswerInput] = useState('')
  const [ticketTagsInput, setTicketTagsInput] = useState('')
  const [ticketKindInput, setTicketKindInput] = useState('start')
  const [ticketCsvInput, setTicketCsvInput] = useState('')
  const [ticketTemplateFilter, setTicketTemplateFilter] = useState('')
  const [ticketTagFilter, setTicketTagFilter] = useState('')
  const [ticketSortBy, setTicketSortBy] = useState('newest')
  const [ticketDispatchImmediateFeedback, setTicketDispatchImmediateFeedback] = useState(true)
  const [selectedTicketDispatchId, setSelectedTicketDispatchId] = useState('')
  const [copiedTicketDispatchId, setCopiedTicketDispatchId] = useState('')
  const [ticketTargetClassIds, setTicketTargetClassIds] = useState([])
  const [ticketTargetStudentIds, setTicketTargetStudentIds] = useState([])
  const [ticketStudentSearch, setTicketStudentSearch] = useState('')
  const [ticketSectionOpen, setTicketSectionOpen] = useState(false)
  const [ticketHistoryStudentId, setTicketHistoryStudentId] = useState('')
  const [ticketHistoryKindFilter, setTicketHistoryKindFilter] = useState('all')
  const [ticketHistoryResultFilter, setTicketHistoryResultFilter] = useState('all')
  const [ticketHistorySearch, setTicketHistorySearch] = useState('')

  const setStatus = (text) => {
    if (typeof onStatusChange === 'function') onStatusChange(text)
  }

  useEffect(() => {
    if (ticketDispatches.length === 0) {
      setSelectedTicketDispatchId('')
      return
    }
    if (!selectedTicketDispatchId || !ticketDispatches.some(item => item.id === selectedTicketDispatchId)) {
      setSelectedTicketDispatchId(ticketDispatches[0].id)
    }
  }, [ticketDispatches, selectedTicketDispatchId])

  useEffect(() => {
    if (classFilterOptions.length === 0) {
      setTicketTargetClassIds([])
      return
    }
    const valid = new Set(classFilterOptions.map(item => item.id))
    setTicketTargetClassIds(prev => prev.filter(id => valid.has(id)))
  }, [classFilterOptions])

  useEffect(() => {
    if (students.length === 0) {
      setTicketTargetStudentIds([])
      return
    }
    const valid = new Set(students.map(item => item.studentId))
    setTicketTargetStudentIds(prev => prev.filter(id => valid.has(id)))
  }, [students])

  const ticketTagOptions = useMemo(
    () => buildTicketTagOptions(ticketTemplates),
    [ticketTemplates]
  )

  const ticketTemplateRows = useMemo(
    () => buildTicketTemplateRows(ticketTemplates, ticketTemplateFilter, ticketTagFilter, ticketSortBy),
    [ticketTemplates, ticketTemplateFilter, ticketTagFilter, ticketSortBy]
  )

  const ticketSelectedDispatch = useMemo(
    () => getSelectedTicketDispatch(ticketDispatches, selectedTicketDispatchId),
    [ticketDispatches, selectedTicketDispatchId]
  )

  const ticketResponseRows = useMemo(
    () => buildTicketResponseRows(filteredStudents, ticketSelectedDispatch, classNameById),
    [filteredStudents, ticketSelectedDispatch, classNameById]
  )

  const ticketResponseMeta = useMemo(
    () => buildTicketResponseMeta(ticketResponseRows),
    [ticketResponseRows]
  )

  const ticketTargetClassSet = useMemo(() => new Set(ticketTargetClassIds), [ticketTargetClassIds])
  const ticketTargetStudentSet = useMemo(() => new Set(ticketTargetStudentIds), [ticketTargetStudentIds])

  const ticketStudentOptions = useMemo(
    () => buildTicketStudentOptions(students, classNameById),
    [students, classNameById]
  )

  const ticketFilteredStudentOptions = useMemo(
    () => filterTicketStudentOptions(ticketStudentOptions, ticketStudentSearch),
    [ticketStudentOptions, ticketStudentSearch]
  )

  const ticketResolvedTargetStudentIds = useMemo(
    () => buildTicketResolvedTargetStudentIds({
      ticketTargetClassIds,
      ticketTargetStudentIds,
      filteredStudents,
      students,
      recordMatchesClassFilter
    }),
    [ticketTargetClassIds, ticketTargetStudentIds, filteredStudents, students, recordMatchesClassFilter]
  )

  const ticketHasExplicitTargets = ticketTargetClassIds.length > 0 || ticketTargetStudentIds.length > 0

  const ticketDispatchMap = useMemo(
    () => buildTicketDispatchMap(ticketDispatches),
    [ticketDispatches]
  )

  const ticketHistoryStudentOptions = useMemo(
    () => buildTicketHistoryStudentOptions(filteredStudents, classNameById),
    [filteredStudents, classNameById]
  )

  const ticketHistoryStudent = useMemo(
    () => students.find(item => item.studentId === ticketHistoryStudentId) || null,
    [students, ticketHistoryStudentId]
  )

  useEffect(() => {
    if (ticketHistoryStudentOptions.length === 0) {
      if (ticketHistoryStudentId !== '') setTicketHistoryStudentId('')
      return
    }
    if (!ticketHistoryStudentId || !ticketHistoryStudentOptions.some(item => item.studentId === ticketHistoryStudentId)) {
      setTicketHistoryStudentId(ticketHistoryStudentOptions[0].studentId)
    }
  }, [ticketHistoryStudentOptions, ticketHistoryStudentId])

  const ticketHistorySummary = useMemo(
    () => buildTicketHistorySummary(ticketHistoryStudent),
    [ticketHistoryStudent]
  )

  const ticketHistoryRows = useMemo(
    () => buildTicketHistoryRows({
      ticketHistoryStudent,
      ticketHistorySearch,
      ticketHistoryKindFilter,
      ticketHistoryResultFilter,
      ticketDispatchMap
    }),
    [
      ticketHistoryStudent,
      ticketHistorySearch,
      ticketHistoryKindFilter,
      ticketHistoryResultFilter,
      ticketDispatchMap
    ]
  )

  const handleCreateTicketTemplate = () => {
    const created = createTicketTemplate({
      question: ticketQuestionInput,
      answer: ticketAnswerInput,
      tags: normalizeTags(ticketTagsInput),
      kind: ticketKindInput
    })
    if (!created) {
      setStatus('Ticket kräver både fråga och facit.')
      return
    }
    setTicketTemplates(getTicketTemplates())
    setTicketQuestionInput('')
    setTicketAnswerInput('')
    setTicketTagsInput('')
    setStatus('Ticket-fråga sparad.')
  }

  const handleImportTicketCsv = () => {
    const result = importTicketTemplatesFromCsv(ticketCsvInput, { kind: ticketKindInput })
    setTicketTemplates(getTicketTemplates())
    setStatus(`Ticket-import klar: ${result.imported} importerade, ${result.skipped} hoppade över.`)
    if (result.imported > 0) setTicketCsvInput('')
  }

  const handleDeleteTicketTemplate = (templateId) => {
    deleteTicketTemplate(templateId)
    setTicketTemplates(getTicketTemplates())
    setStatus('Ticket-fråga borttagen.')
  }

  const handleCreateTicketDispatch = (template) => {
    const dispatch = createTicketDispatch({
      ticketId: template.id,
      title: `${template.kind === 'exit' ? 'Exit' : 'Start'}-ticket: ${template.question.slice(0, 40)}`,
      question: template.question,
      answer: template.answer,
      tags: template.tags,
      kind: template.kind,
      showCorrectnessOnSubmit: ticketDispatchImmediateFeedback
    })
    if (!dispatch) {
      setStatus('Kunde inte skapa ticket-utskick.')
      return
    }
    setTicketDispatches(getTicketDispatches())
    setSelectedTicketDispatchId(dispatch.id)
    setStatus('Ticket-länk skapad.')
  }

  const handleCopyTicketLink = async (dispatchId) => {
    const dispatch = ticketDispatches.find(item => item.id === dispatchId)
    if (!dispatch) return
    const link = buildTicketLink(dispatch)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedTicketDispatchId(dispatchId)
      window.setTimeout(() => setCopiedTicketDispatchId(''), 1200)
      setStatus('Ticket-länk kopierad.')
    } catch {
      setStatus('Kunde inte kopiera ticket-länk just nu.')
    }
  }

  const handleDeleteTicketDispatch = (dispatchId) => {
    deleteTicketDispatch(dispatchId)
    const next = getTicketDispatches()
    setTicketDispatches(next)
    if (selectedTicketDispatchId === dispatchId) {
      setSelectedTicketDispatchId(next[0]?.id || '')
    }
    setStatus('Ticket-utskick borttaget.')
  }

  const handleToggleTicketReveal = (dispatchId, reveal) => {
    applyTicketRevealForAllStudents({
      dispatchId,
      reveal,
      students,
      onSetStudents,
      setTicketDispatches,
      setStatus,
      setTicketDispatchReveal,
      setTicketRevealAllForProfile,
      getTicketDispatches,
      saveProfile
    })
  }

  const handleToggleTicketTargetClass = (classId) => {
    setTicketTargetClassIds(prev => (
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    ))
  }

  const handleToggleTicketTargetStudent = (studentId) => {
    setTicketTargetStudentIds(prev => (
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    ))
  }

  const handleTicketTargetsFromClassFilter = () => {
    setTicketTargetClassIds(selectedClassIds)
    setTicketTargetStudentIds([])
  }

  const handleClearTicketTargets = () => {
    setTicketTargetClassIds([])
    setTicketTargetStudentIds([])
  }

  const handlePublishTicketToHome = (dispatchId) => {
    publishTicketToHomeForTargets({
      dispatchId,
      ticketDispatches,
      ticketResolvedTargetStudentIds,
      students,
      onSetStudents,
      setTicketDispatches,
      setStatus,
      encodeTicketPayload,
      recordTicketDispatchTargets,
      getTicketDispatches,
      saveProfile
    })
  }

  const handleClearTicketFromHome = (dispatchId) => {
    clearTicketFromHomeForTargets({
      dispatchId,
      ticketResolvedTargetStudentIds,
      students,
      onSetStudents,
      setStatus,
      saveProfile
    })
  }

  const {
    templatePanelProps,
    dispatchPanelProps,
    responsesPanelProps
  } = buildTicketSectionPanelProps({
    ticketQuestionInput,
    ticketAnswerInput,
    ticketTagsInput,
    ticketKindInput,
    ticketCsvInput,
    ticketTemplateFilter,
    ticketTagFilter,
    ticketSortBy,
    ticketTagOptions,
    ticketTemplateRows,
    setTicketQuestionInput,
    setTicketAnswerInput,
    setTicketTagsInput,
    setTicketKindInput,
    handleCreateTicketTemplate,
    setTicketCsvInput,
    handleImportTicketCsv,
    setTicketTemplateFilter,
    setTicketTagFilter,
    setTicketSortBy,
    handleCreateTicketDispatch,
    handleDeleteTicketTemplate,
    selectedTicketDispatchId,
    ticketDispatches,
    ticketDispatchImmediateFeedback,
    selectedClassIds,
    filteredStudents,
    classFilterOptions,
    ticketTargetClassSet,
    ticketStudentSearch,
    ticketFilteredStudentOptions,
    ticketTargetStudentSet,
    ticketResolvedTargetStudentIds,
    ticketHasExplicitTargets,
    ticketTargetClassIds,
    ticketTargetStudentIds,
    copiedTicketDispatchId,
    setSelectedTicketDispatchId,
    setTicketDispatchImmediateFeedback,
    handleTicketTargetsFromClassFilter,
    handleClearTicketTargets,
    handleToggleTicketTargetClass,
    setTicketStudentSearch,
    handleToggleTicketTargetStudent,
    handleCopyTicketLink,
    handlePublishTicketToHome,
    handleToggleTicketReveal,
    handleClearTicketFromHome,
    handleDeleteTicketDispatch,
    ticketSelectedDispatch,
    ticketResponseMeta,
    ticketResponseRows,
    onOpenStudentDetail,
    formatTimeAgo,
    ticketHistoryStudentId,
    ticketHistoryStudentOptions,
    ticketHistoryKindFilter,
    ticketHistoryResultFilter,
    ticketHistorySearch,
    ticketHistoryStudent,
    ticketHistorySummary,
    ticketHistoryRows,
    setTicketHistoryStudentId,
    setTicketHistoryKindFilter,
    setTicketHistoryResultFilter,
    setTicketHistorySearch
  })

  return (
    <TicketSectionPanel
      ticketSectionOpen={ticketSectionOpen}
      onToggleTicketSectionOpen={() => setTicketSectionOpen(prev => !prev)}
      templatePanelProps={templatePanelProps}
      dispatchPanelProps={dispatchPanelProps}
      responsesPanelProps={responsesPanelProps}
    />
  )
}
