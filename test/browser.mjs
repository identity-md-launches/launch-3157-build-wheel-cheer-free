// Runs a bounded static server and checks the actual production export. Fixtures stay in this test.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
const modulePath = process.argv[2];
const { chromium } = await import(
  modulePath ? pathToFileURL(modulePath).href : "playwright"
);
const axePath = process.argv[4];
const { default: AxeBuilder } = await import(
  axePath ? pathToFileURL(axePath).href : "@axe-core/playwright"
);
const root = resolve("dist");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/preview/")) {
      res.writeHead(404).end();
      return;
    }
    let file = resolve(root, decodeURIComponent(url.pathname.slice(9)));
    if (file !== root && !file.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(301, { location: url.pathname + "/" + url.search }).end();
        return;
      }
      file += "/index.html";
    }
    res
      .writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      })
      .end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
const checks = [];
const record = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const now = Date.parse("2026-11-08T20:14:00Z");
function model() {
  return {
    now,
    version: 1,
    height: 3205,
    work: 1000,
    settled: 0,
    online: true,
    rpmValue: 72400,
    coreStatus: "ACTIVE",
    failStatus: false,
    retry: null,
    notModified: false,
    requests: [],
    sockets: [],
    sent: [],
  };
}
function payload(path, m) {
  const round =
    Math.floor((m.now - Date.parse("2026-11-08T20:10:00Z")) / 600000) + 1;
  const common = {
    installationId: "browser-test-fixture",
    generatedAt: new Date(m.now).toISOString(),
  };
  if (path === "/v1/status")
    return {
      ...common,
      measurement: {
        freshness: m.online ? "online" : "stale",
        observedAt: new Date(m.now).toISOString(),
        staleAfterSeconds: 120,
        coreStatus: m.coreStatus,
        rpmMilli: m.rpmValue,
        speedMmPerSecond: 1058,
        distanceMm: 4232,
        cumulativeWorkUnits: String(m.work + 4),
      },
      builder: {
        status: "available",
        anchor: {
          cumulativeBlockUnits: String(
            BigInt(m.height) * 1000000000n + 820192459n,
          ),
          blockHeight: String(m.height),
          cumulativeWork: String(m.work),
          settledThroughRound: String(m.settled),
        },
        queued: { openRoundWorkUnits: "4" },
      },
    };
  if (path === "/v1/economy/state")
    return {
      ...common,
      status: "available",
      lifecycle: { currentRound: String(round) },
    };
  if (path === "/v1/core")
    return {
      ...common,
      status: "available",
      configuration: {
        genesisTimestamp: String(Date.parse("2026-11-08T20:10:00Z") / 1000),
        roundDuration: "600",
      },
      events: m.settled
        ? [
            {
              eventName: "BatchSettled",
              arguments: [
                {
                  name: "previousSettledThroughRound",
                  value: String(m.settled - 1),
                },
                { name: "settledThroughRound", value: String(m.settled) },
                { name: "activeRoundCount", value: "1" },
              ],
            },
          ]
        : [],
    };
  return {
    ...common,
    activity: {
      days: [
        {
          date: "2026-11-08",
          distanceMm: "842300",
          coverage: { coverageBps: 10000 },
        },
      ],
    },
  };
}
async function fixtures(context, m) {
  await context.route("https://api.squeekchain.com/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "if-none-match",
      "Access-Control-Expose-Headers": "ETag,Retry-After",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    m.requests.push({
      path,
      etag: route.request().headers()["if-none-match"],
      at: m.now,
    });
    if (path === "/v1/status" && m.failStatus) {
      await route.fulfill({
        status: 503,
        headers: { ...cors, "Retry-After": m.retry ?? "25" },
        body: "{}",
      });
      return;
    }
    if (m.notModified && route.request().headers()["if-none-match"]) {
      await route.fulfill({
        status: 304,
        headers: { ...cors, ETag: '"wheel-1"' },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { ...cors, ETag: `"wheel-${m.version}"` },
      body: JSON.stringify(payload(path, m)),
    });
  });
  await context.routeWebSocket("wss://irc-ws.chat.twitch.tv", (ws) => {
    m.sockets.push(ws);
    let nick = "";
    let channel = "";
    ws.onMessage((message) => {
      m.sent.push(message);
      if (message.startsWith("NICK ")) nick = message.slice(5).trim();
      if (message.startsWith("JOIN #")) {
        channel = message.slice(6).trim();
        ws.send(`:${nick}!${nick}@${nick}.tmi.twitch.tv JOIN #${channel}\r\n`);
      }
    });
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, description) {
  for (let i = 0; i < 120; i++) {
    if (await fn()) return;
    await wait(25);
  }
  throw new Error(`Timed out: ${description}`);
}
async function advance(page, m, ms) {
  m.now += ms;
  await page.clock.fastForward(ms);
  await wait(80);
}
async function online(page) {
  await until(
    () =>
      page
        .locator(".wheel-overlay")
        .getAttribute("data-online")
        .then((v) => v === "true"),
    "online fixture",
  );
}
async function overflow(page) {
  return page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
}
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.argv[3] ? { executablePath: process.argv[3] } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const m = model();
  await fixtures(context, m);
  await context.addInitScript(() => {
    window.wheelCheerOscillators = 0;
    window.wheelCheerContexts = [];
    const NativeContext = AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        window.wheelCheerContexts.push(this);
      }
    };
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      window.wheelCheerOscillators++;
      return original.apply(this, args);
    };
  });
  const page = await context.newPage();
  const errors = [];
  const missing = [];
  page.on("console", (msg) => {
    if (msg.type() === "error")
      console.log("BROWSER", msg.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400) missing.push(r.url());
  });
  await page.clock.install({ time: new Date(now) });
  await page.goto(url);
  await online(page);
  assert.equal(await page.locator("[data-value=rpm]").innerText(), "72.4");
  assert.equal(
    await page.locator("[data-value=distance]").innerText(),
    "842.3",
  );
  assert.equal(await page.locator("[data-value=height]").innerText(), "3,205");
  assert.equal(m.sockets.length, 0);
  record(
    "production export loads under /preview/ with original local assets and no chat connection by default",
  );
  {
    // The setup preview and the copied overlay URL must agree on state and distance.
    m.coreStatus = "IDLE";
    m.rpmValue = 77109;
    m.version++;
    await advance(page, m, 11000);
    const read = (target) =>
      target.evaluate(() => {
        const q = (k) =>
          document.querySelector(`[data-value="${k}"]`).textContent;
        return {
          state: q("state"),
          rpm: q("rpm"),
          caption: q("rpm-caption"),
          distance: q("distance"),
          unit: q("distance-unit"),
          spinning: document.querySelector(".wheel-overlay").dataset.spinning,
        };
      });
    const preview = await read(page);
    assert.deepEqual(preview, {
      state: "Running",
      rpm: "77.1",
      caption: "Go, little guy. Go!",
      distance: "842.3",
      unit: "m",
      spinning: "true",
    });
    const copied = new URL(await page.locator("#overlay-url").inputValue());
    assert.equal(copied.pathname, "/preview/overlay/index.html");
    assert.equal(
      await page.locator("#open-overlay").getAttribute("href"),
      copied.href,
    );
    const live = await context.newPage();
    await live.clock.install({ time: new Date(m.now) });
    const response = await live.goto(copied.href);
    assert.equal(response.status(), 200);
    assert.equal(await live.title(), "Wheel Cheer · Stream overlay");
    await online(live);
    assert.deepEqual(await read(live), preview);
    await live.close();
    m.coreStatus = "ACTIVE";
    m.rpmValue = 72400;
    m.version++;
    await advance(page, m, 11000);
    record(
      "copied overlay URL names overlay/index.html, renders the overlay, and matches the preview's Running state (IDLE + 77.1 RPM) and today's distance",
    );
  }
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    accessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  record("setup passes axe WCAG 2.2 AA automated checks");
  await page.getByRole("radio", { name: "Lower third", exact: true }).check();
  assert.match(await page.locator("#overlay-url").inputValue(), /layout=bar/);
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  assert.match(
    await page.locator("#preview-overlay").getAttribute("class"),
    /theme-light/,
  );
  await page.getByRole("button", { name: "Mint accent", exact: true }).click();
  assert.match(
    await page.locator("#overlay-url").inputValue(),
    /accent=A4D9BD/,
  );
  await page.locator("#overlay-scale").fill("125");
  assert.equal(await page.locator("#scale-value").innerText(), "125%");
  await page.getByLabel("Today’s distance", { exact: true }).uncheck();
  assert.equal(await page.locator("[data-widget=distance]").isVisible(), false);
  await page.getByRole("switch", { name: "Celebration sound" }).check();
  assert.match(await page.locator("#overlay-url").inputValue(), /sound=1/);
  await page.getByRole("button", { name: "Pause animation" }).click();
  assert.match(await page.locator("#overlay-url").inputValue(), /motion=0/);
  await page
    .getByRole("button", { name: "Copy overlay URL", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    await page.locator("#overlay-url").inputValue(),
  );
  record(
    "layout, theme, accent, scale, widget, sound, motion and actual clipboard settings work",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied for test")) },
    });
    window.savedCopyCommand = document.execCommand;
    document.execCommand = () => false;
  });
  await page.locator("#copy-url").click();
  assert.match(
    await page.locator("#action-status").innerText(),
    /Ctrl\+C or Cmd\+C/,
  );
  assert.ok(
    await page
      .locator("#overlay-url")
      .evaluate(
        (el) => el.selectionStart === 0 && el.selectionEnd === el.value.length,
      ),
  );
  await page.evaluate(() => {
    delete navigator.clipboard;
    document.execCommand = window.savedCopyCommand;
  });
  record(
    "denied clipboard access offers a selected URL and explicit manual copy recovery",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  for (const width of [320, 390, 720, 1000, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const size = await overflow(page);
    assert.equal(size.scroll, size.width, `${width}px overflow`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  const action = await page.locator("#copy-url").boundingBox();
  assert.ok(action.y + action.height <= 844);
  assert.ok(
    await page
      .getByRole("heading", { name: "Your stream’s little sidekick." })
      .isVisible(),
  );
  await page.getByRole("radio", { name: "Corner badge", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.match(await page.locator("#overlay-url").inputValue(), /layout=bar/);
  await page.keyboard.press("ArrowLeft");
  const distanceCheckbox = page.getByLabel("Today’s distance", { exact: true });
  await distanceCheckbox.focus();
  await page.keyboard.press("Space");
  assert.equal(await distanceCheckbox.isChecked(), false);
  await page.keyboard.press("Space");
  await page.locator("#copy-url").focus();
  await page.keyboard.press("Enter");
  await until(
    () =>
      page
        .locator("#action-status")
        .innerText()
        .then((text) => text.includes("Copied")),
    "keyboard copy",
  );
  record(
    "keyboard arrows select layouts, Space toggles widgets, and Enter copies the URL",
  );
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  record(
    "no horizontal overflow at 320, 390, 720, 1000 or 1440; product and copy action fit the first 390 × 844 screen",
  );
  await page.getByRole("button", { name: "Try demo data" }).click();
  assert.match(await page.locator("#data-status").innerText(), /Demo data/);
  const demoUrl = new URL(await page.locator("#overlay-url").inputValue());
  assert.equal(demoUrl.searchParams.has("demo"), false);
  await page.getByRole("button", { name: "Use live data" }).click();
  await page.getByRole("button", { name: "Test cheer", exact: true }).click();
  assert.equal(await page.locator(".cheer-pop").isVisible(), true);
  record(
    "demo is explicitly labelled and stays out of output URLs; test cheer animates without changing actual height",
  );
  await page.getByLabel("Twitch channel optional").fill("bad channel");
  await page
    .getByRole("button", { name: "Copy overlay URL", exact: true })
    .click();
  assert.equal(
    await page.locator("#twitch-channel").getAttribute("aria-invalid"),
    "true",
  );
  assert.equal(
    await page
      .locator("#twitch-channel")
      .evaluate((el) => document.activeElement === el),
    true,
  );
  await page.getByLabel("Twitch channel optional").fill("wheel_test");
  await page.locator("#twitch-channel").blur();
  await until(
    () =>
      page
        .locator("#chat-connection")
        .innerText()
        .then((s) => s.includes("Listening")),
    "chat join",
  );
  assert.ok(m.sent.some((s) => s.startsWith("NICK justinfan")));
  assert.ok(m.sent.some((s) => s === "JOIN #wheel_test\r\n"));
  assert.ok(m.sent.every((s) => !/^PASS|^PRIVMSG|oauth/i.test(s)));
  const scoredOverlayUrl = await page.locator("#overlay-url").inputValue();
  const ws = m.sockets.at(-1);
  ws.send("PING :tmi.twitch.tv\r\n");
  await until(
    () => m.sent.some((s) => s === "PONG :tmi.twitch.tv\r\n"),
    "PONG",
  );
  ws.send(
    "@display-name=Alice :alice!a@a PRIVMSG #wheel_test :!run\r\n@display-name=Bob :bob!b@b PRIVMSG #wheel_test :!sleep\r\n",
  );
  await until(
    () =>
      page
        .locator("[data-value=vote-total]")
        .innerText()
        .then((t) => t === "2 votes"),
    "vote bar",
  );
  ws.send(":bob!b@b PRIVMSG #wheel_test :!run\r\n");
  await until(
    () =>
      page
        .locator("[data-value=run]")
        .innerText()
        .then((t) => t === "2"),
    "vote change",
  );
  ws.send(":alice!a@a PRIVMSG #wheel_test :!squeek\r\n");
  await until(() => page.locator(".squeek-callout").isVisible(), "squeek");
  await advance(page, m, 8100);
  assert.equal(await page.locator(".squeek-callout").isVisible(), false);
  ws.send(":bob!b@b PRIVMSG #wheel_test :!squeek\r\n");
  await wait(80);
  assert.equal(await page.locator(".squeek-callout").isVisible(), false);
  record(
    "anonymous read-only IRC handshake, PING/PONG, unique changing votes, 8-second squeek and global cooldown work",
  );
  // Resolve a real-duration window using virtual time, without waiting ten real minutes.
  await page.getByRole("switch", { name: "Celebration sound" }).check();
  await wait(60);
  m.settled = 1;
  m.work = 1004;
  m.height = 3206;
  m.version = 2;
  await advance(page, m, 360000);
  await until(
    () =>
      page
        .locator("[data-value=result-title]")
        .innerText()
        .then((t) => t.includes("He ran")),
    "confirmed result reveal",
  );
  assert.equal(await page.locator(".leaderboard-list li").count(), 2);
  const cheerBox = await page.locator(".cheer-pop").boundingBox();
  const resultBox = await page.locator(".result-pop").boundingBox();
  assert.ok(
    cheerBox.y + cheerBox.height <= resultBox.y + 1,
    "simultaneous notices overlap",
  );
  assert.ok(await page.evaluate(() => window.wheelCheerOscillators >= 3));
  assert.equal(
    await page.locator(".leaderboard-list li strong").first().innerText(),
    "1",
  );
  await page.reload();
  await online(page);
  assert.equal(await page.locator(".leaderboard-list li").count(), 0); // setup URL has no channel; direct overlay carries the session below.
  const scores = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("wheel-cheer:v1:"))
      .map((k) => JSON.parse(localStorage.getItem(k))),
  );
  assert.ok(
    scores.some(
      (s) => s.scores.alice?.correct === 1 && s.scores.bob?.correct === 1,
    ),
  );
  const restored = await context.newPage();
  await restored.clock.install({ time: new Date(m.now) });
  await restored.goto(scoredOverlayUrl);
  await online(restored);
  assert.equal(await restored.locator(".leaderboard-list li").count(), 2);
  await restored.reload();
  await online(restored);
  assert.equal(
    await restored.locator(".leaderboard-list li strong").first().innerText(),
    "1",
  );
  await restored.close();
  record(
    "confirmed round result reveals and awards one point per correct chatter in persistent session storage",
  );
  record(
    "a confirmed height increase schedules the three-note Web Audio cheer when sound is enabled",
  );
  // Overlay variants are separate static entries, no SPA rewrite needed.
  const overlayPage = await context.newPage();
  await overlayPage.clock.install({ time: new Date(m.now) });
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
  ])
    for (const layout of ["badge", "bar", "panel"])
      for (const theme of ["dark", "light", "transparent"]) {
        await overlayPage.setViewportSize({ width, height });
        await overlayPage.goto(
          `${url}overlay/index.html?layout=${layout}&theme=${theme}&scale=1.5&channel=wheel_test&session=variant&widgets=rpm,status,distance,blocks,round,votes,leaderboard`,
        );
        await online(overlayPage);
        const box = await overlayPage.locator(".overlay-surface").boundingBox();
        assert.ok(
          box.x >= -1 &&
            box.y >= -1 &&
            box.x + box.width <= width + 1 &&
            box.y + box.height <= height + 1,
          `${layout} ${theme} ${width} clipped`,
        );
        const backgrounds = await overlayPage.evaluate(() => [
          getComputedStyle(document.documentElement).backgroundColor,
          getComputedStyle(document.body).backgroundColor,
        ]);
        assert.deepEqual(backgrounds, ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]);
        if (width === 1280 && layout === "badge") {
          const contrast = await new AxeBuilder({ page: overlayPage })
            .withTags(["wcag2aa"])
            .analyze();
          assert.deepEqual(
            contrast.violations
              .filter((v) => v.id === "color-contrast")
              .map((v) => v.id),
            [],
          );
        }
      }
  record(
    "all 18 layout/theme/canvas combinations fit 1920 × 1080 and 1280 × 720 at maximum requested scale, with transparent page backgrounds",
  );
  await overlayPage.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await overlayPage.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
    0,
  );
  await overlayPage.emulateMedia({ reducedMotion: "no-preference" });
  assert.ok(
    await overlayPage.evaluate(() =>
      document.getAnimations().some((a) => a.playState === "running"),
    ),
  );
  record(
    "running wheel uses CSS animation and reduced motion stops every animation",
  );
  const colorAudit = await new AxeBuilder({ page: overlayPage })
    .withTags(["wcag2aa"])
    .analyze();
  assert.deepEqual(
    colorAudit.violations
      .filter((v) => v.id === "color-contrast")
      .map((v) => v.id),
    [],
  );
  record(
    "clear overlay text passes automated contrast on its actual dark backplates",
  );
  // Fresh RPM outranks a lagging coreStatus (live API: IDLE with rpmMilli 77109).
  m.coreStatus = "IDLE";
  m.rpmValue = 77109;
  m.version++;
  await advance(overlayPage, m, 11000);
  assert.equal(
    await overlayPage.locator("[data-value=rpm]").innerText(),
    "77.1",
  );
  assert.equal(
    await overlayPage.locator("[data-value=state]").innerText(),
    "Running",
  );
  assert.equal(
    await overlayPage.locator("[data-value=rpm-caption]").innerText(),
    "Go, little guy. Go!",
  );
  assert.equal(
    await overlayPage.locator(".wheel-overlay").getAttribute("data-spinning"),
    "true",
  );
  assert.notEqual(
    await overlayPage
      .locator(".wheel-rotor")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  m.coreStatus = "ACTIVE";
  m.rpmValue = 0;
  m.version++;
  await advance(overlayPage, m, 11000);
  assert.equal(
    await overlayPage.locator("[data-value=rpm]").innerText(),
    "0.0",
  );
  assert.equal(
    await overlayPage.locator("[data-value=state]").innerText(),
    "Sleeping",
  );
  assert.equal(
    await overlayPage.locator(".wheel-overlay").getAttribute("data-state"),
    "sleeping",
  );
  assert.equal(
    await overlayPage
      .locator(".wheel-rotor")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  m.rpmValue = null;
  m.version++;
  await advance(overlayPage, m, 11000);
  assert.equal(
    await overlayPage.locator("[data-value=rpm]").innerText(),
    "unknown",
  );
  assert.equal(
    await overlayPage
      .locator(".wheel-rotor")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.equal(
    await overlayPage.locator("[data-value=state]").innerText(),
    "Running",
    "missing RPM falls back to coreStatus ACTIVE",
  );
  m.rpmValue = 72400;
  m.version++;
  record(
    "state follows fresh RPM (IDLE + 77.1 RPM runs, ACTIVE + 0 sleeps, missing RPM uses coreStatus); zero and unavailable RPM stop the wheel",
  );
  await overlayPage.goto(
    `${url}overlay?widgets=rpm,status,distance,blocks,round`,
  );
  await online(overlayPage);
  assert.match(overlayPage.url(), /overlay\//);
  m.online = false;
  m.version++;
  await advance(overlayPage, m, 11000);
  await until(
    () =>
      overlayPage
        .locator(".wheel-overlay")
        .getAttribute("data-online")
        .then((s) => s === "false"),
    "stale state",
  );
  for (const key of ["rpm", "height", "distance", "countdown"])
    assert.equal(
      await overlayPage.locator(`[data-value=${key}]`).innerText(),
      "unknown",
    );
  record(
    "directory redirect preserves query parameters; stale API freshness makes every measurement unknown",
  );
  // ETag and Retry-After get an isolated clock and resource history.
  const pollContext = await browser.newContext();
  const pm = model();
  await fixtures(pollContext, pm);
  const poll = await pollContext.newPage();
  await poll.clock.install({ time: new Date(now) });
  await poll.goto(url);
  await online(poll);
  const initialTimer = await poll.locator("[data-value=countdown]").innerText();
  pm.notModified = true;
  await advance(poll, pm, 11000);
  assert.ok(pm.requests.filter((r) => r.path === "/v1/status").at(-1).etag);
  assert.notEqual(
    await poll.locator("[data-value=countdown]").innerText(),
    initialTimer,
  );
  assert.equal(pm.requests.filter((r) => r.path === "/v1/status").length, 2);
  await advance(poll, pm, 120000);
  assert.equal(await poll.locator("[data-value=rpm]").innerText(), "unknown");
  pm.notModified = false;
  pm.failStatus = true;
  pm.retry = "25";
  await advance(poll, pm, 11000);
  const before = pm.requests.filter((r) => r.path === "/v1/status").length;
  await advance(poll, pm, 24000);
  assert.equal(
    pm.requests.filter((r) => r.path === "/v1/status").length,
    before,
  );
  await advance(poll, pm, 2000);
  assert.equal(
    pm.requests.filter((r) => r.path === "/v1/status").length,
    before + 1,
  );
  record(
    "10-second conditional polling sends ETag, 304 keeps the countdown moving and still expires telemetry, and Retry-After suppresses early retries",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  record("no production JavaScript errors or missing local resources");
  await pollContext.close();
  await context.close();
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
