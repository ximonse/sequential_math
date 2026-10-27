import { useEffect, useRef, useState } from 'react'
import { screeningFigureSvg } from '../../domains/arithmetic/screeningFigures.js'
import { isChoiceTask } from '../../domains/arithmetic/screeningImageQuestions.js'
import { diagnosticRequest } from '../teacher/sections/diagnosticRequest.js'
import './screeningImages.css'

export function ScreeningImage({ image, context = {} }) {
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')
  const { teacher = false, assignmentId = '', classId = '' } = context
  const svg = image?.source === 'bank' ? screeningFigureSvg(image.id, image.version) : null
  const url = image?.source === 'upload' ? teacher
    ? `/api/teacher-diagnostic-assignments?${new URLSearchParams({ resource: 'images', id: image.id,
      ...(assignmentId ? { assignmentId, classId } : {}) })}`
    : `/api/me/diagnostic-assignments?${new URLSearchParams({ imageId: image.id, assignmentId })}` : ''
  useEffect(() => {
    if (!url) return undefined
    let active = true
    ;(async () => {
      const result = teacher ? await diagnosticRequest(url) : await fetch(url, { credentials: 'include' }).then(async response => ({ ok: response.ok, data: await response.json() }))
      if (!result.ok || !result.data.image?.dataUrl) throw new Error('Bilden kunde inte hämtas.')
      if (active) { setLoaded({ url, src: result.data.image.dataUrl }); setError('') }
    })().catch(() => { if (active) setError('Bilden kunde inte hämtas. Öppna frågan igen för att försöka på nytt.') })
    return () => { active = false }
  }, [url, teacher])
  const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : loaded?.url === url ? loaded.src : null
  return src ? <img className="screening-figure" src={src} alt="Figur" draggable="false" />
    : <span role="status">{error || 'Hämtar bild…'}</span>
}

export default function ScreeningImageQuestion({ task, selected = [], onChange, disabled = false, context = {} }) {
  const gesture = useRef(null)
  function choose(id) {
    if (disabled || !onChange) return
    onChange(task.responseMode === 'multiple' ? selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id] : [id])
  }
  return <section className="screening-image-question" aria-label="Bildfråga">
    {task.images?.length > 0 && <div className="screening-question-images">{task.images.map((image, index) =>
      <ScreeningImage key={`${image.source}:${image.id}:${index}`} image={image} context={context} />)}</div>}
    {isChoiceTask(task) && <>
      <p className="screening-choice-instruction">{task.responseMode === 'multiple' ? 'Välj en eller flera bilder.' : task.responseMode === 'name' ? 'Välj ett namn.' : 'Välj en bild.'}</p>
      <div className="screening-options" role="group" aria-label="Svarsalternativ">
        {task.options.map((option, index) => <button key={option.id} type="button" aria-pressed={selected.includes(option.id)}
          aria-label={option.labelSv || `Bild ${index + 1}`} disabled={disabled} className="screening-option"
          onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY, cancelled: false } }}
          onPointerMove={event => { if (gesture.current && Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) > 10) gesture.current.cancelled = true }}
          onPointerCancel={() => { if (gesture.current) gesture.current.cancelled = true }}
          onClick={event => { if (event.detail === 0 || !gesture.current?.cancelled) choose(option.id); gesture.current = null }}>
          {option.image ? <ScreeningImage image={option.image} context={context} /> : <span>{option.labelSv}</span>}
          <span className="screening-selected-symbol" aria-hidden="true">{selected.includes(option.id) ? '✓' : ''}</span>
        </button>)}
      </div>
    </>}
  </section>
}
