import { sharingQueries } from "@homebox-ai/db";
import Link from "next/link";
import { SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { acceptInviteAction } from "./actions";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getSessionUser();
  const invite = await sharingQueries.getInviteByToken(token);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      {!invite ? (
        <p className="text-sm text-body">This invite link is invalid.</p>
      ) : invite.alreadyAccepted ? (
        <p className="text-sm text-body">This invite has already been used.</p>
      ) : invite.expired ? (
        <p className="text-sm text-body">This invite has expired — ask for a new link.</p>
      ) : user?.email && invite.ownerEmail === user.email ? (
        <p className="text-sm text-body">You can&apos;t accept your own invite.</p>
      ) : (
        <>
          <h1 className="text-lg font-bold text-ink">Join {invite.ownerEmail ?? "this"}&apos;s household</h1>
          <p className="max-w-xs text-sm text-body">
            You&apos;ll be able to see and edit their whole inventory, and they&apos;ll see yours too.
          </p>
          <form action={acceptInviteAction}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton>Accept and join</SubmitButton>
          </form>
        </>
      )}
      <Link href="/items" className="text-sm font-semibold text-ink underline underline-offset-4">
        Back to my inventory
      </Link>
    </div>
  );
}
