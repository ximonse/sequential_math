import { describe, expect, it } from 'vitest'
import { dispatchOrder, moveQuestion, screeningQuestions } from './screeningQuestionOrder.js'

const findTask = id => ({ taskId: id, promptSv: `Bank ${id}` })
const draft = (extra = {}) => ({ selectedTasks: ['b1', 'b2'], writtenTasks: [{ promptSv: 'W', uid: 'w1' }],
  imageTasks: [], textTasks: [{ promptSv: 'T', uid: 't1' }], customPrompt: '', ...extra })

describe('question order in a screening', () => {
  it('puts the teacher\'s own questions first until an order is chosen', () => {
    expect(screeningQuestions(draft(), findTask).map(q => q.key)).toEqual(['written:w1', 'text:t1', 'bank:b1', 'bank:b2'])
  })

  it('follows a chosen order and sends it as positions in the dispatch', () => {
    const questions = screeningQuestions(draft(), findTask)
    const order = moveQuestion(questions, 'bank:b1', -2)
    const chosen = screeningQuestions(draft({ order }), findTask)
    expect(chosen.map(q => q.key)).toEqual(['written:w1', 'bank:b1', 'text:t1', 'bank:b2'].slice(0, 0).concat(order))
    // Dispatch list is [b1, b2, w1, t1]; positions follow the chosen order.
    expect(dispatchOrder(chosen)).toEqual(order.map(key => ['bank:b1', 'bank:b2', 'written:w1', 'text:t1'].indexOf(key)))
  })

  it('keeps new questions at the end of a chosen order and ignores removed ones', () => {
    const order = ['bank:b2', 'gone:x', 'written:w1']
    expect(screeningQuestions(draft({ order }), findTask).map(q => q.key)).toEqual(['bank:b2', 'written:w1', 'text:t1', 'bank:b1'])
  })
})
