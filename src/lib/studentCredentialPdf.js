import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

export const A7_CARDS_PER_A4 = 8
const CARDS_PER_ROW = 4
const CARD_WIDTH_MM = 297 / CARDS_PER_ROW
const CARD_HEIGHT_MM = 105
const QR_SIZE_MM = 30
const NAME_STRIP_TOP_MM = 91

function cardLabel(credential) {
  return String(credential?.name || credential?.displayAlias || 'Elev').trim() || 'Elev'
}

function qrPayload(credential) {
  return JSON.stringify({ version: 1, studentId: credential.studentId, qrSecret: credential.qrSecret })
}

function pdfText(doc, text, x, y, width, size, style = 'normal') {
  doc.setFont('helvetica', style)
  doc.setFontSize(size)
  const lines = doc.splitTextToSize(String(text || ''), width)
  doc.text(lines.slice(0, 2), x, y)
}

// The name sits on a tear-off strip so a teacher can hand out cards by name
// without the login details being readable across the table.
function printTearOffName(doc, name, x, y) {
  doc.setDrawColor(100, 116, 139)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([2, 1], 0)
  doc.line(x, y + NAME_STRIP_TOP_MM, x + CARD_WIDTH_MM, y + NAME_STRIP_TOP_MM)
  doc.setLineDashPattern([], 0)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  let fontSize = 12
  let lines
  do {
    doc.setFontSize(fontSize)
    lines = doc.splitTextToSize(name, CARD_WIDTH_MM - 10)
    if (lines.length <= 2) break
    fontSize -= 1
  } while (fontSize >= 6)
  doc.text(lines.slice(0, 2), x + CARD_WIDTH_MM / 2, y + (lines.length === 1 ? 100 : 97.5), { align: 'center' })
}

export function credentialCardsFilename(credentials) {
  const first = cardLabel(credentials?.[0]).replace(/[^a-zA-Z0-9ÅÄÖåäö_-]+/g, '-').slice(0, 30) || 'elevkort'
  return `elevkort-${first}-${new Date().toISOString().slice(0, 10)}.pdf`
}

/**
 * Generates a one-time download. Raw QR secrets and PINs are only read from
 * the in-memory credential response and are never persisted by this helper.
 */
export async function downloadStudentCredentialPdf(credentials, filename = credentialCardsFilename(credentials)) {
  const valid = (Array.isArray(credentials) ? credentials : []).filter(item => (
    item && typeof item.studentId === 'string' && typeof item.qrSecret === 'string'
      && item.qrSecret.length >= 40 && /^\d{4}$/.test(String(item.pin || ''))
  ))
  if (!valid.length) throw new Error('Det finns inga kompletta elevkort att skapa PDF av.')

  const qrCodes = await Promise.all(valid.map(item => QRCode.toDataURL(qrPayload(item), {
    errorCorrectionLevel: 'M', margin: 1, width: 360
  })))
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  valid.forEach((credential, index) => {
    if (index > 0 && index % A7_CARDS_PER_A4 === 0) doc.addPage('a4', 'landscape')
    const slot = index % A7_CARDS_PER_A4
    const column = slot % CARDS_PER_ROW
    const row = Math.floor(slot / CARDS_PER_ROW)
    const x = column * CARD_WIDTH_MM
    const y = row * CARD_HEIGHT_MM
    const name = cardLabel(credential)

    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.35)
    doc.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM)
    doc.setFillColor(15, 118, 110)
    doc.rect(x, y, CARD_WIDTH_MM, 13, 'F')
    doc.setTextColor(255, 255, 255)
    pdfText(doc, 'MATEMATIK.XIMON.SE', x + 5, y + 8, CARD_WIDTH_MM - 10, 9, 'bold')
    doc.setTextColor(15, 23, 42)
    // The numbers match the steps the pupil sees on the login screen.
    pdfText(doc, 'Öppna matematik.ximon.se', x + 5, y + 20, CARD_WIDTH_MM - 10, 9.5, 'bold')
    pdfText(doc, '1. Skanna ditt elevkort', x + 5, y + 29, CARD_WIDTH_MM - 10, 9.5)
    pdfText(doc, '2. Skriv din PIN', x + 5, y + 37, CARD_WIDTH_MM - 10, 9.5)
    pdfText(doc, '3. Tryck Logga in', x + 5, y + 45, CARD_WIDTH_MM - 10, 9.5)
    doc.addImage(qrCodes[index], 'PNG', x + 5, y + 50, QR_SIZE_MM, QR_SIZE_MM)
    pdfText(doc, 'Om kameran inte fungerar:', x + 39, y + 52, CARD_WIDTH_MM - 44, 8.5, 'bold')
    pdfText(doc, 'Kodnamn:', x + 39, y + 61, CARD_WIDTH_MM - 44, 8.5)
    pdfText(doc, String(credential.displayAlias || '–'), x + 39, y + 68, CARD_WIDTH_MM - 44, 8, 'bold')
    pdfText(doc, 'PIN: ' + credential.pin, x + 39, y + 78, CARD_WIDTH_MM - 44, 11, 'bold')
    printTearOffName(doc, name, x, y)
  })

  doc.save(filename)
  return { count: valid.length, pages: Math.ceil(valid.length / A7_CARDS_PER_A4), filename }
}
