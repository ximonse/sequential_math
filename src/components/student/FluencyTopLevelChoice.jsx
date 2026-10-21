function FluencyTopLevelChoice({
  startLevel,
  showGames = true,
  onRestart,
  onOpenPong,
  onOpenSnake,
  onQuit
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">&#127942;</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Du klarade högsta nivån!
        </h2>
        <p className="text-gray-600 mb-6">
          Vad vill du göra nu?
        </p>
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
          >
            Börja om från nivå {startLevel}
          </button>
          {showGames && (
          <>
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
          </>
          )}
          <button
            onClick={onQuit}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
          >
            Sluta för nu
          </button>
        </div>
      </div>
    </div>
  )
}

export default FluencyTopLevelChoice
