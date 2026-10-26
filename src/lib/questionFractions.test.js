import { describe, expect, it } from 'vitest'
import { parseQuestionFractions } from './questionFractions'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import QuestionText from '../components/QuestionText'

describe('question fraction notation', () => {
  it('shows shorthand and explicit fractions together in ordinary prose', () => {
    expect(parseQuestionFractions('Jämför 6//2 och \\frac{3}{4}.')).toEqual([
      'Jämför ', { numerator: '6', denominator: '2' }, ' och ',
      { numerator: '3', denominator: '4' }, '.'
    ])
  })

  it('preserves ordinary division, dates, links and incomplete notation', () => {
    for (const text of ['6/2', '26/10/2026', 'https://example.se/6//2',
      '6//', 'x6//2', '6//2x', '\\frac{6}{}', '\\frac{6}{2']) {
      expect(parseQuestionFractions(text)).toEqual([text])
    }
  })

  it('supports signed and decimal numbers, with spaces around the shorthand', () => {
    expect(parseQuestionFractions('−6,5 // 2 + -3//4')).toEqual([
      { numerator: '−6,5', denominator: '2' }, ' + ', { numerator: '-3', denominator: '4' }
    ])
  })

  it('formats fractions next to sentence punctuation', () => {
    expect(parseQuestionFractions('6//2, 3//4.')).toEqual([
      { numerator: '6', denominator: '2' }, ', ', { numerator: '3', denominator: '4' }, '.'
    ])
  })

  it('renders readable fraction labels and escapes authored text as text', () => {
    const html = renderToStaticMarkup(createElement(QuestionText, null, '<img src=x> \\frac{<b>6</b>}{2}'))
    expect(html).toContain('role="math"')
    expect(html).toContain('aria-label="&lt;b&gt;6&lt;/b&gt; genom 2"')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
  })

  it('keeps simple expressions in explicit numerator and denominator intact', () => {
    expect(parseQuestionFractions('\\frac{ a + 1 }{ b − 2 }')).toEqual([
      { numerator: 'a + 1', denominator: 'b − 2' }
    ])
    expect(parseQuestionFractions('')).toEqual([])
  })
})
