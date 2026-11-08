import type { Feed, Json, Resource } from "./model.ts";
export const API = "https://api.squeekchain.com/v1";
const PATHS = {
  status: "/status",
  economy: "/economy/state",
  core: "/core",
  stats: "/measurement/stats?range=7d",
} as const;
export function retryDelay(value: string | null, now = Date.now()): number {
  if (!value) return 10_000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(10_000, delay) : 10_000;
}
export class ApiFeed {
  feed: Feed = {
    status: empty(),
    economy: empty(),
    core: empty(),
    stats: empty(),
    offset: 0,
  };
  private listeners = new Set<() => void>();
  private resources = new Map<
    keyof typeof PATHS,
    {
      etag: string | null;
      next: number;
      failures: number;
      busy: boolean;
      controller: AbortController | null;
    }
  >();
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(privateFetch: typeof fetch = fetch) {
    this.fetcher = privateFetch.bind(globalThis);
  }
  private fetcher: typeof fetch;
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  start(): void {
    if (this.timer) return;
    for (const key of Object.keys(PATHS) as (keyof typeof PATHS)[])
      this.resources.set(key, {
        etag: null,
        next: 0,
        failures: 0,
        busy: false,
        controller: null,
      });
    this.tick();
    this.timer = setInterval(() => this.tick(), 500);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const resource of this.resources.values())
      resource.controller?.abort();
    this.resources.clear();
  }
  private tick(): void {
    for (const [key, state] of this.resources)
      if (!state.busy && Date.now() >= state.next) void this.poll(key);
  }
  private async poll(key: keyof typeof PATHS): Promise<void> {
    const state = this.resources.get(key)!;
    state.busy = true;
    const controller = new AbortController();
    state.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let delay = 10_000;
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (state.etag) headers["If-None-Match"] = state.etag;
      const response = await this.fetcher(API + PATHS[key], {
        headers,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-cache",
        referrerPolicy: "no-referrer",
      });
      delay = retryDelay(response.headers.get("Retry-After"));
      if (response.status !== 304 && !response.ok)
        throw new Error(`API returned ${response.status}`);
      const data: Json | null =
        response.status === 304 ? this.feed[key].data : await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error("No valid API data");
      const now = Date.now();
      this.feed[key] = { data, checkedAt: now, error: null };
      state.etag =
        response.status === 304
          ? (response.headers.get("ETag") ?? state.etag)
          : response.headers.get("ETag");
      state.failures = 0;
      if (key === "status" && response.status !== 304) {
        const serverTime = Date.parse(data.generatedAt ?? "");
        if (Number.isFinite(serverTime)) this.feed.offset = serverTime - now;
      }
    } catch (error) {
      if (!this.resources.has(key)) return;
      state.failures++;
      delay = Math.max(
        delay,
        Math.min(120_000, 10_000 * 2 ** Math.min(state.failures - 1, 4)),
      );
      this.feed[key] = {
        ...this.feed[key],
        error:
          error instanceof Error ? error.message : "Connection unavailable",
      };
    } finally {
      clearTimeout(timeout);
      state.busy = false;
      state.next = Date.now() + delay;
      state.controller = null;
      this.listeners.forEach((fn) => fn());
    }
  }
}
function empty(): Resource {
  return { data: null, error: null, checkedAt: 0 };
}
