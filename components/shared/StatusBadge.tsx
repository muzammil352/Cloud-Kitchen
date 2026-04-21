import { Badge } from "@/components/ui/badge"
import { OrderStatus } from "@/lib/types"

export function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending:          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
    confirmed:        "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
    preparing:        "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
    ready:            "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    dispatched:       "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50",
    out_for_delivery: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50",
    delivered:        "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    cancelled:        "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  }

  const labels: Record<OrderStatus, string> = {
    pending:          "Pending",
    confirmed:        "Confirmed",
    preparing:        "Preparing",
    ready:            "Ready",
    dispatched:       "Dispatched",
    out_for_delivery: "Out for Delivery",
    delivered:        "Delivered",
    cancelled:        "Cancelled",
  }

  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  )
}
