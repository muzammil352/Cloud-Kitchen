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

    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nUrl) {
      return NextResponse.json({ success: true })
    }

    await fetch(`${n8nUrl.replace(/\/$/, '')}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('feedback route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
