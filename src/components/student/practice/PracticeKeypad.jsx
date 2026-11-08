// The same keypad for every practice question: digits, two task-specific keys
// beside 0, an optional extra row (algebra letters), Svara/Nästa, Radera and Rensa.
const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0']
const key = 'h-12 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 sm:h-14 sm:text-2xl md:h-16'

export default function PracticeKeypad({ onKey, specials = [], extraKeys = [], onPrimaryAction, canSubmit, isAnswering }) {
  return <div className="w-full max-w-md mx-auto select-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 md:max-w-none md:p-5">
    {extraKeys.length > 0 && <div className="mb-2 grid h-12 gap-1.5" style={{ gridTemplateColumns: `repeat(${extraKeys.length}, minmax(0, 1fr))` }}>
      {extraKeys.map(item => <button key={item} type="button" onClick={() => onKey(item)}
        className="rounded-lg bg-gray-200 text-lg font-bold text-gray-800 hover:bg-gray-300 active:bg-gray-400">{item}</button>)}
    </div>}
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {DIGITS.map(digit => <button key={digit} type="button" onClick={() => onKey(digit)} className={key}>{digit}</button>)}
      {[0, 1].map(index => specials[index]
        ? <button key={specials[index]} type="button" onClick={() => onKey(specials[index])} className={key}>{specials[index]}</button>
        : <span key={`empty-${index}`} aria-hidden="true" />)}
    </div>
    <button type="button" onClick={onPrimaryAction} disabled={!canSubmit}
      className={`practice-primary mt-2 h-14 w-full rounded-xl text-2xl font-bold text-white disabled:bg-gray-300 sm:mt-3 sm:h-20 sm:text-3xl md:h-24 ${
        isAnswering ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
      {isAnswering ? 'Svara' : 'Nästa'}
    </button>
    <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
      <button type="button" onClick={() => onKey('backspace')}
        className="h-11 rounded-xl bg-amber-100 text-sm font-semibold text-amber-900 hover:bg-amber-200 active:bg-amber-300 sm:h-12 sm:text-base">Radera</button>
      <button type="button" onClick={() => onKey('clear')}
        className="h-11 rounded-xl bg-red-100 text-sm font-semibold text-red-900 hover:bg-red-200 active:bg-red-300 sm:h-12 sm:text-base">Rensa</button>
    </div>
  </div>
}
