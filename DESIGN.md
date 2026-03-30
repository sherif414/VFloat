# Design System: VFloat Documentation

**Source Project:** Interactive Playground - VFloat  
**Project ID:** 17590113177838199247  
**Canonical Design Asset:** VFloat Kinetic Frame (`assets/da63276b8e0644d29a190855be71c927`)  
**Synced From Stitch:** March 30, 2026  
**Reference Screens:** Homepage - VFloat, Quick Start - VFloat Docs, API Reference - VFloat, Interactive Playground - VFloat

## 1. Visual Theme & Atmosphere

The VFloat documentation should feel like a spatial instrument panel rather than a default docs template. The visual language is dark-first, editorial, and engineered: sharp edges, crisp hierarchy, and strong negative space. The overall mood is midnight, technical, and precise, with just enough glow and glass to remind the reader that this library is about floating layers, anchored geometry, and motion-aware interaction.

This is not soft SaaS UI. It should feel more like a blueprint, a lab display, or a technical drawing wall. Layouts should prefer asymmetry over perfect centering, tonal layers over visible dividers, and restrained accents over constantly colorful interfaces.

## 2. Core Design Principles

### Dark-First Precision

The primary expression of the docs is a deep charcoal canvas with pale mineral text and electric cyan accents. Avoid pure black. The base should feel atmospheric rather than flat.

### The No-Line Rule

Large sections should not be separated with obvious 1px borders. Use tonal shifts, spacing, and changes in elevation instead. If a boundary is absolutely necessary, it must behave like a ghosted technical guide rather than a standard UI border.

### Tonal Stacking Over Shadows

Depth should mostly come from stacking nearby dark values:

- Foundation surfaces sit at the deepest charcoal level.
- Sections step up one tone from the page background.
- Cards and code modules step up again.
- Floating overlays use the brightest neutral surface plus blur.

Traditional fuzzy shadows should be rare, soft, and slightly cyan-tinted when used.

### Editorial Restraint

Accent color is a signal, not a fill strategy. Cyan should mark important interaction points, active states, coordinates, and moments of emphasis. If the page reads as "blue" at a glance, the accent is overused.

## 3. Color Palette & Roles

The palette below is aligned to the exact token values found in the `VFloat Kinetic Frame` design asset. These values should be treated as canonical for implementation.

### Core Surfaces

- **Surface / Midnight Carbon (`#111317`)**: Global page background and the deepest foundation layer.
- **Surface Container Low / Subsurface Charcoal (`#1a1c1f`)**: Section scaffolds, side rails, and quiet structural zones.
- **Surface Container / Module Slate (`#1e2023`)**: Cards, code blocks, demo modules, and embedded panels.
- **Surface Container High / Raised Module (`#282a2d`)**: Hover lifts and emphasized neutral panels.
- **Surface Container Highest / Lifted Glass (`#333538`)**: Floating overlays, sticky glass bars, and elevated utility surfaces.
- **Surface Container Lowest / Void Panel (`#0c0e11`)**: Deep inset wells and the darkest nested stage surfaces.
- **Surface Bright (`#37393d`)**: Occasional highlight for neutral hover or active container lifts.

### Text & Neutral Contrast

- **On Surface / Soft Mineral (`#e2e2e6`)**: Default body text and primary reading color.
- **Tertiary / Mineral White (`#ebedf0`)**: Brightest structural highlight text and key emphasis.
- **On Surface Variant / Mist Gray (`#bac9cc`)**: Secondary text, metadata, and quieter labels.
- **Outline (`#849396`)**: Hairline utility strokes when absolutely needed.
- **Outline Variant / Ghost Outline (`#3b494c`)**: Very subtle separators, guide lines, and fallback borders at low opacity.

### Accent System

- **Primary / Laser Cyan (`#c3f5ff`)**: Soft glow, gradient starts, hover energy, and light-accent emphasis.
- **Primary Container / Signal Cyan (`#00e5ff`)**: Strong active states, focus lines, anchors, and spatial markers.
- **Primary Fixed / Ice Cyan (`#9cf0ff`)**: Bright CTA fill for primary buttons and high-energy emphasis surfaces.
- **Primary Fixed Dim / Cyan Tint (`#00daf3`)**: Subtle glow tint, luminous accents, and shadow coloration when needed.

### Supporting Neutrals

- **Secondary (`#c8c6c5`)**: Muted neutral support tone for lower-energy UI accents.
- **Secondary Container (`#4a4949`)**: Quiet dark support surfaces when a component needs contrast without entering the cyan system.
- **Tertiary Container (`#cfd1d4`)**: Pale neutral fill for bright detail treatments or light technical highlights.

### Override Anchors

- **Override Neutral (`#0D0F12`)**: Deepest reference neutral for atmospheric backgrounds.
- **Override Primary (`#00E5FF`)**: Canonical brand-accent anchor.
- **Override Tertiary (`#F5F7FA`)**: Crisp near-white highlight reference.

### Color Usage Guidance

