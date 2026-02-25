function CurrentOperationMastery({ operationLabel, historical, weekly }) {
  const showHistorical = Array.isArray(historical) && historical.length > 0
  const showWeekly = Array.isArray(weekly) && weekly.length > 0

  if (!showHistorical && !showWeekly) return null

  return (
    <div className="mt-4 text-xs text-gray-500">
      <span className="font-medium">{operationLabel}</span>
      {showHistorical && (
        <span className="ml-2">
          Historiskt: <span className="text-green-700">nivå {historical.join(', ')}</span>
        </span>
      )}
      {showWeekly && (
        <span className="ml-2">
          Denna vecka: <span className="text-green-700">nivå {weekly.join(', ')}</span>
        </span>
      )}
    </div>
  )
}

export default CurrentOperationMastery
