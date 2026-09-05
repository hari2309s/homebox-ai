export interface UpcomingReminderLike {
  id: string;
  ownerId: string;
  assignedToUserId: string | null;
}

export interface NotificationGroup<T> {
  recipients: string[];
  reminders: T[];
}

/**
 * Groups reminders by *who should see the same message*, not one group per
 * recipient. An assigned reminder nudges just that person; an unassigned one
 * nudges the whole household with a single shared message (mirrors the
 * warranty notifier) — instead of generating one near-identical AI message
 * per household member, and instead of the previous bug where a reminder
 * could be marked notified as soon as any one of its several recipients
 * succeeded, silently starving the others.
 *
 * `recipientsByOwner` is pre-resolved (household membership needs a DB
 * round-trip) so this function itself stays pure and unit-testable.
 */
export function groupRemindersForNotification<T extends UpcomingReminderLike>(
  reminders: T[],
  recipientsByOwner: Map<string, string[]>,
): Map<string, NotificationGroup<T>> {
  const groups = new Map<string, NotificationGroup<T>>();

  for (const reminder of reminders) {
    const key = reminder.assignedToUserId ? `user:${reminder.assignedToUserId}` : `household:${reminder.ownerId}`;
    let group = groups.get(key);
    if (!group) {
      const recipients = reminder.assignedToUserId
        ? [reminder.assignedToUserId]
        : (recipientsByOwner.get(reminder.ownerId) ?? []);
      group = { recipients, reminders: [] };
      groups.set(key, group);
    }
    group.reminders.push(reminder);
  }

  return groups;
}
