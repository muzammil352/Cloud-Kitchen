'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Image as ImageIcon, Upload, X, Link } from 'lucide-react'

type RecipeRow = {
  recipe_id?: string
  ingredient_id: string
  name: string
  unit: string
  quantity_required: string
}

export function MenuBoard({ initialItems, kitchenId }: { initialItems: MenuItem[], kitchenId: string }) {
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const supabase = createClient()

  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    image_url: '',
    is_active: true,
  })

  // Image state
  const [imageFile, setImageFile]     = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recipe (BOM) state
  const [ingredients, setIngredients] = useState<{ ingredient_id: string; name: string; unit: string }[]>([])
  const [existingRecipes, setExistingRecipes] = useState<RecipeRow[]>([])
  const [pendingRecipes, setPendingRecipes] = useState<RecipeRow[]>([])
  const [newIngId, setNewIngId] = useState('')
  const [newQty, setNewQty] = useState('')

  // Revoke blob URL when it changes (prevent memory leaks)
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  // Fetch ingredients once on mount
  useEffect(() => {
    supabase
      .from('ingredients')
      .select('ingredient_id, name, unit')
      .eq('kitchen_id', kitchenId)
      .order('name')
      .then(({ data }) => { if (data) setIngredients(data) })
  }, [kitchenId])

  const resetForm = () => {
    setEditingItem(null)
    setFormData({ name: '', category: '', price: '', image_url: '', is_active: true })
    setImageFile(null)
    setImagePreview(null)
    setShowUrlInput(false)
    setUploadError(null)
    setExistingRecipes([])
    setPendingRecipes([])
    setNewIngId('')
    setNewQty('')
  }

  const handleEditClick = async (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      image_url: item.image_url || '',
      is_active: item.is_active,
    })
    setImageFile(null)
    setImagePreview(item.image_url || null)
    setShowUrlInput(false)
    setUploadError(null)
    setPendingRecipes([])
    setNewIngId('')
    setNewQty('')
    try {
      const { data } = await supabase
        .from('recipes')
        .select('recipe_id, ingredient_id, quantity_required, ingredients(name, unit)')
        .eq('menu_item_id', item.item_id)
      setExistingRecipes((data || []).map((r: any) => ({
        recipe_id: r.recipe_id,
        ingredient_id: r.ingredient_id,
        name: r.ingredients?.name || '',
        unit: r.ingredients?.unit || '',
        quantity_required: String(r.quantity_required),
      })))
    } catch {
      setExistingRecipes([])
    }
  }

  const handleAddRecipeRow = () => {
    if (!newIngId || !newQty) return
    const ing = ingredients.find(i => i.ingredient_id === newIngId)
    if (!ing) return
    setPendingRecipes(prev => [...prev, {
      ingredient_id: newIngId,
      name: ing.name,
      unit: ing.unit,
      quantity_required: newQty,
    }])
    setNewIngId('')
    setNewQty('')
  }

  const handleRemoveExistingRecipe = async (recipeId: string) => {
    await supabase.from('recipes').delete().eq('recipe_id', recipeId)
    setExistingRecipes(prev => prev.filter(r => r.recipe_id !== recipeId))
  }

  const handleRemovePendingRecipe = (idx: number) => {
    setPendingRecipes(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setFormData(p => ({ ...p, image_url: '' }))
    setUploadError(null)
    // Reset so re-selecting same file fires onChange
    e.target.value = ''
  }

  const clearImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setFormData(p => ({ ...p, image_url: '' }))
  }

  const handleToggleActive = async (itemId: string, currentActive: boolean) => {
    const nextState = !currentActive
    setItems(prev => prev.map(item => item.item_id === itemId ? { ...item, is_active: nextState } : item))
    const { error } = await supabase.from('menu_items').update({ is_active: nextState }).eq('item_id', itemId)
    if (error) {
      setItems(prev => prev.map(item => item.item_id === itemId ? { ...item, is_active: currentActive } : item))
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    const { error } = await supabase.from('menu_items').delete().eq('item_id', itemId)
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
    setUploadError(null)

    try {
      let finalImageUrl: string | null = formData.image_url || null

      if (imageFile) {
        const ext  = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${kitchenId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('menu-images')
          .upload(path, imageFile, { contentType: imageFile.type })
        if (uploadErr) throw new Error('Image upload failed: ' + uploadErr.message)
        const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path)
        finalImageUrl = urlData.publicUrl
      }

      const payload = {
        kitchen_id: kitchenId,
        name:       formData.name,
        category:   formData.category,
        price:      parseFloat(formData.price),
        image_url:  finalImageUrl,
        is_active:  formData.is_active,
      }

      if (editingItem) {
        const { data, error } = await supabase.from('menu_items').update(payload).eq('item_id', editingItem.item_id).select().single()
        if (error) throw error
        setItems(prev => prev.map(i => i.item_id === editingItem.item_id ? data as MenuItem : i))
        if (pendingRecipes.length > 0) {
          await supabase.from('recipes').insert(
            pendingRecipes.map(r => ({
              menu_item_id: editingItem.item_id,
              ingredient_id: r.ingredient_id,
              quantity_required: parseFloat(r.quantity_required),
            }))
          )
        }
      } else {
        const { data, error } = await supabase.from('menu_items').insert(payload).select().single()
        if (error) throw error
        setItems(prev => [...prev, data as MenuItem])
        if (pendingRecipes.length > 0) {
          await supabase.from('recipes').insert(
            pendingRecipes.map(r => ({
              menu_item_id: (data as MenuItem).item_id,
              ingredient_id: r.ingredient_id,
              quantity_required: parseFloat(r.quantity_required),
            }))
          )
        }
      }

      resetForm()
    } catch (err: any) {
      setUploadError(err.message ?? 'Failed to save menu item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const catSet = new Set<string>()
  const catCounts: Record<string, number> = { 'All': items.length }
  items.forEach(i => { catSet.add(i.category); catCounts[i.category] = (catCounts[i.category] || 0) + 1 })
  const categories  = ['All', ...Array.from(catSet).sort()]
  const visibleItems = selectedCategory === 'All' ? items : items.filter(i => i.category === selectedCategory)

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
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={{ marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category</label>
              <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required style={{ marginTop: '4px' }} placeholder="e.g. Burgers" />
            </div>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Price</label>
              <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* Image section */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Image</label>

              {/* Preview / drop zone */}
              <div
                onClick={() => !imagePreview && fileInputRef.current?.click()}
                style={{
                  marginTop: '8px',
                  border: imagePreview ? '1px solid var(--color-border)' : '2px dashed var(--color-border-mid)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  height: '140px',
                  background: 'var(--color-surface-2)',
                  cursor: imagePreview ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 150ms',
                }}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                    />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); clearImage() }}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', zIndex: 2,
                      }}
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--color-ink-3)' }}>
                    <Upload size={22} strokeWidth={1.5} />
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}>Click to upload photo</span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Action row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '100px',
                    border: '1px solid var(--color-border-mid)',
                    background: 'var(--color-surface)', color: 'var(--color-ink-2)',
                    fontSize: '12px', fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <Upload size={12} /> {imageFile ? 'Replace' : 'Upload photo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '100px',
                    border: `1px solid ${showUrlInput ? 'var(--color-accent)' : 'var(--color-border-mid)'}`,
                    background: showUrlInput ? 'var(--color-accent-bg)' : 'var(--color-surface)',
                    color: showUrlInput ? 'var(--color-accent)' : 'var(--color-ink-3)',
                    fontSize: '12px', fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <Link size={12} /> Paste URL
                </button>
              </div>

              {/* URL input (conditional) */}
              {showUrlInput && (
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={e => {
                    const url = e.target.value
                    setFormData(p => ({ ...p, image_url: url }))
                    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
                    setImageFile(null)
                    setImagePreview(url || null)
                  }}
                  placeholder="https://example.com/image.jpg"
                  style={{ marginTop: '8px' }}
                />
              )}

              {uploadError && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444' }}>{uploadError}</p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} id="is_active_check" />
              <label htmlFor="is_active_check" style={{ fontSize: '13px', cursor: 'pointer' }}>Item is available</label>
            </div>

            {/* Recipe (Bill of Materials) */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Recipe (Bill of Materials)
              </label>

              {ingredients.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontStyle: 'italic', margin: 0 }}>
                  No ingredients found — add them in Inventory first.
                </p>
              ) : (
                <>
                  {existingRecipes.map(row => (
                    <div key={row.recipe_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>{row.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-2)', whiteSpace: 'nowrap' }}>{row.quantity_required} {row.unit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingRecipe(row.recipe_id!)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-3)', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {pendingRecipes.map((row, idx) => (
                    <div key={`pending-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'var(--color-accent-bg)', borderRadius: '6px', border: '1px dashed var(--color-accent)' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>{row.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-2)', whiteSpace: 'nowrap' }}>{row.quantity_required} {row.unit}</span>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>new</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingRecipe(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-3)', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={newIngId}
                      onChange={e => setNewIngId(e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '13px', fontFamily: 'var(--font-body)', border: '1px solid var(--color-border-mid)', borderRadius: '6px', background: 'var(--color-surface)', color: newIngId ? 'var(--color-ink)' : 'var(--color-ink-3)', outline: 'none' }}
                    >
                      <option value="">Pick ingredient…</option>
                      {ingredients.map(ing => (
                        <option key={ing.ingredient_id} value={ing.ingredient_id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={newQty}
                      onChange={e => setNewQty(e.target.value)}
                      placeholder="Qty"
                      style={{ width: '68px', padding: '5px 8px', fontSize: '13px', fontFamily: 'var(--font-mono)', border: '1px solid var(--color-border-mid)', borderRadius: '6px', background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      disabled={!newIngId || !newQty}
                      style={{ height: '31px', padding: '0 12px', borderRadius: '6px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: (!newIngId || !newQty) ? 'not-allowed' : 'pointer', opacity: (!newIngId || !newQty) ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      + Add
                    </button>
                  </div>
                </>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', marginTop: '10px' }}>
              {isSubmitting ? (imageFile ? 'Uploading…' : 'Saving…') : (editingItem ? 'Save Changes' : 'Add Item')}
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '12px' }}>Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px 8px 18px', width: '100%',
                    background: isActive ? 'var(--accent-surface)' : 'transparent',
                    border: 'none', borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer', borderRadius: '0 8px 8px 0', textAlign: 'left', transition: 'var(--transition)',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{cat}</span>
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{catCounts[cat]}</span>
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
              <div style={{ paddingBottom: '100%', position: 'relative', background: 'var(--bg-start)' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon color="var(--text-muted)" size={32} opacity={0.5} />
                  </div>
                )}
              </div>

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
                  <button className="btn-outline" onClick={() => handleEditClick(item).catch(console.error)} style={{ padding: '5px 12px', fontSize: '11px' }}>Edit</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</span>
                    <input type="checkbox" checked={item.is_active} onChange={() => handleToggleActive(item.item_id, item.is_active)} style={{ margin: 0, cursor: 'pointer' }} />
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
