import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export const formatCurrency = (amount: number): string =>
  `Rs. ${amount.toLocaleString('en-PK')}`

// Format date
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

// Time ago
export const timeAgo = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Short order ID (display only)
export const shortId = (uuid: string): string => uuid.slice(0, 8).toUpperCase()

// Normalize Pakistani phone to WhatsApp format
export const normalizePhone = (phone: string): string =>
  phone.replace(/[^0-9]/g, '').replace(/^0/, '92')
