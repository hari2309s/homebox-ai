import Link from "next/link";

import { describeWeather, type ForecastDay, type WeatherAlert, type WeatherAlertKind } from "../../../lib/weather";

export type MaintainWeather =
  | { status: "no-location" }
  | { status: "unavailable"; placeName: string }
  | {
      status: "ok";
      placeName: string;
      current: { tempC: number; code: number } | null;
      days: ForecastDay[];
      alerts: WeatherAlert[];
    };

const ALERT_ICON: Record<WeatherAlertKind, string> = {
  frost: "ac_unit",
  rain: "rainy",
  wind: "air",
  heat: "thermostat",
  dry: "wb_sunny",
};

const ALERT_TONE: Record<WeatherAlertKind, string> = {
  frost: "bg-surface-soft text-[#5b7fa6]",
  rain: "bg-surface-soft text-[#5b7fa6]",
  wind: "bg-surface-soft text-body",
  heat: "bg-danger-soft text-danger",
  dry: "bg-warn-soft text-warn",
};

function dayLabel(dateKey: string, index: number): string {
  if (index === 0) return "Today";
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(y!, m! - 1, d!));
}

function alertWhen(alert: WeatherAlert, days: ForecastDay[]): string {
  const index = days.findIndex((d) => d.date === alert.date);
  if (index === 0) return "TODAY";
  if (index === 1) return "TOMORROW";
  return `FROM ${dayLabel(alert.date, index).toUpperCase()}`;
}

/** The home's forecast and what to do about it, at the top of Maintain. */
export function WeatherCard({ weather }: { weather: MaintainWeather }) {
  if (weather.status === "no-location") {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-border px-4 py-3">
        <span aria-hidden className="material-symbols-rounded text-[22px] text-accent">
          partly_cloudy_day
        </span>
        <p className="m-0 flex-1 text-[13px] leading-snug text-muted">
          Add where your home is to see the forecast here and get care suggestions that work around the weather.
        </p>
        <Link
          href="/settings/household"
          className="flex-none rounded-[9px] border border-border bg-card px-3 py-[6px] text-[13px] font-semibold text-ink no-underline"
        >
          Set location
        </Link>
      </div>
    );
  }

  if (weather.status === "unavailable") {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3 text-[13px] text-muted">
        <span aria-hidden className="material-symbols-rounded text-[20px]">
          cloud_off
        </span>
        Couldn&apos;t reach the weather service for {weather.placeName}. Suggestions won&apos;t include the forecast for
        now.
      </div>
    );
  }

  const { placeName, current, days, alerts } = weather;
  const week = days.slice(0, 7);
  const now = current ? describeWeather(current.code) : null;

  return (
    <section
      aria-label={`Weather for ${placeName}`}
      className="flex flex-col rounded-[14px] border border-border bg-card"
    >
      <div className="flex items-center gap-3 border-b border-border/60 px-[14px] py-3">
        {now && current && (
          <span className="flex items-center gap-[6px]">
            <span aria-hidden className="material-symbols-rounded text-[26px] text-accent">
              {now.icon}
            </span>
            <span className="font-serif text-[24px] leading-none text-ink">{Math.round(current.tempC)}°</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] text-muted">WEATHER AT HOME</span>
          <span className="block truncate text-[13px] text-body">
            {now ? `${now.label} · ` : ""}
            {placeName}
          </span>
        </span>
        <Link href="/settings/household" className="font-mono text-[10px] text-muted no-underline hover:text-ink">
          CHANGE
        </Link>
      </div>

      <ol className="no-scrollbar m-0 flex list-none gap-1 overflow-x-auto px-2 py-2">
        {week.map((d, i) => {
          const w = describeWeather(d.code);
          return (
            <li
              key={d.date}
              title={`${w.label}, ${Math.round(d.minC)}–${Math.round(d.maxC)}°C, ${d.rainMm.toFixed(1)} mm`}
              className={`flex min-w-[58px] flex-1 flex-col items-center gap-[2px] rounded-[10px] px-1 py-2 ${i === 0 ? "bg-selected-soft" : ""}`}
            >
              <span className="font-mono text-[10px] text-muted">{dayLabel(d.date, i).toUpperCase()}</span>
              <span aria-hidden className="material-symbols-rounded text-[22px] text-body">
                {w.icon}
              </span>
              <span className="text-[13px] font-semibold text-ink">{Math.round(d.maxC)}°</span>
              <span className="text-[11px] text-muted">{Math.round(d.minC)}°</span>
              <span className={`font-mono text-[9px] ${d.rainMm >= 1 ? "text-[#5b7fa6]" : "text-transparent"}`}>
                {d.rainMm >= 1 ? `${Math.round(d.rainMm)}MM` : "0"}
              </span>
            </li>
          );
        })}
      </ol>

      {alerts.length > 0 && (
        <ul aria-label="Weather to plan for" className="m-0 flex list-none flex-col border-t border-border/60 p-0">
          {alerts.map((alert) => (
            <li
              key={alert.kind}
              className="flex items-start gap-3 border-b border-border/40 px-[14px] py-[10px] last:border-b-0"
            >
              <span
                aria-hidden
                className={`material-symbols-rounded flex h-8 w-8 flex-none items-center justify-center rounded-full ${ALERT_TONE[alert.kind]}`}
                style={{ fontSize: 18 }}
              >
                {ALERT_ICON[alert.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-semibold text-ink">{alert.title}</span>
                  <span className="font-mono text-[10px] text-muted">{alertWhen(alert, days)}</span>
                </span>
                <span className="block text-[13px] leading-snug text-body">{alert.tip}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The forecast note the assistant attached to a suggestion. */
export function WeatherNote({ note }: { note: string }) {
  return (
    <span className="flex items-start gap-[6px] rounded-[9px] bg-surface-soft px-[9px] py-[6px] text-[12px] leading-snug text-body">
      <span aria-hidden className="material-symbols-rounded text-[15px] text-[#5b7fa6]">
        partly_cloudy_day
      </span>
      {note}
    </span>
  );
}
