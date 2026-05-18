import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderTracker } from '@/components/customer/OrderTracker'

export const revalidate = 0

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { order_id?: string }
}) {
  const orderId = searchParams.order_id
  if (!orderId) return notFound()

  const supabase = createClient()

  const { data: kitchen } = await supabase
    .from('kitchens')
    .select('kitchen_id, name, slug')
    .eq('slug', params.slug)
    .single()

  if (!kitchen) return notFound()

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('order_id', orderId)
    .single()

  if (!order || order.kitchen_id !== kitchen.kitchen_id) return notFound()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <OrderTracker
        initialOrder={order}
        kitchenName={kitchen.name}
        slug={kitchen.slug ?? params.slug}
      />
    </div>
  )
}
