'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SettingsForm({ kitchen }: { kitchen: any }) {
  const [formData, setFormData] = useState({
    name: kitchen.name || '',
    phone: kitchen.phone || '',
    city: kitchen.city || '',
    slug: kitchen.slug || '',
    notify_channel: kitchen.settings?.notify_channel || 'email',
    delivery_radius_km: kitchen.settings?.delivery_radius_km || 5
  })
  const [slugError, setSlugError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccess(false)

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      setSlugError('Only lowercase letters, numbers, and hyphens allowed.')
      setIsSubmitting(false)
      return
    }

    // Critical constraint requirement: Merge existing settings safely dropping nothing!
    const updatedSettings = {
      ...kitchen.settings,
      notify_channel: formData.notify_channel,
      delivery_radius_km: parseFloat(formData.delivery_radius_km as any)
    }

    const { error } = await supabase
      .from('kitchens')
      .update({
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        slug: formData.slug || null,
        settings: updatedSettings
      })
      .eq('kitchen_id', kitchen.kitchen_id)

    setIsSubmitting(false)
    if (error) {
      alert("Failed to update settings: " + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        window.location.reload() // Reload to drop the global banner if newly completed natively
      }, 1500)
    }
  }

  return (
    <form id="profile-form" onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>Basic Profile</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>These details are visible to customers.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="name" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Kitchen Name</label>
          <input 
            id="name" 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Public Email</label>
          <input 
            id="email" 
            disabled 
            value={kitchen.email} 
            style={{ backgroundColor: 'var(--bg-start)', color: 'var(--text-muted)' }}
            title="Email changes require administrator approval"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="phone" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number <span style={{ color: 'var(--destructive)' }}>*</span></label>
            <input
              id="phone"
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              style={{ borderColor: !formData.phone ? '#F59E0B' : 'var(--border)' }}
              placeholder="e.g. 0300 1234567"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="city" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>City <span style={{ color: 'var(--destructive)' }}>*</span></label>
            <input
              id="city"
              required
              value={formData.city}
              onChange={e => setFormData({...formData, city: e.target.value})}
              style={{ borderColor: !formData.city ? '#F59E0B' : 'var(--border)' }}
              placeholder="e.g. Lahore"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="slug" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Your Store URL</label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${slugError ? '#dc2626' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: '9px 13px', backgroundColor: 'var(--bg-start)', color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'var(--font-ui)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              cloudkitchen.app/
            </span>
            <input
              id="slug"
              value={formData.slug}
              onChange={e => {
                const val = e.target.value
                setFormData({ ...formData, slug: val })
                if (val && !/^[a-z0-9-]+$/.test(val)) {
                  setSlugError('Only lowercase letters, numbers, and hyphens allowed.')
                } else {
                  setSlugError('')
                }
              }}
              placeholder="your-kitchen-name"
              style={{ flex: 1, border: 'none', borderRadius: 0, boxShadow: 'none', outline: 'none' }}
            />
          </div>
          {slugError && (
            <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{slugError}</p>
          )}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            This is the link you share with customers. Once set, changing it will break existing shared links.
          </p>
        </div>
      </section>

      <div style={{ height: '1px', width: '100%', backgroundColor: 'var(--border)' }} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>Operational Settings</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Manage how your kitchen operates internally.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
          <label htmlFor="delivery_radius_km" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Delivery Radius (km)</label>
          <input 
            id="delivery_radius_km" 
            type="number"
            min="1"
            max="50"
            required 
            value={formData.delivery_radius_km} 
            onChange={e => setFormData({...formData, delivery_radius_km: e.target.value})} 
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>System Notification Channel</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['email', 'whatsapp', 'both'].map((channel) => (
              <label 
                key={channel} 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer', 
                  padding: '16px', 
                  border: '1px solid', 
                  borderColor: formData.notify_channel === channel ? 'var(--accent)' : 'var(--border)', 
                  borderRadius: 'var(--radius-card)',
                  background: formData.notify_channel === channel ? 'var(--accent-surface)' : 'transparent',
                  transition: 'var(--transition)'
                }}
              >
                <input 
                  type="radio" 
                  name="notify_channel"
                  value={channel}
                  checked={formData.notify_channel === channel}
                  onChange={(e) => setFormData({...formData, notify_channel: e.target.value})}
                  style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{channel}</span>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select how you want to receive important system alerts (like AI reorder suggestions).</p>
        </div>
      </section>

      <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#10B981', transition: 'opacity 300ms', opacity: success ? 1 : 0 }}>
          Settings saved successfully!
        </p>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
