import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel Cron: fires every Monday at 03:00 PKT (22:00 UTC Sunday)
// Configured in vercel.json

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (or a trusted internal caller)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhookUrl = process.env.N8N_WEEKLY_FORECAST_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'N8N_WEEKLY_FORECAST_URL not configured' }, { status: 500 })
  }

  // Fetch all active kitchen IDs so N8N can process each one
  const supabase = createClient()
  const { data: kitchens, error } = await supabase
    .from('kitchens')
    .select('kitchen_id, name')

  if (error) {
    console.error('[weekly-forecast] Failed to fetch kitchens:', error.message)
    return NextResponse.json({ error: 'Failed to fetch kitchens' }, { status: 500 })
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'WEEKLY_FORECAST',
      triggered_at: new Date().toISOString(),
      week_start: weekStart.toISOString(),
      kitchens: kitchens ?? [],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[weekly-forecast] N8N rejected:', res.status, body)
    return NextResponse.json({ error: 'N8N webhook failed', status: res.status }, { status: 502 })
  }

  return NextResponse.json({ ok: true, kitchens_sent: kitchens?.length ?? 0 })
}
