import CompletionChoices from './CompletionChoices'

function FluencyTopLevelChoice({
  startLevel,
  showGames = true,
  onRestart,
  onOpenPong,
  onOpenSnake,
  onQuit
}) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-400 to-orange-500 px-4">
      <CompletionChoices choices={[
        { label: `Börja om från nivå ${startLevel}`, onClick: onRestart, primary: true },
        ...(showGames ? [
          { label: '🏓 Spela Pong (max 2 min)', onClick: onOpenPong },
          { label: '🐍 Spela Snake (max 2 min)', onClick: onOpenSnake }
        ] : []),
        { label: 'Sluta för nu', onClick: onQuit }
      ]} />
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">&#127942;</div>
        <h2 className="text-2xl font-bold text-gray-800">
          Du klarade högsta nivån!
        </h2>
      </div>
    </div>
  )
}

export default FluencyTopLevelChoice
