import { useEffect, useRef } from 'react'

// Shown before a collection is handed in while some questions lack an answer in
// the answer field. The pupil may go to such a question or hand in anyway.
// `onChoose` receives 'back', 'submit' or the question number to open.
export default function MissingAnswersDialog({ numbers, onChoose }) {
  const dialog = useRef(null)
  const back = useRef(null)
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal()
    back.current?.focus()
  }, [])
  const many = numbers.length > 1
  return <dialog ref={dialog} aria-labelledby="missing-answers-title" onCancel={event => { event.preventDefault(); onChoose('back') }}
    className="m-auto w-[min(32rem,92vw)] rounded-lg border-2 border-amber-500 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
    <h2 id="missing-answers-title" className="text-lg font-bold">⚠️ {many ? `${numbers.length} frågor saknar svar` : 'En fråga saknar svar'}</h2>
    <p className="mt-1">Du har inte skrivit något i svarsrutan på {many ? 'de här frågorna' : 'den här frågan'}. Har du räknat klart? Skriv svaret i svarsrutan.</p>
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Frågor utan svar">
      {numbers.map(number => <li key={number}>
        <button type="button" onClick={() => onChoose(number)}
          className="rounded-md border border-amber-600 bg-amber-50 px-3 py-1 font-semibold text-amber-950 hover:bg-amber-100">Gå till fråga {number}</button>
      </li>)}
    </ul>
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
      <button ref={back} type="button" onClick={() => onChoose('back')}
        className="rounded-md border border-slate-400 bg-white px-3 py-1 font-semibold text-slate-800 hover:bg-slate-100">Tillbaka</button>
      <button type="button" onClick={() => onChoose('submit')}
        className="rounded-md bg-red-700 px-3 py-1 font-semibold text-white hover:bg-red-800">Lämna in ändå</button>
    </div>
  </dialog>
}
