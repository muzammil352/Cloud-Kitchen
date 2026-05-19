'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SettingsForm({ kitchen }: { kitchen: any }) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initial = {
    name:               kitchen.name              || '',
    phone:              kitchen.phone             || '',
    city:               kitchen.city              || '',
    slug:               kitchen.slug              || '',
    welcome_banner:     kitchen.welcome_banner    || '',
    notify_channel:     'email',
    delivery_radius_km: kitchen.settings?.delivery_radius_km ?? 5,
    avatar_url:         kitchen.avatar_url        || '',
  }

  const [formData,     setFormData]     = useState(initial)
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [slugError,    setSlugError]    = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigning,    setIsSigning]    = useState(false)
  const [success,      setSuccess]      = useState(false)

  // Dirty detection — compare current formData with initial values
  const isDirty = avatarFile !== null || Object.keys(initial).some(
    k => String(formData[k as keyof typeof formData]) !== String(initial[k as keyof typeof initial])
  )

  // Revoke blob URL on unmount or file change
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDirty) return
    setIsSubmitting(true)
    setSuccess(false)

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      setSlugError('Only lowercase letters, numbers, and hyphens allowed.')
      setIsSubmitting(false)
      return
    }

    let avatarUrl = formData.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${kitchen.kitchen_id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('kitchen-avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        alert('Failed to upload avatar: ' + uploadError.message)
        setIsSubmitting(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('kitchen-avatars')
        .getPublicUrl(path)
      avatarUrl = publicUrl
    }

    const updatedSettings = {
      ...kitchen.settings,
      notify_channel:     formData.notify_channel,
      delivery_radius_km: parseFloat(formData.delivery_radius_km as any),
    }

    const { error } = await supabase
      .from('kitchens')
      .update({
        name:           formData.name,
        phone:          formData.phone,
        city:           formData.city,
        slug:           formData.slug || null,
        welcome_banner: formData.welcome_banner || null,
        avatar_url:     avatarUrl || null,
        settings:       updatedSettings,
      })
      .eq('kitchen_id', kitchen.kitchen_id)

    setIsSubmitting(false)
    if (error) {
      alert('Failed to update settings: ' + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 1200)
    }
  }

  const handleSignOut = async () => {
    setIsSigning(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatarSrc = avatarPreview || formData.avatar_url || null
  const initials = (kitchen.name || kitchen.email || 'K')
    .split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()

  return (
    <form id="settings-form" onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Kitchen Profile ─────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kitchen Profile</h3>
          <div style={{ height: '1px', background: 'var(--color-border)', marginTop: '8px' }} />
        </div>

        {/* Profile picture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
            background: avatarSrc ? 'transparent' : 'var(--color-accent-bg)',
            border: '2px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="Kitchen avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '24px', color: 'var(--color-accent)' }}>{initials}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '13px', padding: '7px 16px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarSrc ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarSrc && (
              <button
                type="button"
                style={{ fontSize: '12px', color: 'var(--color-ink-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                onClick={() => {
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  setFormData(d => ({ ...d, avatar_url: '' }))
                }}
              >
                Remove photo
              </button>
            )}
            <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: 0 }}>JPG, PNG or WebP · Max 2 MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="name" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Kitchen Name</label>
          <input id="name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Public Email</label>
          <input id="email" disabled value={kitchen.email} style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="phone" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Phone <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input id="phone" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={!formData.phone ? { borderColor: 'var(--color-amber)' } : undefined} placeholder="e.g. 0300 1234567" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="city" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>City <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input id="city" required value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} style={!formData.city ? { borderColor: 'var(--color-amber)' } : undefined} placeholder="e.g. Lahore" />
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
                setSlugError(val && !/^[a-z0-9-]+$/.test(val) ? 'Only lowercase letters, numbers, and hyphens allowed.' : '')
              }}
              placeholder="your-kitchen-name"
              style={{ flex: 1, border: 'none', borderRadius: 0, boxShadow: 'none', outline: 'none' }}
            />
          </div>
          {slugError && <p style={{ fontSize: '12px', color: 'var(--color-red)', margin: 0 }}>{slugError}</p>}
          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: 0 }}>Once set, changing it will break existing shared links.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="welcome_banner" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-2)' }}>Storefront greeting</label>
          <input id="welcome_banner" value={formData.welcome_banner} onChange={e => setFormData({ ...formData, welcome_banner: e.target.value })} placeholder="Welcome to Burger Hub!" />
          <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: 0 }}>Shown as a hero greeting on your customer storefront.</p>
        </div>
      </section>


      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{ paddingTop: '24px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigning}
          style={{
            padding: '9px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
            background: 'transparent', color: 'var(--color-red)', fontSize: '14px', fontWeight: 500,
            fontFamily: 'var(--font-body)', cursor: isSigning ? 'wait' : 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-red-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {isSigning ? 'Signing out...' : 'Sign Out'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-green)', transition: 'opacity 300ms', opacity: success ? 1 : 0, margin: 0 }}>
            Settings saved.
          </p>
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="btn-primary"
            style={{ opacity: isDirty ? 1 : 0.4, cursor: isDirty ? 'pointer' : 'not-allowed', transition: 'opacity 200ms' }}
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </form>
  )
}
