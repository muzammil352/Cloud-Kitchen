import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { order_id, kitchen_id } = body

  if (!order_id || !kitchen_id) {
    return NextResponse.json({ error: 'Missing order_id or kitchen_id' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.kitchen_id !== kitchen_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('order_id', order_id)
    .eq('kitchen_id', kitchen_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const n8nUrl = process.env.N8N_ORDER_STOCK_DEDUCTION_URL
  if (n8nUrl) {
    fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, kitchen_id }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
