# Wheel Cheer validation

Worker review of the final source and production export. The first review was on 8 November 2026. It was re-run in full on **10 November 2026** for this job, after the fixes listed under “Review of 10 November 2026”. These are local check results, not an independent certification.

| Area | Result |
| --- | --- |
| Production build / typecheck | Passed |
| Logic tests | 30/30 passed |
| Production browser interaction groups | 18/18 passed |
| Pinned taste@1 checks | 16/16 passed |
| Product and primary action on first 390px screen | Yes, at 390 × 844 (live data, 10 Nov) |
| Setup automated accessibility scan | Zero axe violations for the selected WCAG 2.2 AA tags |
| Unresolved reproduced defects | None found in the tested scope |
| Platform coverage limits | Listed below; no claim of full accessibility or OBS certification |

## Review of 10 November 2026 (this job)

This job carries on from the delivered project; the brief asked for no new feature. The work was:

- reinstall from the lockfile;
- rebuild and confirm the committed export was reproducible: before any edit, the rebuilt `dist/` matched the committed one byte for byte;
- re-run every check;
- review the export again against all six Better Interface domains, then fix what that review found.

The design, layouts, widgets, chat game and URLs are unchanged.

| Severity / domain | Source | Finding, fix and recheck |
| --- | --- | --- |
| Medium · UI / writing | `src/setup.ts:346`, `src/style.css:768` | The dot next to the **Live preview** heading was always mint (`--positive`). It still read as live while the footer said “Connection lost · retrying” (seen on the probe's offline 390 screenshot) and during demo data. It now follows the footer state: mint when connected, `--muted` while offline or connecting, amber during demo. Recheck in live Chromium: class `preview-dot` (live), `preview-dot is-demo` (demo), `preview-dot` again after leaving demo, and `preview-dot is-offline` in a run where the API was unreachable. |
| Low · accessibility / UI | `src/style.css:216`, `:326`, `:802`, `:953`, `:967` | The five `:hover` treatments (nav link, text, icon, primary and secondary buttons) applied on touch screens, where a tap can leave a hover state stuck. They are now inside `@media (hover: hover)`. Recheck: on emulated touch at 390px, `(hover: hover)` is false and the copy button keeps `rgb(245, 186, 105)` after a tap. At 1440px with a mouse, hover still changes it to `rgb(255, 208, 141)`. |
| Low · colors | `src/style.css:28`, `:29`, `:129`, `:409`, `:608`, `:997`, `:1017` | The setup page repeated raw hex values that already had tokens: selection colours, the layout thumbnail bars, three copies of the chat violet, and the copy hover amber. These now use existing aliases or the new role tokens `--accent-hover` (`--amber-300` `#FFD08D`) and `--chat` (`--violet-300` `#BCADF0`). The rendered values are identical, so contrast is unchanged. The overlay theme blocks keep their deliberate per-theme literals. |
| Test reliability | `test/browser.mjs:217` | The first browser run this job failed at the “IDLE + 77.1 RPM” step: the reading was still 72.4. The `advance()` helper waited a fixed 80 ms after moving the virtual clock, and this machine sometimes took longer to answer and render the poll. It now waits until any poll triggered by the jump has been answered, then 250 ms for rendering. The suite then passed 18/18 twice. The product code was not changed for this. |

**Domain coverage this run.** Accessibility, layout, writing, typography, colors and UI were all checked again.

- **Without a browser:** six size tokens (12/14/16/20/32/44px); weights 400 and 700 only; no `transition: all`; motion only inside `prefers-reduced-motion: no-preference`, with a `reduce` block; nine `:focus-visible` rules; a `forced-colors` block; no physical margin or padding properties; `text-wrap: balance`/`pretty` on headings and prose.
- **With a browser (Chromium only):** keyboard focus on the copy button renders `solid 2px rgb(185, 232, 209)`; axe found zero violations on the setup page; no horizontal overflow at 320, 390 or 1440 (0px each); live values matched between the setup preview and the overlay; no page errors.

Not performed this run: WebKit, screen readers, native zoom, physical devices, OBS itself.

**Live data, 10 November.** Chromium reached the public `https://api.squeekchain.com/v1` through this machine's egress proxy. Headless Chromium has to be given the proxy credentials explicitly; the browser suite and the probe use no proxy, so they show the offline state.

- The setup preview and the copied overlay URL both showed: Sleeping, 0.0 RPM, today 0.0 m, Squeek height 5,376, round 971 with a running countdown, and “Squeekchain connected”.
- A direct request to `/status` returned `freshness: online`, `coreStatus: IDLE`, `rpmMilli: 0` and `blockHeight: 5376`. The response included an ETag and `access-control-allow-origin: *`.
- The 0.0 values are a genuine fresh zero, not a substitute for missing data.

The refreshed screenshots are [setup-mobile.png](setup-mobile.png) (390 × 844), [setup-desktop.png](setup-desktop.png) (1440 full page) and [overlay-1280.png](overlay-1280.png) (transparent background). They were viewed after capture. [render-evidence.json](render-evidence.json) holds the measured values; the local preview port is replaced with a placeholder. [setup-mobile-demo.png](setup-mobile-demo.png) is from 8 November; the demo screen did not change apart from the heading dot, which is now amber.

**Commands this run, from the repository root (all exit 0):**

```sh
npm ci
npm run typecheck                 # tsc --noEmit, TypeScript 5.8.3
npm run build                     # Vite 6.4.5 + scripts/export.mjs; dist/ 134,097 bytes in 7 files
npm test                          # 30 tests, 30 pass, 0 fail
node test/browser.mjs <playwright index.mjs> <chromium-headless-shell 1248> <axe index.mjs>   # 18/18 PASS
IMD_PLAYWRIGHT=test/scratch/pw-adapter.mjs node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste   # 16/16
```

The installed Playwright 1.61.1 looks for a headless-shell build that is not on this machine. Both the suite and the probe were therefore pointed at the installed `chromium_headless_shell-1248` executable; the probe went through a scratch adapter that only sets that path. The probe source is unmodified. Its output is in [design-probe.json](design-probe.json). It passes at 320, 390 and 1440, including targets, contrast, type sizes, slogans, copy budget and share metadata.

## Scope and assumptions (first review, 8 November)

Reviewed `/` and the explicitly exported `/overlay/` from `dist/`, served under a `/preview/` subpath. The setup supports three layouts, three overlay themes, arbitrary six-digit accent colors, scale, widget selection, optional Twitch channel, sound and motion. Preview sample footage is original SVG art; the output page has a transparent canvas.

Design idea: a readable, quiet overlay studio organized around an original pixel hamster and a cozy night-time stream preview.

Consequential choices:

- “Today” means the API’s UTC day, with a completed-round daily total and full reported coverage. Sparse movement samples are not accumulated into a made-up total.
- Round timing comes from the public `/core` genesis and 600-second duration, with availability cross-checked against `/economy/state`. The two required primary endpoints do not expose the genesis by themselves.
- Scores are explicitly local to the browser/OBS profile and session. There is no claim of a shared or global leaderboard.
- A last vote replaces the same chatter’s earlier vote in that round. Results wait for settlement and attributable work; a mixed batch with insufficient evidence remains pending.
- No channel means no Twitch connection. Live Twitch testing requested an anonymous welcome only; no real-channel message was sent.

## Assignment coverage

| Requirement | Implementation / evidence |
| --- | --- |
| Static setup and browser-source overlay | `dist/index.html` and `dist/overlay/index.html`; no backend or runtime package dependency |
| Layout, theme, accent, scale and widgets | Native studio controls; URL/settings browser group and 18 overlay variants passed |
| Optional channel and sound | Validated Twitch field, switch, read-only IRC and synthesized chime; audio scheduling tested |
| Preview, copy URL and OBS instructions | Actual clipboard copy, denied-clipboard recovery and keyboard activation passed; instructions on page and in README |
| Live RPM gauge and speed-coupled original sprite | `WheelOverlay.update()`, SVG art and CSS transforms; positive, zero, missing and reduced-motion states tested |
| Running/sleeping and unknown values | `makeSnapshot()` freshness/expiry/fault gates; fresh zero distinguished from missing data |
| Today’s metres, Squeek height, block pop and round clock | API-backed daily totals, BigInt division by 1e9, confirmed increase cheer and genesis-based 600-second rounds |
| Ten-second polling, ETag and Retry-After | Independent endpoint pollers; fixture tests cover conditional 304, expiry, moving clock and delayed retries |
| Anonymous Twitch chat | `justinfan` NICK, JOIN, CAP and PING/PONG; no OAuth or PRIVMSG; protocol fixture and live welcome checks |
| Per-round run/sleep votes and result animation | Last vote per chatter, settlement gating, animated/static result and exactly-once scoring tested |
| Session top ten in localStorage | Ranking, reload persistence, session separation, storage failure and pending ambiguous results tested |
| Eight-second `!squeek`, rate-limited | Fixture clock verifies eight-second display and shared 30-second cooldown |
| 1920×1080 and 1280×720 | Three layouts × three themes × two canvases checked, at maximum scale with populated scores/notices |
| Original assets, no trackers, English | Local SVG art, local numeral WOFF2, original favicon/share PNG; runtime hosts limited to public API and optional Twitch |
| Responsive first screen, metadata | Screenshots and bounding-box measurements; title, description, favicon, og:title and og:image present |
| Source, lockfile, complete relative export and docs | `package-lock.json`, source, seven-file `dist/`, root DESIGN/README and this report included |

## Better Interface review

The supplied workflow and the core principles of all six domains were applied during implementation and checked against the final export. Supporting guidance covered forms, focus, motion, text wrapping, contrast, responsive layout and design documentation. The brief’s dark pixel-art direction was retained. Wallet guidance is not applicable: the product requires no wallet or transactions.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls/landmarks, labelled fields, errors and focus recovery, radio arrows, checkbox Space, copy Enter, skip link, polite statuses, reduced motion and automated axe scan. Final focused copy action inspected visually. Screen readers, native zoom and physical touch were not tested. |
| Layout | Checked | Production screenshots, mobile first screen, DOM/keyboard order, widths 320/390/720/1000/1440, two overlay canvases and simultaneous notices. No horizontal overflow, detected text overlaps or clipping in the final probe. Localization/RTL are not applicable to this English-only assignment. |
| Writing | Checked | Action labels match handlers; channel errors give an exact correction; clipboard failure gives manual instructions; live/demo/unknown, pending results and local-only scores are explicit. No account, shared-score or zero-on-failure claims. |
| Typography | Checked | Six source size tokens; probe measured five sizes per setup viewport, two families and two weights. Local Wheel Bits loaded; numbers are tabular, unknown uses sans, names and values wrap. Physical-device font rendering and text-only enlargement were not tested. |
| Colors | Checked | Source semantic tokens, setup probe contrast, axe overlay-theme contrast and numeric accent algorithm. Logic tests cover 256 grayscale accents in each of three themes (768 cases). Clear theme uses dark text backplates, including a worst-case white-footage background in accent calculations. Arbitrary real-game footage was not exhaustively sampled. |
| UI details | Checked | Native control states, empty board, loading/offline/unknown data, invalid field, clipboard failure/success, demo, chat and result states, original icons, motion pause and reduced motion. Theme updates are immediate; no transition-all. Browser Animations-panel playback at 10% speed and hardware audio were not performed. |

The target probe found all 27 measured controls at least 24px or sufficiently spaced at 390px. It also reported 22 below the more comfortable 44px target. The copy action is 48px high. This remains a documented density limitation, rather than a claim that every control has a 44px hit area.

## Findings fixed before the final export

Source references below point to the final correction. Earlier failing outputs are not presented as current behavior.

| Severity / domain | Source | Observed issue, correction and recheck |
| --- | --- | --- |
| High · data/UI | `src/api.ts:37` | Browser fixtures exposed an unbound native fetch invocation, preventing live data. Bound the fetcher to `globalThis`. Production fixture checks and live API widgets subsequently passed. |
| High · data/writing | `src/api.ts:100`, `src/model.ts:63` | Repeated 304 responses could reset the clock to an old generated timestamp and preserve stale readings. Calibrate only on a new 200 body; expire the observation independently. Fixture countdown advances through 304 and measurements become unknown after expiry. |
| Medium · UI | `src/overlay.ts:101` | An ACTIVE state with zero/missing RPM could still suggest wheel movement. Spin now requires known positive RPM. Browser checks show no wheel animation for zero, missing RPM or reduced motion. |
| Medium · UI | `src/overlay.ts:134` | A transient unknown installation could reset the block baseline, missing a catch-up cheer. Reset only on a known changed installation. Confirmed post-gap height increase schedules exactly three Web Audio notes. |
| Medium · layout | `src/overlay.ts:44`, `src/style.css:2552` | Simultaneous block/result/chat popups occupied overlapping absolute positions. Put notices in normal flow, vertical for badge/panel and horizontal for bar; include their full height in fitting at `src/overlay.ts:235`. Browser bounding boxes no longer intersect and all target variants fit. |
| Medium · layout | `src/setup.ts:52` | Decorative sample-scene HUD text overlapped the preview’s overlay identity at 390px. Removed that redundant text; the scene remains illustrated background. Final mobile screenshot and overlap probe pass. |
| Medium · UI | `src/style.css:2531` | Layout-radio surface treatments created the probe’s nested-card finding. Flattened the radio surface and kept one selected outline on the small illustration. Final probe reports zero cards inside cards. |
| Medium · colors | `src/config.ts:113` | Arbitrary accents could make numeric text unreadable in a theme. Added a computed contrast fallback while preserving the decorative selected color. All 768 grayscale/theme cases meet the tested 4.5:1 threshold; rendered theme checks pass. |

Additional correctness checks cover counter faults, missing daily coverage, exact large block counters, malformed day/event entries, stale game state after a session/channel change, escaped chatter names and unavailable storage. These are logic/interaction checks, not additional visual findings.

## Commands and actual results (8 November)

The last source change was followed by the production build, typecheck, logic suite, browser suite and pinned probe. Documentation/evidence added afterward does not alter the site bundle.

The worker used normal dependency packages from an external tooling cache, avoiding changes to repository `node_modules/`:

```sh
npm exec --yes --package=vite@6.4.5 --package=typescript@5.8.3 -c 'npm run typecheck && npm run build && npm test'
```

Result: exit 0; TypeScript 5.8.3 passed; Vite 6.4.5 built the setup and the export script produced the overlay directory; Node test runner reported 24 tests passed, zero failed. Build assets include the 1.09 kB local numeral font, 38.18 kB CSS and 49.44 kB JavaScript. The complete export also includes both HTML entries, favicon and share image.

Production browser command (three external tooling path arguments omitted here):

```sh
node test/browser.mjs <playwright-module> <chromium-headless-shell> <axe-module>
```

Result: exit 0, 17/17 interaction groups. The suite owns and closes its foreground static server/browser. It uses the real built assets beneath `/preview/`, controlled API/IRC fixtures and virtual browser time. Coverage:

1. Relative production resources load; no chat connection without a channel.
2. Setup axe scan: zero violations for the selected WCAG A/AA tags.
3. Layout/theme/accent/scale/widgets/sound/motion settings and actual clipboard copy.
4. Clipboard denial selects the URL and explains manual recovery.
5. Keyboard arrows, Space and Enter activate the primary controls.
6. No overflow at five widths; product and copy action fit the first mobile screen.
7. Labelled demo stays out of output URLs; test cheer preserves actual height.
8. Channel validation, anonymous IRC, PING/PONG, votes and squeek timing/cooldown.
9. Round result, exactly-once point award and localStorage reload persistence.
10. Exactly three synthesized note oscillators on a confirmed block increase.
11. All 18 layout/theme/canvas combinations fit, including maximum scale and populated scores; page background is transparent.
12. RPM-driven motion and reduced-motion preference.
13. Clear-theme text/backplate automated contrast; dark/light variants also scanned in the variant loop.
14. Zero and unavailable RPM stop the wheel.
15. `/overlay` directory redirect retains query parameters; stale measurements become unknown.
16. Ten-second ETag polling, moving clock through 304, stale expiry and Retry-After suppression.
17. No production page errors or missing local resources.

The provided browser launcher could not start its Chromium instance because its socket path exceeded the platform limit. Verification used Playwright with an installed Chromium headless-shell executable instead. WebKit was downloaded but could not start because required system libraries were unavailable; no WebKit pass is claimed.

Pinned design probe:

```sh
IMD_PLAYWRIGHT="$PWD/test/scratch/pw-adapter.mjs" node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The adapter only selects the working installed browser executable. The probe source is unmodified. Result: exit 0, 16/16 passed at 320, 390 and 1440px. The check outputs are retained in [design-probe.json](design-probe.json). It reports no overflow, overlap, hidden-text clipping, script/local-resource failure, failing measured text contrast or reduced-motion failure. It measures five type sizes per setup viewport, two families/two weights, 18 words of first-screen mobile prose, and all required metadata. The probe’s offline live-data state is supplemented by explicitly running fixture-animation checks and the live inspection below.

## Live inspection and screenshots

Chromium fetched the actual public API with CORS enabled and rendered live RPM, sleeping/running state, UTC daily distance, Squeek height and the countdown. The final capture observed fresh sleeping values, including a genuine 0.0 RPM and 0.0 metres; these were not substituted when data was missing. Anonymous Twitch NICK/CAP received a welcome without credentials, joining a real channel or posting a message. Real-channel command traffic and live disconnect/reconnection were not exercised.

- [setup-desktop.png](setup-desktop.png): final 1440px-wide full page, live data.
- [setup-mobile.png](setup-mobile.png): final 390 × 844 first screen, live data.
- [setup-mobile-demo.png](setup-mobile-demo.png): same screen with explicitly labelled running demo.
- [overlay-1280.png](overlay-1280.png): final 1280 × 720 Clear lower third, transparent PNG background, live data.
- [render-evidence.json](render-evidence.json): final mobile action bounds, loaded local font, public live readings, overlay bounds and page-error list.

The screenshots were viewed after capture. Mobile copy bounds are x=20, y=730.875, width=216.71875, height=48 CSS pixels, inside the first 844px. A Light side-panel demo and the mobile focused copy state were additionally inspected; temporary screenshots remain only in disposable test scratch space.

## Remaining limitations and completion

Not performed: native OBS/Streamlabs browser-source integration and audio mixer routing, audible sound on hardware, physical mobile devices, screen-reader sessions, native 200% browser zoom, text-only enlargement, forced-colors visual inspection, live chat reconnection, WebKit rendering, slow-motion inspection in the browser’s Animations panel, or sustained 60 fps while capturing a real game. CSS transform animation avoids a JavaScript frame loop; this does not establish achieved frame rate on every host.

Public services can be unavailable. Missing data is unknown and polling retries; unknown mixed round batches stay pending. Local scores do not synchronize between the setup tab and OBS profiles, and closed sources miss chat messages. These are documented behavior and static-hosting limits, not simulated successes.

**Complete for the stated repository scope.** Source, lockfile, relative static export, original runtime assets, design documentation and actual local check results are included. Hosting/publication is outside this assignment. No dependency cache, dependency archive or scratch artifact is part of the submission. README records an explicit path/byte budget for the narrow evidence allowlist in `.gitignore`; the production export is now 134,097 bytes in seven files and the complete delivery is below 1 MiB, within the 8 MiB limit.
