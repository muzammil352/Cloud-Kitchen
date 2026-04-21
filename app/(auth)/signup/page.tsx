'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

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
      setError("Passwords do not match")
      return;
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
    if (!pass) return { score: 0, label: '', color: '' };
    if (pass.length < 6) return { score: 1, label: 'Weak', color: '#C0392B' };
    if (pass.length < 9) return { score: 2, label: 'Fair', color: '#D4860A' };
    if (pass.length >= 9 && (!/\d/.test(pass) || !/[a-zA-Z]/.test(pass))) return { score: 3, label: 'Good', color: 'var(--accent)' };
    return { score: 4, label: 'Strong', color: 'var(--accent)' };
  }
  const strength = getPasswordStrength(password);

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw', 
      background: 'linear-gradient(135deg, var(--bg-start), var(--bg-end))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '40px', margin: '0 auto' }}>
        
        {/* Logo Mark */}
        <div style={{ 
          width: '42px', 
          height: '42px', 
          borderRadius: '10px', 
          backgroundColor: 'var(--bg-start)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>CK</span>
        </div>

        {/* Header */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Set up your kitchen
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          Create your account to get started.
        </p>

        {/* Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Kitchen Name</label>
            <input
              type="text"
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {showPassword ? <EyeOff size={16} color="var(--text-muted)" strokeWidth={1.5} /> : <Eye size={16} color="var(--text-muted)" strokeWidth={1.5} />}
              </button>
            </div>
            {/* Strength Bar */}
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4].map((num) => (
                    <div 
                      key={num} 
                      style={{ 
                        height: '4px', 
                        flex: 1, 
                        backgroundColor: num <= strength.score ? strength.color : 'var(--border)', 
                        borderRadius: '2px',
                        transition: 'background-color var(--transition)'
                      }} 
                    />
                  ))}
                </div>
                <span style={{ fontSize: '12px', color: strength.color, fontWeight: 500, minWidth: '40px', textAlign: 'right' }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {showConfirmPassword ? <EyeOff size={16} color="var(--text-muted)" strokeWidth={1.5} /> : <Eye size={16} color="var(--text-muted)" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
            style={{ width: '100%', height: '46px', fontSize: '15px', fontWeight: 600, marginTop: '20px' }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
          By creating an account, you agree to our <span style={{ color: 'var(--accent)' }}>Terms of Service</span>.
        </div>

        {error && (
          <div style={{ 
            marginTop: '16px',
            backgroundColor: '#F5ECEA', 
            borderRadius: '8px', 
            padding: '10px 14px', 
            fontSize: '13px', 
            color: '#8B2E25', 
            borderLeft: '3px solid #C0392B' 
          }}>
            {error}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
        
      </div>
    </div>
  )
}
