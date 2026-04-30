import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const Schema = z.object({
  kitchenName: z.string().min(1).max(100),
  firstName:   z.string().min(1).max(50),
  lastName:    z.string().max(50).default(''),
  email:       z.string().email(),
})

export async function POST(req: Request) {
  // Verify the caller is the authenticated user (session cookie set by signUp)
  const supabase = createServerClient()
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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    console.error('[onboarding] SUPABASE_SERVICE_ROLE_KEY not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Admin client bypasses RLS — safe because we've already verified the JWT above
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check if this user already has a kitchen (idempotent re-try safety)
  const { data: existing } = await admin
    .from('kitchens')
    .select('kitchen_id')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  let kitchenId: string

  if (existing) {
    kitchenId = existing.kitchen_id
  } else {
    const { data: kitchen, error: kitchenError } = await admin
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
      console.error('[onboarding] kitchen insert failed:', kitchenError)
      return NextResponse.json({ error: 'Kitchen setup failed' }, { status: 500 })
    }
    kitchenId = kitchen.kitchen_id
  }

  // Check if profile already exists
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        user_id: user.id,
        kitchen_id: kitchenId,
        role: 'owner',
        name: `${firstName} ${lastName}`.trim(),
      })

    if (profileError) {
      console.error('[onboarding] profile insert failed:', profileError)
      return NextResponse.json({ error: 'Profile setup failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
