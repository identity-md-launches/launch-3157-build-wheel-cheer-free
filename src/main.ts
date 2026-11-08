import "./style.css";
import { readConfig, newSession } from "./config.ts";
import type { Config } from "./config.ts";
import { ApiFeed } from "./api.ts";
import { makeSnapshot } from "./model.ts";
import type { Snapshot } from "./model.ts";
import { ChatGame, safeStorage } from "./game.ts";
import { TwitchChat, SqueekCooldown } from "./chat.ts";
import type { ChatStatus } from "./chat.ts";
import { CheerSound } from "./sound.ts";
import { WheelOverlay } from "./overlay.ts";
import { SetupPage } from "./setup.ts";

const isOverlay =
  document.documentElement.dataset.page === "overlay" ||
  /\/overlay(?:\/|\/index\.html)?$/.test(location.pathname);
let session = newSession();
try {
  session = sessionStorage.getItem("wheel-cheer:session") ?? session;
  sessionStorage.setItem("wheel-cheer:session", session);
} catch {
  /* Private contexts remain usable. */
}
let config = readConfig(location.search, session);
const feed = new ApiFeed();
const sound = new CheerSound();
const cooldown = new SqueekCooldown();
let game: ChatGame | null = null;
let gameKey = "";
let chat: TwitchChat | null = null;
let chatStatus: ChatStatus = "off";
let chatChannel = "";
let calloutUntil = 0;
let demo = false;
let lastRound: number | null = null;
let setup: SetupPage | null = null;
const app = document.querySelector<HTMLElement>("#app")!;
let overlayElement: HTMLElement;
const onSound = async () => {
  await sound.enable();
  render();
};
const onCheer = () => {
  if (config.sound) sound.play();
};
if (isOverlay) {
  document.documentElement.classList.add("is-overlay");
  document.body.className = "overlay-page";
  app.innerHTML =
    '<main class="overlay-canvas" aria-label="Wheel Cheer stream overlay"><div id="live-overlay"></div></main>';
  overlayElement = app.querySelector<HTMLElement>("#live-overlay")!;
} else {
  setup = new SetupPage(app, config, {
    onChange: (next: Config) => {
      const wasSound = config.sound;
      config = next;
      try {
        sessionStorage.setItem("wheel-cheer:session", config.session);
      } catch {
        /* Session still travels with the URL. */
      }
      overlay.configure(config);
      if (config.sound && !wasSound) void sound.enable().then(render);
      syncGame(makeSnapshot(feed.feed));
      connectChat();
      render();
    },
    onDemo: (value: boolean) => {
      demo = value;
      render();
    },
    onCheer: () => {
      overlay.cheer();
      if (config.sound) void sound.enable().then(() => sound.play());
    },
  });
  overlayElement = app.querySelector<HTMLElement>("#preview-overlay")!;
}
const overlay = new WheelOverlay(
  overlayElement,
  config,
  !isOverlay,
  onCheer,
  () => void onSound(),
);
function connectChat(): void {
  if (config.channel === chatChannel) return;
  chat?.stop();
  chat = null;
  chatChannel = config.channel;
  if (!config.channel) {
    chatStatus = "off";
    return;
  }
  chat = new TwitchChat(
    config.channel,
    (message) => {
      const snapshot = makeSnapshot(feed.feed);
      syncGame(snapshot);
      if (message.command === "squeek") {
        if (cooldown.trigger()) calloutUntil = Date.now() + 8000;
      } else
        game?.vote(message.user, message.name, message.command, snapshot.round);
      render();
    },
    (status) => {
      chatStatus = status;
      render();
    },
  );
  chat.start();
}
function syncGame(snapshot: Snapshot): void {
  const key = `${snapshot.installation}:${config.channel}:${config.session}`;
  if (config.channel && snapshot.installation && key !== gameKey) {
    game?.flush();
    game = new ChatGame(
      config.channel,
      config.session,
      snapshot.installation,
      safeStorage(),
    );
    gameKey = key;
  } else if (!config.channel && game) {
    game.flush();
    game = null;
    gameKey = "";
  }
  game?.ingest(snapshot, feed.feed);
}
function demoSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    online: true,
    state: "Running",
    rpm: 72.4,
    distance: 842.3,
    height: 3205n,
    round: 723,
    roundEndsAt: Math.floor(Date.now() / 600_000) * 600_000 + 600_000,
    now: Date.now(),
    installation: "preview-demo",
    reason: "Demo data · preview only",
  };
}
function render(): void {
  const snapshot = makeSnapshot(feed.feed);
  if (snapshot.round !== lastRound) {
    syncGame(snapshot);
    lastRound = snapshot.round;
  }
  const displayed = demo && !isOverlay ? demoSnapshot(snapshot) : snapshot;
  overlay.update({
    snapshot: displayed,
    game: demo ? null : game,
    chatStatus,
    calloutUntil,
    demo,
    soundReady: sound.ready,
  });
  setup?.update(snapshot, chatStatus, game?.storageAvailable ?? true, demo);
}
feed.subscribe(() => {
  syncGame(makeSnapshot(feed.feed));
  render();
});
connectChat();
feed.start();
render();
const tick = setInterval(render, 1000);
if (isOverlay && config.sound) void sound.enable().then(render);
window.addEventListener("pagehide", () => {
  game?.flush();
  chat?.stop();
  feed.stop();
  clearInterval(tick);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
