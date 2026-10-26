import { householdUserLabel, type HouseholdUser } from "../../../lib/household";

export interface Reminder {
  id: string;
  itemId: string | null;
  itemName: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  assignedToUserId: string | null;
  status: "pending" | "done";
}

export interface Item {
  id: string;
  name: string;
}

export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const ASSIGNEE_PALETTE = ["#3f6b45", "#b0643f", "#5b7fa6", "#c98bd9", "#e0a83e", "#4fb8b0"];
export const UNASSIGNED_COLOR = "#7c867f";

export function colorForAssignee(userId: string | null): string {
  if (!userId) return UNASSIGNED_COLOR;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return ASSIGNEE_PALETTE[hash % ASSIGNEE_PALETTE.length] ?? UNASSIGNED_COLOR;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const start = new Date(year, month, 1 - startDay);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function assigneeLabel(userId: string | null, householdUsers: HouseholdUser[]): string {
  if (!userId) return "Unassigned";
  const match = householdUsers.find((person) => person.userId === userId);
  if (!match) return "Someone";
  return householdUserLabel(match);
}

export function assigneeInitial(userId: string | null, householdUsers: HouseholdUser[]): string {
  const label = assigneeLabel(userId, householdUsers);
  return label.charAt(0).toUpperCase();
}

export function seasonLabel(month: number): string {
  if (month >= 2 && month <= 4) return "SPRING · NEW GROWTH";
  if (month >= 5 && month <= 7) return "SUMMER · FULL SUN";
  if (month >= 8 && month <= 10) return "AUTUMN · LEAF FALL";
  return "WINTER · DORMANT";
}
