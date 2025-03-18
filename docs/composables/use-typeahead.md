# useTypeahead

The `useTypeahead` composable enables type-to-select functionality for floating elements, allowing users to quickly navigate to items by typing their text content. This greatly improves the user experience for long lists, dropdowns, and select menus.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useListNavigation,
  useTypeahead,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement[]>([]);
const isOpen = ref(false);
const activeIndex = ref<number | null>(null);

const items = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
];

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create list navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

// Add typeahead functionality
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
});

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
  typeahead,
]);

// Function to collect item elements for the listRef
function collectItemElement(el: HTMLElement | null) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    @click="isOpen = !isOpen"
  >
    Select Fruit
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="dropdown"
  >
    <div
      v-for="(item, index) in items"
      :key="item"
      :ref="collectItemElement"
      v-bind="getItemProps({ index })"
      :tabindex="activeIndex === index ? 0 : -1"
      :data-active="activeIndex === index"
      class="dropdown-item"
    >
      {{ item }}
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-item[data-active="true"] {
  background: #f0f0f0;
}
</style>
```

## API Reference

### Arguments

```ts
function useTypeahead(
  context: FloatingContext,
  options: UseTypeaheadOptions
): {
  getReferenceProps: (userProps?: object) => object;
};
```

| Parameter | Type                | Description                                  |
| --------- | ------------------- | -------------------------------------------- |
| context   | FloatingContext     | The context object returned from useFloating |
| options   | UseTypeaheadOptions | Configuration options for typeahead behavior |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useTypeahead` composable accepts several options to customize its behavior:

| Option          | Type                                         | Default                | Description                                                    |
| --------------- | -------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| enabled         | boolean \| Ref&lt;boolean&gt;                | true                   | Whether the typeahead functionality is enabled                 |
| listRef         | Ref&lt;HTMLElement[]&gt;                     | required               | Array of list item elements                                    |
| activeIndex     | Ref&lt;number \| null&gt;                    | required               | The currently active index                                     |
| selectedIndex   | Ref&lt;number \| null&gt;                    | null                   | The currently selected index (if different from active)        |
| onMatch         | (index: number) => void                      | required               | Callback when a match is found                                 |
| resetMs         | number                                       | 1000                   | Time in milliseconds to reset the typed string                 |
| ignoreKeys      | string[]                                     | []                     | Array of keys to ignore                                        |
| findMatch       | (text: string, item: HTMLElement) => boolean | Default implementation | Custom function to determine if an item matches the typed text |
| disabledIndices | number[]                                     | []                     | Array of disabled item indices that should be skipped          |

### Return Value

`useTypeahead` returns an object with a function that generates props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |

## How Typeahead Works

When the user types while the floating element is focused or open:

1. `useTypeahead` captures the keypress events
2. It builds a string from the characters being typed
3. It searches for the first item that matches this string
4. When a match is found, it calls the `onMatch` callback with the index
5. If the user pauses typing (default: 1000ms), the string resets

This allows users to quickly navigate to items by typing, for example:

- Type "a" to jump to "Apple"
- Type "ba" to jump to "Banana"
- Type "gr" to jump to "Grape"

## Customizing Typeahead Behavior

### Custom Match Logic

By default, typeahead looks for items that start with the typed string (case-insensitive). You can customize this logic with the `findMatch` option:

```vue
<script setup>
import { useFloating, useInteractions, useTypeahead } from "v-float";

const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  // Custom matching function that checks for substring match instead of prefix
  findMatch: (text, item) => {
    return item.textContent.toLowerCase().includes(text.toLowerCase());
  },
});
</script>
```

### Adjusting Reset Time

By default, the typed string resets after 1000ms (1 second) of inactivity. You can adjust this timeout:

```vue
<script setup>
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  // Use a shorter timeout (500ms)
  resetMs: 500,
});
</script>
```

A shorter timeout makes the typeahead more responsive to new inputs but gives users less time to type multiple characters.

### Ignoring Special Keys

You can specify keys that should be ignored by the typeahead (useful if certain keys have special meaning in your application):

```vue
<script setup>
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  // Ignore these keys for typeahead
  ignoreKeys: ["Enter", "Escape", "Tab"],
});
</script>
```

### Supporting Disabled Items

You can specify indices of disabled items that should be skipped during typeahead navigation:

