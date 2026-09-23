import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";

describe("Feature: useControllableState dual-mode state management", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Uncontrolled state management", () => {
    it("Given an uncontrolled configuration with initialValue, When value is accessed and written, Then internal state updates and notifies onChange", () => {
      const onChange = vi.fn();
      const value = useControllableState({ initialValue: "seed", onChange });

      expect(value.value).toBe("seed");

      value.value = "next";
      expect(value.value).toBe("next");
      expect(onChange).toHaveBeenCalledWith("next");
    });

    it("Given an uncontrolled numeric state, When transformed and written, Then state updates reactively", () => {
      const value = useControllableState({ initialValue: 1 });

      value.value = value.value + 1;
      expect(value.value).toBe(2);

      value.value = value.value * 10;
      expect(value.value).toBe(20);
    });

    it("Given an unchanged value write, When updated, Then onChange does not fire", () => {
      const onChange = vi.fn();
      const value = useControllableState({ initialValue: "seed", onChange });

      value.value = "seed";
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Controlled state management and change delegation", () => {
    it("Given a controlled ref, When external ref changes or internal ref is written, Then reads track external value and writes delegate to onChange", () => {
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

    it("Given a controlled numeric ref, When updated functionally, Then onChange receives the calculated value", () => {
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

    it("Given a controlled state, When written internally, Then onChange is called without mutating the external ref directly", () => {
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

    it("Given a controlled ref without onChange handler, When written, Then it logs a warning and leaves state unchanged", () => {
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

    it("Given a controlled mode without initialValue, When initialized and updated, Then it functions seamlessly", () => {
      const external = ref("external");
      const onChange = vi.fn();
      const value = useControllableState({
        value: external,
        onChange,
      });

      expect(value.value).toBe("external");

      value.value = "updated";
      expect(onChange).toHaveBeenCalledWith("updated");
    });
  });

  describe("Scenario: Controlled state with undefined values", () => {
    it("Given an external ref resolving to undefined, When initialized, Then it remains controlled and preserves undefined", () => {
      const external = ref<string | undefined>(undefined);
      const value = useControllableState<string | undefined>({
        value: external,
        initialValue: "seed",
      });

      expect(value.value).toBeUndefined();

      value.value = "written";
      expect(value.value).toBeUndefined();
    });

    it("Given an external ref transitioning to undefined, When value is written, Then it preserves controlled mode and delegates to onChange", () => {
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
  });
});
