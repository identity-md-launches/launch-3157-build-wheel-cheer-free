# Wheel Cheer design system

## Overview

Wheel Cheer is a free overlay studio for streamers. The setup page uses a cozy dark arcade palette, an original pixel hamster and a quiet illustrated stream scene. The preview and **Copy overlay URL** are the main task; settings, chat guidance and OBS instructions support it.

The studio stays dark. Overlay themes apply only to the reusable widget, whose surrounding canvas is always transparent. Flat tonal groups organize the setup page; restrained shadows separate the overlay from game footage. Source of truth: [src/style.css](src/style.css), [src/setup.ts](src/setup.ts), [src/overlay.ts](src/overlay.ts) and [src/art.ts](src/art.ts).

## Colors

The `:root` palette in `src/style.css` uses hexadecimal primitives and semantic aliases. Setup components reference the aliases. The text selection colour also uses them (`--accent` on `--bg`). Raw hex values are left only inside the illustrated scene and the overlay theme blocks, which keep their own per-theme palette.

| Primitive / semantic token | Value | Role |
| --- | --- | --- |
| `--charcoal-950` / `--bg` | `#1A1A20` | Setup page background |
| `--charcoal-900` / `--surface` | `#23232B` | Controls and toolbar surfaces |
| `--charcoal-800` / `--field` | `#2D2D36` | Fields and neutral controls |
| `--charcoal-700` / `--border` | `#41414C` | Dividers and field boundaries |
| `--cream-100` / `--text` | `#F3EEE5` | Primary text |
| `--gray-300` / `--muted` | `#B5B3BD` | Supporting text |
| `--amber-400` / `--accent` | `#F5BA69` | Copy action, selected layout, brand highlight |
| `--mint-300` / `--positive` | `#A4D9BD` | Connected state, supporting links, live heading dot |
| `--amber-300` / `--accent-hover` | `#FFD08D` | Copy action hover (pointer devices only) |
| `--violet-300` / `--chat` | `#BCADF0` | Twitch chat icon, chat explainer icon, command tags |
| `--focus` | `#B9E8D1` | Keyboard focus perimeter |
| `--error` | `#FFB4B1` | Inline channel validation |

The `.wheel-overlay` defines a separate semantic set, inherited by all widget parts:

| Theme class | `--o-bg` | `--o-text` | `--o-muted` | `--o-inset` | `--o-divider` |
| --- | --- | --- | --- | --- | --- |
| `.theme-dark` (base values) | `#202229` | `#F3EEE5` | `#BABBC3` | `#373B44` | `#414550` |
| `.theme-light` | `#F5EFE4` | `#302D29` | `#655F55` | `#D8D0C0` | `#D2CABA` |
| `.theme-transparent` | transparent | `#F3EEE5` | `#E0DFE4` | `#454955` | transparent |

Clear theme retains `#1A1A20EF` backplates behind text. It does not place bare text directly on arbitrary footage. `--overlay-accent` follows the chosen color; `--overlay-accent-text` is calculated by `accentText()` in `src/config.ts` to preserve readable numeric text. The studio presets are amber, mint `#A4D9BD`, lilac `#BCADF0` and rose `#EEA7AB`.

Running, sleeping, unknown, connected and unavailable states all have text as well as color cues. Contrast checks and their coverage are recorded in [artifacts/validation.md](artifacts/validation.md); no unmeasured contrast ratios are asserted here.

## Typography

