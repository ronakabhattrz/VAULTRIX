import { NextRequest, NextResponse } from 'next/server'
import { processScheduledScans } from '@/workers/scheduledWorker'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processScheduledScans()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[cron] Scheduled scans error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
