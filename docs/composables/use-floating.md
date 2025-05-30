---
description: The core composable for positioning floating elements using Floating UI
---

# useFloating: Your UI Positioning Swiss Army Knife 🛠️

Picture this: you’re building a modern web app with tooltips that elegantly follow your cursor, popovers that snap to their triggers, and dropdowns that always land in the perfect spot—no matter how the page shifts or resizes. Behind the scenes, something needs to orchestrate all that pixel-perfect positioning, adapting in real time as users interact and layouts change.

Enter `useFloating`—the unsung hero of V-Float. Think of it as your UI’s GPS and autopilot, precisely calculating and updating the position of floating elements so you can focus on building delightful experiences, not wrestling with CSS.

---

## Why `useFloating`?

`useFloating` is your go-to tool whenever you need to anchor a floating element (like a tooltip, popover, dropdown, or modal) to another element on the page. It’s designed for:

- **Tooltips that always point to the right spot—even as content scrolls or resizes**
- **Dropdown menus that stay attached to their triggers, regardless of viewport changes**
- **Popovers and modals that need to be perfectly centered or aligned**
- **Any scenario where you want a floating UI element to feel “magnetically” connected to something else**

No more manual calculations, no more guessing with margins or transforms. `useFloating` brings the precision of Floating UI to Vue 3’s reactivity system, making your floating elements feel smart, dynamic, and effortless.

---

## Core Features at a Glance

- **Reactive Positioning:** Instantly adapts when anchor or floating elements move, resize, or change.
- **Flexible Placement:** Choose from 12+ placement options—top, bottom, left, right, and all the fine-grained variants.
- **Middleware Power:** Plug in offset, flip, shift, arrow, and custom middleware for advanced behaviors.
- **Performance First:** Uses CSS transforms by default for buttery-smooth rendering.
- **Auto-Update:** Keeps everything aligned on scroll, resize, or DOM changes—no manual triggers needed.
- **Fully Typed:** Enjoy TypeScript safety and intellisense everywhere.

---

## API Reference

### Parameters

```typescript
useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options?: UseFloatingOptions
): FloatingContext
```

#### `anchorEl`
- **Type**: `Ref<AnchorElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the anchor element that the floating element will be positioned relative to. Can be an HTMLElement, VirtualElement, or null.

#### `floatingEl`
- **Type**: `Ref<FloatingElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the floating element to be positioned. Can be an HTMLElement or null.

#### `options`
- **Type**: `UseFloatingOptions`
- **Required**: No
- **Description**: Configuration options for positioning behavior.

### Options Interface

```typescript
interface UseFloatingOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  transform?: MaybeRefOrGetter<boolean | undefined>
  middlewares?: Middleware[]
  whileElementsMounted?: (
    anchorEl: NonNullable<AnchorElement>,
    floatingEl: NonNullable<FloatingElement>,
    update: () => void
  ) => undefined | (() => void)
  open?: Ref<boolean>
  onOpenChange?: (open: boolean) => void
  nodeId?: string
  rootContext?: Partial<FloatingContext>
}
```

#### Option Details

**`placement`**
- **Type**: `MaybeRefOrGetter<Placement | undefined>`
- **Default**: `'bottom'`
- **Description**: Where to place the floating element relative to the anchor element.
- **Values**: `'top'`, `'top-start'`, `'top-end'`, `'right'`, `'right-start'`, `'right-end'`, `'bottom'`, `'bottom-start'`, `'bottom-end'`, `'left'`, `'left-start'`, `'left-end'`

**`strategy`**
- **Type**: `MaybeRefOrGetter<Strategy | undefined>`
- **Default**: `'absolute'`
- **Description**: The CSS positioning strategy to use.
- **Values**: `'absolute'`, `'fixed'`

**`transform`**
- **Type**: `MaybeRefOrGetter<boolean | undefined>`
- **Default**: `true`
- **Description**: Whether to use CSS transform for positioning instead of top/left properties. Transform is generally more performant.

**`middlewares`**
- **Type**: `Middleware[]`
- **Default**: `[]`
- **Description**: Array of middleware functions that modify positioning behavior. Common middleware include `offset`, `flip`, `shift`, and `arrow`.

