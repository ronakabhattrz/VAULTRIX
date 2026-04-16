import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Finding {
  severity: string
  name: string
  category: string
  description?: string
  evidence?: string
  impact?: string
  remediation?: string
  references?: string[]
  cvssScore?: number
  cveIds?: string[]
  owaspId?: string
}

export interface ScanData {
  id: string
  url: string
  domain: string
  score: number
  grade: string
  findings: Finding[]
  categoryScores: { category: string; score: number }[]
  completedAt?: string | Date
  techStack?: Record<string, unknown>
  modulesRun?: string[]
  scanDuration?: number
  serverSoftware?: string | null
  ipAddress?: string | null
}

// ─── Color palette (white/light theme) ───────────────────────────────────────

const C = {
  white:     rgb(1.00, 1.00, 1.00),
  pageBg:    rgb(0.97, 0.98, 1.00),  // very light blue-gray
  navyDark:  rgb(0.06, 0.09, 0.18),  // #0f1730
  navyMid:   rgb(0.10, 0.14, 0.28),  // #1a2448
  indigo:    rgb(0.31, 0.28, 0.90),  // #4f47e6
  textDark:  rgb(0.12, 0.15, 0.24),  // #1e2740
  textMid:   rgb(0.35, 0.40, 0.53),  // #596687
  textLight: rgb(0.58, 0.63, 0.73),  // #94a1ba
  border:    rgb(0.88, 0.90, 0.95),  // #e0e6f2
  cardBg:    rgb(1.00, 1.00, 1.00),
  cardHdr:   rgb(0.97, 0.98, 1.00),
  critical:  rgb(0.86, 0.15, 0.15),  // #dc2626
  high:      rgb(0.85, 0.47, 0.03),  // #d97706
  medium:    rgb(0.91, 0.36, 0.04),  // #ea5804
  low:       rgb(0.15, 0.39, 0.93),  // #2663ed
  info:      rgb(0.40, 0.48, 0.60),  // #667a99
  green:     rgb(0.09, 0.64, 0.32),  // #16a352
  amber:     rgb(0.85, 0.47, 0.03),
  red:       rgb(0.86, 0.15, 0.15),
}

function sevColor(s: string) {
  return ({ CRITICAL: C.critical, HIGH: C.high, MEDIUM: C.medium, LOW: C.low, INFO: C.info } as Record<string, ReturnType<typeof rgb>>)[s] ?? C.info
}
function sevBg(s: string) {
  const m: Record<string, ReturnType<typeof rgb>> = {
    CRITICAL: rgb(1.00, 0.93, 0.93),
    HIGH:     rgb(1.00, 0.96, 0.88),
    MEDIUM:   rgb(1.00, 0.95, 0.90),
    LOW:      rgb(0.92, 0.95, 1.00),
    INFO:     rgb(0.94, 0.96, 0.99),
  }
  return m[s] ?? rgb(0.95, 0.96, 0.99)
}
function scoreColor(n: number) {
  return n >= 80 ? C.green : n >= 60 ? C.amber : C.red
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const W = 595.28
const H = 841.89
const ML = 48   // margin left
const MR = 48   // margin right
const CW = W - ML - MR  // content width = 499.28

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(str: string, font: PDFFont, size: number, maxW: number): string[] {
  if (!str?.trim()) return []
  const words = str.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test
    } else {
      if (line) lines.push(line)
      // Handle word longer than maxW
      let w = word
      while (font.widthOfTextAtSize(w, size) > maxW && w.length > 4) w = w.slice(0, -1)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawMultiText(
  page: PDFPage, str: string,
  x: number, y: number,
  font: PDFFont, size: number,
  color: ReturnType<typeof rgb>,
  maxW: number, lineH: number
): number {
  const lines = wrapText(str, font, size, maxW)
  lines.forEach((l, i) => page.drawText(l, { x, y: y - i * lineH, font, size, color }))
  return lines.length * lineH
}

function measureText(str: string, font: PDFFont, size: number, maxW: number, lineH: number): number {
  return wrapText(str, font, size, maxW).length * lineH
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>, borderColor?: ReturnType<typeof rgb>, borderWidth = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color, borderColor, borderWidth: borderColor ? borderWidth : 0 })
}

