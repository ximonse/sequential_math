import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadStudentCredentialPdf } from './studentCredentialPdf'

const pdf = vi.hoisted(() => ({
  text: vi.fn(),
  save: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  addImage: vi.fn()
}))

vi.mock('jspdf', () => ({
  jsPDF: class {
    setFont() {}
    setFontSize() {}
    splitTextToSize(text) { return [text] }
    text(...args) { pdf.text(...args) }
    setDrawColor() {}
    setLineWidth() {}
    setLineDashPattern() {}
    line(...args) { pdf.line(...args) }
    rect(...args) { pdf.rect(...args) }
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
    expect(pdf.line).toHaveBeenCalledWith(0, 91, 74.25, 91)
  })

  it('beskriver samma steg som inloggningssidan', async () => {
    await downloadStudentCredentialPdf([credential])
    const printed = pdf.text.mock.calls.map(([lines]) => String(lines))
    expect(printed).toContain('1. Skriv ditt kodnamn')
    expect(printed).toContain('2. Skriv din PIN')
    expect(printed).toContain('3. Tryck Logga in')
    expect(printed.some(line => line.includes('Skanna'))).toBe(false)
  })
})