**`whileElementsMounted`**
- **Type**: Function
- **Description**: Custom function called when both elements are mounted. Should return a cleanup function. If not provided, uses Floating UI's `autoUpdate`.

**`open`**
- **Type**: `Ref<boolean>`
- **Default**: `ref(false)`
- **Description**: Reactive boolean controlling whether the floating element is open/visible.

**`onOpenChange`**
- **Type**: `(open: boolean) => void`
- **Description**: Callback function called when the open state changes.

---

### Return Value

The composable returns a `FloatingContext` object with the following properties:

## API Reference

### Parameters

```typescript
useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options?: UseFloatingOptions
): FloatingContext
```

#### `anchorEl`
- **Type**: `Ref<AnchorElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the reference element that the floating element will be positioned relative to. Can be an HTMLElement, VirtualElement, or null.

#### `floatingEl`
- **Type**: `Ref<FloatingElement>`
- **Required**: Yes
- **Description**: A Vue ref containing the floating element to be positioned. Can be an HTMLElement or null.

#### `options`
- **Type**: `UseFloatingOptions`
- **Required**: No
- **Description**: Configuration options for positioning behavior.

### Options Interface

```typescript
interface UseFloatingOptions {
  placement?: MaybeRefOrGetter<Placement | undefined>
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  transform?: MaybeRefOrGetter<boolean | undefined>
  middlewares?: Middleware[]
  whileElementsMounted?: (
    anchorEl: NonNullable<AnchorElement>,
    floatingEl: NonNullable<FloatingElement>,
    update: () => void
  ) => undefined | (() => void)
  open?: Ref<boolean>
  onOpenChange?: (open: boolean) => void
  nodeId?: string
  rootContext?: Partial<FloatingContext>
}
```

#### Option Details

**`placement`**
- **Type**: `MaybeRefOrGetter<Placement | undefined>`
- **Default**: `'bottom'`
- **Description**: Where to place the floating element relative to the anchor element.
- **Values**: `'top'`, `'top-start'`, `'top-end'`, `'right'`, `'right-start'`, `'right-end'`, `'bottom'`, `'bottom-start'`, `'bottom-end'`, `'left'`, `'left-start'`, `'left-end'`

**`strategy`**
- **Type**: `MaybeRefOrGetter<Strategy | undefined>`
- **Default**: `'absolute'`
- **Description**: The CSS positioning strategy to use.
- **Values**: `'absolute'`, `'fixed'`

**`transform`**
- **Type**: `MaybeRefOrGetter<boolean | undefined>`
- **Default**: `true`
- **Description**: Whether to use CSS transform for positioning instead of top/left properties. Transform is generally more performant.

**`middlewares`**
- **Type**: `Middleware[]`
- **Default**: `[]`
- **Description**: Array of middleware functions that modify positioning behavior. Common middleware include `offset`, `flip`, `shift`, and `arrow`.

**`whileElementsMounted`**
- **Type**: Function
- **Description**: Custom function called when both elements are mounted. Should return a cleanup function. If not provided, uses Floating UI's `autoUpdate`.

**`open`**
- **Type**: `Ref<boolean>`
- **Default**: `ref(false)`
- **Description**: Reactive boolean controlling whether the floating element is open/visible.

**`onOpenChange`**
- **Type**: `(open: boolean) => void`
- **Description**: Callback function called when the open state changes.

### Return Value

The composable returns a `FloatingContext` object with the following properties:

```typescript
interface FloatingContext {
  x: Readonly<Ref<number>>
  y: Readonly<Ref<number>>
  strategy: Ref<Strategy>
  placement: Ref<Placement>
  middlewareData: Ref<MiddlewareData>
  isPositioned: Ref<boolean>
  floatingStyles: ComputedRef<FloatingStyles>
  update: () => Promise<void>
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
  }
  open: Ref<boolean>
  onOpenChange: (open: boolean) => void
}
```

#### Return Properties

**`x`** / **`y`**
- **Type**: `Readonly<Ref<number>>`
- **Description**: The computed x and y coordinates for positioning the floating element.

**`strategy`**
- **Type**: `Ref<Strategy>`
- **Description**: The current positioning strategy being used.

**`placement`**
- **Type**: `Ref<Placement>`
- **Description**: The actual placement being used (may differ from requested placement due to middleware).

**`middlewareData`**
- **Type**: `Ref<MiddlewareData>`
- **Description**: Data returned by middleware functions, useful for additional positioning logic.

**`isPositioned`**
- **Type**: `Ref<boolean>`
- **Description**: Whether the floating element has been positioned.

**`floatingStyles`**
- **Type**: `ComputedRef<FloatingStyles>`
- **Description**: Computed CSS styles object ready to apply to the floating element.

**`update`**
- **Type**: `() => Promise<void>`
- **Description**: Function to manually trigger position recalculation.

**`refs`**
- **Type**: Object with `anchorEl` and `floatingEl` refs
- **Description**: References to the anchor and floating elements.

**`open`** / **`onOpenChange`**
- **Type**: `Ref<boolean>` / Function
- **Description**: State and handler for controlling floating element visibility.

## Usage Examples

### Basic Usage

Simple tooltip positioning:

:::preview

demo-preview=../demos/use-floating/BasicUsage.vue

:::

### With Middleware

Using middleware for enhanced positioning:

<preview>
  <WithMiddleware />
</preview>

### Reactive Placement

Dynamic placement based on user interaction:

:::preview

demo-preview=../demos/use-floating/PlacementDemo.vue

:::

```vue
<script setup>
import { ref, computed } from 'vue'
import { useFloating, offset } from 'v-float'

