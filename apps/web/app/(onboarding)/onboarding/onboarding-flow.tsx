"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { DEFAULT_ZONES, PLOT_SIZES, ZONE_OPTIONS, type PlotSize, type ZoneOption } from "../../../lib/onboarding";
import { inferKind, layoutPlan, PLOT_H, PLOT_W, type PlanKind } from "../../../lib/plan-layout";
import { PlaceShape } from "../../../lib/plan-shape";
import { LABEL_INK } from "../../../lib/plan-styles";
import { toastOnboardingComplete } from "../../(app)/notifications/use-notifications";
import { createInviteAction } from "../../(app)/settings/actions/sharing";
import { completeOnboardingAction, createZonesAction, saveHouseholdAction } from "./actions";

const RELATIONSHIPS = ["Partner", "Spouse", "Child", "Parent", "Sibling", "Housemate"];
const PRIMARY =
  "w-full cursor-pointer rounded-xl border-none bg-accent py-[15px] text-[16px] font-semibold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-45";
const SECONDARY =
  "cursor-pointer rounded-xl border border-border bg-card py-[14px] text-[15px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Progress({ step }: { step: number }) {
  return (
    <div className="grid grid-cols-3 gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-[3px] rounded-sm transition-colors ${i <= step ? "bg-accent" : "bg-border"}`} />
      ))}
    </div>
  );
}

function Shell({
  step,
  children,
  footer,
  onSkip,
}: {
  step: number;
  children: ReactNode;
  footer: ReactNode;
  onSkip?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pb-[34px] pt-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress step={step} />
        </div>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-muted hover:text-ink"
          >
            Skip setup
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-[18px] pt-[22px]">{children}</div>
      <div className="flex flex-col items-center gap-[10px] pt-6">{footer}</div>
    </main>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[10px] uppercase text-accent">{children}</div>;
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="m-0 mt-[6px] font-serif text-[30px] font-normal leading-[1.1] text-ink">{children}</h1>;
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
      {error}
    </p>
  );
}

