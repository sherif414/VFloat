export type PresetType = "tooltip" | "menu" | "combobox" | "selection" | "dialog";

export interface ShowcasePresetMeta {
  id: PresetType;
  label: string;
  description: string;
}
