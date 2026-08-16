// Spreadsheet apps (Excel, Google Sheets, LibreOffice) treat a cell starting
// with one of these as a formula, not literal text — so a value like
// `=HYPERLINK(...)` in a user-controlled field (item name, notes, a shared
// household member's input, ...) would execute for whoever opens the
// exported file. Prefixing with a single quote is the standard mitigation:
// every one of those apps renders a leading `'` as "force text" and drops it
// from what's displayed, without it becoming part of the cell's real value.
const FORMULA_TRIGGER_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function escapeCsvFormula(value: string): string {
  return FORMULA_TRIGGER_CHARS.has(value.charAt(0)) ? `'${value}` : value;
}

/** Reverses escapeCsvFormula — strips a safety prefix this app added, not a genuine user-typed leading apostrophe. */
export function unescapeCsvFormula(value: string): string {
  return value.charAt(0) === "'" && FORMULA_TRIGGER_CHARS.has(value.charAt(1)) ? value.slice(1) : value;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvFormula).map(csvEscape).join(",")).join("\r\n");
}

// Minimal RFC4180 parser: handles quoted fields with embedded commas,
// newlines, and escaped ("") quotes — enough to round-trip what toCsv above
// produces, and to tolerate a typical spreadsheet-exported CSV.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip — paired \n (if any) closes the row below
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
