export const WIDGETS = [
  "rpm",
  "status",
  "distance",
  "blocks",
  "round",
  "votes",
  "leaderboard",
] as const;
export type Widget = (typeof WIDGETS)[number];
export type Layout = "badge" | "bar" | "panel";
export type Theme = "dark" | "light" | "transparent";
export interface Config {
  layout: Layout;
  theme: Theme;
  accent: string;
  scale: number;
  widgets: Widget[];
  channel: string;
  sound: boolean;
  motion: boolean;
  session: string;
}
export function newSession(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export const DEFAULTS: Omit<Config, "session"> = {
  layout: "badge",
  theme: "dark",
  accent: "#F5BA69",
  scale: 1,
  widgets: [...WIDGETS],
  channel: "",
  sound: false,
  motion: true,
};
export function channelName(value: string): string | null {
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return normalized === "" || /^[a-z0-9_]{1,25}$/.test(normalized)
    ? normalized
    : null;
}
export function readConfig(search: string, session = newSession()): Config {
  const p = new URLSearchParams(search);
  const scale = Number(p.get("scale") ?? 1);
  const widgets = p.has("widgets")
    ? (p.get("widgets") ?? "")
        .split(",")
        .filter((w): w is Widget => WIDGETS.includes(w as Widget))
    : [...WIDGETS];
  return {
    layout: ["badge", "bar", "panel"].includes(p.get("layout") ?? "")
      ? (p.get("layout") as Layout)
      : "badge",
    theme: ["dark", "light", "transparent"].includes(p.get("theme") ?? "")
      ? (p.get("theme") as Theme)
      : "dark",
    accent: /^#?[0-9a-f]{6}$/i.test(p.get("accent") ?? "")
      ? "#" + p.get("accent")!.replace("#", "").toUpperCase()
      : DEFAULTS.accent,
    scale: Number.isFinite(scale)
      ? Math.round(Math.min(1.5, Math.max(0.6, scale)) * 100) / 100
      : 1,
    widgets: [...new Set(widgets)],
    channel: channelName(p.get("channel") ?? "") ?? "",
    sound: p.get("sound") === "1",
    motion: p.get("motion") !== "0",
    session: /^[a-zA-Z0-9_-]{1,64}$/.test(p.get("session") ?? "")
      ? p.get("session")!
      : session,
  };
}
export function overlayUrl(config: Config, href: string): string {
  const current = new URL(href);
  const basePath = current.pathname
    .replace(/(?:index\.html)?$/, "")
    .replace(/\/?$/, "/");
  // Always name the file: IPFS gateways answer a bare overlay/ directory with
  // a file listing instead of serving its index.html.
  const url = new URL(basePath + "overlay/index.html", current.origin);
  const params = new URLSearchParams({
    layout: config.layout,
    theme: config.theme,
    accent: config.accent.slice(1),
    scale: String(config.scale),
    widgets: config.widgets.join(","),
    channel: config.channel,
    sound: config.sound ? "1" : "0",
    motion: config.motion ? "1" : "0",
    session: config.session,
  });
  url.search = params.toString();
  return url.href;
}
export function escapeHtml(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function luminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function accentText(hex: string, theme: Theme): string {
  // Clear backplates are checked against their worst case: pure white footage beneath.
  const foreground = luminance(hex);
  const background = luminance(
    theme === "light"
      ? "#F5EFE4"
      : theme === "transparent"
        ? "#2A2A30"
        : "#202229",
  );
  const contrast =
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05);
  return contrast >= 4.5 ? hex : theme === "light" ? "#80500F" : "#F5BA69";
}