type Placement = 
  | 'top' | 'top-start' | 'top-end'
  | 'right' | 'right-start' | 'right-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'

const anchorEl = ref()
const floatingEl = ref()
const isOpen = ref(true)
const currentPlacement = ref<Placement>('top')

const placements: Placement[] = [
  'top', 'top-start', 'top-end',
  'right', 'right-start', 'right-end',
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end'
]

const { floatingStyles, update } = useFloating(anchorEl, floatingEl, {
  placement: currentPlacement,
  open: isOpen,
  middlewares: [offset(10)]
})

function selectPlacement(placement: Placement) {
  currentPlacement.value = placement
  update()
}
</script>

<template>
  <div class="placement-demo">
    <div class="controls">
      <h3>Placement Options</h3>
      <div class="placement-grid">
        <button
          v-for="placement in placements"
          :key="placement"
          @click="selectPlacement(placement)"
          :class="['placement-button', { active: currentPlacement === placement }]"
        >
          {{ placement }}
        </button>
      </div>
    </div>

    <div class="demo-area">
      <div class="anchor-container">
        <div ref="anchorEl" class="anchor">
          Anchor Element
        </div>
        
        <div
          v-if="isOpen"
          ref="floatingEl"
          :style="floatingStyles"
          class="floating"
        >
          {{ currentPlacement }}
        </div>
      </div>
    </div>
  </div>
</template>
```

### Complex Positioning

Advanced positioning with multiple middleware and dynamic content:

<demo-preview>
  <ComplexPositioning />
</demo-preview>

```vue
<script setup>
import { ref, computed } from 'vue'
import { 
  useFloating, 
  offset, 
  flip, 
  shift, 
  autoPlacement, 
  size, 
  arrow 
} from 'v-float'

const anchorEl = ref()
const floatingEl = ref()
const arrowRef = ref()
const isOpen = ref(false)
const useAutoPlacement = ref(false)
const offsetValue = ref(8)
const content = ref('Short content')

const middlewares = computed(() => {
  const mw = [
    offset(offsetValue.value),
    shift({ padding: 8 })
  ]
  
  if (useAutoPlacement.value) {
    mw.push(autoPlacement())
  } else {
    mw.push(flip())
  }
  
  mw.push(
    size({
      apply({ availableWidth, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth: `${Math.min(availableWidth, 300)}px`,
          maxHeight: `${availableHeight}px`,
        })
      },
    }),
    arrow({ element: arrowRef })
  )
  
  return mw
})

const { 
  floatingStyles, 
  placement, 
  middlewareData,
  update 
} = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  open: isOpen,
  middlewares
})

