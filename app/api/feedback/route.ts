import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FeedbackSchema = z.object({
  order_id:   z.string().uuid(),
  kitchen_id: z.string().uuid(),
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().max(500).nullable().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = FeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid feedback data' }, { status: 400 })
    }

    const { order_id, kitchen_id, rating, comment } = parsed.data
    const supabase = createClient()

    // Look up customer_id from the order (also validates the order belongs to this kitchen)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('order_id', order_id)
      .eq('kitchen_id', kitchen_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Write to DB
    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        order_id,
        kitchen_id,
        customer_id: order.customer_id,
        rating,
        comment: comment ?? null,
      })

    if (insertError) {
      console.error('Feedback insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    // Notify N8N (fire-and-forget — don't block the response)
    const feedbackIntakeUrl = process.env.N8N_FEEDBACK_INTAKE
    if (feedbackIntakeUrl) {
      fetch(feedbackIntakeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, kitchen_id, customer_id: order.customer_id, rating, comment: comment ?? null }),
      }).catch(err => console.error('Feedback intake webhook failed:', err))
    }

    if (rating <= 2) {
      const complaintUrl = process.env.N8N_WF6_COMPLAINT
      if (complaintUrl) {
        fetch(complaintUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: { record: { kitchen_id, customer_id: order.customer_id, metadata: { rating, comment } } }
          })
        }).catch(err => console.error('WF6_COMPLAINT trigger failed:', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('feedback route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
