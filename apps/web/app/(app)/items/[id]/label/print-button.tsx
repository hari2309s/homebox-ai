"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden cursor-pointer rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover"
    >
      Print label
    </button>
  );
}