function hline(page: PDFPage, x1: number, x2: number, y: number, color = C.border) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color })
}

function txt(page: PDFPage, str: string, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  if (str) page.drawText(str, { x, y, font, size, color })
}

function badge(page: PDFPage, label: string, x: number, y: number, font: PDFFont, size: number, fg: ReturnType<typeof rgb>, bg: ReturnType<typeof rgb>) {
  const tw = font.widthOfTextAtSize(label, size)
  const padX = 5, padY = 2
  rect(page, x, y - padY, tw + padX * 2, size + padY * 2 + 1, bg)
  txt(page, label, x + padX, y, font, size, fg)
  return tw + padX * 2
}

// ─── Page header ──────────────────────────────────────────────────────────────

function drawPageHeader(page: PDFPage, fontB: PDFFont, fontR: PDFFont, subtitle: string, pageNum: number, totalPages: number) {
  // Full-width dark navy bar
  rect(page, 0, H - 52, W, 52, C.navyDark)
  // Logo
  txt(page, 'VAULTRIX', ML, H - 33, fontB, 16, C.white)
  // Accent line under logo
  page.drawRectangle({ x: ML, y: H - 38, width: 60, height: 2, color: C.indigo })
  // Subtitle
  txt(page, subtitle, ML, H - 46, fontR, 8, rgb(0.65, 0.70, 0.82))
  // Page number right
  const pgStr = `Page ${pageNum} of ${totalPages}`
  const pgW = fontR.widthOfTextAtSize(pgStr, 8)
  txt(page, pgStr, W - MR - pgW, H - 36, fontR, 8, rgb(0.55, 0.60, 0.75))
  // Thin top accent line
  rect(page, 0, H - 3, W, 3, C.indigo)
}

function drawPageFooter(page: PDFPage, fontR: PDFFont, scanId: string) {
  hline(page, ML, W - MR, 36)
  txt(page, 'VAULTRIX Security Report  •  Confidential  •  Point-in-time assessment', ML, 22, fontR, 7, C.textLight)
  const idStr = `Scan ID: ${scanId}`
  const idW = fontR.widthOfTextAtSize(idStr, 7)
  txt(page, idStr, W - MR - idW, 22, fontR, 7, C.textLight)
}

// ─── Score circle (SVG arc) ───────────────────────────────────────────────────

