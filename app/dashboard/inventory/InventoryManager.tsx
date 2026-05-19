'use client'

import { useState } from 'react'
import { Ingredient, InventoryValue, InventoryTotals } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Pencil, Trash2, Check, X, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react'

const UNITS      = ['kg', 'g', 'liters', 'ml', 'pieces', 'packs', 'boxes', 'bottles', 'bags', 'cans']
const CATEGORIES = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Spices', 'Beverages', 'Packaging', 'Frozen', 'Other']

type Status = 'critical' | 'low' | 'ok'
type Filter = 'all' | 'low' | 'critical'

type Draft = {
  name: string; category: string; unit: string
  current_stock: string; reorder_level: string; ideal_stock: string
  cost_per_unit: string; supplier_name: string
  lead_time_days: string; minimum_cover_days: string
}

const BLANK_DRAFT: Draft = {
  name: '', category: '', unit: 'kg',
  current_stock: '0', reorder_level: '', ideal_stock: '',
  cost_per_unit: '', supplier_name: '',
  lead_time_days: '', minimum_cover_days: '',
}

function getStatus(item: Ingredient): Status {
  if (item.current_stock <= 0) return 'critical'
  if (item.reorder_level !== null && item.current_stock <= item.reorder_level) return 'low'
  return 'ok'
}

const STATUS_STYLE: Record<Status, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  low:      { label: 'Low',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ok:       { label: 'OK',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
}

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: s.color, background: s.bg }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function Cell({ children, mono, right, muted }: { children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean }) {
  return (
    <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', color: muted ? 'var(--color-ink-3)' : 'var(--color-ink)', textAlign: right ? 'right' : 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
      {children}
    </td>
  )
}

