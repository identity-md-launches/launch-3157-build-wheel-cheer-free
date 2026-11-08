# Wheel Cheer

A free stream companion for Squeekchain. Put Squeektoshi’s live wheel into OBS or Streamlabs, customize its appearance, and let Twitch chat predict whether he will run or sleep each round.

This is a fully static Vite + TypeScript site. It has no backend, accounts, keys, wallet integrations, transactions, token features, paid services, analytics, remote fonts, or third-party artwork. All runtime artwork, icons and the numeric font are original and bundled locally.

## Install, edit, preview and rebuild

Use Node.js **22.18 or later** (the unit tests use Node’s built-in TypeScript stripping).

```sh
npm ci
npm run dev
```

For the production site, including the separately exported overlay route:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the preview URL printed by Vite. The setup is `/`; the static browser-source entry is `/overlay/`. Hosts normally redirect `/overlay` to that directory, preserving the query string. `dist/overlay/index.html` also works directly.

`dist/` is the complete, ready-to-serve production export and is included with the source and `package-lock.json`. Serve the **whole directory**, including `assets/`, `favicon.svg`, `share-card.png` and `overlay/index.html`. There is no server rewrite requirement and no backend to deploy. Vite uses `base: './'`; the export script adjusts the overlay entry to use `../assets/`, so a gateway subpath works too. Opening the HTML through `file://` is not a substitute for an HTTP preview.

The build uses committed artwork and the committed 1.1 kB `src/wheel-bits.woff2`; it never generates assets through an external service. Optional artwork generators are in `scripts/generate-font.mjs` and `scripts/generate-share-card.mjs`. The former documents its exact temporary OpenType/WOFF2 tooling; the latter uses the Playwright development dependency. Neither is needed for a normal rebuild.

## Add it to OBS or Streamlabs

1. Choose a layout, overlay theme, accent, size and widgets. Add your Twitch channel if you want chat predictions. The preview uses an original illustrated sample stream background; the background is excluded from the overlay.
2. Select **Copy overlay URL**. If clipboard access is blocked, the URL is selected and the page gives manual copying instructions.
3. Add a **Browser** source in OBS or Streamlabs. Paste the generated URL. Set its dimensions to **1920 × 1080** or **1280 × 720**.
4. Leave **Shutdown source when not visible** and **Refresh browser when scene becomes active** off to keep listening between scenes. Keep one active Wheel Cheer source per channel. A source and its setup preview run independent chat listeners; the OBS browser profile has its own storage.
5. Optional sound: enable **Celebration sound**, then copy the updated URL. In OBS, enable **Control audio via OBS** and configure its mixer routing (or use the Streamlabs browser audio mixer). If autoplay is blocked, use the source’s **Interact** window and select **Enable sound**.

Corner badge and lower third anchor at the bottom left, with a 24 CSS pixel inset. Side panel anchors at the top right. Move or crop the source within your scene if you want a different location. The page background remains transparent in every theme. Clear theme removes the shared panel but retains small dark backplates so text remains readable over bright footage.

## Every overlay query parameter

The setup writes every setting into the generated URL. The setup page can also read these parameters to initialize its controls.

| Parameter | Default | Values and behavior |
| --- | --- | --- |
| `layout` | `badge` | `badge` = corner badge, `bar` = lower-third bar, `panel` = full side panel. Base widths are 336, 1040 and 320 CSS pixels respectively. |
| `theme` | `dark` | `dark`, `light`, `transparent`. The last is labelled **Clear** in the studio. It changes widget surfaces; the surrounding canvas is always transparent. |
| `accent` | `F5BA69` | Six hexadecimal digits; an encoded leading `#` is accepted. Invalid values fall back to amber. Decorative bars use the selected color; numeric text uses a contrast-safe fallback when needed. |
| `scale` | `1` | A multiplier from `0.6` to `1.5`; finite out-of-range values are clamped, invalid numbers use `1`. The studio slider uses 5% increments. Output automatically fits within the canvas if a tall leaderboard or large scale would overflow. |
| `widgets` | All seven | Comma-separated `rpm,status,distance,blocks,round,votes,leaderboard`. Omission enables all; an explicit empty value hides all configurable widgets. Unknown names and duplicates are ignored. The hamster, identity and connection footer remain. |
| `channel` | Empty | A Twitch username, 1–25 ASCII letters, numbers or underscores; case-insensitive and an optional leading `@` is removed. Empty disables chat entirely. Invalid URL values are ignored; invalid typed values receive an inline error before copying. |
| `sound` | `0` | `1` enables the block cheer, `0` disables it. Playback still follows browser autoplay rules. |
| `motion` | `1` | `0` pauses the wheel, hamster and celebration animation; `1` enables them. The browser’s reduced-motion preference also stops animation. The preview pause control changes this parameter. |
| `session` | Generated | A random session identifier, up to 64 letters, numbers, underscores or hyphens. The generated URL always includes it, allowing scores and pending predictions to survive a refresh in the same browser profile. Keep the generated value to continue a session. **New game session** creates a new identifier without deleting earlier sessions. |

