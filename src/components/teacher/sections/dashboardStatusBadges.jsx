import { useEffect, useState } from 'react'

export function InlineHelp({ text = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const handleClose = () => setOpen(false)
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const normalizedText = String(text || '').trim()
  if (!normalizedText) return null

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Visa tolkning"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(prev => !prev)
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-gray-500 hover:text-gray-700 hover:border-gray-400"
      >
        i
      </button>
      {open ? (
        <span
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-5 z-40 w-64 rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg"
        >
          {normalizedText}
        </span>
      ) : null}
    </span>
  )
}

export function RiskBadge({ level, score }) {
  const badgeClass = level === 'high'
    ? 'bg-red-100 text-red-700 border-red-200'
    : level === 'medium'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'

  const label = level === 'high' ? 'Hög risk' : level === 'medium' ? 'Medel risk' : 'Låg risk'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}>
      {label} {Number.isFinite(score) ? `(${score})` : ''}
    </span>
  )
}

export function ActivityBadge({ code, compact = false }) {
  const tone = resolveActivityTone(code)
  const label = resolveActivityLabel(code)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${tone.badgeClass}`}>
      <span className={`w-2 h-2 rounded-full ${tone.dotClass}`} />
      {compact ? label : `${label}`}
    </span>
  )
}

function resolveActivityLabel(code) {
  if (code === 'green') return 'Grön'
  if (code === 'orange') return 'Orange'
  if (code === 'black') return 'Svart'
  return 'Röd'
}

function resolveActivityTone(code) {
  if (code === 'green') {
    return {
      dotClass: 'bg-green-500',
      badgeClass: 'bg-green-50 text-green-700 border-green-200'
    }
  }
  if (code === 'orange') {
    return {
      dotClass: 'bg-orange-500',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200'
    }
  }
  if (code === 'black') {
    return {
      dotClass: 'bg-gray-900',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }
  return {
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200'
  }
}