The setup uses `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, with regular 400 and bold 700. No remote font is requested. The six size tokens are `--text-xs: 12px`, `--text-sm: 14px`, `--text-base: 16px`, `--text-lg: 20px`, `--text-xl: 32px` and `--text-display: 44px`.

The headline is bold 44px / 1.13 with `-0.035em` tracking on wide screens, and 32px on smaller screens. Section headings use 20px; body text uses 14–16px with 1.5–1.7 line height; labels and supporting data use 12–14px. Body tracking is natural. Headings use `text-wrap: balance`; prose uses `text-wrap: pretty`.

`.pixel-number` uses the original local **Wheel Bits**, then `ui-monospace, "Courier New", monospace`, at weight 400 with tabular numbers. Its rounded 5×7 numeral forms are in [src/wheel-bits.woff2](src/wheel-bits.woff2); `@font-face` declares its numeric/punctuation subset and `font-display: swap`. Unknown values use the readable system sans via `.is-unknown`. RPM uses 32px, or 44px in the side panel; secondary metrics use 20px. Timers and counters stay tabular.

Long metric values and chatter names wrap. The full overlay URL stays available in a selectable, horizontally scrollable native input. Essential values are not replaced with ellipses. Final rendered inspection confirmed the local font loaded.

## Layout

Header, main content and footer share a maximum width of 1280px. Spacing uses repeated 4, 8, 12, 16, 20, 24, 28 and 32px values rather than a separate spacing-token library. Related control content is close; groups receive 20–24px separation. `.studio` is the main grid; `.preview-column`, `.controls-panel`, `.preview-panel` and `.export-section` are its reuse points.

| Width | Implemented behavior |
| --- | --- |
| 1424px and above | Centered 1280px content; 352px settings column, fluid preview, 28px gap; preview scene 16:10 |
| 1061–1423px | 40px outside gutters; 332px settings column, 24px gap; scene 16:11 |
| 801–1060px | 28px gutters; 304px settings column, 20px gap; headline 32px; scene square; secondary intro detail hidden |
| 800px and below | One column: preview, export action, settings, chat explainer; scene 16:9; OBS steps stack |
| 480px and below | 20px gutters, 72px header; scene 4:3; compact toolbar; secondary export caption hidden |
| 350px and below | 16px gutters; copy/open actions wrap rather than overflow |

The preview appears before controls in the DOM. The desktop grid puts controls beside it; mobile reading and keyboard order follow the preview and export action. At 390×844, the copy button is visible at y=730.875 with height 48px. Reflow was checked at 320, 390, 720, 1000 and 1440px.

Overlay classes are `.layout-badge` (336px base width, bottom left), `.layout-bar` (1040px, bottom left) and `.layout-panel` (320px, top right). Canvas inset is 24px, or 20px inside the preview. `WheelOverlay.fit()` applies a transform up to the requested scale while fitting the full content, notices and optional sound button inside the canvas. All layout/theme combinations were exercised at 1920×1080 and 1280×720, including maximum scale and populated scores.

## Elevation & Depth

The setup uses tonal surfaces, spacing and structural dividers, without card shadows. Selection uses an outline on the layout illustration and a filled segment for theme selection. Focus uses a 2px perimeter with 4px offset; custom radio/switch indicators receive their own focus rules. Forced-colors rules retain system indicators.

The overlay surface uses `drop-shadow(0 4px 6px #0005)` to separate it from footage. Clear theme uses `drop-shadow(0 2px 3px #0005)` and individual text backplates. Artwork is decorative and does not intercept pointer input.

Event notices are normal-flow children of `.overlay-notices`, defined at the end of `src/style.css`. These final rules supersede the earlier absolute popup positions. Notices stack vertically in the badge/panel and horizontally in the bar, so a block cheer, round result and `!squeek` can coexist.

## Shapes

The radius tokens are `--radius-sm: 8px`, `--radius-md: 12px` and `--radius-lg: 16px`. Small buttons/fields use the smaller radii; larger grouped surfaces use 12–16px. Clear-theme text backplates use 6px. Circular color swatches and round status dots are the deliberate exceptions. Pixel edges belong to the SVG art and number font; interface text and controls remain smooth and legible.

## Components

| Pattern / implementation | Use and states |
| --- | --- |
| `SetupPage`, `src/setup.ts` | Builds the studio; live URL updates, labelled controls, inline channel validation, clipboard success/failure, demo and reset. Hooks are `onChange`, `onDemo`, `onCheer`. |
| `.primary-button`, `.secondary-button`, `.text-button`, `.icon-button` | Hover colours sit inside `@media (hover: hover)`, so a tap on a touch screen does not leave a stuck hover state; `:active` (copy scales to 0.98) and `:focus-visible` apply everywhere. Amber copy action, neutral open link (both use the explicit `overlay/index.html?…` file URL), contextual actions and named icon controls. Native buttons/links keep keyboard activation and focus. Success changes the copy label; denied clipboard selects the URL and explains manual copying in a stable live region. |
| `.layout-choice`, `.theme-choice` | Labelled native radio groups with arrow-key selection. Layout uses illustrated thumbnails and one amber selection outline; theme uses segmented surfaces. |
| `.widget-choice`, `.custom-color`, `.sound-control` | Native checkbox, color and switch controls. Labels share their hit targets. Range input and linked output control scale. |
| `.channel-input`, `.field-hint`, `.field-error` | Persistent Twitch label and example placeholder. Errors set `aria-invalid`, describe allowed names, and receive focus when copying/opening cannot proceed. |
| `.preview-panel`, `.stream-stage` | Original illustrated sample footage, actual reusable overlay, live/unknown/demo status and pause/test actions. The `.preview-dot` beside “Live preview” follows the footer status: mint when connected, `--muted` with `.is-offline` while connecting or unavailable, amber with `.is-demo` during demo data. Demo is labelled in the widget and studio; it is never put in the generated overlay URL. |
| `WheelOverlay`, `src/overlay.ts` | `configure()` applies layout, theme, accent, widgets and motion; `update()` renders fresh data, votes and scores. Individual widget switches use `hidden`. Missing or stale fields say `unknown`; fresh zeros remain zero. The status chip, caption, `z` sprite and wheel follow `wheelState()` (fresh RPM > 0 = Running, 0 = Sleeping, `coreStatus` only when RPM is missing, stale = Unknown). Today’s distance uses `distanceText()`: `0.0` + unit `m`, or `unknown` with an empty unit. The setup preview is this same component with the same snapshot. |
| `.vote-widget`, `.leaderboard-widget` | Counts and proportional vote bar, chat connection/pending messages, ordered session top ten. Empty board explains how to fill it; names use escaped text and bidirectional isolation. |
| `.overlay-notices` | Three-second block cheer, ten-second confirmed result and eight-second wheel check. Each has static text as well as optional motion. |
| `.help-details`, `.instruction-steps` | Native expandable tips and sequential OBS instructions. No modal or custom focus trap is needed. |

Original assets live in `src/art.ts`, `src/wheel-bits.woff2` and `public/`. Reuse `icon()`, `hamsterLogo()`, `wheelArt()` and `sceneArt()` rather than adding another icon family or third-party artwork.

Motion is defined inside `prefers-reduced-motion: no-preference`. Wheel rotation takes `60 / RPM` seconds per revolution; hamster and paw motion follow the speed. Unknown/zero RPM pauses it. The studio pause button and `motion=0` stop motion, and the reduced-motion query removes animations/transitions. Motion uses CSS transforms without a JavaScript frame loop. Actual 60 fps in OBS remains hardware-dependent and was not measured under game capture.

## Do’s and Don’ts

- Start another setup/help page with the shared header/main/footer alignment, existing semantic color aliases and six-size type scale. Reuse native controls and the button classes.
- Keep the filled amber action for the primary task. Use neutral secondary actions and contextual text actions around it.
- Keep live, demo and unknown states explicit. Preserve text labels alongside color and motion.
- Put additional overlay notices inside `.overlay-notices`; include their height in fitting and check both target canvases.
- Keep the preview scenery out of the actual overlay. Retain text backplates in Clear theme.
- Do not add remote artwork/fonts, trackers, account or wallet flows. Avoid card nesting, clipped critical values and guessed live readings.

Design method: Jakub Krehel’s Better Interface (MIT, revision `267330e1adfc66a718fb65fa6918c1f06d0a689e`); documentation method: Paul Bakaus’s Impeccable (Apache-2.0, revision `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Notices and upstream links are retained in [licenses/design-guidance.txt](licenses/design-guidance.txt).
