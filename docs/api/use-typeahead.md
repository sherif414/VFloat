---
description: Coordinates keyboard typeahead search and jumping across collections in VFloat.
---

# useTypeahead

`useTypeahead` enables keyboard type-to-focus behavior for dropdowns, menus, and select lists. It captures rapid character sequences into a typing buffer, skips disabled items, and jumps directly to matching options in a [`useCollection`](/api/use-collection) manager or custom string list.

## Type

```ts
function useTypeahead(node: UseTypeaheadContext, options?: UseTypeaheadOptions): UseTypeaheadReturn;

type TypeaheadFindMatchFn = (
  orderedList: readonly (string | null)[],
  typedString: string,
) => string | number | null | undefined;

interface UseTypeaheadContext extends Pick<FloatingNode, "refs" | "open"> {}

interface UseTypeaheadOptions {
  /**
   * Optional collection manager instance to synchronize with typeahead search.
   */
  collection?: {
    activeValue: Ref<string | null>;
    setActiveValue: (value: string | null) => void;
    isItemDisabled?: (value: string) => boolean;
    values?: ComputedRef<readonly string[]> | Ref<readonly string[]> | readonly string[];
  };

  /**
   * An array of item label strings to search through.
   */
  list?: MaybeRefOrGetter<readonly (string | null)[]>;

  /**
   * The currently active item index in the list.
   */
  activeIndex?: MaybeRefOrGetter<number | null>;

  /**
   * The currently selected item index in the list.
   */
  selectedIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Callback invoked with the matched index and string value when a match is found.
   */
  onMatch?: (index: number, value: string) => void;

  /**
   * Callback invoked when typing state changes.
   */
  onTypingChange?: (isTyping: boolean) => void;

  /**
   * Whether the typeahead composable is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Duration in milliseconds before the typed buffer is reset.
   * @default 750
   */
  resetMs?: MaybeRefOrGetter<number>;

  /**
   * List of specific keys to ignore during typeahead typing.
   * @default []
   */
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;

  /**
   * Custom function to determine matching item. Accepts a ref, a computed ref,
   * a plain function, or null.
   * @default prefix startsWith matcher
   */
  findMatch?:
    | Ref<TypeaheadFindMatchFn | null>
    | ComputedRef<TypeaheadFindMatchFn | null>
    | TypeaheadFindMatchFn
    | null;

  /**
   * Predicate for skipping disabled items during matching.
   */
  isValueDisabled?: (value: string) => boolean;
}

interface UseTypeaheadReturn {
  /**
   * Reactive boolean indicating whether a user typing session is actively in progress.
   */
  isTyping: Readonly<Ref<boolean>>;

  /**
   * Resets the active typing buffer and timeout.
   */
  reset: () => void;

  /**
   * Stops all listeners and watchers created by the composable.
   */
  cleanup: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `collection` | `{ activeValue, setActiveValue, … }` | — | Value model to drive; any matching structural shape works. |
| `list` | `MaybeRefOrGetter<readonly (string \| null)[]>` | — | Wins over `collection.values` when present. |
| `activeIndex` / `selectedIndex` | `MaybeRefOrGetter<number \| null>` | — | Arrow-selected and selected positions. |
| `onMatch` | `(index, value) => void` | — | Forward into `setActiveIndex` for focus movement. |
| `onTypingChange` | `(isTyping: boolean) => void` | — | Binds typing indicators. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates typeahead. |
| `resetMs` | `MaybeRefOrGetter<number>` | `750` | Buffer reset timeout. |
| `ignoreKeys` | `MaybeRefOrGetter<readonly string[]>` | `[]` | Keys to skip. |
| `findMatch` | fn, ref, or `null` | prefix matcher | Custom matcher; `null` uses the built-in prefix search. |
| `isValueDisabled` | `(value: string) => boolean` | — | Skips disabled values during matching. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `isTyping` | `Readonly<Ref<boolean>>` | Typing session in progress. |
| `reset` | `() => void` | Clears the typing buffer and timeout. |
| `cleanup` | `() => void` | Stops listeners and watchers. |

## Details

`useTypeahead` pairs with [`useCollection`](/api/use-collection) for the value model and bridges to index-based focus through `onMatch`:

- **Multi-Character Typing Buffer:** Keystrokes typed within `resetMs` (default `750ms`) accumulate into a multi-character query (e.g. typing `b` then `l` jumps to _"Blueberry"_ rather than stopping at _"Banana"_).
- **Rapid Single-Character Cycling:** Typing the same character repeatedly cycles sequentially through all matching items starting with that character (_Apple_ &rarr; _Apricot_ &rarr; _Avocado_ &rarr; _Apple_).
- **Disabled Item Bypassing:** Disabled items configured in `useCollection` (`isValueDisabled`) or `options.isValueDisabled` are automatically skipped and never focused.
- **Arrow Key Synchronization:** When idle, typeahead search begins immediately after the current arrow-selected position rather than resetting to index `0`.
- **Space Key Handling:** An initial Space key does not trigger typeahead, preserving default button toggling and listbox activation. Space keys typed within an active query are preserved for multi-word labels (e.g., _"New York"_).
- **Native Input Protection:** Typing in `<input>` or `<textarea>` elements embedded within the floating surface or anchor trigger is ignored so native text input is never blocked.
- **Reactive Typing State:** Exposes an `isTyping` reactive boolean and `onTypingChange` callback to easily bind visual typing indicators.
- **List resolution:** an explicit `list` wins when present, otherwise `collection.values` is searched. `collection` is a narrow structural shape, so any object with `activeValue` and `setActiveValue` works.
- **Driving focus:** forward matches into [`useRovingFocus`](/api/use-roving-focus) or [`useAriaActivedescendant`](/api/use-aria-activedescendant) through `onMatch: (index) => setActiveIndex(index)`.

## Example

This select dropdown combines `useCollection` and `useTypeahead` for keyboard search over values.

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useClick, useCollection, useFloatingNode, usePosition, useTypeahead } from "v-float";

interface Country {
  code: string;
  name: string;
  disabled?: boolean;
}

const countries = ref<Country[]>([
  { code: "ar", name: "Argentina" },
  { code: "au", name: "Australia" },
  { code: "at", name: "Austria", disabled: true },
  { code: "br", name: "Brazil" },
  { code: "ca", name: "Canada" },
  { code: "dk", name: "Denmark" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

const values = computed(() => countries.value.map((c) => c.name));
const collection = useCollection({
  values,
  isValueDisabled: (name) => !!countries.value.find((c) => c.name === name)?.disabled,
});

useClick(node);
useTypeahead(node, { collection });
</script>

<template>
  <button ref="anchorEl" type="button">
    {{ collection.activeValue.value || "Select Country" }}
  </button>

  <div v-if="node.open" ref="floatingEl" role="listbox" :style="styles">
    <div
      v-for="country in countries"
      :key="country.code"
      role="option"
      :aria-selected="collection.activeValue.value === country.name"
      :aria-disabled="country.disabled"
      :class="{
        active: collection.activeValue.value === country.name,
        disabled: country.disabled,
      }"
      @click="collection.setActiveValue(country.name)"
    >
      {{ country.name }}
    </div>
  </div>
</template>
```

## See Also

- [`useCollection`](/api/use-collection) - Headless value model for keyboard navigation
- [`useRovingFocus`](/api/use-roving-focus) - Physical focus movement between items
- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual highlighting while focus stays put
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [Keyboard Navigation](/guide/keyboard-navigation) - Navigation workflow
