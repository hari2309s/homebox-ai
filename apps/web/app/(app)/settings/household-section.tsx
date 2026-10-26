"use client";

import { ConfirmDialog, Spinner } from "@homebox-ai/ui";
import { useEffect, useId, useState } from "react";

import {
  createInviteAction,
  getShareStatusAction,
  leaveHouseholdAction,
  listPendingInvitesAction,
  removeMemberAction,
  revokeInviteAction,
  setMemberRelationshipAction,
} from "./actions/sharing";

type ShareStatus = Awaited<ReturnType<typeof getShareStatusAction>>;
type PendingInvite = Awaited<ReturnType<typeof listPendingInvitesAction>>[number];

const RELATIONSHIPS = [
  "Partner",
  "Spouse",
  "Child",
  "Daughter",
  "Son",
  "Parent",
  "Sibling",
  "Grandparent",
  "Housemate",
  "Friend",
];
const AVATAR_COLORS = ["#5b7fa6", "#b0643f", "#8a7a4f", "#3f8a8a"];
const SMALL = "cursor-pointer rounded-[9px] px-3 py-[7px] text-[12px] font-semibold disabled:opacity-50";

function initialOf(text: string | null | undefined) {
  return (text ?? "?").trim().charAt(0).toUpperCase() || "?";
}

function daysLeft(expiresAt: Date | string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "Expired" : `Expires in ${days} ${days === 1 ? "day" : "days"}`;
}

function RoleChip({ role }: { role: "owner" | "member" | "pending" }) {
  const style =
    role === "owner"
      ? "bg-selected text-(--plan-ink)"
      : role === "pending"
        ? "bg-[#f6e7c4] text-[#6b4e10] dark:bg-[#2e2a1a] dark:text-[#e8d29a]"
        : "bg-surface-soft text-body";
  return <span className={`rounded-[6px] px-[7px] py-1 font-mono text-[10px] ${style}`}>{role.toUpperCase()}</span>;
}

function RelationshipInput({
  value,
  onSave,
  label,
}: {
  value: string | null;
  onSave: (next: string) => Promise<void>;
  label: string;
}) {
  const listId = useId();
  const [draft, setDraft] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => setDraft(value ?? ""), [value]);

  async function commit() {
    if (draft.trim() === (value ?? "")) return;
    setState("saving");
    try {
      await onSave(draft);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("idle");
      setDraft(value ?? "");
    }
  }

  return (
    <span className="flex items-center gap-1">
      <input
        list={listId}
        value={draft}
        maxLength={40}
        placeholder="Relationship"
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="w-[124px] rounded-[8px] border border-border bg-card px-2 py-[5px] text-[12px] text-ink outline-none placeholder:text-muted focus:border-accent"
      />
      <datalist id={listId}>
        {RELATIONSHIPS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <span aria-live="polite" className="w-4 text-accent">
        {state === "saving" ? (
          <Spinner size={12} />
        ) : state === "saved" ? (
          <span className="material-symbols-rounded text-[16px]">check</span>
        ) : null}
      </span>
    </span>
  );
}

