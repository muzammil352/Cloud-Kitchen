'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function WastageForm({ ingredients, kitchenId, profileId }: { ingredients: Ingredient[], kitchenId: string, profileId: string }) {
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const selectedIngredient = ingredients.find(i => i.ingredient_id === selectedIngredientId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIngredient) return
    
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Invalid amount.")
      return
    }

    if (parsedAmount > selectedIngredient.current_stock) {
      alert(`Cannot log wastage greater than current stock. You only have ${selectedIngredient.current_stock} ${selectedIngredient.unit}.`)
      return
    }

    setIsSubmitting(true)
    try {
      const { error: logError } = await supabase
        .from('stock_logs')
        .insert({
          kitchen_id: kitchenId,
          ingredient_id: selectedIngredient.ingredient_id,
          change_amount: -parsedAmount,
          reason: reason || 'wastage',
          logged_by: profileId
        })
      if (logError) throw logError

      const newStock = selectedIngredient.current_stock - parsedAmount
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ current_stock: newStock })
        .eq('ingredient_id', selectedIngredient.ingredient_id)
      if (updateError) throw updateError

      setSuccess(true)
      setAmount('')
      setReason('')
      setSelectedIngredientId('')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err: any) {
      console.error(err)
      alert("Failed to log wastage: " + err.message)
      setIsSubmitting(false)
    }
  }

  if (success) {
     return (
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', backgroundColor: '#064E3B', border: '1px solid #10B981', borderRadius: '16px', width: '100%', maxWidth: '600px', margin: '0 auto', opacity: 0, animation: 'zoomIn 300ms forwards' }}>
         <style>{`@keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
         <div style={{ width: '80px', height: '80px', backgroundColor: '#10B981', color: '#FFFFFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
           <svg style={{ width: '40px', height: '40px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
           </svg>
         </div>
         <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#A7F3D0', letterSpacing: '-0.02em', margin: 0 }}>Wastage Logged</h2>
         <p style={{ fontSize: '16px', fontWeight: 500, color: '#6EE7B7', marginTop: '8px' }}>Inventory updated successfully. Refreshing in 2s...</p>
       </div>
     )
  }

  return (
    <div style={{ maxWidth: '600px', width: '100%', margin: '16px auto 60px auto', position: 'relative' }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--kds-surface)', border: '2px solid var(--kds-border)', padding: '40px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--kds-text)', margin: 0, letterSpacing: '-0.02em' }}>Log Ingredient Wastage</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--kds-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Ingredient</label>
            <div style={{ color: 'var(--text-primary)' }}>
                <Select value={selectedIngredientId} onValueChange={(val) => setSelectedIngredientId(val || '')}>
                  <SelectTrigger style={{ height: '64px', fontSize: '18px', fontWeight: 500, backgroundColor: 'var(--kds-bg)', borderColor: 'var(--kds-border)', color: 'var(--kds-text)' }}>
                    <SelectValue placeholder="Tap to select..." />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {ingredients.map(i => (
                      <SelectItem key={i.ingredient_id} value={i.ingredient_id} style={{ padding: '16px', color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px' }}>{i.name}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: 'auto', backgroundColor: 'var(--bg-start)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            {i.current_stock} {i.unit}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--kds-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Waste Amount</label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ 
                    height: '64px', 
                    fontSize: '20px', 
                    fontFamily: 'monospace', 
                    fontWeight: 700,
                    padding: '0 16px',
                    width: '100%',
                    backgroundColor: (selectedIngredient && amount && parseFloat(amount) > selectedIngredient.current_stock) ? 'rgba(239, 68, 68, 0.1)' : 'var(--kds-bg)',
                    borderColor: (selectedIngredient && amount && parseFloat(amount) > selectedIngredient.current_stock) ? '#EF4444' : 'var(--kds-border)',
                    color: (selectedIngredient && amount && parseFloat(amount) > selectedIngredient.current_stock) ? '#EF4444' : 'var(--kds-text)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--kds-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Unit</label>
              <input 
                disabled 
                value={selectedIngredient ? selectedIngredient.unit : '-'} 
                style={{
                  height: '64px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--kds-muted)',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--kds-border)',
                  borderRadius: '8px',
                  padding: '0 16px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {selectedIngredient && amount && parseFloat(amount) > selectedIngredient.current_stock && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error: Waste amount cannot exceed current stock ({selectedIngredient.current_stock} {selectedIngredient.unit}).
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--kds-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Reason <span style={{ fontWeight: 500, opacity: 0.5, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span></label>
            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Dropped on floor, expired batch, overcooked"
              style={{
                minHeight: '120px',
                fontSize: '18px',
                padding: '20px',
                fontWeight: 500,
                backgroundColor: 'var(--kds-bg)',
                border: '1px solid var(--kds-border)',
                color: 'var(--kds-text)',
                borderRadius: '8px',
                outline: 'none',
                resize: 'none',
                width: '100%'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !selectedIngredientId || !amount || parseFloat(amount) > (selectedIngredient?.current_stock || 0)}
            style={{
              width: '100%',
              height: '64px',
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              backgroundColor: (isSubmitting || !selectedIngredientId || !amount || parseFloat(amount) > (selectedIngredient?.current_stock || 0)) ? 'var(--kds-border)' : '#FFFFFF',
              color: (isSubmitting || !selectedIngredientId || !amount || parseFloat(amount) > (selectedIngredient?.current_stock || 0)) ? 'var(--kds-muted)' : '#000000',
              border: 'none',
              borderRadius: '8px',
              marginTop: '16px',
              cursor: (isSubmitting || !selectedIngredientId || !amount || parseFloat(amount) > (selectedIngredient?.current_stock || 0)) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Logging...' : 'Log Wastage'}
          </button>
        </div>
      </form>
    </div>
  )
}
