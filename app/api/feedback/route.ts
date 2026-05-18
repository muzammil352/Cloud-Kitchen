import { NextResponse } from 'next/server'
import { z } from 'zod'

const FeedbackSchema = z.object({
  order_id: z.string().uuid(),
  kitchen_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = FeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid feedback data' }, { status: 400 })
    }

    const feedbackIntakeUrl = process.env.N8N_FEEDBACK_INTAKE
    if (feedbackIntakeUrl) {
      await fetch(feedbackIntakeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      }).catch(err => console.error('Feedback intake webhook failed:', err))
    }

    if (parsed.data.rating <= 2) {
      const complaintUrl = process.env.N8N_WF6_COMPLAINT
      if (complaintUrl) {
        await fetch(complaintUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            body: { 
              record: { 
                kitchen_id: parsed.data.kitchen_id, 
                customer_id: 'unknown_customer_id', // Feedback might not have customer_id
                metadata: { rating: parsed.data.rating, comment: parsed.data.comment } 
              } 
            } 
          })
        }).catch(err => console.error('WF6_COMPLAINT trigger failed:', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('feedback route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
