import { jsPDF } from 'jspdf'

export const A7_CARDS_PER_A4 = 8
const CARDS_PER_ROW = 4
const CARD_WIDTH_MM = 297 / CARDS_PER_ROW
const CARD_HEIGHT_MM = 105
const HEADER_HEIGHT_MM = 8.6
const NAME_STRIP_TOP_MM = 93.5
const MARGIN_MM = 4.1
const BOX_WIDTH_MM = CARD_WIDTH_MM - 2 * MARGIN_MM
const BOX_HEIGHT_MM = 16.3
const BADGE_RADIUS_MM = 2.5

const TEAL = [15, 118, 110]
const INK = [15, 23, 42]
const BOX_FILL = [241, 245, 249]
const BOX_LINE = [203, 213, 225]

function cardLabel(credential) {
  return String(credential?.name || credential?.displayAlias || 'Elev').trim() || 'Elev'
}

function shrinkToFit(doc, text, maxWidth, startSize, minSize) {
  let size = startSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5
    doc.setFontSize(size)
  }
  return size
}

function printHeader(doc, x, y) {
  doc.setFillColor(...TEAL)
  doc.rect(x, y, CARD_WIDTH_MM, HEADER_HEIGHT_MM, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('MATEMATIK.XIMON.SE', x + CARD_WIDTH_MM / 2, y + 5.3, { align: 'center' })
}

function printAddress(doc, x, y) {
  const baseline = y + 13.9
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  const lead = 'Gå till '
  doc.text(lead, x + MARGIN_MM, baseline)
  const offset = doc.getTextWidth(lead)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('matematik.ximon.se', x + MARGIN_MM + offset, baseline)
}

function printStep(doc, x, y, number, label, centerY) {
  const cx = x + MARGIN_MM + BADGE_RADIUS_MM
  doc.setFillColor(...TEAL)
  doc.circle(cx, y + centerY, BADGE_RADIUS_MM, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(String(number), cx, y + centerY + 1.05, { align: 'center' })
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.text(label, x + MARGIN_MM + 2 * BADGE_RADIUS_MM + 1.7, y + centerY + 1.3)
}

function printBox(doc, x, y, top, text, fontSize, minFontSize) {
  doc.setFillColor(...BOX_FILL)
  doc.setDrawColor(...BOX_LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(x + MARGIN_MM, y + top, BOX_WIDTH_MM, BOX_HEIGHT_MM, 1.8, 1.8, 'FD')
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  const size = shrinkToFit(doc, text, BOX_WIDTH_MM - 6, fontSize, minFontSize)
  const capHeightMm = 0.72 * size * 0.3528
  doc.text(text, x + CARD_WIDTH_MM / 2, y + top + BOX_HEIGHT_MM / 2 + capHeightMm / 2, { align: 'center' })
}

// The name sits on a tear-off strip so a teacher can hand out cards by name
// without the login details being readable across the table.
function printTearOffName(doc, name, x, y) {
  doc.setDrawColor(100, 116, 139)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([1.2, 0.9], 0)
  doc.line(x + MARGIN_MM, y + NAME_STRIP_TOP_MM, x + CARD_WIDTH_MM - MARGIN_MM, y + NAME_STRIP_TOP_MM)
  doc.setLineDashPattern([], 0)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  shrinkToFit(doc, name, CARD_WIDTH_MM - 10, 11, 6)
  doc.text(name, x + CARD_WIDTH_MM / 2, y + 100, { align: 'center' })
}

export function credentialCardsFilename(credentials) {
  const first = cardLabel(credentials?.[0]).replace(/[^a-zA-Z0-9ÅÄÖåäö_-]+/g, '-').slice(0, 30) || 'elevkort'
  return `elevkort-${first}-${new Date().toISOString().slice(0, 10)}.pdf`
}

/**
 * Generates a one-time download. Raw PINs are only read from the in-memory
 * credential response and are never persisted by this helper.
 */
export async function downloadStudentCredentialPdf(credentials, filename = credentialCardsFilename(credentials)) {
  const valid = (Array.isArray(credentials) ? credentials : []).filter(item => (
    item && typeof item.studentId === 'string' && item.studentId
      && String(item.displayAlias || '').trim() && /^\d{4}$/.test(String(item.pin || ''))
  ))
  if (!valid.length) throw new Error('Det finns inga kompletta elevkort att skapa PDF av.')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  valid.forEach((credential, index) => {
    if (index > 0 && index % A7_CARDS_PER_A4 === 0) doc.addPage('a4', 'landscape')
    const slot = index % A7_CARDS_PER_A4
    const column = slot % CARDS_PER_ROW
    const row = Math.floor(slot / CARDS_PER_ROW)
    const x = column * CARD_WIDTH_MM
    const y = row * CARD_HEIGHT_MM
    const name = cardLabel(credential)

    doc.setDrawColor(...BOX_LINE)
    doc.setLineWidth(0.3)
    doc.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM)
    printHeader(doc, x, y)
    printAddress(doc, x, y)
    // The numbers match the steps the pupil sees on the login screen.
    printStep(doc, x, y, 1, 'Skriv ditt kodnamn:', 24.1)
    printBox(doc, x, y, 28.4, String(credential.displayAlias || '–'), 13, 8)
    printStep(doc, x, y, 2, 'Skriv din PIN:', 54)
    printBox(doc, x, y, 58.4, String(credential.pin).split('').join('  '), 22, 22)
    printStep(doc, x, y, 3, 'Tryck på Logga in', 84)
    printTearOffName(doc, name, x, y)
  })

  doc.save(filename)
  return { count: valid.length, pages: Math.ceil(valid.length / A7_CARDS_PER_A4), filename }
}
