import type { Placement } from "v-float";

export type PresetType = "tooltip" | "popover" | "menu" | "cursor";
export type ViewMode = "preview" | "code";

export interface ShowcasePresetMeta {
  id: PresetType;
  label: string;
  description: string;
}

export interface ShowcasePositionOptions {
  placement: Placement;
  offset: number;
  flip: boolean;
  shift: boolean;
  arrow: boolean;
}

export type Side = "top" | "bottom" | "left" | "right";
