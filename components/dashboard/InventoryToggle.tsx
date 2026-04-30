'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface InventoryRow {
  ingredient_name: string
  current_stock: number
  unit: string | null
  stock_value: number
  reorder_status: string | null
}

export function InventoryToggle({ rows }: { rows: InventoryRow[] }) {
  const [open, setOpen] = useState(false)

  if (!rows.length) return null

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-accent)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        View all ingredients
        <span style={{ fontSize: '9px', marginTop: '1px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '300px' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 0 }}>Name</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'center', paddingRight: 0 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const s = (row.reorder_status ?? 'OK').toUpperCase()
                const dot =
                  s === 'CRITICAL' ? 'var(--color-red)'
                  : s === 'LOW'    ? 'var(--color-amber)'
                  : 'var(--color-green)'
                return (
                  <tr key={i}>
                    <td style={{ paddingLeft: 0, fontWeight: 500, color: 'var(--color-ink)' }}>
                      {row.ingredient_name}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', color: 'var(--color-ink-2)' }}>
                      {row.current_stock}{' '}
                      <span style={{ color: 'var(--color-ink-3)' }}>{row.unit}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', color: 'var(--color-ink)' }}>
                      {formatCurrency(row.stock_value)}
                    </td>
                    <td style={{ textAlign: 'center', paddingRight: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: dot }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                        {s}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
