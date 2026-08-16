import { describe, expect, it } from "vitest";

import { escapeCsvFormula, parseCsv, toCsv, unescapeCsvFormula } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF", () => {
    expect(toCsv(["name", "quantity"], [["Fridge", "1"]])).toBe("name,quantity\r\nFridge,1");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv(["name"], [["Bought at IKEA, love it"]])).toBe('name\r\n"Bought at IKEA, love it"');
    expect(toCsv(["name"], [['12" monitor']])).toBe('name\r\n"12"" monitor"');
    expect(toCsv(["name"], [["line one\nline two"]])).toBe('name\r\n"line one\nline two"');
  });

  it("leaves plain fields unquoted", () => {
    expect(toCsv(["name"], [["Fridge"]])).toBe("name\r\nFridge");
  });

  it("neutralizes a formula-injection attempt in a cell", () => {
    // Without the leading quote, Excel/Sheets would execute this as a formula
    // (e.g. exfiltrating data via a web request) as soon as the file is opened.
    expect(toCsv(["name"], [["=cmd|calc!A1"]])).toBe("name\r\n'=cmd|calc!A1");
    expect(toCsv(["name"], [["+1"]])).toBe("name\r\n'+1");
    expect(toCsv(["name"], [["-1"]])).toBe("name\r\n'-1");
    expect(toCsv(["name"], [["@SUM(1+1)"]])).toBe("name\r\n'@SUM(1+1)");
  });
});

describe("escapeCsvFormula / unescapeCsvFormula", () => {
  it("prefixes only values starting with a formula-trigger character", () => {
    expect(escapeCsvFormula("=1+1")).toBe("'=1+1");
    expect(escapeCsvFormula("Fridge")).toBe("Fridge");
    expect(escapeCsvFormula("")).toBe("");
  });

  it("round-trips a formula-triggering value losslessly", () => {
    const original = "=1+1";
    expect(unescapeCsvFormula(escapeCsvFormula(original))).toBe(original);
  });

  it("leaves a genuine user-typed leading apostrophe alone", () => {
    // Only strips the prefix when it was our own safety marker (apostrophe
    // immediately followed by a formula-trigger character) — a real name
    // like "'Twas the Night" must survive re-import unchanged.
    expect(unescapeCsvFormula("'Twas the Night")).toBe("'Twas the Night");
  });
});

describe("parseCsv", () => {
  it("parses plain comma-separated rows", () => {
    expect(parseCsv("name,quantity\r\nFridge,1")).toEqual([
      ["name", "quantity"],
      ["Fridge", "1"],
    ]);
  });

  it("parses a quoted field containing a comma", () => {
    expect(parseCsv('name\r\n"Bought at IKEA, love it"')).toEqual([["name"], ["Bought at IKEA, love it"]]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsv('name\r\n"12"" monitor"')).toEqual([["name"], ['12" monitor']]);
  });

  it("preserves a newline embedded inside a quoted field", () => {
    expect(parseCsv('name\r\n"line one\nline two"')).toEqual([["name"], ["line one\nline two"]]);
  });

  it("handles bare LF line endings, not just CRLF", () => {
    expect(parseCsv("name,quantity\nFridge,1\nLamp,2")).toEqual([
      ["name", "quantity"],
      ["Fridge", "1"],
      ["Lamp", "2"],
    ]);
  });

  it("includes a final row with no trailing newline", () => {
    expect(parseCsv("name\r\nFridge")).toEqual([["name"], ["Fridge"]]);
  });

  it("round-trips through toCsv", () => {
    const headers = ["name", "notes"];
    const rows = [
      ["Fridge", 'Has a "dent", still works'],
      ["Lamp", "line one\nline two"],
    ];
    expect(parseCsv(toCsv(headers, rows))).toEqual([headers, ...rows]);
  });
});
