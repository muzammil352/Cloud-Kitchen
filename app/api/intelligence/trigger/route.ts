import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, kitchen_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reportType } = body

    if (!reportType) {
      return NextResponse.json({ error: 'Missing reportType' }, { status: 400 })
    }

    const urlMap: Record<string, string | undefined> = {
      margin_analysis:       process.env.N8N_TRIGGER_MARGIN_ANALYSIS,
      wastage_intelligence:  process.env.N8N_TRIGGER_WASTAGE_INTELLIGENCE,
      weekly_forecast:       process.env.N8N_WEEKLY_FORECAST_URL,
      smart_purchase_plan:   process.env.N8N_TRIGGER_SMART_PURCHASE_PLAN,
    }

    const n8nWebhookUrl = urlMap[reportType]
    if (!n8nWebhookUrl) {
      console.error(`No N8N webhook URL configured for reportType: ${reportType}`)
      return NextResponse.json({ error: `No webhook URL configured for report type: ${reportType}` }, { status: 500 })
    }

    // Forward the trigger to N8N
    let response: Response
    try {
      response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kitchenos-trigger': 'true'
        },
        body: JSON.stringify({
          action: 'generate_intelligence_report',
          reportType,
          kitchen_id: profile.kitchen_id,
          user_id: user.id,
          timestamp: new Date().toISOString()
        }),
      })
    } catch (fetchError: any) {
      console.error('Failed to reach N8N webhook:', fetchError)
      return NextResponse.json({ error: `Could not reach N8N webhook: ${fetchError.message}` }, { status: 502 })
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '')
      console.error(`N8N responded with status ${response.status}:`, responseBody)
      return NextResponse.json({ error: `N8N returned ${response.status}${responseBody ? ': ' + responseBody : ''}` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Intelligence Trigger API Error:', error)
    return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
