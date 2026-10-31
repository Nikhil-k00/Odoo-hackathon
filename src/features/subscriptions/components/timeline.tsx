import { formatDate } from "@/lib/dates";

type Log = { id: string; action: string; details: string | null; createdAt: Date };

/** Vertical audit timeline for one subscription. */
export function Timeline({ logs }: { logs: Log[] }) {
  if (logs.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="relative ml-2 border-l pl-6">
      {logs.map((log) => (
        <li key={log.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm font-medium">{log.action.replace("STATUS_", "Status → ").replace("_", " ")}</p>
          {log.details && <p className="text-sm text-muted-foreground">{log.details}</p>}
          <p className="text-xs text-muted-foreground">
            {formatDate(log.createdAt)} · {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </li>
      ))}
    </ol>
  );
}
