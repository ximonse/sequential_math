function BreakPrompt({
  sessionCount,
  breakDurationMinutes,
  onOpenPong,
  onOpenSnake,
  onTakeBreak,
  onContinue
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">&#9749;</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Dags för en paus?
        </h2>
        <p className="text-gray-600 mb-6">
          Du har gjort {sessionCount} uppgifter! Ta gärna cirka {breakDurationMinutes} min paus innan du fortsätter.
        </p>
        <div className="space-y-3">
          <button
            onClick={onOpenPong}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
          >
            🏓 Spela Pong (max 2 min)
          </button>
          <button
            onClick={onOpenSnake}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
          >
            🐍 Spela Snake (max 2 min)
          </button>
          <button
            onClick={onTakeBreak}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
          >
            Till startsidan
          </button>
          <button
            onClick={onContinue}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
          >
            Fortsätt räkna
          </button>
        </div>
      </div>
    </div>
  )
}

export default BreakPrompt
