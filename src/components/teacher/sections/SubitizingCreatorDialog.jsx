import { useState } from 'react'
import { createAssignment } from '../../../lib/assignments'

export default function SubitizingCreatorDialog({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [targetCount, setTargetCount] = useState('30')
  const [breakGames, setBreakGames] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Namn är obligatoriskt')
      return
    }

    const assignment = createAssignment({
      kind: 'subitizing',
      title: name.trim(),
      breakGames,
      targetCount: Math.min(200, Math.max(1, Math.floor(Number(targetCount)) || 30))
    })

    if (!assignment) {
      setError('Kunde inte skapa övning')
      return
    }

    onCreate(assignment)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Skapa Talbild-övning</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn på övningen
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="T.ex. Talbild vecka 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max antal tärningar (nedräkning för eleven)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={breakGames} onChange={(e) => setBreakGames(e.target.checked)} />
            Pausspel (Pong/Snake) vid paus. Av = vanlig vilopaus.
          </label>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Eleverna ska snabbt som sjutton identifiera antalet prickar på tärningen utan att räkna.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Skapa övning
          </button>
        </div>
      </div>
    </div>
  )
}