function Input({ value, onChange, placeholder, type = 'text', width }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: width ?? '100%', padding: '5px 8px', fontSize: '13px', fontFamily: 'var(--font-body)', border: '1px solid var(--color-border-mid)', borderRadius: '6px', background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none' }}
    />
  )
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '5px 8px', fontSize: '13px', fontFamily: 'var(--font-body)', border: '1px solid var(--color-border-mid)', borderRadius: '6px', background: 'var(--color-surface)', color: value ? 'var(--color-ink)' : 'var(--color-ink-3)', outline: 'none' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function parseDraft(draft: Draft, kitchenId: string) {
  return {
    kitchen_id:         kitchenId,
    name:               draft.name.trim(),
    category:           draft.category || null,
    unit:               draft.unit,
    current_stock:      parseFloat(draft.current_stock) || 0,
    reorder_level:      draft.reorder_level      !== '' ? parseFloat(draft.reorder_level)      : null,
    ideal_stock:        draft.ideal_stock        !== '' ? parseFloat(draft.ideal_stock)        : null,
    cost_per_unit:      draft.cost_per_unit      !== '' ? parseFloat(draft.cost_per_unit)      : null,
    supplier_name:      draft.supplier_name.trim() || null,
    lead_time_days:     draft.lead_time_days     !== '' ? parseInt(draft.lead_time_days)       : null,
    minimum_cover_days: draft.minimum_cover_days !== '' ? parseInt(draft.minimum_cover_days)   : null,
  }
}

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function InventoryManager({
  initialIngredients,
  kitchenId,
  inventoryValues,
  inventoryTotals,
}: {
  initialIngredients: Ingredient[]
  kitchenId: string
  inventoryValues: InventoryValue[]
  inventoryTotals: InventoryTotals | null
}) {
  const [items, setItems]         = useState<Ingredient[]>(initialIngredients)
  const [filter, setFilter]       = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(BLANK_DRAFT)
  const [isAdding, setIsAdding]   = useState(false)
  const [addDraft, setAddDraft]   = useState<Draft>(BLANK_DRAFT)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Restock modal
  const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null)
  const [restockQty, setRestockQty]               = useState('')
  const [restockNotes, setRestockNotes]           = useState('')
  const [restocking, setRestocking]               = useState(false)
  const [restockError, setRestockError]           = useState<string | null>(null)
  const [restockSuccess, setRestockSuccess]       = useState(false)

  const supabase = createClient()

  const openRestock = (ingredient: Ingredient) => {
    setRestockIngredient(ingredient)
    setRestockQty('')
    setRestockNotes('')
    setRestockError(null)
    setRestockSuccess(false)
  }

  const closeRestock = () => {
    setRestockIngredient(null)
    setRestockQty('')
    setRestockNotes('')
    setRestockError(null)
    setRestockSuccess(false)
    setRestocking(false)
  }

  const handleRestock = async () => {
    if (!restockIngredient || !restockQty) return
    setRestocking(true)
    setRestockError(null)
    const res = await fetch('/api/inventory/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kitchen_id: kitchenId,
        ingredient_id: restockIngredient.ingredient_id,
        quantity_added: parseFloat(restockQty),
        notes: restockNotes || null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRestockError(data.error || 'Restock failed. Please try again.')
      setRestocking(false)
    } else {
      setRestockSuccess(true)
      setTimeout(closeRestock, 1500)
    }
  }

  const criticalCount = items.filter(i => getStatus(i) === 'critical').length
  const lowCount      = items.filter(i => getStatus(i) === 'low').length
  const healthyCount  = items.length - lowCount - criticalCount

  const filtered = items.filter(i => {
    if (filter === 'critical') return getStatus(i) === 'critical'
    if (filter === 'low')      return getStatus(i) === 'low' || getStatus(i) === 'critical'
    return true
  })

  // Latest N8N valuation snapshot — deduplicated to the most recent computed_at batch
  const latestComputedAt = inventoryValues[0]?.computed_at ?? null
  const latestValuation  = latestComputedAt
    ? inventoryValues.filter(v => v.computed_at === latestComputedAt)
    : []

  // Summary card values — prefer N8N-computed totals when available
  const totalItems   = inventoryTotals?.ingredient_count          ?? items.length
  const belowReorder = inventoryTotals?.ingredients_below_reorder ?? (lowCount + criticalCount)
  const totalValue   = inventoryTotals?.total_value_pkr            ?? null

  const startEdit = (item: Ingredient) => {
    setEditingId(item.ingredient_id)
    setEditDraft({
      name:               item.name,
      category:           item.category           ?? '',
      unit:               item.unit,
      current_stock:      String(item.current_stock),
      reorder_level:      item.reorder_level      !== null ? String(item.reorder_level)      : '',
      ideal_stock:        item.ideal_stock        !== null ? String(item.ideal_stock)        : '',
      cost_per_unit:      item.cost_per_unit      !== null ? String(item.cost_per_unit)      : '',
      supplier_name:      item.supplier_name      ?? '',
      lead_time_days:     item.lead_time_days     !== null ? String(item.lead_time_days)     : '',
      minimum_cover_days: item.minimum_cover_days !== null ? String(item.minimum_cover_days) : '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditDraft(BLANK_DRAFT) }

  const handleSave = async () => {
    if (!editingId || !editDraft.name.trim()) return
    setSaving(true); setError(null)
    const updates = parseDraft(editDraft, kitchenId)
    const { error: err } = await supabase.from('ingredients').update(updates).eq('ingredient_id', editingId)
    if (err) { setError(err.message); setSaving(false); return }
    setItems(prev => prev.map(i => i.ingredient_id === editingId ? { ...i, ...updates } : i))
    setEditingId(null)
    setSaving(false)
  }

  const handleAdd = async () => {
    if (!addDraft.name.trim()) return
    setSaving(true); setError(null)
    const newRow = parseDraft(addDraft, kitchenId)
    const { data, error: err } = await supabase.from('ingredients').insert(newRow).select().single()
    if (err || !data) { setError(err?.message ?? 'Insert failed'); setSaving(false); return }
    setItems(prev => [data as Ingredient, ...prev])
    setAddDraft(BLANK_DRAFT)
    setIsAdding(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient? This cannot be undone.')) return
    const { error: err } = await supabase.from('ingredients').delete().eq('ingredient_id', id)
    if (err) { setError(err.message); return }
    setItems(prev => prev.filter(i => i.ingredient_id !== id))
    if (editingId === id) cancelEdit()
  }

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)', textAlign: right ? 'right' : 'left', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )

  const editTd = (minWidth?: string) => ({
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border)',
    ...(minWidth ? { minWidth } : {}),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={22} style={{ color: 'var(--color-accent)' }} />
          Inventory
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
          Track stock levels, set reorder thresholds, and manage your ingredient list.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {([
          { label: 'Total Items',     value: String(totalItems),   color: 'var(--color-ink)',    size: '28px' },
          { label: 'Below Reorder',   value: String(belowReorder), color: '#f59e0b',             size: '28px' },
          { label: 'Out of Stock',    value: String(criticalCount),color: '#ef4444',             size: '28px' },
          { label: 'Healthy',         value: String(healthyCount), color: '#22c55e',             size: '28px' },
          ...(totalValue !== null ? [{
            label: 'Total Value (PKR)',
            value: `₨ ${fmt(totalValue)}`,
            color: 'var(--color-accent)',
            size: '20px',
          }] : []),
        ] as { label: string; value: string; color: string; size: string }[]).map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: c.size, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Top 3 cash locked banner */}
      {inventoryTotals?.top_3_cash_locked && (
        <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--color-ink-2)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)', flexShrink: 0 }}>Top 3 cash locked:</span>
          {inventoryTotals.top_3_cash_locked}
        </div>
      )}

      {/* Filter tabs + Add Item */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { id: 'all',      label: 'All',          count: items.length },
          { id: 'low',      label: 'Low Stock',    count: lowCount + criticalCount, icon: <TrendingDown size={12} /> },
          { id: 'critical', label: 'Out of Stock', count: criticalCount,            icon: <AlertTriangle size={12} /> },
        ] as { id: Filter; label: string; count: number; icon?: React.ReactNode }[]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '100px', border: `1px solid ${filter === f.id ? 'var(--color-accent)' : 'var(--color-border-mid)'}`, background: filter === f.id ? 'var(--color-accent-bg)' : 'var(--color-surface)', color: filter === f.id ? 'var(--color-accent)' : 'var(--color-ink-2)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: filter === f.id ? 600 : 400, cursor: 'pointer', transition: 'all var(--transition)' }}
          >
            {f.icon}{f.label}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '1px 6px', borderRadius: '100px', background: filter === f.id ? 'rgba(0,0,0,0.08)' : 'var(--color-surface-2)', fontWeight: 600 }}>{f.count}</span>
          </button>
        ))}
        <button
          onClick={() => { setIsAdding(true); setAddDraft(BLANK_DRAFT) }}
          disabled={isAdding}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '100px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, cursor: isAdding ? 'not-allowed' : 'pointer', opacity: isAdding ? 0.6 : 1 }}
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Main Ingredients Table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr>
                <TH>Status</TH>
                <TH>Category</TH>
                <TH>Name</TH>
                <TH>Unit</TH>
                <TH right>Stock</TH>
                <TH right>Reorder</TH>
                <TH right>Ideal</TH>
                <TH right>Cost/Unit (₨)</TH>
                <TH>Supplier</TH>
                <TH right>Lead Days</TH>
                <TH right>Cover Days</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {/* Add row — always at the top */}
              {isAdding && (
                <tr style={{ background: 'rgba(34,197,94,0.04)' }}>
                  <td style={editTd()}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>NEW</span>
                  </td>
                  <td style={editTd('130px')}><Select value={addDraft.category} onChange={v => setAddDraft(p => ({ ...p, category: v }))} options={CATEGORIES} placeholder="Category" /></td>
                  <td style={editTd('160px')}><Input value={addDraft.name} onChange={v => setAddDraft(p => ({ ...p, name: v }))} placeholder="Ingredient name *" /></td>
                  <td style={editTd('100px')}><Select value={addDraft.unit} onChange={v => setAddDraft(p => ({ ...p, unit: v }))} options={UNITS} /></td>
                  <td style={editTd('100px')}><Input value={addDraft.current_stock} onChange={v => setAddDraft(p => ({ ...p, current_stock: v }))} type="number" placeholder="0" /></td>
                  <td style={editTd('100px')}><Input value={addDraft.reorder_level} onChange={v => setAddDraft(p => ({ ...p, reorder_level: v }))} type="number" placeholder="Min" /></td>
                  <td style={editTd('100px')}><Input value={addDraft.ideal_stock} onChange={v => setAddDraft(p => ({ ...p, ideal_stock: v }))} type="number" placeholder="Ideal" /></td>
                  <td style={editTd('120px')}><Input value={addDraft.cost_per_unit} onChange={v => setAddDraft(p => ({ ...p, cost_per_unit: v }))} type="number" placeholder="0.00" /></td>
                  <td style={editTd('150px')}><Input value={addDraft.supplier_name} onChange={v => setAddDraft(p => ({ ...p, supplier_name: v }))} placeholder="Supplier" /></td>
                  <td style={editTd('90px')}><Input value={addDraft.lead_time_days} onChange={v => setAddDraft(p => ({ ...p, lead_time_days: v }))} type="number" placeholder="—" /></td>
                  <td style={editTd('90px')}><Input value={addDraft.minimum_cover_days} onChange={v => setAddDraft(p => ({ ...p, minimum_cover_days: v }))} type="number" placeholder="—" /></td>
                  <td style={editTd()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={handleAdd} disabled={saving || !addDraft.name.trim()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: !addDraft.name.trim() ? 0.5 : 1 }}>
                        <Check size={12} /> Add
                      </button>
                      <button onClick={() => { setIsAdding(false); setAddDraft(BLANK_DRAFT) }} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={12} style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--color-ink-3)', borderBottom: '1px solid var(--color-border)' }}>
                    {filter === 'all' ? 'No ingredients yet. Click Add Item to get started.' : 'No items match this filter.'}
                  </td>
                </tr>
              )}

              {filtered.map(item => {
                const isEditing = editingId === item.ingredient_id
                const status    = getStatus(item)

                if (isEditing) {
                  return (
                    <tr key={item.ingredient_id} style={{ background: 'var(--color-accent-bg)' }}>
                      <td style={editTd()}><StatusBadge status={status} /></td>
                      <td style={editTd('130px')}><Select value={editDraft.category} onChange={v => setEditDraft(p => ({ ...p, category: v }))} options={CATEGORIES} placeholder="Category" /></td>
                      <td style={editTd('160px')}><Input value={editDraft.name} onChange={v => setEditDraft(p => ({ ...p, name: v }))} placeholder="Ingredient name" /></td>
                      <td style={editTd('100px')}><Select value={editDraft.unit} onChange={v => setEditDraft(p => ({ ...p, unit: v }))} options={UNITS} /></td>
                      <td style={editTd('100px')}><Input value={editDraft.current_stock} onChange={v => setEditDraft(p => ({ ...p, current_stock: v }))} type="number" /></td>
                      <td style={editTd('100px')}><Input value={editDraft.reorder_level} onChange={v => setEditDraft(p => ({ ...p, reorder_level: v }))} type="number" placeholder="—" /></td>
                      <td style={editTd('100px')}><Input value={editDraft.ideal_stock} onChange={v => setEditDraft(p => ({ ...p, ideal_stock: v }))} type="number" placeholder="—" /></td>
                      <td style={editTd('120px')}><Input value={editDraft.cost_per_unit} onChange={v => setEditDraft(p => ({ ...p, cost_per_unit: v }))} type="number" placeholder="0.00" /></td>
                      <td style={editTd('150px')}><Input value={editDraft.supplier_name} onChange={v => setEditDraft(p => ({ ...p, supplier_name: v }))} placeholder="Supplier name" /></td>
                      <td style={editTd('90px')}><Input value={editDraft.lead_time_days} onChange={v => setEditDraft(p => ({ ...p, lead_time_days: v }))} type="number" placeholder="—" /></td>
                      <td style={editTd('90px')}><Input value={editDraft.minimum_cover_days} onChange={v => setEditDraft(p => ({ ...p, minimum_cover_days: v }))} type="number" placeholder="—" /></td>
                      <td style={editTd()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                            <Check size={12} /> Save
                          </button>
                          <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={item.ingredient_id} style={{ transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Cell><StatusBadge status={status} /></Cell>
                    <Cell muted={!item.category}>{item.category ?? '—'}</Cell>
                    <Cell>{item.name}</Cell>
                    <Cell mono muted>{item.unit}</Cell>
                    <Cell mono right>
                      <span style={{ color: status === 'critical' ? '#ef4444' : status === 'low' ? '#f59e0b' : 'var(--color-ink)', fontWeight: status !== 'ok' ? 600 : 400 }}>
                        {item.current_stock}
                      </span>
                    </Cell>
                    <Cell mono right muted={item.reorder_level === null}>{item.reorder_level ?? '—'}</Cell>
                    <Cell mono right muted={item.ideal_stock === null}>{item.ideal_stock ?? '—'}</Cell>
                    <Cell mono right muted={item.cost_per_unit === null}>{item.cost_per_unit !== null ? fmt(item.cost_per_unit, 2) : '—'}</Cell>
                    <Cell muted={!item.supplier_name}>{item.supplier_name ?? '—'}</Cell>
                    <Cell mono right muted={item.lead_time_days === null}>{item.lead_time_days ?? '—'}</Cell>
                    <Cell mono right muted={item.minimum_cover_days === null}>{item.minimum_cover_days ?? '—'}</Cell>
                    <Cell>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => startEdit(item)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => openRestock(item)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <Plus size={11} /> Restock
                        </button>
                        <button onClick={() => handleDelete(item.ingredient_id)}
                          style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: '6px', border: '1px solid transparent', background: 'transparent', color: 'var(--color-ink-3)', fontSize: '12px', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-3)'; e.currentTarget.style.borderColor = 'transparent' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </Cell>
                  </tr>
                )
              })}

            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockIngredient && (
        <div
          onClick={closeRestock}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '17px', color: 'var(--color-ink)', marginBottom: '2px' }}>Log Restock</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>{restockIngredient.name} · {restockIngredient.unit}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)' }}>
                Quantity Added ({restockIngredient.unit}) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
                placeholder="e.g. 10"
                autoFocus
                style={{ padding: '8px 12px', fontSize: '14px', fontFamily: 'var(--font-mono)', border: '1px solid var(--color-border-mid)', borderRadius: '8px', background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)' }}>
                Notes (optional)
              </label>
              <textarea
                value={restockNotes}
                onChange={e => setRestockNotes(e.target.value)}
                placeholder="Supplier, batch number, reason…"
                rows={2}
                style={{ padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-body)', border: '1px solid var(--color-border-mid)', borderRadius: '8px', background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none', resize: 'none' }}
              />
            </div>

            {restockError && (
              <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{restockError}</p>
            )}

            {restockSuccess ? (
              <p style={{ fontSize: '14px', color: 'var(--color-green)', fontWeight: 500, textAlign: 'center' }}>Restock logged successfully.</p>
            ) : (
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={closeRestock}
                  style={{ flex: 1, height: '40px', borderRadius: '8px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={restocking || !restockQty}
                  style={{ flex: 2, height: '40px', borderRadius: '8px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: (restocking || !restockQty) ? 'not-allowed' : 'pointer', opacity: (restocking || !restockQty) ? 0.65 : 1 }}
                >
                  {restocking ? 'Logging…' : 'Log Restock'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* N8N Valuation Snapshot */}
      {latestValuation.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <RefreshCw size={14} style={{ color: 'var(--color-ink-3)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>
              Valuation Snapshot
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: '100px' }}>
              N8N computed · {new Date(latestComputedAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#fff' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr>
                    <TH>Name</TH>
                    <TH right>Stock</TH>
                    <TH>Unit</TH>
                    <TH right>Cost/Unit (₨)</TH>
                    <TH right>Value (₨)</TH>
                    <TH>Below Reorder</TH>
                    <TH right>Lead Days</TH>
                    <TH right>Cover Days</TH>
                    <TH>Supplier</TH>
                  </tr>
                </thead>
                <tbody>
                  {latestValuation.map((v, idx) => (
                    <tr key={`${v.ingredient_id}-${idx}`}
                      style={{ transition: 'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Cell>{v.name ?? '—'}</Cell>
                      <Cell mono right>{v.current_stock !== null ? fmt(v.current_stock, 2) : '—'}</Cell>
                      <Cell mono muted>{v.unit ?? '—'}</Cell>
                      <Cell mono right>{v.cost_per_unit !== null ? fmt(v.cost_per_unit, 2) : '—'}</Cell>
                      <Cell mono right>
                        <span style={{ fontWeight: 600 }}>{v.value_pkr !== null ? fmt(v.value_pkr, 2) : '—'}</span>
                      </Cell>
                      <Cell>
                        {v.below_reorder !== null ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: v.below_reorder ? '#f59e0b' : '#22c55e', background: v.below_reorder ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: v.below_reorder ? '#f59e0b' : '#22c55e', flexShrink: 0 }} />
                            {v.below_reorder ? 'Yes' : 'No'}
                          </span>
                        ) : '—'}
                      </Cell>
                      <Cell mono right muted={v.lead_time_days === null}>{v.lead_time_days ?? '—'}</Cell>
                      <Cell mono right muted={v.minimum_cover_days === null}>{v.minimum_cover_days ?? '—'}</Cell>
                      <Cell muted={!v.supplier_name}>{v.supplier_name ?? '—'}</Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
