import type { Finding } from './types'

export interface ScoreResult {
  score: number
  grade: string
  categoryScores: Record<string, number>
}

const CATEGORY_WEIGHTS: Record<string, string[]> = {
  'HTTP Headers': ['HTTP Headers'],
  'SSL/TLS': ['SSL/TLS'],
  'Infrastructure': ['Infrastructure / Ports', 'DNS', 'Infrastructure'],
  'Application': ['Application', 'CORS', 'API Security'],
  'Authentication': ['Authentication', 'Cookies'],
  'Email Security': ['DNS / Email Security', 'Email Security'],
}

export function calculateScore(findings: Finding[]): ScoreResult {
  let score = 100

  const critCount = findings.filter(f => f.severity === 'CRITICAL').length
  const highCount = findings.filter(f => f.severity === 'HIGH').length
  const medCount = findings.filter(f => f.severity === 'MEDIUM').length
  const lowCount = findings.filter(f => f.severity === 'LOW').length

  score -= Math.min(critCount * 20, 60)
  score -= Math.min(highCount * 10, 40)
  score -= Math.min(medCount * 4, 20)
  score -= Math.min(lowCount * 1, 5)

  // Bonus for positive signals
  const hasTLS13 = findings.some(f => f.name.includes('TLS 1.3') && f.severity === 'INFO')
  const hasWAF = findings.some(f => f.name.includes('WAF') && f.severity === 'INFO')
  const hasHSTSPreload = findings.some(f => f.name.includes('HSTS Preload'))
  const hasDMARCReject = findings.some(f => f.name.includes('DMARC') && f.name.includes('Reject'))

  if (hasTLS13) score += 2
  if (hasWAF) score += 5
  if (hasHSTSPreload) score += 3
  if (hasDMARCReject) score += 3

  score = Math.max(0, Math.min(100, score))

  const grade =
    score >= 95 ? 'A+' :
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' :
    score >= 60 ? 'D' : 'F'

  // Category scores
  const categoryScores: Record<string, number> = {}
  for (const [category, subCategories] of Object.entries(CATEGORY_WEIGHTS)) {
    const categoryFindings = findings.filter(f =>
      subCategories.some(sub => f.category.toLowerCase().includes(sub.toLowerCase()))
    )
    let catScore = 100
    const catCrit = categoryFindings.filter(f => f.severity === 'CRITICAL').length
    const catHigh = categoryFindings.filter(f => f.severity === 'HIGH').length
    const catMed = categoryFindings.filter(f => f.severity === 'MEDIUM').length
    const catLow = categoryFindings.filter(f => f.severity === 'LOW').length

    catScore -= Math.min(catCrit * 30, 70)
    catScore -= Math.min(catHigh * 15, 50)
    catScore -= Math.min(catMed * 6, 25)
    catScore -= Math.min(catLow * 2, 8)

    categoryScores[category] = Math.max(0, Math.min(100, catScore))
  }

  return { score, grade, categoryScores }
}

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter(f => {
    const key = `${f.name}:${f.category}:${f.severity}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function sortFindings(findings: Finding[]): Finding[] {
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
  return [...findings].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.cvssScore - a.cvssScore
  })
}