```vue
<script setup>
const disabledIndices = [1, 3]; // Items at index 1 and 3 are disabled

const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  disabledIndices,
});
</script>
```

## Combining with Other Composables

`useTypeahead` is typically used alongside `useListNavigation` for complete keyboard navigation support:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useClick,
  useListNavigation,
  useTypeahead,
  useDismiss,
  useRole,
} from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open
const click = useClick(floating.context);

// Arrow key navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

// Type to search
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
});

// ARIA attributes
const role = useRole(floating.context, { role: "listbox" });

// Dismiss when clicking outside
const dismiss = useDismiss(floating.context);

// Combine all interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
  typeahead,
  role,
  dismiss,
]);
</script>
```

## Example: Select Component with Typeahead Search

```vue
<script setup>
import { ref, computed } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useListNavigation,
  useTypeahead,
  useDismiss,
  useRole,
  offset,
  flip,
} from "v-float";

const fruits = [
  "Apple",
  "Apricot",
  "Avocado",
  "Banana",
  "Blackberry",
  "Blueberry",
  "Cherry",
  "Coconut",
  "Cranberry",
  "Date",
  "Dragonfruit",
  "Durian",
  "Elderberry",
  "Fig",
  "Grape",
  "Grapefruit",
  "Guava",
  "Kiwi",
  "Lemon",
  "Lime",
  "Lychee",
  "Mango",
  "Melon",
  "Nectarine",
  "Orange",
  "Papaya",
  "Passionfruit",
  "Peach",
  "Pear",
  "Pineapple",
  "Plum",
  "Pomegranate",
  "Raspberry",
  "Strawberry",
  "Watermelon",
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const selectedIndex = ref(null);
const typeBuffer = ref(""); // Visual indicator of what's been typed

const selectedValue = computed(() => {
  if (selectedIndex.value === null) return "";
  return fruits[selectedIndex.value];
});

// Reset typeBuffer after a delay
let resetTimeout;
function updateTypeBuffer(char) {
  clearTimeout(resetTimeout);
  typeBuffer.value += char;
  resetTimeout = setTimeout(() => {
    typeBuffer.value = "";
  }, 1000);
}

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip()],
  open: isOpen,
  onOpenChange: (value) => {
    isOpen.value = value;
    if (!value) {
      listRef.value = [];
      typeBuffer.value = "";
    }
  },
});

// Click to open
const click = useClick(floating.context);

// List navigation with arrow keys
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  selectedIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

// Typeahead functionality
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
    // Update the visual indicator of what's been typed
    updateTypeBuffer(String.fromCharCode(event.keyCode));
  },
});

// ARIA attributes
const role = useRole(floating.context, { role: "listbox" });

// Dismiss when clicking outside
const dismiss = useDismiss(floating.context);

// Combine all interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
  typeahead,
  role,
  dismiss,
]);

// Collect item elements
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Handle item selection
function selectItem(index) {
  selectedIndex.value = index;
  isOpen.value = false;
}

// Handle keyboard selection
function handleKeyDown(event, index) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectItem(index);
  }
}

// Toggle the dropdown
function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value && selectedIndex.value !== null) {
    activeIndex.value = selectedIndex.value;
  }
}
</script>