export function HouseholdSection({ selfEmail, selfName }: { selfEmail: string; selfName: string }) {
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; label: string } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const inviteListId = useId();

  async function refresh() {
    const [nextStatus, nextInvites] = await Promise.all([getShareStatusAction(), listPendingInvitesAction()]);
    setStatus(nextStatus);
    setInvites(nextInvites.filter((invite) => new Date(invite.expiresAt).getTime() > Date.now()));
  }

  useEffect(() => {
    refresh()
      .catch(() => setError("Couldn't load household info"))
      .finally(() => setLoading(false));
  }, []);

  function inviteLink(token: string) {
    return `${window.location.origin}/join/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteLink(token)).catch(() => {});
    setCopiedToken(token);
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  async function handleInvite() {
    setCreating(true);
    await run(async () => {
      const invite = await createInviteAction(relationship);
      if (!invite) throw new Error("Couldn't create an invite");
      await refresh();
      setRelationship("");
      await copyLink(invite.token);
    }, "Couldn't create an invite");
    setCreating(false);
  }

  if (loading) return <Spinner size={16} />;
  if (!status) return <p className="m-0 text-sm text-[#b0643f]">{error ?? "Couldn't load household info"}</p>;

  if (status.role === "member") {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[14px] leading-normal text-body">
          You&apos;re sharing <b className="text-ink">{status.ownerEmail ?? "another account"}</b>&apos;s household
          {status.relationship ? ` as their ${status.relationship.toLowerCase()}` : ""}. You can see, add and move
          anything in it.
        </p>
        <button
          type="button"
          onClick={() => setLeaveConfirmOpen(true)}
          className={`${SMALL} self-start border border-border bg-card text-[#b0643f]`}
        >
          Leave household
        </button>
        {error && (
          <p role="alert" className="m-0 text-sm text-[#b0643f]">
            {error}
          </p>
        )}
        <ConfirmDialog
          open={leaveConfirmOpen}
          title="Leave this household?"
          description="You'll go back to seeing only your own inventory."
          confirmLabel="Leave"
          confirming={leaving}
          onConfirm={async () => {
            setLeaving(true);
            await run(async () => {
              await leaveHouseholdAction();
              await refresh();
            }, "Couldn't leave this household");
            setLeaving(false);
            setLeaveConfirmOpen(false);
          }}
          onCancel={() => setLeaveConfirmOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col p-0" aria-label="Household members">
        <li className="flex items-center gap-3 border-b border-border/40 py-3">
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-accent font-bold text-white">
            {initialOf(selfName || selfEmail)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-ink">{selfName || selfEmail} (you)</span>
            {selfName && <span className="block truncate text-[12px] text-muted">{selfEmail}</span>}
          </span>
          <RoleChip role="owner" />
        </li>

        {status.members.map((member, i) => {
          const label = member.name || member.email || "Family member";
          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 border-b border-border/40 py-3">
              <span
                className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full font-bold text-white"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {initialOf(label)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{label}</span>
                <span className="block truncate text-[12px] text-muted">
                  {member.name && member.email ? member.email : (member.relationship ?? "Member")}
                </span>
              </span>
              <RelationshipInput
                value={member.relationship}
                label={`Relationship of ${label}`}
                onSave={async (next) => {
                  await run(async () => {
                    await setMemberRelationshipAction(member.userId, next);
                    await refresh();
                  }, "Couldn't save the relationship");
                }}
              />
              <RoleChip role="member" />
              <button
                type="button"
                onClick={() => setPendingRemove({ userId: member.userId, label })}
                aria-label={`Remove ${label}`}
                className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-[#b0643f]"
              >
                <span aria-hidden className="material-symbols-rounded text-[18px]">
                  person_remove
                </span>
              </button>
            </li>
          );
        })}

        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-3 border-b border-border/40 py-3">
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-border text-muted">
              <span aria-hidden className="material-symbols-rounded text-[18px]">
                mail
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-ink">
                Invite{invite.relationship ? ` for your ${invite.relationship.toLowerCase()}` : ""}
              </span>
              <span className="block truncate text-[12px] text-muted">{daysLeft(invite.expiresAt)}</span>
            </span>
            <RoleChip role="pending" />
            <button
              type="button"
              onClick={() => copyLink(invite.token)}
              className={`${SMALL} border border-border bg-card text-ink`}
            >
              {copiedToken === invite.token ? "Copied ✓" : "Copy link"}
            </button>
            <button
              type="button"
              disabled={revokingId === invite.id}
              onClick={async () => {
                setRevokingId(invite.id);
                const formData = new FormData();
                formData.set("inviteId", invite.id);
                await run(async () => {
                  await revokeInviteAction(formData);
                  await refresh();
                }, "Couldn't revoke this invite");
                setRevokingId(null);
              }}
              className={`${SMALL} border-none bg-transparent text-[#b0643f]`}
            >
              {revokingId === invite.id ? <Spinner size={12} /> : "Revoke"}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[14px] font-semibold text-ink">Invite a family member</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            list={inviteListId}
            value={relationship}
            maxLength={40}
            onChange={(event) => setRelationship(event.target.value)}
            placeholder="Who are they? e.g. Partner"
            aria-label="Their relationship to you"
            className="min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3 py-[9px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          <datalist id={inviteListId}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={handleInvite}
            disabled={creating}
            className="flex cursor-pointer items-center gap-[6px] rounded-[10px] border-none bg-accent px-4 py-[10px] text-[13px] font-semibold text-white disabled:opacity-60"
          >
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              link
            </span>
            {creating ? "Creating…" : "Create invite link"}
          </button>
        </div>
        <span className="text-[12px] text-muted">
          The link is copied for you to send. It works once and lasts 7 days. They can sign in or create an account from
          it.
        </span>
      </div>

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-[#ecdccd] px-3 py-2 text-sm text-[#5a2e18]">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`Remove ${pendingRemove?.label ?? "this person"}?`}
        description="They'll lose access to the household. Reminders assigned to them become unassigned."
        confirmLabel="Remove"
        confirming={removingMember}
        onConfirm={async () => {
          if (!pendingRemove) return;
          setRemovingMember(true);
          const formData = new FormData();
          formData.set("memberUserId", pendingRemove.userId);
          await run(async () => {
            await removeMemberAction(formData);
            await refresh();
          }, "Couldn't remove this member");
          setRemovingMember(false);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
