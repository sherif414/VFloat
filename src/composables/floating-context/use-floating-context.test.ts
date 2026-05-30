import { describe, expect, it, vi } from "vite-plus/test";
import { ref } from "vue";
import { useFloatingContext } from "@/composables";

describe("useFloatingContext", () => {
  it("uses controlled open state and forwards reasons and events", () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const event = new KeyboardEvent("keydown");
    const context = useFloatingContext(ref(null), ref(null), { open, onOpenChange });

    context.state.setOpen(true, "keyboard-activate", event);

    expect(open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true, "keyboard-activate", event);
  });

  it("falls back to programmatic reasons and ignores duplicate updates", () => {
    const onOpenChange = vi.fn();
    const context = useFloatingContext(ref(null), ref(null), { onOpenChange });

    context.state.setOpen(true);
    context.state.setOpen(true, "anchor-click");

    expect(context.state.open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, "programmatic", undefined);
  });
});