const arrowStyles = computed(() => {
  const arrowData = middlewareData.value.arrow
  if (!arrowData) return {}
  
  const { x, y } = arrowData
  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[placement.value.split('-')[0]]
  
  return {
    left: x != null ? `${x}px` : '',
    top: y != null ? `${y}px` : '',
    right: '',
    bottom: '',
    [staticSide]: '-4px',
  }
})

const contentOptions = [
  'Short content',
  'This is a longer piece of content that will test how the floating element handles text wrapping and sizing.',
  'Very long content that goes on and on and should definitely cause the floating element to reach its maximum width and potentially wrap to multiple lines, demonstrating the size middleware in action.'
]

const toggleFloating = () => {
  isOpen.value = !isOpen.value
}

const handleUpdate = async () => {
  await update()
}
</script>

<template>
  <div class="complex-demo">
    <div class="controls">
      <h3>Configuration</h3>
      
      <label>
        <input 
          type="checkbox" 
          v-model="useAutoPlacement"
          @change="handleUpdate"
        />
        Use auto-placement instead of flip
      </label>
      
      <label>
        Offset: 
        <input 
          type="range" 
          v-model.number="offsetValue" 
          min="0" 
          max="50"
          @input="handleUpdate"
        />
        {{ offsetValue }}px
      </label>
      
      <label>
        Content:
        <select v-model="content" @change="handleUpdate">
          <option v-for="option in contentOptions" :key="option" :value="option">
            {{ option.slice(0, 30) }}{{ option.length > 30 ? '...' : '' }}
          </option>
        </select>
      </label>
    </div>
    
    <div class="demo-area">
      <button 
        ref="anchorEl"
        @click="toggleFloating"
        class="complex-trigger"
      >
        {{ isOpen ? 'Hide' : 'Show' }} Complex Floating
      </button>
      
      <div 
        v-if="isOpen"
        ref="floatingEl" 
        :style="floatingStyles"
        class="complex-floating"
      >
        <div class="floating-content">
          {{ content }}
        </div>
        
        <div class="floating-info">
          <small>
            <strong>Placement:</strong> {{ placement }}<br>
            <strong>Middleware:</strong> 
            {{ useAutoPlacement ? 'autoPlacement' : 'flip' }}, 
            offset({{ offsetValue }}), shift, size, arrow
          </small>
        </div>
        
        <div 
          ref="arrowRef"
          class="floating-arrow"
          :style="arrowStyles"
        ></div>
      </div>
    </div>
  </div>
</template>
```

### Interactive Examples

These interactive examples demonstrate real-world usage scenarios that you can copy and use immediately in your projects.

### Tooltip Example

A complete tooltip implementation with hover interactions:

<demo-preview>
  <TooltipExample />
</demo-preview>

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'
import { offset, flip, shift } from '@floating-ui/dom'

const anchorEl = ref()
const floatingEl = ref()
const isOpen = ref(false)

const { floatingStyles, placement } = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  open: isOpen,
  middlewares: [
    offset(8),
    flip(),
    shift({ padding: 8 })
  ]
})

const showTooltip = () => {
  isOpen.value = true
}

const hideTooltip = () => {
  isOpen.value = false
}
</script>

<template>
  <button 
    ref="anchorEl"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
    class="tooltip-trigger"
  >
    Hover or focus for tooltip
  </button>
  
  <div 
    ref="floatingEl" 
    :style="floatingStyles"
    v-show="isOpen"
    class="tooltip"
    role="tooltip"
    :data-placement="placement"
  >
    This is a helpful tooltip!
    <div class="tooltip-arrow" :data-placement="placement"></div>
  </div>
</template>

<style scoped>
.tooltip-trigger {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.tooltip {
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  max-width: 200px;
  z-index: 1000;
  position: relative;
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #1f2937;
  transform: rotate(45deg);
}

.tooltip-arrow[data-placement^="top"] {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip-arrow[data-placement^="bottom"] {
  top: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip-arrow[data-placement^="left"] {
  right: -4px;
  top: 50%;
  margin-top: -4px;
}

.tooltip-arrow[data-placement^="right"] {
  left: -4px;
  top: 50%;
  margin-top: -4px;
}
</style>
```

### Dropdown Menu Example

A dropdown menu with click-to-toggle functionality:

<demo-preview>
 ### Dropdown Menu

A complete dropdown menu implementation with click-to-toggle functionality:

