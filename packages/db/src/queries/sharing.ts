import { and, eq, isNull, sql } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { getDb } from "../client";
import { sharedAccess, sharedAccessInvites } from "../schema";
import { withRLS, type Tx } from "../rls";

// auth.users.email is a real column, but it's deliberately not declared on
// the `authUsers` Drizzle table (see schema.ts) — drizzle-kit would then try
// to manage/diff it as if we owned that table, which risks generating an
// ALTER TABLE against Supabase's real auth schema. Read-only raw SQL here
// avoids that entirely.
async function emailFor(tx: Tx, userId: string): Promise<string | null> {
  const rows = await tx.execute<{ email: string | null }>(sql`select email from auth.users where id = ${userId}`);
  return rows[0]?.email ?? null;
}

export function createInvite(userId: string, expiresInDays = 7) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    if (ownerId !== userId) {
      throw new Error("You're currently sharing someone else's inventory — leave it before inviting your own members.");
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const [invite] = await tx.insert(sharedAccessInvites).values({ ownerId, token, expiresAt }).returning();
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
    tx.delete(sharedAccessInvites).where(and(eq(sharedAccessInvites.id, inviteId), eq(sharedAccessInvites.ownerId, userId))),
  );
}

export interface ShareStatus {
  /** "owner": this account anchors the household (possibly solo). "member": sharing someone else's data instead. */
  role: "owner" | "member";
  ownerEmail?: string | null;
  members: { userId: string; email: string | null }[];
}

export function getShareStatus(userId: string): Promise<ShareStatus> {
  return withRLS(userId, async (tx) => {
    const [membership] = await tx.select().from(sharedAccess).where(eq(sharedAccess.memberUserId, userId));
    if (membership) {
      const ownerEmail = await emailFor(tx, membership.ownerId);
      return { role: "member", ownerEmail, members: [] };
    }

    const memberRows = await tx.select().from(sharedAccess).where(eq(sharedAccess.ownerId, userId));
    const members = await Promise.all(
      memberRows.map(async (row) => ({ userId: row.memberUserId, email: await emailFor(tx, row.memberUserId) })),
    );
    return { role: "owner", members };
  });
}

export function removeMember(userId: string, memberUserId: string) {
  return withRLS(userId, (tx) =>
    tx.delete(sharedAccess).where(and(eq(sharedAccess.ownerId, userId), eq(sharedAccess.memberUserId, memberUserId))),
  );
}

export function leaveSharedHousehold(userId: string) {
  return withRLS(userId, (tx) => tx.delete(sharedAccess).where(eq(sharedAccess.memberUserId, userId)));
}

export interface InvitePreview {
  ownerEmail: string | null;
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

  const ownerEmailRows = await db.execute<{ email: string | null }>(
    sql`select email from auth.users where id = ${invite.ownerId}`,
  );
  return {
    ownerEmail: ownerEmailRows[0]?.email ?? null,
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
    const [invite] = await tx.select().from(sharedAccessInvites).where(eq(sharedAccessInvites.token, token)).for("update");
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
    await tx.insert(sharedAccess).values({ memberUserId: acceptingUserId, ownerId: invite.ownerId });
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
