import test from "node:test";
import assert from "node:assert/strict";
import {
  readConfig,
  overlayUrl,
  channelName,
  accentText,
} from "../src/config.ts";
import {
  makeSnapshot,
  countdown,
  integer,
  wheelState,
  distanceText,
} from "../src/model.ts";
import { retryDelay } from "../src/api.ts";
import { ChatGame } from "../src/game.ts";
import { parseMessage, SqueekCooldown } from "../src/chat.ts";
const now = Date.now();
const start = Math.floor(now / 600_000) * 600_000;
const resource = (data) => ({ data, error: null, checkedAt: Date.now() });
function fixture() {
  return {
    offset: 0,
    status: resource({
      installationId: "test-fixture",
      generatedAt: new Date(now).toISOString(),
      measurement: {
        freshness: "online",
        observedAt: new Date(now).toISOString(),
        staleAfterSeconds: 120,
        coreStatus: "ACTIVE",
        rpmMilli: 72400,
        speedMmPerSecond: 1058,
        distanceMm: 4232,
        cumulativeWorkUnits: "1234",
      },
      builder: {
        status: "available",
        anchor: {
          cumulativeBlockUnits: "3205820192459",
          blockHeight: "3205",
          cumulativeWork: "1234",
          settledThroughRound: "2",
        },
        queued: { openRoundWorkUnits: "4" },
      },
    }),
    economy: resource({
      status: "available",
      lifecycle: { currentRound: "3" },
    }),
    core: resource({
      status: "available",
      installationId: "test-fixture",
      configuration: {
        genesisTimestamp: String((start - 1200000) / 1000),
        roundDuration: "600",
      },
      events: [],
    }),
    stats: resource({
      activity: {
        days: [
          {
            date: new Date(now).toISOString().slice(0, 10),
            distanceMm: "842300",
            coverage: { coverageBps: 10000 },
          },
        ],
      },
    }),
  };
}
const memory = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
};
test("all settings round-trip into a subpath-safe static overlay URL", () => {
  const config = readConfig(
    "?layout=panel&theme=transparent&accent=BCADF0&scale=1.25&widgets=rpm,votes&channel=wheel_friends&sound=1&motion=0&session=testing",
  );
  const url = new URL(
    overlayUrl(config, "https://example.org/ipfs/site/index.html"),
  );
  assert.equal(url.pathname, "/ipfs/site/overlay/index.html");
  assert.deepEqual(readConfig(url.search), config);
});
test("overlay URLs always name overlay/index.html so IPFS gateways serve the page", () => {
  const config = readConfig("?layout=bar&theme=dark&session=keep");
  for (const href of [
    "https://wheel.example.site/",
    "https://wheel.example.site/index.html",
    "https://wheel.example.site/?layout=panel#studio",
    "https://gateway.example/ipfs/bafy/",
    "https://gateway.example/ipfs/bafy",
  ]) {
    const url = new URL(overlayUrl(config, href));
    assert.match(url.pathname, /\/overlay\/index\.html$/, href);
    assert.doesNotMatch(url.pathname, /\/\/|index\.html\/overlay/, href);
    assert.equal(url.hash, "");
    assert.equal(url.searchParams.get("layout"), "bar");
    assert.equal(url.searchParams.get("session"), "keep");
  }
  assert.equal(
    new URL(overlayUrl(config, "https://wheel.example.site/index.html")).pathname,
    "/overlay/index.html",
  );
});
test("invalid settings are normalized and unsafe channel names never become JOIN commands", () => {
  const c = readConfig(
    "?layout=nope&theme=bad&accent=red&scale=Infinity&widgets=rpm,rpm,nope&channel=a%0d%0aPRIVMSG&session=x%0d%0a",
  );
  assert.equal(c.layout, "badge");
  assert.equal(c.theme, "dark");
  assert.equal(c.accent, "#F5BA69");
  assert.equal(c.scale, 1);
  assert.deepEqual(c.widgets, ["rpm"]);
  assert.equal(c.channel, "");
  assert.match(c.session, /^[a-z0-9-]+$/);
  assert.equal(channelName("@Some_Channel"), "some_channel");
  assert.equal(channelName("https://twitch.tv/a"), null);
});
test("explicit empty widget list stays empty and scale is safely clamped", () => {
  assert.deepEqual(readConfig("?widgets=&scale=40").widgets, []);
  assert.equal(readConfig("?scale=40").scale, 1.5);
  assert.equal(readConfig("?scale=-3").scale, 0.6);
});
test("arbitrary dark and light accents retain readable text fallbacks", () => {
  assert.equal(accentText("#000000", "dark"), "#F5BA69");
  assert.equal(accentText("#FFFFFF", "light"), "#80500F");
});
test("online readings use exact milli-RPM, millimetres, and integer Squeek blocks", () => {
  const s = makeSnapshot(fixture(), now);
  assert.equal(s.online, true);
  assert.equal(s.rpm, 72.4);
  assert.equal(s.distance, 842.3);
  assert.equal(s.height, 3205n);
  assert.equal(s.state, "Running");
  assert.equal(s.round, 3);
  assert.equal(s.roundEndsAt, start + 600000);
});
test("missing readings and stale measurement never turn into zero", () => {
  const f = fixture();
  delete f.status.data.measurement.rpmMilli;
  assert.equal(makeSnapshot(f, now).rpm, null);
  f.status.data.measurement.freshness = "stale";
  const s = makeSnapshot(f, now);
  for (const k of ["rpm", "distance", "height", "round", "work"])
    assert.equal(s[k], null);
  assert.equal(s.state, "Unknown");
  assert.equal(countdown(s), "unknown");
});
test("old online telemetry expires even when a server repeats its online label", () => {
  const f = fixture();
  f.status.data.measurement.observedAt = new Date(now - 121000).toISOString();
  assert.equal(makeSnapshot(f, now).online, false);
});
test("real zero is shown only for an available, fresh value", () => {
  const f = fixture();
  f.status.data.measurement.rpmMilli = 0;
  f.status.data.measurement.coreStatus = "IDLE";
  const s = makeSnapshot(f, now);
  assert.equal(s.rpm, 0);
  assert.equal(s.state, "Sleeping");
});
test("failed resources and incomplete daily coverage independently become unknown", () => {
  const f = fixture();
  f.stats.data.activity.days[0].coverage.coverageBps = 9000;
  f.economy.error = "503";
  const s = makeSnapshot(f, now);
  assert.equal(s.distance, null);
  assert.equal(s.round, null);
  assert.equal(s.rpm, 72.4);
  f.status.error = "timeout";
  assert.equal(makeSnapshot(f, now).height, null);
});
test("large block counters never lose precision", () => {
  const f = fixture();
  f.status.data.builder.anchor.cumulativeBlockUnits =
    "9007199254740993123456789";
  assert.equal(makeSnapshot(f, now).height, 9007199254740993n);
  assert.equal(integer(""), null);
  assert.equal(integer(null), null);
  assert.equal(integer("-1"), null);
});
test("the 600-second round rolls exactly at its boundary", () => {
  const f = fixture();
  f.status.data.measurement.observedAt = new Date(start + 600000).toISOString();
  f.status.checkedAt = start + 600000;
  f.core.checkedAt = start + 600000;
  f.economy.checkedAt = start + 600000;
  const s = makeSnapshot(f, start + 600000);
  assert.equal(s.round, 4);
  assert.equal(countdown(s), "10:00");
});
test("Retry-After accepts seconds and HTTP dates and never polls sooner than 10s", () => {
  assert.equal(retryDelay("45", now), 45000);
  assert.equal(
    retryDelay(new Date(now + 60000).toUTCString(), now) >= 59000,
    true,
  );
  assert.equal(retryDelay("1", now), 10000);
  assert.equal(retryDelay("garbage", now), 10000);
});
test("IRC parser accepts only exact supported commands from the configured channel", () => {
  assert.deepEqual(
    parseMessage(
      "@display-name=WheelFriend :wheelfriend!w@w PRIVMSG #cozy :!RUN",
      "cozy",
    ),
    { user: "wheelfriend", name: "WheelFriend", command: "run" },
  );
  assert.equal(parseMessage(":viewer!a@b PRIVMSG #other :!run", "cozy"), null);
  assert.equal(
    parseMessage(":viewer!a@b PRIVMSG #cozy :hello !run", "cozy"),
    null,
  );
  assert.equal(parseMessage("PING :tmi.twitch.tv", "cozy"), null);
});
test("squeek uses a shared 30-second cooldown, including the first command", () => {
  const c = new SqueekCooldown();
  assert.equal(c.trigger(10), true);
  assert.equal(c.trigger(30009), false);
  assert.equal(c.trigger(30010), true);
});
test("one chatter has one changing vote, and expired rounds reject votes", () => {
  const g = new ChatGame("cozy", "s", "test-fixture", memory());
  g.activeRound = 3;
  assert.equal(g.vote("a", "A", "run", 3), true);
  g.vote("a", "A", "sleep", 3);
  assert.deepEqual(g.counts(), { run: 0, sleep: 1 });
  assert.equal(g.vote("b", "B", "run", 2), false);
  g.flush();
});
test("confirmed zero-work batch reveals sleep, scores once, and survives reload", () => {
  const storage = memory(),
    g = new ChatGame("cozy", "session", "test-fixture", storage);
  g.activeRound = 2;
  g.vote("a", "A", "sleep", 2);
  g.vote("b", "B", "run", 2);
  const f = fixture();
  f.core.data.events = [
    {
      eventName: "BatchSettled",
      arguments: [
        { name: "previousSettledThroughRound", value: "1" },
        { name: "settledThroughRound", value: "2" },
        { name: "activeRoundCount", value: "0" },
      ],
    },
  ];
  g.ingest(makeSnapshot(f, now), f);
  assert.deepEqual(g.top(), [{ name: "A", correct: 1 }]);
  assert.equal(g.reveal.result, "sleep");
  g.ingest(makeSnapshot(f, now), f);
  assert.equal(g.top()[0].correct, 1);
  g.flush();
  const reload = new ChatGame("cozy", "session", "test-fixture", storage);
  reload.ingest(makeSnapshot(f, now), f);
  assert.equal(reload.top()[0].correct, 1);
  reload.flush();
});
test("observed work can settle a run but not before API confirmation", () => {
  const f = fixture(),
    g = new ChatGame("cozy", "s", "test-fixture", memory());
  g.ingest(makeSnapshot(f, now), f);
  g.vote("a", "A", "run", 3);
  assert.equal(g.reveal, null);
  const next = makeSnapshot(f, now);
  next.round = 4;
  next.roundEndsAt += 600000;
  g.ingest(next, f);
  assert.equal(g.reveal, null);
  next.settledThrough = 3;
  f.status.data.builder.anchor.cumulativeWork = "1238";
  g.ingest(next, f);
  assert.equal(g.reveal.result, "run");
  assert.equal(g.top()[0].correct, 1);
  g.flush();
});
test("mixed multi-round settlement stays pending instead of guessing sleep", () => {
  const f = fixture(),
    g = new ChatGame("cozy", "s", "test-fixture", memory());
  g.activeRound = 1;
  g.vote("a", "A", "sleep", 1);
  f.core.data.events = [
    {
      eventName: "BatchSettled",
      arguments: [
        { name: "previousSettledThroughRound", value: "0" },
        { name: "settledThroughRound", value: "2" },
        { name: "activeRoundCount", value: "1" },
      ],
    },
  ];
  g.ingest(makeSnapshot(f, now), f);
  assert.equal(g.reveal, null);
  assert.equal(g.pending(), 1);
  assert.deepEqual(g.top(), []);
  g.flush();
});
test("offline data never settles votes or manufactures results", () => {
  const f = fixture(),
    g = new ChatGame("cozy", "s", "test-fixture", memory());
  g.activeRound = 2;
  g.vote("a", "A", "sleep", 2);
  f.status.data.measurement.freshness = "stale";
  g.ingest(makeSnapshot(f, now), f);
  assert.equal(g.reveal, null);
  g.flush();
});
test("session leaderboard ranks exactly the top ten without shared server state", () => {
  const storage = memory(),
    g = new ChatGame("cozy", "s", "test-fixture", storage);
  for (let round = 1; round <= 12; round++) {
    g.activeRound = round;
    for (let user = round; user <= 12; user++)
      g.vote(`u${user}`, `User${user}`, "run", round);
    g.resolve(round, "run");
  }
  assert.equal(g.top().length, 10);
  assert.equal(g.top()[0].correct, 12);
  g.flush();
  assert.deepEqual(
    new ChatGame("cozy", "other-session", "test-fixture", storage).top(),
    [],
  );
});
test("storage failures keep the chat game usable in memory", () => {
  const g = new ChatGame("cozy", "s", "test-fixture", {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
  });
  g.activeRound = 1;
  g.vote("a", "A", "run", 1);
  g.resolve(1, "run");
  g.flush();
  assert.equal(g.storageAvailable, false);
  assert.equal(g.top()[0].correct, 1);
});

