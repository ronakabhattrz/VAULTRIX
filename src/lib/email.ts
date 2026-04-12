import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = process.env.EMAIL_FROM ?? 'noreply@vaultrix.io'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to VAULTRIX — Your Security Journey Starts Now',
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
          <p style="color:#8888aa;margin:4px 0 0;font-size:13px;">Scan. Detect. Fortify.</p>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 16px;">Welcome, ${name}!</h2>
          <p style="color:#8888aa;line-height:1.6;margin:0 0 24px;">Your account is set up and ready. Start by scanning your first domain to discover security vulnerabilities before attackers do.</p>
          <a href="${APP_URL}/scan/new" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Start Your First Scan →</a>
          <hr style="border:none;border-top:1px solid #1e1e35;margin:32px 0;">
          <p style="color:#3a3a5c;font-size:12px;margin:0;">Only scan websites you own or have explicit permission to test. © ${new Date().getFullYear()} VAULTRIX</p>
        </div>
      </div>
    `,
  })
}

export async function sendVerifyEmail(to: string, token: string) {
  const verifyUrl = `${APP_URL}/auth/verify-email/${token}`
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your VAULTRIX email address',
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 16px;">Verify your email</h2>
          <p style="color:#8888aa;line-height:1.6;margin:0 0 24px;">Click the button below to verify your email address. This link expires in 24 hours.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Verify Email →</a>
          <p style="color:#3a3a5c;font-size:12px;margin:24px 0 0;">If you didn't create an account, ignore this email.</p>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/auth/reset-password/${token}`
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your VAULTRIX password',
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 16px;">Reset your password</h2>
          <p style="color:#8888aa;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click below to set a new one. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Reset Password →</a>
          <p style="color:#3a3a5c;font-size:12px;margin:24px 0 0;">If you didn't request a reset, your account is safe — ignore this email.</p>
        </div>
      </div>
    `,
  })
}

export async function sendScanCompleteEmail(to: string, data: {
  domain: string
  score: number
  grade: string
  scanId: string
  criticalCount: number
  highCount: number
}) {
  const gradeColor = data.score >= 80 ? '#4ade80' : data.score >= 60 ? '#f59e0b' : '#ef4444'
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Scan complete: ${data.domain} — Grade ${data.grade} (${data.score}/100)`,
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 8px;">Scan Complete: ${data.domain}</h2>
          <div style="display:flex;align-items:center;gap:16px;margin:24px 0;">
            <div style="text-align:center;padding:20px;background:#111120;border:1px solid #1e1e35;border-radius:8px;">
              <div style="font-family:'Chakra Petch',sans-serif;font-size:48px;font-weight:700;color:${gradeColor};line-height:1;">${data.grade}</div>
              <div style="color:#8888aa;font-size:12px;margin-top:4px;">${data.score}/100</div>
            </div>
            <div>
              ${data.criticalCount > 0 ? `<p style="color:#ef4444;margin:0 0 8px;">🚨 ${data.criticalCount} critical finding${data.criticalCount > 1 ? 's' : ''}</p>` : ''}
              ${data.highCount > 0 ? `<p style="color:#f59e0b;margin:0 0 8px;">⚠️ ${data.highCount} high severity</p>` : ''}
              ${data.criticalCount === 0 && data.highCount === 0 ? `<p style="color:#4ade80;margin:0;">✅ No critical/high issues</p>` : ''}
            </div>
          </div>
          <a href="${APP_URL}/scan/${data.scanId}" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">View Full Report →</a>
        </div>
      </div>
    `,
  })
}

export async function sendCriticalAlertEmail(to: string, data: {
  scanId: string
  findingCount: number
  topFinding: { name: string; description: string; severity: string }
  score: number
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `🚨 VAULTRIX Alert: ${data.findingCount} critical finding(s) detected`,
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#ef444420;padding:32px;border-bottom:1px solid #ef444440;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#ef4444;margin:0;font-size:24px;">🚨 Security Alert</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#8888aa;margin:0 0 24px;">${data.findingCount} critical security finding(s) were detected. Immediate attention required.</p>
          <div style="background:#111120;border:1px solid #ef444440;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:0 0 24px;">
            <div style="color:#ef4444;font-size:12px;font-family:'Chakra Petch',sans-serif;text-transform:uppercase;margin-bottom:8px;">CRITICAL</div>
            <div style="font-weight:500;margin-bottom:8px;">${data.topFinding.name}</div>
            <div style="color:#8888aa;font-size:13px;">${data.topFinding.description.substring(0, 150)}...</div>
          </div>
          <a href="${APP_URL}/scan/${data.scanId}" style="display:inline-block;background:#ef4444;color:#fff;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">View Report →</a>
        </div>
      </div>
    `,
  })
}

