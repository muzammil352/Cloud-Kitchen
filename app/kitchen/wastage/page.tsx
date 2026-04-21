import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WastageForm } from '@/components/kitchen/WastageForm'

export const revalidate = 0

export default async function WastagePage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile) redirect('/login')

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('kitchen_id', profile.kitchen_id)
    .order('name')

  return (
    <div className="h-full flex justify-center animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden">
      <WastageForm 
        ingredients={ingredients || []} 
        kitchenId={profile.kitchen_id} 
        profileId={user.id} 
      />
    </div>
  )
}
