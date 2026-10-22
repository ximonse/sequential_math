import CompletionChoices from './CompletionChoices'

function NcmCompletionOverlay({
  solved,
  total,
  title = 'NCM-uppdrag klart',
  onGoHome,
  onRestart
}) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-emerald-200 to-cyan-200 px-4">
      <CompletionChoices choices={[
        ...(onRestart ? [{ label: 'Börja om', onClick: onRestart, primary: true }] : []),
        { label: 'Till startsidan', onClick: onGoHome, primary: !onRestart }
      ]} />
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {title}
        </h2>
        <p className="text-gray-600">
          Du har gjort {solved} av {total} frågor i uppdraget.
        </p>
      </div>
    </div>
  )
}

export default NcmCompletionOverlay
