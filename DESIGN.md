---
name: VFloat Docs
description: Friendly-mentor Read-mode docs where every floating primitive is proven live.
colors:
  brand-text: "#ffffff"
  brand-hover: "#f4f4f5"
  brand-solid: "#ffffff"
  brand-wash: "rgba(255, 255, 255, 0.08)"
  paper: "#ffffff"
  paper-soft: "#f6f6f7"
  paper-sunken: "#f6f6f7"
  paper-raised: "#ffffff"
  quiet-fill: "#ebebef"
  hairline: "rgba(0, 0, 0, 0.07)"
  control-edge: "#c2c2c4"
  ink: "#09090b"
  ink-body: "#52525b"
  ink-muted: "#71717a"
  ink-faint: "#a1a1aa"
  white: "#ffffff"
  tertiary: "oklch(70.4% 0.191 22.216)"
  tertiary-wash: "oklch(70.4% 0.191 22.216 / 0.14)"
  code-text: "#18181b"
  code-bg: "rgba(0, 0, 0, 0.04)"
  code-border: "rgba(0, 0, 0, 0.04)"
  signal-cyan: "#00e5ff"
  signal-cyan-pale: "#c3f5ff"
  mark-ink: "#0c0e11"
  glyph-paper: "#e2e2e6"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: "52px"
    letterSpacing: "-0.4px"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.5px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
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
    textColor: "{colors.ink}"
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
    backgroundColor: "{colors.tertiary-wash}"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.control}"
    padding: "0.35rem 0.75rem"
---

# Design System: VFloat Docs

## Overview

**Creative North Star: "The Reading Room"**

The docs are a quiet room for reading first and touching second. Prose explains like a friendly mentor — plain language, gotcha guides that warn before you stumble — and every behavioral claim is proven within arm's reach by a live demo, a code panel, or an interactive sandbox. Nothing performs; the demos carry the conviction.

Controls stay small and restrained: whisper-soft borders, muted text, crisp white reserved for the active state, and a rare warm coral tertiary accent used with maximum restraint. Surfaces rely on layered elevation rather than rigid wireframe borders: code blocks, interactive sandboxes, and primary cards lift gently with soft ambient shadows. There is no marketing shine anywhere — no decorative gradients, no glow effects, no illustration. The one glow in the system lives inside the brand-mark asset and never leaks into the interface.

**Key Characteristics:**
- Read-first, live-proof: prose mentors, demos demonstrate.
- Restrained controls: quiet at rest, crisp white only when active.
- Layered elevation & soft boundaries: ambient depth for containers and code blocks, whisper-soft translucent hairlines.
- Token-honest: stock Nuxt UI / Docus chrome under a refined VFloat skin.

## Colors

A high-contrast monochrome white scale does the primary interface work; a radiant vermilion coral (`oklch(70.4% 0.191 22.216)`) serves as a rare tertiary accent; the mark's cyan stays inside its asset.

