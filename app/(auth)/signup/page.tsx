'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [kitchenName, setKitchenName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    const user = data.user
    if (!user) {
      setError('Signup failed. Please try again.')
      setIsLoading(false)
      return
    }

    const { data: kitchen, error: kitchenError } = await supabase
      .from('kitchens')
      .insert({
        owner_user_id: user.id,
        name: kitchenName,
        email: email,
        settings: { notify_channel: 'email' },
      })
      .select('kitchen_id')
      .single()

    if (kitchenError) {
      setError('Account created but kitchen setup failed. Please contact support.')
      setIsLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        kitchen_id: kitchen.kitchen_id,
        role: 'owner',
        name: `${firstName} ${lastName}`.trim(),
      })

    if (profileError) {
      setError('Account created but profile setup failed. Please contact support.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' }
    if (pass.length < 6) return { score: 1, label: 'Weak', color: 'var(--color-red)' }
    if (pass.length < 9) return { score: 2, label: 'Fair', color: 'var(--color-amber)' }
    if (pass.length >= 9 && (!/\d/.test(pass) || !/[a-zA-Z]/.test(pass))) return { score: 3, label: 'Good', color: 'var(--color-accent)' }
    return { score: 4, label: 'Strong', color: 'var(--color-green)' }
  }
  const strength = getPasswordStrength(password)

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* SVG noise grain */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.025 }} aria-hidden="true">
        <filter id="grain-signup">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-signup)"/>
      </svg>

      {/* Logo wordmark — above card */}
      <div style={{ marginBottom: '32px', zIndex: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '22px', color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>Kitchen</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '22px', color: 'var(--color-accent)', letterSpacing: '-0.01em' }}>OS</span>
      </div>

      {/* Auth card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: '36px',
        zIndex: 1,
      }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', marginBottom: '6px' }}>
          Set up your kitchen
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '28px' }}>
          Create your account to get started.
        </p>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
              Kitchen Name
            </label>
            <input
              type="text"
              value={kitchenName}
              onChange={e => setKitchenName(e.target.value)}
              placeholder="Karachi Bites"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Ali"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Khan"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@kitchen.com"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-ink-3)' }}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {/* Password strength bar */}
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ flex: 1, display: 'flex', gap: '3px' }}>
                  {[1, 2, 3, 4].map(n => (
                    <div
                      key={n}
                      style={{
                        height: '3px',
                        flex: 1,
                        borderRadius: '2px',
                        backgroundColor: n <= strength.score ? strength.color : 'var(--color-border-mid)',
                        transition: 'background-color var(--transition)',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '13px', color: strength.color, fontFamily: 'var(--font-body)', minWidth: '40px', textAlign: 'right' }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink-2)' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-ink-3)' }}
              >
                {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Error — above submit */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              backgroundColor: 'var(--color-red-bg)',
              borderLeft: '4px solid var(--color-red)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              animation: 'fadeIn 150ms ease',
            }}>
              <AlertCircle size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--color-red)' }} />
              <span style={{ fontSize: '13px', color: 'var(--color-red)' }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ width: '100%', height: '44px', fontSize: '14px', marginTop: '4px' }}
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', textAlign: 'center', marginTop: '16px' }}>
          By creating an account, you agree to our{' '}
          <span style={{ color: 'var(--color-accent)', cursor: 'pointer' }}>Terms of Service</span>.
        </p>
      </div>

      {/* Footer link — below card */}
      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--color-ink-3)', zIndex: 1, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
