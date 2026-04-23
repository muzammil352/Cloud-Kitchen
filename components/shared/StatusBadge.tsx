import { OrderStatus } from "@/lib/types"

const statusConfig: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending:          { bg: 'var(--color-amber-bg)',              color: 'var(--color-amber)',  label: 'Pending' },
  confirmed:        { bg: 'var(--color-blue-bg)',               color: 'var(--color-blue)',   label: 'Confirmed' },
  preparing:        { bg: 'var(--color-accent-bg)',             color: 'var(--color-accent)', label: 'Preparing' },
  ready:            { bg: 'var(--color-green-bg)',              color: 'var(--color-green)',  label: 'Ready' },
  dispatched:       { bg: 'rgba(212,83,26,0.08)',               color: 'var(--color-accent)', label: 'Dispatched' },
  out_for_delivery: { bg: 'rgba(45,122,79,0.12)',               color: 'var(--color-green)',  label: 'Out for delivery' },
  delivered:        { bg: 'var(--color-green-bg)',              color: 'var(--color-green)',  label: 'Delivered' },
  cancelled:        { bg: 'var(--color-red-bg)',                color: 'var(--color-red)',    label: 'Cancelled' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.pending
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontFamily: 'var(--font-mono)',
      fontWeight: 400,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      backgroundColor: cfg.bg,
      color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}
