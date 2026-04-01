import { flip, offset, shift, useArrow, useFloating } from "../../../../src/index";
import { computed, ref, useTemplateRef } from "vue";
import type { HomeHeroPlacement } from "../config/home-content";

export const useHomeHeroDemo = () => {
  const heroAnchorEl = useTemplateRef<HTMLElement>("heroAnchorEl");
  const heroFloatingEl = useTemplateRef<HTMLElement>("heroFloatingEl");
  const heroArrowEl = useTemplateRef<HTMLElement>("heroArrowEl");
  const heroOpen = ref(true);
  const heroPlacement = ref<HomeHeroPlacement>("top");

  const heroContext = useFloating(heroAnchorEl, heroFloatingEl, {
    placement: heroPlacement,
    open: heroOpen,
    middlewares: [offset(16), flip(), shift({ padding: 24 })],
  });

  const { arrowStyles } = useArrow(heroContext, {
    element: heroArrowEl,
    offset: "-6px",
  });

  const heroCoordX = computed(() => `${heroContext.position.x.value.toFixed(2)}px`);
  const heroCoordY = computed(() => `${heroContext.position.y.value.toFixed(2)}px`);
  const heroLatency = computed(() => (heroContext.position.isPositioned.value ? "2ms" : "--"));
  const heroRecalc = computed(() =>
    heroContext.position.isPositioned.value ? "0.08ms" : "pending",
  );
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

  const setHeroPlacement = (placement?: HomeHeroPlacement) => {
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

  return {
    arrowStyles,
    heroAnchorEl,
    heroFloatingEl,
    heroArrowEl,
    heroContext,
    heroCoordX,
    heroCoordY,
    heroLatency,
    heroRecalc,
    heroBounds,
    heroPlacementLabel,
    heroStatus,
    heroActionLabel,
    setHeroPlacement,
    closeHeroPanel,
    toggleHeroPanel,
  };
};
