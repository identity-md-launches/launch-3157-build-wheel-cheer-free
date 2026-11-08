export type Json = Record<string, any>;
export interface Resource {
  data: Json | null;
  error: string | null;
  checkedAt: number;
}
export interface Feed {
  status: Resource;
  economy: Resource;
  core: Resource;
  stats: Resource;
  offset: number;
}
export interface Snapshot {
  online: boolean;
  reason: string;
  rpm: number | null;
  speed: number | null;
  sampleDistance: number | null;
  work: bigint | null;
  state: "Running" | "Sleeping" | "Unknown";
  distance: number | null;
  height: bigint | null;
  blockProgress: number | null;
  round: number | null;
  roundEndsAt: number | null;
  settledThrough: number | null;
  installation: string | null;
  now: number;
}
export function integer(value: unknown): bigint | null {
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  if (
    typeof value !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(value) ||
    value.length > 78
  )
    return null;
  return BigInt(value);
}
export function finite(value: unknown): number | null {
  const big = integer(value);
  return big !== null && big <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(big)
    : null;
}
export function usable(
  resource: Resource,
  now: number,
  ttl = 120_000,
): Json | null {
  return resource.data && !resource.error && now - resource.checkedAt <= ttl
    ? resource.data
    : null;
}
export function makeSnapshot(feed: Feed, clientNow = Date.now()): Snapshot {
  const now = clientNow + feed.offset;
  const status = usable(feed.status, clientNow);
  const measurement = status?.measurement;
  const observed = Date.parse(measurement?.observedAt ?? "");
  const expiry =
    Math.min(120, finite(measurement?.staleAfterSeconds) ?? 120) * 1000;
  const online =
    !!status &&
    measurement?.freshness === "online" &&
    measurement?.coreStatus !== "COUNTER_FAULT" &&
    Number.isFinite(observed) &&
    now - observed <= expiry &&
    now - observed >= -30_000;
  const blank: Snapshot = {
    online: false,
    reason: feed.status.error
      ? "Connection lost · retrying"
      : status
        ? measurement?.coreStatus === "COUNTER_FAULT"
          ? "Wheel counter unavailable"
          : "Measurement unavailable"
        : "Connecting to Squeekchain",
    rpm: null,
    speed: null,
    sampleDistance: null,
    work: null,
    state: "Unknown",
    distance: null,
    height: null,
    blockProgress: null,
    round: null,
    roundEndsAt: null,
    settledThrough: null,
    installation: status?.installationId ?? null,
    now,
  };
  if (!online) return blank;
  const rpmMilli = finite(measurement.rpmMilli);
  const rpm = rpmMilli === null ? null : rpmMilli / 1000;
  const state =
    measurement.coreStatus === "ACTIVE"
      ? "Running"
      : measurement.coreStatus === "IDLE"
        ? "Sleeping"
        : "Unknown";
  const anchor =
    status?.builder?.status === "available" ? status.builder.anchor : null;
  const units = integer(anchor?.cumulativeBlockUnits);
  // Integer arithmetic preserves height even beyond JavaScript's safe integer range.
  const height =
    units !== null ? units / 1_000_000_000n : integer(anchor?.blockHeight);
  const progress =
    units === null ? null : Number(units % 1_000_000_000n) / 1_000_000_000;
  const core = usable(feed.core, clientNow);
  const economy = usable(feed.economy, clientNow);
  const genesis =
    core?.status === "available" &&
    core.installationId === status?.installationId
      ? finite(core.configuration?.genesisTimestamp)
      : null;
  const duration = finite(core?.configuration?.roundDuration);
  const economyRound =
    economy?.status === "available" &&
    (!economy.installationId ||
      economy.installationId === status?.installationId)
      ? finite(
          economy.lifecycle?.currentRound ??
            economy.capabilities?.core?.currentRound,
        )
      : null;
  const round =
    genesis !== null &&
    duration === 600 &&
    now >= genesis * 1000 &&
    economyRound !== null
      ? Math.floor((now / 1000 - genesis) / 600) + 1
      : null;
  const roundEndsAt =
    round !== null && genesis !== null ? (genesis + round * 600) * 1000 : null;
  const stats = usable(feed.stats, clientNow);
  const today = new Date(now).toISOString().slice(0, 10);
  const day = Array.isArray(stats?.activity?.days)
    ? stats.activity.days.find((day: Json) => day?.date === today)
    : null;
  const distanceMm =
    day?.coverage?.coverageBps === 10000 &&
    (!stats?.installationId || stats.installationId === status?.installationId)
      ? finite(day.distanceMm)
      : null;
  return {
    ...blank,
    online: true,
    reason: "Squeekchain connected",
    rpm,
    state,
    speed: finite(measurement.speedMmPerSecond),
    sampleDistance: finite(measurement.distanceMm),
    work: integer(measurement.cumulativeWorkUnits),
    distance: distanceMm === null ? null : distanceMm / 1000,
    height,
    blockProgress: progress,
    round,
    roundEndsAt,
    settledThrough: finite(anchor?.settledThroughRound),
  };
}
export function countdown(snapshot: Snapshot): string {
  if (snapshot.roundEndsAt === null) return "unknown";
  const seconds = Math.max(
    0,
    Math.ceil((snapshot.roundEndsAt - snapshot.now) / 1000),
  );
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export const number = (value: number | bigint | null, digits = 0): string =>
  value === null
    ? "unknown"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
