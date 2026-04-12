export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export interface Finding {
  id: string
  category: string
  name: string
  severity: Severity
  cvssScore: number
  cveIds: string[]
  description: string
  evidence: string
  impact: string
  remediation: string
  references: string[]
  owaspId?: string
  pciDss?: string[]
  isFixed?: boolean
}

export interface ScannerResult {
  module: string
  findings: Finding[]
  duration: number
  error?: string
}

export interface TechStack {
  cms?: string
  framework?: string
  server?: string
  cdn?: string
  analytics?: string[]
  waf?: string
  libraries?: Array<{ name: string; version?: string; vulnerable?: boolean }>
}

export interface ServerInfo {
  ip: string
  location: string
  software: string
  responseTime?: number
  http2?: boolean
  http3?: boolean
}

export interface ComplianceFrameworkResult {
  score: number
  passed: number
  failed: number
  details: Array<{ control: string; status: 'pass' | 'fail'; description: string }>
}

export interface ScanResult {
  score: number
  grade: string
  findings: Finding[]
  techStack: TechStack
  categoryScores: Record<string, number>
  complianceScores: Record<string, ComplianceFrameworkResult>
  serverInfo: ServerInfo
  duration: number
  modulesRun: string[]
}

export type ScanPlan = 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'ENTERPRISE'

export type ScanEmitEvent =
  | { event: 'started'; modules: string[] }
  | { event: 'module'; name: string; status: 'running' | 'complete' | 'failed' | 'skipped'; findingsCount?: number; duration?: number }
  | { event: 'log'; message: string; level?: 'info' | 'warn' | 'error' }
  | { event: 'progress'; completed: number; total: number; estimatedSeconds?: number }
  | { event: 'complete'; score: number; grade: string; pdfUrl?: string }
  | { event: 'failed'; error: string }

export type EmitFn = (event: ScanEmitEvent) => void

export interface ScannerOptions {
  scanId: string
  url: string
  plan: ScanPlan
  emit: EmitFn
}
