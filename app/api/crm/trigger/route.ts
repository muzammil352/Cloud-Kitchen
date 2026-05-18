import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const URL_MAP: Record<string, string | undefined> = {
  wf1: process.env.N8N_TRIGGER_WIN_BACK,
  wf2: process.env.NEXT_PUBLIC_N8N_WF2_LOYALTY,
  wf3: process.env.N8N_TRIGGER_BIRTHDAY,
  wf4: process.env.N8N_TRIGGER_RFM_SCORING,
  wf5: process.env.NEXT_PUBLIC_N8N_WF5_CLV,
  wf6: process.env.NEXT_PUBLIC_N8N_WF6_COMPLAINT,
  wf7: process.env.NEXT_PUBLIC_N8N_WF7_UPSELL,
  wf8: process.env.NEXT_PUBLIC_N8N_WF8_REFERRAL,
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, kitchen_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { workflow } = body

    if (!workflow || !URL_MAP.hasOwnProperty(workflow)) {
      return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 })
    }

    const webhookUrl = URL_MAP[workflow]
    if (!webhookUrl) {
      return NextResponse.json({ error: `No webhook URL configured for ${workflow}. Add the env var and redeploy.` }, { status: 500 })
    }

    let response: Response
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kitchenos-trigger': 'true' },
        body: JSON.stringify({
          kitchen_id: profile.kitchen_id,
          triggered_by: 'manual',
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (fetchError: any) {
      return NextResponse.json({ error: `Could not reach N8N: ${fetchError.message}` }, { status: 502 })
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '')
      return NextResponse.json({ error: `N8N returned ${response.status}${responseBody ? ': ' + responseBody : ''}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('CRM Trigger API Error:', error)
    return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
