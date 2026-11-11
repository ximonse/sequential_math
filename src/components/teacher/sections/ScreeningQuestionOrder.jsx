import QuestionText from '../../QuestionText'
import { moveQuestion } from '../../../domains/arithmetic/screeningQuestionOrder.js'

const kinds = { bank: 'Frågebanken', written: 'Egen fråga med facit', text: 'Textfråga', image: 'Bildfråga' }
const button = 'rounded border border-slate-400 px-1.5 py-0.5 text-xs disabled:opacity-40 hover:bg-slate-100'

// The order the pupils meet the questions in; the teacher moves them up and down
// and configures bank question options directly in the unified list.
export default function ScreeningQuestionOrder({
  questions,
  onOrder,
  disabled,
  itemOptions = {},
  onItemOptions,
  selectedTasks = [],
  onSelectedTasks
}) {
  if (questions.length < 1) return null

  return (
    <div className="mt-3 text-sm">
      <p className="font-semibold text-slate-800">
        Ändra ordning och inställningar per fråga ({questions.length} {questions.length === 1 ? 'fråga' : 'frågor'})
      </p>
      <ol className="mt-2 space-y-1.5" aria-label="Frågornas ordning">
        {questions.map((item, index) => {
          const isBank = item.kind === 'bank'
          const taskId = isBank ? (item.task?.taskId || item.key.replace(/^bank:/, '')) : null
          const options = (taskId && itemOptions[taskId]) || {}
          const changeBankOption = patch => {
            if (!taskId || !onItemOptions) return
            onItemOptions({ ...itemOptions, [taskId]: { ...itemOptions[taskId], ...patch } })
          }
          const removeBankTask = () => {
            if (!taskId || !onSelectedTasks) return
            onSelectedTasks(selectedTasks.filter(id => id !== taskId))
          }

          return (
            <li
              key={item.key}
              className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs"
              data-order-key={item.key}
            >
              <span className="w-5 text-right font-semibold text-slate-600">{index + 1}.</span>
              <span className="min-w-48 flex-1">
                <span className="font-medium text-slate-900">
                  <QuestionText>{item.task.promptSv}</QuestionText>
                </span>
                <span className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {kinds[item.kind]}{item.key === 'pending' ? ' · inte tillagd än' : ''}
                </span>
              </span>

              {isBank && (
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-700">
                  {item.task?.responseMode ? (
                    <span className="text-slate-500">
                      {item.task.responseMode === 'text' ? 'Skrivsvar' : 'Val av alternativ'}
                    </span>
                  ) : item.task?.ncmCode ? (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-800">
                      Facit: {item.task.facitSv}
                    </span>
                  ) : item.task?.answerKey ? (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-800">
                      Facit: {item.task.answerKey.format === 'fraction' ? item.task.answerKey.expected.join('/') : item.task.answerKey.expected.join('; ')}
                    </span>
                  ) : (
                    <label className="inline-flex items-center gap-1">
                      <span>Svarstyp</span>
                      <select
                        aria-label={`Svarstyp för fråga ${index + 1}`}
                        disabled={disabled}
                        value={options.answerType || 'number'}
                        onChange={event => changeBankOption({ answerType: event.target.value })}
                        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
                      >
                        <option value="number">Siffersvar</option>
                        <option value="text">Skrivsvar</option>
                      </select>
                    </label>
                  )}
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      aria-label={`Huvudräkning för fråga ${index + 1}`}
                      disabled={disabled || Boolean(item.task?.responseMode)}
                      checked={!item.task?.responseMode && options.gridEnabled === false}
                      onChange={event => changeBankOption({ gridEnabled: !event.target.checked })}
                    />
                    <span>Huvudräkning</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      aria-label={`Rityta för fråga ${index + 1}`}
                      disabled={disabled || Boolean(item.task?.responseMode)}
                      checked={Boolean(options.drawingEnabled)}
                      onChange={event => changeBankOption({ drawingEnabled: event.target.checked })}
                    />
                    <span>Rityta</span>
                  </label>
                  {onSelectedTasks && (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Ta bort fråga ${index + 1}`}
                      onClick={removeBankTask}
                      className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700 hover:bg-rose-100"
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={button}
                  disabled={disabled || index === 0}
                  aria-label={`Flytta fråga ${index + 1} upp`}
                  onClick={() => onOrder(moveQuestion(questions, item.key, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={disabled || index === questions.length - 1}
                  aria-label={`Flytta fråga ${index + 1} ner`}
                  onClick={() => onOrder(moveQuestion(questions, item.key, 1))}
                >
                  ↓
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
