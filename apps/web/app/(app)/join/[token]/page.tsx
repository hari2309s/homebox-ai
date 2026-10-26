import { sharingQueries } from "@homebox-ai/db";
import Link from "next/link";
import { SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";
import { AnimatedHomeboxIcon } from "@homebox-ai/ui";

import { acceptInviteAction } from "./actions";

function ErrorCard({
  icon,
  tag,
  tagColor,
  borderColor,
  bgColor,
  title,
  description,
  buttonLabel,
  buttonStyle,
  href,
}: {
  icon: string;
  tag: string;
  tagColor: string;
  borderColor: string;
  bgColor: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonStyle: "primary" | "secondary";
  href: string;
}) {
  return (
    <div
      className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[28px] p-[26px_22px] text-center shadow-card"
      style={{ background: "#f4f3ee" }}
    >
      <div
        className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-dashed"
        style={{ background: bgColor, borderColor }}
      >
        <span className="material-symbols-rounded text-[32px]" style={{ color: tagColor }}>
          {icon}
        </span>
      </div>
      <div className="font-mono text-[10px]" style={{ color: tagColor }}>
        {tag}
      </div>
      <div className="font-serif text-[24px] leading-tight text-ink">{title}</div>
      <div className="text-[14px] leading-relaxed text-muted">{description}</div>
      <Link
        href={href}
        className={`w-full rounded-xl py-[13px] text-center text-[15px] font-semibold no-underline ${
          buttonStyle === "primary" ? "bg-accent text-white" : "border border-border bg-card text-ink"
        }`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  const [user, invite] = await Promise.all([getSessionUser(), sharingQueries.getInviteByToken(token)]);

  if (!invite) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <ErrorCard
          icon="link_off"
          tag="INVALID LINK"
          tagColor="#7a3f22"
          borderColor="#b0643f"
          bgColor="#ecdccd"
          title="We couldn't find that invite"
          description="The link may be incomplete. Try opening it straight from the message again."
          buttonLabel="Go to my home"
          buttonStyle="secondary"
          href="/items"
        />
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <ErrorCard
          icon="hourglass_disabled"
          tag="INVITE EXPIRED"
          tagColor="#8a6a1a"
          borderColor="#d9a43a"
          bgColor="#f6e7c4"
          title="This invite has gone stale"
          description="Invites last 7 days. Ask for a fresh link from Settings > Household."
          buttonLabel="Go to my home"
          buttonStyle="primary"
          href="/items"
        />
      </div>
    );
  }

  if (invite.alreadyAccepted) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <ErrorCard
          icon="check_circle"
          tag="ALREADY JOINED"
          tagColor="#2c4d31"
          borderColor="#3f6b45"
          bgColor="#dfe8d6"
          title="You've already joined"
          description="This invite has been used. You're all set."
          buttonLabel="Go to my home"
          buttonStyle="primary"
          href="/items"
        />
      </div>
    );
  }

  if (user?.email && invite.ownerEmail === user.email) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <ErrorCard
          icon="home"
          tag="YOUR OWN INVITE"
          tagColor="#2c4d31"
          borderColor="#3f6b45"
          bgColor="#dfe8d6"
          title="You're already home"
          description="This is your invite link. Share it with someone else to add them to your household."
          buttonLabel="Back to my home"
          buttonStyle="primary"
          href="/items"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <AnimatedHomeboxIcon size={96} />
      <div className="flex flex-col gap-[10px]">
        <div className="font-mono text-[11px] text-accent">
          YOU&apos;RE INVITED{invite.relationship ? ` AS ${invite.relationship.toUpperCase()}` : ""}
        </div>
        <h1 className="m-0 font-serif text-[32px] font-normal leading-tight text-ink">
          Join {invite.ownerName?.split(" ")[0] ?? invite.ownerEmail ?? "this"}&apos;s household
        </h1>
        <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-muted">
          {invite.ownerName && invite.ownerEmail
            ? `${invite.ownerName} (${invite.ownerEmail})`
            : (invite.ownerEmail ?? "They")}{" "}
          invited you{invite.relationship ? ` as their ${invite.relationship.toLowerCase()}` : ""}. You&apos;ll see
          everything in the house, garden, garage and shed, and can add your own things.
        </p>
        <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-muted">
          While you&apos;re in their household you see their things instead of your own. You can leave any time from
          Settings.
        </p>
      </div>

      <div className="w-full max-w-sm">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-[#ecdccd] px-3 py-2.5 text-left text-sm text-[#5a2e18]">
            {error.slice(0, 200)}
          </p>
        )}
        <form action={acceptInviteAction} className="flex flex-col items-center gap-[10px]">
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="w-full">Accept and join</SubmitButton>
        </form>
        <Link href="/items" className="mt-3 block text-[14px] font-semibold text-muted no-underline">
          Not now
        </Link>
      </div>
    </div>
  );
}
