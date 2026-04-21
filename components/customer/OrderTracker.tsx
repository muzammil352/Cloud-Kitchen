'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderStatus } from '@/lib/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, shortId, formatDate } from '@/lib/utils'

const STATUS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered'
]

export function OrderTracker({ initialOrder }: { initialOrder: any }) {
  const [status, setStatus] = useState<OrderStatus>(initialOrder.status)
  const supabase = createClient()
  
  useEffect(() => {
    const channel = supabase
      .channel(`order-${initialOrder.order_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_id=eq.${initialOrder.order_id}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          setStatus(payload.new.status)
        }
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialOrder.order_id, supabase])

  const currentStepIndex = STATUS_STEPS.indexOf(status)
  const isCancelled = status === 'cancelled'

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10 pb-6 border-b border-border">
        <p className="text-muted-foreground text-sm uppercase mb-1 tracking-wider">Order Tracking</p>
        <h1 className="text-2xl font-mono mb-4 text-foreground">#{shortId(initialOrder.order_id)}</h1>
        <StatusBadge status={status} />
      </div>

      {/* Progress Bar */}
      <div className="mb-12 relative border border-border p-6 rounded-lg bg-background">
        <h2 className="font-medium text-lg mb-6 text-foreground">Status</h2>
        
        {isCancelled ? (
          <div className="text-center py-4 text-destructive font-medium border border-destructive/20 bg-destructive/10 rounded-md">
            This order has been cancelled.
          </div>
        ) : (
          <div className="relative pl-2">
            {/* Connecting line */}
            <div className="absolute left-[23px] top-[15px] bottom-[15px] w-[2px] bg-border z-0" />
            
            <div className="space-y-8 relative z-10">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index < currentStepIndex
                const isCurrent = index === currentStepIndex
                
                let dotClass = "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background"
                let textClass = "ml-4 font-medium"
                
                if (isCompleted) {
                  dotClass += " border-accent bg-accent"
                  textClass += " text-foreground"
                } else if (isCurrent) {
                  dotClass += " border-accent relative"
                  textClass += " text-accent"
                } else {
                  dotClass += " border-border"
                  textClass += " text-muted-foreground"
                }

                // Friendly Labels
                const labels: Record<string, string> = {
                  pending: "Received",
                  confirmed: "Confirmed",
                  preparing: "Preparing",
                  out_for_delivery: "Out for Delivery",
                  delivered: "Delivered",
                }

                return (
                  <div key={step} className="flex items-center">
                    <div className={dotClass}>
                      {isCompleted && (
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isCurrent && (
                        <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
                      )}
                    </div>
                    <span className={textClass}>{labels[step]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="border border-border rounded-lg bg-background overflow-hidden relative">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="font-medium text-lg text-foreground">Order Summary</h2>
          <p className="text-xs text-muted-foreground mt-1">Placed on {formatDate(initialOrder.created_at)}</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {initialOrder.order_items.map((item: any) => (
              <div key={item.order_item_id} className="flex justify-between text-sm text-foreground">
                <span className="flex-1">
                  <span className="font-mono text-muted-foreground mr-2">{item.quantity}x</span>
                  {item.menu_items?.name || 'Item'}
                </span>
                <span className="font-mono text-muted-foreground">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-border flex justify-between font-medium text-foreground">
            <span>Total</span>
            <span className="font-mono text-lg">{formatCurrency(initialOrder.total_amount)}</span>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Delivering to</h3>
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{initialOrder.delivery_address}</p>
        </div>
      </div>
    </div>
  )
}
