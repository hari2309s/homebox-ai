import { describe, expect, it } from "vitest";

import { describeWeather, forecastForPrompt, weatherAlerts, type ForecastDay } from "./weather";

function day(date: string, overrides: Partial<ForecastDay> = {}): ForecastDay {
  return { date, code: 1, maxC: 15, minC: 7, rainMm: 2, rainChance: 40, windKmh: 20, ...overrides };
}

const week = (overrides: Partial<ForecastDay> = {}) =>
  Array.from({ length: 7 }, (_, i) => day(`2026-11-0${i + 1}`, overrides));

describe("weatherAlerts", () => {
  it("is quiet for ordinary weather", () => {
    expect(weatherAlerts(week())).toEqual([]);
  });

  it("dates each alert to the first day it hits", () => {
    const days = week();
    days[2] = day("2026-11-03", { minC: -1 });
    days[4] = day("2026-11-05", { rainMm: 22 });
    days[5] = day("2026-11-06", { windKmh: 64 });
    const alerts = weatherAlerts(days);
    expect(alerts.map((a) => [a.kind, a.date])).toEqual([
      ["frost", "2026-11-03"],
      ["rain", "2026-11-05"],
      ["wind", "2026-11-06"],
    ]);
    expect(alerts[1]!.title).toContain("22 mm");
  });

  it("calls out a hard frost with the coldest temperature", () => {
    const days = week();
    days[1] = day("2026-11-02", { minC: -0.5 });
    days[3] = day("2026-11-04", { minC: -5.4 });
    expect(weatherAlerts(days)[0]!.title).toBe("Hard frost, down to -5°C");
  });

  it("spots a warm dry week, but not a cool one", () => {
    expect(weatherAlerts(week({ rainMm: 0, maxC: 24 })).map((a) => a.kind)).toEqual(["dry"]);
    expect(weatherAlerts(week({ rainMm: 0, maxC: 12 }))).toEqual([]);
  });

  it("flags heat", () => {
    expect(weatherAlerts([day("2026-07-01", { maxC: 33 })]).map((a) => a.kind)).toEqual(["heat"]);
  });
});

describe("describeWeather", () => {
  it("maps WMO codes to labels", () => {
    expect(describeWeather(0).label).toBe("Clear");
    expect(describeWeather(63).icon).toBe("rainy");
    expect(describeWeather(75).label).toBe("Snow");
    expect(describeWeather(96).label).toBe("Thunderstorms");
  });
});

describe("forecastForPrompt", () => {
  it("lists every day and the notable weather", () => {
    const days = week();
    days[0] = day("2026-11-01", { minC: -2 });
    const text = forecastForPrompt("Leeds, England", { current: null, days });
    expect(text).toContain("Home: Leeds, England");
    expect(text).toContain("2026-11-07:");
    expect(text).toContain("Notable weather:\n- 2026-11-01: Frost on the way");
  });
});
