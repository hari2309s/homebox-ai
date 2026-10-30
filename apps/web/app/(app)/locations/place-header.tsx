"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toastLocationDeleted, toastLocationUpdated } from "../notifications/use-notifications";
import { reparentPlaceAction } from "../plan-actions";
import { deleteLocationAction, updateLocationAction } from "./actions";

const BAR =
  "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[9px] border border-border bg-card px-3 text-[13px] font-semibold";

export function PlaceHeader({
  id,
  name,
  parentId,
  breadcrumb,
  childCount,
  thingCount,
  moveOptions,
}: {
  id: string;
  name: string;
  parentId: string | null;
  breadcrumb: string;
  childCount: number;
  thingCount: number;
  /** Places this one can move under — excludes itself and its own spots. */
  moveOptions: { id: string; path: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename(formData: FormData) {
    setError(null);
    try {
      await updateLocationAction(formData);
      toastLocationUpdated(String(formData.get("name") ?? ""));
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't rename this place");
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    try {
      await deleteLocationAction(formData);
      toastLocationDeleted(name);
      router.replace("/locations", { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this place");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-accent">{breadcrumb}</span>
        <label className={`${BAR} relative text-ink`}>
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            drive_file_move
          </span>
          Move to
          <select
            aria-label={`Move ${name} to`}
            value={parentId ?? ""}
            disabled={busy}
            onChange={async (event) => {
              setBusy(true);
              setError(null);
              try {
                await reparentPlaceAction(id, event.target.value || null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't move this place");
              } finally {
                setBusy(false);
              }
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">On the plot (top level)</option>
            {moveOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.path}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMode(mode === "rename" ? "view" : "rename")}
          className={`${BAR} text-ink`}
        >
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            edit
          </span>
          Rename
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "delete" ? "view" : "delete")}
          className={`${BAR} text-clay`}
        >
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            delete
          </span>
          Delete
        </button>
      </div>

      {mode === "rename" ? (
        <form key={id} action={rename} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="parentId" value={parentId ?? ""} />
          <input
            name="name"
            defaultValue={name}
            required
            autoFocus
            aria-label="Place name"
            onKeyDown={(event) => event.key === "Escape" && setMode("view")}
            className="min-w-0 flex-1 rounded-[10px] border-2 border-accent bg-card px-3 py-1 font-serif text-[26px] leading-tight text-ink shadow-[0_0_0_3px_var(--color-selected)] outline-none"
          />
          <button
            type="submit"
            className="h-[40px] cursor-pointer rounded-[10px] border-none bg-accent px-4 text-[13px] font-semibold text-on-accent"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="h-[40px] cursor-pointer rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <h2 className="m-0 font-serif text-[30px] font-normal leading-[1.1] text-ink">{name}</h2>
      )}

      {mode === "delete" && (
        <div className="flex flex-col gap-2 rounded-[12px] bg-danger-faint px-[14px] py-3">
          <p className="m-0 text-[13px] leading-snug text-danger">
            <b>Delete &ldquo;{name}&rdquo;?</b>{" "}
            {thingCount > 0
              ? `Its ${thingCount} ${thingCount === 1 ? "thing becomes" : "things become"} unassigned. `
              : ""}
            {childCount > 0
              ? `${childCount} ${childCount === 1 ? "spot inside moves" : "spots inside move"} up to the plot.`
              : ""}
          </p>
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="cursor-pointer rounded-lg border-none bg-[#b0643f] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-ink"
            >
              Keep
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
