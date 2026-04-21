import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderTracker } from '@/components/customer/OrderTracker'

export const revalidate = 0

export default async function TrackPage({ 
  params,
  searchParams,
}: { 
  params: { slug: string },
  searchParams: { order_id?: string }
}) {
  const orderId = searchParams.order_id

  if (!orderId) {
    return notFound()
  }

  const supabase = createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu_items (name)
      )
    `)
    .eq('order_id', orderId)
    .single()

  if (!order || order.kitchen_id !== params.slug) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OrderTracker initialOrder={order} />
    </div>
  )
}
