import QRCode from 'qrcode'

export const A7_CARDS_PER_A4 = 8
const CARDS_PER_ROW = 4
const CARD_WIDTH_MM = 297 / CARDS_PER_ROW
const CARD_HEIGHT_MM = 105

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
  const { jsPDF } = await import('jspdf')
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
    doc.rect(x, y, CARD_WIDTH_MM, 12, 'F')
    doc.setTextColor(255, 255, 255)
    pdfText(doc, 'MATTE TRÄNING - ELEVKORT', x + 5, y + 7.5, CARD_WIDTH_MM - 10, 7, 'bold')
    doc.setTextColor(15, 23, 42)
    pdfText(doc, name, x + 5, y + 23, 39, 11, 'bold')
    pdfText(doc, 'Kodnamn: ' + String(credential.displayAlias || '–'), x + 5, y + 33, 38, 7)
    pdfText(doc, 'PIN: ' + credential.pin, x + 5, y + 47, 38, 14, 'bold')
    pdfText(doc, 'Skanna QR-koden och skriv PIN.', x + 5, y + 60, 38, 6.5)
    pdfText(doc, 'Spara kortet. Koden visas inte igen.', x + 5, y + 70, 38, 6.5)
    doc.addImage(qrCodes[index], 'PNG', x + 48, y + 22, 20, 20)
    doc.setTextColor(71, 85, 105)
    pdfText(doc, 'Elev-ID: ' + credential.studentId, x + 5, y + 96, CARD_WIDTH_MM - 10, 5.5)
    doc.setTextColor(15, 23, 42)
  })

  doc.save(filename)
  return { count: valid.length, pages: Math.ceil(valid.length / A7_CARDS_PER_A4), filename }
}
