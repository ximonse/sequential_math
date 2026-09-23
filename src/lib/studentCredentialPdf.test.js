import { beforeEach, describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode'
import { downloadStudentCredentialPdf } from './studentCredentialPdf'

const pdf = vi.hoisted(() => ({
  text: vi.fn(),
  save: vi.fn()
}))

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,qr') } }))
vi.mock('jspdf', () => ({
  jsPDF: class {
    setFont() {}
    setFontSize() {}
    splitTextToSize(text) { return [text] }
    text(...args) { pdf.text(...args) }
    setDrawColor() {}
    setLineWidth() {}
    rect() {}
    setFillColor() {}
    setTextColor() {}
    addImage() {}
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

  it('prints the creation name without putting it in the QR login payload', async () => {
    await downloadStudentCredentialPdf([credential])

    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Alva'))).toBe(true)
    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Blå Räv'))).toBe(true)
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      JSON.stringify({ version: 1, studentId: credential.studentId, qrSecret: credential.qrSecret }),
      expect.any(Object)
    )
    expect(pdf.save).toHaveBeenCalledWith(expect.stringContaining('Alva'))
  })

  it('uses the code name when an unnamed pupil has no creation name', async () => {
    await downloadStudentCredentialPdf([{ ...credential, name: '' }])

    expect(pdf.text.mock.calls.some(([lines]) => lines.includes('Blå Räv'))).toBe(true)
    expect(pdf.save).toHaveBeenCalledWith(expect.stringContaining('Blå-Räv'))
  })
})
