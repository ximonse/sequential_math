import { getMasteryLevelClassName } from './studentHomeUtils'

export default function OperationMasteryRows({ operation, historical, onSelectLevel }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {historical.map((levelData) => (
        <button
          type="button"
          key={`${operation}-${levelData.level}`}
          title={levelData.title}
          onClick={() => onSelectLevel(operation, levelData.level)}
          className={`inline-flex h-11 w-11 flex-col items-center justify-center rounded-md border text-[10px] leading-none ${getMasteryLevelClassName(levelData.status)}`}
        >
          <span className="font-bold text-[11px]">{levelData.level}</span>
          <span className="mt-0.5">{levelData.metricsLabel}</span>
        </button>
      ))}
    </div>
  )
}
