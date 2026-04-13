<script setup lang="ts">
import { docsShellConfig } from "../../config/docs-shell";

interface HomeLink {
  label: string;
  href: string;
  target?: string;
}

const navLinks: HomeLink[] = [
  { label: "Docs", href: "/", target: "_self" },
  { label: "API", href: "/api/" },
  { label: "GitHub", href: docsShellConfig.repoUrl, target: "_blank" },
];

const featureItems = [
  { label: "Component", value: "Middleware" },
  { label: "Logic", value: "Interaction Composables" },
  { label: "Safety", value: "Collision Handling" },
  { label: "Utility", value: "List Navigation" },
];

const footerLinks: HomeLink[] = [
  { label: "Changelog", href: `${docsShellConfig.repoUrl}/releases`, target: "_blank" },
  { label: "License", href: `${docsShellConfig.repoUrl}/blob/main/LICENSE`, target: "_blank" },
  { label: "Community", href: docsShellConfig.repoUrl, target: "_blank" },
];
</script>

<template>
  <div class="vf-home vf-home--minimal">
    <header class="vf-home__nav" aria-label="Primary">
      <div class="vf-home__nav-inner">
        <a class="vf-home__brand" href="/">VFLOAT</a>

        <nav class="vf-home__nav-links">
          <a
            v-for="item in navLinks"
            :key="item.label"
            :href="item.href"
            :target="item.target"
            :rel="item.target === '_blank' ? 'noreferrer' : undefined"
            class="vf-home__nav-link"
            :class="{ 'is-active': item.label === 'Docs' }"
          >
            {{ item.label }}
          </a>
        </nav>

        <button class="vf-home__theme-toggle" type="button" aria-label="Theme toggle">
          <span class="material-symbols-outlined">dark_mode</span>
        </button>
      </div>
    </header>

    <main class="vf-home__main">
      <section class="vf-home__hero" aria-labelledby="vf-home-title">
        <div class="vf-home__hero-inner">
          <p class="vf-home__eyebrow">v0.x - under development</p>
          <h1 id="vf-home-title" class="vf-home__title">VFloat: Precision Floating UI for Vue 3</h1>
          <p class="vf-home__description">
            A lightweight, high-performance positioning engine for tooltips, popovers, and menus.
            Built for the Vue 3 Composition API.
          </p>

          <div class="vf-home__actions">
            <a class="vf-home__button vf-home__button--primary" href="/guide/"> Read the Docs </a>
            <a
              class="vf-home__button vf-home__button--ghost"
              :href="docsShellConfig.repoUrl"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section class="vf-home__feature-strip" aria-label="Highlights">
        <div class="vf-home__feature-grid">
          <article v-for="item in featureItems" :key="item.label" class="vf-home__feature-item">
            <p class="vf-home__feature-label">{{ item.label }}</p>
            <p class="vf-home__feature-value">{{ item.value }}</p>
          </article>
        </div>
      </section>
    </main>

    <footer class="vf-home__footer">
      <div class="vf-home__footer-inner">
        <p class="vf-home__footer-copy">&copy; 2024 VFloat. Built for precision.</p>

        <nav class="vf-home__footer-links" aria-label="Footer">
          <a
            v-for="item in footerLinks"
            :key="item.label"
            :href="item.href"
            :target="item.target"
            :rel="item.target === '_blank' ? 'noreferrer' : undefined"
            class="vf-home__footer-link"
          >
            {{ item.label }}
          </a>
        </nav>
      </div>
    </footer>
  </div>
</template>
