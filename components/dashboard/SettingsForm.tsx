'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SettingsForm({ kitchen }: { kitchen: any }) {
  const [formData, setFormData] = useState({
    name: kitchen.name || '',
    phone: kitchen.phone || '',
    city: kitchen.city || '',
    slug: kitchen.slug || '',
    welcome_banner: kitchen.welcome_banner || '',
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
        welcome_banner: formData.welcome_banner || null,
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
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kitchen Profile</h3>
          <div style={{ height: '1px', background: 'var(--color-border)', marginTop: '8px' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="name" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Kitchen Name</label>
          <input 
            id="name" 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Public Email</label>
          <input
            id="email"
            disabled
            value={kitchen.email}
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)' }}
            title="Email changes require administrator approval"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="phone" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Phone <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input
              id="phone"
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              style={!formData.phone ? { borderColor: 'var(--color-amber)' } : undefined}
              placeholder="e.g. 0300 1234567"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="city" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>City <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input
              id="city"
              required
              value={formData.city}
              onChange={e => setFormData({...formData, city: e.target.value})}
              style={!formData.city ? { borderColor: 'var(--color-amber)' } : undefined}
              placeholder="e.g. Lahore"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="slug" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Your Store URL</label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${slugError ? 'var(--color-red)' : 'var(--color-border-mid)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: '9px 13px', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', fontSize: '14px', fontFamily: 'var(--font-body)', borderRight: '1px solid var(--color-border)', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
            <p style={{ fontSize: '12px', color: 'var(--color-red)', margin: 0 }}>{slugError}</p>
          )}
          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: 0 }}>
            This is the link you share with customers. Once set, changing it will break existing shared links.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="welcome_banner" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Storefront greeting</label>
          <input
            id="welcome_banner"
            value={formData.welcome_banner}
            onChange={e => setFormData({ ...formData, welcome_banner: e.target.value })}
            placeholder="Welcome to Burger Hub!"
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Shown as a hero greeting on your customer storefront. Defaults to "Welcome to {formData.name || 'your kitchen'}!" if left blank.
          </p>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notifications</h3>
          <div style={{ height: '1px', background: 'var(--color-border)', marginTop: '8px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
          <label htmlFor="delivery_radius_km" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Delivery Radius (km)</label>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Notification Channel</label>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-border-mid)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[
              { value: 'email', label: 'Email only' },
              { value: 'whatsapp', label: 'WhatsApp only' },
              { value: 'both', label: 'Both' },
            ].map((opt, i, arr) => {
              const isActive = formData.notify_channel === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, notify_channel: opt.value })}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid var(--color-border-mid)' : 'none',
                    background: isActive ? 'var(--color-accent)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--color-ink-2)',
                    transition: 'background 150ms ease, color 150ms ease',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>How you receive important alerts like AI reorder suggestions.</p>
        </div>
      </section>

      <div style={{ paddingTop: '24px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-green)', transition: 'opacity 300ms', opacity: success ? 1 : 0 }}>
          Settings saved.
        </p>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
