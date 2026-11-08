import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnswerBox } from './PracticeLayout'

const box = props => renderToStaticMarkup(<AnswerBox isAnswering value="" onChange={() => {}} onSubmit={() => {}} {...props} />)

describe('AnswerBox keyboard', () => {
  it('keeps the device keyboard away for number answers on touch screens', () => {
    expect(box({ inputMode: 'none' })).toContain('inputMode="none"')
  })

  it('opens the device keyboard for written answers', () => {
    expect(box({ inputMode: 'none', textAnswer: true })).toContain('inputMode="text"')
  })
})
