---
name: VFloat Docs
description: Friendly-mentor Read-mode docs where every floating primitive is proven live.
colors:
  brand-text: "#18794e"
  brand-hover: "#299764"
  brand-solid: "#30a46c"
  brand-wash: "rgba(16, 185, 129, 0.14)"
  paper: "#ffffff"
  paper-soft: "#f6f6f7"
  paper-sunken: "#f6f6f7"
  paper-raised: "#ffffff"
  quiet-fill: "#ebebef"
  hairline: "#e2e2e3"
  control-edge: "#c2c2c4"
  ink: "#3c3c43"
  ink-muted: "#67676c"
  ink-faint: "#929295"
  white: "#ffffff"
  signal-cyan: "#00e5ff"
  signal-cyan-pale: "#c3f5ff"
  mark-ink: "#0c0e11"
  glyph-paper: "#e2e2e6"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: "64px"
    letterSpacing: "-0.4px"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    letterSpacing: "-0.76px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  pill: "20px"
  card: "16px"
  panel: "12px"
  control: "8px"
  chip: "6px"
  code: "4px"
  kbd: "3px"
components:
  button-brand:
    backgroundColor: "{colors.brand-solid}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
  button-brand-hover:
    backgroundColor: "{colors.brand-hover}"
  button-alt:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
  demo-tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.4rem 0.7rem"
  anchor-button:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.55rem 0.95rem"
  floating-tooltip:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.4rem 0.65rem"
  size-badge-highlight:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.brand-text}"
    rounded: "{rounded.control}"
    padding: "0.35rem 0.75rem"
---

# Design System: VFloat Docs

## Overview

**Creative North Star: "The Reading Room"**

The docs are a quiet room for reading first and touching second. Prose explains like a friendly mentor — plain language, gotcha guides that warn before you stumble — and every behavioral claim is proven within arm's reach by a live demo, a code panel, or an interactive sandbox. Nothing performs; the demos carry the conviction.

Controls stay small and restrained: hairline borders, muted text, green reserved for the active state. Surfaces are flat and paper-like; depth appears only where the product itself floats. There is no marketing shine anywhere — no decorative gradients, no glow effects, no illustration. The one glow in the system lives inside the brand-mark asset and never leaks into the interface.

**Key Characteristics:**
- Read-first, live-proof: prose mentors, demos demonstrate.
- Restrained controls: quiet at rest, green only when active.
- Flat paper surfaces; shadows belong to floating things.
- Token-honest: stock VitePress default chrome under a thin VFloat skin.

## Colors

A Vue-green scale does all the interface work; the mark's cyan stays inside its asset.

