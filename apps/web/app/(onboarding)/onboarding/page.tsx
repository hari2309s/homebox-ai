import { getSessionUser } from "@homebox-ai/supabase/server";
import { redirect } from "next/navigation";

import { JOIN_PATH } from "../../../lib/pending-join";
import { isPlotSize } from "../../../lib/onboarding";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Set up your place · Homebox" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const pendingJoin =
    typeof meta.pending_join === "string" && JOIN_PATH.test(meta.pending_join) ? meta.pending_join : null;

  return (
    <OnboardingFlow
      firstName={fullName.split(" ")[0] || (user.email?.split("@")[0] ?? "")}
      initialName={typeof meta.household_name === "string" ? meta.household_name : ""}
      initialPlot={isPlotSize(meta.plot_size) ? meta.plot_size : "quarter"}
      pendingJoin={pendingJoin}
    />
  );
}
