# Design System Strategy: Technical Editorial

## 1. Overview & Creative North Star: "The Monolith Scholar"

This design system is built upon the concept of **Technical Editorial**. It moves away from the "app-like" density of traditional SaaS and towards the authoritative, spacious layout of a prestige architectural journal or a high-end technical whitepaper.

The **Creative North Star** is "The Monolith Scholar": a digital experience that feels permanent, intentional, and intellectually rigorous. We achieve this through a "Monolith" structure—using heavy, grounded surfaces—contrasted with delicate, sharp typography. By adhering to a strict `roundedness` of 1, which represents subtle roundedness, we signal precision and engineering excellence, avoiding the friendly "bubbles" of consumer tech in favor of a sophisticated, professional edge.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is grounded in an earthy, academic muted green (`primary: #556B2F`) set against a warm, paper-like foundation.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Structural integrity is defined solely through background shifts.

- **Boundaries:** Use a `surface-container-low` section sitting on a `surface` background to define a sidebar or header.
- **Nesting:** Depth is achieved through the "Paper Stack" method. A `surface-container-lowest` card should sit atop a `surface-container` section. This creates a tactile, physical hierarchy without the visual clutter of lines.

### Signature Textures & Glass

- **The Muted Gradient:** For primary CTAs or Hero sections, do not use flat hex codes. Apply a subtle linear gradient from `primary_dim` to `primary` (#556B2F) at a 135-degree angle. This adds "soul" and depth to the muted green.
- **The Glass Overlay:** For floating navigation or context menus, use `surface_container_lowest` at 85% opacity with a `24px` backdrop blur. This ensures the "technical editorial" feel remains modern and layered.

---

## 3. Typography: The Tension of Scale

We utilize a high-contrast pairing between **Be Vietnam Pro** (Display/Headline) and **Inter** (Body/Label).

- **Display & Headline (Be Vietnam Pro):** These are your "Architectural" elements. Use `display-lg` (3.5rem) with tight tracking (-0.02em) to create a bold, editorial impact. Headlines should feel like titles in a printed book.
- **Body & Labels (Inter):** These are your "Functional" elements. `body-md` (0.875rem) is the workhorse. Ensure ample line-height (1.6) to maintain the minimalist, breathable aesthetic.
- **The Hierarchy of Authority:** Use `label-sm` in all-caps with 0.05em letter spacing for metadata and categories. This mimics the "technical specs" found in blueprints.

---

## 4. Elevation & Depth: Tonal Layering

In this system, elevation is a factor of color luminance, not physical height.

- **The Layering Principle:**
  - **Level 0 (Base):** `surface`
  - **Level 1 (Sections):** `surface-container-low`
  - **Level 2 (Active Cards):** `surface-container-lowest`
- **Ambient Shadows:** If a floating element (like a Modal) requires a shadow, it must be "Ambient." Use the `on-surface` color at 4% alpha with a 32px blur and 8px Y-offset. It should feel like a soft glow, not a drop shadow.
- **The Ghost Border Fallback:** If accessibility requires a stroke (e.g., in high-contrast modes), use `outline-variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Precision Primitives

### Buttons

- **Primary:** Background `primary` (#556B2F), text `on_primary`. `roundedness` of 1. No shadow.
- **Secondary:** Background `secondary_container`, text `on_secondary_container`.
- **Tertiary:** No background. Text `primary` (#556B2F). Hover state uses `surface_container_high`.

### Input Fields

- **Styling:** Forgo the "box." Use a `surface-container-highest` background with a `roundedness` of 1 bottom-weighted `outline_variant` (2px thickness).
- **Focus:** Transition the bottom border to `primary` (#556B2F).

### Cards & Lists

- **Rule:** Divider lines are strictly forbidden.
- **List Items:** Use vertical whitespace (`spacing` of 2 or 16px–24px) to separate items. On hover, apply a `surface-container-low` background fill to the entire row.
- **Cards:** Use the "Paper Stack" method (Level 2 depth) with 32px internal padding to emphasize the editorial "breathable" feel. `roundedness` of 1.

### Technical Data Tables (Special Component)

In a technical editorial system, tables are core. Use `surface-container-lowest` for the header row and `surface` for alternating rows (zebra striping) at a very low contrast (2% shift). Headers must be `label-sm` in all-caps.

---

## 6. Do's and Don'ts

### Do

- **Use Intentional Asymmetry:** Align text to a 12-column grid, but leave the first 2 columns empty for a "marginalia" feel.
- **Embrace White Space:** If a section feels "empty," it is likely working. Do not fill space for the sake of it. The `spacing` of 2 supports a normal, breathable layout.
- **Respect the Roundedness of 1:** Ensure every corner—from buttons to checkboxes to large image containers—strictly adheres to subtle roundedness (`roundedness` of 1).

### Don't

- **Don't use pure black:** Use `on_surface` for text to maintain the "ink-on-paper" warmth.
- **Don't use standard shadows:** Avoid the default Material or Tailwind shadow sets. They are too aggressive for this aesthetic.
- **Don't use icons as decoration:** Icons should only be used for functional actions. For storytelling, use typography and scale.
