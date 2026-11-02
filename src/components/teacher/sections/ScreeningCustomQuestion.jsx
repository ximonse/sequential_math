import QuestionText from '../../QuestionText'

// One question the teacher answers by reading the pupil's text (no answer key).
export default function ScreeningCustomQuestion({ customPrompt, onCustomPrompt, customGrid, onCustomGrid, customDrawing, onCustomDrawing }) {
  return <details className="mt-3 text-sm">
    <summary className="cursor-pointer font-semibold">Fråga med textsvar som du bedömer</summary>
    <label className="block">Frågetext<textarea value={customPrompt} maxLength={2000} onChange={event => onCustomPrompt(event.target.value)} className="mt-1 block w-full rounded border p-1" /></label>
    <p className="mt-1 text-slate-600">{'Bråk: skriv 6//2 eller \\frac{6}{2}.'}</p>
    {customPrompt.trim() && <div className="mt-2" role="region" aria-label="Förhandsvisning av frågan">
      <p className="font-semibold">Förhandsvisning</p>
      <p className="whitespace-pre-wrap break-words"><QuestionText>{customPrompt}</QuestionText></p>
    </div>}
    <label className="mr-2"><input type="checkbox" checked={!customGrid} onChange={event => onCustomGrid(!event.target.checked)} /> Huvudräkning för skrivfrågan</label>
    <label><input type="checkbox" checked={customDrawing} onChange={event => onCustomDrawing(event.target.checked)} /> Rityta till skrivfrågan</label>
  </details>
}