<demo-preview>
  <DropdownMenu />
</demo-preview>

<style scoped>
.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-trigger:hover {
  background: #f9fafb;
}

.dropdown-icon {
  transition: transform 0.2s;
}

.dropdown-menu {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 160px;
  z-index: 1000;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item:focus {
  outline: none;
  background: #e5e7eb;
}
</style>
```

### Modal Dialog Example

A modal dialog with backdrop and focus management:

<demo-preview>
 ### Modal Dialog

A modal dialog with backdrop and focus management:

<demo-preview>
  <ModalDialog />
</demo-preview>

<style scoped>
.modal-trigger {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.modal-body {
  padding: 20px 24px 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}
</style>
```

### Complex Positioning Example

Advanced positioning with multiple middleware and dynamic content:

<demo-preview>
  <ComplexPositioningExample />
</demo-preview>

```vue
<script setup>
import { ref, computed } from 'vue'
import { 
  useFloating, 
  offset, 
  flip, 
  shift, 
  autoPlacement, 
  size, 
  arrow 
} from 'v-float'

const anchorEl = ref()
const floatingEl = ref()
const arrowRef = ref()
const isOpen = ref(false)
const useAutoPlacement = ref(false)
const offsetValue = ref(8)
const content = ref('Short content')

const middlewares = computed(() => {
  const mw = [
    offset(offsetValue.value),
    shift({ padding: 8 })
  ]
  
  if (useAutoPlacement.value) {
    mw.push(autoPlacement())
  } else {
    mw.push(flip())
  }
  
  mw.push(
    size({
      apply({ availableWidth, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth: `${Math.min(availableWidth, 300)}px`,
          maxHeight: `${availableHeight}px`,
        })
      },
    }),
    arrow({ element: arrowRef })
  )
  
  return mw
})

const { 
  floatingStyles, 
  placement, 
  middlewareData,
  update 
} = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  open: isOpen,
  middlewares
})

const arrowStyles = computed(() => {
  const arrowData = middlewareData.value.arrow
  if (!arrowData) return {}
  
  const { x, y } = arrowData
  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[placement.value.split('-')[0]]
  
  return {
    left: x != null ? `${x}px` : '',
    top: y != null ? `${y}px` : '',
    right: '',
    bottom: '',
    [staticSide]: '-4px',
  }
})

const contentOptions = [
  'Short content',
  'This is a longer piece of content that will test how the floating element handles text wrapping and sizing.',
  'Very long content that goes on and on and should definitely cause the floating element to reach its maximum width and potentially wrap to multiple lines, demonstrating the size middleware in action.'
]
</script>

<template>
  <div class="complex-demo">
    <div class="controls">
      <h3>Configuration</h3>
      
      <label>
        <input 
          type="checkbox" 
          v-model="useAutoPlacement"
          @change="handleUpdate"
        />
        Use auto-placement instead of flip
      </label>
      
      <label>
        Offset: 
        <input 
          type="range" 
          v-model.number="offsetValue" 
          min="0" 
          max="50"
          @input="handleUpdate"
        />
        {{ offsetValue }}px
      </label>
      
      <label>
        Content:
        <select v-model="content" @change="handleUpdate">
          <option v-for="option in contentOptions" :key="option" :value="option">
            {{ option.slice(0, 30) }}{{ option.length > 30 ? '...' : '' }}
          </option>
        </select>
      </label>
    </div>
    
    <div class="demo-area">
      <button 
        ref="anchorEl"
        @click="toggleFloating"
        class="complex-trigger"
      >
        {{ isOpen ? 'Hide' : 'Show' }} Complex Floating
      </button>
      
      <div 
        ref="floatingEl" 
        :style="floatingStyles"
        v-show="isOpen"
        class="complex-floating"
        :data-placement="placement"
      >
        <div class="floating-content">
          {{ content }}
        </div>
        
        <div class="floating-info">
          <small>
            <strong>Placement:</strong> {{ placement }}<br>
            <strong>Middleware:</strong> 
            {{ useAutoPlacement ? 'autoPlacement' : 'flip' }}, 
            offset({{ offsetValue }}), shift, size, arrow
          </small>
        </div>
        
        <div 
          ref="arrowEl"
          class="floating-arrow"
          :style="arrowStyles"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.complex-demo {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.controls {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  min-width: 250px;
}

.controls h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.controls label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
}

.controls input[type="checkbox"] {
  margin-right: 8px;
}

.controls input[type="range"] {
  width: 100%;
  margin: 4px 0;
}

.controls select {
  width: 100%;
  padding: 4px;
  margin-top: 4px;
}

.demo-area {
  flex: 1;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  position: relative;
}

.complex-trigger {
  padding: 12px 24px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.complex-floating {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 1000;
  position: relative;
}

.floating-content {
  margin-bottom: 12px;
  line-height: 1.5;
}

.floating-info {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
}

.floating-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #d1d5db;
  transform: rotate(45deg);
}
</style>
```

## Integration with Other Composables

`useFloating` works seamlessly with other V-Float composables:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { 
  useFloating, 
  useHover, 
  useFocus, 
  useInteractions 
} from '@/composables'
import { offset, flip, shift } from '@floating-ui/dom'

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const isOpen = ref(false)

// Core positioning
const floating = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  open: isOpen,
  onOpenChange: (open) => { isOpen.value = open },
  middlewares: [offset(8), flip(), shift()]
})

