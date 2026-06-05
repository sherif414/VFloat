import { ref, type Ref, watch } from "vue";
import type { AnchorElement } from "@/composables/floating-context";
import type { FloatingPosition } from "@/composables/position";
import type { AxisConstraint, Coordinates } from "./types";
import { VirtualElementFactory } from "./virtual-element-factory";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Keeps the floating context anchor pointed at the current client-point virtual anchor.
 */
export function useClientPointAnchorController(options: ClientPointAnchorControllerOptions): void {
  const {
    refs,
    isEnabled,
    open,
    coordinates,
    openingBaselineCoordinates,
    axis,
    trackingTargetEl,
    update,
  } = options;

  const virtualElementFactory = new VirtualElementFactory();
  const managedAnchorEl = ref<AnchorElement>(null);
  const preservedAnchorEl = ref<AnchorElement>(refs.anchorEl.value);

  function onAnchorElChange(anchorEl: AnchorElement): void {
    if (anchorEl !== managedAnchorEl.value) {
      preservedAnchorEl.value = anchorEl;
    }
  }

  function restoreAnchor(): void {
    managedAnchorEl.value = null;
    refs.anchorEl.value = preservedAnchorEl.value;
  }

  function setVirtualAnchor(): void {
    const virtualAnchorEl = virtualElementFactory.create({
      coordinates: coordinates.value,
      referenceElement: trackingTargetEl.value,
      baselineCoordinates: openingBaselineCoordinates.value,
      axis: axis.value,
    });

    managedAnchorEl.value = virtualAnchorEl;
    refs.anchorEl.value = virtualAnchorEl;
  }

  function syncPosition(): void {
    if (open.value) {
      void update?.();
    }
  }

  watch(() => refs.anchorEl.value, onAnchorElChange, { immediate: true });

  watch(
    [isEnabled, coordinates, openingBaselineCoordinates, axis, trackingTargetEl, preservedAnchorEl],
    () => {
      if (isEnabled.value) {
        setVirtualAnchor();
      } else {
        restoreAnchor();
      }

      syncPosition();
    },
    { immediate: true },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

interface ClientPointAnchorControllerOptions {
  refs: {
    anchorEl: Ref<AnchorElement>;
  };
  isEnabled: Readonly<Ref<boolean>>;
  open: Readonly<Ref<boolean>>;
  coordinates: Readonly<Ref<Coordinates>>;
  openingBaselineCoordinates: Readonly<Ref<Coordinates | null>>;
  axis: Readonly<Ref<AxisConstraint>>;
  trackingTargetEl: Readonly<Ref<HTMLElement | null>>;
  update?: Pick<FloatingPosition, "update">["update"];
}
