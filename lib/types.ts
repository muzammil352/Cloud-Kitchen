export type Kitchen = {
  kitchen_id: string
  owner_user_id: string
  name: string
  phone: string | null
  email: string
  city: string | null
  created_at: string
  settings: {
    notify_channel: 'email' | 'whatsapp' | 'both'
    theme_color?: string
    delivery_radius_km?: number
  }
}

export type Profile = {
  user_id: string
  kitchen_id: string
  role: 'owner' | 'employee' | 'customer'
  name: string
  phone: string | null
}

export type Customer = {
  customer_id: string
  kitchen_id: string
  name: string
  email: string
  phone: string
  total_orders: number
  total_spend: number
  first_order_at: string
  last_order_at: string
}

export type MenuItem = {
  item_id: string
  kitchen_id: string
  name: string
  description: string | null
  category: string
  price: number
  is_active: boolean
  image_url: string | null
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type Order = {
  order_id: string
  kitchen_id: string
  customer_id: string
  status: OrderStatus
  total_amount: number
  delivery_address: string
  notes: string | null
  created_at: string
  updated_at: string
  customers?: Customer
  order_items?: OrderItemWithMenu[]
}

export type OrderItem = {
  order_item_id: string
  order_id: string
  item_id: string
  quantity: number
  unit_price: number
}

export type OrderItemWithMenu = OrderItem & {
  menu_items: { name: string }
}

export type NotificationLog = {
  notification_id: string
  kitchen_id: string
  type: 'low_stock' | 'supplier_message' | 'menu_disable' | 'win_back' | 'upsell'
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed'
  approval_token: string
  created_at: string
  resolved_at: string | null
}

export type Feedback = {
  feedback_id: string
  kitchen_id: string
  order_id: string
  customer_id: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
}

export type Ingredient = {
  ingredient_id: string
  kitchen_id: string
  name: string
  current_stock: number
  reorder_level: number | null
  unit: string
  created_at: string
}

export type StockLog = {
  log_id: string
  kitchen_id: string
  ingredient_id: string
  change_amount: number
  reason: string | null
  logged_by: string
  created_at: string
}