<template>
  <div class="select-container">
    <button
      ref="referenceRef"
      v-bind="getReferenceProps()"
      class="select-button"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <span>{{ selectedValue || "Select a fruit" }}</span>
      <span class="select-arrow">▼</span>
    </button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="select-menu"
      role="listbox"
    >
      <div class="typeahead-indicator" v-if="typeBuffer">
        Searching: <strong>{{ typeBuffer }}</strong>
      </div>

      <div class="select-list">
        <div
          v-for="(fruit, index) in fruits"
          :key="fruit"
          :ref="collectItem"
          v-bind="getItemProps({ index })"
          role="option"
          :id="`fruit-${index}`"
          :aria-selected="selectedIndex === index"
          :tabindex="activeIndex === index ? 0 : -1"
          :data-active="activeIndex === index"
          :data-selected="selectedIndex === index"
          class="select-option"
          @click="selectItem(index)"
          @keydown="(e) => handleKeyDown(e, index)"
        >
          {{ fruit }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-container {
  position: relative;
  width: 250px;
}

.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.select-arrow {
  font-size: 10px;
  color: #666;
}

.select-menu {
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.typeahead-indicator {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
}

.select-list {
  max-height: 250px;
  overflow-y: auto;
}

.select-option {
  padding: 8px 12px;
  cursor: pointer;
}

.select-option[data-active="true"] {
  background: #f0f0f0;
}

.select-option[data-selected="true"] {
  font-weight: 500;
  background: #e6f7ff;
}
</style>
```

## Example: Filterable Search with Typeahead

```vue
<script setup>
import { ref, computed } from "vue";
import {
  useFloating,
  useInteractions,
  useListNavigation,
  useTypeahead,
  useDismiss,
  offset,
  flip,
} from "v-float";

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macedonia",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Samoa",
  "San Marino",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const inputRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const inputValue = ref("");

// Filter countries based on input
const filteredCountries = computed(() => {
  if (!inputValue.value) return countries;
  return countries.filter((country) =>
    country.toLowerCase().includes(inputValue.value.toLowerCase())
  );
});

const floating = useFloating(inputRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip()],
  open: isOpen,
  onOpenChange: (value) => {
    isOpen.value = value;
    if (!value) {
      listRef.value = [];
    }
  },
});

// List navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

// Typeahead functionality
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  // Custom find match that searches within the visible items only
  findMatch: (text, item) => {
    const itemText = item.textContent.toLowerCase();
    return itemText.startsWith(text.toLowerCase());
  },
});

// Dismiss when clicking outside
const dismiss = useDismiss(floating.context);

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
  typeahead,
  dismiss,
]);

// Collect item elements
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Handle input changes
function handleInput(e) {
  inputValue.value = e.target.value;
  isOpen.value = true;
  // Reset the list when input changes
  listRef.value = [];
}

// Select a country
function selectCountry(country) {
  inputValue.value = country;
  isOpen.value = false;
}

// Handle keyboard selection
function handleKeyDown(event, country) {
  if (event.key === "Enter") {
    event.preventDefault();
    selectCountry(country);
  }
}
</script>

<template>
  <div class="search-container">
    <label for="country-search">Search for a country:</label>
    <input
      id="country-search"
      ref="inputRef"
      v-bind="getReferenceProps()"
      v-model="inputValue"
      @input="handleInput"
      @focus="isOpen = true"
      type="text"
      placeholder="Start typing..."
      class="search-input"
      autocomplete="off"
    />

    <div
      v-if="isOpen && filteredCountries.length > 0"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="search-results"
    >
      <div class="results-count">{{ filteredCountries.length }} results</div>

      <div class="results-list">
        <div
          v-for="(country, index) in filteredCountries"
          :key="country"
          :ref="collectItem"
          v-bind="getItemProps({ index })"
          :tabindex="activeIndex === index ? 0 : -1"
          :data-active="activeIndex === index"
          class="result-item"
          @click="selectCountry(country)"
          @keydown="(e) => handleKeyDown(e, country)"
        >
          {{ country }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  width: 300px;
}

label {
  display: block;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-results {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  z-index: 100;
}

.results-count {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
  color: #666;
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  padding: 8px 12px;
  cursor: pointer;
}

.result-item[data-active="true"] {
  background: #f0f0f0;
}
</style>
```

## Best Practices

1. **Combine with list navigation**: Always combine `useTypeahead` with `useListNavigation` for a complete keyboard navigation experience.

2. **Provide visual feedback**: Consider showing a visual indicator of what the user is typing, especially for longer search strings.

3. **Use appropriate reset time**: Balance between giving users enough time to type multiple characters and resetting too slowly.

4. **Test with screen readers**: Ensure your implementation works well with assistive technologies.

5. **Handle empty and filtered lists**: If you're also filtering the list based on input, ensure typeahead and filtering work together properly.

6. **Consider case sensitivity**: Usually, case-insensitive matching provides a better user experience.

7. **Support special characters**: Make sure non-ASCII characters and diacritics are handled properly.

8. **Optimize for large lists**: For very long lists, consider debouncing or throttling typeahead operations.

## Related Composables

- `useListNavigation`: For arrow key navigation in lists
- `useClick`: For click interaction to open/toggle the floating element
- `useDismiss`: For closing behavior
- `useRole`: For proper ARIA roles and attributes
