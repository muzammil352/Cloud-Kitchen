'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

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
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', margin: '0 auto' }}>
        
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
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          Sign in to your kitchen dashboard.
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="email" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="password" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password"
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
                {showPassword ? (
                  <EyeOff size={16} color="var(--text-muted)" strokeWidth={1.5} />
                ) : (
                  <Eye size={16} color="var(--text-muted)" strokeWidth={1.5} />
                )}
              </button>
            </div>
            
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <Link href="#" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
            style={{ width: '100%', height: '46px', fontSize: '15px', fontWeight: 600, marginTop: '10px' }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

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
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>
        
      </div>
    </div>
  )
}
