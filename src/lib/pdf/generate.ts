import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

interface ScanData {
  id: string
  url: string
  score: number
  grade: string
  findings: {
    severity: string
    name: string
    category: string
    description?: string
    remediation?: string
  }[]
  categoryScores: { category: string; score: number }[]
  completedAt?: string | Date
}

// Color palette
const C = {
  bg:       rgb(0.02, 0.02, 0.03),   // #050508
  card:     rgb(0.05, 0.05, 0.08),   // #0d0d14
  border:   rgb(0.12, 0.12, 0.21),   // #1e1e35
  dim:      rgb(0.53, 0.53, 0.67),   // #8888aa
  muted:    rgb(0.23, 0.23, 0.36),   // #3a3a5c
  white:    rgb(0.94, 0.94, 1.00),   // #f0f0ff
  green:    rgb(0.29, 0.87, 0.50),   // #4ade80
  red:      rgb(0.94, 0.27, 0.27),   // #ef4444
  amber:    rgb(0.96, 0.62, 0.04),   // #f59e0b
  orange:   rgb(0.98, 0.47, 0.09),   // #f97316
  blue:     rgb(0.38, 0.65, 0.98),   // #60a5fa
}

function severityColor(sev: string) {
  return { CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.orange, LOW: C.blue, INFO: C.dim }[sev] ?? C.dim
}

function gradeColor(score: number) {
  return score >= 80 ? C.green : score >= 60 ? C.amber : C.red
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color })
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: C.border })
}

