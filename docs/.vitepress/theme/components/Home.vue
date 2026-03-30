<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { flip, offset, shift, useArrow, useFloating } from "v-float";

interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface FooterItem {
  label: string;
}

interface BehaviorCard {
  title: string;
  description: string;
  icon: string;
  variant: "shift" | "flip" | "offset" | "boundary";
}

interface MetricCard {
  id: string;
  value: string;
  label: string;
  description: string;
}

type HeroPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "left"
  | "right"
  | "bottom-start"
  | "bottom"
  | "bottom-end";

const navItems: NavItem[] = [
  { label: "Docs", href: "/guide/", active: true },
  { label: "Examples" },
  { label: "API", href: "/api/" },
  { label: "Community" },
];

const footerItems: FooterItem[] = [
  { label: "Privacy" },
  { label: "Security" },
  { label: "Terms" },
  { label: "Status" },
];

const behaviorCards: BehaviorCard[] = [
  {
    title: "Shift",
    description:
      "Keeps elements within view by sliding along the axis when the boundary is reached.",
    icon: "trending_flat",
    variant: "shift",
  },
  {
    title: "Flip",
    description: "Automatically mirrors placement to the opposite side if space is insufficient.",
    icon: "swap_vert",
    variant: "flip",
  },
  {
    title: "Offset",
    description: "Fine-tune positioning with pixel-perfect distance controls on any axis.",
    icon: "straighten",
    variant: "offset",
  },
  {
    title: "Boundary",
    description: "Full awareness of viewports, containers, and custom obstacle detection.",
    icon: "",
    variant: "boundary",
  },
];

const metricCards: MetricCard[] = [
  {
    id: "METRIC_01",
    value: "4.2kb",
    label: "Minified + Gzipped",
    description: "Lightweight core that doesn't compromise on feature density.",
  },
  {
    id: "METRIC_02",
    value: "120+",
    label: "Geometric Tests",
    description: "Exhaustive testing across edge-cases and nested scroll containers.",
  },
  {
    id: "METRIC_03",
    value: "0.1ms",
    label: "Average Recalc",
    description: "Engineered for 60fps interaction even during heavy layout shifts.",
  },
  {
    id: "METRIC_04",
    value: "99.9%",
    label: "Browser Support",
    description: "Cross-browser consistency from legacy engines to modern standards.",
  },
];

const packageVersion = "0.11.0";

const heroAnchorEl = useTemplateRef("heroAnchorEl");
const heroFloatingEl = useTemplateRef("heroFloatingEl");
const heroArrowEl = useTemplateRef("heroArrowEl");
const heroOpen = ref(true);
const heroPlacement = ref<HeroPlacement>("top");

const heroContext = useFloating(heroAnchorEl, heroFloatingEl, {
  placement: heroPlacement,
  open: heroOpen,
  middlewares: [offset(28), flip(), shift({ padding: 24 })],
});

const { arrowStyles } = useArrow(heroContext, {
  element: heroArrowEl,
  offset: "-6px",
});

const matrixControls: Array<{ key: string; placement?: HeroPlacement; label: string }> = [
  { key: "top-start", placement: "top-start", label: "Top start" },
  { key: "top", placement: "top", label: "Top" },
  { key: "top-end", placement: "top-end", label: "Top end" },
  { key: "left", placement: "left", label: "Left" },
  { key: "center", label: "Anchor center" },
  { key: "right", placement: "right", label: "Right" },
  { key: "bottom-start", placement: "bottom-start", label: "Bottom start" },
  { key: "bottom", placement: "bottom", label: "Bottom" },
  { key: "bottom-end", placement: "bottom-end", label: "Bottom end" },
];

const heroCoordX = computed(() => `${heroContext.position.x.value.toFixed(2)}px`);
const heroCoordY = computed(() => `${heroContext.position.y.value.toFixed(2)}px`);
const heroLatency = computed(() => (heroContext.position.isPositioned.value ? "2ms" : "--"));
const heroRecalc = computed(() => (heroContext.position.isPositioned.value ? "0.08ms" : "pending"));
const heroBounds = computed(() => {
  const stageEl = heroAnchorEl.value?.closest(".vf-home__stage") as HTMLElement | null;

  if (!stageEl) {
    return "800 x 800";
  }

  return `${Math.round(stageEl.clientWidth)} x ${Math.round(stageEl.clientHeight)}`;
});
const heroPlacementLabel = computed(() =>
  heroContext.position.placement.value.replace("-", "_").toUpperCase(),
);
const heroStatus = computed(() => (heroContext.state.open.value ? "OPTIMIZED" : "STANDBY"));
const heroActionLabel = computed(() =>
  heroContext.state.open.value ? "Close spatial panel" : "Open spatial panel",
);

