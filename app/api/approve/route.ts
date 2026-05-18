import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { tokens, action } = body as { tokens: string[]; action: 'approve' | 'reject' }

    if (!Array.isArray(tokens) || tokens.length === 0 || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const finalStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error } = await supabase
      .from('notifications_log')
      .update({ status: finalStatus, resolved_at: new Date().toISOString() })
      .in('approval_token', tokens)
      .eq('status', 'pending')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('approve route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
