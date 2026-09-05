import { describe, expect, it } from "vitest";

import { groupRemindersForNotification, type UpcomingReminderLike } from "./reminder-notification-groups";

function reminder(overrides: Partial<UpcomingReminderLike> & Pick<UpcomingReminderLike, "id">): UpcomingReminderLike {
  return { ownerId: "owner-1", assignedToUserId: null, ...overrides };
}

describe("groupRemindersForNotification", () => {
  it("groups an assigned reminder into a single-recipient group keyed to that user", () => {
    const groups = groupRemindersForNotification([reminder({ id: "r1", assignedToUserId: "assignee-1" })], new Map());
    expect(groups.size).toBe(1);
    const group = groups.get("user:assignee-1");
    expect(group?.recipients).toEqual(["assignee-1"]);
    expect(group?.reminders.map((r) => r.id)).toEqual(["r1"]);
  });

  it("groups every unassigned reminder for the same owner into one shared household group", () => {
    const recipientsByOwner = new Map([["owner-1", ["alice", "bob"]]]);
    const groups = groupRemindersForNotification([reminder({ id: "r1" }), reminder({ id: "r2" })], recipientsByOwner);
    expect(groups.size).toBe(1);
    const group = groups.get("household:owner-1");
    expect(group?.recipients).toEqual(["alice", "bob"]);
    // One shared message covers both reminders instead of generating one per recipient.
    expect(group?.reminders.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("keeps assigned and unassigned reminders for the same owner in separate groups", () => {
    const recipientsByOwner = new Map([["owner-1", ["alice", "bob"]]]);
    const groups = groupRemindersForNotification(
      [reminder({ id: "unassigned" }), reminder({ id: "assigned", assignedToUserId: "alice" })],
      recipientsByOwner,
    );
    expect(groups.size).toBe(2);
    expect(groups.get("household:owner-1")?.reminders.map((r) => r.id)).toEqual(["unassigned"]);
    expect(groups.get("user:alice")?.reminders.map((r) => r.id)).toEqual(["assigned"]);
  });

  it("keeps different owners' unassigned reminders in separate groups even with overlapping recipients", () => {
    const recipientsByOwner = new Map([
      ["owner-1", ["alice"]],
      ["owner-2", ["alice"]],
    ]);
    const groups = groupRemindersForNotification(
      [reminder({ id: "r1", ownerId: "owner-1" }), reminder({ id: "r2", ownerId: "owner-2" })],
      recipientsByOwner,
    );
    expect(groups.size).toBe(2);
  });

  it("falls back to no recipients for an owner missing from the pre-resolved map, instead of throwing", () => {
    const groups = groupRemindersForNotification([reminder({ id: "r1" })], new Map());
    expect(groups.get("household:owner-1")?.recipients).toEqual([]);
  });
});