/** J7 #43's mini plan: the picked zones drawn where they'll land on the real plan, with a dashed preview of the hovered one. */
function MiniPlan({
  zones,
  preview,
}: {
  zones: { name: string; kind: PlanKind }[];
  preview: { name: string; kind: PlanKind } | null;
}) {
  const all = preview ? [...zones, preview] : zones;
  const placed = layoutPlan(
    all.map((z, i) => ({
      id: `z${i}`,
      name: z.name,
      parentId: null,
      planKind: z.kind,
      planX: null,
      planY: null,
      planW: null,
      planH: null,
    })),
  );
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-(--plan-ground)"
      style={{
        aspectRatio: `${PLOT_W} / ${PLOT_H}`,
        backgroundImage: "radial-gradient(var(--plan-dots) 1px, transparent 1.2px)",
        backgroundSize: "10px 10px",
      }}
      role="img"
      aria-label={zones.length ? `Your plot so far: ${zones.map((z) => z.name).join(", ")}` : "An empty plot"}
    >
      {placed.map((place, i) => {
        const isPreview = preview !== null && i === all.length - 1;
        return (
          <div
            key={`${place.name}-${isPreview ? "preview" : "zone"}`}
            className={`zone-in absolute ${isPreview ? "rounded-[8px] border-2 border-dashed border-accent bg-transparent" : ""}`}
            style={{
              left: `${(place.rect.x / PLOT_W) * 100}%`,
              top: `${(place.rect.y / PLOT_H) * 100}%`,
              width: `${(place.rect.w / PLOT_W) * 100}%`,
              height: `${(place.rect.h / PLOT_H) * 100}%`,
            }}
          >
            {!isPreview && (
              <PlaceShape kind={place.kind} shape={place.shape} w={place.rect.w} h={place.rect.h} radius={28} />
            )}
            <span
              className={`absolute left-[5px] top-[4px] right-1 truncate font-mono text-[9px] ${isPreview ? "text-(--plan-ink)" : (LABEL_INK[place.kind] ?? "text-body")}`}
            >
              {isPreview ? `+ ${place.name.toUpperCase()}?` : place.name.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingFlow({
  firstName,
  initialName,
  initialPlot,
  pendingJoin,
}: {
  firstName: string;
  initialName: string;
  initialPlot: PlotSize;
  pendingJoin: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [placeName, setPlaceName] = useState(initialName);
  const [plot, setPlot] = useState<PlotSize>(initialPlot);
  const [picked, setPicked] = useState<string[]>(DEFAULT_ZONES);
  const [custom, setCustom] = useState<ZoneOption[]>([]);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteField, setShowInviteField] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [invited, setInvited] = useState<{ token: string; relationship: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => [...ZONE_OPTIONS, ...custom], [custom]);
  const pickedZones = options.filter((z) => picked.includes(z.name));
  const hoveredZone = hovered && !picked.includes(hovered) ? (options.find((z) => z.name === hovered) ?? null) : null;
  const shortName = placeName.trim() || "your place";

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(href: string) {
    await run(async () => {
      await completeOnboardingAction();
      toastOnboardingComplete();
      router.replace(href);
    });
  }

  function addCustom() {
    const name = (customDraft ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return setCustomDraft(null);
    if (!options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      setCustom((prev) => [...prev, { name, kind: inferKind(name, null), color: "#7c867f" }]);
    }
    setPicked((prev) => (prev.some((p) => p.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]));
    setCustomDraft(null);
  }

  function openInviteLink() {
    const match = (inviteLink ?? "").match(/\/join\/([0-9a-f-]{36})/i);
    if (!match) return setError("That doesn't look like an invite link. It should end in /join/ and a long code.");
    router.push(`/join/${match[1]}`);
  }

  async function createInvite() {
    await run(async () => {
      const invite = await createInviteAction(relationship);
      if (!invite) throw new Error("Couldn't create an invite");
      await navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`).catch(() => {});
      setInvited((prev) => [...prev, { token: invite.token, relationship: relationship.trim() }]);
      setCopied(invite.token);
      setRelationship("");
    });
  }

  if (step === 0) {
    return (
      <Shell
        step={0}
        onSkip={() => finish("/")}
        footer={
          <>
            <button
              type="button"
              disabled={busy || !placeName.trim()}
              onClick={() =>
                run(async () => {
                  await saveHouseholdAction({ name: placeName, plotSize: plot });
                  setStep(1);
                })
              }
              className={PRIMARY}
            >
              {busy ? "Saving…" : "Continue"}
            </button>
            {pendingJoin ? (
              <span className="text-[14px] text-muted">
                Joining someone else&apos;s home?{" "}
                <a href={pendingJoin} className="font-semibold text-accent no-underline">
                  Open your invite
                </a>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowInviteField((v) => !v)}
                className="cursor-pointer border-none bg-transparent p-0 text-[14px] text-muted"
              >
                Joining someone else&apos;s home? <span className="font-semibold text-accent">Use an invite</span>
              </button>
            )}
          </>
        }
      >
        <div>
          <Eyebrow>Welcome{firstName ? `, ${firstName}` : ""} · step 1 of 3</Eyebrow>
          <Title>What do you call home?</Title>
        </div>
        <label className="flex flex-col gap-[5px]">
          <span className="text-[12px] font-semibold text-body">Name of the place</span>
          <input
            autoFocus
            value={placeName}
            maxLength={60}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="e.g. Willow Cottage"
            aria-describedby="place-hint"
            className="rounded-xl border border-border bg-card px-3 py-[11px] text-[15px] text-ink outline-none focus:border-2 focus:border-accent focus:px-[11px] focus:py-[10px] focus:shadow-[0_0_0_4px_var(--color-selected)]"
          />
          <span id="place-hint" className="text-[12px] text-muted">
            A house name or street works best, e.g. &ldquo;Willow Cottage&rdquo;
          </span>
        </label>
        <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
          <legend className="mb-2 p-0 text-[12px] font-semibold text-body">Roughly how big is the plot?</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Plot size">
            {PLOT_SIZES.map((p) => {
              const active = plot === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPlot(p.id)}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-[14px] px-2 py-3 text-center ${
                    active ? "border-2 border-accent bg-selected-soft" : "border border-border bg-card"
                  }`}
                >
                  <span
                    className="relative flex-none rounded-[4px] border border-(--plan-bed-line) bg-(--plan-bed)"
                    style={{ width: p.size, height: p.size }}
                  >
                    <span className="absolute left-[20%] top-[30%] h-[40%] w-[34%] rounded-[2px] border-[1.5px] border-(--plan-house-line) bg-(--plan-house)" />
                  </span>
                  <span className="text-[13px] font-semibold text-ink">{p.label}</span>
                  <span className="font-mono text-[9px] text-muted">{p.detail}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {showInviteField && !pendingJoin && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-3">
            <label className="text-[12px] font-semibold text-body" htmlFor="invite-link">
              Paste the invite link you were sent
            </label>
            <div className="flex gap-2">
              <input
                id="invite-link"
                value={inviteLink ?? ""}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://…/join/…"
                className="min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3 py-[9px] font-mono text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={openInviteLink}
                className="cursor-pointer rounded-[10px] border-none bg-accent px-4 text-[13px] font-semibold text-on-accent"
              >
                Open
              </button>
            </div>
          </div>
        )}
        <ErrorNote error={error} />
      </Shell>
    );
  }

  if (step === 1) {
    return (
      <Shell
        step={1}
        onSkip={() => finish("/")}
        footer={
          <div className="flex w-full gap-2">
            <button type="button" onClick={() => setStep(0)} className={`${SECONDARY} flex-1`}>
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await createZonesAction(pickedZones.map((z) => ({ name: z.name, kind: z.kind })));
                  setStep(2);
                })
              }
              className={`${PRIMARY} flex-[2]`}
            >
              {busy
                ? "Drawing your plot…"
                : `Continue · ${pickedZones.length} ${pickedZones.length === 1 ? "zone" : "zones"}`}
            </button>
          </div>
        }
      >
        <div>
          <Eyebrow>{shortName} · step 2 of 3</Eyebrow>
          <Title>What&apos;s on the plot?</Title>
        </div>
        <MiniPlan zones={pickedZones} preview={hoveredZone} />
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Zones on your plot">
          {options.map((zone) => {
            const on = picked.includes(zone.name);
            return (
              <button
                key={zone.name}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={zone.locked}
                onClick={() =>
                  !zone.locked && setPicked((prev) => (on ? prev.filter((p) => p !== zone.name) : [...prev, zone.name]))
                }
                onMouseEnter={() => setHovered(zone.name)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(zone.name)}
                onBlur={() => setHovered(null)}
                className={`flex h-12 items-center gap-[10px] rounded-xl px-3 text-left ${zone.locked ? "cursor-default" : "cursor-pointer"} ${
                  on ? "border-2 border-accent bg-selected-soft" : "border border-border bg-card"
                }`}
              >
                <span className="h-3 w-3 flex-none rounded-[3px]" style={{ background: zone.color }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{zone.name}</span>
                <span
                  aria-hidden
                  className={`material-symbols-rounded text-[20px] ${on ? "text-accent" : "text-faint"}`}
                  style={{ fontVariationSettings: on ? "'FILL' 1" : undefined }}
                >
                  {zone.locked ? "lock" : on ? "check_circle" : "add_circle"}
                </span>
              </button>
            );
          })}
        </div>
        {customDraft === null ? (
          <button
            type="button"
            onClick={() => setCustomDraft("")}
            className="flex cursor-pointer items-center gap-1 self-start border-none bg-transparent p-0 text-[13px] font-semibold text-accent"
          >
            <span aria-hidden className="material-symbols-rounded text-[18px]">
              add
            </span>
            Add your own (greenhouse, chicken run…)
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={customDraft}
              maxLength={40}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setCustomDraft(null)}
              placeholder="e.g. Chicken run"
              aria-label="Name of your own zone"
              className="min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3 py-[9px] text-[14px] text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-[10px] border-none bg-accent px-4 text-[13px] font-semibold text-on-accent"
            >
              Add
            </button>
          </form>
        )}
        <p className="m-0 text-[12px] text-muted">You can move and resize everything later on the Plan.</p>
        <ErrorNote error={error} />
      </Shell>
    );
  }

  return (
    <Shell
      step={2}
      footer={
        <>
          <button type="button" disabled={busy} onClick={() => finish("/")} className={PRIMARY}>
            Show me the plan
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => finish("/")}
            className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-semibold text-muted"
          >
            Skip for now
          </button>
        </>
      }
    >
      <div>
        <Eyebrow>Step 3 of 3 · almost home</Eyebrow>
        <h1 className="m-0 mt-[6px] font-serif text-[28px] font-normal leading-[1.1] text-ink">
          Who else looks after {shortName}?
        </h1>
      </div>
      <div className="flex flex-col gap-[10px] rounded-[14px] border border-border bg-card p-3">
        <div className="flex gap-[6px]">
          <input
            list="onboarding-relationships"
            value={relationship}
            maxLength={40}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Who are they? e.g. Partner"
            aria-label="Their relationship to you"
            className="min-w-0 flex-1 rounded-[10px] border border-border bg-card px-[10px] py-[10px] text-[14px] text-ink outline-none focus:border-accent"
          />
          <datalist id="onboarding-relationships">
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <button
            type="button"
            disabled={busy}
            onClick={createInvite}
            className="cursor-pointer rounded-[10px] border-none bg-accent px-[14px] text-[13px] font-semibold text-on-accent disabled:opacity-45"
          >
            Invite
          </button>
        </div>
        {invited.map((invite) => (
          <div key={invite.token} className="flex items-center gap-[10px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5b7fa6] text-[12px] font-bold text-white">
              {(invite.relationship || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
              {invite.relationship || "Family member"}
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`).catch(() => {});
                setCopied(invite.token);
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-[12px] font-semibold text-accent"
            >
              {copied === invite.token ? "Link copied ✓" : "Copy link"}
            </button>
            <span className="rounded-[5px] bg-warn-soft px-[6px] py-[3px] font-mono text-[10px] text-warn-ink">
              INVITED
            </span>
          </div>
        ))}
        <span className="text-[12px] text-muted">
          {invited.length
            ? "Send them the link; it works once and lasts 7 days."
            : "Or share a link later from Settings › Household."}
        </span>
      </div>
      <h2 className="m-0 mt-1 font-serif text-[20px] font-normal text-ink">Add your first thing</h2>
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/capture", icon: "photo_camera", label: "Photo", bg: "#dfe8d6", fg: "#3f6b45" },
          { href: "/receipts", icon: "receipt_long", label: "Receipt", bg: "#ecdccd", fg: "#b0643f" },
          { href: "/scan", icon: "barcode_scanner", label: "Barcode", bg: "#e7e1d0", fg: "#5a4f33" },
        ].map((first) => (
          <button
            key={first.href}
            type="button"
            disabled={busy}
            onClick={() => finish(first.href)}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-border bg-card px-[6px] py-[14px]"
          >
            <span
              aria-hidden
              className="material-symbols-rounded flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: first.bg, color: first.fg }}
            >
              {first.icon}
            </span>
            <span className="text-[13px] font-semibold text-ink">{first.label}</span>
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
    </Shell>
  );
}
