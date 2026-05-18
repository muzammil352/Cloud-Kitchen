'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderStatus } from '@/lib/types'
import { formatCurrency, shortId, formatDate } from '@/lib/utils'
import { ArrowLeft, Clock, ClipboardCheck, ChefHat, Truck, Home, MapPin, XCircle } from 'lucide-react'

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS: { key: OrderStatus; label: string; Icon: React.FC<any> }[] = [
  { key: 'pending',          label: 'Received',    Icon: Clock           },
  { key: 'confirmed',        label: 'Confirmed',   Icon: ClipboardCheck  },
  { key: 'preparing',        label: 'Preparing',   Icon: ChefHat         },
  { key: 'out_for_delivery', label: 'On the way',  Icon: Truck           },
  { key: 'delivered',        label: 'Delivered',   Icon: Home            },
]

// Map statuses that fall between canonical steps
function toStepIndex(status: OrderStatus): number {
  if (status === 'ready' || status === 'dispatched') return 3 // out_for_delivery slot
  return STEPS.findIndex(s => s.key === status)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Dash() {
  return (
    <div style={{
      flex: 1,
      height: '1.5px',
      background: 'repeating-linear-gradient(to right, var(--color-border-mid) 0px, var(--color-border-mid) 5px, transparent 5px, transparent 10px)',
      marginTop: '-20px', // align with circle centre
    }} />
  )
}

function Perforation() {
  return (
    <div style={{
      height: '1.5px',
      margin: '0 -1px',
      background: 'repeating-linear-gradient(to right, var(--color-border-mid) 0px, var(--color-border-mid) 7px, transparent 7px, transparent 14px)',
    }} />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderTracker({
  initialOrder,
  kitchenName,
  slug,
}: {
  initialOrder: any
  kitchenName: string
  slug: string
}) {
  const [status, setStatus] = useState<OrderStatus>(initialOrder.status)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`order-${initialOrder.order_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_id=eq.${initialOrder.order_id}`,
      }, payload => {
        if (payload.new?.status) setStatus(payload.new.status as OrderStatus)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [initialOrder.order_id, supabase])

  const currentStep  = toStepIndex(status)
  const isCancelled  = status === 'cancelled'
  const initials     = kitchenName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  // Status label for badge
  const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
    pending: 'Order Received', confirmed: 'Confirmed', preparing: 'Preparing Your Order',
    ready: 'Ready for Pickup', dispatched: 'Dispatched', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered', cancelled: 'Cancelled',
  }
  const STATUS_COLOR: Partial<Record<OrderStatus, { color: string; bg: string }>> = {
    pending:          { color: 'var(--color-amber)',  bg: 'var(--color-amber-bg)'  },
    confirmed:        { color: 'var(--color-blue)',   bg: 'var(--color-blue-bg)'   },
    preparing:        { color: 'var(--color-accent)', bg: 'var(--color-accent-bg)' },
    ready:            { color: 'var(--color-green)',  bg: 'var(--color-green-bg)'  },
    dispatched:       { color: 'var(--color-green)',  bg: 'var(--color-green-bg)'  },
    out_for_delivery: { color: 'var(--color-green)',  bg: 'var(--color-green-bg)'  },
    delivered:        { color: 'var(--color-green)',  bg: 'var(--color-green-bg)'  },
    cancelled:        { color: 'var(--color-red)',    bg: 'var(--color-red-bg)'    },
  }
  const badge = STATUS_COLOR[status] ?? { color: 'var(--color-ink-3)', bg: 'var(--color-surface-2)' }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '28px 20px 64px' }}>
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(1.5); opacity: 0;   }
          100% { transform: scale(1.5); opacity: 0;   }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ── Back link ─────────────────────────────────────── */}
      <a
        href={`/${slug}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontFamily: 'var(--font-body)',
          color: 'var(--color-ink-3)', textDecoration: 'none',
          marginBottom: '36px',
          transition: 'color 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to {kitchenName}
      </a>

      {/* ── Page header ───────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 300ms ease both' }}>
        {/* Kitchen avatar */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'var(--color-accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          border: '1px solid rgba(212,83,26,0.15)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '20px', color: 'var(--color-accent)' }}>
            {initials}
          </span>
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '4px' }}>
          {kitchenName}
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '28px',
          color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1.2,
          marginBottom: '12px',
        }}>
          #{shortId(initialOrder.order_id)}
        </div>

        {/* Status pill */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: 'var(--radius-pill)',
          fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          color: badge.color, background: badge.bg,
          fontWeight: 500,
        }}>
          {!isCancelled && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: badge.color, flexShrink: 0,
              ...(status !== 'delivered' ? {
                animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
              } : {}),
            }} />
          )}
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      {/* ── Status stepper ────────────────────────────────── */}
      <div
        className="card"
        style={{ marginBottom: '24px', animation: 'fadeUp 300ms 60ms ease both', padding: '28px 20px 24px' }}
      >
        {isCancelled ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            padding: '20px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-red-bg)', border: '1px solid rgba(192,57,43,0.15)',
          }}>
            <XCircle size={28} strokeWidth={1.5} color="var(--color-red)" />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-red)' }}>
              This order has been cancelled
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {STEPS.map((step, idx) => {
              const isDone    = idx < currentStep
              const isCurrent = idx === currentStep
              const Icon      = step.Icon

              const circleColor   = isDone ? 'var(--color-accent)' : isCurrent ? 'var(--color-accent-bg)' : 'var(--color-surface-2)'
              const borderColor   = isDone || isCurrent ? 'var(--color-accent)' : 'var(--color-border-mid)'
              const iconColor     = isDone ? '#fff' : isCurrent ? 'var(--color-accent)' : 'var(--color-ink-3)'
              const labelColor    = isDone || isCurrent ? 'var(--color-ink)' : 'var(--color-ink-3)'
              const labelWeight   = isCurrent ? 600 : 400

              return (
                <div key={step.key} style={{ display: 'flex', flex: idx < STEPS.length - 1 ? '1' : '0 0 auto', alignItems: 'flex-start' }}>
                  {/* Step */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {/* Circle */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: circleColor,
                        border: `2px solid ${borderColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 400ms, border-color 400ms',
                      }}>
                        <Icon size={16} strokeWidth={1.5} color={iconColor} />
                      </div>
                      {isCurrent && (
                        <div style={{
                          position: 'absolute', inset: '-5px',
                          borderRadius: '50%',
                          border: '2px solid rgba(212,83,26,0.35)',
                          animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
                          pointerEvents: 'none',
                        }} />
                      )}
                    </div>
                    {/* Label */}
                    <span style={{
                      fontSize: '10px', fontFamily: 'var(--font-body)',
                      fontWeight: labelWeight, color: labelColor,
                      textAlign: 'center', whiteSpace: 'nowrap',
                      letterSpacing: '0.01em',
                    }}>
                      {step.label}
                    </span>
                  </div>

                  {/* Dots between steps */}
                  {idx < STEPS.length - 1 && (
                    <div style={{
                      flex: 1, display: 'flex', gap: '4px',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', marginTop: '19px',
                    }}>
                      {[0, 1, 2].map(d => (
                        <div key={d} style={{
                          width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0,
                          background: idx < currentStep ? 'var(--color-accent)' : 'var(--color-border-mid)',
                          transition: 'background 400ms',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Receipt ───────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        animation: 'fadeUp 300ms 120ms ease both',
      }}>
        {/* Receipt header */}
        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '20px',
            color: 'var(--color-ink)', marginBottom: '4px',
          }}>
            {kitchenName}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--color-ink-3)', marginBottom: '16px',
          }}>
            Order Receipt
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
              #{shortId(initialOrder.order_id)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
              {formatDate(initialOrder.created_at)}
            </span>
          </div>
        </div>

        <Perforation />

        {/* Items */}
        <div style={{ padding: '20px 24px' }}>
          {initialOrder.order_items.map((item: any) => (
            <div
              key={item.order_item_id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                gap: '12px', marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  color: 'var(--color-ink-3)', flexShrink: 0, minWidth: '28px',
                }}>
                  {item.quantity}×
                </span>
                <span style={{
                  fontSize: '14px', fontFamily: 'var(--font-body)',
                  color: 'var(--color-ink)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.menu_items?.name ?? 'Item'}
                </span>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '13px',
                color: 'var(--color-ink-2)', flexShrink: 0,
              }}>
                {formatCurrency(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Perforation />

        {/* Total */}
        <div style={{
          padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 500,
            fontSize: '14px', color: 'var(--color-ink-2)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Total
          </span>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 400,
            fontSize: '24px', color: 'var(--color-ink)', letterSpacing: '-0.02em',
          }}>
            {formatCurrency(initialOrder.total_amount)}
          </span>
        </div>

        <Perforation />

        {/* Delivery address */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <MapPin size={14} strokeWidth={1.5} color="var(--color-ink-3)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--color-ink-3)', marginBottom: '4px',
            }}>
              Delivering to
            </p>
            <p style={{
              fontSize: '14px', fontFamily: 'var(--font-body)',
              color: 'var(--color-ink)', lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}>
              {initialOrder.delivery_address}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────── */}
      <p style={{
        textAlign: 'center', marginTop: '32px',
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--color-ink-3)', letterSpacing: '0.04em',
      }}>
        This page updates automatically · Powered by KitchenOS
      </p>
    </div>
  )
}