function drawScoreCircle(page: PDFPage, cx: number, cy: number, r: number, score: number, fontB: PDFFont, fontR: PDFFont) {
  const toRad = (d: number) => (d * Math.PI) / 180
  // Draw from 210° to 330° (150° sweep for track, leaving a 30° gap at bottom)
  // We use a 240° arc (from 210° to -30° / 330°), clockwise
  const startDeg = 210
  const sweepDeg = 240
  const scoreDeg = (score / 100) * sweepDeg

  const arcPath = (fromDeg: number, toDeg: number, color: ReturnType<typeof rgb>, strokeWidth: number) => {
    const fx = cx + r * Math.cos(toRad(fromDeg))
    const fy = cy + r * Math.sin(toRad(fromDeg))
    const tx = cx + r * Math.cos(toRad(toDeg))
    const ty = cy + r * Math.sin(toRad(toDeg))
    const diff = ((toDeg - fromDeg) + 360) % 360
    const large = diff > 180 ? 1 : 0
    // SVG arc: M fx,fy A r,r 0 largeArc,0 tx,ty (0 = counterclockwise in SVG, but PDF Y is up)
    const d = `M ${fx.toFixed(2)},${fy.toFixed(2)} A ${r},${r} 0 ${large},0 ${tx.toFixed(2)},${ty.toFixed(2)}`
    page.drawSvgPath(d, { x: 0, y: 0, borderColor: color, borderWidth: strokeWidth, color: rgb(0,0,0) })
  }

  // Track (background)
  arcPath(startDeg, startDeg + sweepDeg, C.border, 10)
  // Score fill
  if (score > 0) {
    const endDeg = startDeg + scoreDeg
    arcPath(startDeg, endDeg, scoreColor(score), 10)
  }

  // Inner white circle to make it a ring
  page.drawEllipse({ x: cx, y: cy, xScale: r - 7, yScale: r - 7, color: C.white })

  // Score text
  const scoreStr = String(score)
  const sSize = 28
  const sW = fontB.widthOfTextAtSize(scoreStr, sSize)
  txt(page, scoreStr, cx - sW / 2, cy - 8, fontB, sSize, scoreColor(score))
  const subStr = '/100'
  const subW = fontR.widthOfTextAtSize(subStr, 9)
  txt(page, subStr, cx - subW / 2, cy - 20, fontR, 9, C.textLight)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateScanPdf(scan: ScanData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontM = await pdfDoc.embedFont(StandardFonts.Courier)

  // Pre-calculate total pages
  const FINDINGS_PER_PAGE = 3
  const findingPages = Math.ceil((scan.findings.length || 1) / FINDINGS_PER_PAGE)
  const hasTech = scan.techStack && Object.keys(scan.techStack).some(k => {
    const v = scan.techStack![k]
    return v && !(Array.isArray(v) && v.length === 0)
  })
  const totalPages = 2 + findingPages + (hasTech ? 1 : 0)

  // ── Page 1: Executive Summary ───────────────────────────────────────────────
  const p1 = pdfDoc.addPage([W, H])
  rect(p1, 0, 0, W, H, C.pageBg)
  drawPageHeader(p1, fontB, fontR, 'Executive Summary', 1, totalPages)
  drawPageFooter(p1, fontR, scan.id)

  const date = scan.completedAt
    ? new Date(scan.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString()

  let y = H - 72

  // Target info card
  rect(p1, ML, y - 54, CW, 60, C.cardBg, C.border)
  // left accent bar
  rect(p1, ML, y - 54, 3, 60, C.indigo)
  txt(p1, 'SCAN TARGET', ML + 14, y - 9, fontB, 7, C.textLight)
  const urlMax = CW - 160
  const urlLines = wrapText(scan.url, fontB, 11, urlMax)
  txt(p1, urlLines[0] ?? scan.url, ML + 14, y - 22, fontB, 11, C.textDark)
  if (urlLines[1]) txt(p1, urlLines[1], ML + 14, y - 34, fontR, 10, C.textMid)

  const metaX = W - MR - 150
  txt(p1, 'Date', metaX, y - 9, fontB, 7, C.textLight)
  txt(p1, date, metaX, y - 21, fontR, 9, C.textMid)
  txt(p1, 'Modules Run', metaX, y - 33, fontB, 7, C.textLight)
  txt(p1, (scan.modulesRun ?? []).join(', ') || '—', metaX, y - 44, fontR, 8, C.textMid)

  y -= 72

  // ── Score + Grade + Stats row ──
  const scoreCardW = 130
  const statsCardW = (CW - scoreCardW - 12) / 3

  // Score circle card
  const scH = 148
  rect(p1, ML, y - scH, scoreCardW, scH, C.cardBg, C.border)
  drawScoreCircle(p1, ML + scoreCardW / 2, y - scH / 2 - 10, 42, scan.score, fontB, fontR)
  const gradeStr = scan.grade ?? '?'
  const gradeW = fontB.widthOfTextAtSize(gradeStr, 22)
  txt(p1, gradeStr, ML + scoreCardW / 2 - gradeW / 2, y - scH + 24, fontB, 22, scoreColor(scan.score))
  const gradeLbl = 'GRADE'
  const gradeLblW = fontR.widthOfTextAtSize(gradeLbl, 7)
  txt(p1, gradeLbl, ML + scoreCardW / 2 - gradeLblW / 2, y - scH + 13, fontR, 7, C.textLight)

  // Stats cards
  const statCards = [
    { label: 'TOTAL FINDINGS', value: String(scan.findings.length), color: C.textDark },
    { label: 'CRITICAL', value: String(scan.findings.filter(f => f.severity === 'CRITICAL').length), color: C.critical },
    { label: 'HIGH', value: String(scan.findings.filter(f => f.severity === 'HIGH').length), color: C.high },
  ]
  statCards.forEach((sc, i) => {
    const sx = ML + scoreCardW + 6 + i * (statsCardW + 3)
    rect(p1, sx, y - scH, statsCardW, scH, C.cardBg, C.border)
    const vW = fontB.widthOfTextAtSize(sc.value, 32)
    txt(p1, sc.value, sx + statsCardW / 2 - vW / 2, y - scH / 2 + 8, fontB, 32, sc.color)
    const lW = fontR.widthOfTextAtSize(sc.label, 7)
    txt(p1, sc.label, sx + statsCardW / 2 - lW / 2, y - scH + 14, fontR, 7, C.textLight)
  })

  y -= scH + 16

  // ── Severity breakdown ──
  const sevs = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
  const sevCounts = Object.fromEntries(sevs.map(s => [s, scan.findings.filter(f => f.severity === s).length]))
  const chipW = CW / 5 - 3
  txt(p1, 'SEVERITY BREAKDOWN', ML, y - 2, fontB, 8, C.textLight)
  y -= 14
  sevs.forEach((s, i) => {
    const sx = ML + i * (chipW + 3.75)
    const col = sevColor(s)
    const bg = sevBg(s)
    rect(p1, sx, y - 38, chipW, 44, bg, col, 0.5)
    rect(p1, sx, y - 38, chipW, 3, col)
    const nW = fontB.widthOfTextAtSize(String(sevCounts[s]), 22)
    txt(p1, String(sevCounts[s]), sx + chipW / 2 - nW / 2, y - 18, fontB, 22, col)
    const lW = fontR.widthOfTextAtSize(s, 7)
    txt(p1, s, sx + chipW / 2 - lW / 2, y - 30, fontR, 7, col)
  })
  y -= 56

  // ── Category Scores ──
  if (scan.categoryScores.length > 0) {
    rect(p1, ML, y - 14 - scan.categoryScores.length * 22 - 10, CW, scan.categoryScores.length * 22 + 28, C.cardBg, C.border)
    rect(p1, ML, y - 14 - scan.categoryScores.length * 22 - 10, 3, scan.categoryScores.length * 22 + 28, C.indigo)
    txt(p1, 'CATEGORY SCORES', ML + 14, y - 8, fontB, 8, C.textLight)
    y -= 22

    const colW = (CW - 28) / 2
    scan.categoryScores.forEach((cs, i) => {
      const col = scoreColor(cs.score)
      const col2IsLeft = i % 2 === 0
      const cx2 = col2IsLeft ? ML + 14 : ML + 14 + colW + 8
      const row = Math.floor(i / 2)
      const ry = y - row * 22

      txt(p1, cs.category, cx2, ry - 2, fontR, 9, C.textMid)
      const scoreStr2 = `${cs.score}`
      const sW2 = fontB.widthOfTextAtSize(scoreStr2, 9)
      txt(p1, scoreStr2, cx2 + colW - sW2 - 4, ry - 2, fontB, 9, col)

      // progress bar
      const barW = colW - sW2 - 16
      rect(p1, cx2, ry - 11, barW, 4, C.border)
      if (cs.score > 0) rect(p1, cx2, ry - 11, barW * (cs.score / 100), 4, col)
    })

    y -= Math.ceil(scan.categoryScores.length / 2) * 22 + 12
  }

  // ── Server info row ──
  if (scan.ipAddress || scan.serverSoftware) {
    y -= 6
    hline(p1, ML, W - MR, y)
    y -= 14
    if (scan.ipAddress) {
      txt(p1, 'IP ADDRESS', ML, y, fontB, 7, C.textLight)
      txt(p1, scan.ipAddress, ML, y - 12, fontR, 9, C.textDark)
    }
    if (scan.serverSoftware) {
      txt(p1, 'SERVER SOFTWARE', ML + 150, y, fontB, 7, C.textLight)
      txt(p1, scan.serverSoftware, ML + 150, y - 12, fontR, 9, C.textDark)
    }
    if (scan.scanDuration) {
      const durStr = `${(scan.scanDuration / 1000).toFixed(1)}s`
      txt(p1, 'SCAN DURATION', ML + 300, y, fontB, 7, C.textLight)
      txt(p1, durStr, ML + 300, y - 12, fontR, 9, C.textDark)
    }
  }

  // ── Page 2: Findings Index ─────────────────────────────────────────────────
  const p2 = pdfDoc.addPage([W, H])
  rect(p2, 0, 0, W, H, C.pageBg)
  drawPageHeader(p2, fontB, fontR, 'Findings Index', 2, totalPages)
  drawPageFooter(p2, fontR, scan.id)

  let y2 = H - 72
  txt(p2, 'ALL FINDINGS', ML, y2, fontB, 10, C.textDark)
  txt(p2, `${scan.findings.length} total findings`, ML, y2 - 14, fontR, 9, C.textMid)
  y2 -= 32

  // Table header
  rect(p2, ML, y2 - 20, CW, 24, C.navyDark)
  txt(p2, 'SEVERITY',  ML + 8,      y2 - 12, fontB, 8, C.white)
  txt(p2, 'FINDING',   ML + 78,     y2 - 12, fontB, 8, C.white)
  txt(p2, 'CATEGORY',  ML + 340,    y2 - 12, fontB, 8, C.white)
  txt(p2, 'CVSS',      ML + 460,    y2 - 12, fontB, 8, C.white)
  y2 -= 20

  const ROW_H = 18
  scan.findings.forEach((f, i) => {
    if (y2 - ROW_H < 50) return // skip if overflows (handled by page 3+)
    const rowBg = i % 2 === 0 ? C.cardBg : C.pageBg
    rect(p2, ML, y2 - ROW_H, CW, ROW_H, rowBg)
    hline(p2, ML, W - MR, y2 - ROW_H, C.border)

    const col = sevColor(f.severity)
    badge(p2, f.severity, ML + 4, y2 - 5, fontB, 7, col, sevBg(f.severity))
    txt(p2, truncate(f.name, fontR, 9, 255), ML + 78, y2 - 5, fontR, 9, C.textDark)
    txt(p2, truncate(f.category, fontR, 8, 110), ML + 340, y2 - 5, fontR, 8, C.textMid)
    if (f.cvssScore && f.cvssScore > 0) {
      const cvssCol = f.cvssScore >= 9 ? C.critical : f.cvssScore >= 7 ? C.high : f.cvssScore >= 4 ? C.medium : C.low
      txt(p2, f.cvssScore.toFixed(1), ML + 462, y2 - 5, fontB, 9, cvssCol)
    }
    y2 -= ROW_H
  })

  // ── Pages 3+: Detailed Findings ────────────────────────────────────────────
  const DETAIL_CONTENT_TOP = H - 72
  const DETAIL_CONTENT_BOT = 50
  const AVAIL_H = DETAIL_CONTENT_TOP - DETAIL_CONTENT_BOT

  for (let pg = 0; pg < findingPages; pg++) {
    const page = pdfDoc.addPage([W, H])
    rect(page, 0, 0, W, H, C.pageBg)
    drawPageHeader(page, fontB, fontR, `Findings — Page ${pg + 1} of ${findingPages}`, pg + 3, totalPages)
    drawPageFooter(page, fontR, scan.id)

    let fy = DETAIL_CONTENT_TOP
    txt(page, `DETAILED FINDINGS  (${pg * FINDINGS_PER_PAGE + 1}–${Math.min((pg + 1) * FINDINGS_PER_PAGE, scan.findings.length)} of ${scan.findings.length})`,
      ML, fy, fontB, 9, C.textLight)
    fy -= 14

    const slice = scan.findings.slice(pg * FINDINGS_PER_PAGE, (pg + 1) * FINDINGS_PER_PAGE)

    for (const f of slice) {
      const col = sevColor(f.severity)
      const INNER_W = CW - 24  // inner text area
      const LINE_H = 13
      const MONO_H = 11

      // Measure height for this finding
      let cardH = 14 + 18 + 8 // top pad + title row + sep
      if (f.description) cardH += 12 + measureText(f.description, fontR, 9, INNER_W, LINE_H)
      if (f.evidence)    cardH += 10 + measureText(f.evidence, fontM, 8, INNER_W - 16, MONO_H) + 8
      if (f.impact)      cardH += 10 + measureText(f.impact, fontR, 9, INNER_W, LINE_H)
      if (f.remediation) cardH += 10 + measureText(f.remediation, fontR, 9, INNER_W, LINE_H)
      const hasTags = (f.cvssScore && f.cvssScore > 0) || (f.cveIds && f.cveIds.length > 0) || f.owaspId
      if (hasTags) cardH += 24
      const hasRefs = f.references && f.references.length > 0
      if (hasRefs) cardH += 12 + (f.references!.length * 12)
      cardH += 14 // bottom pad

      // Start new page if not enough room
      if (fy - cardH < DETAIL_CONTENT_BOT + 10 && fy < DETAIL_CONTENT_TOP) {
        // Can't easily add a page mid-loop with pre-computed totalPages, so just continue drawing
        // (findings will be clipped at bottom; full pagination requires 2-pass)
      }

      // Card shadow (offset rect)
      rect(page, ML + 2, fy - cardH - 2, CW, cardH, rgb(0.87, 0.90, 0.96))
      // Card background
      rect(page, ML, fy - cardH, CW, cardH, C.cardBg, C.border)
      // Left severity accent bar
      rect(page, ML, fy - cardH, 4, cardH, col)

      let cy2 = fy - 14

      // Severity badge + category
      badge(page, f.severity, ML + 14, cy2, fontB, 8, col, sevBg(f.severity))
      txt(page, f.category, ML + 14 + badge_width(f.severity, fontB, 8) + 8, cy2, fontR, 8, C.textMid)

      // CVE ids inline if short
      if (f.cveIds && f.cveIds.length > 0 && f.cveIds.length <= 3) {
        const cveX = W - MR - 10 - f.cveIds.map(c => fontR.widthOfTextAtSize(c, 7) + 12).reduce((a,b) => a + b, 0)
        let cx3 = cveX
        f.cveIds.forEach(cve => {
          const cw = fontR.widthOfTextAtSize(cve, 7)
          rect(page, cx3, cy2 - 2, cw + 10, 12, rgb(0.94, 0.96, 1.00), C.indigo, 0.5)
          txt(page, cve, cx3 + 5, cy2, fontR, 7, C.indigo)
          cx3 += cw + 14
        })
      }

      cy2 -= 18

      // Title
      const titleLines = wrapText(f.name, fontB, 11, INNER_W)
      titleLines.forEach((l, i) => txt(page, l, ML + 14, cy2 - i * 14, fontB, 11, C.textDark))
      cy2 -= titleLines.length * 14 + 8

      hline(page, ML + 14, W - MR - 6, cy2 + 4)
      cy2 -= 6

      // Description
      if (f.description) {
        txt(page, 'DESCRIPTION', ML + 14, cy2, fontB, 7, C.textLight)
        cy2 -= 12
        cy2 -= drawMultiText(page, f.description, ML + 14, cy2, fontR, 9, C.textDark, INNER_W, LINE_H)
        cy2 -= 6
      }

      // Evidence
      if (f.evidence) {
        txt(page, 'EVIDENCE', ML + 14, cy2, fontB, 7, C.textLight)
        cy2 -= 10
        const evLines = wrapText(f.evidence, fontM, 8, INNER_W - 16)
        const evH = evLines.length * MONO_H + 8
        rect(page, ML + 14, cy2 - evH, INNER_W, evH, rgb(0.95, 0.96, 1.00), C.border)
        evLines.forEach((l, i) => txt(page, l, ML + 22, cy2 - 4 - i * MONO_H, fontM, 8, rgb(0.20, 0.28, 0.55)))
        cy2 -= evH + 6
      }

      // Impact
      if (f.impact) {
        txt(page, 'IMPACT', ML + 14, cy2, fontB, 7, rgb(0.70, 0.30, 0.10))
        cy2 -= 12
        cy2 -= drawMultiText(page, f.impact, ML + 14, cy2, fontR, 9, C.textMid, INNER_W, LINE_H)
        cy2 -= 6
      }

      // Remediation
      if (f.remediation) {
        txt(page, 'REMEDIATION', ML + 14, cy2, fontB, 7, rgb(0.10, 0.50, 0.25))
        cy2 -= 12
        cy2 -= drawMultiText(page, f.remediation, ML + 14, cy2, fontR, 9, rgb(0.12, 0.38, 0.22), INNER_W, LINE_H)
        cy2 -= 6
      }

      // References
      if (f.references && f.references.length > 0) {
        txt(page, 'REFERENCES', ML + 14, cy2, fontB, 7, C.textLight)
        cy2 -= 12
        f.references.slice(0, 3).forEach(ref => {
          txt(page, truncate(ref, fontR, 8, INNER_W - 10), ML + 20, cy2, fontR, 8, C.indigo)
          cy2 -= 12
        })
        cy2 -= 4
      }

      // CVSS / OWASP tags at bottom
      if (hasTags) {
        cy2 -= 4
        hline(page, ML + 14, W - MR - 6, cy2 + 2)
        cy2 -= 10
        let tx = ML + 14
        if (f.cvssScore && f.cvssScore > 0) {
          const cvssLabel = `CVSS ${f.cvssScore.toFixed(1)}`
          const cvssCol = f.cvssScore >= 9 ? C.critical : f.cvssScore >= 7 ? C.high : f.cvssScore >= 4 ? C.medium : C.low
          const cw = fontB.widthOfTextAtSize(cvssLabel, 8) + 12
          rect(page, tx, cy2 - 3, cw, 14, sevBg(f.severity), col, 0.5)
          txt(page, cvssLabel, tx + 6, cy2, fontB, 8, cvssCol)
          tx += cw + 6
        }
        if (f.owaspId) {
          const ow = fontR.widthOfTextAtSize(f.owaspId, 8) + 12
          rect(page, tx, cy2 - 3, ow, 14, rgb(0.94, 0.96, 1.00), C.indigo, 0.5)
          txt(page, f.owaspId, tx + 6, cy2, fontR, 8, C.indigo)
          tx += ow + 6
        }
      }

      fy -= cardH + 10
    }
  }

  // ── Tech Stack page ────────────────────────────────────────────────────────
  if (hasTech) {
    const tp = pdfDoc.addPage([W, H])
    rect(tp, 0, 0, W, H, C.pageBg)
    drawPageHeader(tp, fontB, fontR, 'Technology Stack', totalPages, totalPages)
    drawPageFooter(tp, fontR, scan.id)

    let ty = H - 72
    txt(tp, 'DETECTED TECHNOLOGIES', ML, ty, fontB, 10, C.textDark)
    ty -= 24

    const techEntries = Object.entries(scan.techStack ?? {}).filter(([, v]) =>
      v && !(Array.isArray(v) && (v as unknown[]).length === 0)
    )
    const colW2 = (CW - 12) / 2
    techEntries.forEach(([key, val], i) => {
      const col2 = i % 2 === 0 ? ML : ML + colW2 + 12
      const row = Math.floor(i / 2)
      const ry = ty - row * 48

      rect(tp, col2, ry - 38, colW2, 44, C.cardBg, C.border)
      rect(tp, col2, ry - 38, 3, 44, C.indigo)
      txt(tp, key.toUpperCase(), col2 + 12, ry - 8, fontB, 7, C.textLight)

      let valStr = ''
      if (Array.isArray(val)) {
        valStr = (val as unknown[]).map(v =>
          typeof v === 'object' && v !== null ? (v as {name?: string}).name ?? JSON.stringify(v) : String(v)
        ).join(', ')
      } else {
        valStr = String(val)
      }
      const valLines = wrapText(valStr, fontR, 9, colW2 - 20)
      valLines.slice(0, 2).forEach((l, li) => txt(tp, l, col2 + 12, ry - 20 - li * 12, fontR, 9, C.textDark))
    })

    // Modules run
    if (scan.modulesRun && scan.modulesRun.length > 0) {
      const techRows = Math.ceil(techEntries.length / 2)
      ty -= techRows * 48 + 16
      hline(tp, ML, W - MR, ty)
      ty -= 16
      txt(tp, 'MODULES RUN', ML, ty, fontB, 8, C.textLight)
      ty -= 14
      const modStr = scan.modulesRun.join('  •  ')
      drawMultiText(tp, modStr, ML, ty, fontR, 9, C.textMid, CW, 14)
    }
  }

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string, font: PDFFont, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(str, size) <= maxW) return str
  let s = str
  while (s.length > 4 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1)
  return s + '…'
}

function badge_width(label: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(label, size) + 10
}
