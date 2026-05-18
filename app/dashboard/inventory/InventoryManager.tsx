'use client'

import { useState } from 'react'
import { Ingredient } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Pencil, Trash2, Check, X, AlertTriangle, TrendingDown } from 'lucide-react'

const UNITS       = ['kg', 'g', 'liters', 'ml', 'pieces', 'packs', 'boxes', 'bottles', 'bags', 'cans']
const CATEGORIES  = ['Produce', 'Meat', 'Dairy', 'Dry Goods', 'Spices', 'Beverages', 'Packaging', 'Frozen', 'Other']

type Status = 'critical' | 'low' | 'ok'
type Filter = 'all' | 'low' | 'critical'

type Draft = {
  name: string; category: string; unit: string
  current_stock: string; reorder_level: string; ideal_stock: string
}

const BLANK_DRAFT: Draft = {
  name: '', category: '', unit: 'kg',
  current_stock: '0', reorder_level: '', ideal_stock: '',
}

function getStatus(item: Ingredient): Status {
  if (item.current_stock <= 0) return 'critical'
  if (item.reorder_level !== null && item.current_stock <= item.reorder_level) return 'low'
  return 'ok'
}

const STATUS_STYLE: Record<Status, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
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
    kitchen_id:    kitchenId,
    name:          draft.name.trim(),
    category:      draft.category || null,
    unit:          draft.unit,
    current_stock: parseFloat(draft.current_stock) || 0,
    reorder_level: draft.reorder_level !== '' ? parseFloat(draft.reorder_level) : null,
    ideal_stock:   draft.ideal_stock   !== '' ? parseFloat(draft.ideal_stock)   : null,
  }
}

