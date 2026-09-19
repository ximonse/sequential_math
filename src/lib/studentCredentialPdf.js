import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

export const A7_CARDS_PER_A4 = 8
const CARDS_PER_ROW = 4
const CARD_WIDTH_MM = 297 / CARDS_PER_ROW
const CARD_HEIGHT_MM = 105
const QR_SIZE_MM = 28

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
    pdfText(doc, 'MATEMATIK.XIMON.SE', x + 5, y + 8, CARD_WIDTH_MM - 10, 8, 'bold')
    doc.setTextColor(15, 23, 42)
    pdfText(doc, 'Så här loggar du in', x + 5, y + 20, CARD_WIDTH_MM - 10, 7.5, 'bold')
    pdfText(doc, '1. Öppna en webbläsare på dator, surfplatta eller mobil.', x + 5, y + 27, CARD_WIDTH_MM - 10, 5.7)
    pdfText(doc, '2. Skriv matematik.ximon.se i adressfältet.', x + 5, y + 38, CARD_WIDTH_MM - 10, 5.7)
    pdfText(doc, '3. Välj ett sätt att logga in:', x + 5, y + 49, CARD_WIDTH_MM - 10, 5.7, 'bold')
    pdfText(doc, '- Skanna QR-koden och skriv din PIN.', x + 5, y + 56, CARD_WIDTH_MM - 10, 5.7)
    pdfText(doc, '- Eller skriv kodnamnet och din PIN.', x + 5, y + 63, CARD_WIDTH_MM - 10, 5.7)
    doc.addImage(qrCodes[index], 'PNG', x + 5, y + 70, QR_SIZE_MM, QR_SIZE_MM)
    pdfText(doc, name, x + 38, y + 76, CARD_WIDTH_MM - 43, 7, 'bold')
    pdfText(doc, 'Kodnamn', x + 38, y + 83, CARD_WIDTH_MM - 43, 5.5)
    pdfText(doc, String(credential.displayAlias || '–'), x + 38, y + 89, CARD_WIDTH_MM - 43, 6.5, 'bold')
    pdfText(doc, 'PIN: ' + credential.pin, x + 38, y + 98, CARD_WIDTH_MM - 43, 10, 'bold')
    doc.setTextColor(15, 23, 42)
  })

  doc.save(filename)
  return { count: valid.length, pages: Math.ceil(valid.length / A7_CARDS_PER_A4), filename }
}
