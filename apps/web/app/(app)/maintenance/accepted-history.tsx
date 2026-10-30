import Link from "next/link";

import type { HouseholdUser } from "../../../lib/household";
import { assigneeInitial, assigneeLabel, colorForAssignee, toDateKey } from "../calendar/calendar-utils";

/** A reminder that was added from a maintenance suggestion. */
export interface AcceptedSuggestion {
  id: string;
  itemId: string | null;
  itemName: string | null;
  title: string;
  dueDate: string;
  assignedToUserId: string | null;
  acceptedBy: string | null;
  /** ISO timestamps. */
  acceptedAt: string;
  completedAt: string | null;
  status: "pending" | "done";
}

/** "Nov 12", or "Nov 12, 2025" outside the current year, from a `YYYY-MM-DD` key. */
function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: y === new Date().getFullYear() ? undefined : "numeric",
  }).format(new Date(y, m - 1, d));
}

function dayOf(iso: string): string {
  return shortDate(toDateKey(new Date(iso)));
}

function StatusChip({ entry }: { entry: AcceptedSuggestion }) {
  if (entry.status === "done") {
    return (
      <span className="flex-none whitespace-nowrap rounded-full bg-selected px-2 py-[3px] font-mono text-[10px] text-moss-ink">
        DONE{entry.completedAt ? ` · ${dayOf(entry.completedAt).toUpperCase()}` : ""}
      </span>
    );
  }
  const overdue = entry.dueDate < toDateKey(new Date());
  return (
    <span
      className={`flex-none whitespace-nowrap rounded-full px-2 py-[3px] font-mono text-[10px] ${overdue ? "bg-danger-soft text-danger-ink" : "bg-surface-soft text-body"}`}
    >
      {overdue ? "OVERDUE" : "DUE"} · {shortDate(entry.dueDate).toUpperCase()}
    </span>
  );
}

/** Newest-first list of accepted suggestions, with who's doing them and when. */
export function AcceptedHistory({
  entries,
  householdUsers,
  title = "ACCEPTED SUGGESTIONS",
}: {
  entries: AcceptedSuggestion[];
  householdUsers: HouseholdUser[];
  title?: string;
}) {
  return (
    <section aria-label="Accepted suggestions" className="rounded-[14px] border border-border bg-card">
      <div className="flex justify-between border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">
        <span>{title}</span>
        <span>{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="m-0 px-[14px] py-3 text-[13px] text-muted">
          Suggestions you add as reminders will show up here.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 border-b border-border/40 px-[14px] py-[11px] last:border-b-0"
            >
              <span
                title={assigneeLabel(entry.assignedToUserId, householdUsers)}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: colorForAssignee(entry.assignedToUserId) }}
              >
                {assigneeInitial(entry.assignedToUserId, householdUsers)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[14px] font-medium ${entry.status === "done" ? "text-muted line-through" : "text-ink"}`}
                >
                  {entry.title}
                </span>
                <span className="mt-px block text-[12px] leading-snug text-muted">
                  {entry.itemId && entry.itemName ? (
                    <Link href={`/items/${entry.itemId}`} className="text-body no-underline hover:underline">
                      {entry.itemName}
                    </Link>
                  ) : (
                    "Household"
                  )}
                  {" · "}
                  {assigneeLabel(entry.assignedToUserId, householdUsers)}
                  {" · "}accepted {dayOf(entry.acceptedAt)}
                  {entry.acceptedBy && entry.acceptedBy !== entry.assignedToUserId
                    ? ` by ${assigneeLabel(entry.acceptedBy, householdUsers)}`
                    : ""}
                </span>
              </span>
              <StatusChip entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
