"use client";

import { Input, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { createLabelAction } from "./actions";

const SWATCHES = [
  "#3f6b45",
  "#d9a43a",
  "#3f8a8a",
  "#c7708a",
  "#b0643f",
  "#8a7bb5",
  "#5b7fa6",
  "#7a5a3f",
];

export function AddLabelForm({ nextColor }: { nextColor: string }) {
  const [color, setColor] = useState(() =>
    SWATCHES.includes(nextColor) ? nextColor : SWATCHES[0]!,
  );

  return (
    <form action={createLabelAction} className="flex flex-col gap-2">
      <div className="font-mono text-[10px] text-muted">NEW LABEL</div>
      <div className="grid grid-cols-[1fr_44px] gap-[6px]">
        <Input name="name" placeholder="e.g. Outdoor" required />
        <input type="hidden" name="color" value={color} />
        <SubmitButton className="!rounded-[10px] !px-0">
          <span className="material-symbols-rounded text-[18px]">add</span>
        </SubmitButton>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-body">Colour</span>
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setColor(swatch)}
            aria-label={`Color ${swatch}`}
            className="h-[22px] w-[22px] shrink-0 cursor-pointer rounded-full border-none p-0"
            style={{
              background: swatch,
              boxShadow:
                swatch === color
                  ? "0 0 0 2px #fff, 0 0 0 4px #1f2622"
                  : "none",
            }}
          />
        ))}
      </div>
    </form>
  );
}
