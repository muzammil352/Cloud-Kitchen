import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MenuItem } from '@/lib/types'
import { MenuPageClient } from '@/components/customer/MenuPageClient'

export const revalidate = 0

export default async function MenuPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: kitchen } = await supabase
    .from('kitchens')
    .select('*')
    .eq('kitchen_id', params.slug)
    .single()

  if (!kitchen) notFound()

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('kitchen_id', kitchen.kitchen_id)
    .eq('is_active', true)
    .order('category')

  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('*, customers(name)')
    .eq('kitchen_id', kitchen.kitchen_id)
    .order('created_at', { ascending: false })
    .limit(6)

  const categories = Array.from(new Set((menuItems || []).map(item => item.category)))

  return (
    <MenuPageClient
      kitchen={kitchen}
      menuItems={(menuItems || []) as MenuItem[]}
      feedbacks={(feedbacks || []) as any[]}
      categories={categories}
      slug={params.slug}
    />
  )
}
