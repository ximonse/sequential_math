import { describe, expect, it } from 'vitest'
import { barAlignedCells } from './barAlignment.js'

const bar = (row, from, to) => ({ axis: 'horizontal', placement: 'grid-border', from: { row, column: from }, to: { row, column: to } })
const grid = (cells, lines) => ({ rows: 8, columns: 12, lines, cells: Object.fromEntries(Object.entries(cells).map(([k, main]) => [k, { main, note: '' }])) })

describe('own short division: "=" and answer on the fraction bar', () => {
  it('moves "=" and the answer right of the bar down half a row from the row above', () => {
    const g = grid({ '1:1': '1', '1:2': '7', '1:3': '6', '1:4': '=', '1:5': '4', '1:6': '4', '2:2': '4' }, [bar(1, 1, 3)])
    expect([...barAlignedCells(g)]).toEqual([['1:4', 'down'], ['1:5', 'down'], ['1:6', 'down']])
  })

  it('moves them up from the row below, allows one empty column and follows the cursor', () => {
    const g = grid({ '1:1': '7', '1:2': '8', '2:5': '=', '2:6': '2' }, [bar(1, 1, 3)])
    expect([...barAlignedCells(g, { row: 2, column: 7 })]).toEqual([['2:5', 'up'], ['2:6', 'up'], ['2:7', 'up']])
  })

  it('leaves ordinary rows alone', () => {
    expect(barAlignedCells(grid({ '1:4': '=', '1:5': '3' }, [])).size).toBe(0)
    expect(barAlignedCells(grid({ '1:7': '=' }, [bar(1, 1, 3)])).size).toBe(0)
  })
})
