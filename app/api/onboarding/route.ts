import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({
  kitchenName: z.string().min(1).max(100),
  firstName:   z.string().min(1).max(50),
  lastName:    z.string().max(50).default(''),
  email:       z.string().email(),
})

export async function POST(req: Request) {
  // By the time this server route is hit (full HTTP round-trip), the session
  // cookie set by signUp() is present. getUser() verifies the JWT server-side.
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { kitchenName, firstName, lastName, email } = parsed.data

  // Idempotent: if a kitchen already exists for this user (partial retry), reuse it
  const { data: existingKitchen } = await supabase
    .from('kitchens')
    .select('kitchen_id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  let kitchenId: string

  if (existingKitchen) {
    kitchenId = existingKitchen.kitchen_id
  } else {
    const { data: kitchen, error: kitchenError } = await supabase
      .from('kitchens')
      .insert({
        owner_user_id: user.id,
        name: kitchenName,
        email: email,
        settings: { notify_channel: 'email' },
      })
      .select('kitchen_id')
      .single()

    if (kitchenError || !kitchen) {
      console.error('[onboarding] kitchen insert failed:', kitchenError?.message)
      return NextResponse.json(
        { error: 'Kitchen setup failed', detail: kitchenError?.message },
        { status: 500 }
      )
    }
    kitchenId = kitchen.kitchen_id
  }

  // Idempotent: skip if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        kitchen_id: kitchenId,
        role: 'owner',
        name: `${firstName} ${lastName}`.trim(),
      })

    if (profileError) {
      console.error('[onboarding] profile insert failed:', profileError.message)
      return NextResponse.json(
        { error: 'Profile setup failed', detail: profileError.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true })
}
