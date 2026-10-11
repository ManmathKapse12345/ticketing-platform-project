import { Badge } from "@/components/ui/badge";
import type { PayoutStatus } from "../types";

const STYLES: Record<PayoutStatus, ["default" | "secondary" | "outline", string]> = {
  REQUESTED: ["outline", "Requested"],
  PAID: ["default", "Paid"],
  CANCELLED: ["secondary", "Cancelled"],
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const [variant, label] = STYLES[status];
  return <Badge variant={variant}>{label}</Badge>;
}
