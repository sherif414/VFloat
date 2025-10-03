# offset

   Offsets the floating element away from (or toward) its anchor element.

   ## Usage

   ```vue
   <script setup lang="ts">
   import { useFloating, offset } from 'v-float'

   const { floatingStyles } = useFloating(..., {
     middleware: [
       offset(10), // 10px offset
     ],
   })
   </script>

   <template>
     <div
       class="floating"
       :style="floatingStyles"
     >
     </div>
   </template>
   ```

   ## Options

   ```ts
   type OffsetValue = number | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

   interface OffsetOptions {
     mainAxis?: number
     crossAxis?: number
     alignmentAxis?: number | null
   }
   ```

   - **`number`**: Positive values push the floating element away from the anchor on the placement’s main axis; negative values pull it closer.
   - **`{ mainAxis, crossAxis, alignmentAxis }`**:
     - **`mainAxis`**: Distance along the placement direction. Default: `0`.
     - **`crossAxis`**: Distance perpendicular to the placement direction. Default: `0`.
     - **`alignmentAxis`**: When the placement is aligned (`-start` or `-end`), this value replaces `crossAxis` for the offset along the cross axis. Set to `null` to disable the alignment-specific behavior. Default: `null`.

   ## Signature

   ```ts
   function offset(
     value?: number | OffsetOptions | ((args: {
       placement: Placement
       platform: any
       elements: { reference: Element; floating: HTMLElement }
       rects: { reference: DOMRect; floating: DOMRect }
     }) => number | OffsetOptions)
   ) : Middleware
   ```

   - **Return type**: `Middleware`.

   ## Axis behavior

   - **Main axis**: the axis in the direction of the placement.
     - `top`/`bottom` placements → vertical main axis (positive moves away downward for `bottom`, upward negative for `top`).
     - `left`/`right` placements → horizontal main axis (positive moves away to the right for `right`, to the left negative for `left`).
   - **Cross axis**: perpendicular to the main axis.
   - **Alignment**: for placements like `top-start`, `right-end`, etc., `alignmentAxis` (when provided) is used instead of `crossAxis`.

   ## Examples

   - **Simple numeric offset**

     ```ts
     offset(8)
     ```

   - **Object form**

     ```ts
     // Push 4px along the main axis, and -8px along the cross axis
     offset({ mainAxis: 4, crossAxis: -8 })
     ```

   - **Alignment-specific offset**

     ```ts
     // When placement is aligned (e.g. top-start), use 12px on the cross axis
     offset({ mainAxis: 0, alignmentAxis: 12 })
     ```

   - **Functional form (dynamic)**

     ```ts
     // Change the offset based on placement
     offset(({ placement }) =>
       placement.startsWith('top') ? 4 : 8
     )

     // Use anchor size to compute the offset
     offset(({ rects }) => ({
       mainAxis: rects.reference.width / 2,
       crossAxis: -6,
     }))
     ```

   ## Composition tips

   - **Common order**: `offset`, `flip`, `shift`, `arrow`.
   - **With `arrow`**: applying `offset` before `arrow` ensures the arrow is positioned based on the final offset placement.
   - **With `shift`/`flip`**: `offset` is part of the positioning pipeline, so the element will still be shifted/flipped as needed after applying the offset.

   ## Notes

   - Defaults: `mainAxis = 0`, `crossAxis = 0`, `alignmentAxis = null`.
   - Positive vs negative values depend on the placement axis as described above.
   - `offset` is pure and inexpensive; prefer it for simple spacing rather than manual CSS margins that can interfere with measurements.