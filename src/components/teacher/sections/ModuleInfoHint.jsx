import { useEffect, useId, useRef, useState } from 'react'

// One explanation, two ways in: hovering shows it on a laptop, tapping opens
// the same text on a tablet, where there is no hover. Simon 2026-11-24.
export default function ModuleInfoHint({ label, children }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const hintId = useId()
  const wrapper = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = event => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const visible = open || hovered

  return (
    <span ref={wrapper} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Så funkar ${label}`}
        aria-expanded={open}
        aria-describedby={visible ? hintId : undefined}
        onClick={() => setOpen(value => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 bg-white text-[11px] font-bold leading-none text-slate-600 hover:border-slate-600 hover:text-slate-900"
      >
        i
      </button>
      {visible && (
        <span
          id={hintId}
          role="note"
          className="absolute left-0 top-6 z-30 w-64 rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-normal leading-snug text-slate-700 shadow-[0_8px_13px_-2px_rgba(15,23,42,0.32)]"
        >
          {children}
        </span>
      )}
    </span>
  )
}
