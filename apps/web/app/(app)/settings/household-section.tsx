"use client";

import { Button, ConfirmDialog, Spinner, StaggerItem, StaggerList, TapButton } from "@homebox-ai/ui";
import { useEffect, useState } from "react";

import {
  createInviteAction,
  getShareStatusAction,
  leaveHouseholdAction,
  listPendingInvitesAction,
  removeMemberAction,
  revokeInviteAction,
} from "./actions/sharing";

interface ShareStatus {
  role: "owner" | "member";
  ownerEmail?: string | null;
  members: { userId: string; email: string | null }[];
}

type PendingInvite = Awaited<ReturnType<typeof listPendingInvitesAction>>[number];

export function HouseholdSection() {
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function refresh() {
    const [nextStatus, nextInvites] = await Promise.all([getShareStatusAction(), listPendingInvitesAction()]);
    setStatus(nextStatus);
    setInvites(nextInvites);
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
      if (!invite) throw new Error("Couldn't create an invite");
      await refresh();
      const link = inviteLink(invite.token);
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopiedToken(invite.token);
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

  async function handleLeave() {
    setError(null);
    setLeaving(true);
    try {
      await leaveHouseholdAction();
      await refresh();
      setLeaveConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave this household");
      setLeaveConfirmOpen(false);
    } finally {
      setLeaving(false);
    }
  }

  async function handleRemoveMember() {
    if (!pendingRemoveMemberId) return;
    const formData = new FormData();
    formData.set("memberUserId", pendingRemoveMemberId);
    setError(null);
    setRemovingMember(true);
    try {
      await removeMemberAction(formData);
      await refresh();
      setPendingRemoveMemberId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove this member");
      setPendingRemoveMemberId(null);
    } finally {
      setRemovingMember(false);
    }
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
        <p className="text-sm text-body">
          You&apos;re sharing {status.ownerEmail ?? "another account"}&apos;s inventory.
        </p>
        <Button type="button" onClick={() => setLeaveConfirmOpen(true)} className="self-start">
          Leave household
        </Button>
        <ConfirmDialog
          open={leaveConfirmOpen}
          title="Leave this household?"
          description="You'll go back to seeing only your own inventory."
          confirmLabel="Leave"
          confirming={leaving}
          onConfirm={handleLeave}
          onCancel={() => setLeaveConfirmOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">Anyone you invite can see and edit your whole inventory.</p>

      {status.members.length > 0 && (
        <StaggerList className="m-0 flex list-none flex-col gap-1.5 p-0">
          {status.members.map((member) => (
            <StaggerItem
              key={member.userId}
              hover
              className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2 text-sm"
            >
              <span className="text-ink">{member.email ?? member.userId}</span>
              <TapButton
                type="button"
                onClick={() => setPendingRemoveMemberId(member.userId)}
                className="cursor-pointer border-none bg-transparent text-xs font-semibold text-accent-hover"
              >
                Remove
              </TapButton>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {invites.length > 0 && (
        <StaggerList className="m-0 flex list-none flex-col gap-1.5 p-0">
          {invites.map((invite) => (
            <StaggerItem
              key={invite.id}
              hover
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm"
            >
              <span className="text-muted">Pending invite</span>
              <div className="flex items-center gap-3">
                <TapButton
                  type="button"
                  onClick={() => copyLink(invite.token)}
                  className="cursor-pointer border-none bg-transparent text-xs font-semibold text-ink"
                >
                  {copiedToken === invite.token ? "Copied!" : "Copy link"}
                </TapButton>
                <TapButton
                  type="button"
                  disabled={revokingId === invite.id}
                  onClick={async () => {
                    setError(null);
                    setRevokingId(invite.id);
                    try {
                      const formData = new FormData();
                      formData.set("inviteId", invite.id);
                      await revokeInviteAction(formData);
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Couldn't revoke this invite");
                    } finally {
                      setRevokingId(null);
                    }
                  }}
                  className="cursor-pointer border-none bg-transparent text-xs font-semibold text-accent-hover disabled:opacity-50"
                >
                  {revokingId === invite.id ? <Spinner size={12} /> : "Revoke"}
                </TapButton>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      <Button type="button" onClick={handleInvite} loading={creating} className="self-start">
        Invite a family member
      </Button>

      {error && (
        <p role="alert" className="text-sm text-accent-hover">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={pendingRemoveMemberId !== null}
        title="Remove this person's access?"
        confirmLabel="Remove"
        confirming={removingMember}
        onConfirm={handleRemoveMember}
        onCancel={() => setPendingRemoveMemberId(null)}
      />
    </div>
  );
}
