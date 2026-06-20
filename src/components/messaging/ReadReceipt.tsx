import { Check, CheckCheck } from "lucide-react";

export function ReadReceipt({
  deliveredAt,
  readAt,
  className = "",
}: {
  deliveredAt: string | null;
  readAt: string | null;
  className?: string;
}) {
  if (readAt) {
    return <CheckCheck className={`h-3.5 w-3.5 text-sky-300 ${className}`} aria-label="Seen" />;
  }
  if (deliveredAt) {
    return <CheckCheck className={`h-3.5 w-3.5 opacity-70 ${className}`} aria-label="Delivered" />;
  }
  return <Check className={`h-3.5 w-3.5 opacity-70 ${className}`} aria-label="Sent" />;
}
