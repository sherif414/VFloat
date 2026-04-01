<script setup lang="ts">
import type { HomeContent } from "../../config/home-content";
import { useHomeHeroDemo } from "../../composables/use-home-hero-demo";

defineProps<{
  hero: HomeContent["hero"];
  matrixControls: HomeContent["matrixControls"];
}>();

const {
  arrowStyles,
  closeHeroPanel,
  heroActionLabel,
  heroAnchorEl,
  heroBounds,
  heroContext,
  heroCoordX,
  heroCoordY,
  heroFloatingEl,
  heroArrowEl,
  heroLatency,
  heroPlacementLabel,
  heroRecalc,
  heroStatus,
  setHeroPlacement,
  toggleHeroPanel,
} = useHomeHeroDemo();
</script>

<template>
  <section class="vf-home__hero vf-home__spatial-grid">
    <div class="vf-home__hero-layout">
      <div class="vf-home__hero-copy">
        <p class="vf-home__eyebrow">{{ hero.eyebrow }}</p>
        <h1 class="vf-home__title">{{ hero.title }}</h1>
        <p class="vf-home__description">{{ hero.description }}</p>
        <div class="vf-home__actions">
          <a class="vf-home__button vf-home__button--primary" :href="hero.primaryCta.href">
            {{ hero.primaryCta.label }}
          </a>
          <a class="vf-home__button vf-home__button--secondary" :href="hero.secondaryCta.href">
            {{ hero.secondaryCta.label }}
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
            <span>POSITION: {{ heroRecalc }}</span>
          </div>
          <div class="vf-home__metrics-subrow">RESOLVE: {{ heroLatency }}</div>
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
            <span>{{ hero.anchorLabel }}</span>
            <span>{{ hero.anchorCoordinates }}</span>
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
                <span>POPOVER</span>
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
            <p class="vf-home__popover-copy">{{ hero.popoverCopy }}</p>
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
          <span class="vf-home__matrix-label">Placement matrix</span>
        </div>

        <div class="vf-home__data-overlay">
          <div class="vf-home__data-row">
            <span class="vf-home__data-dot"></span>
            <span>BOUNDS: {{ heroBounds }}</span>
          </div>
          <div class="vf-home__data-row">
            <span class="vf-home__data-dot"></span>
            <span>MODE: ANCHOR_RELATIVE</span>
          </div>
          <div class="vf-home__data-row is-active">
            <span class="vf-home__data-dot"></span>
            <span
              >STATUS: {{ heroContext.position.isPositioned.value ? heroStatus : "SYNCING" }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
