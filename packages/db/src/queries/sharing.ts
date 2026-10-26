import { and, eq, isNull, sql } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { getDb } from "../client";
import { reminders, sharedAccess, sharedAccessInvites } from "../schema";
import { withRLS } from "../rls";

export interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Fetches display name and avatar URL from `auth.users.raw_user_meta_data` for
 * a batch of user IDs. Uses the direct (non-RLS) connection because `auth.users`
 * is outside the RLS boundary. Returns a map of userId → UserProfile.
 */
export async function getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  if (userIds.length === 0) return new Map();
  const db = getDb();
  const idList = sql.join(
    userIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const rows = await db.execute<{ id: string; name: string | null; avatar_url: string | null }>(
    sql`SELECT id, raw_user_meta_data->>'full_name' AS name, raw_user_meta_data->>'avatar_url' AS avatar_url FROM auth.users WHERE id IN (${idList})`,
  );
  return new Map(rows.map((row) => [row.id, { name: row.name ?? null, avatarUrl: row.avatar_url ?? null }]));
}

// auth.users.email is a real column, but it's deliberately not declared on
// the `authUsers` Drizzle table (see schema.ts) — drizzle-kit would then try
// to manage/diff it as if we owned that table, which risks generating an
// ALTER TABLE against Supabase's real auth schema. Read-only raw SQL here
// avoids that entirely. Uses the direct (non-RLS) connection, like
// getUserProfiles — the RLS transaction's role has no grant on auth.users.
async function emailsFor(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const db = getDb();
  const idList = sql.join(
    userIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const rows = await db.execute<{ id: string; email: string | null }>(
    sql`SELECT id, email FROM auth.users WHERE id IN (${idList})`,
  );
  return new Map(rows.map((row) => [row.id, row.email ?? null]));
}

/** Trims a free-text relationship ("Partner", "Daughter", …) to something safe to store, or null when blank. */
export function cleanRelationship(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  return trimmed || null;
}

export function createInvite(userId: string, relationship?: string | null, expiresInDays = 7) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    if (ownerId !== userId) {
      throw new Error("You're currently sharing someone else's inventory — leave it before inviting your own members.");
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const [invite] = await tx
      .insert(sharedAccessInvites)
      .values({ ownerId, token, expiresAt, relationship: cleanRelationship(relationship) })
      .returning();
    return invite;
  });
}

export function listPendingInvites(userId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select()
      .from(sharedAccessInvites)
      .where(and(eq(sharedAccessInvites.ownerId, userId), isNull(sharedAccessInvites.acceptedAt))),
  );
}

export function revokeInvite(userId: string, inviteId: string) {
  return withRLS(userId, (tx) =>
    tx
      .delete(sharedAccessInvites)
      .where(and(eq(sharedAccessInvites.id, inviteId), eq(sharedAccessInvites.ownerId, userId))),
  );
}

export interface ShareStatus {
  /** "owner": this account anchors the household (possibly solo). "member": sharing someone else's data instead. */
  role: "owner" | "member";
  ownerEmail?: string | null;
  ownerName?: string | null;
  /** For a member: how the owner described them. */
  relationship?: string | null;
  members: { userId: string; email: string | null; name: string | null; relationship: string | null }[];
}

export function getShareStatus(userId: string): Promise<ShareStatus> {
  return withRLS(userId, async (tx) => {
    const [membership] = await tx.select().from(sharedAccess).where(eq(sharedAccess.memberUserId, userId));
    if (membership) {
      // auth.users reads need the direct (non-RLS) connection — the RLS
      // transaction's role has no grant on that table (see emailsFor above).
      const [ownerEmails, ownerProfiles] = await Promise.all([
        emailsFor([membership.ownerId]),
        getUserProfiles([membership.ownerId]),
      ]);
      return {
        role: "member",
        ownerEmail: ownerEmails.get(membership.ownerId) ?? null,
        ownerName: ownerProfiles.get(membership.ownerId)?.name?.trim() || null,
        relationship: membership.relationship,
        members: [],
      };
    }

    const memberRows = await tx.select().from(sharedAccess).where(eq(sharedAccess.ownerId, userId));
    const ids = memberRows.map((row) => row.memberUserId);
    const [emails, profiles] = await Promise.all([emailsFor(ids), getUserProfiles(ids)]);
    const members = memberRows.map((row) => ({
      userId: row.memberUserId,
      email: emails.get(row.memberUserId) ?? null,
      name: profiles.get(row.memberUserId)?.name ?? null,
      relationship: row.relationship,
    }));
    return { role: "owner", members };
  });
}

export interface HouseholdUser {
  userId: string;
  email: string | null;
  /** Display name from the account (set at sign-up or in Settings › Profile). */
  name: string | null;
  isSelf: boolean;
  /** How this member is related to the owner; null for the owner and for members without one. */
  relationship: string | null;
}

/**
 * Everyone with access to the caller's household — the effective owner plus
 * every shared member — regardless of whether the caller themselves is the
 * owner or a member. Unlike getShareStatus (which only lists members when
 * called *by* the owner), this is symmetric, so it works as an assignee
 * picker for any household participant.
 */
export function listHouseholdUsers(userId: string): Promise<HouseholdUser[]> {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const memberRows = await tx.select().from(sharedAccess).where(eq(sharedAccess.ownerId, ownerId));
    const ids = [ownerId, ...memberRows.map((row) => row.memberUserId)];
    const relationships = new Map(memberRows.map((row) => [row.memberUserId, row.relationship]));
    // auth.users reads need the direct (non-RLS) connection — the RLS
    // transaction's role has no grant on that table (see emailsFor above).
    const [emails, profiles] = await Promise.all([emailsFor(ids), getUserProfiles(ids)]);
    return ids.map((id) => ({
      userId: id,
      email: emails.get(id) ?? null,
      name: profiles.get(id)?.name?.trim() || null,
      isSelf: id === userId,
      relationship: relationships.get(id) ?? null,
    }));
  });
}