For example, `overlay/?layout=bar&theme=transparent&accent=A4D9BD&scale=1&widgets=rpm,status,blocks,round&sound=0&motion=1` is a quiet lower third. Use the setup to generate a complete session URL and optionally add your channel. Unknown query parameters have no effect. **Try demo data** only affects the setup preview and is never encoded in the overlay URL.

## How it uses Squeekchain

All data comes directly from the public, read-only API at **https://api.squeekchain.com/v1**. There are no RPCs, credentials or private endpoints in the app. See [Squeekchain](https://squeekchain.com).

| Endpoint | Purpose |
| --- | --- |
| `GET /status` | `measurement.coreStatus`, `rpmMilli`, `speedMmPerSecond`, `distanceMm`, `cumulativeWorkUnits`, freshness and observation time; the builder’s confirmed anchor, settlement boundary and open-round work. RPM is `rpmMilli / 1000`. `ACTIVE` means running, `IDLE` means sleeping. |
| `GET /economy/state` | Confirms current-round availability through `lifecycle.currentRound` (or `capabilities.core.currentRound`). Supply and asset metadata are not used. |
| `GET /core` | Public round genesis, 600-second duration, and confirmed `RoundRecorded` / `BatchSettled` event evidence. This supporting endpoint supplies the epoch that the two primary endpoints do not expose. |
| `GET /measurement/stats?range=7d` | API-reported daily distance for today’s UTC date. This supporting endpoint supplies daily totals; instantaneous `measurement.distanceMm` is **not** treated as a daily counter. |

Each endpoint is polled independently no more often than every **10 seconds**, with a 12-second request timeout and no overlapping requests. The app sends `If-None-Match` when an ETag is supplied and reuses a cached body on HTTP 304. Both forms of `Retry-After` (seconds or an HTTP date) delay subsequent requests, including after errors; repeated failures back off to a maximum regular delay of 120 seconds, while a longer `Retry-After` is honored. Cookies are omitted and requests send no referrer.

Unavailable fields are `unknown`, not zero. All measurement widgets, including height, daily distance and the round clock, become unknown if `measurement.freshness` is not `online`, the observation has expired, a counter fault occurs, or the status request fails. Old measurements expire after their reported stale interval, capped at 120 seconds, even if the server returns 304. Individual failed/missing supporting resources only affect the dependent widgets. A genuine fresh zero remains zero.

Squeek height uses integer arithmetic: `floor(cumulativeBlockUnits / 1_000_000_000)`, falling back to the explicit anchor `blockHeight` if block units are missing. Only an increase after the first known height triggers a pop and, when enabled, a three-note synthesized chime.

The round ID is `floor((serverNowSeconds - genesisTimestamp) / 600) + 1`; its end is `genesisTimestamp + roundId * 600`. The app calibrates its clock from a new status response, then lets it advance between polls. A 304 does not reset that clock. The countdown updates once a second.

Today’s distance is `distanceMm / 1000` from the API’s matching UTC day with **100% reported coverage**. It includes completed rounds and can lag current movement. Missing/incomplete coverage stays unknown; the app never adds up sparse telemetry samples or invents a day total. The displayed day follows the API’s day records and coverage classification.

## Chat game and local scores

When a channel is configured, the browser connects to **wss://irc-ws.chat.twitch.tv** with an anonymous `justinfan` nickname. It requests Twitch’s read-only tags/commands, joins the channel, answers PING, and reconnects after disconnection with a bounded backoff. It never sends `PRIVMSG`, an OAuth token, a chat reply, or a request to change a Twitch account.