function text(page: PDFPage, str: string, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  page.drawText(str, { x, y, font, size, color })
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export async function generateScanPdf(scan: ScanData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const W = 595.28  // A4 width  (pt)
  const H = 841.89  // A4 height (pt)
  const PAD = 40

  // ── Page 1: Header + Score summary + Category scores ──────────────────────
  const p1 = pdfDoc.addPage([W, H])
  rect(p1, 0, 0, W, H, C.bg)

  // Header bar
  rect(p1, 0, H - 60, W, 60, C.card)
  text(p1, 'VAULTRIX', PAD, H - 38, fontBold, 20, C.green)
  text(p1, 'Security Scan Report', PAD, H - 52, fontReg, 9, C.dim)

  const date = scan.completedAt
    ? new Date(scan.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString()
  const dateW = fontReg.widthOfTextAtSize(date, 9)
  text(p1, date, W - PAD - dateW, H - 40, fontReg, 9, C.dim)

  line(p1, 0, H - 60, W, H - 60)

  let y = H - 80

  // Target URL
  text(p1, 'TARGET', PAD, y, fontBold, 7, C.muted)
  y -= 14
  text(p1, truncate(scan.url, 80), PAD, y, fontReg, 11, C.white)
  y -= 24

  line(p1, PAD, y, W - PAD, y)
  y -= 20

  // Score cards row
  const cardW = (W - PAD * 2 - 12) / 4
  const cardH = 72
  const cardY = y - cardH

  const cards = [
    { label: 'SECURITY SCORE', value: String(scan.score), color: gradeColor(scan.score) },
    { label: 'GRADE',          value: scan.grade ?? '?',  color: gradeColor(scan.score) },
    { label: 'TOTAL FINDINGS', value: String(scan.findings.length), color: C.white },
    { label: 'CRITICAL',       value: String(scan.findings.filter(f => f.severity === 'CRITICAL').length), color: C.red },
  ]
  cards.forEach((card, i) => {
    const cx = PAD + i * (cardW + 4)
    rect(p1, cx, cardY, cardW, cardH, C.card)
    p1.drawRectangle({ x: cx, y: cardY, width: cardW, height: cardH, borderColor: C.border, borderWidth: 0.5 })
    const lw = fontBold.widthOfTextAtSize(card.label, 7)
    text(p1, card.label, cx + (cardW - lw) / 2, cardY + cardH - 16, fontBold, 7, C.muted)
    const vw = fontBold.widthOfTextAtSize(card.value, 28)
    text(p1, card.value, cx + (cardW - vw) / 2, cardY + 18, fontBold, 28, card.color)
  })

  y = cardY - 24

  // Category scores section
  if (scan.categoryScores.length > 0) {
    text(p1, 'CATEGORY SCORES', PAD, y, fontBold, 8, C.muted)
    y -= 14

    rect(p1, PAD, y - scan.categoryScores.length * 20, W - PAD * 2, scan.categoryScores.length * 20 + 10, C.card)
    p1.drawRectangle({ x: PAD, y: y - scan.categoryScores.length * 20, width: W - PAD * 2, height: scan.categoryScores.length * 20 + 10, borderColor: C.border, borderWidth: 0.5 })

    const colW = (W - PAD * 2 - 30) / 2
    scan.categoryScores.forEach((cs, i) => {
      const col = cs.score >= 80 ? C.green : cs.score >= 60 ? C.amber : C.red
      const cx = PAD + 10 + (i % 2) * (colW + 10)
      const cy = y - Math.floor(i / 2) * 20 - 14

      text(p1, truncate(cs.category, 22), cx, cy, fontReg, 9, C.dim)
      const scoreStr = String(cs.score)
      const sw = fontBold.widthOfTextAtSize(scoreStr, 9)
      text(p1, scoreStr, cx + colW - sw - 5, cy, fontBold, 9, col)

      // Bar
      const barX = cx
      const barY = cy - 7
      const barW = colW - sw - 12
      rect(p1, barX, barY, barW, 3, C.border)
      rect(p1, barX, barY, barW * (cs.score / 100), 3, col)
    })

    y -= Math.ceil(scan.categoryScores.length / 2) * 20 + 20
  }

  // Severity breakdown
  const sevs = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
  const counts = sevs.map(s => scan.findings.filter(f => f.severity === s).length)
  const totalNonZero = counts.filter(c => c > 0).length

  if (totalNonZero > 0) {
    line(p1, PAD, y, W - PAD, y)
    y -= 16
    text(p1, 'SEVERITY BREAKDOWN', PAD, y, fontBold, 8, C.muted)
    y -= 14

    const chipW = (W - PAD * 2 - 16) / 5
    sevs.forEach((s, i) => {
      const cx = PAD + i * (chipW + 4)
      rect(p1, cx, y - 28, chipW, 34, C.card)
      p1.drawRectangle({ x: cx, y: y - 28, width: chipW, height: 34, borderColor: C.border, borderWidth: 0.5 })
      const col = severityColor(s)
      const nStr = String(counts[i])
      const nw = fontBold.widthOfTextAtSize(nStr, 18)
      text(p1, nStr, cx + (chipW - nw) / 2, y - 16, fontBold, 18, col)
      const sw = fontReg.widthOfTextAtSize(s, 7)
      text(p1, s, cx + (chipW - sw) / 2, y - 26, fontReg, 7, C.muted)
    })
  }

  // Footer on p1
  line(p1, PAD, 30, W - PAD, 30)
  text(p1, 'VAULTRIX — Enterprise Web Security Scanner — Confidential', PAD, 18, fontReg, 7, C.muted)
  const pg1 = 'Page 1'
  text(p1, pg1, W - PAD - fontReg.widthOfTextAtSize(pg1, 7), 18, fontReg, 7, C.muted)

  // ── Page 2+: Findings table ───────────────────────────────────────────────
  const findings = scan.findings.slice(0, 150) // cap at 150
  const ROWS_PER_PAGE = 28
  const pages = Math.ceil(findings.length / ROWS_PER_PAGE) || 1
  const ROW_H = 18
  const TABLE_TOP = H - 80
  const COL = { sev: PAD, name: PAD + 72, cat: PAD + 72 + 280 }

  for (let pg = 0; pg < pages; pg++) {
    const page = pdfDoc.addPage([W, H])
    rect(page, 0, 0, W, H, C.bg)

    // Header
    rect(page, 0, H - 60, W, 60, C.card)
    text(page, 'VAULTRIX', PAD, H - 38, fontBold, 20, C.green)
    text(page, 'Findings', PAD, H - 52, fontReg, 9, C.dim)
    const pgLabel = `Page ${pg + 2}`
    text(page, pgLabel, W - PAD - fontReg.widthOfTextAtSize(pgLabel, 9), H - 40, fontReg, 9, C.dim)
    line(page, 0, H - 60, W, H - 60)

    // Table header
    const thY = TABLE_TOP - 14
    rect(page, PAD, thY - 4, W - PAD * 2, ROW_H, C.border)
    text(page, 'SEVERITY', COL.sev + 4, thY + 4, fontBold, 7, C.muted)
    text(page, 'FINDING', COL.name, thY + 4, fontBold, 7, C.muted)
    text(page, 'CATEGORY', COL.cat, thY + 4, fontBold, 7, C.muted)

    const slice = findings.slice(pg * ROWS_PER_PAGE, (pg + 1) * ROWS_PER_PAGE)
    slice.forEach((f, i) => {
      const ry = thY - (i + 1) * ROW_H - 4
      if (i % 2 === 1) rect(page, PAD, ry - 2, W - PAD * 2, ROW_H, C.card)

      const col = severityColor(f.severity)
      // Severity pill background
      rect(page, COL.sev, ry + 2, 64, 11, rgb(col.red * 0.15, col.green * 0.15, col.blue * 0.15))
      text(page, f.severity, COL.sev + 3, ry + 4, fontBold, 7, col)

      text(page, truncate(f.name, 46), COL.name, ry + 4, fontReg, 8, C.white)
      text(page, truncate(f.category, 24), COL.cat, ry + 4, fontReg, 8, C.dim)
    })

    if (findings.length > 150 && pg === pages - 1) {
      const more = `… and ${scan.findings.length - 150} more findings not shown`
      text(page, more, PAD, thY - (slice.length + 1) * ROW_H - 8, fontReg, 8, C.muted)
    }

    // Footer
    line(page, PAD, 30, W - PAD, 30)
    text(page, 'VAULTRIX — Enterprise Web Security Scanner — Confidential', PAD, 18, fontReg, 7, C.muted)
    text(page, pgLabel, W - PAD - fontReg.widthOfTextAtSize(pgLabel, 7), 18, fontReg, 7, C.muted)
  }

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}
