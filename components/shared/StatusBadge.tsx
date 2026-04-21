import { Badge } from "@/components/ui/badge"
import { OrderStatus } from "@/lib/types"

export function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending:          "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100",
    confirmed:        "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
    preparing:        "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100",
    ready:            "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
    dispatched:       "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100",
    out_for_delivery: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100",
    delivered:        "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
    cancelled:        "bg-red-100 text-red-800 border-red-300 hover:bg-red-100",
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