### Primary
- **Deep Vue Green** (#18794e; dark #3dd68c): links, active tab and preset text, tip containers, the hero name. The most solid step, used for colored text on washes.
- **Vue Hover** (#299764; dark #30a46c): hover state of brand buttons and links.
- **Vue Solid** (#30a46c; dark #298459): solid fills that must carry white text — the primary hero button.
- **Vue Wash** (rgba(16, 185, 129, 0.14); dark rgba(16, 185, 129, 0.16)): subtle tinted backgrounds — highlight badges, tip containers, active pills.

### Neutral
- **Paper** (#ffffff; dark #1b1b1f): main page background; also the resting face of tabs and buttons.
- **Soft Paper** (#f6f6f7; dark #202127): gently distinguished surfaces — demo tab strips, tables, header bars.
- **Sunken Paper** (#f6f6f7; dark #161618): recessed surfaces — sidebar, code blocks, sandbox floor.
- **Raised Paper** (#ffffff; dark #202127): elevated faces — floating panels, tab indicators, copy buttons.
- **Quiet Fill** (#ebebef; dark #32363f): secondary button fill.
- **Hairline** (#e2e2e3; dark #2e2e32): every divider and component border.
- **Control Edge** (#c2c2c4; dark #3c3f44): borders on interactive outlines.
- **Ink** (#3c3c43; dark #dfdfd6): primary text.
- **Muted Ink** (#67676c; dark #98989f): secondary text, captions, inactive controls.
- **Faint Ink** (#929295; dark #6a6a71): placeholders, captions, drag icons.

### Brand mark accents (from `docs/public/vfloat-mark.svg`, the only bespoke artwork)
- **Signal Cyan** (#00e5ff): the mark's glow accent. Independent of the interface scale; never used in the UI.
- **Pale Signal** (#c3f5ff): the bright end of the mark gradient.
- **Mark Ink** (#0c0e11): the mark's near-black tile.
- **Glyph Paper** (#e2e2e6): the mark's off-white V glyph.

### Named Rules
**The Green Accent Rule.** Vue green is the interface accent. The mark's cyan lives only inside its asset and never appears in the UI.
**The Wash Rule.** Tinted backgrounds are always translucent washes, never solids, so layered softs compose instead of clashing.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui fallbacks)
**Body Font:** Inter (same stack)
**Label/Mono Font:** ui-monospace stack (Menlo, Monaco, Consolas, Liberation Mono, Courier New) for code and kbd tags.

**Character:** One workhorse sans for everything prose, one honest mono for everything code. Weight and size do the hierarchy work; there is no display face.

### Hierarchy
- **Display** (700, 56px/64px, -0.4px): the home hero name only.
- **Headline** (600, 38px, -0.76px): doc page titles.
- **Body** (400, 16px/24px): doc prose, captions, demo copy.
- **Label** (600, 14px): hero buttons, tabs, badges, control labels.
- **Code** (mono, 16px in blocks): fenced code uses the palenight scheme on sunken paper; inline code is a 4px-radius chip with pale-blue text.

### Named Rules
**The Balance Rule.** Display lines and captions use balanced wrapping (`text-wrap: balance`) — hero name, tagline, sandbox captions.

## Layout

A centered single column on a 1376px maximum stage. The nav is a 64px hairline-divided bar (brand mark, wordmark, Guide/API, local search, appearance toggle, GitHub). The home hero is a centered 760px column; the interactive showcase that follows is capped at 1152px. Doc pages use the stock sidebar (272px, 320px on mobile) with guide/API groupings.

Density is airy: 1.5–2rem separates showcase and demo sections, 1rem pads panels, 0.4–0.75rem gaps controls. Demo panels hold a clamped stage height (18–24rem) so every example reads as a self-contained instrument. Responsive behavior is two stock breakpoints with small custom adjustments: below 768px the showcase header stacks and the view switch centers; below 640px card radii step down (12px to 10px) and captions shrink. There is no formal spacing scale — rhythm is literal values, consistent by habit.

## Elevation & Depth

Flat by default. Pages, cards, and controls render with hairlines and tonal fills; shadows appear only as a response to state or floating.

### Shadow Vocabulary
- **Rest** (`0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)`): tabs, anchors, tab indicators at rest.
- **Hover lift** (`0 3px 12px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.07)`): anchor buttons on hover.
- **Float** (`0 12px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)`): floating tooltip/popover panels, dragging anchors.
- **Deep float** (`0 14px 44px rgba(0, 0, 0, 0.12), 0 3px 9px rgba(0, 0, 0, 0.12)` and the larger 5th step): reserved for modal-scale surfaces.
- **Control lift** (`0 8px 18px rgba(0, 0, 0, 0.12)`, deepening to 0.16 on hover): the demo copy button, which floats above code.

### Named Rules
**The Flat-By-Default Rule.** Static content never casts shadows. If it doesn't float or respond, it gets a hairline, not a shadow.

## Shapes

Corners are rounded and purposeful, largest on calls to action, smallest on metadata. Hero buttons are full pills (20px); demo cards are softly rectangular (16px); the showcase card sits at 12px; controls, tabs, badges, anchors, and floating panels share a friendly 8px; the view switch and reset button tighten to 6px; inline code chips take 4px; kbd tags take 3px. The brand mark is a squircle tile (28px radius on 128px) — the only bespoke geometry in the system.

### Named Rules
**The Hairline Rule.** Separation is always a 1px divider, never a shadow or a gap. Borders, tab strips, panel edges, and table rules all use the hairline token.

## Components

### Buttons
Restrained pills with two voices. **Shape:** full pill (20px). **Primary:** Vue Solid fill with white 600 14px text and `0 20px` padding; hover deepens to Vue Hover. **Secondary:** Quiet Fill with ink text; hover follows the stock theme. Focus is always a 2px brand outline with 2px offset — never removed, never restyled.

### Search
The stock local-search box lives in the nav (minisearch provider, no external service). It inherits theme chrome; the skin does not restyle it beyond the brand wash for highlighted matches.

### Demo tabs
Small quiet tabs on a soft strip. **Shape:** 8px, transparent at rest with muted 500 text; hover warms to paper with ink text; active takes a hairline border, paper fill, ink text. The code variant adds a floating copy button (raised paper, 8px, control lift shadow) that reports Copy, Copied, or Failed.

### Showcase card (signature)
The home page instrument: a 12px hairline card stacking a preset nav (Tooltip, Popover, Menu, Virtual Anchor) with a sliding elevated indicator pill, a Preview/Code view switch with its own sliding highlight, a controls toolbar (placement, offset, flip, shift, arrow, keep-open), a 380px sandbox floor with caption and reset-anchor control, and a live code panel. Active states speak green; motion is a 0.24s expo-out slide.

### Size badges
Proof-of-lightweight chips: quiet fill with muted label and mono value at 8px; the highlighted badge (gzip) switches to Vue Wash fill with brand text and a 6px brand dot.

### Floating panels and arrows (signature)
The product demonstrating itself: elevated-paper panels (8px radius, hairline border, float shadow) with per-pattern padding — tooltips are compact inline-flex rows with shortcut tags. Arrows are 10px rotated squares in raised paper with per-side hairline borders. Hovering an anchor rims it in brand; dragging deepens its shadow.

### Kbd tags
Tiny 3px instruction chips: sunken fill, hairline border, mono 0.72rem muted text.

### Code panels
Fenced code renders the palenight scheme on sunken paper; inline code is a 4px chip with pale-blue text. Code tabs are never the default view — preview first, code on request.

### Navigation
Stock VitePress default chrome with two VFloat touches: the brand mark before the wordmark and the local search box. Sidebar groupings follow the config; no further custom visual rules. Leave the rest alone.

## Do's and Don'ts

### Do:
- **Do** pair every behavioral claim with a live demo, sandbox, or code panel within the same page.
- **Do** reserve green for active and actionable states; rest is muted ink on paper.
- **Do** keep focus visible with the 2px brand outline on all custom controls.
- **Do** use translucent washes for tinted backgrounds so layers compose.
- **Do** balance-wrap display lines and captions.

### Don't:
- **Don't** add marketing gradients, glow effects, or decorative illustration — the mark's glow stays inside its asset.
- **Don't** use the mark's cyan anywhere in the interface; it lives only inside its asset.
- **Don't** introduce any accent hue beyond the green scale.
- **Don't** shadow static content; flat pages, floating panels.
- **Don't** restyle stock nav, search, and sidebar chrome beyond the skin tokens.
