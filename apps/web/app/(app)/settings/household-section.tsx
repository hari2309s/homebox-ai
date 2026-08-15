"use client";

import { Button, Spinner } from "@homebox-ai/ui";
import { useEffect, useState } from "react";

import {
  createInviteAction,
  getShareStatusAction,
  leaveHouseholdAction,
  listPendingInvitesAction,
  removeMemberAction,
  revokeInviteAction,
} from "./actions";

interface ShareStatus {
  role: "owner" | "member";
  ownerEmail?: string | null;
  members: { userId: string; email: string | null }[];
}

interface PendingInvite {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export function HouseholdSection() {
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function refresh() {
    const [nextStatus, nextInvites] = await Promise.all([getShareStatusAction(), listPendingInvitesAction()]);
    setStatus(nextStatus);
    setInvites(nextInvites as unknown as PendingInvite[]);
  }

  useEffect(() => {
    refresh()
      .catch(() => setError("Couldn't load household info"))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    setCreating(true);
    setError(null);
    try {
      const invite = await createInviteAction();
      await refresh();
      const link = `${window.location.origin}/join/${(invite as { token: string }).token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopiedToken((invite as { token: string }).token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create an invite");
    } finally {
      setCreating(false);
    }
  }

  function inviteLink(token: string) {
    return `${window.location.origin}/join/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteLink(token)).catch(() => {});
    setCopiedToken(token);
  }

  if (loading) {
    return <Spinner size={16} />;
  }

  if (!status) {
    return <p className="text-sm text-accent-hover">{error ?? "Couldn't load household info"}</p>;
  }

  if (status.role === "member") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">You&apos;re sharing {status.ownerEmail ?? "another account"}&apos;s inventory.</p>
        <form
          action={async () => {
            if (!confirm("Leave this household? You'll go back to seeing only your own inventory.")) return;
            await leaveHouseholdAction();
            await refresh();
          }}
        >
          <Button type="submit" className="self-start">
            Leave household
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">Anyone you invite can see and edit your whole inventory.</p>

      {status.members.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {status.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
              <span className="text-ink">{member.email ?? member.userId}</span>
              <form
                action={async (formData) => {
                  if (!confirm("Remove this person's access?")) return;
                  await removeMemberAction(formData);
                  await refresh();
                }}
              >
                <input type="hidden" name="memberUserId" value={member.userId} />
                <button type="submit" className="cursor-pointer border-none bg-transparent text-xs font-semibold text-accent-hover">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm">
              <span className="text-muted">Pending invite</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => copyLink(invite.token)}
                  className="cursor-pointer border-none bg-transparent text-xs font-semibold text-ink"
                >
                  {copiedToken === invite.token ? "Copied!" : "Copy link"}
                </button>
                <form
                  action={async (formData) => {
                    await revokeInviteAction(formData);
                    await refresh();
                  }}
                >
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="cursor-pointer border-none bg-transparent text-xs font-semibold text-accent-hover">
                    Revoke
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" onClick={handleInvite} disabled={creating} className="self-start">
        {creating ? <Spinner size={16} /> : "Invite a family member"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-accent-hover">
          {error}
        </p>
      )}
    </div>
  );
}
