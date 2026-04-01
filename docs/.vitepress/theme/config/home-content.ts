import { docsShellConfig } from "./docs-shell";

export type HomeHeroPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "left"
  | "right"
  | "bottom-start"
  | "bottom"
  | "bottom-end";

export interface HomeNavItem {
  label: string;
  href?: string;
  active?: boolean;
  target?: string;
}

export interface HomeFooterItem {
  label: string;
}

export interface HomeBehaviorCard {
  title: string;
  description: string;
  icon: string;
  variant: "shift" | "flip" | "offset" | "boundary";
}

export interface HomeMetricCard {
  id: string;
  value: string;
  label: string;
  description: string;
}

export interface HomeMatrixControl {
  key: string;
  placement?: HomeHeroPlacement;
  label: string;
}

export interface HomeContent {
  repoUrl: string;
  packageVersion: string;
  navItems: HomeNavItem[];
  footer: {
    copy: string;
    items: HomeFooterItem[];
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    popoverCopy: string;
    anchorLabel: string;
    anchorCoordinates: string;
  };
  matrixControls: HomeMatrixControl[];
  behaviors: {
    title: string;
    cards: HomeBehaviorCard[];
  };
  metrics: {
    title: string;
    description: string;
    checks: string[];
    cards: HomeMetricCard[];
  };
  cta: {
    title: string;
    description: string;
    primaryAction: { label: string; href: string };
    installCommand: string;
  };
}

export const homeContent = {
  repoUrl: docsShellConfig.repoUrl,
  packageVersion: "0.11.0",
  navItems: [
    { label: "Home", href: "/", active: true },
    { label: "Guide", href: "/guide/" },
    { label: "API", href: "/api/" },
  ],
  footer: {
    copy: "© 2025-present Shareef Hassan. VFloat 0.11.0 for Vue 3 positioning primitives.",
    items: [{ label: "Guide" }, { label: "API" }, { label: "GitHub" }, { label: "License" }],
  },
  hero: {
    eyebrow: "VUE 3 POSITIONING",
    title: "VFloat",
    description:
      "Composable positioning for floating elements in Vue 3. Use it for tooltips, popovers, menus, and dialogs.",
    primaryCta: { label: "Read the guide", href: "/guide/" },
    secondaryCta: { label: "API reference", href: "/api/" },
    popoverCopy:
      "This demo uses offset, flip, and shift to keep the popover attached when space gets tight.",
    anchorLabel: "ANCHOR",
    anchorCoordinates: "512, 512",
  },
  matrixControls: [
    { key: "top-start", placement: "top-start", label: "Top start" },
    { key: "top", placement: "top", label: "Top" },
    { key: "top-end", placement: "top-end", label: "Top end" },
    { key: "left", placement: "left", label: "Left" },
    { key: "center", label: "Anchor center" },
    { key: "right", placement: "right", label: "Right" },
    { key: "bottom-start", placement: "bottom-start", label: "Bottom start" },
    { key: "bottom", placement: "bottom", label: "Bottom" },
    { key: "bottom-end", placement: "bottom-end", label: "Bottom end" },
  ],
  behaviors: {
    title: "Core behaviors",
    cards: [
      {
        title: "Shift",
        description:
          "Keeps the floating element in view by nudging it along the main axis when space runs out.",
        icon: "trending_flat",
        variant: "shift",
      },
      {
        title: "Flip",
        description: "Switches to the opposite side when the preferred placement no longer fits.",
        icon: "swap_vert",
        variant: "flip",
      },
      {
        title: "Offset",
        description:
          "Adds a predictable gap so the floating element does not sit flush against the anchor.",
        icon: "straighten",
        variant: "offset",
      },
      {
        title: "Boundary",
        description:
          "Respects viewport and container boundaries so content stays visible when space gets tight.",
        icon: "",
        variant: "boundary",
      },
    ],
  },
  metrics: {
    title: "Built for real interfaces",
    description:
      "VFloat gives you the pieces floating surfaces actually need: a stable anchor/floating pair, interaction composables, and middleware for spacing, collision handling, arrows, and sizing.",
    checks: [
      "Stable useFloating entrypoint",
      "Interaction composables for hover, click, focus, and Escape",
      "Middleware for offset, flip, shift, size, hide, and arrow",
    ],
    cards: [
      {
        id: "METRIC_01",
        value: "0.11.0",
        label: "Current release",
        description: "The version published in package.json and shown in the docs header.",
      },
      {
        id: "METRIC_02",
        value: "16",
        label: "Documented APIs",
        description: "Positioning, interaction, and middleware pages in the public reference.",
      },
      {
        id: "METRIC_03",
        value: "3",
        label: "Core layers",
        description: "The docs are organized around the guide, API, and middleware concepts.",
      },
      {
        id: "METRIC_04",
        value: "15.9 kB",
        label: "Gzipped ESM bundle",
        description: "Measured from the current built dist/index.mjs artifact after gzip.",
      },
    ],
  },
  cta: {
    title: "Start with the guide",
    description:
      "Start with the stable useFloating entrypoint, then layer in hover, click, focus, and middleware as your interface grows.",
    primaryAction: { label: "Read the guide", href: "/guide/" },
    installCommand: "pnpm add v-float",
  },
} satisfies HomeContent;