export async function sendScoreDroppedEmail(to: string, data: {
  domain: string
  previousScore: number
  currentScore: number
  scanId: string
}) {
  const drop = data.previousScore - data.currentScore
  return resend.emails.send({
    from: FROM,
    to,
    subject: `⚠️ Security score dropped for ${data.domain} (−${drop} points)`,
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;color:#f59e0b;font-size:20px;margin:0 0 16px;">⚠️ Score Drop Detected: ${data.domain}</h2>
          <div style="display:flex;gap:32px;margin:24px 0;padding:20px;background:#111120;border:1px solid #1e1e35;border-radius:8px;">
            <div style="text-align:center;">
              <div style="color:#8888aa;font-size:12px;margin-bottom:4px;">PREVIOUS</div>
              <div style="font-family:'Chakra Petch',sans-serif;font-size:32px;color:#4ade80;">${data.previousScore}</div>
            </div>
            <div style="text-align:center;font-size:24px;color:#f59e0b;align-self:center;">→</div>
            <div style="text-align:center;">
              <div style="color:#8888aa;font-size:12px;margin-bottom:4px;">CURRENT</div>
              <div style="font-family:'Chakra Petch',sans-serif;font-size:32px;color:#ef4444;">${data.currentScore}</div>
            </div>
            <div style="text-align:center;align-self:center;">
              <div style="color:#8888aa;font-size:12px;margin-bottom:4px;">DROP</div>
              <div style="font-family:'Chakra Petch',sans-serif;font-size:32px;color:#f59e0b;">−${drop}</div>
            </div>
          </div>
          <a href="${APP_URL}/scan/${data.scanId}" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Investigate →</a>
        </div>
      </div>
    `,
  })
}

export async function sendPlanUpgradedEmail(to: string, plan: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to VAULTRIX ${plan}!`,
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#4ade8020;padding:32px;border-bottom:1px solid #4ade8040;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">🎉 Upgraded to ${plan}</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#8888aa;">Your plan has been upgraded. Enjoy your expanded scanning capabilities!</p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Go to Dashboard →</a>
        </div>
      </div>
    `,
  })
}

export async function sendTeamInviteEmail(to: string, data: {
  orgName: string
  inviterName: string
  role: string
  token: string
}) {
  const inviteUrl = `${APP_URL}/invite/${data.token}`
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to ${data.orgName} on VAULTRIX`,
    html: `
      <div style="background:#050508;color:#f0f0ff;font-family:'DM Mono',monospace;max-width:600px;margin:0 auto;border:1px solid #1e1e35;border-radius:8px;overflow:hidden;">
        <div style="background:#0d0d14;padding:32px;border-bottom:1px solid #1e1e35;">
          <h1 style="font-family:'Chakra Petch',sans-serif;color:#4ade80;margin:0;font-size:24px;">VAULTRIX</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 16px;">Team Invitation</h2>
          <p style="color:#8888aa;margin:0 0 24px;">${data.inviterName} has invited you to join <strong style="color:#f0f0ff;">${data.orgName}</strong> as <strong style="color:#4ade80;">${data.role}</strong>.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#4ade80;color:#050508;font-family:'Chakra Petch',sans-serif;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;">Accept Invitation →</a>
          <p style="color:#3a3a5c;font-size:12px;margin:24px 0 0;">This invitation expires in 7 days.</p>
        </div>
      </div>
    `,
  })
}
