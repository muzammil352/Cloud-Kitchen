'use client'

import { MenuItem } from '@/lib/types'
import { useCart } from './CartContext'
import { formatCurrency } from '@/lib/utils'

export function MenuCard({ item }: { item: MenuItem }) {
  const { addToCart } = useCart()

  return (
    <div style={{ 
      background: 'var(--surface)', 
      border: '1px solid var(--border)', 
      borderRadius: 'var(--radius-card)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'var(--transition)'
    }}>
      <div style={{ aspectRatio: '16/9', width: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-start)', position: 'relative' }}>
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', margin: 0 }}>{item.name}</h3>
        
        {item.description && (
          <p style={{ 
            fontSize: '13px', 
            fontFamily: 'var(--font-ui)', 
            color: 'var(--text-muted)', 
            marginTop: '8px',
            marginBottom: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {item.description}
          </p>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '20px' }}>
          <span className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(item.price)}</span>
          <button 
            onClick={() => addToCart(item)}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  )
}