export default function InventoryManager({ initialIngredients, kitchenId }: { initialIngredients: Ingredient[]; kitchenId: string }) {
  const [items, setItems]         = useState<Ingredient[]>(initialIngredients)
  const [filter, setFilter]       = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(BLANK_DRAFT)
  const [isAdding, setIsAdding]   = useState(false)
  const [addDraft, setAddDraft]   = useState<Draft>(BLANK_DRAFT)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const supabase = createClient()

  const criticalCount = items.filter(i => getStatus(i) === 'critical').length
  const lowCount      = items.filter(i => getStatus(i) === 'low').length

  const filtered = items.filter(i => {
    if (filter === 'critical') return getStatus(i) === 'critical'
    if (filter === 'low')      return getStatus(i) === 'low' || getStatus(i) === 'critical'
    return true
  })

  const startEdit = (item: Ingredient) => {
    setEditingId(item.ingredient_id)
    setEditDraft({
      name:          item.name,
      category:      item.category ?? '',
      unit:          item.unit,
      current_stock: String(item.current_stock),
      reorder_level: item.reorder_level !== null ? String(item.reorder_level) : '',
      ideal_stock:   item.ideal_stock   !== null ? String(item.ideal_stock)   : '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditDraft(BLANK_DRAFT) }

  const handleSave = async () => {
    if (!editingId || !editDraft.name.trim()) return
    setSaving(true); setError(null)
    const updates = parseDraft(editDraft, kitchenId)
    const { error: err } = await supabase
      .from('ingredients')
      .update(updates)
      .eq('ingredient_id', editingId)
    if (err) { setError(err.message); setSaving(false); return }
    setItems(prev => prev.map(i => i.ingredient_id === editingId ? { ...i, ...updates } : i))
    setEditingId(null)
    setSaving(false)
  }

  const handleAdd = async () => {
    if (!addDraft.name.trim()) return
    setSaving(true); setError(null)
    const newRow = parseDraft(addDraft, kitchenId)
    const { data, error: err } = await supabase
      .from('ingredients')
      .insert(newRow)
      .select()
      .single()
    if (err || !data) { setError(err?.message ?? 'Insert failed'); setSaving(false); return }
    setItems(prev => [...prev, data as Ingredient])
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={22} style={{ color: 'var(--color-accent)' }} />
            Inventory
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
            Track stock levels, set reorder thresholds, and manage your ingredient list.
          </p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setAddDraft(BLANK_DRAFT) }}
          disabled={isAdding}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 16px', borderRadius: '100px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, cursor: isAdding ? 'not-allowed' : 'pointer', opacity: isAdding ? 0.6 : 1 }}
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Items',   value: items.length,   color: 'var(--color-ink)' },
          { label: 'Low Stock',     value: lowCount,       color: '#f59e0b' },
          { label: 'Out of Stock',  value: criticalCount,  color: '#ef4444' },
          { label: 'Healthy',       value: items.length - lowCount - criticalCount, color: '#22c55e' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)', marginBottom: '6px' }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {([
          { id: 'all',      label: 'All',        count: items.length },
          { id: 'low',      label: 'Low Stock',  count: lowCount + criticalCount, icon: <TrendingDown size={12} /> },
          { id: 'critical', label: 'Out of Stock', count: criticalCount,          icon: <AlertTriangle size={12} /> },
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
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Status</TH>
                <TH>Category</TH>
                <TH>Name</TH>
                <TH>Unit</TH>
                <TH right>Current Stock</TH>
                <TH right>Reorder Level</TH>
                <TH right>Ideal Stock</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--color-ink-3)', borderBottom: '1px solid var(--color-border)' }}>
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
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '130px' }}>
                        <Select value={editDraft.category} onChange={v => setEditDraft(p => ({ ...p, category: v }))} options={CATEGORIES} placeholder="Category" />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '160px' }}>
                        <Input value={editDraft.name} onChange={v => setEditDraft(p => ({ ...p, name: v }))} placeholder="Ingredient name" />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '100px' }}>
                        <Select value={editDraft.unit} onChange={v => setEditDraft(p => ({ ...p, unit: v }))} options={UNITS} />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                        <Input value={editDraft.current_stock} onChange={v => setEditDraft(p => ({ ...p, current_stock: v }))} type="number" />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                        <Input value={editDraft.reorder_level} onChange={v => setEditDraft(p => ({ ...p, reorder_level: v }))} type="number" placeholder="—" />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                        <Input value={editDraft.ideal_stock} onChange={v => setEditDraft(p => ({ ...p, ideal_stock: v }))} type="number" placeholder="—" />
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
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
                    <Cell>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => startEdit(item)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => handleDelete(item.ingredient_id)} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: '6px', border: '1px solid transparent', background: 'transparent', color: 'var(--color-ink-3)', fontSize: '12px', cursor: 'pointer' }}
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

              {/* Add row */}
              {isAdding && (
                <tr style={{ background: 'rgba(34,197,94,0.04)' }}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>NEW</td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '130px' }}>
                    <Select value={addDraft.category} onChange={v => setAddDraft(p => ({ ...p, category: v }))} options={CATEGORIES} placeholder="Category" />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '160px' }}>
                    <Input value={addDraft.name} onChange={v => setAddDraft(p => ({ ...p, name: v }))} placeholder="Ingredient name *" />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '100px' }}>
                    <Select value={addDraft.unit} onChange={v => setAddDraft(p => ({ ...p, unit: v }))} options={UNITS} />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                    <Input value={addDraft.current_stock} onChange={v => setAddDraft(p => ({ ...p, current_stock: v }))} type="number" placeholder="0" />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                    <Input value={addDraft.reorder_level} onChange={v => setAddDraft(p => ({ ...p, reorder_level: v }))} type="number" placeholder="Min" />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', minWidth: '110px' }}>
                    <Input value={addDraft.ideal_stock} onChange={v => setAddDraft(p => ({ ...p, ideal_stock: v }))} type="number" placeholder="Ideal" />
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={handleAdd} disabled={saving || !addDraft.name.trim()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: (saving || !addDraft.name.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !addDraft.name.trim()) ? 0.5 : 1 }}>
                        <Check size={12} /> Add
                      </button>
                      <button onClick={() => { setIsAdding(false); setAddDraft(BLANK_DRAFT) }} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