- Use the dark neutral stack for roughly 90-95% of the interface.
- Reserve cyan for interaction logic, active wayfinding, and floating-state emphasis.
- Prefer gradients that move from `#c3f5ff` to `#00e5ff` at an angle rather than flat bright fills.
- Use `#3b494c` and `#849396` sparingly; the system should separate zones through tone and spacing first.
- When a shadow is unavoidable, tint it with `#00daf3` at very low opacity rather than using a generic gray-black drop shadow.

## 4. Typography Rules

### Headlines

Use **Space Grotesk** for display and headline typography. Headlines should feel assertive, technical, and slightly compressed through tighter tracking. Large hero headlines can be bold and spacious in scale, but their rhythm should remain controlled and architectural.

### Body Copy

Use **Inter** for long-form reading, navigation text, and general UI copy. Body text should stay highly legible and neutral, allowing the content and examples to lead. Favor comfortable line-height and avoid overly dense paragraph blocks.

### Technical Text

Code, coordinates, token names, and implementation labels should use a crisp monospace face. When a concrete font is needed in implementation, choose a precise technical mono such as Azeret Mono or JetBrains Mono. Monospace usage should signal system metadata, not replace the main reading voice.

## 5. Geometry, Shape & Texture

- Corners should default to **sharp, squared-off edges**. This design language is intentionally anti-bubbly.
- Primary containers should feel machined and exact, not playful.
- Floating elements may soften through blur and translucency, but not through heavy roundness.
- Gradients should feel like display light or instrument glow, not decorative candy color.
- Thin guide lines, crosshair details, and bounding-box motifs are encouraged when they support the spatial story.

## 6. Elevation & Depth

The docs should express depth the same way the VFloat library does: through layering.

- **Level 0:** Page background in Midnight Carbon.
- **Level 1:** Section scaffolds in Subsurface Charcoal.
- **Level 2:** Content modules and code surfaces in Module Slate.
- **Level 3:** Floating overlays and utility panels in Lifted Glass with backdrop blur.

For floating menus, sticky navigation, command surfaces, or playground controls, use semi-transparent dark surfaces with blur so they feel suspended over the page rather than boxed inside it.

## 7. Component Stylings

### Buttons

- **Primary buttons:** Sharp corners, high-contrast dark text on cyan or a cyan gradient. They should feel like an activated instrument control.
- **Secondary buttons:** Sharp corners, dark neutral surface, faint ghost border, and mineral text.
- **Hover behavior:** Introduce a restrained cyan glow or tonal lift, not a dramatic bounce.

### Navigation

- Side navigation should read like a structural rail, not a card with borders.
- Active states should use cyan markers, text shifts, or subtle surface lifts.
- Sticky top bars or utility headers can use translucent dark glass with blur to reinforce the floating identity.

### Cards & Containers

- Use tonal separation instead of visible outlines.
- Keep internal spacing generous so technical content feels deliberate and premium.
- Avoid divider lines inside cards; separate sub-sections with spacing or surface changes.

### Code Blocks

- Code blocks should feel inset and grounded.
- Use a deep neutral background with generous padding and strong text contrast.
- Optional technical labels, bounding guides, or language tags can add system character without overwhelming the content.

### Inputs & Controls

- Inputs should avoid heavy boxing.
- Underline-led or minimally framed treatments fit the system best.
- Focus states should transition into Signal Cyan, with ghost-border logic instead of thick outlines.

### Playground Surfaces

- The interactive playground is the signature component of the system.
- Demo stages should feel like floating instruments: dark layered panels, glass controls, cyan markers, and precise alignment.
- Crosshair motifs, coordinate labels, anchored callouts, and subtle glow cues should appear here more than anywhere else on the site.

## 8. Layout Principles

### Intentional Asymmetry

The page should not feel centered just because docs sites usually are. Offset hero copy, demos, callouts, or side content to create editorial tension. Content should feel composed, not templated.

### Spacious Rhythm

Use wide gutters and generous vertical spacing. Major sections should breathe. Dense information should be grouped into calm modules so the experience feels premium even when content-heavy.

### Surface-Led Structure

Organize the page with background zones and depth changes:

- Sidebar against page background.
- Main article against a slightly raised section tone.
- Code, demos, and callouts nested as deeper modules.

### Live Demo Priority

Whenever a page includes a playground or interactive example, it should be treated as a hero artifact rather than a secondary embed. The page should frame demos as proof of capability.

## 9. Signature Motifs

- Cyan crosshairs or corner markers for spatial emphasis.
- Thin bounding-box guides around important modules.
- Glass utility bars that feel suspended above content.
- Tight editorial headings paired with quieter technical body copy.
- Dark layered surfaces with occasional cyan-lit edges.

## 10. Do's and Don'ts

### Do

- Use asymmetry to create editorial energy.
- Use tonal layering before reaching for borders.
- Let live demos and code examples feel like premium artifacts.
- Keep the accent system disciplined and purposeful.
- Treat floating overlays as a core visual metaphor across the site.

### Don't

- Don't default to a generic docs look with outlined panels and safe rounded cards.
- Don't use pure black backgrounds or bright cyan as a full-page wash.
- Don't rely on hard dividers to create hierarchy.
- Don't soften the system with bubbly radii or overly friendly UI gestures.
- Don't let visual decoration overpower technical clarity.