const setHeroPlacement = (placement?: HeroPlacement) => {
  if (!placement) {
    return;
  }

  heroPlacement.value = placement;
  heroContext.state.setOpen(true);
};

const closeHeroPanel = () => {
  heroContext.state.setOpen(false);
};

const toggleHeroPanel = () => {
  heroContext.state.setOpen(!heroContext.state.open.value);
};
</script>

<template>
  <div class="vf-home">
    <nav class="vf-home__nav">
      <div class="vf-home__nav-inner">
        <div class="vf-home__nav-group">
          <a class="vf-home__brand" href="/">VFloat</a>
          <div class="vf-home__nav-links">
            <component
              :is="item.href ? 'a' : 'span'"
              v-for="item in navItems"
              :key="item.label"
              class="vf-home__nav-link"
              :class="{ 'is-active': item.active, 'is-placeholder': !item.href }"
              :href="item.href"
            >
              {{ item.label }}
            </component>
          </div>
        </div>

        <div class="vf-home__nav-meta">
          <div class="vf-home__nav-icons" aria-hidden="true">
            <span class="material-symbols-outlined">terminal</span>
            <span class="material-symbols-outlined">code</span>
          </div>
          <span class="vf-home__version">v{{ packageVersion }}</span>
        </div>
      </div>
    </nav>

    <main class="vf-home__main">
      <section class="vf-home__hero vf-home__spatial-grid">
        <div class="vf-home__hero-layout">
          <div class="vf-home__hero-copy">
            <p class="vf-home__eyebrow">SYSTEM_CORE_INIT</p>
            <h1 class="vf-home__title">
              Floating UI,
              <br />
              placed with
              <br />
              <span>precision.</span>
            </h1>
            <p class="vf-home__description">
              An architecturally sound spatial engine for the modern web. Built for technical
              excellence, designed for digital space.
            </p>
            <div class="vf-home__actions">
              <a class="vf-home__button vf-home__button--primary" href="/guide/">Get Started</a>
              <a
                class="vf-home__button vf-home__button--secondary"
                href="https://github.com/sherif414/VFloat"
              >
                View Source
              </a>
            </div>
          </div>

          <div class="vf-home__stage vf-home__debug-grid">
            <div class="vf-home__bounding-box" aria-hidden="true"></div>
            <div class="vf-home__guide vf-home__guide--vertical" aria-hidden="true"></div>
            <div class="vf-home__guide vf-home__guide--horizontal" aria-hidden="true"></div>

            <div class="vf-home__metrics-float">
              <div class="vf-home__metrics-row">
                <span class="vf-home__live-dot"></span>
                <span>RECALC: {{ heroRecalc }}</span>
              </div>
              <div class="vf-home__metrics-subrow">LATENCY: {{ heroLatency }}</div>
            </div>

            <button
              ref="heroAnchorEl"
              class="vf-home__anchor"
              type="button"
              :aria-label="heroActionLabel"
              @click="toggleHeroPanel"
            >
              <span class="vf-home__anchor-corner vf-home__anchor-corner--tl"></span>
              <span class="vf-home__anchor-corner vf-home__anchor-corner--tr"></span>
              <span class="vf-home__anchor-corner vf-home__anchor-corner--bl"></span>
              <span class="vf-home__anchor-corner vf-home__anchor-corner--br"></span>

              <div class="vf-home__anchor-labels">
                <span>ANCHOR</span>
                <span>512, 512</span>
              </div>
            </button>

            <div
              v-if="heroContext.state.open.value"
              ref="heroFloatingEl"
              class="vf-home__floating-shell"
              :style="heroContext.position.styles.value"
            >
              <div class="vf-home__popover">
                <div class="vf-home__popover-header">
                  <div class="vf-home__popover-titles">
                    <span>POPOVER_01</span>
                    <span>PLACEMENT: {{ heroPlacementLabel }}</span>
                  </div>
                  <button
                    class="vf-home__popover-close"
                    type="button"
                    aria-label="Close hero demo"
                    @click.stop="closeHeroPanel"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                </div>
                <p class="vf-home__popover-copy">
                  Spatial logic: {{ heroContext.position.placement.value }} alignment with auto-flip
                  and shift enabled.
                </p>
                <span
                  ref="heroArrowEl"
                  class="vf-home__popover-arrow"
                  :style="arrowStyles"
                  aria-hidden="true"
                ></span>
              </div>
            </div>

            <div class="vf-home__coords">
              <div class="vf-home__coords-row">
                <span class="vf-home__coords-line"></span>
                <span>COORD_X: {{ heroCoordX }}</span>
              </div>
              <div class="vf-home__coords-row">
                <span class="vf-home__coords-line"></span>
                <span>COORD_Y: {{ heroCoordY }}</span>
              </div>
            </div>

            <div class="vf-home__matrix">
              <div class="vf-home__matrix-grid">
                <button
                  v-for="control in matrixControls"
                  :key="control.key"
                  class="vf-home__matrix-dot"
                  :class="{
                    'is-active': control.key === 'center',
                    'is-selected': control.placement === heroContext.position.placement.value,
                  }"
                  :aria-label="control.label"
                  :disabled="!control.placement"
                  type="button"
                  @click="setHeroPlacement(control.placement)"
                ></button>
              </div>
              <span class="vf-home__matrix-label">Spatial_Matrix_Ctrl</span>
            </div>

            <div class="vf-home__data-overlay">
              <div class="vf-home__data-row">
                <span class="vf-home__data-dot"></span>
                <span>BOUNDS: {{ heroBounds }}</span>
              </div>
              <div class="vf-home__data-row">
                <span class="vf-home__data-dot"></span>
                <span>MODE: RELATIVE_ANCHOR</span>
              </div>
              <div class="vf-home__data-row is-active">
                <span class="vf-home__data-dot"></span>
                <span>
                  STATUS:
                  {{ heroContext.position.isPositioned.value ? heroStatus : "SYNCING" }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="vf-home__behaviors">
        <div class="vf-home__section-inner">
          <div class="vf-home__section-header">
            <h2>Core Behaviors</h2>
            <div class="vf-home__section-rule"></div>
          </div>

          <div class="vf-home__behavior-grid">
            <article v-for="card in behaviorCards" :key="card.title" class="vf-home__behavior-card">
              <div class="vf-home__behavior-visual" :data-variant="card.variant">
                <div v-if="card.variant !== 'boundary'" class="vf-home__behavior-anchor"></div>
                <template v-if="card.variant === 'shift'">
                  <div class="vf-home__behavior-shift-box">
                    <span class="material-symbols-outlined">{{ card.icon }}</span>
                  </div>
                  <div class="vf-home__behavior-axis"></div>
                </template>
                <template v-else-if="card.variant === 'flip'">
                  <div class="vf-home__behavior-flip-box">
                    <span class="material-symbols-outlined">{{ card.icon }}</span>
                  </div>
                </template>
                <template v-else-if="card.variant === 'offset'">
                  <div class="vf-home__behavior-offset-box">
                    <span class="material-symbols-outlined">{{ card.icon }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="vf-home__behavior-boundary-zone"></div>
                  <div class="vf-home__behavior-boundary-box"></div>
                  <span class="vf-home__behavior-boundary-label">CLIPPING_ZONE</span>
                </template>
              </div>
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="vf-home__metrics">
        <div class="vf-home__metrics-layout">
          <div class="vf-home__metrics-copy">
            <h2>Built for Complexity</h2>
            <p>
              VFloat isn't just a positioning tool. It's a mathematical framework for
              high-performance interfaces that demand absolute reliability.
            </p>
            <div class="vf-home__checks">
              <div class="vf-home__check">
                <span class="material-symbols-outlined">check_circle</span>
                <span>ZERO_DEPENDENCY_CORE</span>
              </div>
              <div class="vf-home__check">
                <span class="material-symbols-outlined">check_circle</span>
                <span>TREESHAKABLE_ARCHITECTURE</span>
              </div>
              <div class="vf-home__check">
                <span class="material-symbols-outlined">check_circle</span>
                <span>SUB_MILLISECOND_COMPUTATION</span>
              </div>
            </div>
          </div>

          <div class="vf-home__metric-grid">
            <article v-for="metric in metricCards" :key="metric.id" class="vf-home__metric-card">
              <span class="vf-home__metric-id">{{ metric.id }}</span>
              <div class="vf-home__metric-value">{{ metric.value }}</div>
              <div class="vf-home__metric-label">{{ metric.label }}</div>
              <p>{{ metric.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="vf-home__cta">
        <div class="vf-home__cta-crosshair vf-home__cta-crosshair--top" aria-hidden="true"></div>
        <div class="vf-home__cta-crosshair vf-home__cta-crosshair--bottom" aria-hidden="true"></div>

        <div class="vf-home__cta-inner">
          <h2>Ready to deploy?</h2>
          <p>
            Join thousands of developers building technical interfaces with the most precise
            floating engine available.
          </p>

          <div class="vf-home__cta-actions">
            <a class="vf-home__cta-button" href="/guide/">Read the Docs</a>
            <div class="vf-home__install">
              <code>npm install v-float</code>
              <button class="vf-home__install-copy" type="button" aria-label="Copy install command">
                <span class="material-symbols-outlined">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="vf-home__footer">
      <div class="vf-home__footer-inner">
        <div class="vf-home__footer-copy">
          © 2024 VFloat Spatial Systems. Built for technical excellence.
        </div>
        <div class="vf-home__footer-links">
          <span v-for="item in footerItems" :key="item.label" class="vf-home__footer-link">
            {{ item.label }}
          </span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,0,24&family=Space+Grotesk:wght@300;400;500;600;700&display=swap");

.vf-home {
  --vf-background: #111317;
  --vf-surface-lowest: #0c0e11;
  --vf-surface-low: #1a1c1f;
  --vf-surface: #1e2023;
  --vf-surface-high: #282a2d;
  --vf-surface-highest: #333538;
  --vf-text: #e2e2e6;
  --vf-text-soft: #bac9cc;
  --vf-text-strong: #ebedf0;
  --vf-primary: #c3f5ff;
  --vf-primary-strong: #00e5ff;
  --vf-primary-fixed: #9cf0ff;
  --vf-font-display: "Space Grotesk", sans-serif;
  --vf-font-body: "Inter", sans-serif;
  min-height: 100vh;
  background: var(--vf-background);
  color: var(--vf-text);
  font-family: var(--vf-font-body);
  isolation: isolate;
}

.vf-home,
.vf-home * {
  box-sizing: border-box;
}

.vf-home .material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}

.vf-home__nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  width: 100%;
  border-bottom: 1px solid rgb(59 73 76 / 15%);
  background: rgb(17 19 23 / 80%);
  backdrop-filter: blur(12px);
  box-shadow: 0 0 15px rgb(0 229 255 / 4%);
}

.vf-home__nav-inner,
.vf-home__footer-inner {
  display: flex;
  width: min(100%, 1920px);
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
}

.vf-home__nav-group,
.vf-home__nav-meta,
.vf-home__nav-links {
  display: flex;
  align-items: center;
}

.vf-home__nav-group {
  gap: 2rem;
}

.vf-home__brand {
  color: var(--vf-text-strong);
  font-family: var(--vf-font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  text-decoration: none;
}

.vf-home__nav-links {
  display: none;
  gap: 1.5rem;
}

.vf-home__nav-link {
  padding-bottom: 0.25rem;
  color: rgb(235 237 240 / 60%);
  font-family: var(--vf-font-display);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    color 200ms ease,
    border-color 200ms ease;
  border-bottom: 2px solid transparent;
}

.vf-home__nav-link:hover,
.vf-home__nav-link.is-active {
  color: var(--vf-primary-strong);
}

.vf-home__nav-link.is-active {
  border-color: var(--vf-primary-strong);
}

.vf-home__nav-link.is-placeholder {
  cursor: default;
}

.vf-home__nav-icons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(235 237 240 / 60%);
}

.vf-home__nav-icons .material-symbols-outlined {
  font-size: 1.125rem;
}

.vf-home__nav-meta {
  gap: 1rem;
}

.vf-home__version {
  border: 1px solid rgb(59 73 76 / 30%);
  background: var(--vf-surface);
  padding: 0.25rem 0.75rem;
  color: var(--vf-primary-strong);
  font-family: ui-monospace, "SFMono-Regular", monospace;
  font-size: 0.625rem;
}

.vf-home__main {
  padding-top: 5rem;
}

.vf-home__hero,
.vf-home__behaviors,
.vf-home__metrics,
.vf-home__cta {
  padding-inline: 1.5rem;
}

.vf-home__hero {
  position: relative;
  display: flex;
  min-height: 921px;
  align-items: center;
  padding-block: 3rem;
}

.vf-home__spatial-grid {
  background-image: radial-gradient(circle, #3b494c 1px, transparent 1px);
  background-size: 40px 40px;
}

.vf-home__hero-layout,
.vf-home__section-inner,
.vf-home__metrics-layout,
.vf-home__cta-inner {
  width: min(100%, 1600px);
  margin: 0 auto;
}

.vf-home__hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3rem;
  align-items: center;
}

.vf-home__hero-copy {
  position: relative;
  z-index: 1;
}

.vf-home__eyebrow,
.vf-home__coords,
.vf-home__data-overlay,
.vf-home__matrix-label,
.vf-home__metrics-float,
.vf-home__footer-copy,
.vf-home__footer-link,
.vf-home__popover-titles,
.vf-home__anchor-labels,
.vf-home__metric-id,
.vf-home__checks {
  font-family: ui-monospace, "SFMono-Regular", monospace;
}

.vf-home__eyebrow {
  margin: 0 0 1rem;
  color: var(--vf-primary-strong);
  font-size: 0.625rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.vf-home__title {
  margin: 0 0 2rem;
  color: white;
  font-family: var(--vf-font-display);
  font-size: clamp(3.5rem, 10vw, 8rem);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.vf-home__title span {
  color: var(--vf-primary-strong);
}

.vf-home__description {
  max-width: 32rem;
  margin: 0 0 2.5rem;
  color: var(--vf-text-soft);
  font-size: 1.125rem;
  line-height: 1.75;
}

.vf-home__actions,
.vf-home__cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.vf-home__button,
.vf-home__cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  padding: 1rem 2rem;
  font-family: var(--vf-font-display);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    transform 200ms ease,
    background-color 200ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease,
    color 200ms ease;
}

.vf-home__button--primary {
  background: var(--vf-primary-fixed);
  color: #001f24;
}

.vf-home__button--primary:hover {
  box-shadow: 0 0 20px rgb(0 229 255 / 40%);
}

.vf-home__button--secondary {
  border-color: rgb(132 147 150 / 20%);
  color: var(--vf-text);
}

.vf-home__button--secondary:hover {
  background: var(--vf-surface);
}

.vf-home__stage {
  position: relative;
  display: flex;
  aspect-ratio: 1;
  min-height: 32rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgb(0 229 255 / 20%);
  background: var(--vf-surface-low);
  padding: 2rem;
}

.vf-home__debug-grid {
  background-image:
    linear-gradient(to right, rgb(0 229 255 / 5%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(0 229 255 / 5%) 1px, transparent 1px);
  background-size: 20px 20px;
}

.vf-home__bounding-box {
  position: absolute;
  inset: 1rem;
  border: 1px dashed rgb(0 229 255 / 30%);
}

.vf-home__guide {
  position: absolute;
  background: rgb(0 229 255 / 20%);
  box-shadow: 0 0 8px rgb(0 229 255 / 20%);
}

.vf-home__guide--vertical {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-0.5px);
}

.vf-home__guide--horizontal {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-0.5px);
}

.vf-home__metrics-float {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  border: 1px solid rgb(0 229 255 / 20%);
  background: rgb(17 19 23 / 40%);
  padding: 0.5rem;
  color: rgb(0 229 255 / 60%);
  font-size: 0.625rem;
  backdrop-filter: blur(8px);
}

.vf-home__metrics-row,
.vf-home__metrics-subrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vf-home__metrics-subrow {
  margin-top: 0.25rem;
  opacity: 0.6;
}

.vf-home__live-dot,
.vf-home__data-dot {
  width: 0.375rem;
  height: 0.375rem;
  background: var(--vf-primary-strong);
}

.vf-home__live-dot {
  border-radius: 999px;
  animation: vf-pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.vf-home__anchor {
  position: relative;
  z-index: 1;
  display: flex;
  width: 6rem;
  height: 6rem;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vf-primary-strong);
  background: #333538;
  appearance: none;
  cursor: pointer;
  animation: vf-anchor-pulse 2s infinite;
}

.vf-home__anchor-corner {
  position: absolute;
  width: 1rem;
  height: 1rem;
}

.vf-home__anchor-corner--tl {
  top: -0.5rem;
  left: -0.5rem;
  border-top: 2px solid var(--vf-primary-strong);
  border-left: 2px solid var(--vf-primary-strong);
}

.vf-home__anchor-corner--tr {
  top: -0.5rem;
  right: -0.5rem;
  border-top: 2px solid var(--vf-primary-strong);
  border-right: 2px solid var(--vf-primary-strong);
}

.vf-home__anchor-corner--bl {
  bottom: -0.5rem;
  left: -0.5rem;
  border-bottom: 2px solid var(--vf-primary-strong);
  border-left: 2px solid var(--vf-primary-strong);
}

.vf-home__anchor-corner--br {
  right: -0.5rem;
  bottom: -0.5rem;
  border-right: 2px solid var(--vf-primary-strong);
  border-bottom: 2px solid var(--vf-primary-strong);
}

.vf-home__anchor-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.vf-home__anchor-labels span:first-child {
  color: var(--vf-primary-strong);
  font-size: 0.625rem;
  font-weight: 700;
}

.vf-home__anchor-labels span:last-child {
  color: rgb(0 229 255 / 40%);
  font-size: 0.5rem;
}

.vf-home__floating-shell {
  position: absolute;
  z-index: 10;
  pointer-events: auto;
}

.vf-home__popover {
  position: relative;
  width: 14rem;
  border: 1px solid rgb(0 229 255 / 40%);
  background: rgb(51 53 56 / 80%);
  padding: 1rem;
  box-shadow: 0 25px 50px rgb(0 0 0 / 35%);
  backdrop-filter: blur(20px);
  animation: vf-settle 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.vf-home__popover-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.vf-home__popover-titles {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.vf-home__popover-titles span:first-child {
  color: var(--vf-primary-strong);
  font-size: 0.5625rem;
}

.vf-home__popover-titles span:last-child {
  color: rgb(0 229 255 / 40%);
  font-size: 0.5rem;
}

.vf-home__popover-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--vf-primary-strong);
  cursor: pointer;
}

.vf-home__popover-close .material-symbols-outlined {
  font-size: 0.875rem;
}

.vf-home__popover-copy {
  margin: 0;
  color: var(--vf-text-soft);
  font-size: 0.6875rem;
  line-height: 1.35;
}

.vf-home__popover-arrow {
  position: absolute;
  left: 50%;
  bottom: -0.375rem;
  width: 0.75rem;
  height: 0.75rem;
  background: var(--vf-primary-strong);
  transform: translateX(-50%) rotate(45deg);
}

.vf-home__coords {
  position: absolute;
  left: calc(100% + 2rem);
  top: 50%;
  display: none;
  flex-direction: column;
  gap: 0.25rem;
  transform: translateY(-50%);
  color: rgb(0 229 255 / 60%);
  font-size: 0.5625rem;
  white-space: nowrap;
}

.vf-home__coords-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vf-home__coords-line {
  width: 2rem;
  height: 1px;
  background: rgb(0 229 255 / 40%);
}

.vf-home__matrix {
  position: absolute;
  right: 2rem;
  bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.vf-home__matrix-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  border: 1px solid rgb(0 229 255 / 20%);
  background: rgb(17 19 23 / 60%);
  padding: 0.75rem;
  backdrop-filter: blur(12px);
}

.vf-home__matrix-dot {
  width: 0.625rem;
  height: 0.625rem;
  border: 1px solid rgb(0 229 255 / 30%);
  padding: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease,
    border-color 150ms ease;
}

.vf-home__matrix-dot.is-active {
  background: var(--vf-primary-strong);
  box-shadow: 0 0 8px #00e5ff;
}

.vf-home__matrix-dot.is-selected:not(.is-active) {
  border-color: var(--vf-primary-strong);
  box-shadow: 0 0 8px rgb(0 229 255 / 35%);
}

.vf-home__matrix-dot:disabled {
  cursor: default;
}

.vf-home__matrix-label {
  color: rgb(0 229 255 / 40%);
  font-size: 0.5rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.vf-home__data-overlay {
  position: absolute;
  left: 2rem;
  bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: rgb(0 229 255 / 40%);
  font-size: 0.5625rem;
}

.vf-home__data-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vf-home__data-row.is-active {
  color: var(--vf-primary-strong);
}

.vf-home__data-row.is-active .vf-home__data-dot {
  animation: vf-pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.vf-home__behaviors {
  border-top: 1px solid rgb(59 73 76 / 10%);
  border-bottom: 1px solid rgb(59 73 76 / 10%);
  background: var(--vf-surface-low);
  padding-block: 6rem;
}

.vf-home__section-header {
  margin-bottom: 5rem;
}

.vf-home__section-header h2,
.vf-home__metrics-copy h2,
.vf-home__cta h2 {
  margin: 0 0 1rem;
  font-family: var(--vf-font-display);
  font-weight: 700;
  text-transform: uppercase;
}

.vf-home__section-header h2 {
  font-size: clamp(2rem, 4vw, 2.5rem);
  letter-spacing: -0.03em;
}

.vf-home__section-rule {
  width: 6rem;
  height: 0.25rem;
  background: var(--vf-primary-strong);
}

.vf-home__behavior-grid {
  display: grid;
  background: rgb(59 73 76 / 10%);
  border: 1px solid rgb(59 73 76 / 10%);
  gap: 1px;
}

.vf-home__behavior-card {
  background: var(--vf-background);
  padding: 2rem;
  transition: background-color 200ms ease;
}

.vf-home__behavior-card:hover {
  background: var(--vf-surface);
}

.vf-home__behavior-card h3 {
  margin: 0 0 0.5rem;
  font-family: var(--vf-font-display);
  font-size: 1.125rem;
  font-weight: 700;
  text-transform: uppercase;
}

.vf-home__behavior-card p {
  margin: 0;
  color: var(--vf-text-soft);
  font-size: 0.875rem;
  line-height: 1.65;
}

.vf-home__behavior-visual {
  position: relative;
  display: flex;
  height: 10rem;
  margin-bottom: 1.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(59 73 76 / 5%);
}

.vf-home__behavior-anchor {
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(132 147 150 / 30%);
}

.vf-home__behavior-shift-box,
.vf-home__behavior-flip-box,
.vf-home__behavior-offset-box {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vf-home__behavior-shift-box {
  right: 1rem;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(195 245 255 / 30%);
  background: rgb(195 245 255 / 10%);
}

.vf-home__behavior-shift-box .material-symbols-outlined,
.vf-home__behavior-flip-box .material-symbols-outlined {
  color: var(--vf-primary);
}

.vf-home__behavior-axis {
  position: absolute;
  right: 1rem;
  left: 1rem;
  bottom: 1rem;
  height: 1px;
  background: rgb(195 245 255 / 20%);
}

.vf-home__behavior-flip-box {
  top: 1rem;
  width: 5rem;
  height: 2rem;
  border: 1px solid rgb(195 245 255 / 30%);
  background: var(--vf-surface-highest);
}

.vf-home__behavior-offset-box {
  width: 3rem;
  height: 3rem;
  border: 1px dashed rgb(195 245 255 / 40%);
  transform: translate(2rem, -2rem);
}

.vf-home__behavior-offset-box .material-symbols-outlined {
  color: rgb(195 245 255 / 40%);
}

.vf-home__behavior-boundary-zone {
  position: absolute;
  inset: 1rem;
  border: 1px solid rgb(255 180 171 / 20%);
  background: rgb(255 180 171 / 5%);
}

.vf-home__behavior-boundary-box {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--vf-primary);
  background: rgb(195 245 255 / 20%);
}

.vf-home__behavior-boundary-label {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  color: #ffb4ab;
  font-family: ui-monospace, "SFMono-Regular", monospace;
  font-size: 0.5rem;
}

.vf-home__metrics {
  padding-block: 6rem;
}

.vf-home__metrics-layout {
  display: grid;
  gap: 3rem;
  align-items: start;
}

.vf-home__metrics-copy {
  border-left: 4px solid var(--vf-primary-strong);
  padding-left: 2rem;
}

.vf-home__metrics-copy h2 {
  font-size: clamp(2.5rem, 5vw, 5rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.vf-home__metrics-copy p {
  max-width: 32rem;
  margin: 0 0 2rem;
  color: var(--vf-text-soft);
  line-height: 1.75;
}

.vf-home__checks {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: rgb(195 245 255 / 70%);
  font-size: 0.75rem;
}

.vf-home__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vf-home__check .material-symbols-outlined {
  font-size: 1rem;
}

.vf-home__metric-grid {
  display: grid;
  gap: 1rem;
}

.vf-home__metric-card {
  position: relative;
  border: 1px solid rgb(59 73 76 / 10%);
  background: var(--vf-surface);
  padding: 2rem;
}

.vf-home__metric-id {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: rgb(132 147 150 / 40%);
  font-size: 0.625rem;
}

.vf-home__metric-value {
  margin-bottom: 0.5rem;
  color: var(--vf-primary);
  font-family: var(--vf-font-display);
  font-size: clamp(2.75rem, 5vw, 5rem);
  font-weight: 700;
  line-height: 1;
}

.vf-home__metric-label {
  color: var(--vf-text);
  font-family: var(--vf-font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.vf-home__metric-card p {
  margin: 1rem 0 0;
  color: var(--vf-text-soft);
  font-size: 0.75rem;
  line-height: 1.7;
}

.vf-home__cta {
  position: relative;
  overflow: hidden;
  background: var(--vf-primary-strong);
  color: #001f24;
  padding-block: 6rem;
}

.vf-home__cta-crosshair {
  position: absolute;
  border-color: rgb(0 31 36 / 10%);
}

.vf-home__cta-crosshair--top {
  top: 0;
  right: 0;
  width: 16rem;
  height: 16rem;
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.vf-home__cta-crosshair--bottom {
  bottom: 0;
  left: 0;
  width: 8rem;
  height: 8rem;
  border-top: 1px solid;
  border-right: 1px solid;
}

.vf-home__cta h2 {
  font-size: clamp(3rem, 6vw, 6rem);
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.vf-home__cta p {
  max-width: 46rem;
  margin: 0 0 2.5rem;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.6;
  opacity: 0.8;
}

.vf-home__cta-button {
  background: #001f24;
  color: var(--vf-primary-fixed);
}

.vf-home__cta-button:hover {
  transform: scale(1.05);
}

.vf-home__install {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(0 31 36 / 10%);
  background: rgb(0 31 36 / 5%);
  padding: 1rem 1.5rem;
}

.vf-home__install code {
  font-family: ui-monospace, "SFMono-Regular", monospace;
  font-size: 0.875rem;
}

.vf-home__install-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: default;
  padding: 0;
}

.vf-home__footer {
  border-top: 1px solid rgb(59 73 76 / 10%);
  background: var(--vf-background);
  padding: 3rem 1.5rem;
}

.vf-home__footer-inner {
  flex-direction: column;
}

.vf-home__footer-copy {
  color: rgb(235 237 240 / 30%);
  font-size: 0.625rem;
  text-align: center;
}

.vf-home__footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

.vf-home__footer-link {
  color: rgb(235 237 240 / 30%);
  font-size: 0.625rem;
  transition: color 300ms ease;
}

.vf-home__footer-link:hover {
  color: var(--vf-primary-strong);
}

@keyframes vf-pulse {
  50% {
    opacity: 0.5;
  }
}

@keyframes vf-anchor-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(0 229 255 / 40%);
  }

  70% {
    box-shadow: 0 0 0 10px rgb(0 229 255 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(0 229 255 / 0%);
  }
}

@keyframes vf-settle {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 768px) {
  .vf-home__nav-links {
    display: flex;
  }

  .vf-home__coords {
    display: flex;
  }

  .vf-home__footer-inner {
    flex-direction: row;
  }
}

@media (min-width: 1024px) {
  .vf-home__hero,
  .vf-home__behaviors,
  .vf-home__metrics,
  .vf-home__cta {
    padding-inline: 6rem;
  }

  .vf-home__hero-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .vf-home__behavior-grid,
  .vf-home__metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vf-home__behavior-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .vf-home__metrics-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  }
}

@media (max-width: 767px) {
  .vf-home__main {
    padding-top: 4.5rem;
  }

  .vf-home__hero {
    min-height: auto;
    padding-block: 2rem 3rem;
  }

  .vf-home__button,
  .vf-home__cta-button {
    width: 100%;
  }

  .vf-home__stage {
    min-height: 28rem;
    padding: 1.25rem;
  }

  .vf-home__metrics-float {
    top: 1rem;
    right: 1rem;
  }

  .vf-home__data-overlay {
    left: 1rem;
    bottom: 1rem;
  }

  .vf-home__matrix {
    right: 1rem;
    bottom: 1rem;
  }

  .vf-home__footer-links {
    gap: 1rem;
  }
}
</style>