### Primary (White Accent)
- **Stark White** (#ffffff; dark #ffffff): links, active tab and preset text, primary button fill, focus outlines, key selection indicators.
- **White Hover** (#f4f4f5; dark #e4e4e7): hover state of brand buttons and primary links.
- **Brand Solid** (#ffffff; dark #ffffff): solid fills that carry high-contrast inverted dark text — the primary hero button.
- **White Wash** (rgba(0, 0, 0, 0.05); dark rgba(255, 255, 255, 0.08)): subtle translucent backgrounds — active pills, keep-open toggle active state, selection highlights.

### Tertiary (Warm Vermilion Coral)
- **Electric Coral** (`oklch(70.4% 0.191 22.216)`): reserved exclusively for micro-focal accents used very sparingly — such as the benchmark proof dot.
- **Coral Wash** (`oklch(70.4% 0.191 22.216 / 0.14)`): delicate translucent background wash for rare tertiary focal elements like the Gzip proof badge.

### Neutral
- **Paper** (#ffffff; dark #1b1b1f): main page background; also the resting face of tabs and buttons.
- **Soft Paper** (#f6f6f7; dark #202127): gently distinguished surfaces — demo tab strips, tables, header bars.
- **Sunken Paper** (#f6f6f7; dark #161618): recessed surfaces — sidebar, code blocks, sandbox floor.
- **Raised Paper** (#ffffff; dark #202127): elevated faces — floating panels, tab indicators, copy buttons.
- **Quiet Fill** (#ebebef; dark #32363f): secondary button fill.
- **Hairline** (rgba(0, 0, 0, 0.07); dark rgba(255, 255, 255, 0.07)): whisper-soft translucent boundary across all dividers, card rims, and component edges. Blends organically into underlying surfaces without creating stark wireframes.
- **Control Edge** (#c2c2c4; dark #3c3f44): borders on interactive outlines.
- **High-Contrast Ink** (#09090b; dark #ffffff): titles, headings (H1-H4), strong emphasis, active states. Crisp foreground with maximum contrast.
- **Body Ink** (#52525b; dark #9ca3af): sustained reading prose, list copy, paragraph text. Soft silver tone in dark mode that prevents reading glare and creates immediate depth against pure white headings.
- **Muted Ink** (#71717a; dark #787882): lead descriptions, inactive navigation, TOC anchors, secondary labels.
- **Faint Ink** (#a1a1aa; dark #52525b): group headers, placeholders, shortcuts, and subtle metadata.
- **Code Chip Token** (#18181b; dark #e4e4e7): sleek monochromatic chip on subtle translucent fill (`rgba(0, 0, 0, 0.04)` / dark `rgba(255, 255, 255, 0.07)`) with an ultra-soft translucent rim (`rgba(0, 0, 0, 0.04)` / dark `rgba(255, 255, 255, 0.05)`). Delivers clean technical elegance without distraction.

### Brand mark accents (from `public/vfloat-mark.svg`, the only bespoke artwork)
- **Signal Cyan** (#00e5ff): the mark's glow accent. Independent of the interface scale; never used in the UI.
- **Pale Signal** (#c3f5ff): the bright end of the mark gradient.
- **Mark Ink** (#0c0e11): the mark's near-black tile.
- **Glyph Paper** (#e2e2e6): the mark's off-white V glyph.

### Named Rules
**The White Accent Rule.** Crisp stark white is the primary interface accent across the dark reading room canvas; controls and active states speak in high-contrast monochrome clarity.
**The Sparingly-Used Tertiary Rule.** The warm vermilion coral (`oklch(70.4% 0.191 22.216)`) is an electric micro-accent deployed with extreme restraint—reserved strictly for high-value focal moments (such as live proof dots or status beacons) so its rarity preserves its maximum visual force.
**The Wash Rule.** Tinted backgrounds are always translucent washes, never solids, so layered softs compose instead of clashing.

## Typography

**Display Font:** Inter (with ui-sans-serif, system-ui fallbacks)
**Body Font:** Inter (same stack)
**Label/Mono Font:** ui-monospace stack (Menlo, Monaco, Consolas, Liberation Mono, Courier New) for code and kbd tags.

**Character:** One workhorse sans for everything prose, one honest mono for everything code. Weight and size do the hierarchy work; there is no display face.

### Hierarchy
- **Display** (700, 44px/52px, -0.4px): the home hero name only.
- **Headline** (600, 26px, -0.5px): doc page titles.
- **Body** (400, 13px/21px): doc prose, captions, demo copy, and sidebar navigation items.
- **Label** (600, 13px): hero buttons, tabs, badges, control labels.
- **Code** (mono, 12px in blocks): fenced code uses the palenight scheme on sunken paper; inline code is a 4px-radius chip at 12px.
- **Micro / Kbd** (mono, 11px): kbd tags and metadata tags.

### Named Rules
**The Balance Rule.** Display lines and captions use balanced wrapping (`text-wrap: balance`) — hero name, tagline, sandbox captions.

## Layout

A centered single column on a 1376px maximum stage. The nav is a 64px hairline-divided bar (logo-less typographic wordmark, Guide/API, local search, appearance toggle, GitHub). The home hero is a centered 760px column; the interactive showcase that follows is capped at 1152px. Doc pages use the stock sidebar (272px, 320px on mobile) with guide/API groupings.

Density is airy: 1.5–2rem separates showcase and demo sections, 1rem pads panels, 0.4–0.75rem gaps controls. Demo panels hold a clamped stage height (18–24rem) so every example reads as a self-contained instrument. Responsive behavior is two stock breakpoints with small custom adjustments: below 768px the showcase header stacks and the view switch centers; below 640px card radii step down (12px to 10px) and captions shrink. There is no formal spacing scale — rhythm is literal values, consistent by habit.

## Elevation & Depth

Elevation-first hierarchy with soft boundaries. Content containers—fenced code blocks, interactive showcase instruments, demo sandboxes, and cards—rely on subtle ambient and directional elevation rather than heavy structural borders. Borders are whisper-soft translucent rims (4–7% opacity) providing crisp optical edge definition on high-density displays without caging content.

### Shadow Vocabulary
- **Code Block Elevation** (`0 1px 3px rgba(0, 0, 0, 0.025), 0 1px 2px -1px rgba(0, 0, 0, 0.02)`; dark `0 2px 8px -1px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.12)`): fenced code blocks, lifting with a delicate, whisper-soft glow.
- **Container Elevation** (`0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 3px -1px rgba(0, 0, 0, 0.02)`; dark `0 4px 16px -2px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15)`): home showcase card, install command card, demo sandboxes.
- **Rest** (`0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)`): tabs, anchors, tab indicators at rest.
- **Hover lift** (`0 3px 12px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.07)`): anchor buttons on hover.
- **Float** (`0 12px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)`): floating tooltip/popover panels, dragging anchors.
- **Deep float** (`0 14px 44px rgba(0, 0, 0, 0.12), 0 3px 9px rgba(0, 0, 0, 0.12)` and the larger 5th step): reserved for modal-scale surfaces.
- **Control lift** (`0 8px 18px rgba(0, 0, 0, 0.12)`, deepening to 0.16 on hover): the demo copy button, which floats above code.

### Named Rules
**The Soft-Elevation Rule.** Containers and code blocks rely on soft ambient elevation and tone for separation rather than heavy borders. Structural borders remain translucent whispers (4–7% opacity) for optical crispness.

## Shapes

Corners are rounded and purposeful, largest on calls to action, smallest on metadata. Hero buttons are full pills (20px); demo cards are softly rectangular (16px); the showcase card sits at 12px; controls, tabs, badges, anchors, and floating panels share a friendly 8px; the view switch and reset button tighten to 6px; inline code chips take 4px; kbd tags take 3px. The brand mark is a squircle tile (28px radius on 128px) — the only bespoke geometry in the system.

### Named Rules
**The Soft-Boundary Rule.** Separation balances soft layered elevation with whisper-soft 1px translucent hairlines. Heavy solid borders and wireframes are prohibited.
**The Architectural Dotted Accent Rule.** Dotted borders are reserved for technical sub-elements: interactive heading code symbols (`h2/h3 > a > code`), keyboard shortcut chips (`kbd`), internal card sub-dividers, and thematic breaks (`hr`). They bring delicate blueprint precision without cluttering primary container edges.

## Components

### Buttons
Restrained pills with two voices. **Shape:** full pill (20px). **Primary:** Brand Solid (white) fill with dark ink 600 14px text and `0 20px` padding; hover deepens to White Hover (`#f4f4f5`). **Secondary:** Quiet Fill with ink text; hover follows the stock theme. Focus is always a 2px outline with 2px offset — never removed, never restyled.

### Search
The stock local-search box lives in the nav (minisearch provider, no external service). It inherits theme chrome; the skin does not restyle it beyond the white wash for highlighted matches.

### Demo tabs
Small quiet tabs on a soft strip. **Shape:** 8px, transparent at rest with muted 500 text; hover warms to paper with ink text; active takes a hairline border, paper fill, ink text. The code variant adds a floating copy button (raised paper, 8px, control lift shadow) that reports Copy, Copied, or Failed.

### Showcase card (signature)
The home page instrument: a 12px softly elevated card stacking a preset nav (Tooltip, Menu, Combobox, Selection, Dialog) with a sliding elevated indicator pill, a controls toolbar (placement, keep-open), a 420–480px sandbox floor with caption and reset-anchor control, and interactive live presets. Active states speak crisp white; motion is a 0.24s expo-out slide.

### Size badges
Proof-of-lightweight chips: quiet fill with muted label and mono value at 8px; the highlighted badge (gzip) switches to Coral Wash fill with electric coral text and a 6px tertiary coral dot (`oklch(70.4% 0.191 22.216)`).

### Floating panels and arrows (signature)
The product demonstrating itself: elevated-paper panels (8px radius, hairline border, float shadow) with per-pattern padding — tooltips are compact inline-flex rows with shortcut tags. Arrows are 10px rotated squares in raised paper with per-side hairline borders. Hovering an anchor rims it in white; dragging deepens its shadow.

### Kbd tags
Tiny 3px instruction chips: sunken fill, delicate dotted border, mono 0.72rem muted text.

### Code panels
Fenced code renders on elevated sunken paper with soft ambient shadow and an ultra-soft translucent rim, lifting code gently from the reading flow. Inline code is a 4px chip with highlighted text and subtle micro-shadow. Code tabs are never the default view — preview first, code on request.

### Navigation
Docus header chrome with a clean, logo-less typographic wordmark (`VFloat`), navigation links, and local search. Sidebar groupings follow the config; no further custom visual rules. Leave the rest alone.

## Do's and Don'ts

### Do:
- **Do** pair every behavioral claim with a live demo, sandbox, or code panel within the same page.
- **Do** rely on layered elevation to give code blocks and primary showcase containers tactile presence on the page.
- **Do** reserve crisp white for active and actionable states; rest is muted ink on paper.
- **Do** reserve tertiary coral (`oklch(70.4% 0.191 22.216)`) strictly for rare micro-focal anchors (such as benchmark proof dots or status beacons).
- **Do** keep focus visible with the 2px outline on all custom controls.
- **Do** use translucent washes for tinted backgrounds so layers compose.
- **Do** balance-wrap display lines and captions.

### Don't:
- **Don't** add marketing gradients, glow effects, or decorative illustration — the mark's glow stays inside its asset.
- **Don't** use the mark's cyan anywhere in the interface; it lives only inside its asset.
- **Don't** overuse the tertiary coral color; its strength and delight come directly from its extreme scarcity.
- **Don't** use heavy opaque wireframe borders to separate containers; use soft elevation with translucent hairline rims.
- **Don't** restyle stock nav, search, and sidebar chrome beyond the skin tokens.
