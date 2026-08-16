"use client";

import { TapButton } from "@homebox-ai/ui";

export function PrintButton() {
  return (
    <TapButton
      type="button"
      onClick={() => window.print()}
      whileHover={{ scale: 1.02 }}
      className="print:hidden cursor-pointer rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover"
    >
      Print label
    </TapButton>
  );
}
