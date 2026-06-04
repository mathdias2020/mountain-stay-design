import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[14px] bg-white px-6 py-16 text-center"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <Icon size={64} color="#DDDCD9" strokeWidth={1.5} />
      <p style={{ fontSize: 15, color: "#5C5B57" }}>{title}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export default EmptyState;