import type { Config, Layout, Theme, Widget } from "./config.ts";
import {
  channelName,
  escapeHtml,
  newSession,
  overlayUrl,
  WIDGETS,
} from "./config.ts";
import { hamsterLogo, icon, sceneArt } from "./art.ts";
import type { Snapshot } from "./model.ts";
import type { ChatStatus } from "./chat.ts";
interface Hooks {
  onChange(config: Config): void;
  onDemo(value: boolean): void;
  onCheer(): void;
}
const widgetLabels: Record<Widget, string> = {
  rpm: "Live RPM",
  status: "Running / sleeping",
  distance: "Today’s distance",
  blocks: "Squeek height",
  round: "Round countdown",
  votes: "Chat predictions",
  leaderboard: "Session top 10",
};
const swatches = [
  ["Amber", "#F5BA69"],
  ["Mint", "#A4D9BD"],
  ["Lilac", "#BCADF0"],
  ["Rose", "#EEA7AB"],
];
export class SetupPage {
  private root: HTMLElement;
  private config: Config;
  private hooks: Hooks;
  private copying = false;
  constructor(root: HTMLElement, config: Config, hooks: Hooks) {
    this.root = root;
    this.config = { ...config, widgets: [...config.widgets] };
    this.hooks = hooks;
    this.render();
    this.bind();
    this.updateUrl();
  }
  private render(): void {
    this.root.innerHTML = `<a class="skip-link" href="#studio">Skip to overlay setup</a>
    <header class="site-header"><a class="brand" href="./" aria-label="Wheel Cheer home">${hamsterLogo()}<span>Wheel<span class="brand-accent">Cheer</span></span></a><nav aria-label="Main navigation"><a href="#studio" class="nav-active">Overlay studio</a><a href="#obs-instructions">How to add it ${icon("arrow")}</a></nav><span class="free-note">${icon("heart")}Free to stream</span></header>
    <main>
      <section class="intro"><div><h1>Your stream’s <span>little sidekick.</span></h1><p>A free, live hamster overlay for OBS and Streamlabs.</p></div><div class="intro-aside">${icon("wheel")}<span>Powered by a real hamster.<br><strong>Cheered on by your chat.</strong></span></div></section>
      <section class="studio" id="studio" aria-label="Overlay studio">
        <div class="preview-column">
          <section class="preview-panel" aria-labelledby="preview-heading"><div class="preview-toolbar"><h2 id="preview-heading"><span class="preview-dot"></span>Live preview</h2><div class="preview-controls"><button class="preview-mode" type="button" id="demo-toggle" aria-pressed="false">Try demo data</button><button class="icon-button" type="button" id="motion-toggle" aria-label="${this.config.motion ? "Pause" : "Resume"} animation" aria-pressed="${!this.config.motion}">${icon(this.config.motion ? "pause" : "play")}</button></div></div>
          <div class="stream-stage" id="stream-stage" aria-label="Illustrated sample stream background">${sceneArt()}<div id="preview-overlay"></div></div>
          <div class="preview-caption"><span id="data-status" class="data-status"><span class="status-dot"></span><span>Connecting to Squeekchain</span></span><button type="button" class="text-button" id="test-cheer">${icon("sparkle")}Test cheer</button></div></section>
          <section class="export-section" aria-labelledby="export-heading"><div class="export-heading"><h2 id="export-heading">Your overlay, ready to roll.</h2><span>Made for OBS + Streamlabs</span></div><label class="sr-only" for="overlay-url">Your configured overlay URL</label><div class="url-field">${icon("link")}<input id="overlay-url" type="text" readonly spellcheck="false" aria-describedby="url-help" /></div><div class="export-actions"><button class="primary-button" type="button" id="copy-url">${icon("copy")}<span>Copy overlay URL</span></button><a class="secondary-button" id="open-overlay" target="_blank" rel="noopener">Open overlay ${icon("arrow")}</a></div><p class="url-help" id="url-help">Paste this URL into a browser source. That’s it.</p><p class="action-status" id="action-status" role="status" aria-live="polite"></p></section>
          <div class="chat-explainer">${icon("chat")}<div><strong>A tiny game for your whole chat.</strong><p>Will Squeektoshi run or snooze? Add your Twitch channel to let chat predict each 10-minute round.</p></div><span class="command-tag">!run <span>or</span> !sleep</span></div>
        </div>
        <aside class="controls-panel" aria-labelledby="controls-heading"><div class="controls-title"><h2 id="controls-heading">Make it yours</h2><button type="button" class="text-button" id="reset-settings">${icon("reset")}Reset</button></div>
          <fieldset class="control-group layout-group"><legend>Choose a layout</legend><div class="layout-options">${(
            [
              ["badge", "Corner badge"],
              ["bar", "Lower third"],
              ["panel", "Side panel"],
            ] as [Layout, string][]
          )
            .map(
              ([value, label]) =>
                `<label class="layout-choice"><input type="radio" name="layout" value="${value}" ${this.config.layout === value ? "checked" : ""}><span class="choice-content"><span class="layout-mini mini-${value}" aria-hidden="true"><i></i><b></b></span><span>${label}</span><span class="choice-check">${icon("check")}</span></span></label>`,
            )
            .join("")}</div></fieldset>
          <fieldset class="control-group"><legend>Overlay theme</legend><div class="theme-options">${(
            [
              ["dark", "Dark", "moon"],
              ["light", "Light", "sun"],
              ["transparent", "Clear", "wheel"],
            ] as [Theme, string, string][]
          )
            .map(
              ([value, label, art]) =>
                `<label class="theme-choice"><input type="radio" name="theme" value="${value}" ${this.config.theme === value ? "checked" : ""}><span>${icon(art)}${label}</span></label>`,
            )
            .join(
              "",
            )}</div><p class="field-hint">Every layout has a transparent canvas.</p></fieldset>
          <fieldset class="control-group"><legend>Accent color</legend><div class="accent-controls"><div class="swatches">${swatches.map(([label, value]) => `<button type="button" class="swatch" data-accent="${value}" style="--swatch:${value}" aria-label="${label} accent" aria-pressed="${this.config.accent === value}">${icon("check")}</button>`).join("")}</div><label class="custom-color"><span class="sr-only">Custom accent color</span><input id="accent-color" type="color" value="${this.config.accent}"><span id="accent-hex">${this.config.accent}</span></label></div></fieldset>
          <div class="control-group"><div class="scale-label"><label for="overlay-scale">Overlay size</label><output id="scale-value" for="overlay-scale" class="pixel-number">${Math.round(this.config.scale * 100)}%</output></div><input id="overlay-scale" type="range" min="60" max="150" step="5" value="${this.config.scale * 100}" aria-describedby="scale-help"><div class="range-labels" id="scale-help"><span>Smaller</span><span>Bigger</span></div></div>
          <fieldset class="control-group widget-group"><legend>Show on stream</legend><div class="widget-options">${WIDGETS.map((widget) => `<label class="widget-choice"><input type="checkbox" name="widget" value="${widget}" ${this.config.widgets.includes(widget) ? "checked" : ""}><span>${widgetLabels[widget]}</span></label>`).join("")}</div></fieldset>
          <div class="control-group chat-control"><label for="twitch-channel">${icon("chat")}Twitch channel <span>optional</span></label><div class="channel-input"><span aria-hidden="true">#</span><input type="text" id="twitch-channel" name="channel" placeholder="your_channel" maxlength="26" value="${escapeHtml(this.config.channel)}" autocapitalize="none" autocomplete="off" spellcheck="false" aria-describedby="channel-hint channel-error"></div><p id="channel-hint" class="field-hint">Chat plays with !run, !sleep and !squeek.</p><p id="channel-error" class="field-error" hidden>Use a Twitch username: letters, numbers or underscores, up to 25 characters.</p><div class="chat-connection" id="chat-connection" role="status">Add a channel to enable chat predictions.</div><div class="session-tools" hidden><span>Scores stay in this browser.</span><button class="text-button" type="button" id="new-session">New game session ${icon("reset")}</button></div></div>
          <label class="sound-control"><span class="sound-label">${icon("volume")}Celebration sound</span><input id="sound-toggle" type="checkbox" role="switch" ${this.config.sound ? "checked" : ""}><span class="switch-track" aria-hidden="true"><i></i></span></label><p class="sound-hint">A little chime for every new Squeek block.</p>
        </aside>
      </section>
      <section class="obs-section" id="obs-instructions" aria-labelledby="obs-heading"><div class="section-title"><div><h2 id="obs-heading">From here to your stream.</h2><p>Three small steps. One very good hamster.</p></div><span class="setup-time">About a minute to set up</span></div><ol class="instruction-steps"><li><span class="step-number pixel-number">1</span><div><h3>Copy your overlay URL</h3><p>Choose your look above, then select <strong>Copy overlay URL.</strong> Your settings travel with the link.</p></div></li><li><span class="step-number pixel-number">2</span><div><h3>Add a browser source</h3><p>In OBS or Streamlabs, open <strong>Sources → + → Browser.</strong> Name it Wheel Cheer and paste your URL.</p></div></li><li><span class="step-number pixel-number">3</span><div><h3>Give him some room</h3><p>Set the source to <strong>1920 × 1080</strong> or <strong>1280 × 720.</strong> Select OK and keep the source running between scenes.</p></div></li></ol><details class="help-details"><summary>A few tips for a happy wheel ${icon("help")}</summary><div><p>The overlay canvas is always transparent. Corner badge and lower third sit at the bottom left; side panel sits at the top right. Reposition the source in your scene as needed.</p><p>For sound, enable <strong>Control audio via OBS</strong> (or route the browser source to your Streamlabs mixer). If your browser blocks audio, open the source’s <strong>Interact</strong> window and select <strong>Enable sound.</strong> Sound is off by default.</p><p>Leave <strong>Shutdown source when not visible</strong> and <strong>Refresh browser when scene becomes active</strong> off so the chat game keeps running. One active source per channel avoids duplicate polling and independent votes.</p><p>In chat, use <strong>!run</strong> or <strong>!sleep</strong> once per round; your last vote counts. Correct guesses earn one cheer on this browser’s session board. <strong>!squeek</strong> shows an 8-second wheel check, with a shared 30-second cooldown.</p><p>Data refreshes every 10 seconds. An unknown value means a reading is missing or stale. Today’s distance uses API-reported UTC daily totals from completed rounds; incomplete coverage stays unknown. Round results can arrive after the countdown ends.</p></div></details></section>
      <section class="about-section" aria-labelledby="about-heading"><div class="about-art" aria-hidden="true">${hamsterLogo()}</div><div><h2 id="about-heading">How it uses Squeekchain</h2><p>A real hamster, a real wheel, a little shared joy. Wheel Cheer reads Squeekchain’s public API for live RPM, distance, confirmed blocks and round results. Your Twitch chat listens anonymously. No accounts, keys or wallets needed.</p><a href="https://squeekchain.com" target="_blank" rel="noopener noreferrer">Meet Squeekchain ${icon("arrow")}</a></div><span class="about-stamp">Small paws.<br><strong>Big cheers.</strong></span></section>
    </main><footer class="site-footer"><a href="./" class="footer-brand">${hamsterLogo()}Wheel Cheer</a><span>Made for streams. Powered by Squeektoshi.</span><a href="#studio">Back to the studio ↑</a></footer>`;
  }
  private bind(): void {
    this.root
      .querySelectorAll<HTMLInputElement>('input[name="layout"]')
      .forEach((input) =>
        input.addEventListener("change", () => {
          this.config.layout = input.value as Layout;
          this.change();
        }),
      );
    this.root
      .querySelectorAll<HTMLInputElement>('input[name="theme"]')
      .forEach((input) =>
        input.addEventListener("change", () => {
          this.config.theme = input.value as Theme;
          this.change();
        }),
      );
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-accent]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          this.config.accent = button.dataset.accent!;
          this.updateAccent();
          this.change();
        }),
      );
    this.root
      .querySelector<HTMLInputElement>("#accent-color")!
      .addEventListener("input", (event) => {
        this.config.accent = (
          event.target as HTMLInputElement
        ).value.toUpperCase();
        this.updateAccent();
        this.change();
      });
    this.root
      .querySelector<HTMLInputElement>("#overlay-scale")!
      .addEventListener("input", (event) => {
        this.config.scale =
          Number((event.target as HTMLInputElement).value) / 100;
        this.root.querySelector("#scale-value")!.textContent =
          `${Math.round(this.config.scale * 100)}%`;
        this.change();
      });
    this.root
      .querySelectorAll<HTMLInputElement>('input[name="widget"]')
      .forEach((input) =>
        input.addEventListener("change", () => {
          this.config.widgets = Array.from(
            this.root.querySelectorAll<HTMLInputElement>(
              'input[name="widget"]:checked',
            ),
          ).map((i) => i.value as Widget);
          this.change();
        }),
      );
    this.root
      .querySelector("#twitch-channel")!
      .addEventListener("change", () => {
        if (this.validateChannel()) this.change();
      });
    this.root
      .querySelector("#twitch-channel")!
      .addEventListener("input", () => {
        this.root.querySelector("#channel-error")!.setAttribute("hidden", "");
        this.root
          .querySelector("#twitch-channel")!
          .removeAttribute("aria-invalid");
      });
    this.root
      .querySelector<HTMLInputElement>("#sound-toggle")!
      .addEventListener("change", (event) => {
        this.config.sound = (event.target as HTMLInputElement).checked;
        this.change();
      });
    this.root.querySelector("#motion-toggle")!.addEventListener("click", () => {
      this.config.motion = !this.config.motion;
      this.updateMotion();
      this.change();
    });
    this.root
      .querySelector("#demo-toggle")!
      .addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const active = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(active));
        button.textContent = active ? "Use live data" : "Try demo data";
        this.hooks.onDemo(active);
      });
    this.root
      .querySelector("#test-cheer")!
      .addEventListener("click", () => this.hooks.onCheer());
    this.root
      .querySelector("#copy-url")!
      .addEventListener("click", () => void this.copy());
    this.root
      .querySelector("#open-overlay")!
      .addEventListener("click", (event) => {
        if (!this.validateChannel()) {
          event.preventDefault();
          this.root.querySelector<HTMLElement>("#twitch-channel")!.focus();
        } else {
          this.change();
        }
      });
    this.root.querySelector("#new-session")!.addEventListener("click", () => {
      this.config.session = newSession();
      this.change();
      this.status(
        "New game session started. Copy the updated URL to use it in OBS.",
      );
    });
    this.root
      .querySelector("#reset-settings")!
      .addEventListener("click", () => {
        this.config = {
          ...this.config,
          layout: "badge",
          theme: "dark",
          accent: "#F5BA69",
          scale: 1,
          widgets: [...WIDGETS],
          channel: "",
          sound: false,
          motion: true,
        };
        for (const input of this.root.querySelectorAll<HTMLInputElement>(
          'input[name="layout"],input[name="theme"]',
        ))
          input.checked =
            input.value === this.config[input.name as "layout" | "theme"];
        for (const input of this.root.querySelectorAll<HTMLInputElement>(
          'input[name="widget"]',
        ))
          input.checked = true;
        this.root.querySelector<HTMLInputElement>("#overlay-scale")!.value =
          "100";
        this.root.querySelector("#scale-value")!.textContent = "100%";
        this.root.querySelector<HTMLInputElement>("#twitch-channel")!.value =
          "";
        this.root.querySelector<HTMLInputElement>("#sound-toggle")!.checked =
          false;
        this.root.querySelector("#channel-error")!.setAttribute("hidden", "");
        this.root
          .querySelector("#twitch-channel")!
          .removeAttribute("aria-invalid");
        this.updateAccent();
        this.updateMotion();
        this.change();
        this.status("Settings reset. Your game session is kept.");
      });
  }
  private validateChannel(): boolean {
    const field = this.root.querySelector<HTMLInputElement>("#twitch-channel")!;
    const value = channelName(field.value);
    const error = this.root.querySelector<HTMLElement>("#channel-error")!;
    error.hidden = value !== null;
    if (value === null) {
      field.setAttribute("aria-invalid", "true");
      return false;
    }
    field.removeAttribute("aria-invalid");
    this.config.channel = value;
    field.value = value;
    return true;
  }
  private updateAccent(): void {
    this.root.querySelector<HTMLInputElement>("#accent-color")!.value =
      this.config.accent;
    this.root.querySelector("#accent-hex")!.textContent = this.config.accent;
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-accent]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.accent === this.config.accent),
        ),
      );
  }
  private updateMotion(): void {
    const button = this.root.querySelector("#motion-toggle")!;
    button.setAttribute(
      "aria-label",
      `${this.config.motion ? "Pause" : "Resume"} animation`,
    );
    button.setAttribute("aria-pressed", String(!this.config.motion));
    button.innerHTML = icon(this.config.motion ? "pause" : "play");
  }
  private change(): void {
    this.updateUrl();
    this.hooks.onChange({ ...this.config, widgets: [...this.config.widgets] });
  }
  private updateUrl(): void {
    const url = overlayUrl(this.config, location.href);
    this.root.querySelector<HTMLInputElement>("#overlay-url")!.value = url;
    this.root.querySelector<HTMLAnchorElement>("#open-overlay")!.href = url;
    (this.root.querySelector(".session-tools") as HTMLElement).hidden =
      !this.config.channel;
  }
  private status(value: string): void {
    this.root.querySelector("#action-status")!.textContent = value;
  }
  private async copy(): Promise<void> {
    if (this.copying) return;
    if (!this.validateChannel()) {
      this.root.querySelector<HTMLElement>("#twitch-channel")!.focus();
      this.status("Check the Twitch channel name, then copy again.");
      return;
    }
    this.change();
    this.copying = true;
    const field = this.root.querySelector<HTMLInputElement>("#overlay-url")!;
    const button = this.root.querySelector<HTMLButtonElement>("#copy-url")!;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(field.value);
      button.innerHTML = `${icon("check")}<span>URL copied!</span>`;
      this.status("Copied! Add a browser source and paste your overlay URL.");
    } catch {
      field.focus();
      field.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        /* Manual copy remains available. */
      }
      this.status(
        copied
          ? "Copied! Paste this URL into your browser source."
          : "URL selected. Press Ctrl+C or Cmd+C to copy it.",
      );
    } finally {
      this.copying = false;
    }
    setTimeout(() => {
      button.innerHTML = `${icon("copy")}<span>Copy overlay URL</span>`;
    }, 3000);
  }
  update(
    snapshot: Snapshot,
    chat: ChatStatus,
    storage: boolean,
    demo: boolean,
  ): void {
    const status = this.root.querySelector("#data-status")!;
    status.classList.toggle("is-offline", !snapshot.online && !demo);
    status.classList.toggle("is-demo", demo);
    const label = demo ? "Demo data · preview only" : snapshot.reason;
    const target = status.lastElementChild!;
    if (target.textContent !== label) target.textContent = label;
    const chatLabel = !this.config.channel
      ? "Add a channel to enable chat predictions."
      : chat === "connected"
        ? `Listening to #${this.config.channel} · read only`
        : chat === "unavailable"
          ? "Twitch is unavailable. Reconnecting automatically."
          : chat === "reconnecting"
            ? "Reconnecting to Twitch chat…"
            : "Connecting to Twitch chat…";
    const chatElement = this.root.querySelector("#chat-connection")!;
    const fullLabel =
      chatLabel +
      (!storage && this.config.channel
        ? " Scores last until this page closes."
        : "");
    if (chatElement.textContent !== fullLabel)
      chatElement.textContent = fullLabel;
  }
}
