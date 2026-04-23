import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ApproveSchema = z.object({
  token: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    // Require authenticated owner
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }
    const { token } = parsed.data

    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nUrl) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const targetUrl = `${n8nUrl.replace(/\/$/, '')}/webhook/stock-approve?token=${encodeURIComponent(token)}`

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('approve route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
