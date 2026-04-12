import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const PLANS = ['FREE', 'STARTER', 'PRO', 'AGENCY', 'ENTERPRISE'] as const
const STATUSES = ['COMPLETED', 'FAILED', 'QUEUED'] as const
const GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'] as const
const URLS = [
  'https://google.com', 'https://github.com', 'https://vercel.com',
  'https://stripe.com', 'https://cloudflare.com', 'https://shopify.com',
  'https://notion.so', 'https://figma.com', 'https://linear.app',
  'https://supabase.com', 'https://railway.app', 'https://render.com',
]

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

async function main() {
  console.log('🌱 Seeding database...')

  // ──────────────────────────────────────────
  // 1. Test users
  // ──────────────────────────────────────────
  const password = await bcrypt.hash('Test@1234', 10)

  const testUsers = [
    { name: 'Alice Free',       email: 'alice@test.com',      plan: 'FREE'       },
    { name: 'Bob Starter',      email: 'bob@test.com',        plan: 'STARTER'    },
    { name: 'Carol Pro',        email: 'carol@test.com',      plan: 'PRO'        },
    { name: 'Dave Agency',      email: 'dave@test.com',       plan: 'AGENCY'     },
    { name: 'Eve Enterprise',   email: 'eve@test.com',        plan: 'ENTERPRISE' },
    { name: 'Frank Suspended',  email: 'frank@test.com',      plan: 'FREE',  isSuspended: true },
    { name: 'Grace Pro',        email: 'grace@test.com',      plan: 'PRO'        },
    { name: 'Henry Starter',    email: 'henry@test.com',      plan: 'STARTER'    },
  ]

  const createdUsers = []
  for (const u of testUsers) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password,
        plan: u.plan as 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'ENTERPRISE',
        isSuspended: (u as { isSuspended?: boolean }).isSuspended ?? false,
        totalScans: randInt(0, 120),
        scanCountThisMonth: randInt(0, 20),
        onboardingCompleted: true,
        createdAt: daysAgo(randInt(1, 180)),
      },
    })
    createdUsers.push(user)
    console.log(`  ✓ User: ${u.email}`)
  }

  // ──────────────────────────────────────────
  // 2. Test scans for each user
  // ──────────────────────────────────────────
  const SAMPLE_FINDINGS = (score: number) => {
    const findings = []
    if (score < 80) {
      findings.push({
        id: Math.random().toString(36).slice(2),
        category: 'HTTP Headers',
        name: 'Missing Content-Security-Policy Header',
        severity: 'HIGH',
        cvssScore: 6.1,
        cveIds: [],
        description: 'The Content-Security-Policy header is not set.',
        evidence: 'Header not present',
        impact: 'Attackers may inject malicious scripts.',
        remediation: 'Add a CSP header.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
        owaspId: 'A05:2021',
      })
    }
    if (score < 70) {
      findings.push({
        id: Math.random().toString(36).slice(2),
        category: 'DNS / Email Security',
        name: 'Missing SPF Record',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveIds: [],
        description: 'No SPF record found.',
        evidence: 'No TXT record starting with v=spf1',
        impact: 'Email spoofing is possible.',
        remediation: 'Add a TXT record: v=spf1 -all',
        references: [],
        owaspId: 'A07:2021',
      })
    }
    if (score < 50) {
      findings.push({
        id: Math.random().toString(36).slice(2),
        category: 'SSL/TLS',
        name: 'SSL Certificate Expiring Soon',
        severity: 'CRITICAL',
        cvssScore: 9.1,
        cveIds: [],
        description: 'SSL certificate expires in less than 30 days.',
        evidence: 'Certificate expiry: within 30 days',
        impact: 'Users will see browser warnings.',
        remediation: 'Renew the SSL certificate immediately.',
        references: [],
      })
    }
    findings.push({
      id: Math.random().toString(36).slice(2),
      category: 'HTTP Headers',
      name: 'Server Header Present',
      severity: 'LOW',
      cvssScore: 2.6,
      cveIds: [],
      description: 'Server header reveals software type.',
      evidence: 'Server: nginx',
      impact: 'Minor info disclosure.',
      remediation: 'Remove the Server header.',
      references: [],
      owaspId: 'A05:2021',
    })
    return findings
  }

  for (const user of createdUsers) {
    const scanCount = randInt(2, 8)
    for (let i = 0; i < scanCount; i++) {
      const status = rand(STATUSES)
      const score = status === 'COMPLETED' ? randInt(20, 98) : null
      const grade = score ? GRADES[score >= 90 ? 0 : score >= 80 ? 1 : score >= 70 ? 2 : score >= 60 ? 3 : score >= 50 ? 4 : 5] : null
      const url = rand(URLS)

      await db.scan.create({
        data: {
          userId: user.id,
          url,
          domain: new URL(url).hostname,
          status: status as 'COMPLETED' | 'FAILED' | 'QUEUED',
          score,
          grade,
          findings: status === 'COMPLETED' ? SAMPLE_FINDINGS(score ?? 50) : [],
          scanDuration: status === 'COMPLETED' ? randInt(8000, 45000) : null,
          modulesRun: status === 'COMPLETED' ? ['headers', 'ssl', 'dns', 'cookies'] : [],
          createdAt: daysAgo(randInt(0, 60)),
          completedAt: status === 'COMPLETED' ? daysAgo(randInt(0, 60)) : null,
        },
      })
    }
    console.log(`  ✓ Scans for ${user.email}`)
  }

  console.log('\n✅ Seed complete!')
  console.log('\n📋 Test accounts (password: Test@1234):')
  for (const u of testUsers) {
    console.log(`   ${u.email.padEnd(28)} plan: ${u.plan}${(u as { isSuspended?: boolean }).isSuspended ? ' [SUSPENDED]' : ''}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
