import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { kitchen_id } = body

  if (!kitchen_id) return NextResponse.json({ error: 'Missing kitchen_id' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.kitchen_id !== kitchen_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const n8nUrl = process.env.N8N_DAILY_INVENTORY_URL
  if (!n8nUrl) return NextResponse.json({ error: 'Daily summary webhook not configured' }, { status: 500 })

  const upstream = await fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kitchen_id, triggered_at: new Date().toISOString() }),
  })

  if (!upstream.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  return NextResponse.json({ ok: true })
}