// Interaction behaviors
const hover = useHover(floating, { delay: { open: 100, close: 200 } })
const focus = useFocus(floating)

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus
])
</script>

<template>
  <button 
    ref="anchorEl" 
    v-bind="getReferenceProps()"
  >
    Hover or focus me
  </button>
  
  <div 
    ref="floatingEl" 
    :style="floating.floatingStyles.value"
    v-show="isOpen"
    v-bind="getFloatingProps()"
    class="tooltip"
  >
    Interactive tooltip with hover and focus
  </div>
</template>
```

## Best Practices

### Performance Optimization

1. **Use CSS transforms**: Keep `transform: true` (default) for better performance
2. **Minimize middleware**: Only use necessary middleware to reduce computation
3. **Custom auto-update**: Implement custom `whileElementsMounted` for specific use cases

### Accessibility

1. **Proper ARIA attributes**: Use with `useRole` for semantic markup
2. **Focus management**: Combine with `useFocus` for keyboard navigation
3. **Screen reader support**: Ensure floating content is properly announced

### Common Patterns

```typescript
// Tooltip pattern
const tooltip = useFloating(anchor, floating, {
  placement: 'top',
  middlewares: [offset(8), flip(), shift({ padding: 8 })]
})

// Dropdown pattern  
const dropdown = useFloating(trigger, menu, {
  placement: 'bottom-start',
  middlewares: [offset(4), flip(), shift()]
})

// Modal pattern
const modal = useFloating(trigger, dialog, {
  strategy: 'fixed',
  placement: 'bottom'
})
```

## Troubleshooting

### Common Issues

**Floating element not positioning correctly**
- Ensure both `anchorEl` and `floatingEl` refs are properly assigned
- Check that elements are mounted before positioning
- Verify CSS positioning context (relative/absolute parents)

**Position not updating automatically**
- Confirm `open` state is properly managed
- Check if custom `whileElementsMounted` returns cleanup function
- Ensure elements remain in DOM during positioning

**Performance issues**
- Use `transform: true` for better performance
- Implement custom auto-update logic if default is too aggressive
- Consider throttling position updates for complex scenarios

## Related Composables

- [`useHover`](/composables/use-hover) - Add hover interactions
- [`useFocus`](/composables/use-focus) - Add focus interactions  
- [`useClick`](/composables/use-click) - Add click interactions
- [`useInteractions`](/composables/use-interactions) - Combine multiple interactions
- [`useRole`](/composables/use-role) - Add ARIA roles and attributes
- [`FloatingPortal`](/composables/floating-portal) - Render floating elements in portals
- [`FloatingArrow`](/composables/floating-arrow) - Add arrows to floating elements

## TypeScript Support

`useFloating` is fully typed with TypeScript. All interfaces and types are exported for use in your applications:

```typescript
import type { 
  UseFloatingOptions,
  FloatingContext,
  FloatingStyles,
  AnchorElement,
  FloatingElement
} from '@/composables/use-floating'
```