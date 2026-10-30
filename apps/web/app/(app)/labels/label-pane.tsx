"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LABEL_SWATCHES, labelChip } from "../../../lib/label-colors";
import { toastLabelDeleted, toastLabelUpdated } from "../notifications/use-notifications";
import { deleteLabelAction, setItemTaggedAction, updateLabelAction } from "./actions";

export interface TaggedThing {
  id: string;
  name: string;
  place: string;
  stripe: string;
}

const BAR = "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[9px] px-3 text-[13px] font-semibold";

export function LabelPane({
  id,
  name: initialName,
  color: initialColor,
  summary,
  things: initialThings,
}: {
  id: string;
  name: string;
  color: string | null;
  summary: string;
  things: TaggedThing[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? LABEL_SWATCHES[0].bg);
  const [things, setThings] = useState(initialThings);
  const [removed, setRemoved] = useState<TaggedThing | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
    setColor(initialColor ?? LABEL_SWATCHES[0].bg);
    setConfirming(false);
    setRemoved(null);
  }, [id, initialName, initialColor]);
  useEffect(() => setThings(initialThings), [initialThings]);

  const dirty = name.trim() !== initialName || color !== (initialColor ?? LABEL_SWATCHES[0].bg);
  const chip = labelChip(color);
  const isCustom = !LABEL_SWATCHES.some((s) => s.bg.toLowerCase() === color.toLowerCase());

  async function save() {
    if (!name.trim()) return setError("Give the label a name");
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", name.trim());
    formData.set("color", color);
    try {
      await updateLabelAction(formData);
      toastLabelUpdated(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this label");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    try {
      await deleteLabelAction(formData);
      toastLabelDeleted(initialName);
      router.replace("/labels", { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this label");
    }
  }

  async function untag(thing: TaggedThing) {
    setThings((prev) => prev.filter((t) => t.id !== thing.id));
    setRemoved(thing);
    try {
      await setItemTaggedAction(thing.id, id, false);
    } catch {
      setThings((prev) => [...prev, thing]);
      setRemoved(null);
      setError(`Couldn't remove the label from ${thing.name}`);
    }
  }

  async function undo() {
    if (!removed) return;
    const thing = removed;
    setRemoved(null);
    setThings((prev) => [...prev, thing]);
    try {
      await setItemTaggedAction(thing.id, id, true);
    } catch {
      setError(`Couldn't put the label back on ${thing.name}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-accent">{summary}</span>
        <button
          type="button"
          onClick={() => setConfirming((c) => !c)}
          className={`${BAR} border border-border bg-card text-clay`}
        >
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            delete
          </span>
          Delete
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={`${BAR} border-none bg-accent text-on-accent disabled:opacity-50`}
        >
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            check
          </span>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {confirming && (
        <div className="flex items-center gap-3 rounded-[12px] bg-danger-faint px-[14px] py-3">
          <p className="m-0 flex-1 text-[13px] text-danger">
            <b>Delete &ldquo;{initialName}&rdquo;?</b> It comes off {things.length}{" "}
            {things.length === 1 ? "thing" : "things"}; the things stay.
          </p>
          <button
            type="button"
            onClick={remove}
            className="cursor-pointer rounded-lg border-none bg-[#b0643f] px-3 py-1.5 text-[13px] font-semibold text-white"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-ink"
          >
            Keep
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 items-start gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex flex-col gap-3 rounded-[14px] border border-border bg-card px-4 pb-4 pt-1"
        >
          <h2 className="m-0 pt-[10px] font-serif text-[18px] font-normal text-ink">Edit label</h2>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-[10px] border border-border bg-card px-3 py-2 text-[14px] text-ink outline-none focus:border-2 focus:border-accent focus:shadow-[0_0_0_3px_var(--color-selected)]"
            />
          </label>
          <fieldset className="m-0 flex flex-col gap-[6px] border-none p-0">
            <legend className="mb-[6px] p-0 text-[12px] font-semibold text-body">Colour</legend>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Colour">
              {LABEL_SWATCHES.map((swatch) => {
                const active = swatch.bg.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={swatch.bg}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Colour ${swatch.bg}`}
                    onClick={() => setColor(swatch.bg)}
                    className="h-9 cursor-pointer rounded-[9px] border-none"
                    style={{
                      background: swatch.bg,
                      boxShadow: active
                        ? "0 0 0 2px var(--color-card), 0 0 0 4px var(--color-accent)"
                        : "inset 0 0 0 1px rgba(31,38,34,.1)",
                    }}
                  />
                );
              })}
            </div>
            {isCustom && (
              <span className="text-[11px] text-muted">
                This label uses an older custom colour. Pick a tint to switch.
              </span>
            )}
          </fieldset>
          <div className="flex items-center gap-[10px]">
            <span className="text-[12px] font-semibold text-body">Preview</span>
            <span
              className="rounded-full px-3 py-[5px] text-[13px] font-semibold"
              style={{ background: chip.bg, color: chip.ink }}
            >
              {name.trim() || "Label"}
            </span>
          </div>
        </form>

        <div className="rounded-[14px] border border-border bg-card px-[14px] pt-1">
          <h2 className="m-0 pb-1 pt-[10px] font-serif text-[18px] font-normal text-ink">Tagged things</h2>
          {removed && (
            <div
              role="status"
              className="mb-1 flex items-center gap-2 rounded-[10px] bg-inverse px-3 py-2 text-[12px] text-inverse-ink"
            >
              <span className="min-w-0 flex-1 truncate">Removed from {removed.name}</span>
              <button
                type="button"
                onClick={undo}
                className="cursor-pointer border-none bg-transparent p-0 text-[12px] font-semibold text-[#9cc68f]"
              >
                Undo
              </button>
            </div>
          )}
          {things.length === 0 ? (
            <p className="m-0 pb-3 pt-1 text-[13px] text-muted">
              Nothing has this label yet. Add it from a thing&apos;s details.
            </p>
          ) : (
            things.map((thing) => (
              <div
                key={thing.id}
                className="flex items-center gap-[10px] border-b border-border/40 py-2 last:border-b-0"
              >
                <span className="h-8 w-8 flex-none rounded-lg" style={{ backgroundImage: thing.stripe }} />
                <Link href={`/items?selected=${thing.id}`} className="min-w-0 flex-1 no-underline">
                  <span className="block truncate text-[13px] font-medium text-ink">{thing.name}</span>
                  <span className="block truncate text-[11px] text-muted">{thing.place}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => untag(thing)}
                  aria-label={`Remove ${initialName} from ${thing.name}`}
                  className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-clay"
                >
                  <span aria-hidden className="material-symbols-rounded text-[16px]">
                    close
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
