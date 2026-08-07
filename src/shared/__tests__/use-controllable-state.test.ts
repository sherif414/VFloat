import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";

describe("useControllableState", () => {
  it("uses the initial value when uncontrolled and updates internal state on write", () => {
    const onChange = vi.fn();
    const value = useControllableState({ initialValue: "seed", onChange });

    expect(value.value).toBe("seed");

    value.value = "next";
    expect(value.value).toBe("next");
    expect(onChange).toHaveBeenCalledWith("next");
  });

  it("updates uncontrolled state through the writable value", () => {
    const value = useControllableState({ initialValue: 1 });

    value.value = value.value + 1;
    expect(value.value).toBe(2);

    value.value = value.value * 10;
    expect(value.value).toBe(20);
  });

  it("reads from an external ref when controlled and reports writes through onChange", () => {
    const external = ref("external");
    const onChange = vi.fn();
    const value = useControllableState({
      value: external,
      initialValue: "seed",
      onChange,
    });

    expect(value.value).toBe("external");

    external.value = "updated";
    expect(value.value).toBe("updated");

    value.value = "written";
    expect(external.value).toBe("updated");
    expect(value.value).toBe("updated");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("written");
  });

  it("supports functional updaters against a controlled value", () => {
    const external = ref(1);
    const onChange = vi.fn();
    const value = useControllableState({
      value: external,
      initialValue: 0,
      onChange,
    });

    value.value = value.value + 1;
    expect(external.value).toBe(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("notifies onChange for controlled state without writing to it", () => {
    const external = ref("external");
    const onChange = vi.fn();
    const value = useControllableState({
      value: external,
      initialValue: "seed",
      onChange,
    });

    expect(value.value).toBe("external");

    value.value = "written";
    expect(external.value).toBe("external");
    expect(value.value).toBe("external");
    expect(onChange).toHaveBeenCalledWith("written");
  });

  it("warns when writing to read-only controlled state without an onChange handler", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const external = ref("external");
    const value = useControllableState({
      value: external,
      initialValue: "seed",
    });

    value.value = "written";
    expect(value.value).toBe("external");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[useControllableState] Cannot update controlled state"),
    );
    warnSpy.mockRestore();
  });

  it("treats a ref resolving to undefined as controlled", () => {
    const external = ref<string | undefined>(undefined);
    const value = useControllableState<string | undefined>({
      value: external,
      initialValue: "seed",
    });

    expect(value.value).toBeUndefined();

    value.value = "written";
    expect(value.value).toBeUndefined();
  });

  it("keeps controlled mode when the external ref later resolves to undefined", () => {
    const external = ref<string | undefined>("external");
    const onChange = vi.fn();
    const value = useControllableState<string | undefined>({
      value: external,
      initialValue: "seed",
      onChange,
    });

    external.value = undefined;
    expect(value.value).toBeUndefined();

    value.value = "written";
    expect(value.value).toBeUndefined();
    expect(onChange).toHaveBeenCalledWith("written");
  });

  it("does not fire onChange for same-value writes", () => {
    const onChange = vi.fn();
    const value = useControllableState({ initialValue: "seed", onChange });

    value.value = "seed";
    expect(onChange).not.toHaveBeenCalled();
  });
});