test("a counter fault makes wheel measurements unknown", () => {
  const f = fixture();
  f.status.data.measurement.coreStatus = "COUNTER_FAULT";
  assert.equal(makeSnapshot(f, now).rpm, null);
  assert.equal(makeSnapshot(f, now).online, false);
});
test("custom numeric accent text meets 4.5:1 in every theme", () => {
  const lum = (hex) => {
    const c = hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  for (const theme of ["dark", "light", "transparent"])
    for (let grey = 0; grey < 256; grey++) {
      const hex = "#" + grey.toString(16).padStart(2, "0").repeat(3);
      const fg = lum(accentText(hex, theme)),
        bg = lum(
          theme === "light"
            ? "#F5EFE4"
            : theme === "transparent"
              ? "#2A2A30"
              : "#202229",
        );
      assert.ok((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) >= 4.5);
    }
});
test("malformed daily records and event entries do not crash a live overlay", () => {
  const f = fixture();
  f.stats.data.activity.days = [null, 42];
  f.core.data.events = [null, { eventName: "BatchSettled", arguments: [null] }];
  const snapshot = makeSnapshot(f, now);
  assert.equal(snapshot.distance, null);
  const g = new ChatGame("cozy", "safe", "test-fixture", memory());
  assert.doesNotThrow(() => g.ingest(snapshot, f));
  g.flush();
});
test("fresh positive RPM means Running even when coreStatus still says IDLE", () => {
  const f = fixture();
  f.status.data.measurement.coreStatus = "IDLE";
  f.status.data.measurement.rpmMilli = 77109;
  const s = makeSnapshot(f, now);
  assert.equal(s.online, true);
  assert.equal(s.rpm, 77.109);
  assert.equal(s.state, "Running");
});
test("fresh zero RPM means Sleeping even when coreStatus says ACTIVE", () => {
  const f = fixture();
  f.status.data.measurement.coreStatus = "ACTIVE";
  f.status.data.measurement.rpmMilli = 0;
  const s = makeSnapshot(f, now);
  assert.equal(s.rpm, 0);
  assert.equal(s.state, "Sleeping");
});
test("coreStatus is only a fallback when rpmMilli is missing", () => {
  for (const [core, expected] of [
    ["ACTIVE", "Running"],
    ["IDLE", "Sleeping"],
    ["SOMETHING_NEW", "Unknown"],
    [undefined, "Unknown"],
  ]) {
    const f = fixture();
    delete f.status.data.measurement.rpmMilli;
    if (core === undefined) delete f.status.data.measurement.coreStatus;
    else f.status.data.measurement.coreStatus = core;
    const s = makeSnapshot(f, now);
    assert.equal(s.rpm, null);
    assert.equal(s.state, expected, String(core));
  }
  const malformed = fixture();
  malformed.status.data.measurement.rpmMilli = "fast";
  malformed.status.data.measurement.coreStatus = "IDLE";
  assert.equal(makeSnapshot(malformed, now).state, "Sleeping");
});
test("stale or missing data stays Unknown whatever RPM or coreStatus say", () => {
  const stale = fixture();
  stale.status.data.measurement.coreStatus = "IDLE";
  stale.status.data.measurement.rpmMilli = 77109;
  stale.status.data.measurement.freshness = "stale";
  assert.equal(makeSnapshot(stale, now).state, "Unknown");
  const old = fixture();
  old.status.data.measurement.observedAt = new Date(now - 200_000).toISOString();
  assert.equal(makeSnapshot(old, now).state, "Unknown");
  const missing = fixture();
  missing.status = { data: null, error: null, checkedAt: 0 };
  assert.equal(makeSnapshot(missing, now).state, "Unknown");
  assert.equal(wheelState(false, 77109, "ACTIVE"), "Unknown");
  assert.equal(wheelState(true, 1, "IDLE"), "Running");
  assert.equal(wheelState(true, 0, "ACTIVE"), "Sleeping");
  assert.equal(wheelState(true, null, "ACTIVE"), "Running");
});
test("today's distance has one value and format for overlay and preview", () => {
  const zero = fixture();
  zero.stats.data.activity.days[0].distanceMm = 0;
  const z = makeSnapshot(zero, now);
  assert.equal(z.distance, 0);
  assert.deepEqual(distanceText(z), { value: "0.0", unit: "m" });
  assert.deepEqual(distanceText(makeSnapshot(fixture(), now)), {
    value: "842.3",
    unit: "m",
  });
  const asText = fixture();
  asText.stats.data.activity.days[0].coverage.coverageBps = "10000";
  assert.equal(makeSnapshot(asText, now).distance, 842.3);
  // A single failed refresh keeps the last good daily total while it is fresh.
  const blip = fixture();
  blip.stats.error = "API returned 429";
  assert.equal(makeSnapshot(blip, now).distance, 842.3);
  blip.stats.checkedAt = Date.now() - 121_000;
  const gone = makeSnapshot(blip, now);
  assert.equal(gone.distance, null);
  assert.deepEqual(distanceText(gone), { value: "unknown", unit: "" });
});
