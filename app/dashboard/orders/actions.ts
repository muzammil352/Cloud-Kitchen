'use server'

import { createClient } from '@/lib/supabase/server'
import { OrderStatus } from '@/lib/types'

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<{ error?: string }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('order_id', orderId)
    .eq('kitchen_id', profile.kitchen_id)

  if (error) return { error: error.message }
  return {}
}
