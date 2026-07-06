"use client";

interface StatusBadgeProps {
  status: "success" | "pending" | "error" | "info" | "warning";
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusClasses: Record<
    StatusBadgeProps["status"],
    { badge: string; dot: string }
  > = {
    success: {
      badge: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
      dot: "bg-[#22c55e]",
    },
    pending: {
      badge: "bg-[rgba(43,228,128,0.15)] text-[var(--accent)]",
      dot: "bg-[var(--accent)]",
    },
    error: {
      badge: "bg-[rgba(239,68,68,0.15)] text-[#ef4444]",
      dot: "bg-[#ef4444]",
    },
    info: {
      badge: "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]",
      dot: "bg-[#3b82f6]",
    },
    warning: {
      badge: "bg-[rgba(234,179,8,0.15)] text-[#eab308]",
      dot: "bg-[#eab308]",
    },
  };

  const classes = statusClasses[status];

  const displayLabel =
    label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${classes.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {displayLabel}
    </span>
  );
}
