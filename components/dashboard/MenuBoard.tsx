'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Image as ImageIcon } from 'lucide-react'

export function MenuBoard({ initialItems, kitchenId }: { initialItems: MenuItem[], kitchenId: string }) {
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const supabase = createClient()

  // Selection
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    image_url: '',
    is_active: true
  })

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ name: '', category: '', price: '', image_url: '', is_active: true });
  }

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      image_url: item.image_url || '',
      is_active: item.is_active
    })
  }

  const handleToggleActive = async (itemId: string, currentActive: boolean) => {
    const nextState = !currentActive
    setItems(prev => prev.map(item => item.item_id === itemId ? { ...item, is_active: nextState } : item))
    
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: nextState })
      .eq('item_id', itemId)
      
    if (error) {
      console.error("Toggle failed, reverting", error)
      setItems(prev => prev.map(item => item.item_id === itemId ? { ...item, is_active: currentActive } : item))
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('item_id', itemId)

    if (error) {
      alert('Cannot delete item because it is associated with existing orders. Disable it instead.')
      return
    }

    setItems(prev => prev.filter(i => i.item_id !== itemId))
    if (editingItem?.item_id === itemId) resetForm()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload = {
        kitchen_id: kitchenId,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        image_url: formData.image_url || null,
        is_active: formData.is_active
      }

      if (editingItem) {
        const { data, error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('item_id', editingItem.item_id)
          .select()
          .single()

        if (error) throw error
        setItems(prev => prev.map(i => i.item_id === editingItem.item_id ? data as MenuItem : i))
        resetForm()
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        setItems(prev => [...prev, data as MenuItem])
        resetForm()
      }
    } catch (err: any) {
      console.error(err)
      alert('Failed to save menu item. ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derived
  const catSet = new Set<string>();
  const catCounts: Record<string, number> = { 'All': items.length };
  items.forEach(i => {
    catSet.add(i.category);
    catCounts[i.category] = (catCounts[i.category] || 0) + 1;
  });
  const categories = ['All', ...Array.from(catSet).sort()];

  const visibleItems = selectedCategory === 'All' ? items : items.filter(i => i.category === selectedCategory);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '35% 1fr', gap: '24px', opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>

      {/* LEFT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Form Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{editingItem ? 'Edit Item' : 'Add Item'}</h2>
            {editingItem && (
              <button onClick={resetForm} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            )}
          </div>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category</label>
              <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required style={{ marginTop: '4px' }} placeholder="e.g. Burgers" />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Price</label>
              <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Image URL</label>
              <input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} style={{ marginTop: '4px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} id="is_active_check" />
              <label htmlFor="is_active_check" style={{ fontSize: '13px', cursor: 'pointer' }}>Item is available</label>
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {isSubmitting ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Item')}
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '12px' }}>Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px 8px 18px',
                    width: '100%',
                    background: isActive ? 'var(--accent-surface)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '0 8px 8px 0',
                    textAlign: 'left',
                    transition: 'var(--transition)'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {cat}
                  </span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {catCounts[cat]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink-3)' }}>
            {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {visibleItems.map(item => (
            <div key={item.item_id} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
              
              {/* Image Block */}
              <div style={{ paddingBottom: '100%', position: 'relative', background: 'var(--bg-start)' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon color="var(--text-muted)" size={32} opacity={0.5} />
                  </div>
                )}
              </div>

              {/* Info Detail */}
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, paddingRight: '12px' }}>{item.name}</div>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{formatCurrency(item.price)}</div>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex' }}>
                  <span className={`badge ${item.is_active ? 'badge-green' : 'badge-muted'}`} style={{ fontSize: '11px' }}>
                    {item.is_active ? 'Available' : 'Sold Out'}
                  </span>
                </div>
                
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => handleEditClick(item)} style={{ padding: '5px 12px', fontSize: '11px' }}>Edit</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</span>
                    <input 
                      type="checkbox" 
                      checked={item.is_active} 
                      onChange={() => handleToggleActive(item.item_id, item.is_active)} 
                      style={{ margin: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
                
                {editingItem?.item_id === item.item_id && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #F5ECEA', paddingTop: '12px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(item.item_id)} style={{ color: '#8B2E25', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                      Delete Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
