"use client";

import { importItemsCsvAction } from "./actions/csv-import";
import { ImportForm } from "./import-form";

export function CsvImportForm() {
  return (
    <ImportForm
      action={importItemsCsvAction}
      accept=".csv,text/csv"
      submitLabel="Import items"
      formatMessage={(result) => `Imported ${result.imported} item${result.imported === 1 ? "" : "s"}.`}
    />
  );
}