- `!run` predicts positive work this round; `!sleep` predicts zero work. One vote per username per round; the **last vote counts**. Commands must be standalone, case-insensitive messages in the configured channel. Votes pause while the round is unknown.
- At the boundary a new vote bar opens immediately. Previous votes wait for the API’s confirmed `settledThroughRound`. Exact per-round work, unambiguous all-active/all-zero batches, consecutive anchor work deltas, or observed positive open-round work identify the outcome. A mixed batch without attributable work stays pending. Sleeping is never inferred from missing data or an idle instant.
- A known result pops up for ten seconds. Each correct chatter earns one cheer, once per round. The top ten sort by correct predictions, then name for ties.
- `!squeek` displays current RPM and height for **8 seconds**, with one shared **30-second** cooldown per overlay instance. It works even if those regular widgets are hidden and writes nothing back to chat.

Scores, current votes, pending rounds and scoring markers live in `localStorage`, scoped by Squeekchain installation, channel and session. They are local to that browser/OBS profile, not a global leaderboard or synchronized service. Up to 10,000 chatters per round and 10,000 scored usernames are retained; round records older than 144 rounds (24 hours) expire. Resolved vote lists are discarded after scoring. Pending ambiguous rounds receive no guessed score. If storage is unavailable or full, the game continues in memory and the studio reports the limitation. Clearing browser storage clears scores. Closing the source can miss chat messages; IRC does not replay them.

## Validation

Actual worker results, review findings, coverage and limitations are in [artifacts/validation.md](artifacts/validation.md). The implemented design system is in [DESIGN.md](DESIGN.md).

- `npm run typecheck`: passed with TypeScript 5.8.3.
- `npm run build`: passed with Vite 6.4.5; setup and static overlay exports generated.
- `npm test`: 24/24 logic tests passed.
- Production browser suite: 17/17 interaction groups passed, covering settings, keyboard and clipboard recovery, chat protocol/votes, timed rounds and local scoring, data/HTTP edge cases, overlay variants, transparency, reduced motion, contrast and resource checks.
- Pinned taste@1 design probe: 16/16 checks passed at 320, 390 and 1440 widths after fixes. The 390 × 844 first screen includes the product preview and copy action.
- Live public API/CORS and anonymous Twitch welcome were checked in Chromium. Game command/scoring tests use controlled public-protocol fixtures; no messages were posted to a real channel. Reconnection behavior was reviewed in source but not exercised against a live disconnect.

To rerun the browser suite after installation and a production build:

```sh
npx playwright install chromium
npm run test:browser
```

The runner manages its static server and browser inside one foreground command, under a `/preview/` subpath, and closes both. It accepts optional Playwright module, Chromium executable and axe module paths as its first, second and third arguments when tooling is installed outside the project.

Unperformed platform checks: native OBS/Streamlabs audio routing, audible sound on hardware, physical mobile devices, screen-reader sessions, native 200% browser zoom, sustained 60 fps under actual game capture, and WebKit (its required system libraries were unavailable). The wheel and hamster use CSS transforms for motion, with no JavaScript frame loop; host/browser performance still determines achieved frame rate.

Delivery path budget: the added root `.gitignore` is limited to 1 KiB and allowlists exactly seven review files under `artifacts/`: `validation.md`, `design-probe.json`, `render-evidence.json`, `setup-desktop.png`, `setup-mobile.png`, `setup-mobile-demo.png` and `overlay-1280.png`, together limited to 512 KiB. It also excludes dependency/cache directories at every nesting level and disposable `test/scratch/`. The complete submission remains below the assignment’s 8 MiB limit; the production export is 133,193 bytes in seven files. No dependency archives or caches are delivered.

## Source map and attribution

- `src/setup.ts`: studio, form validation, URL and clipboard interactions, instructions.
- `src/overlay.ts` + `src/art.ts`: reusable widget renderer and original SVG artwork.
- `src/api.ts` + `src/model.ts`: conditional polling, data availability, units and clock.
- `src/chat.ts` + `src/game.ts`: anonymous IRC, commands, round settlement and local scores.
- `src/config.ts`, `src/sound.ts`, `src/main.ts`, `src/style.css`: settings, synthesis, lifecycle and design tokens.
- `scripts/export.mjs`: static overlay entry with relative asset paths.
- `test/`: logic and production interaction tests. No test fixture values appear in the shipped site; only the explicitly labelled optional demo is in the setup preview.

Original application code and assets: MIT, [LICENSE](LICENSE). Design methodology was adapted from Jakub Krehel’s Better Interface (MIT) and the documentation method from Paul Bakaus’s Impeccable (Apache-2.0); notices and their licenses are in [licenses/design-guidance.txt](licenses/design-guidance.txt). No copied upstream visual assets or UI components are shipped.
