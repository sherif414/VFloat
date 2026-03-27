import { type Ref, ref } from "vue";
import type { OpenChangeReason } from "@/types";

export interface OpenStateControllerOptions {
  open?: Ref<boolean>;
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}

export function createOpenStateController(options: OpenStateControllerOptions = {}) {
  const open = options.open ?? ref(false);

  const setOpen = (value: boolean, reason?: OpenChangeReason, event?: Event) => {
    if (open.value === value) {
      return;
    }

    open.value = value;
    options.onOpenChange?.(value, reason ?? "programmatic", event);
  };

  return {
    open,
    setOpen,
  };
}
