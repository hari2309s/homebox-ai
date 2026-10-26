import Link from "next/link";

export interface PlanSpot {
  id: string;
  name: string;
  count: number;
}

export interface PlanZone extends PlanSpot {
  children: PlanSpot[];
}

const HOVER = "outline-offset-2 transition-[outline-color] hover:outline hover:outline-2 hover:outline-accent";

function zoneHref(id: string) {
  return `/items?location=${id}`;
}

function GardenFeature({ spot, index }: { spot: PlanSpot; index: number }) {
  const label = `${spot.name.toUpperCase()} · ${spot.count}`;
  const shape = index % 3;

  if (shape === 1) {
    return (
      <Link
        href={zoneHref(spot.id)}
        title={label}
        className={`flex h-[86px] w-[150px] shrink-0 items-center justify-center bg-[#9fc3c9] px-2 text-center font-mono text-[10px] text-[#1f4a4a] no-underline ${HOVER}`}
        style={{ borderRadius: "50% 45% 55% 40%" }}
      >
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  if (shape === 2) {
    return (
      <Link href={zoneHref(spot.id)} title={label} className={`flex shrink-0 flex-col gap-2 rounded-lg no-underline ${HOVER}`}>
        <span className="relative block h-[112px] w-[100px]">
          <span className="absolute left-0 top-0 h-14 w-14 rounded-full bg-[#7fa572] shadow-[8px_10px_14px_-6px_rgba(31,38,34,.35)]" />
          <span className="absolute left-[50px] top-[46px] h-[46px] w-[46px] rounded-full bg-[#f2a3b5] shadow-[8px_10px_14px_-6px_rgba(31,38,34,.35)]" />
          <span className="absolute left-[10px] top-[72px] h-10 w-10 rounded-full bg-[#9fbf90]" />
        </span>
        <span className="max-w-[110px] truncate font-mono text-[10px] text-(--plan-ink)">{label}</span>
      </Link>
    );
  }

  return (
    <Link href={zoneHref(spot.id)} title={label} className={`flex shrink-0 flex-col gap-[6px] rounded-md no-underline ${HOVER}`}>
      <span className="flex gap-[10px]">
        <span className="h-[50px] w-[110px] rounded-md border border-(--plan-bed-line) bg-(--plan-bed)" />
      </span>
      <span className="max-w-[110px] truncate font-mono text-[10px] text-(--plan-ink)">{label}</span>
    </Link>
  );
}

export function SitePlan({ zones, alertZoneIds }: { zones: PlanZone[]; alertZoneIds: Set<string> }) {
  const [house, garden, garage, shed, front, ...extra] = zones;
  const rooms = house ? (house.children.length > 0 ? house.children.slice(0, 6) : [house]) : [];
  const roomRows = rooms.length > 3 ? 2 : 1;

  return (
    <div
      className="relative flex h-full min-h-[440px] flex-col overflow-hidden rounded-[18px] bg-(--plan-ground)"
      style={{ backgroundImage: "radial-gradient(var(--plan-dots) 1px, transparent 1.2px)", backgroundSize: "12px 12px" }}
    >
      {/* Garden strip */}
      <div className="flex min-h-[170px] items-start gap-6 px-6 pb-2 pt-[44px]">
        {garden && (
          <Link
            href={zoneHref(garden.id)}
            className="absolute left-[18px] top-[14px] font-mono text-[11px] text-(--plan-ink) no-underline hover:underline"
          >
            {garden.name.toUpperCase()} · {garden.count}
          </Link>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-6 gap-y-3">
          {garden?.children.slice(0, 5).map((spot, i) => <GardenFeature key={spot.id} spot={spot} index={i} />)}
        </div>
        {shed && (
          <Link
            href={zoneHref(shed.id)}
            title={`${shed.name} · ${shed.count}`}
            className={`relative flex h-[86px] w-[120px] shrink-0 items-end rounded-md border border-(--plan-shed-line) bg-(--plan-shed) p-2 font-mono text-[10px] text-(--plan-shed-ink) no-underline shadow-[8px_10px_18px_-10px_rgba(31,38,34,.35)] ${HOVER}`}
          >
            <span className="truncate">
              {shed.name.toUpperCase()} · {shed.count}
            </span>
            {alertZoneIds.has(shed.id) && <AlertPin />}
          </Link>
        )}
      </div>

      {/* Buildings */}
      <div className="flex flex-1 items-stretch gap-4 px-6 pb-6 pt-4">
        {house && (
          <div className="relative flex min-w-0 max-w-[420px] flex-[3] flex-col">
            <Link
              href={zoneHref(house.id)}
              className="absolute -top-[18px] left-0 font-mono text-[10px] text-(--plan-ink) no-underline hover:underline"
            >
              {house.name.toUpperCase()} · {house.count}
            </Link>
            <div
              className="grid min-h-[200px] flex-1 overflow-hidden rounded-[4px] border-2 border-(--plan-house-line) bg-(--plan-house) shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)]"
              style={{ gridTemplateRows: `repeat(${roomRows}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${Math.min(3, rooms.length)}, minmax(0, 1fr))` }}
            >
              {rooms.map((room, i) => (
                <Link
                  key={room.id}
                  href={zoneHref(room.id)}
                  title={`${room.name} · ${room.count}`}
                  className={`border-b border-r border-(--plan-room-line) p-[10px] font-mono text-[10px] text-body no-underline outline-offset-[-3px] hover:outline hover:outline-2 hover:outline-accent ${
                    i === 0 ? "bg-(--plan-room-hi)" : ""
                  }`}
                >
                  <span className="block truncate">{room.name.toUpperCase()}</span>
                  <b className="font-sans text-[18px] text-ink">{room.count}</b>
                </Link>
              ))}
            </div>
            {alertZoneIds.has(house.id) && <AlertPin />}
          </div>
        )}

        {garage && (
          <Link
            href={zoneHref(garage.id)}
            title={`${garage.name} · ${garage.count}`}
            className={`relative w-[150px] shrink-0 rounded-[4px] border-2 border-(--plan-garage-line) bg-(--plan-garage) p-[10px] font-mono text-[10px] text-(--plan-garage-line) no-underline shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)] ${HOVER}`}
          >
            <span className="block truncate">{garage.name.toUpperCase()}</span>
            <b className="font-sans text-[18px]">{garage.count}</b>
            <span className="absolute -bottom-[3px] left-5 right-5 h-[7px] bg-(--plan-garage-door)" />
            {alertZoneIds.has(garage.id) && <AlertPin />}
          </Link>
        )}

        {extra.length > 0 && (
          <div className="flex w-[120px] shrink-0 flex-col gap-3">
            {extra.map((zone) => (
              <Link
                key={zone.id}
                href={zoneHref(zone.id)}
                title={`${zone.name} · ${zone.count}`}
                className={`relative flex min-h-[70px] flex-1 items-end rounded-md border border-(--plan-shed-line) bg-(--plan-shed) p-2 font-mono text-[10px] text-(--plan-shed-ink) no-underline ${HOVER}`}
              >
                <span className="truncate">
                  {zone.name.toUpperCase()} · {zone.count}
                </span>
                {alertZoneIds.has(zone.id) && <AlertPin />}
              </Link>
            ))}
          </div>
        )}

        <div className="flex-1 self-end rounded-t-sm bg-(--plan-drive)" style={{ minHeight: 80 }} />
      </div>

      {/* Front strip */}
      <div className="flex h-16 shrink-0 items-center border-t border-border bg-(--plan-front) px-[18px]">
        {front ? (
          <Link href={zoneHref(front.id)} className="font-mono text-[10px] text-muted no-underline hover:underline">
            {front.name.toUpperCase()} · {front.count}
          </Link>
        ) : (
          <span className="font-mono text-[10px] text-muted">FRONT · STREET</span>
        )}
      </div>
    </div>
  );
}

function AlertPin() {
  return (
    <span className="absolute -right-[13px] top-1/3 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#b0643f] font-mono text-[12px] text-white shadow-[0_0_0_3px_#fff]">
      !
    </span>
  );
}
