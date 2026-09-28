import { useState } from 'react'
import { createAssignment } from '../../../lib/assignments'

export default function MathPracticeCreatorDialog({ onCreate, onClose }) {
  const [title, setTitle] = useState('')
  const [operations, setOperations] = useState(['addition'])
  const [firstMin, setFirstMin] = useState('0')
  const [firstMax, setFirstMax] = useState('10')
  const [firstFilter, setFirstFilter] = useState('all')
  const [secondMin, setSecondMin] = useState('0')
  const [secondMax, setSecondMax] = useState('10')
  const [secondFilter, setSecondFilter] = useState('all')
  const [targetCount, setTargetCount] = useState('30')
  const [maxTime, setMaxTime] = useState('120')
  const [randomizeOrder, setRandomizeOrder] = useState(false)
  const [hideCountdown, setHideCountdown] = useState(false)

  const toggleOperation = (op) => {
    setOperations(prev =>
      prev.includes(op)
        ? prev.filter(x => x !== op)
        : [...prev, op]
    )
  }

  const handleCreate = () => {
    if (!title.trim()) {
      alert('Ge övningen ett namn')
      return
    }
    if (operations.length === 0) {
      alert('Välj minst ett räknesätt')
      return
    }

    const assignment = createAssignment({
      kind: 'math_practice',
      title: title.trim(),
      operations,
      numberRange: {
        first: {
          min: Math.max(0, Number(firstMin) || 0),
          max: Math.max(0, Number(firstMax) || 10),
          filter: firstFilter
        },
        second: {
          min: Math.max(0, Number(secondMin) || 0),
          max: Math.max(0, Number(secondMax) || 10),
          filter: secondFilter
        }
      },
      settings: {
        maxTimePerProblem: Math.max(5, Number(maxTime) || 120),
        randomizeOrder: Boolean(randomizeOrder),
        hideCountdown: Boolean(hideCountdown)
      },
      targetCount: Math.max(1, Number(targetCount) || 30)
    })

    if (assignment) {
      onCreate(assignment)
    } else {
      alert('Kunde inte skapa övningen')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ny matematikövning</h2>

        <div className="space-y-4">
          {/* Namn */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Namn på övningen</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Lilla plus, Division 1-5"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Räknesätt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Räknesätt</label>
            <div className="flex gap-2 flex-wrap">
              {['addition', 'subtraction', 'multiplication', 'division'].map(op => (
                <button
                  key={op}
                  onClick={() => toggleOperation(op)}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${
                    operations.includes(op)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {op === 'addition' && '+'}
                  {op === 'subtraction' && '−'}
                  {op === 'multiplication' && '×'}
                  {op === 'division' && '÷'}
                </button>
              ))}
            </div>
          </div>

          {/* Första talet */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Första talet: min</label>
              <input
                type="number"
                value={firstMin}
                onChange={(e) => setFirstMin(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">max</label>
              <input
                type="number"
                value={firstMax}
                onChange={(e) => setFirstMax(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Filter</label>
              <select
                value={firstFilter}
                onChange={(e) => setFirstFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="all">Alla</option>
                <option value="even">Jämna</option>
                <option value="odd">Udda</option>
                <option value="ten">10-tal</option>
                <option value="five">5-tal</option>
              </select>
            </div>
          </div>

          {/* Andra talet */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Andra talet: min</label>
              <input
                type="number"
                value={secondMin}
                onChange={(e) => setSecondMin(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">max</label>
              <input
                type="number"
                value={secondMax}
                onChange={(e) => setSecondMax(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Filter</label>
              <select
                value={secondFilter}
                onChange={(e) => setSecondFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="all">Alla</option>
                <option value="even">Jämna</option>
                <option value="odd">Udda</option>
                <option value="ten">10-tal</option>
                <option value="five">5-tal</option>
              </select>
            </div>
          </div>

          {/* Övriga inställningar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Antal tal</label>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                min="1"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Max tid per tal (sek)</label>
              <input
                type="number"
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                min="5"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={randomizeOrder}
                onChange={(e) => setRandomizeOrder(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Slumpa ordning</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCountdown}
                onChange={(e) => setHideCountdown(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Dölj nedräkning</span>
            </label>
          </div>
        </div>

        {/* Knappar */}
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
          >
            Avbryt
          </button>
          <button
            onClick={handleCreate}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Skapa övning
          </button>
        </div>
      </div>
    </div>
  )
}
