import { CartProvider } from '@/components/customer/CartContext'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  )
}
