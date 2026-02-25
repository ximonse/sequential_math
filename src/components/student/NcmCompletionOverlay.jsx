function NcmCompletionOverlay({
  solved,
  total,
  onGoHome
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-200 to-cyan-200 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          NCM-uppdrag klart
        </h2>
        <p className="text-gray-600 mb-6">
          Du har gjort {solved} av {total} frågor i uppdraget.
        </p>
        <button
          onClick={onGoHome}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg"
        >
          Till startsidan
        </button>
      </div>
    </div>
  )
}

export default NcmCompletionOverlay
