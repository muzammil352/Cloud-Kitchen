'use client'

import { useState } from 'react'
import { Customer } from '@/lib/types'
import { formatCurrency, formatDate, shortId, timeAgo } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { createClient } from '@/lib/supabase/client'

const getHashColor = (id: string) => {
  const charCode = id.charCodeAt(id.length - 1) || 0;
  const mod = charCode % 3;
  if (mod === 0) return { bg: 'var(--tag-purple)', text: '#5B3FD9' };
  if (mod === 1) return { bg: 'var(--tag-amber)', text: '#92620A' };
  return { bg: 'var(--accent-surface)', text: 'var(--accent)' };
}

const getInitials = (name: string) => {
  if (!name || name.trim() === '') return 'GS'; // Guest
  const parts = name.trim().split(' ');
  if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function CustomerBoard({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Sheet states
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [customerOrders, setCustomerOrders] = useState<any[]>([])

  const supabase = createClient()

  const sorted = [...initialCustomers].sort((a,b) => b.total_spend - a.total_spend)

  const openCustomerProfile = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsSheetOpen(true)
    setLoadingHistory(true)

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('customer_id', customer.customer_id)
      .order('created_at', { ascending: false })
      .limit(50)
      
    if (data) {
      setCustomerOrders(data)
    }
    setLoadingHistory(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>Customers</h1>
        <div></div> {/* Right: empty */}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <table style={{ minWidth: '800px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: '24px' }}>Customer Name</th>
              <th>Contact</th>
              <th style={{ textAlign: 'center' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Total Spend</th>
              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Last Order</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              sorted.map((c) => {
                const colors = getHashColor(c.customer_id);
                return (
                  <tr 
                    key={c.customer_id} 
                    onClick={() => openCustomerProfile(c)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-start)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '18px', 
                          backgroundColor: colors.bg, 
                          color: colors.text, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: 'var(--font-ui)'
                        }}>
                          {getInitials(c.name)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name || 'Guest'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)' }}>{c.phone}</div>
                      {c.email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="font-mono" style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-start)', border: '1px solid var(--border)', fontSize: '13px' }}>
                        {c.total_orders}
                      </span>
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {formatCurrency(c.total_spend)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', paddingRight: '24px' }}>
                      {timeAgo(c.last_order_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Record Overlay Sheet - Partially stripped for compatibility */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent style={{ width: '100%', maxWidth: '600px', overflowY: 'auto', padding: 0 }}>
          {selectedCustomer && (
            <>
              <SheetHeader style={{ padding: '32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-start)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '28px', 
                    backgroundColor: getHashColor(selectedCustomer.customer_id).bg, 
                    color: getHashColor(selectedCustomer.customer_id).text, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)'
                  }}>
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <SheetTitle style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>
                      {selectedCustomer.name || 'Guest'}
                    </SheetTitle>
                    <SheetDescription style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {selectedCustomer.phone} {selectedCustomer.email && `• ${selectedCustomer.email}`} <br/>
                      <span style={{ fontSize: '12px' }}>First seen {formatDate(selectedCustomer.first_order_at)}</span>
                    </SheetDescription>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
                     <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>Lifetime Value</div>
                     <div className="font-mono" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{formatCurrency(selectedCustomer.total_spend)}</div>
                   </div>
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
                     <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>Total Orders</div>
                     <div className="font-mono" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{selectedCustomer.total_orders}</div>
                   </div>
                </div>
              </SheetHeader>

              <div style={{ padding: '32px' }}>
                 <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '24px' }}>Recent Order History</h3>
                 
                 {loadingHistory ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     {[1,2,3].map(i => <div key={i} style={{ height: '100px', background: 'var(--bg-start)', borderRadius: '12px', opacity: 0.5 }}></div>)}
                   </div>
                 ) : (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     {customerOrders.length === 0 ? (
                       <div style={{ padding: '24px', background: 'var(--bg-start)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No orders found.</div>
                     ) : (
                       customerOrders.map(order => (
                         <div key={order.order_id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--surface)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                             <div>
                                <div className="font-mono" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>#{shortId(order.order_id)}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{formatDate(order.created_at)}</div>
                             </div>
                             <div className="font-mono" style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)' }}>{formatCurrency(order.total_amount)}</div>
                           </div>
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             {order.order_items?.map((item: any) => (
                               <div key={item.order_item_id} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                                 <div className="font-mono" style={{ background: 'var(--bg-start)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '6px', fontSize: '12px', marginRight: '12px', color: 'var(--text-muted)' }}>{item.quantity}x</div>
                                 <div style={{ color: 'var(--text-primary)' }}>{item.menu_items?.name || 'Item'}</div>
                               </div>
                             ))}
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
