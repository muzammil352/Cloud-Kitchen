import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, shortId } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

export const revalidate = 0

// Calculate start of day in PKT
function getPKTStartOfDayISO() {
  const now = new Date()
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  
  const utcYear = pktTime.getUTCFullYear()
  const utcMonth = pktTime.getUTCMonth()
  const utcDate = pktTime.getUTCDate()
  
  // Start of day in PKT (00:00:00) is minus 5 hours in UTC
  const pktStartOfDayUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate, -5, 0, 0, 0))
  return pktStartOfDayUTC.toISOString()
}

export default async function DashboardOverview() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile) redirect('/login')

  const isOwner = profile.role === 'owner'
  const kitchenId = profile.kitchen_id
  const pktStartOfDay = getPKTStartOfDayISO()

  // 1. Fetch today's orders
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone), order_items(*, menu_items(name))')
    .eq('kitchen_id', kitchenId)
    .gte('created_at', pktStartOfDay)
    .order('created_at', { ascending: false })

  const orders = todayOrders || []
  
  const totalOrdersCount = orders.length
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total_amount, 0)

  // 2. Fetch pending approvals (Owner only)
  let pendingApprovalsCount = 0
  if (isOwner) {
    const { count } = await supabase
      .from('notifications_log')
      .select('*', { count: 'exact', head: true })
      .eq('kitchen_id', kitchenId)
      .eq('status', 'pending')
    pendingApprovalsCount = count || 0
  }

  // 3. Fetch low stock (unresolved low_stock notifications)
  const { count: lowStockCount } = await supabase
    .from('notifications_log')
    .select('*', { count: 'exact', head: true })
    .eq('kitchen_id', kitchenId)
    .eq('type', 'low_stock')
    .eq('status', 'pending') // status pending equates to unresolved in this schema
    
  const unresolvedLowStock = lowStockCount || 0

  const itemMap: Record<string, { name: string, quantity: number, revenue: number }> = {}
  orders.forEach(order => {
    if (order.status === 'cancelled') return
    order.order_items.forEach((oi: any) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 }
      itemMap[name].quantity += oi.quantity
      itemMap[name].revenue += (oi.quantity * oi.unit_price)
    })
  })
  
  const topSellingItems = Object.values(itemMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>Overview</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Today's Revenue</div>
          <div className="font-mono" style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isOwner ? formatCurrency(revenue) : '---'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)' }}>+5% from yesterday</div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Orders Today</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {totalOrdersCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)' }}>+2% from yesterday</div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Low Stock Items</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {unresolvedLowStock}
          </div>
          {unresolvedLowStock > 0 ? (
            <div style={{ fontSize: '12px', color: '#C0392B' }}>Action required</div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Inventory healthy</div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Pending Approvals</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isOwner ? pendingApprovalsCount : '-'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Awaiting review</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Left: Recent Orders */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>Recent Orders</h2>
            <a href="/dashboard/orders" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View all</a>
          </div>
          <div style={{ flex: 1 }}>
            {orders.length === 0 ? (
               <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No orders yet today.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((order) => (
                    <tr key={order.order_id}>
                      <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>#{shortId(order.order_id)}</td>
                      <td>{order.customers?.name || 'Guest'}</td>
                      <td className="font-mono">{isOwner ? formatCurrency(order.total_amount) : '---'}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Top Items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>Top Items Today</h2>
          </div>
          <div style={{ padding: '0 24px' }}>
             {topSellingItems.length === 0 ? (
               <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No items sold today.</div>
             ) : (
               topSellingItems.map((item, idx) => {
                 const maxVal = topSellingItems[0]?.quantity || 1;
                 const pct = (item.quantity / maxVal) * 100;
                 return (
                   <div key={idx} style={{ padding: '16px 0', borderBottom: idx < topSellingItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                       <div>
                         <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</div>
                         <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.quantity} orders</div>
                       </div>
                       {isOwner && <div className="font-mono" style={{ fontWeight: 500 }}>{formatCurrency(item.revenue)}</div>}
                     </div>
                     <div style={{ height: '3px', background: 'var(--border)', width: '100%', borderRadius: '100px' }}>
                       <div style={{ height: '100%', background: 'var(--accent)', width: `${pct}%`, borderRadius: '100px', transition: 'width 1s ease-out' }} />
                     </div>
                   </div>
                 )
               })
             )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Orders */}
      {(() => {
        const liveOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
        return (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>Live Orders</h2>
            </div>
            {liveOrders.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>No active orders right now.</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>New orders will appear here automatically.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Time Placed</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveOrders.map((order) => {
                    const timeString = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <tr key={order.order_id}>
                        <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>#{shortId(order.order_id)}</td>
                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{timeString}</td>
                        <td>{order.customers?.name || 'Guest'}</td>
                        <td className="font-mono">{isOwner ? formatCurrency(order.total_amount) : '---'}</td>
                        <td>
                          <span className={`badge ${order.status === 'preparing' ? 'badge-purple' : 'badge-amber'}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}

    </div>
  )
}
