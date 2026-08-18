"use client";

import { importZipAction } from "./actions/zip-import";
import { ImportForm } from "./import-form";

export function ZipImportForm() {
  return (
    <ImportForm
      action={importZipAction}
      accept=".zip,application/zip"
      submitLabel="Import backup"
      formatMessage={(result) =>
        `Added ${result.items} item${result.items === 1 ? "" : "s"}, ${result.locations} location${result.locations === 1 ? "" : "s"}, ${result.labels} label${result.labels === 1 ? "" : "s"}, ${result.maintenanceEntries} maintenance entr${result.maintenanceEntries === 1 ? "y" : "ies"}, and ${result.attachments} attachment${result.attachments === 1 ? "" : "s"}.`
      }
    />
  );
}
