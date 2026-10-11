import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "./types";

const STYLES: Record<EventStatus, ["default" | "secondary" | "destructive" | "outline", string]> = {
  PUBLISHED: ["default", "Published"],
  DRAFT: ["outline", "Draft"],
  CANCELLED: ["destructive", "Cancelled"],
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const [variant, label] = STYLES[status];
  return <Badge variant={variant}>{label}</Badge>;
}
