import type { Config, Widget } from "./config.ts";
import { accentText, escapeHtml } from "./config.ts";
import { hamsterLogo, icon, wheelArt } from "./art.ts";
import { countdown, number } from "./model.ts";
import type { Snapshot } from "./model.ts";
import type { ChatGame } from "./game.ts";
import type { ChatStatus } from "./chat.ts";
export interface OverlayState {
  snapshot: Snapshot;
  game: ChatGame | null;
  chatStatus: ChatStatus;
  calloutUntil: number;
  demo?: boolean;
  soundReady: boolean;
}
export class WheelOverlay {
  element: HTMLElement;
  private config: Config;
  private preview: boolean;
  private previousHeight: bigint | null = null;
  private previousInstallation: string | null = null;
  private popUntil = 0;
  private observer: ResizeObserver;
  private onCheer: () => void;
  constructor(
    element: HTMLElement,
    config: Config,
    preview: boolean,
    onCheer: () => void,
    onSound: () => void,
  ) {
    this.element = element;
    this.config = config;
    this.preview = preview;
    this.onCheer = onCheer;
    element.innerHTML = `<section class="overlay-surface" aria-label="Squeektoshi live wheel">
      <header class="overlay-head"><span class="overlay-name">${hamsterLogo()}Squeektoshi</span><span class="hamster-state" data-widget="status"><span class="status-dot"></span><span data-value="state">Unknown</span></span></header>
      <div class="wheel-row" data-wheel-row><div class="wheel-wrap">${wheelArt()}</div><div class="rpm-block" data-widget="rpm"><div class="rpm-reading"><span class="pixel-number" data-value="rpm">unknown</span><span class="rpm-unit">RPM</span></div><div class="rpm-meter" role="meter" aria-label="Wheel speed" aria-valuemin="0" aria-valuemax="120"><span></span></div><span class="rpm-caption" data-value="rpm-caption">Waiting for the wheel</span></div></div>
      <div class="overlay-metrics"><div class="overlay-metric" data-widget="distance"><span>Today’s distance</span><strong><span class="pixel-number" data-value="distance">unknown</span> <small data-value="distance-unit">m</small></strong><span class="metric-note">UTC · completed rounds</span></div><div class="overlay-metric block-metric" data-widget="blocks"><span>Squeek height</span><strong class="pixel-number" data-value="height">unknown</strong><span class="metric-note">Confirmed blocks</span></div></div>
      <div class="round-widget" data-widget="round"><div class="round-top"><span>Round <span data-value="round-id">unknown</span></span><span class="pixel-number" data-value="countdown">unknown</span></div><div class="round-track"><span></span></div></div>
      <section class="vote-widget" data-widget="votes"><div class="vote-title"><strong>Run or snooze?</strong><span data-value="vote-total">0 votes</span></div><div class="vote-labels"><span><b>!run</b> <span data-value="run">0</span></span><span><span data-value="sleep">0</span> <b>!sleep</b></span></div><div class="vote-track" role="img" aria-label="No votes yet"><span></span></div><p class="vote-hint" data-value="vote-hint">Vote in Twitch chat</p></section>
      <section class="leaderboard-widget" data-widget="leaderboard"><div class="leaderboard-title">${icon("star")}<strong>Session top 10</strong></div><ol class="leaderboard-list"></ol><p class="leaderboard-empty">Your first correct prediction starts the board.</p></section>
      <footer class="overlay-footer"><span class="status-dot"></span><span data-value="connection">Connecting to Squeekchain</span><span class="overlay-credit">Wheel Cheer</span></footer>
      <div class="overlay-notices" hidden><div class="cheer-pop" hidden role="status"><span class="pop-sparkles" aria-hidden="true">✦</span><strong data-value="cheer">New Squeek block!</strong><span class="confetti" aria-hidden="true">${"<i></i>".repeat(6)}</span></div>
      <div class="result-pop" hidden role="status"><span class="result-icon" aria-hidden="true">${icon("star")}</span><strong data-value="result-title"></strong><span data-value="result-detail"></span></div>
      <div class="squeek-callout" hidden role="status">${hamsterLogo()}<div><strong>A little wheel check!</strong><span data-value="callout"></span></div></div>
    </div></section><button type="button" class="enable-sound" hidden>${icon("volume")}Enable sound</button>`;
    element.querySelector(".enable-sound")!.addEventListener("click", onSound);
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(element.parentElement!);
    this.observer.observe(element.querySelector(".overlay-surface")!);
    this.configure(config);
  }
  configure(config: Config): void {
    this.config = config;
    this.element.className = `wheel-overlay layout-${config.layout} theme-${config.theme}${this.preview ? " is-preview" : ""}`;
    this.element.style.setProperty("--overlay-accent", config.accent);
    this.element.style.setProperty(
      "--overlay-accent-text",
      accentText(config.accent, config.theme),
    );
    this.element.dataset.motion = String(config.motion);
    for (const node of this.element.querySelectorAll<HTMLElement>(
      "[data-widget]",
    )) {
      const widget = node.dataset.widget as Widget;
      node.hidden =
        !config.widgets.includes(widget) ||
        ((widget === "votes" || widget === "leaderboard") && !config.channel);
    }
    (this.element.querySelector(".overlay-metrics") as HTMLElement).hidden =
      !config.widgets.includes("distance") &&
      !config.widgets.includes("blocks");
    this.fit();
  }
  update(state: OverlayState): void {
    const { snapshot: s, game } = state;
    const text = (key: string, value: string) => {
      const el = this.element.querySelector(`[data-value="${key}"]`)!;
      if (el.textContent !== value) el.textContent = value;
    };
    text("state", s.state);
    text("rpm", number(s.rpm, 1));
    text(
      "rpm-caption",
      s.online
        ? s.state === "Running"
          ? "Go, little guy. Go!"
          : s.state === "Sleeping"
            ? "A well-earned wheel break"
            : "Wheel status unknown"
        : "Waiting for a fresh reading",
    );
    text("distance", number(s.distance, 1));
    text("height", number(s.height));
    text("round-id", number(s.round));
    text("countdown", countdown(s));
    text("connection", state.demo ? "Demo data · preview only" : s.reason);
    this.element.dataset.state = s.state.toLowerCase();
    this.element.dataset.online = String(s.online);
    this.element.dataset.spinning = String(
      s.online && s.state === "Running" && s.rpm !== null && s.rpm > 0,
    );
    for (const key of ["rpm", "distance", "height", "countdown"])
      this.element
        .querySelector(`[data-value="${key}"]`)!
        .classList.toggle(
          "is-unknown",
          this.element.querySelector(`[data-value="${key}"]`)!.textContent ===
            "unknown",
        );
    this.element.style.setProperty(
      "--wheel-duration",
      `${s.rpm !== null && s.rpm > 0 ? 60 / s.rpm : 60}s`,
    );
    this.element.style.setProperty(
      "--paw-duration",
      `${s.rpm !== null && s.rpm > 0 ? Math.max(0.12, 15 / s.rpm) : 2}s`,
    );
    const gauge = this.element.querySelector(".rpm-meter")!;
    if (s.rpm === null) {
      gauge.removeAttribute("aria-valuenow");
      gauge.setAttribute("aria-valuetext", "Unknown");
    } else {
      gauge.setAttribute("aria-valuenow", String(Math.min(s.rpm, 120)));
      gauge.setAttribute("aria-valuetext", `${number(s.rpm, 1)} RPM`);
    }
    (gauge.firstElementChild as HTMLElement).style.transform =
      `scaleX(${s.rpm === null ? 0 : Math.min(s.rpm / 120, 1)})`;
    (
      this.element.querySelector(".round-track span") as HTMLElement
    ).style.transform =
      `scaleX(${s.roundEndsAt === null ? 0 : Math.max(0, Math.min(1, (s.roundEndsAt - s.now) / 600_000))})`;
    if (
      s.installation !== null &&
      this.previousInstallation !== s.installation
    ) {
      this.previousHeight = null;
      this.previousInstallation = s.installation;
    }
    if (s.height !== null) {
      if (this.previousHeight !== null && s.height > this.previousHeight) {
        this.cheer(false);
        this.onCheer();
      }
      this.previousHeight = s.height;
    }
    if (configHas(this.config, "votes")) {
      const votes = state.demo
        ? { run: 8, sleep: 3 }
        : (game?.counts() ?? { run: 0, sleep: 0 });
      const total = votes.run + votes.sleep;
      text("run", String(votes.run));
      text("sleep", String(votes.sleep));
      text("vote-total", `${total} ${total === 1 ? "vote" : "votes"}`);
      (
        this.element.querySelector(".vote-track span") as HTMLElement
      ).style.transform = `scaleX(${total ? votes.run / total : 0.5})`;
      this.element
        .querySelector(".vote-track")!
        .setAttribute(
          "aria-label",
          `${votes.run} run votes, ${votes.sleep} sleep votes`,
        );
      const status = state.demo
        ? "Demo votes"
        : state.chatStatus === "connected"
          ? s.round === null
            ? "Round unknown · votes paused"
            : `Vote in #${this.config.channel} · last vote counts`
          : state.chatStatus === "unavailable"
            ? "Chat unavailable · retrying"
            : state.chatStatus === "reconnecting"
              ? "Chat reconnecting"
              : "Connecting to Twitch chat";
      text(
        "vote-hint",
        game?.pending() ? `${status} · result pending` : status,
      );
    }
    const scores = state.demo ? [] : (game?.top() ?? []);
    const board = this.element.querySelector(".leaderboard-list")!;
    const markup = scores
      .map(
        (score, index) =>
          `<li><span class="rank">${index + 1}</span><bdi>${escapeHtml(score.name)}</bdi><strong class="pixel-number">${number(score.correct)}</strong></li>`,
      )
      .join("");
    if (board.innerHTML !== markup) board.innerHTML = markup;
    (this.element.querySelector(".leaderboard-empty") as HTMLElement).hidden =
      scores.length > 0;
    const reveal = game?.reveal;
    const showResult = !!reveal && s.now - reveal.at < 10_000;
    (this.element.querySelector(".result-pop") as HTMLElement).hidden =
      !showResult;
    if (reveal) {
      text(
        "result-title",
        `Round ${number(reveal.round)}: ${reveal.result === "run" ? "He ran!" : "Snooze wins!"}`,
      );
      text(
        "result-detail",
        `${reveal.correct} correct ${reveal.correct === 1 ? "chatter" : "chatters"} · +1 cheer each`,
      );
    }
    (this.element.querySelector(".cheer-pop") as HTMLElement).hidden =
      Date.now() > this.popUntil;
    (this.element.querySelector(".squeek-callout") as HTMLElement).hidden =
      Date.now() > state.calloutUntil;
    text(
      "callout",
      `${number(s.rpm, 1)} RPM · Squeek height ${number(s.height)}`,
    );
    (this.element.querySelector(".enable-sound") as HTMLButtonElement).hidden =
      !this.config.sound || state.soundReady || this.preview;
    (this.element.querySelector(".overlay-notices") as HTMLElement).hidden =
      !Array.from(
        this.element.querySelector(".overlay-notices")!.children,
      ).some((node) => !(node as HTMLElement).hidden);
    this.fit();
  }
  cheer(test = true): void {
    this.popUntil = Date.now() + 3000;
    const popup = this.element.querySelector(".cheer-pop") as HTMLElement;
    this.element.querySelector('[data-value="cheer"]')!.textContent = test
      ? "A little test cheer!"
      : "New Squeek block!";
    popup.hidden = false;
    (this.element.querySelector(".overlay-notices") as HTMLElement).hidden =
      false;
    popup.classList.remove("popping");
    void popup.offsetWidth;
    popup.classList.add("popping");
  }
  fit(): void {
    const parent = this.element.parentElement;
    const surface = this.element.querySelector(
      ".overlay-surface",
    ) as HTMLElement;
    if (!parent || !surface) return;
    const width = surface.offsetWidth,
      height = Math.max(surface.offsetHeight, this.element.offsetHeight);
    const inset = this.preview ? 20 : 24;
    const desired = this.preview
      ? (this.config.layout === "badge"
          ? 0.9
          : this.config.layout === "panel"
            ? 0.8
            : 1) * this.config.scale
      : this.config.scale;
    const scale = Math.max(
      0.1,
      Math.min(
        desired,
        (parent.clientWidth - inset * 2) / width,
        (parent.clientHeight - inset * 2) / height,
      ),
    );
    this.element.style.setProperty("--render-scale", String(scale));
  }
  destroy(): void {
    this.observer.disconnect();
  }
}
function configHas(config: Config, widget: Widget): boolean {
  return config.widgets.includes(widget);
}
