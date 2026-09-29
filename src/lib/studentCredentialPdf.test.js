import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadStudentCredentialPdf } from './studentCredentialPdf'

const pdf = vi.hoisted(() => ({
  text: vi.fn(),
  save: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  circle: vi.fn(),
  addImage: vi.fn()
}))

vi.mock('jspdf', () => ({
  jsPDF: class {
    setFont() {}
    setFontSize() {}
    splitTextToSize(text) { return [text] }
    getTextWidth(text) { return String(text).length }
    text(...args) { pdf.text(...args) }
    setDrawColor() {}
    setLineWidth() {}
    setLineDashPattern() {}
    line(...args) { pdf.line(...args) }
    rect(...args) { pdf.rect(...args) }
    roundedRect(...args) { pdf.roundedRect(...args) }
    circle(...args) { pdf.circle(...args) }
    setFillColor() {}
    setTextColor() {}
    addImage(...args) { pdf.addImage(...args) }
    addPage() {}
    save(...args) { pdf.save(...args) }
  }
}))

const credential = {
  studentId: '4705F18E2743C7E2D99D44957304C8DD',
  name: 'Alva',
  displayAlias: 'Blå Räv',
  qrSecret: 'a'.repeat(40),
  pin: '1234'
}

const printedLines = () => pdf.text.mock.calls.map(([lines]) => String(lines))

describe('student credential PDF', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prints the creation name and the code name', async () => {
    await downloadStudentCredentialPdf([credential])

    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Alva'))).toBe(true)
    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Blå Räv'))).toBe(true)
    expect(pdf.save).toHaveBeenCalledWith(expect.stringContaining('Alva'))
  })

  it('ritar ingen QR-kod', async () => {
    await downloadStudentCredentialPdf([credential])
    expect(pdf.addImage).not.toHaveBeenCalled()
  })

  it('uses the code name when an unnamed pupil has no creation name', async () => {
    await downloadStudentCredentialPdf([{ ...credential, name: '' }])

    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Blå Räv'))).toBe(true)
    expect(pdf.save).toHaveBeenCalledWith(expect.stringContaining('Blå-Räv'))
  })

  it('sätter namnet på en avrivningsremsa under innehållet', async () => {
    await downloadStudentCredentialPdf([credential])
    const nameCall = pdf.text.mock.calls.find(([lines]) => lines.includes('Alva'))
    expect(nameCall[2]).toBeGreaterThanOrEqual(97.5)
    expect(pdf.line).toHaveBeenCalledWith(expect.any(Number), 93.5, expect.any(Number), 93.5)
  })

  it('beskriver samma steg som inloggningssidan', async () => {
    await downloadStudentCredentialPdf([credential])
    const printed = printedLines()
    expect(printed).toContain('Skriv ditt kodnamn:')
    expect(printed).toContain('Skriv din PIN:')
    expect(printed).toContain('Tryck på Logga in')
    expect(printed).toEqual(expect.arrayContaining(['1', '2', '3']))
    expect(printed.some(line => line.includes('Skanna'))).toBe(false)
  })

  it('visar kodnamn och PIN i rutor med PIN-siffrorna glesa', async () => {
    await downloadStudentCredentialPdf([credential])
    expect(pdf.roundedRect).toHaveBeenCalledTimes(2)
    expect(pdf.circle).toHaveBeenCalledTimes(3)
    expect(printedLines()).toContain('1  2  3  4')
  })
})
