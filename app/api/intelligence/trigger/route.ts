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

    const n8nWebhookUrl = process.env.N8N_MANUAL_TRIGGER_URL
    if (!n8nWebhookUrl) {
      console.error('N8N_MANUAL_TRIGGER_URL is not set in environment variables.')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    // Forward the trigger to N8N
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional security header if they want to verify requests came from Vercel
        'x-kitchenos-trigger': 'true'
      },
      body: JSON.stringify({
        action: 'generate_intelligence_report',
        reportType: reportType,
        kitchen_id: profile.kitchen_id,
        user_id: user.id,
        timestamp: new Date().toISOString()
      }),
    })

    if (!response.ok) {
      throw new Error(`N8N responded with status: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Intelligence Trigger API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