/**
 * Removing a member's shared_access row doesn't by itself unassign the
 * reminders they were handed — without also clearing those, the next
 * reminder-check cron run still resolves them as a recipient and nudges them
 * in chat about a household they no longer have access to.
 */
export function removeMember(userId: string, memberUserId: string) {
  return withRLS(userId, async (tx) => {
    await tx
      .delete(sharedAccess)
      .where(and(eq(sharedAccess.ownerId, userId), eq(sharedAccess.memberUserId, memberUserId)));
    await tx
      .update(reminders)
      .set({ assignedToUserId: null })
      .where(and(eq(reminders.ownerId, userId), eq(reminders.assignedToUserId, memberUserId)));
  });
}

/**
 * shared_access has no UPDATE RLS policy (one broad enough for this would also let an owner rewrite
 * member_user_id), so this uses the direct connection with the ownership check in the WHERE clause —
 * userId always comes from the server-side session, never from the client.
 */
export async function setMemberRelationship(userId: string, memberUserId: string, relationship: string | null) {
  const db = getDb();
  const updated = await db
    .update(sharedAccess)
    .set({ relationship: cleanRelationship(relationship) })
    .where(and(eq(sharedAccess.ownerId, userId), eq(sharedAccess.memberUserId, memberUserId)))
    .returning();
  if (updated.length === 0) throw new Error("Only the household owner can change that.");
}

export function leaveSharedHousehold(userId: string) {
  return withRLS(userId, async (tx) => {
    const [membership] = await tx.select().from(sharedAccess).where(eq(sharedAccess.memberUserId, userId));
    await tx.delete(sharedAccess).where(eq(sharedAccess.memberUserId, userId));
    // Same stale-assignment cleanup as removeMember, from the leaving member's side.
    if (membership) {
      await tx
        .update(reminders)
        .set({ assignedToUserId: null })
        .where(and(eq(reminders.ownerId, membership.ownerId), eq(reminders.assignedToUserId, userId)));
    }
  });
}

export interface InvitePreview {
  ownerEmail: string | null;
  ownerName: string | null;
  relationship: string | null;
  expired: boolean;
  alreadyAccepted: boolean;
}

/**
 * Read-only lookup for the /join/[token] page to show "you've been invited
 * by X" before the accepting user commits — same privileged, non-RLS
 * connection as acceptInvite below, since the viewer isn't the invite's
 * owner and RLS would otherwise hide it from them entirely.
 */
export async function getInviteByToken(token: string): Promise<InvitePreview | null> {
  const db = getDb();
  const [invite] = await db.select().from(sharedAccessInvites).where(eq(sharedAccessInvites.token, token));
  if (!invite) return null;

  const ownerRows = await db.execute<{ email: string | null; name: string | null }>(
    sql`select email, raw_user_meta_data->>'full_name' as name from auth.users where id = ${invite.ownerId}`,
  );
  return {
    ownerEmail: ownerRows[0]?.email ?? null,
    ownerName: ownerRows[0]?.name ?? null,
    relationship: invite.relationship,
    expired: invite.expiresAt.getTime() < Date.now(),
    alreadyAccepted: invite.acceptedAt != null,
  };
}

/**
 * Accepting an invite necessarily crosses from the inviter's data into the
 * accepting user's account, so it can't run inside a single user's RLS
 * context the way every other query here does. Uses the direct (table-owner)
 * DB connection instead — the same one migrations run through — since this
 * is the one operation in the app that's inherently cross-account.
 */
export async function acceptInvite(token: string, acceptingUserId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    // Row lock: without it, two concurrent accepts of the same token (e.g. a
    // double-tap, or the link opened in two tabs) can both read acceptedAt as
    // still null before either commits its UPDATE, letting one invite create
    // two shared_access rows instead of being rejected the second time.
    const [invite] = await tx
      .select()
      .from(sharedAccessInvites)
      .where(eq(sharedAccessInvites.token, token))
      .for("update");
    if (!invite) throw new Error("This invite link is invalid.");
    if (invite.acceptedAt) throw new Error("This invite has already been used.");
    if (invite.expiresAt.getTime() < Date.now()) throw new Error("This invite has expired.");
    if (invite.ownerId === acceptingUserId) throw new Error("You can't accept your own invite.");

    const existingMembers = await tx.select().from(sharedAccess).where(eq(sharedAccess.ownerId, acceptingUserId));
    if (existingMembers.length > 0) {
      throw new Error("You can't join another household while people are sharing your own data — remove them first.");
    }

    // Replace any existing membership — a user can only share one other
    // owner's data at a time — rather than erroring on the primary key.
    await tx.delete(sharedAccess).where(eq(sharedAccess.memberUserId, acceptingUserId));
    await tx
      .insert(sharedAccess)
      .values({ memberUserId: acceptingUserId, ownerId: invite.ownerId, relationship: invite.relationship });
    await tx
      .update(sharedAccessInvites)
      .set({ acceptedAt: new Date(), acceptedByUserId: acceptingUserId })
      .where(eq(sharedAccessInvites.id, invite.id));

    const ownerEmailRows = await tx.execute<{ email: string | null }>(
      sql`select email from auth.users where id = ${invite.ownerId}`,
    );
    return { ownerId: invite.ownerId, ownerEmail: ownerEmailRows[0]?.email ?? null };
  });
}
